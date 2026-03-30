import React, { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useProject, useProjectMutations } from '../lib/hooks';
import { supabase } from '../lib/supabase';
import { uploadFile, deleteFile } from '../lib/storage';
import { isValidVideoUrl, getYoutubeThumbnail } from '../lib/videoUtils';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
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
    Youtube,
    Clock,
    Github,
} from 'lucide-react';
import type { Project } from '../lib/database.types';


export function EditProject() {
    const pageRef = useRef<HTMLDivElement>(null);
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: project, loading, refetch } = useProject(id);
    const { updateProject } = useProjectMutations();

    // ── ALL state declarations first — never after any early return ──
    const [actionLoading, setActionLoading] = useState(false);
    const [form, setForm] = useState<Partial<Project>>({});

    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);

    const [videos, setVideos] = useState<any[]>([]);
    const [newVideoUrl, setNewVideoUrl] = useState('');
    const [newVideoTitle, setNewVideoTitle] = useState('');
    const [videoUrlError, setVideoUrlError] = useState('');
    const [addingVideo, setAddingVideo] = useState(false);

    const [milestones, setMilestones] = useState<any[]>([]);
    const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
    const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
    const milestoneListRef = useRef<HTMLElement>(null);

    const [members, setMembers] = useState<any[]>([]);
    const [addingRole, setAddingRole] = useState<'collaborator' | 'mentor'>('collaborator');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // ── Populate form + local state from the already-fetched project data ──
    const projectId = project?.id;
    useEffect(() => {
        if (!project) return;
        setForm({
            title: project.title,
            summary: project.summary,
            description: project.description,
            domain: project.domain,
            tier: project.tier,
            github_url: project.github_url,
            duration: project.duration,
        });
        setVideos(project.videos || []);
        setMilestones(project.milestones || []);
        setMembers(project.members || []);
    }, [projectId]);

    // ── searchQuery debounce useEffect — MUST be before any early returns ──
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

    // ── GSAP entrance animations — MUST be before any early returns ──
    useEffect(() => {
        if (loading || !project || !pageRef.current) return;

        const ctx = gsap.context(() => {
            gsap.fromTo(
                '.ep-hero-text',
                { y: 40, opacity: 0 },
                { y: 0, opacity: 1, stagger: 0.1, duration: 0.8, ease: 'power3.out' }
            );

            gsap.utils.toArray('.ep-section').forEach((element: any) => {
                gsap.fromTo(
                    element,
                    { y: 40, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.8,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: element,
                            start: 'top 80%',
                            markers: false,
                        },
                    }
                );
            });

            gsap.fromTo('.ep-sidebar-card',
                { y: 40, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 0.7, stagger: 0.12, ease: 'power3.out',
                    scrollTrigger: { trigger: '.ep-sidebar', start: 'top 80%' }
                }
            );
        }, pageRef);

        return () => ctx.revert();
    }, [loading, project]);

    // ── Early returns AFTER all hooks ──
    if (loading)
        return (
            <div className="flex-1 w-full bg-brutal-bg pt-24 min-h-screen animate-pulse">
                <div className="h-[20vh] bg-brutal-dark/5" />
                <div className="max-w-6xl mx-auto px-6 md:px-12 -mt-16 relative z-10">
                    <div className="bg-brutal-bg rounded-2xl p-8 border border-brutal-dark/10 space-y-4">
                        <div className="h-4 w-24 bg-brutal-dark/8 rounded" />
                        <div className="h-12 w-2/3 bg-brutal-dark/8 rounded" />
                        <div className="h-4 w-1/2 bg-brutal-dark/5 rounded" />
                    </div>
                </div>
            </div>
        );

    if (!project)
        return (
            <div className="flex-1 w-full bg-brutal-bg pt-32 px-12 min-h-screen">
                <div className="max-w-2xl mx-auto text-center py-32">
                    <h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading text-brutal-dark/20">
                        Project Not Found
                    </h1>
                    <p className="font-data text-sm text-brutal-dark/40 mt-4">
                        This project may have been removed or does not exist.
                    </p>
                    <Link to="/projects" className="inline-flex items-center gap-2 mt-8 font-heading font-bold text-sm
                                                     uppercase text-brutal-dark hover:text-brutal-red transition-colors">
                        <ArrowLeft size={16} /> Back to Archive
                    </Link>
                </div>
            </div>
        );

    if (project.owner_id !== user?.id && (user as any)?.role !== 'admin') {
        return (
            <div className="flex-1 w-full bg-brutal-bg pt-32 px-12 min-h-screen">
                <div className="max-w-2xl mx-auto text-center py-32">
                    <h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading text-brutal-red/40">
                        Access Denied
                    </h1>
                    <p className="font-data text-sm text-brutal-dark/40 mt-4">
                        Only the project owner or an admin can edit this project.
                    </p>
                    <Link to="/projects" className="inline-flex items-center gap-2 mt-8 font-heading font-bold text-sm
                                                     uppercase text-brutal-dark hover:text-brutal-red transition-colors">
                        <ArrowLeft size={16} /> Back to Archive
                    </Link>
                </div>
            </div>
        );
    }

    // ── Async data fetchers ──
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
            .select('id, user_id, role, joined_at, app_user:app_user!user_id(name, email)')
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
        if (!window.confirm("Submit for mentor review? Editing core details will be locked while pending.")) return;
        setActionLoading(true);
        const { error } = await updateProject(id, { status: 'pending_review' });
        if (error) {
            alert(error);
        } else {
            alert('Project submitted for review!');
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
            setVideoUrlError('Enter a valid YouTube or Vimeo URL (e.g. https://youtu.be/... or https://www.youtube.com/watch?v=...)');
            return;
        }
        if (!id) return;
        setAddingVideo(true);
        const title = newVideoTitle.trim() || 'Project Video';
        // Optimistic: add video to UI immediately
        const optimisticVideo = { id: 'temp-' + Date.now(), title, video_url: trimmed, display_order: videos.length + 1 };
        setVideos(prev => [...prev, optimisticVideo]);
        setNewVideoUrl('');
        setNewVideoTitle('');
        setAddingVideo(false);
        const { error } = await supabase.from('project_video').insert({
            project_id: id, title, video_url: trimmed, display_order: videos.length + 1,
        });
        if (error) alert(error.message);
        fetchVideos(); // Background sync
    };

    const handleDeleteVideo = async (videoId: string) => {
        if (!window.confirm('Remove this video?')) return;
        // Optimistic: remove from UI immediately
        setVideos(prev => prev.filter(v => v.id !== videoId));
        await supabase.from('project_video').delete().eq('id', videoId);
        fetchVideos(); // Background sync
    };

    // ── Milestone handlers ──
    const handleAddMilestone = async () => {
        if (!id || !newMilestoneTitle.trim()) return;
        const order = milestones.length > 0 ? Math.max(...milestones.map((m) => m.display_order)) + 1 : 1;
        const title = newMilestoneTitle.trim();
        const desc = newMilestoneDesc.trim() || null;
        // Optimistic: add to UI immediately
        setMilestones(prev => [...prev, { id: 'temp-' + Date.now(), title, description: desc, is_complete: false, display_order: order }]);
        setNewMilestoneTitle('');
        setNewMilestoneDesc('');
        setTimeout(() => {
            milestoneListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        await supabase.from('project_milestone').insert({ project_id: id, title, description: desc, display_order: order });
        fetchMilestones(); // Background sync
    };

    const handleToggleMilestone = async (milestoneId: string, currentVal: boolean) => {
        // Optimistic: toggle in UI immediately
        setMilestones(prev => prev.map(m => m.id === milestoneId ? { ...m, is_complete: !currentVal } : m));
        await supabase.from('project_milestone').update({ is_complete: !currentVal }).eq('id', milestoneId);
    };

    const handleDeleteMilestone = async (milestoneId: string) => {
        // Optimistic: remove from UI immediately
        setMilestones(prev => prev.filter(m => m.id !== milestoneId));
        await supabase.from('project_milestone').delete().eq('id', milestoneId);
    };

    // ── Contributor handlers ──
    const handleAddMember = async (selectedUser: any) => {
        if (!id) return;
        if (members.some((m) => m.user_id === selectedUser.id)) {
            alert('Already a contributor');
            setSearchQuery('');
            return;
        }
        // Optimistic: add member to UI immediately
        setMembers(prev => [...prev, { id: 'temp-' + Date.now(), user_id: selectedUser.id, role: addingRole, name: selectedUser.name }]);
        setSearchQuery('');
        setSearchResults([]);
        await supabase.from('project_member').insert({
            project_id: id,
            user_id: selectedUser.id,
            role: addingRole,
        });
        fetchMembers(); // Background sync
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!window.confirm('Remove this member?')) return;
        // Optimistic: remove from UI immediately
        setMembers(prev => prev.filter(m => m.id !== memberId));
        await supabase.from('project_member').delete().eq('id', memberId);
    };

    const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
        // Optimistic: update role in UI immediately
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
        await supabase.from('project_member').update({ role: newRole }).eq('id', memberId);
    };

    // ── Computed values ──
    const coverImage = project.images?.find((_, i) => i === 0)?.image_url;
    const completedMilestones = milestones.filter((m: any) => m.is_complete).length;
    const totalMilestones = milestones.length;
    const milestonePercent = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen">

            {/* ═══════════════════════════════════════════════════
                HERO — Matches ProjectDetails cover pattern
            ═══════════════════════════════════════════════════ */}
            <div className="relative h-[20vh] min-h-[180px] w-full">
                {coverImage ? (
                    <img src={coverImage} alt={project.title} className="w-full h-full object-cover" />
                ) : (
                    <div
                        className="w-full h-full bg-brutal-dark"
                        style={{
                            backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.05) 1px, transparent 1px)',
                            backgroundSize: '24px 24px',
                        }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brutal-bg via-brutal-bg/30 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-brutal-dark/20 to-transparent" />
            </div>

            {/* ═══════════════════════════════════════════════════
                PROJECT HEADER CARD — overlaps hero
            ═══════════════════════════════════════════════════ */}
            <div className="max-w-6xl mx-auto px-6 md:px-12 -mt-16 relative z-10">
                {/* Back link */}
                <Link
                    to={`/projects/${id}`}
                    className="ep-hero-text inline-flex items-center gap-2 font-data text-[10px] font-bold uppercase tracking-widest
                               hover:text-brutal-red transition-colors mb-4 text-brutal-dark/60"
                >
                    <ArrowLeft size={12} /> Back to Project
                </Link>

                <div className="bg-brutal-bg border border-brutal-dark/10 rounded-2xl p-6 md:p-8
                                shadow-[0_12px_48px_rgba(0,0,0,0.05)]">
                    {/* Badges row */}
                    <div className="ep-hero-text flex flex-wrap gap-2 items-center mb-4">
                        <span className={`px-2.5 py-0.5 font-data text-[9px] font-bold rounded-full uppercase tracking-wider
                            ${project.status === 'draft' ? 'bg-brutal-dark/10 text-brutal-dark/50' :
                                project.status === 'pending_review' ? 'bg-yellow-500/15 text-yellow-700' :
                                    project.status === 'active' ? 'bg-green-600/15 text-green-700' :
                                        'bg-brutal-red/15 text-brutal-red'
                            }`}>
                            {project.status.replace('_', ' ')}
                        </span>
                        {project.domain && (
                            <span className="border border-brutal-dark/15 px-2.5 py-0.5 font-data text-[9px] font-bold rounded-full uppercase tracking-wider text-brutal-dark/60">
                                {project.domain}
                            </span>
                        )}
                        {project.tier && (
                            <span className="border border-brutal-dark/15 px-2.5 py-0.5 font-data text-[9px] font-bold rounded-full uppercase tracking-wider text-brutal-dark/60">
                                {project.tier}
                            </span>
                        )}
                    </div>

                    {/* Title — dramatic, matching ProjectDetails */}
                    <h1 className="ep-hero-text font-drama italic text-4xl md:text-5xl lg:text-6xl text-brutal-dark leading-[0.95] tracking-tight mb-2">
                        {project.title || 'Untitled Project'}
                    </h1>

                    <p className="ep-hero-text font-data text-[10px] text-brutal-red font-bold uppercase tracking-[0.2em] mt-3">
                        Editing Mode
                    </p>

                    {/* Meta row */}
                    <div className="ep-hero-text flex flex-wrap items-center gap-3 mt-3 text-brutal-dark/40">
                        {project.duration && (
                            <span className="font-data text-xs flex items-center gap-1.5">
                                <Clock size={12} /> {project.duration}
                            </span>
                        )}
                        {project.github_url && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-brutal-dark/20" />
                                <a href={project.github_url} target="_blank" rel="noopener noreferrer"
                                   className="font-data text-xs flex items-center gap-1.5 hover:text-brutal-dark transition-colors">
                                    <Github size={12} /> Repository
                                </a>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                MAIN CONTENT + SIDEBAR GRID
            ═══════════════════════════════════════════════════ */}
            <div className="max-w-6xl mx-auto px-6 md:px-12 mt-12 pb-32 grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14">

                {/* ─── LEFT: Main Content ─── */}
                <div className="lg:col-span-2 space-y-10">

                    {/* Rejected notice */}
                    {project.status === 'rejected' && (
                        <div className="p-5 bg-brutal-red/5 border-2 border-brutal-red/20 rounded-2xl">
                            <span className="font-data text-[10px] text-brutal-red font-bold uppercase tracking-[0.2em] block mb-1">
                                Rejected
                            </span>
                            <p className="font-data text-sm text-brutal-dark/70">
                                Review the description and documentation, then resubmit for approval.
                            </p>
                        </div>
                    )}

                    {/* ── Core Details Form ── */}
                    <div className="relative">
                        {project.status === 'pending_review' && (
                            <div className="absolute inset-0 bg-brutal-bg/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-2xl">
                                <div className="bg-white p-6 border-2 border-yellow-500 text-center max-w-sm rounded-xl shadow-xl">
                                    <h3 className="font-heading font-bold text-xl text-yellow-600 uppercase mb-2">Under Review</h3>
                                    <p className="font-data text-sm text-brutal-dark/80">Core details are locked during mentor review.</p>
                                </div>
                            </div>
                        )}

                        <section className="ep-section">
                            <div className="flex items-end justify-between mb-1">
                                <div>
                                    <span className="font-data text-[10px] text-brutal-red font-bold uppercase tracking-[0.2em] block mb-2">
                                        Project Details
                                    </span>
                                    <h2 className="font-drama italic text-3xl md:text-4xl text-brutal-dark">
                                        Core
                                    </h2>
                                </div>
                            </div>
                            <div className="w-full h-px bg-brutal-dark/10 mb-6" />

                            <form onSubmit={handleSave} className="space-y-6">
                                <Input label="Project Title" required value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                                <Input label="Summary" required value={form.summary || ''} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="One-line description of this project" />
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Description</label>
                                    <textarea
                                        required
                                        className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded-xl font-data min-h-[200px] focus:outline-none focus:border-brutal-dark transition-colors"
                                        value={form.description || ''}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Detailed project description, goals, and technical approach..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Domain" value={form.domain || ''} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="e.g. Robotics" />
                                    <Input label="Tier" value={form.tier || ''} onChange={(e) => setForm({ ...form, tier: e.target.value })} placeholder="e.g. Tier 2" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Duration" placeholder="e.g. 2 weeks" value={form.duration || ''} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                                    <Input label="GitHub URL" placeholder="https://github.com/..." value={form.github_url || ''} onChange={(e) => setForm({ ...form, github_url: e.target.value })} />
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Button type="submit" disabled={actionLoading} className="gap-2">
                                        <Save className="w-4 h-4" /> Save Changes
                                    </Button>
                                </div>
                            </form>
                        </section>
                    </div>

                    {/* ── Build Milestones ── */}
                    <section ref={milestoneListRef} className="ep-section scroll-mt-32">
                        <div className="flex items-end justify-between mb-1">
                            <div>
                                <span className="font-data text-[10px] text-brutal-red font-bold uppercase tracking-[0.2em] block mb-2">
                                    Build Progress
                                </span>
                                <h3 className="font-drama italic text-3xl md:text-4xl text-brutal-dark">
                                    Milestones
                                </h3>
                            </div>
                            {totalMilestones > 0 && (
                                <span className="font-data text-xs text-brutal-dark/40 font-bold uppercase tracking-widest">
                                    {completedMilestones}/{totalMilestones} Done
                                </span>
                            )}
                        </div>
                        <div className="w-full h-px bg-brutal-dark/10 mb-6" />

                        {/* Progress bar */}
                        {totalMilestones > 0 && (
                            <div className="w-full h-1 bg-brutal-dark/8 rounded-full mb-8 overflow-hidden">
                                <div
                                    className="h-full bg-brutal-red rounded-full origin-left transition-all duration-700"
                                    style={{ width: `${milestonePercent}%` }}
                                />
                            </div>
                        )}

                        {/* Add milestone inputs */}
                        <div className="flex flex-col gap-2 mb-6 p-4 rounded-xl bg-brutal-dark/[0.03] border border-brutal-dark/8">
                            <input
                                type="text"
                                placeholder="Milestone title"
                                className="w-full bg-white border border-brutal-dark/20 px-3 py-2 rounded-xl font-data text-sm focus:outline-none focus:border-brutal-dark transition-colors"
                                value={newMilestoneTitle}
                                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Description (optional)"
                                className="w-full bg-white border border-brutal-dark/20 px-3 py-2 rounded-xl font-data text-sm focus:outline-none focus:border-brutal-dark transition-colors"
                                value={newMilestoneDesc}
                                onChange={(e) => setNewMilestoneDesc(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddMilestone()}
                            />
                            <Button size="sm" onClick={handleAddMilestone} disabled={actionLoading || !newMilestoneTitle.trim()} className="mt-1 self-start">
                                <Plus className="w-4 h-4 mr-1" /> Add Milestone
                            </Button>
                        </div>

                        {/* Milestone grid — matching ProjectDetails card style */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {milestones.map((m: any, i: number) => (
                                <div
                                    key={m.id}
                                    className={`p-5 rounded-2xl border-2 transition-all duration-300 group relative
                                        ${m.is_complete
                                            ? 'bg-brutal-bg border-brutal-dark/5 opacity-50'
                                            : 'bg-brutal-bg border-brutal-dark/10 hover:border-brutal-red/30'}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <button
                                            onClick={() => handleToggleMilestone(m.id, m.is_complete)}
                                            className={`mt-1 flex-shrink-0 transition-colors ${m.is_complete ? 'text-green-600' : 'text-brutal-dark/30 hover:text-brutal-dark/60'}`}
                                        >
                                            {m.is_complete ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                        </button>
                                        <div className="flex-1 overflow-hidden">
                                            <span className="font-data text-2xl font-bold text-brutal-red">
                                                {String(i + 1).padStart(2, '0')}
                                            </span>
                                            <h4 className={`font-heading font-bold text-sm uppercase tracking-tight-heading mt-1
                                                ${m.is_complete ? 'line-through text-brutal-dark/40' : 'text-brutal-dark'}`}>
                                                {m.title}
                                            </h4>
                                            {m.description && (
                                                <p className="font-data text-xs text-brutal-dark/50 mt-1 leading-relaxed">{m.description}</p>
                                            )}
                                        </div>
                                        <button onClick={() => handleDeleteMilestone(m.id)} className="text-brutal-red p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {milestones.length === 0 && (
                            <div className="text-center font-data text-xs text-brutal-dark/40 py-6 border-2 border-dashed border-brutal-dark/10 rounded-2xl">
                                Break the build into trackable steps.
                            </div>
                        )}
                    </section>

                    {/* ── Contributors ── */}
                    <section className="ep-section">
                        <div className="flex items-end justify-between mb-1">
                            <div>
                                <span className="font-data text-[10px] text-brutal-red font-bold uppercase tracking-[0.2em] block mb-2">
                                    Collaboration
                                </span>
                                <h3 className="font-drama italic text-3xl md:text-4xl text-brutal-dark">
                                    Team
                                </h3>
                            </div>
                        </div>
                        <div className="w-full h-px bg-brutal-dark/10 mb-6" />

                        <div className="mb-6 relative">
                            <div className="flex gap-2 mb-3 bg-brutal-dark/[0.03] p-1 rounded-lg border border-brutal-dark/8">
                                <button
                                    type="button"
                                    onClick={() => setAddingRole('collaborator')}
                                    className={`flex-1 py-1.5 px-3 rounded-md font-data text-xs font-bold uppercase transition-colors ${addingRole === 'collaborator' ? 'bg-brutal-dark text-brutal-bg' : 'text-brutal-dark/50 hover:bg-brutal-dark/5'}`}
                                >
                                    Contributor
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAddingRole('mentor')}
                                    className={`flex-1 py-1.5 px-3 rounded-md font-data text-xs font-bold uppercase transition-colors ${addingRole === 'mentor' ? 'bg-brutal-dark text-brutal-bg' : 'text-brutal-dark/50 hover:bg-brutal-dark/5'}`}
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
                                    placeholder="Search by name or email..."
                                    className="w-full bg-white border border-brutal-dark/20 pl-9 pr-4 py-2.5 rounded-xl font-data text-sm focus:outline-none focus:border-brutal-dark transition-colors"
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
                                        <div key={res.id} className="flex items-center justify-between p-3 hover:bg-brutal-dark/5 border-b border-brutal-dark/5 last:border-0">
                                            <div className="overflow-hidden">
                                                <div className="font-data text-sm font-bold truncate">{res.name}</div>
                                                <div className="font-data text-xs text-brutal-dark/50 truncate">{res.email}</div>
                                            </div>
                                            <Button size="sm" variant="ghost" className="text-brutal-red" onClick={() => handleAddMember(res)}>Add</Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 rounded-2xl border-2 border-brutal-dark/10 bg-brutal-bg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-brutal-dark text-brutal-bg font-heading font-bold
                                                    flex items-center justify-center text-xs flex-shrink-0">
                                        {(project as any).ownerName?.charAt(0)?.toUpperCase() || 'O'}
                                    </div>
                                    <div>
                                        <div className="font-data text-sm font-bold">{(project as any).ownerName || 'Owner'}</div>
                                        <div className="font-data text-[10px] font-bold text-brutal-red uppercase">Owner</div>
                                    </div>
                                </div>
                            </div>
                            {members.filter((m: any) => m.user_id !== project.owner_id).map((m: any) => (
                                <div key={m.id} className="flex items-center justify-between p-4 rounded-2xl border-2 border-brutal-dark/10 bg-brutal-bg group">
                                    <div className="flex items-center gap-3 overflow-hidden flex-1 mr-2">
                                        <div className="w-8 h-8 rounded-full bg-brutal-dark/10 text-brutal-dark font-heading font-bold
                                                        flex items-center justify-center text-xs flex-shrink-0">
                                            {m.app_user?.name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div className="overflow-hidden">
                                            <div className="font-data text-sm font-bold truncate">{m.app_user?.name}</div>
                                            <select
                                                className="font-data text-[10px] uppercase bg-transparent text-brutal-dark/60 border-none p-0 focus:ring-0 cursor-pointer"
                                                value={m.role}
                                                onChange={(e) => handleUpdateMemberRole(m.id, e.target.value)}
                                                disabled={project.owner_id !== user?.id}
                                            >
                                                <option value="collaborator">Collaborator</option>
                                                <option value="co-lead">Co-Lead</option>
                                                <option value="mentor">Mentor</option>
                                            </select>
                                        </div>
                                    </div>
                                    {project.owner_id === user?.id && (
                                        <button onClick={() => handleRemoveMember(m.id)} className="text-brutal-red p-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {members.length === 0 && (
                                <div className="text-center font-data text-xs text-brutal-dark/40 py-4 border-2 border-dashed border-brutal-dark/10 rounded-2xl">
                                    No team members added yet.
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* ─── RIGHT: Sidebar ─── */}
                <div className="ep-sidebar space-y-6">

                    {/* Submit for Review card */}
                    {(project.status === 'draft' || project.status === 'rejected') && (
                        <div className="ep-sidebar-card p-6 rounded-2xl border-2 border-brutal-red bg-brutal-red/5">
                            <span className="font-data text-[10px] text-brutal-red font-bold uppercase tracking-[0.2em] block mb-2">
                                Ready?
                            </span>
                            <h3 className="font-drama italic text-2xl text-brutal-dark mb-2">Submit</h3>
                            <p className="font-data text-sm text-brutal-dark/60 mb-4">Send for mentor review to begin fabrication.</p>
                            <Button className="w-full justify-center gap-2" onClick={handleSubmitForReview} disabled={actionLoading}>
                                <Send className="w-4 h-4" /> Submit for Review
                            </Button>
                        </div>
                    )}

                    {/* ── Gallery Images ── */}
                    <div className="ep-sidebar-card p-5 rounded-2xl border border-brutal-dark/10 bg-brutal-bg">
                        <span className="font-data text-[10px] text-brutal-red font-bold uppercase tracking-[0.2em] block mb-1">
                            Media
                        </span>
                        <h3 className="font-drama italic text-2xl text-brutal-dark mb-4">Gallery</h3>
                        <div className="space-y-3 mb-4">
                            {project.images && project.images.length > 0 ? (
                                project.images.map((img, i) => (
                                    <div key={img.id} className="relative group rounded-xl overflow-hidden border border-brutal-dark/10 bg-brutal-dark/5">
                                        <div className="w-full h-36 overflow-hidden">
                                            <img src={img.image_url} alt={img.caption || `Gallery image ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                        </div>
                                        {i === 0 && (
                                            <div className="absolute top-2 left-2 bg-brutal-dark text-white text-[10px] font-bold px-2 py-0.5 rounded font-data uppercase">Cover</div>
                                        )}
                                        {img.caption && (
                                            <div className="px-3 py-1.5 font-data text-xs text-brutal-dark/60 truncate bg-white border-t border-brutal-dark/5">{img.caption}</div>
                                        )}
                                        <button
                                            onClick={() => handleDeleteImage(img.id, img.image_url)}
                                            className="absolute top-2 right-2 bg-brutal-red text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                            disabled={actionLoading}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center p-4 border-2 border-dashed border-brutal-dark/10 rounded-xl font-data text-xs text-brutal-dark/40">
                                    No images yet. First upload becomes the cover.
                                </div>
                            )}
                        </div>
                        <label className="block w-full">
                            <span className={`flex items-center justify-center gap-2 w-full p-3 border-2 border-brutal-dark/20 border-dashed rounded-xl font-data text-sm font-bold text-brutal-dark/60 hover:bg-brutal-dark/10 hover:text-brutal-dark cursor-pointer transition-colors ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                                {uploadingImage ? (<><div className="w-4 h-4 border-2 border-brutal-dark border-t-transparent rounded-full animate-spin" />Uploading...</>) : (<><ImageIcon className="w-4 h-4" /> Upload Image</>)}
                            </span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                        </label>
                    </div>

                    {/* ── Video Links ── */}
                    <div className="ep-sidebar-card p-5 rounded-2xl border border-brutal-dark/10 bg-brutal-bg">
                        <span className="font-data text-[10px] text-brutal-red font-bold uppercase tracking-[0.2em] block mb-1">
                            Media
                        </span>
                        <h3 className="font-drama italic text-2xl text-brutal-dark mb-4">Videos</h3>
                        <div className="space-y-2 mb-4">
                            {videos.length > 0 ? videos.map((vid) => {
                                const thumb = getYoutubeThumbnail(vid.video_url);
                                return (
                                    <div key={vid.id} className="flex items-center gap-3 p-2 bg-brutal-dark/[0.03] border border-brutal-dark/8 rounded-xl group">
                                        {thumb && (
                                            <img src={thumb} alt="" className="w-16 h-10 rounded object-cover flex-shrink-0" />
                                        )}
                                        <div className="overflow-hidden flex-1">
                                            <div className="font-data text-xs font-bold truncate">{vid.title}</div>
                                            <div className="font-data text-[10px] text-brutal-dark/40 truncate">{vid.video_url}</div>
                                        </div>
                                        <button onClick={() => handleDeleteVideo(vid.id)} className="text-brutal-red p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                );
                            }) : (
                                <div className="text-center p-4 border-2 border-dashed border-brutal-dark/10 rounded-xl font-data text-xs text-brutal-dark/40">
                                    No videos yet.
                                </div>
                            )}
                        </div>
                        <form onSubmit={handleAddVideo} className="space-y-2">
                            <input
                                type="text"
                                placeholder="Video title (optional)"
                                className="w-full bg-white border border-brutal-dark/20 px-3 py-2 rounded-xl font-data text-sm focus:outline-none focus:border-brutal-dark transition-colors"
                                value={newVideoTitle}
                                onChange={(e) => setNewVideoTitle(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="https://youtu.be/..."
                                    className={`flex-1 bg-white border px-3 py-2 rounded-xl font-data text-sm focus:outline-none transition-colors ${videoUrlError ? 'border-brutal-red' : 'border-brutal-dark/20 focus:border-brutal-dark'}`}
                                    value={newVideoUrl}
                                    onChange={(e) => { setNewVideoUrl(e.target.value); setVideoUrlError(''); }}
                                />
                                <Button type="submit" size="sm" disabled={addingVideo || !newVideoUrl.trim()}>
                                    {addingVideo ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                                </Button>
                            </div>
                            {videoUrlError && <p className="font-data text-xs text-brutal-red">{videoUrlError}</p>}
                        </form>
                    </div>

                    {/* ── Source Files ── */}
                    <div className="ep-sidebar-card p-5 rounded-2xl border border-brutal-dark/10 bg-brutal-bg">
                        <span className="font-data text-[10px] text-brutal-red font-bold uppercase tracking-[0.2em] block mb-1">
                            Assets
                        </span>
                        <h3 className="font-drama italic text-2xl text-brutal-dark mb-4">Files</h3>
                        <div className="space-y-2 mb-4">
                            {project.files && project.files.length > 0 ? (
                                project.files.map((file) => (
                                    <div key={file.id} className="flex items-center justify-between p-3 bg-brutal-dark/[0.03] border border-brutal-dark/8 rounded-xl group">
                                        <div className="overflow-hidden flex-1 mr-2">
                                            <div className="font-data text-sm font-bold truncate text-brutal-dark" title={file.file_name}>{file.file_name}</div>
                                            <div className="font-data text-xs text-brutal-dark/40">{file.file_size ? (file.file_size / 1024).toFixed(1) + ' KB' : 'Unknown size'}</div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteFile(file.id, file.file_url)}
                                            className="p-2 hover:bg-brutal-red/10 hover:text-brutal-red rounded text-brutal-dark/40 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                                            disabled={actionLoading}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center p-4 border-2 border-dashed border-brutal-dark/10 rounded-xl font-data text-xs text-brutal-dark/40">
                                    Attach 3D models, code zip, BOM.csv, or PDFs.
                                </div>
                            )}
                        </div>
                        <label className="block w-full">
                            <span className={`flex items-center justify-center gap-2 w-full p-3 bg-brutal-dark text-white rounded-xl font-data text-sm font-bold hover:bg-brutal-red cursor-pointer transition-colors ${uploadingFile ? 'opacity-50 pointer-events-none' : ''}`}>
                                {uploadingFile ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Uploading...</>) : (<><FileText className="w-4 h-4" /> Attach File</>)}
                            </span>
                            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
