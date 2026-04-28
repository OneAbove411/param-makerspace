import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { useAllProjectsAdmin, useAdminProjectMutations } from '../../lib/hooks';
import { Link } from 'react-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Zap, Trash2, Eye, Edit2, ExternalLink, Play } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getYoutubeThumbnail } from '../../lib/videoUtils';
import { AdminPageShell } from '../../components/admin/AdminPageShell';
import { BrutalTabBar } from '../../components/admin/BrutalTabBar';
import type { TabOption } from '../../components/admin/BrutalTabBar';
import { ConfirmDeleteCard } from '../../components/admin/ConfirmDeleteCard';

type StatusFilter = 'all' | 'draft' | 'pending_review' | 'active' | 'rejected';

const STATUS_TABS: TabOption<StatusFilter>[] = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending_review', label: 'Pending Review' },
    { value: 'active', label: 'Active' },
    { value: 'rejected', label: 'Rejected' },
];

export function ManageProjects() {
    const { role } = useAuth();
    const { data: projects, loading, refetch } = useAllProjectsAdmin();
    const { adminDeleteProject, adminUpdateStatus } = useAdminProjectMutations();
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

    // Video preview state
    const [previewProjectId, setPreviewProjectId] = useState<string | null>(null);
    const [previewVideos, setPreviewVideos] = useState<any[]>([]);
    const [playingVideo, setPlayingVideo] = useState<string | null>(null);
    const videoModalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (previewProjectId && videoModalRef.current) {
            videoModalRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [previewProjectId]);

    if (role !== 'admin' && role !== 'mentor') {
        return (
            <div className="p-24 text-center font-data text-2xl">
                Access Denied: Mentor or Admin Only
            </div>
        );
    }

    const filtered = (projects || []).filter(p =>
        statusFilter === 'all' ? true : p.status === statusFilter
    );

    // Compute counts per status for tab badges
    const statusCounts = (projects || []).reduce<Record<string, number>>((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
    }, {});
    const tabsWithCounts = STATUS_TABS.map(t => ({
        ...t,
        count: t.value === 'all' ? (projects || []).length : (statusCounts[t.value] || 0),
    }));

    const handleDelete = async (id: string) => {
        setActionLoading(id);
        await adminDeleteProject(id);
        await refetch();
        setActionLoading(null);
        setDeleteTarget(null);
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        setActionLoading(id);
        const vis = newStatus === 'active' ? 'public' : 'private';
        await adminUpdateStatus(id, newStatus, vis);
        await refetch();
        setActionLoading(null);
    };

    const handlePreviewVideos = async (projectId: string) => {
        if (previewProjectId === projectId) {
            setPreviewProjectId(null);
            setPreviewVideos([]);
            setPlayingVideo(null);
            return;
        }
        const { data } = await supabase
            .from('project_video')
            .select('id, title, video_url, display_order')
            .eq('project_id', projectId)
            .order('display_order');
        setPreviewVideos(data || []);
        setPreviewProjectId(projectId);
        setPlayingVideo(null);
    };

    const getEmbedUrl = (url: string): string => {
        // YouTube
        const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/))([^?&]+)/);
        if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
        // Vimeo
        const vmMatch = url.match(/vimeo\.com\/(\d+)/);
        if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;
        return url;
    };

    const statusBorderColors: Record<string, string> = {
        draft: 'border-l-yellow-400',
        pending_review: 'border-l-blue-400',
        active: 'border-l-green-500',
        rejected: 'border-l-brutal-red',
    };

    const statusColors: Record<string, string> = {
        draft: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
        pending_review: 'bg-blue-100 text-blue-700 border border-blue-300',
        active: 'bg-green-100 text-green-700 border border-green-300',
        rejected: 'bg-brutal-red/10 text-brutal-red border border-brutal-red/30',
    };

    return (
        <AdminPageShell
            role={role}
            title="Project Management"
            subtitle="View, manage status, and delete any project in the database."
            icon={Zap}
        >
            {/* ── Status filter tabs ─────────────────────────────── */}
            <div className="flex items-center gap-4 flex-wrap">
                <BrutalTabBar<StatusFilter>
                    tabs={tabsWithCounts}
                    activeTab={statusFilter}
                    onTabChange={setStatusFilter}
                />
                <span className="ml-auto font-data text-sm text-brutal-dark/50 font-bold">
                    {filtered.length} project{filtered.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* ── Delete confirmation ─────────────────────────────── */}
            {deleteTarget && (
                <ConfirmDeleteCard
                    entityName={deleteTarget.title}
                    message={`Permanently delete "${deleteTarget.title}" and ALL its data (images, videos, milestones, comments)? This CANNOT be undone.`}
                    cascadeItems={[
                        { label: 'images & videos', count: 1 },
                        { label: 'milestones & comments', count: 1 },
                    ]}
                    onConfirm={() => handleDelete(deleteTarget.id)}
                    onCancel={() => setDeleteTarget(null)}
                    loading={actionLoading === deleteTarget.id}
                />
            )}

            {loading ? (
                <div className="py-12 text-center font-data text-brutal-dark/50">Loading projects...</div>
            ) : filtered.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-brutal-dark/20 shadow-[6px_6px_0_0_rgba(17,17,17,1)]">
                    <Zap className="w-12 h-12 text-brutal-dark/20 mx-auto mb-4" />
                    <h3 className="font-heading font-bold text-2xl text-brutal-dark/50">No Projects Found</h3>
                    <p className="font-data text-brutal-dark/40 mt-2">No projects match the selected filter.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map(project => (
                        <React.Fragment key={project.id}>
                            {/* ── Project card ───────────────────────── */}
                            <div
                                className={`border-2 border-brutal-dark border-l-4 ${statusBorderColors[project.status] || ''} bg-brutal-bg shadow-[6px_6px_0_0_rgba(17,17,17,1)] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[8px_8px_0_0_rgba(17,17,17,1)] transition-all duration-200 ease-magnetic p-5 flex flex-col md:flex-row gap-4 items-start md:items-center`}
                            >
                                {/* Info */}
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-heading font-bold text-lg truncate">{project.title}</h3>
                                        <span className={`px-2 py-0.5 text-[10px] font-bold font-data uppercase ${statusColors[project.status] || ''}`}>
                                            {project.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 font-data text-xs text-brutal-dark/50">
                                        <span>Owner: <strong className="text-brutal-dark">{(project as any).ownerName}</strong></span>
                                        {project.domain && <span>Domain: <strong>{project.domain}</strong></span>}
                                        {project.tier && <span>Tier: <strong>{project.tier}</strong></span>}
                                        <span>{new Date(project.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {project.summary && (
                                        <p className="font-data text-xs text-brutal-dark/60 line-clamp-1 mt-1">{project.summary}</p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                                    {/* Video preview toggle */}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handlePreviewVideos(project.id)}
                                        className={previewProjectId === project.id ? 'border-brutal-red text-brutal-red' : ''}
                                    >
                                        <Play className="w-3.5 h-3.5 mr-1" /> Videos
                                    </Button>

                                    <Link to={`/projects/${project.id}`} target="_blank">
                                        <Button size="sm" variant="outline">
                                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                                        </Button>
                                    </Link>

                                    <Link to={`/projects/${project.id}/edit`}>
                                        <Button size="sm" variant="outline">
                                            <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                                        </Button>
                                    </Link>

                                    {/* Status dropdown */}
                                    <select
                                        value={project.status}
                                        onChange={(e) => handleStatusChange(project.id, e.target.value)}
                                        disabled={actionLoading === project.id}
                                        className="px-2 py-1.5 font-data text-xs font-bold border-2 border-brutal-dark bg-white focus:outline-none focus:border-brutal-red cursor-pointer"
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="pending_review">Pending Review</option>
                                        <option value="active">Active</option>
                                        <option value="rejected">Rejected</option>
                                    </select>

                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="border-brutal-red text-brutal-red hover:bg-brutal-red hover:text-white"
                                        onClick={() => setDeleteTarget({ id: project.id, title: project.title })}
                                        disabled={actionLoading === project.id}
                                    >
                                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                                        {actionLoading === project.id ? '...' : 'Delete'}
                                    </Button>
                                </div>
                            </div>

                            {/* ── Inline Video Preview Panel ──────────── */}
                            {previewProjectId === project.id && (
                                <div
                                    ref={videoModalRef}
                                    className="border-2 border-brutal-dark bg-brutal-paper p-6 shadow-[6px_6px_0_0_rgba(17,17,17,1)] scroll-mt-32 -mt-2 ml-4 mr-4"
                                >
                                    <h4 className="font-heading font-bold text-lg uppercase mb-4 flex items-center gap-2">
                                        <Play className="w-4 h-4 text-brutal-red" /> Videos for "{project.title}"
                                    </h4>
                                    {previewVideos.length === 0 ? (
                                        <p className="font-data text-sm text-brutal-dark/50">No videos attached to this project.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {previewVideos.map(vid => (
                                                <div key={vid.id}>
                                                    {playingVideo === vid.id ? (
                                                        /* Embedded player */
                                                        <div className="relative w-full aspect-video overflow-hidden border-2 border-brutal-dark bg-brutal-dark">
                                                            <iframe
                                                                src={getEmbedUrl(vid.video_url)}
                                                                className="absolute inset-0 w-full h-full"
                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                allowFullScreen
                                                            ></iframe>
                                                        </div>
                                                    ) : (
                                                        /* Thumbnail with play button */
                                                        <button
                                                            onClick={() => setPlayingVideo(vid.id)}
                                                            className="relative w-full aspect-video overflow-hidden border-2 border-brutal-dark bg-brutal-dark/5 group cursor-pointer block"
                                                        >
                                                            {getYoutubeThumbnail(vid.video_url) ? (
                                                                <img
                                                                    src={getYoutubeThumbnail(vid.video_url)!}
                                                                    alt={vid.title}
                                                                    loading="lazy"
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <Play className="w-12 h-12 text-brutal-dark/30" />
                                                                </div>
                                                            )}
                                                            {/* Play overlay */}
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                                                                <div className="w-16 h-16 rounded-full bg-brutal-red/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                                                    <Play className="w-7 h-7 text-white fill-white ml-1" />
                                                                </div>
                                                            </div>
                                                        </button>
                                                    )}
                                                    <div className="mt-2 font-data text-sm font-bold">{vid.title}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            )}
        </AdminPageShell>
    );
}
