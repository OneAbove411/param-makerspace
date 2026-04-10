import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useSupabaseQuery } from '../../lib/hooks';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Tags, Plus, Pencil, Trash2, X, Search } from 'lucide-react';

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

export function ManageTags() {
    const { role } = useAuth();
    const { data: tags, loading, error, refetch } = useTagsData();
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingTag, setEditingTag] = useState<TagWithUsage | null>(null);
    const [formData, setFormData] = useState({ name: '', category: '' });

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
        if (
            !window.confirm(
                `Delete tag "${tag.name}"?${tag.usage_count > 0 ? ` (Currently used ${tag.usage_count} time${tag.usage_count !== 1 ? 's' : ''})` : ''}`
            )
        ) {
            return;
        }

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
            <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen">
                <div className="max-w-2xl mx-auto">
                    <div className="p-8 bg-brutal-red/10 border-2 border-brutal-red/30 rounded-2xl">
                        <h2 className="font-heading font-bold text-2xl text-brutal-red mb-4 uppercase">
                            Failed to Load Tags
                        </h2>
                        <p className="font-data text-sm text-brutal-dark/80 mb-6">
                            Error: <code className="bg-brutal-dark/10 px-2 py-1 rounded">{error}</code>
                        </p>
                        <Button onClick={() => refetch()} className="mt-6">
                            Retry
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-3 mb-2">
                    <span className="bg-brutal-red text-white px-2 py-1 text-xs font-bold font-data rounded uppercase">
                        Admin Panel
                    </span>
                    <Link
                        to="/dashboard"
                        className="text-brutal-dark/60 hover:text-brutal-dark font-data text-sm font-bold ml-auto underline"
                    >
                        Back to Dashboard
                    </Link>
                </div>

                <h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading flex items-center gap-4">
                    <Tags className="w-10 h-10 text-brutal-red" />
                    Tag Management
                </h1>
                <p className="font-data text-lg text-brutal-dark/60 border-l-4 border-brutal-red pl-4 mb-8">
                    Organize and manage all system tags by category. Add, edit, delete, and
                    track usage across domains, levels, skills, and project states.
                </p>

                {/* Add Tag Form */}
                {!showAddForm && (
                    <div>
                        <Button
                            onClick={() => {
                                setShowAddForm(true);
                                setEditingTag(null);
                                setFormData({ name: '', category: '' });
                            }}
                            className="flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add New Tag
                        </Button>
                    </div>
                )}

                {showAddForm && (
                    <Card className="p-6 border-2 border-brutal-dark">
                        <h3 className="font-heading font-bold text-lg uppercase tracking-tight-heading mb-4">
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
                                        className="w-full bg-brutal-bg border-2 border-brutal-dark p-3 rounded-xl text-brutal-dark font-data focus:outline-none focus:border-brutal-red transition-colors"
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
                            <div className="flex justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="secondary"
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

                {/* Category Tabs */}
                <div className="flex flex-wrap gap-2 border-b-2 border-brutal-dark/10 pb-4">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-2 text-sm font-bold font-data rounded transition-colors ${
                                activeCategory === cat
                                    ? 'bg-brutal-red text-white'
                                    : 'bg-brutal-dark/5 text-brutal-dark hover:bg-brutal-dark/10'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brutal-dark/40" />
                    <Input
                        placeholder="Search tags by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Tags Table */}
                {filteredTags && filteredTags.length === 0 && (
                    <div className="p-12 bg-yellow-50 border-2 border-yellow-400/50 rounded-2xl text-center">
                        <h3 className="font-heading font-bold text-2xl text-yellow-800 uppercase mb-3">
                            No Tags Found
                        </h3>
                        <p className="font-data text-sm text-yellow-800/70">
                            {tags && tags.length === 0
                                ? 'Start by adding your first tag.'
                                : 'No tags match your current filters.'}
                        </p>
                    </div>
                )}

                {filteredTags && filteredTags.length > 0 && (
                    <Card className="overflow-hidden border-2 border-brutal-dark">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse font-data">
                                <thead>
                                    <tr className="bg-brutal-dark text-brutal-bg border-b-2 border-brutal-dark/10">
                                        <th className="p-4 font-bold text-[10px] uppercase text-brutal-bg tracking-widest">
                                            Name
                                        </th>
                                        <th className="p-4 font-bold text-[10px] uppercase text-brutal-bg tracking-widest">
                                            Category
                                        </th>
                                        <th className="p-4 font-bold text-[10px] uppercase text-brutal-bg tracking-widest">
                                            Usage
                                        </th>
                                        <th className="p-4 font-bold text-[10px] uppercase text-brutal-bg tracking-widest text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brutal-dark/10">
                                    {filteredTags.map((tag) => (
                                        <tr
                                            key={tag.id}
                                            className="hover:bg-brutal-dark/5 transition-colors"
                                        >
                                            <td className="p-4">
                                                <span className="font-bold text-brutal-dark">
                                                    {tag.name}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {tag.category ? (
                                                    <span className="inline-block bg-brutal-dark/10 text-brutal-dark px-3 py-1 rounded text-sm font-bold capitalize">
                                                        {tag.category.replace('_', ' ')}
                                                    </span>
                                                ) : (
                                                    <span className="text-brutal-dark/50 italic">Uncategorized</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className="text-sm font-bold text-brutal-dark/70">
                                                    {tag.usage_count}{' '}
                                                    <span className="text-brutal-dark/50">
                                                        reference{tag.usage_count !== 1 ? 's' : ''}
                                                    </span>
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenEdit(tag)}
                                                        className="p-2 text-brutal-dark/50 hover:text-brutal-dark hover:bg-brutal-dark/5 rounded transition-colors"
                                                        title="Edit tag"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTag(tag)}
                                                        disabled={actionLoading === tag.id}
                                                        className="p-2 text-brutal-red/60 hover:text-brutal-red hover:bg-brutal-red/10 rounded transition-colors disabled:opacity-50"
                                                        title="Delete tag"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* Edit Tag Modal */}
                {editingTag && (
                    <div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-md p-6 border-2 border-brutal-dark shadow-[6px_6px_0_0_rgba(20,20,20,0.08)] relative">
                            <button
                                onClick={() => {
                                    setEditingTag(null);
                                    setFormData({ name: '', category: '' });
                                }}
                                className="absolute top-4 right-4 text-brutal-dark/50 hover:text-brutal-dark"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h2 className="font-heading font-bold text-2xl uppercase tracking-tight-heading mb-6">
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
                                        className="w-full bg-brutal-bg border-2 border-brutal-dark p-3 rounded-xl text-brutal-dark font-data focus:outline-none focus:border-brutal-red transition-colors"
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
                                        variant="secondary"
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
            </div>
        </div>
    );
}
