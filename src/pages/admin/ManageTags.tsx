import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useSupabaseQuery } from '../../lib/hooks';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Tags, Plus, Pencil, Trash2, X, Search } from 'lucide-react';
import { AdminPageShell } from '../../components/admin/AdminPageShell';
import { BrutalTabBar } from '../../components/admin/BrutalTabBar';
import type { TabOption } from '../../components/admin/BrutalTabBar';
import { BrutalTable } from '../../components/admin/BrutalTable';
import type { BrutalColumn } from '../../components/admin/BrutalTable';
import { ConfirmDeleteCard } from '../../components/admin/ConfirmDeleteCard';

interface TagWithUsage {
    id: string;
    name: string;
    category: string | null;
    created_at: string;
    usage_count: number;
}

const CATEGORIES = [
    'All',
    'Domain',
    'Level',
    'Skill',
    'Project Status',
    'Event Type',
    'Uncategorized',
];

const CATEGORY_VALUES = {
    Domain: 'domain',
    Level: 'level',
    Skill: 'skill',
    'Project Status': 'project_status',
    'Event Type': 'event_type',
};

// ─── Fetch all tags with usage count ───
function useTagsData() {
    return useSupabaseQuery<TagWithUsage[]>(
        async () => {
            // Fetch all tags with count of entity_tag references
            const { data: tags, error } = await supabase
                .from('tag')
                .select('id, name, category, created_at');

            if (error) {
                console.error('[ManageTags] tag fetch error:', error);
                return { data: [], error };
            }

            if (!tags || tags.length === 0) {
                return { data: [], error: null };
            }

            // Get usage counts for all tags
            const tagIds = (tags as any[]).map((t) => t.id);
            const { data: usageCounts, error: usageError } = await supabase
                .from('entity_tag')
                .select('tag_id, count(tag_id)', { count: 'exact' })
                .in('tag_id', tagIds);

            if (usageError) {
                console.warn('[ManageTags] usage count fetch error:', usageError.message);
            }

            const usageMap: Record<string, number> = {};
            if (usageCounts) {
                for (const row of usageCounts as any[]) {
                    usageMap[row.tag_id] = row.count ?? 0;
                }
            }

            const enriched: TagWithUsage[] = (tags as any[]).map((t) => ({
                id: t.id,
                name: t.name,
                category: t.category || null,
                created_at: t.created_at,
                usage_count: usageMap[t.id] ?? 0,
            }));

            return { data: enriched, error: null };
        },
        []
    );
}

type CategoryFilter = typeof CATEGORIES[number];

export function ManageTags() {
    const { role } = useAuth();
    const { data: tags, loading, error, refetch } = useTagsData();
    const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingTag, setEditingTag] = useState<TagWithUsage | null>(null);
    const [formData, setFormData] = useState({ name: '', category: '' });

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState<TagWithUsage | null>(null);

    if (role !== 'admin') {
        return (
            <div className="p-24 text-center font-data text-2xl">
                Access Denied: Admin Only
            </div>
        );
    }

    // Filter tags by category and search term
    const filteredTags = (tags || []).filter((tag) => {
        const matchesCategory =
            activeCategory === 'All' ||
            (activeCategory === 'Uncategorized' && !tag.category) ||
            tag.category === CATEGORY_VALUES[activeCategory as keyof typeof CATEGORY_VALUES];
        const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Compute counts per category for tab badges
    const categoryCounts = (tags || []).reduce<Record<string, number>>((acc, t) => {
        const cat = t.category || 'uncategorized';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {});

    const categoryTabs: TabOption<CategoryFilter>[] = CATEGORIES.map((cat) => {
        let count: number;
        if (cat === 'All') {
            count = (tags || []).length;
        } else if (cat === 'Uncategorized') {
            count = categoryCounts['uncategorized'] || 0;
        } else {
            const val = CATEGORY_VALUES[cat as keyof typeof CATEGORY_VALUES];
            count = val ? (categoryCounts[val] || 0) : 0;
        }
        return { value: cat, label: cat, count };
    });

    const handleAddTag = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setActionLoading('add');
        const categoryValue =
            formData.category && formData.category !== 'null'
                ? formData.category
                : null;

        const { error } = await supabase
            .from('tag')
            .insert({ name: formData.name.trim(), category: categoryValue });

        if (error) {
            console.error('Tag insert failed:', error);
            alert(`Failed to add tag: ${error.message}`);
        } else {
            setFormData({ name: '', category: '' });
            setShowAddForm(false);
            await refetch();
        }
        setActionLoading(null);
    };

    const handleUpdateTag = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTag || !formData.name.trim()) return;

        setActionLoading(editingTag.id);
        const categoryValue =
            formData.category && formData.category !== 'null'
                ? formData.category
                : null;

        const { error } = await supabase
            .from('tag')
            .update({ name: formData.name.trim(), category: categoryValue })
            .eq('id', editingTag.id);

        if (error) {
            console.error('Tag update failed:', error);
            alert(`Failed to update tag: ${error.message}`);
        } else {
            setEditingTag(null);
            setFormData({ name: '', category: '' });
            await refetch();
        }
        setActionLoading(null);
    };

    const handleDeleteTag = async (tag: TagWithUsage) => {
        setActionLoading(tag.id);

        // Delete entity_tag references first, then the tag
        const { error: deleteRefError } = await supabase
            .from('entity_tag')
            .delete()
            .eq('tag_id', tag.id);

        if (deleteRefError) {
            console.error('Failed to delete tag references:', deleteRefError);
            alert('Failed to delete tag references');
            setActionLoading(null);
            return;
        }

        const { error } = await supabase
            .from('tag')
            .delete()
            .eq('id', tag.id);

        if (error) {
            console.error('Tag delete failed:', error);
            alert(`Failed to delete tag: ${error.message}`);
        } else {
            await refetch();
        }
        setActionLoading(null);
        setDeleteTarget(null);
    };

    const handleOpenEdit = (tag: TagWithUsage) => {
        setEditingTag(tag);
        setFormData({
            name: tag.name,
            category: tag.category || '',
        });
    };

    if (loading) {
        return (
            <div className="p-24 flex justify-center font-data">
                Loading tags...
            </div>
        );
    }

    if (error) {
        return (
            <AdminPageShell
                role={role}
                title="Tag Management"
                subtitle="Organize and manage all system tags by category."
                icon={Tags}
            >
                <div className="p-8 border-2 border-brutal-red/30 bg-brutal-red/5 shadow-[6px_6px_0_0_rgba(17,17,17,1)]">
                    <h2 className="font-heading font-bold text-2xl text-brutal-red mb-4 uppercase">
                        Failed to Load Tags
                    </h2>
                    <p className="font-data text-sm text-brutal-dark/80 mb-6">
                        Error: <code className="bg-brutal-dark/10 px-2 py-1">{error}</code>
                    </p>
                    <Button onClick={() => refetch()}>
                        Retry
                    </Button>
                </div>
            </AdminPageShell>
        );
    }

    // ── Table column definitions ──────────────────────────────────
    const columns: BrutalColumn<TagWithUsage>[] = [
        {
            key: 'name',
            header: 'Name',
            render: (tag) => (
                <span className="font-bold text-brutal-dark">{tag.name}</span>
            ),
        },
        {
            key: 'category',
            header: 'Category',
            render: (tag) =>
                tag.category ? (
                    <span className="inline-block bg-brutal-dark/10 text-brutal-dark px-3 py-1 text-sm font-bold font-data capitalize border border-brutal-dark/20">
                        {tag.category.replace('_', ' ')}
                    </span>
                ) : (
                    <span className="text-brutal-dark/40 font-data text-sm italic">Uncategorized</span>
                ),
        },
        {
            key: 'usage',
            header: 'Usage',
            render: (tag) => (
                <span className="text-sm font-bold font-data text-brutal-dark/70">
                    {tag.usage_count}{' '}
                    <span className="text-brutal-dark/50">
                        ref{tag.usage_count !== 1 ? 's' : ''}
                    </span>
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            headerAlign: 'right' as const,
            cellClassName: 'text-right',
            render: (tag) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => handleOpenEdit(tag)}
                        className="p-2 border-2 border-brutal-dark hover:bg-brutal-dark hover:text-white transition-colors"
                        title="Edit tag"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(tag)}
                        disabled={actionLoading === tag.id}
                        className="p-2 border-2 border-brutal-red/20 text-brutal-red hover:bg-brutal-red hover:text-white transition-colors disabled:opacity-50"
                        title="Delete tag"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AdminPageShell
            role={role}
            title="Tag Management"
            subtitle="Organize and manage all system tags by category. Add, edit, delete, and track usage across domains, levels, skills, and project states."
            icon={Tags}
            headerAction={
                !showAddForm ? (
                    <Button
                        onClick={() => {
                            setShowAddForm(true);
                            setEditingTag(null);
                            setFormData({ name: '', category: '' });
                        }}
                    >
                        <Plus className="w-5 h-5 mr-2" /> Add New Tag
                    </Button>
                ) : undefined
            }
        >
            {/* ── Add Tag Form ───────────────────────────────────── */}
            {showAddForm && (
                <Card className="p-8 border-2 border-brutal-dark border-t-8 border-t-brutal-red shadow-[6px_6px_0_0_rgba(17,17,17,1)]">
                    <h3 className="font-heading font-bold text-2xl uppercase mb-4">
                        Add New Tag
                    </h3>
                    <form onSubmit={handleAddTag} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Tag Name"
                                placeholder="e.g., Arduino, Python, Welding"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                required
                            />
                            <div>
                                <label className="font-data text-sm font-bold text-brutal-dark mb-2 block">
                                    Category
                                </label>
                                <select
                                    className="w-full bg-brutal-bg border-2 border-brutal-dark p-3 text-brutal-dark font-data focus:outline-none focus:border-brutal-red transition-colors"
                                    value={formData.category}
                                    onChange={(e) =>
                                        setFormData({ ...formData, category: e.target.value })
                                    }
                                >
                                    <option value="">None (Uncategorized)</option>
                                    <option value="domain">Domain</option>
                                    <option value="level">Level</option>
                                    <option value="skill">Skill</option>
                                    <option value="project_status">Project Status</option>
                                    <option value="event_type">Event Type</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t-2 border-brutal-dark/10">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setShowAddForm(false);
                                    setFormData({ name: '', category: '' });
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!!actionLoading}>
                                {actionLoading === 'add' ? 'Adding...' : 'Add Tag'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* ── Category filter tabs ───────────────────────────── */}
            <div className="flex items-center gap-4 flex-wrap">
                <BrutalTabBar<CategoryFilter>
                    tabs={categoryTabs}
                    activeTab={activeCategory}
                    onTabChange={setActiveCategory}
                />
                <span className="ml-auto font-data text-sm text-brutal-dark/50 font-bold">
                    {filteredTags.length} tag{filteredTags.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* ── Search Bar ─────────────────────────────────────── */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brutal-dark/40" />
                <Input
                    placeholder="Search tags by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* ── Delete confirmation ─────────────────────────────── */}
            {deleteTarget && (
                <ConfirmDeleteCard
                    entityName={deleteTarget.name}
                    message={`Delete tag "${deleteTarget.name}"?${deleteTarget.usage_count > 0 ? ` Currently used ${deleteTarget.usage_count} time${deleteTarget.usage_count !== 1 ? 's' : ''} — all references will also be removed.` : ''}`}
                    cascadeItems={
                        deleteTarget.usage_count > 0
                            ? [{ label: 'entity references', count: deleteTarget.usage_count }]
                            : []
                    }
                    onConfirm={() => handleDeleteTag(deleteTarget)}
                    onCancel={() => setDeleteTarget(null)}
                    loading={actionLoading === deleteTarget.id}
                />
            )}

            {/* ── Tags Table ─────────────────────────────────────── */}
            {filteredTags.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-brutal-dark/20 shadow-[6px_6px_0_0_rgba(17,17,17,1)]">
                    <Tags className="w-12 h-12 text-brutal-dark/20 mx-auto mb-4" />
                    <h3 className="font-heading font-bold text-2xl text-brutal-dark/50">
                        No Tags Found
                    </h3>
                    <p className="font-data text-brutal-dark/40 mt-2">
                        {tags && tags.length === 0
                            ? 'Start by adding your first tag.'
                            : 'No tags match your current filters.'}
                    </p>
                </div>
            ) : (
                <BrutalTable<TagWithUsage>
                    columns={columns}
                    data={filteredTags}
                    rowKey={(tag) => tag.id}
                />
            )}

            {/* ── Edit Tag Modal ──────────────────────────────────── */}
            {editingTag && (
                <div className="fixed inset-0 bg-brutal-dark/60 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md p-8 border-2 border-brutal-dark border-t-8 border-t-brutal-red shadow-[6px_6px_0_0_rgba(17,17,17,1)] relative">
                        <button
                            onClick={() => {
                                setEditingTag(null);
                                setFormData({ name: '', category: '' });
                            }}
                            className="absolute top-4 right-4 p-2 hover:bg-brutal-dark/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="font-heading font-bold text-2xl uppercase mb-2">
                            Edit Tag
                        </h2>
                        <p className="font-data text-sm mb-6 text-brutal-dark/70">
                            Editing{' '}
                            <strong className="text-brutal-dark">"{editingTag.name}"</strong>
                        </p>

                        <form onSubmit={handleUpdateTag} className="space-y-4">
                            <Input
                                label="Tag Name"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                required
                            />

                            <div>
                                <label className="font-data text-sm font-bold text-brutal-dark mb-2 block">
                                    Category
                                </label>
                                <select
                                    className="w-full bg-brutal-bg border-2 border-brutal-dark p-3 text-brutal-dark font-data focus:outline-none focus:border-brutal-red transition-colors"
                                    value={formData.category}
                                    onChange={(e) =>
                                        setFormData({ ...formData, category: e.target.value })
                                    }
                                >
                                    <option value="">None (Uncategorized)</option>
                                    <option value="domain">Domain</option>
                                    <option value="level">Level</option>
                                    <option value="skill">Skill</option>
                                    <option value="project_status">Project Status</option>
                                    <option value="event_type">Event Type</option>
                                </select>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t-2 border-brutal-dark/10">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => {
                                        setEditingTag(null);
                                        setFormData({ name: '', category: '' });
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={!!actionLoading}>
                                    {actionLoading === editingTag.id ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </AdminPageShell>
    );
}
