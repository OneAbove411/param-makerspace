import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { useAllProjectsAdmin, useAdminProjectMutations } from '../../lib/hooks';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Zap, Trash2, Eye, Edit2, ExternalLink, Play } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getYoutubeThumbnail } from '../../lib/videoUtils';

type StatusFilter = 'all' | 'draft' | 'pending_review' | 'active' | 'rejected';

export function ManageProjects() {
    const { role } = useAuth();
    const { data: projects, loading, refetch } = useAllProjectsAdmin();
    const { adminDeleteProject, adminUpdateStatus } = useAdminProjectMutations();
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

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

    if (role !== 'admin') {
        return (
            <div className="p-24 text-center font-data text-2xl">
                Access Denied: Admin Only
            </div>
        );
    }

    const filtered = (projects || []).filter(p =>
        statusFilter === 'all' ? true : p.status === statusFilter
    );

    const handleDelete = async (id: string, title: string) => {
        if (!window.confirm(`Permanently delete "${title}" and ALL its data (images, videos, milestones, comments)? This CANNOT be undone.`)) return;
        setActionLoading(id);
        await adminDeleteProject(id);
        await refetch();
        setActionLoading(null);
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

    const statusColors: Record<string, string> = {
        draft: 'bg-brutal-dark/10 text-brutal-dark/60',
        pending_review: 'bg-yellow-100 text-yellow-700',
        active: 'bg-green-100 text-green-700',
        rejected: 'bg-brutal-red/10 text-brutal-red',
    };

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center gap-3 mb-2">
                    <span className="bg-brutal-red text-brutal-bg px-2 py-1 text-xs font-bold font-data rounded uppercase">Admin</span>
                    <Link to="/dashboard" className="text-brutal-dark/60 hover:text-brutal-dark font-data text-sm font-bold ml-auto underline">
                        Back to Dashboard
                    </Link>
                </div>

                <h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading flex items-center gap-4">
                    <Zap className="w-10 h-10 text-brutal-red" />
                    Project Management
                </h1>
                <p className="font-data text-lg text-brutal-dark/60 border-l-4 border-brutal-red pl-4 mb-8">
                    View, manage status, and delete any project in the database.
                </p>

                {/* Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-data text-xs font-bold uppercase text-brutal-dark/50">Status:</span>
                    {(['all', 'draft', 'pending_review', 'active', 'rejected'] as StatusFilter[]).map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 font-data text-xs font-bold uppercase rounded-lg border-2 transition-colors ${
                                statusFilter === s
                                    ? 'border-brutal-red bg-brutal-red text-brutal-bg'
                                    : 'border-brutal-dark/20 text-brutal-dark/60 hover:border-brutal-dark/40'
                            }`}
                        >
                            {s === 'all' ? 'All' : s.replace('_', ' ')}
                        </button>
                    ))}
                    <span className="ml-auto font-data text-sm text-brutal-dark/50 font-bold">
                        {filtered.length} project{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {loading ? (
                    <div className="py-12 text-center font-data text-brutal-dark/50">Loading projects...</div>
                ) : filtered.length === 0 ? (
                    <Card className="p-12 text-center border-2 border-dashed border-brutal-dark/20 bg-transparent shadow-none">
                        <Zap className="w-12 h-12 text-brutal-dark/20 mx-auto mb-4" />
                        <h3 className="font-heading font-bold text-2xl text-brutal-dark/50">No Projects Found</h3>
                        <p className="font-data text-brutal-dark/40 mt-2">No projects match the selected filter.</p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {filtered.map(project => (
                            <React.Fragment key={project.id}>
                                <Card className="p-5 border-2 border-brutal-dark/10 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                    {/* Info */}
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-heading font-bold text-lg truncate">{project.title}</h3>
                                            <span className={`px-2 py-0.5 text-[10px] font-bold font-data uppercase rounded ${statusColors[project.status] || ''}`}>
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
                                            className="px-2 py-1.5 font-data text-xs font-bold border-2 border-brutal-dark/20 rounded-lg bg-white focus:outline-none focus:border-brutal-dark cursor-pointer"
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
                                            onClick={() => handleDelete(project.id, project.title)}
                                            disabled={actionLoading === project.id}
                                        >
                                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                                            {actionLoading === project.id ? '...' : 'Delete'}
                                        </Button>
                                    </div>
                                </Card>

                                {/* Inline Video Preview Panel */}
                                {previewProjectId === project.id && (
                                    <Card ref={videoModalRef} className="p-6 border-2 border-brutal-dark/10 bg-brutal-dark/5 scroll-mt-32 -mt-2 ml-4 mr-4">
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
                                                            /* Embedded player — plays in-site */
                                                            <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-brutal-dark/10 bg-brutal-dark">
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
                                                                className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-brutal-dark/10 bg-brutal-dark/5 group cursor-pointer block"
                                                            >
                                                                {getYoutubeThumbnail(vid.video_url) ? (
                                                                    <img
                                                                        src={getYoutubeThumbnail(vid.video_url)!}
                                                                        alt={vid.title}
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
                                    </Card>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
