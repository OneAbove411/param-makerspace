import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useProject, useProjectMutations } from '../lib/hooks';
import { supabase } from '../lib/supabase';
import { uploadFile, deleteFile } from '../lib/storage';
import { getEmbedUrl, isValidVideoUrl, getYoutubeThumbnail } from '../lib/videoUtils';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
    Settings,
    Save,
    ArrowLeft,
    Image as ImageIcon,
    FileText,
    Trash2,
    Send,
    Plus,
    Users,
    Search,
    CheckCircle2,
    Circle,
    X,
    Play,
    Youtube,
} from 'lucide-react';
import type { Project } from '../lib/database.types';


// ─── Inline video preview modal ───
function VideoPreviewModal({
    url,
    title,
    onClose,
}: {
    url: string;
    title: string;
    onClose: () => void;
}) {
    const embedUrl = getEmbedUrl(url);
    // For YouTube, add autoplay
    const autoplayUrl = embedUrl.includes('youtube.com/embed')
        ? embedUrl + (embedUrl.includes('?') ? '&' : '?') + 'autoplay=1'
        : embedUrl;

    return (
        <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-3xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-heading font-bold text-white text-xl truncate pr-4">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-white/60 hover:text-white flex-shrink-0"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border-2 border-white/10">
                    <iframe
                        src={autoplayUrl}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            </div>
        </div>
    );
}

export function EditProject() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: project, loading, refetch } = useProject(id);
    const { updateProject } = useProjectMutations();

    const [actionLoading, setActionLoading] = useState(false);
    const [form, setForm] = useState<Partial<Project>>({});

    // Image upload
    const [uploadingImage, setUploadingImage] = useState(false);
    // File upload
    const [uploadingFile, setUploadingFile] = useState(false);

    // Video state
    const [videos, setVideos] = useState<any[]>([]);
    const [newVideoUrl, setNewVideoUrl] = useState('');
    const [newVideoTitle, setNewVideoTitle] = useState('');
    const [videoUrlError, setVideoUrlError] = useState('');
    const [addingVideo, setAddingVideo] = useState(false);
    const [previewingVideo, setPreviewingVideo] = useState<{
        url: string;
        title: string;
    } | null>(null);

    // Milestones
    const [milestones, setMilestones] = useState<any[]>([]);
    const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
    const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
    const milestoneListRef = useRef<HTMLElement>(null);

    // Contributors
    const [members, setMembers] = useState<any[]>([]);
    const [addingRole, setAddingRole] = useState<'collaborator' | 'mentor'>(
        'collaborator'
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (project) {
            setForm({
                title: project.title,
                summary: project.summary,
                description: project.description,
                domain: project.domain,
                tier: project.tier,
                github_url: project.github_url,
                duration: project.duration,
            });
            fetchMilestones();
            fetchMembers();
            fetchVideos();
        }
    }, [project]);

    const fetchMilestones = async () => {
        if (!id) return;
        const { data } = await supabase
            .from('project_milestone')
            .select('id, title, description, is_complete, display_order')
            .eq('project_id', id)
            .order('display_order');
        setMilestones(data || []);
    };

    const fetchMembers = async () => {
        if (!id) return;
        const { data } = await supabase
            .from('project_member')
            .select(
                'id, user_id, role, joined_at, app_user:app_user!user_id(name, email)'
            )
            .eq('project_id', id);
        setMembers(data || []);
    };

    const fetchVideos = async () => {
        if (!id) return;
        const { data } = await supabase
            .from('project_video')
            .select('id, title, video_url, display_order')
            .eq('project_id', id)
            .order('display_order');
        setVideos(data || []);
    };

    if (loading)
        return (
            <div className="p-24 flex justify-center font-data">
                Loading project...
            </div>
        );

    if (!project)
        return <div className="p-24 font-data">Project not found.</div>;

    if (project.owner_id !== user?.id && (user as any)?.role !== 'admin') {
        return (
            <div className="p-24 font-data text-xl text-brutal-red font-bold">
                Access Denied: You don't own this project.
            </div>
        );
    }

    // ── Core form save ──
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        setActionLoading(true);
        const { error } = await updateProject(id, form);
        if (error) {
            alert(error);
        } else {
            await refetch();
            alert('Project details saved!');
        }
        setActionLoading(false);
    };

    const handleSubmitForReview = async () => {
        if (!id) return;
        if (
            !window.confirm(
                "Submit for mentor review? You won't be able to edit core details while it's pending."
            )
        )
            return;
        setActionLoading(true);
        const { error } = await updateProject(id, { status: 'pending_review' });
        if (error) {
            alert(error);
        } else {
            alert('Project submitted for review successfully!');
            navigate('/dashboard');
        }
        setActionLoading(false);
    };

    // ── Image handlers ──
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !id) return;
        setUploadingImage(true);
        const path = `${id}/${Date.now()}-${file.name}`;
        const { url, error } = await uploadFile('project-images', path, file);
        if (error) {
            alert(error);
        } else if (url) {
            const { error: dbError } = await supabase.from('project_image').insert({
                project_id: id,
                image_url: url,
                display_order: (project.images?.length || 0) + 1,
            });
            if (dbError) alert(dbError.message);
            else await refetch();
        }
        setUploadingImage(false);
        // Reset input so same file can be re-uploaded if needed
        e.target.value = '';
    };

    const handleDeleteImage = async (imageId: string, url: string) => {
        if (!window.confirm('Delete this image?')) return;
        setActionLoading(true);
        const pathMatch = url.match(/project-images\/(.+)$/);
        if (pathMatch) await deleteFile('project-images', pathMatch[1]);
        await supabase.from('project_image').delete().eq('id', imageId);
        await refetch();
        setActionLoading(false);
    };

    // ── File handlers ──
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !id) return;
        setUploadingFile(true);
        const path = `${id}/${Date.now()}-${file.name}`;
        const { url, error } = await uploadFile('project-files', path, file);
        if (error) {
            alert(error);
        } else if (url) {
            const { error: dbError } = await supabase.from('project_file').insert({
                project_id: id,
                file_url: url,
                file_name: file.name,
                file_size: file.size,
            });
            if (dbError) alert(dbError.message);
            else await refetch();
        }
        setUploadingFile(false);
        e.target.value = '';
    };

    const handleDeleteFile = async (fileId: string, url: string) => {
        if (!window.confirm('Delete this attached file?')) return;
        setActionLoading(true);
        const pathMatch = url.match(/project-files\/(.+)$/);
        if (pathMatch) await deleteFile('project-files', pathMatch[1]);
        await supabase.from('project_file').delete().eq('id', fileId);
        await refetch();
        setActionLoading(false);
    };

    // ── Video handlers ──
    const handleAddVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        setVideoUrlError('');
        const trimmed = newVideoUrl.trim();
        if (!trimmed) return;
        if (!isValidVideoUrl(trimmed)) {
            setVideoUrlError(
                'Please enter a valid YouTube or Vimeo URL (e.g. https://youtu.be/... or https://www.youtube.com/watch?v=...)'
            );
            return;
        }
        if (!id) return;
        setAddingVideo(true);
        const title = newVideoTitle.trim() || 'Project Video';
        const { error } = await supabase.from('project_video').insert({
            project_id: id,
            title,
            video_url: trimmed,
            display_order: videos.length + 1,
        });
        if (error) {
            alert(error.message);
        } else {
            setNewVideoUrl('');
            setNewVideoTitle('');
            await fetchVideos();
        }
        setAddingVideo(false);
    };

    const handleDeleteVideo = async (videoId: string) => {
        if (!window.confirm('Remove this video?')) return;
        await supabase.from('project_video').delete().eq('id', videoId);
        await fetchVideos();
    };

    // ── Milestone handlers ──
    const handleAddMilestone = async () => {
        if (!id || !newMilestoneTitle.trim()) return;
        setActionLoading(true);
        const order =
            milestones.length > 0
                ? Math.max(...milestones.map((m) => m.display_order)) + 1
                : 1;
        await supabase.from('project_milestone').insert({
            project_id: id,
            title: newMilestoneTitle.trim(),
            description: newMilestoneDesc.trim() || null,
            display_order: order,
        });
        setNewMilestoneTitle('');
        setNewMilestoneDesc('');
        await fetchMilestones();
        setActionLoading(false);
        setTimeout(() => {
            milestoneListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const handleToggleMilestone = async (
        milestoneId: string,
        currentVal: boolean
    ) => {
        await supabase
            .from('project_milestone')
            .update({ is_complete: !currentVal })
            .eq('id', milestoneId);
        await fetchMilestones();
    };

    const handleDeleteMilestone = async (milestoneId: string) => {
        await supabase.from('project_milestone').delete().eq('id', milestoneId);
        await fetchMilestones();
    };

    // ── Contributor search ──
    useEffect(() => {
        const bounce = setTimeout(async () => {
            if (searchQuery.length < 2) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            const { data } = await supabase
                .from('app_user')
                .select('id, name, email')
                .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
                .limit(5);
            setSearchResults(data || []);
            setIsSearching(false);
        }, 300);
        return () => clearTimeout(bounce);
    }, [searchQuery]);

    const handleAddMember = async (selectedUser: any) => {
        if (!id) return;
        if (members.some((m) => m.user_id === selectedUser.id)) {
            alert('Already a contributor');
            setSearchQuery('');
            return;
        }
        setActionLoading(true);
        await supabase.from('project_member').insert({
            project_id: id,
            user_id: selectedUser.id,
            role: addingRole,
        });
        setSearchQuery('');
        setSearchResults([]);
        await fetchMembers();
        setActionLoading(false);
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!window.confirm('Remove this member?')) return;
        await supabase.from('project_member').delete().eq('id', memberId);
        await fetchMembers();
    };

    const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
        await supabase
            .from('project_member')
            .update({ role: newRole })
            .eq('id', memberId);
        await fetchMembers();
    };

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
            {/* Video preview modal */}
            {previewingVideo && (
                <VideoPreviewModal
                    url={previewingVideo.url}
                    title={previewingVideo.title}
                    onClose={() => setPreviewingVideo(null)}
                />
            )}

            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center gap-3 mb-2">
                    <span
                        className={`px-2 py-1 text-xs font-bold font-data rounded uppercase text-white ${project.status === 'draft'
                                ? 'bg-brutal-dark/40'
                                : project.status === 'pending_review'
                                    ? 'bg-yellow-500 text-yellow-900'
                                    : project.status === 'active'
                                        ? 'bg-green-600'
                                        : 'bg-brutal-red'
                            }`}
                    >
                        STATUS: {project.status.replace('_', ' ')}
                    </span>
                    <Link
                        to={`/projects/${id}`}
                        className="text-brutal-dark/60 hover:text-brutal-dark font-data text-sm font-bold ml-auto flex items-center gap-1 underline"
                    >
                        <ArrowLeft className="w-4 h-4" /> View Public Page
                    </Link>
                </div>

                <div className="flex justify-between items-end border-b-2 border-brutal-dark/10 pb-6">
                    <div>
                        <h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading flex items-center gap-4">
                            <Settings className="w-10 h-10 text-brutal-dark" />
                            Edit Project
                        </h1>
                        <p className="font-data text-lg text-brutal-dark/60 mt-2">
                            Update your project thesis, attach CAD files, and upload gallery
                            images.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                    {/* ── Main form ── */}
                    <div className="md:col-span-2 space-y-8">
                        {project.status === 'rejected' && (
                            <div className="p-4 bg-brutal-red/10 border-2 border-brutal-red/30 rounded-xl">
                                <strong className="font-data text-sm uppercase text-brutal-red block mb-1">
                                    Project Rejected
                                </strong>
                                <p className="font-data text-sm text-brutal-dark/70">
                                    Review your description and documentation, then resubmit.
                                </p>
                            </div>
                        )}

                        {/* Locked overlay when pending */}
                        <div className="relative">
                            {project.status === 'pending_review' && (
                                <div className="absolute inset-0 bg-brutal-bg/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-2xl">
                                    <div className="bg-white p-6 border-2 border-yellow-500 text-center max-w-sm rounded-xl shadow-xl">
                                        <h3 className="font-heading font-bold text-xl text-yellow-600 uppercase mb-2">
                                            Under Review
                                        </h3>
                                        <p className="font-data text-sm text-brutal-dark/80">
                                            Locked for mentor review. You can't edit core details
                                            right now.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <Card className="p-8 border-2 border-brutal-dark/20">
                                <h2 className="font-heading font-bold text-2xl uppercase border-b-2 border-brutal-dark/10 pb-4 mb-6">
                                    Core Details
                                </h2>
                                <form onSubmit={handleSave} className="space-y-6">
                                    <Input
                                        label="Project Title"
                                        required
                                        value={form.title || ''}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    />
                                    <Input
                                        label="Summary (One-line pitch)"
                                        required
                                        value={form.summary || ''}
                                        onChange={(e) =>
                                            setForm({ ...form, summary: e.target.value })
                                        }
                                    />
                                    <div>
                                        <label className="font-data text-sm font-bold text-brutal-dark block mb-1">
                                            Detailed Description / Instructions
                                        </label>
                                        <textarea
                                            required
                                            className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded font-data min-h-[200px] focus:outline-none focus:border-brutal-dark"
                                            value={form.description || ''}
                                            onChange={(e) =>
                                                setForm({ ...form, description: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Domain (e.g., Robotics)"
                                            value={form.domain || ''}
                                            onChange={(e) =>
                                                setForm({ ...form, domain: e.target.value })
                                            }
                                        />
                                        <Input
                                            label="Tier / Complexity"
                                            value={form.tier || ''}
                                            onChange={(e) =>
                                                setForm({ ...form, tier: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Duration Est."
                                            placeholder="e.g. 2 weeks"
                                            value={form.duration || ''}
                                            onChange={(e) =>
                                                setForm({ ...form, duration: e.target.value })
                                            }
                                        />
                                        <Input
                                            label="GitHub URL"
                                            placeholder="https://github.com/..."
                                            value={form.github_url || ''}
                                            onChange={(e) =>
                                                setForm({ ...form, github_url: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <Button type="submit" disabled={actionLoading} className="gap-2">
                                            <Save className="w-5 h-5" /> Save Changes
                                        </Button>
                                    </div>
                                </form>
                            </Card>
                        </div>

                        {/* ── Milestones ── */}
                        <section ref={milestoneListRef} className="bg-brutal-dark/5 rounded-[2rem] p-6 border border-brutal-dark/10 scroll-mt-32">
                            <h3 className="font-heading font-bold text-lg mb-4 uppercase flex items-center gap-2 border-b-2 border-brutal-dark/10 pb-2">
                                <CheckCircle2 className="w-5 h-5" /> Build Milestones
                            </h3>
                            <div className="flex flex-col gap-2 mb-6">
                                <input
                                    type="text"
                                    placeholder="Milestone Title"
                                    className="w-full bg-white border border-brutal-dark/20 px-3 py-2 rounded-lg font-data text-sm focus:outline-none focus:border-brutal-dark"
                                    value={newMilestoneTitle}
                                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="Description (optional)"
                                    className="w-full bg-white border border-brutal-dark/20 px-3 py-2 rounded-lg font-data text-sm focus:outline-none focus:border-brutal-dark"
                                    value={newMilestoneDesc}
                                    onChange={(e) => setNewMilestoneDesc(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddMilestone()}
                                />
                                <Button
                                    size="sm"
                                    onClick={handleAddMilestone}
                                    disabled={actionLoading || !newMilestoneTitle.trim()}
                                    className="mt-1"
                                >
                                    <Plus className="w-4 h-4 mr-1" /> Add Milestone
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {milestones.map((m: any) => (
                                    <div
                                        key={m.id}
                                        className="flex items-start gap-3 bg-white p-3 rounded-xl border border-brutal-dark/10 group"
                                    >
                                        <button
                                            onClick={() => handleToggleMilestone(m.id, m.is_complete)}
                                            className={`mt-0.5 flex-shrink-0 transition-colors ${m.is_complete
                                                    ? 'text-green-600'
                                                    : 'text-brutal-dark/30 hover:text-brutal-dark/60'
                                                }`}
                                        >
                                            {m.is_complete ? (
                                                <CheckCircle2 className="w-5 h-5" />
                                            ) : (
                                                <Circle className="w-5 h-5" />
                                            )}
                                        </button>
                                        <div
                                            className={`overflow-hidden flex-1 ${m.is_complete ? 'opacity-50 line-through' : ''
                                                }`}
                                        >
                                            <div className="font-data text-sm font-bold truncate">
                                                {m.title}
                                            </div>
                                            {m.description && (
                                                <div className="font-data text-xs text-brutal-dark/60 truncate mt-0.5">
                                                    {m.description}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteMilestone(m.id)}
                                            className="text-brutal-red p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {milestones.length === 0 && (
                                    <div className="text-center font-data text-xs text-brutal-dark/40 py-4 border-2 border-dashed border-brutal-dark/10 rounded-xl">
                                        Break your build into trackable steps.
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ── Contributors ── */}
                        <section className="bg-brutal-dark/5 rounded-[2rem] p-6 border border-brutal-dark/10">
                            <h3 className="font-heading font-bold text-lg mb-4 uppercase flex items-center gap-2 border-b-2 border-brutal-dark/10 pb-2">
                                <Users className="w-5 h-5" /> Contributors
                            </h3>

                            <div className="mb-6 relative">
                                <div className="flex gap-2 mb-3 bg-white p-1 rounded-lg border border-brutal-dark/10">
                                    <button
                                        type="button"
                                        onClick={() => setAddingRole('collaborator')}
                                        className={`flex-1 py-1 px-2 rounded font-data text-xs font-bold uppercase transition-colors ${addingRole === 'collaborator'
                                                ? 'bg-brutal-dark text-brutal-bg'
                                                : 'text-brutal-dark/50 hover:bg-brutal-dark/5'
                                            }`}
                                    >
                                        Contributor
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAddingRole('mentor')}
                                        className={`flex-1 py-1 px-2 rounded font-data text-xs font-bold uppercase transition-colors ${addingRole === 'mentor'
                                                ? 'bg-brutal-dark text-brutal-bg'
                                                : 'text-brutal-dark/50 hover:bg-brutal-dark/5'
                                            }`}
                                    >
                                        Mentor
                                    </button>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        <Search className="w-4 h-4 text-brutal-dark/40" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search name or email..."
                                        className="w-full bg-white border border-brutal-dark/20 pl-9 pr-4 py-2 rounded-xl font-data text-sm focus:outline-none focus:border-brutal-dark"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {isSearching && (
                                        <div className="absolute right-3 top-3 w-3 h-3 border-2 border-brutal-dark border-t-transparent rounded-full animate-spin" />
                                    )}
                                </div>
                                {searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-brutal-dark/10 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                                        {searchResults.map((res) => (
                                            <div
                                                key={res.id}
                                                className="flex items-center justify-between p-3 hover:bg-brutal-dark/5 border-b border-brutal-dark/5 last:border-0"
                                            >
                                                <div className="overflow-hidden">
                                                    <div className="font-data text-sm font-bold truncate">
                                                        {res.name}
                                                    </div>
                                                    <div className="font-data text-xs text-brutal-dark/50 truncate">
                                                        {res.email}
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-brutal-red"
                                                    onClick={() => handleAddMember(res)}
                                                >
                                                    Add
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-brutal-dark/10">
                                    <div>
                                        <div className="font-data text-sm font-bold truncate">
                                            {(project as any).ownerName || 'You (Owner)'}
                                        </div>
                                        <div className="font-data text-[10px] font-bold text-brutal-red uppercase">
                                            Owner
                                        </div>
                                    </div>
                                </div>
                                {members
                                    .filter((m: any) => m.user_id !== project.owner_id)
                                    .map((m: any) => (
                                        <div
                                            key={m.id}
                                            className="flex items-center justify-between bg-white p-3 rounded-xl border border-brutal-dark/10 group"
                                        >
                                            <div className="overflow-hidden flex-1 mr-2">
                                                <div className="font-data text-sm font-bold truncate">
                                                    {m.app_user?.name}
                                                </div>
                                                <select
                                                    className="font-data text-[10px] uppercase bg-transparent text-brutal-dark/60 border-none p-0 focus:ring-0 cursor-pointer"
                                                    value={m.role}
                                                    onChange={(e) =>
                                                        handleUpdateMemberRole(m.id, e.target.value)
                                                    }
                                                    disabled={project.owner_id !== user?.id}
                                                >
                                                    <option value="collaborator">Collaborator</option>
                                                    <option value="co-lead">Co-Lead</option>
                                                    <option value="mentor">Mentor</option>
                                                </select>
                                            </div>
                                            {project.owner_id === user?.id && (
                                                <button
                                                    onClick={() => handleRemoveMember(m.id)}
                                                    className="text-brutal-red p-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                {members.length === 0 && (
                                    <div className="text-center font-data text-xs text-brutal-dark/40 py-2">
                                        No team members added yet.
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* ── Sidebar ── */}
                    <div className="space-y-6">
                        {/* Submit card */}
                        {(project.status === 'draft' || project.status === 'rejected') && (
                            <Card className="p-6 border-2 border-brutal-red bg-brutal-red/5">
                                <h3 className="font-heading font-bold text-xl uppercase text-brutal-red mb-2">
                                    Ready to Build?
                                </h3>
                                <p className="font-data text-sm text-brutal-dark/70 mb-4">
                                    Submit to mentors for approval to begin fabrication.
                                </p>
                                <Button
                                    className="w-full justify-center gap-2"
                                    onClick={handleSubmitForReview}
                                    disabled={actionLoading}
                                >
                                    <Send className="w-4 h-4" /> Submit for Review
                                </Button>
                            </Card>
                        )}

                        {/* ── Gallery Images ── */}
                        <section className="bg-brutal-dark/5 rounded-[2rem] p-6 border border-brutal-dark/10">
                            <h3 className="font-heading font-bold text-lg mb-4 uppercase flex items-center gap-2 border-b-2 border-brutal-dark/10 pb-2">
                                <ImageIcon className="w-5 h-5" /> Gallery Images
                            </h3>

                            <div className="space-y-3 mb-4">
                                {project.images && project.images.length > 0 ? (
                                    project.images.map((img, i) => (
                                        <div
                                            key={img.id}
                                            className="relative group rounded-xl overflow-hidden border-2 border-brutal-dark/10 bg-white"
                                        >
                                            {/* ── Actual image thumbnail ── */}
                                            <div className="w-full h-36 overflow-hidden bg-brutal-dark/5">
                                                <img
                                                    src={img.image_url}
                                                    alt={img.caption || `Gallery image ${i + 1}`}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            </div>

                                            {/* Cover badge */}
                                            {i === 0 && (
                                                <div className="absolute top-2 left-2 bg-brutal-dark text-white text-[10px] font-bold px-2 py-0.5 rounded font-data uppercase">
                                                    Cover
                                                </div>
                                            )}

                                            {/* Caption */}
                                            {img.caption && (
                                                <div className="px-3 py-1.5 font-data text-xs text-brutal-dark/60 truncate bg-white border-t border-brutal-dark/5">
                                                    {img.caption}
                                                </div>
                                            )}

                                            {/* Delete button — appears on hover */}
                                            <button
                                                onClick={() =>
                                                    handleDeleteImage(img.id, img.image_url)
                                                }
                                                className="absolute top-2 right-2 bg-brutal-red text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                title="Delete image"
                                                disabled={actionLoading}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center p-4 border-2 border-dashed border-brutal-dark/20 rounded-xl font-data text-xs text-brutal-dark/50">
                                        No images yet. First image becomes the cover.
                                    </div>
                                )}
                            </div>

                            <label className="block w-full">
                                <span
                                    className={`flex items-center justify-center gap-2 w-full p-3 border-2 border-brutal-dark/20 border-dashed rounded-xl font-data text-sm font-bold text-brutal-dark/60 hover:bg-brutal-dark/10 hover:text-brutal-dark cursor-pointer transition-colors ${uploadingImage ? 'opacity-50 pointer-events-none' : ''
                                        }`}
                                >
                                    {uploadingImage ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-brutal-dark border-t-transparent rounded-full animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <ImageIcon className="w-4 h-4" /> Upload Image
                                        </>
                                    )}
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                    disabled={uploadingImage}
                                />
                            </label>
                        </section>

                        {/* ── YouTube / Video Links ── */}
                        <section className="bg-brutal-dark/5 rounded-[2rem] p-6 border border-brutal-dark/10">
                            <h3 className="font-heading font-bold text-lg mb-4 uppercase flex items-center gap-2 border-b-2 border-brutal-dark/10 pb-2">
                                <Youtube className="w-5 h-5 text-brutal-red" /> Video Links
                            </h3>

                            {/* Existing videos */}
                            <div className="space-y-3 mb-4">
                                {videos.length > 0 ? (
                                    videos.map((vid) => {
                                        const thumb = getYoutubeThumbnail(vid.video_url);
                                        return (
                                            <div
                                                key={vid.id}
                                                className="relative group rounded-xl overflow-hidden border-2 border-brutal-dark/10 bg-white"
                                            >
                                                {/* Thumbnail with play button overlay */}
                                                <div
                                                    className="relative w-full h-28 bg-brutal-dark cursor-pointer overflow-hidden"
                                                    onClick={() =>
                                                        setPreviewingVideo({
                                                            url: vid.video_url,
                                                            title: vid.title,
                                                        })
                                                    }
                                                >
                                                    {thumb ? (
                                                        <img
                                                            src={thumb}
                                                            alt={vid.title}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-brutal-dark/80">
                                                            <Play className="w-8 h-8 text-brutal-bg/40" />
                                                        </div>
                                                    )}
                                                    {/* Play overlay */}
                                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <div className="w-10 h-10 bg-brutal-red rounded-full flex items-center justify-center shadow-xl">
                                                            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                                                        </div>
                                                    </div>
                                                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-data">
                                                        Click to preview
                                                    </div>
                                                </div>

                                                {/* Title row */}
                                                <div className="flex items-center justify-between px-3 py-2 bg-white border-t border-brutal-dark/5">
                                                    <span className="font-data text-xs font-bold text-brutal-dark truncate flex-1 mr-2">
                                                        {vid.title}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteVideo(vid.id)}
                                                        className="text-brutal-red hover:bg-brutal-red/10 p-1 rounded flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Remove video"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center p-4 border-2 border-dashed border-brutal-dark/20 rounded-xl font-data text-xs text-brutal-dark/50">
                                        No videos added yet. Paste a YouTube or Vimeo link below.
                                    </div>
                                )}
                            </div>

                            {/* Add video form */}
                            <form onSubmit={handleAddVideo} className="space-y-2">
                                <input
                                    type="text"
                                    placeholder="Video title (optional)"
                                    className="w-full bg-white border border-brutal-dark/20 px-3 py-2 rounded-lg font-data text-sm focus:outline-none focus:border-brutal-dark"
                                    value={newVideoTitle}
                                    onChange={(e) => setNewVideoTitle(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="https://youtu.be/... or youtube.com/watch?v=..."
                                        className={`flex-1 bg-white border px-3 py-2 rounded-lg font-data text-sm focus:outline-none transition-colors ${videoUrlError
                                                ? 'border-brutal-red focus:border-brutal-red'
                                                : 'border-brutal-dark/20 focus:border-brutal-dark'
                                            }`}
                                        value={newVideoUrl}
                                        onChange={(e) => {
                                            setNewVideoUrl(e.target.value);
                                            setVideoUrlError('');
                                        }}
                                    />
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={addingVideo || !newVideoUrl.trim()}
                                    >
                                        {addingVideo ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Plus className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                                {videoUrlError && (
                                    <p className="font-data text-xs text-brutal-red">
                                        {videoUrlError}
                                    </p>
                                )}
                                <p className="font-data text-[10px] text-brutal-dark/40">
                                    Supports YouTube (youtu.be, youtube.com/watch, /shorts) and
                                    Vimeo
                                </p>
                            </form>
                        </section>

                        {/* ── Source Files ── */}
                        <section className="bg-brutal-dark/5 rounded-[2rem] p-6 border border-brutal-dark/10">
                            <h3 className="font-heading font-bold text-lg mb-4 uppercase flex items-center gap-2 border-b-2 border-brutal-dark/10 pb-2">
                                <FileText className="w-5 h-5" /> Source Files
                            </h3>

                            <div className="space-y-2 mb-4">
                                {project.files && project.files.length > 0 ? (
                                    project.files.map((file) => (
                                        <div
                                            key={file.id}
                                            className="flex items-center justify-between p-3 bg-white border border-brutal-dark/10 rounded-xl group"
                                        >
                                            <div className="overflow-hidden flex-1 mr-2">
                                                <div
                                                    className="font-data text-sm font-bold truncate text-brutal-dark"
                                                    title={file.file_name}
                                                >
                                                    {file.file_name}
                                                </div>
                                                <div className="font-data text-xs text-brutal-dark/40">
                                                    {file.file_size
                                                        ? (file.file_size / 1024).toFixed(1) + ' KB'
                                                        : 'Unknown size'}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    handleDeleteFile(file.id, file.file_url)
                                                }
                                                className="p-2 hover:bg-brutal-red/10 hover:text-brutal-red rounded text-brutal-dark/40 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                                                title="Delete file"
                                                disabled={actionLoading}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center p-4 border-2 border-dashed border-brutal-dark/20 rounded-xl font-data text-xs text-brutal-dark/50">
                                        Attach 3D models, code zip, BOM.csv, or PDFs here.
                                    </div>
                                )}
                            </div>

                            <label className="block w-full">
                                <span
                                    className={`flex items-center justify-center gap-2 w-full p-3 bg-brutal-dark text-white rounded-xl font-data text-sm font-bold hover:bg-brutal-red cursor-pointer transition-colors ${uploadingFile ? 'opacity-50 pointer-events-none' : ''
                                        }`}
                                >
                                    {uploadingFile ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="w-4 h-4" /> Attach File
                                        </>
                                    )}
                                </span>
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={uploadingFile}
                                />
                            </label>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}