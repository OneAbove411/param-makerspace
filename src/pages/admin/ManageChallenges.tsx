/**
 * ManageChallenges — P5 Revamp
 *
 * Table-based admin list with:
 *   - BrutalTabBar status filters (All / Draft / Published / Archived)
 *   - BrutalTable with sortable columns
 *   - Row actions: Edit (→ wizard), Delete, Quick status toggle
 *   - Multi-select + bulk action bar
 *   - "New Challenge" routes to wizard
 *
 * Inline form removed — the P2 wizard at /admin/challenges/new handles creation.
 */

import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../../lib/auth';
import { useAllChallenges, useChallengeMutations, useChallengeAnalytics } from '../../lib/hooks';
import { Zap, Plus, Trash2, Edit2, Eye, Archive, Send, Trophy, Users } from 'lucide-react';
import type { Challenge } from '../../lib/database.types';
import { AdminPageShell } from '../../components/admin/AdminPageShell';
import { BrutalTable, type BrutalColumn } from '../../components/admin/BrutalTable';
import { BrutalTabBar, type TabOption } from '../../components/admin/BrutalTabBar';
import { ConfirmDeleteCard } from '../../components/admin/ConfirmDeleteCard';
import { BrutalStatCard } from '../../components/admin/BrutalStatCard';
import { Button } from '../../components/ui/Button';
import { toast } from '../../lib/toast';
import { cn } from '../../lib/utils';

type StatusFilter = 'all' | 'draft' | 'review_ready' | 'published' | 'archived';

const TIER_DOT: Record<string, string> = {
    'Tier 1': 'bg-green-500',
    'Tier 2': 'bg-yellow-500',
    'Tier 3': 'bg-brutal-red',
};

export function ManageChallenges() {
    const navigate = useNavigate();
    const { role } = useAuth();
    const { data: challenges, loading, refetch } = useAllChallenges();
    const { updateChallenge, deleteChallenge } = useChallengeMutations();

    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const { data: analytics } = useChallengeAnalytics();
    const [deleteTarget, setDeleteTarget] = useState<Challenge | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // ─── Derived ───────────────────────────────────────────────────
    const statusCounts = useMemo(() => {
        const counts = { all: 0, draft: 0, review_ready: 0, published: 0, archived: 0 };
        for (const c of challenges || []) {
            counts.all++;
            if (c.status === 'draft') counts.draft++;
            else if (c.status === 'review_ready') counts.review_ready++;
            else if (c.status === 'published') counts.published++;
            else if (c.status === 'archived') counts.archived++;
        }
        return counts;
    }, [challenges]);

    const filtered = useMemo(() => {
        if (!challenges) return [];
        if (statusFilter === 'all') return challenges;
        return challenges.filter((c) => c.status === statusFilter);
    }, [challenges, statusFilter]);

    const tabs: TabOption<StatusFilter>[] = [
        { value: 'all', label: 'All', count: statusCounts.all },
        { value: 'draft', label: 'Draft', count: statusCounts.draft },
        { value: 'review_ready', label: 'Review', count: statusCounts.review_ready },
        { value: 'published', label: 'Published', count: statusCounts.published },
        { value: 'archived', label: 'Archived', count: statusCounts.archived },
    ];

    // ─── Handlers ──────────────────────────────────────────────────
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map((c) => c.id)));
        }
    };

    const handleQuickStatus = async (id: string, newStatus: string) => {
        setActionLoading(true);
        const { error } = await updateChallenge(id, { status: newStatus } as any);
        if (error) toast.error(error);
        else toast.success(`Status updated to ${newStatus}.`);
        await refetch();
        setActionLoading(false);
    };

    const handleDelete = async (id: string) => {
        setActionLoading(true);
        await deleteChallenge(id);
        await refetch();
        setActionLoading(false);
        setDeleteTarget(null);
        setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    };

    const handleBulkAction = async (action: 'publish' | 'archive' | 'delete') => {
        if (selectedIds.size === 0) return;
        setActionLoading(true);

        const ids = Array.from(selectedIds);
        if (action === 'delete') {
            for (const id of ids) await deleteChallenge(id);
            toast.success(`Deleted ${ids.length} challenges.`);
        } else {
            const status = action === 'publish' ? 'published' : 'archived';
            for (const id of ids) await updateChallenge(id, { status } as any);
            toast.success(`${ids.length} challenges ${status}.`);
        }

        await refetch();
        setSelectedIds(new Set());
        setActionLoading(false);
    };

    // ─── Access guard ──────────────────────────────────────────────
    if (role !== 'admin' && role !== 'mentor') {
        return <div className="p-24 text-center font-data text-2xl">Access Denied: Mentor or Admin Only</div>;
    }

    if (loading) {
        return (
            <AdminPageShell role={role} title="Challenge Management" subtitle="Loading..." icon={Zap}>
                <p className="font-data text-brutal-dark/60">Loading challenges...</p>
            </AdminPageShell>
        );
    }

    // ─── Table columns ─────────────────────────────────────────────
    const columns: BrutalColumn<Challenge>[] = [
        {
            key: 'select',
            header: '',
            headerClassName: 'w-10',
            cellClassName: 'w-10',
            render: (item) => (
                <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="w-4 h-4 accent-brutal-red cursor-pointer"
                />
            ),
        },
        {
            key: 'title',
            header: 'Title',
            render: (item) => (
                <div className="flex items-center gap-2 min-w-0">
                    {item.cover_image_url ? (
                        <img src={item.cover_image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 border border-brutal-dark/10" />
                    ) : (
                        <div className="w-8 h-8 rounded bg-brutal-dark/5 flex items-center justify-center flex-shrink-0">
                            <Zap size={12} className="text-brutal-dark/20" />
                        </div>
                    )}
                    <span className="font-heading font-bold text-sm uppercase truncate">{item.title}</span>
                </div>
            ),
        },
        {
            key: 'tier',
            header: 'Tier',
            cellClassName: 'w-24',
            render: (item) => (
                <span className="inline-flex items-center gap-1.5 font-data text-xs font-bold">
                    <span className={cn('w-2 h-2 rounded-full', TIER_DOT[item.tier || ''] || 'bg-brutal-dark/20')} />
                    {item.tier || '—'}
                </span>
            ),
        },
        {
            key: 'domain',
            header: 'Domain',
            cellClassName: 'w-32',
            render: (item) => (
                <span className="font-data text-xs text-brutal-dark/70">{item.domain || '—'}</span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cellClassName: 'w-28',
            render: (item) => (
                <span className={cn(
                    'inline-block px-2 py-0.5 rounded font-data text-[10px] font-bold uppercase',
                    item.status === 'published' ? 'bg-green-100 text-green-800 border border-green-300'
                        : item.status === 'review_ready' ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : item.status === 'archived' ? 'bg-gray-100 text-gray-600 border border-gray-300'
                                : 'bg-yellow-100 text-yellow-800 border border-yellow-300',
                )}>
                    {item.status === 'review_ready' ? 'review' : item.status}
                </span>
            ),
        },
        {
            key: 'created',
            header: 'Created',
            cellClassName: 'w-28',
            render: (item) => (
                <span className="font-data text-xs text-brutal-dark/50 tabular-nums">
                    {new Date(item.created_at).toLocaleDateString()}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            headerAlign: 'right',
            cellClassName: 'w-36',
            render: (item) => (
                <div className="flex items-center gap-1 justify-end">
                    <Link
                        to={`/challenges/${item.id}`}
                        className="p-1.5 rounded hover:bg-brutal-dark/5 text-brutal-dark/40 hover:text-brutal-dark transition-colors"
                        title="Preview"
                    >
                        <Eye size={14} />
                    </Link>
                    <Link
                        to={`/admin/challenges/${item.id}/edit`}
                        className="p-1.5 rounded hover:bg-brutal-dark/5 text-brutal-dark/40 hover:text-brutal-dark transition-colors"
                        title="Edit"
                    >
                        <Edit2 size={14} />
                    </Link>
                    {item.status === 'draft' && (
                        <button
                            type="button"
                            onClick={() => handleQuickStatus(item.id, 'published')}
                            disabled={actionLoading}
                            className="p-1.5 rounded hover:bg-green-50 text-green-600/50 hover:text-green-700 transition-colors"
                            title="Publish"
                        >
                            <Send size={14} />
                        </button>
                    )}
                    {item.status === 'published' && (
                        <button
                            type="button"
                            onClick={() => handleQuickStatus(item.id, 'archived')}
                            disabled={actionLoading}
                            className="p-1.5 rounded hover:bg-brutal-dark/5 text-brutal-dark/30 hover:text-brutal-dark transition-colors"
                            title="Archive"
                        >
                            <Archive size={14} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        disabled={actionLoading}
                        className="p-1.5 rounded hover:bg-brutal-red/5 text-brutal-red/30 hover:text-brutal-red transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ),
        },
    ];

    // ─── Render ────────────────────────────────────────────────────
    return (
        <AdminPageShell
            role={role}
            title="Challenge Management"
            subtitle={`${statusCounts.all} challenges · ${statusCounts.published} published`}
            icon={Zap}
            headerAction={
                <Button onClick={() => navigate('/admin/challenges/new')}>
                    <Plus className="w-4 h-4 mr-1.5" /> New Challenge
                </Button>
            }
        >
            {/* Delete confirmation */}
            {deleteTarget && (
                <ConfirmDeleteCard
                    entityName={deleteTarget.title}
                    message="This deletes all associated steps, materials, skills, and completions."
                    cascadeItems={[
                        { label: 'steps', count: 1 },
                        { label: 'completion records', count: 1 },
                    ]}
                    onConfirm={() => handleDelete(deleteTarget.id)}
                    onCancel={() => setDeleteTarget(null)}
                    loading={actionLoading}
                />
            )}

            {/* Analytics */}
            {analytics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <BrutalStatCard value={analytics.totalChallenges} label="Total Challenges" icon={Zap} />
                    <BrutalStatCard value={statusCounts.published} label="Published" icon={Send} variant="success" />
                    <BrutalStatCard value={analytics.totalCompletions} label="Verified Completions" icon={Trophy} />
                    <BrutalStatCard
                        value={analytics.byDomain.length > 0 ? analytics.byDomain[0].domain : '—'}
                        label={analytics.byDomain.length > 0 ? `${analytics.byDomain[0].count} completions` : 'Top Domain'}
                        icon={Users}
                    />
                </div>
            )}

            {/* Filters */}
            <BrutalTabBar tabs={tabs} activeTab={statusFilter} onTabChange={setStatusFilter} />

            {/* Bulk action bar */}
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 p-3 bg-brutal-dark/5 border-2 border-brutal-dark/15 rounded-xl">
                    <span className="font-data text-xs font-bold text-brutal-dark/70">
                        {selectedIds.size} selected
                    </span>
                    <div className="flex gap-2 ml-auto">
                        <Button
                            variant="ghost"
                            onClick={() => handleBulkAction('publish')}
                            disabled={actionLoading}
                            className="text-xs"
                        >
                            <Send size={12} className="mr-1" /> Publish
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => handleBulkAction('archive')}
                            disabled={actionLoading}
                            className="text-xs"
                        >
                            <Archive size={12} className="mr-1" /> Archive
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => handleBulkAction('delete')}
                            disabled={actionLoading}
                            className="text-xs text-brutal-red"
                        >
                            <Trash2 size={12} className="mr-1" /> Delete
                        </Button>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSelectedIds(new Set())}
                        className="font-data text-xs text-brutal-dark/40 hover:text-brutal-dark"
                    >
                        Clear
                    </button>
                </div>
            )}

            {/* Table */}
            <BrutalTable
                columns={columns}
                data={filtered}
                rowKey={(item) => item.id}
                emptyMessage="No challenges found."
            />
        </AdminPageShell>
    );
}
