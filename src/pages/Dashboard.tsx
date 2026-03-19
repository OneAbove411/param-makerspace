import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { useMyProjects, useMyStats, useProjectMutations, useMyProfile, useUserBadges, useRankAccess, useMyXPHistory } from '../lib/hooks';
import { Card } from '../components/ui/Card';
import { RankBadge } from '../components/ui/RankBadge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Settings, Plus, Calendar, Trophy, Zap, AlertTriangle, X, ClipboardCheck, Users, Award, Play, Image as ImageIcon } from 'lucide-react';
import { BadgeIcon } from '../components/ui/BadgeIcon';
import { isValidVideoUrl, getYoutubeThumbnail } from '../lib/videoUtils';

export function Dashboard() {
    const { user, role } = useAuth();
    const navigate = useNavigate();
    const { data: stats } = useMyStats();
    const { data: myProjects, refetch: refetchProjects } = useMyProjects();
    const { createProject } = useProjectMutations();

    const [showNewProject, setShowNewProject] = useState(false);
    const [newProjectForm, setNewProjectForm] = useState({ title: '', summary: '', description: '', domain: '', tier: '' });
    const [creating, setCreating] = useState(false);
    const [createStep, setCreateStep] = useState<1 | 2>(1);
    const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
    const [bannerDismissed, setBannerDismissed] = useState(false);
    
    // Video step state
    const [videos, setVideos] = useState<any[]>([]);
    const [newVideoUrl, setNewVideoUrl] = useState('');
    const [newVideoTitle, setNewVideoTitle] = useState('');
    const [videoUrlError, setVideoUrlError] = useState('');
    const [addingVideo, setAddingVideo] = useState(false);

    const formRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (showNewProject && formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [showNewProject]);
    const { data: myProfile } = useMyProfile();
    const { data: myBadges } = useUserBadges(user?.id);
    const { data: rankAccess } = useRankAccess();
    const { data: xpHistory } = useMyXPHistory();


    const profileComplete = !!(
        myProfile?.bio &&
        (myProfile as any)?.avatar_url &&
        myProfile?.display_name &&
        ((myProfile as any)?.github_url || (myProfile as any)?.linkedin_url)
    );

    const activeProjects = stats?.activeProjects || 0;
    const upcomingEvents = stats?.upcomingEvents || 0;
    const completedChallenges = stats?.completedChallenges || 0;

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const { data: project, error } = await createProject(newProjectForm);
            if (error || !project) {
                alert('Failed to create project: ' + (error || 'Unknown error'));
                setCreating(false);
                return;
            }
            setCreatedProjectId(project.id);

            // If a video URL was entered in Step 1, insert it now
            // Done in a separate try/catch so video failure doesn't block project creation
            // NOTE: avoid .select().single() after insert — it can hang when RLS
            // blocks the RETURNING clause even though the INSERT itself succeeds.
            const trimmedUrl = newVideoUrl.trim();
            if (trimmedUrl && isValidVideoUrl(trimmedUrl)) {
                try {
                    const vTitle = newVideoTitle.trim() || 'Project Video';
                    const { error: vidError } = await supabase
                        .from('project_video')
                        .insert({
                            project_id: project.id,
                            title: vTitle,
                            video_url: trimmedUrl,
                            display_order: 1,
                        });
                    if (vidError) {
                        console.error('Video insert error:', vidError);
                    } else {
                        // Fetch the inserted video separately to populate the list
                        const { data: vids } = await supabase
                            .from('project_video')
                            .select('id, title, video_url, display_order')
                            .eq('project_id', project.id)
                            .order('display_order');
                        if (vids) setVideos(vids);
                    }
                } catch (vidErr) {
                    console.error('Video insert exception:', vidErr);
                }
                setNewVideoUrl('');
                setNewVideoTitle('');
            }

            setCreateStep(2);
            refetchProjects();
        } catch (err: any) {
            console.error('Project creation error:', err);
            alert('Error: ' + err.message);
        }
        setCreating(false);
    };

    const handleCloseModal = () => {
        setShowNewProject(false);
        setNewProjectForm({ title: '', summary: '', description: '', domain: '', tier: '' });
        setCreateStep(1);
        setCreatedProjectId(null);
        setVideos([]);
        refetchProjects();
    };

    const handleAddVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        setVideoUrlError('');
        const trimmed = newVideoUrl.trim();
        if (!trimmed) return;
        if (!isValidVideoUrl(trimmed)) {
            setVideoUrlError('Please enter a valid YouTube or Vimeo URL');
            return;
        }
        if (!createdProjectId) return;
        setAddingVideo(true);
        try {
            const title = newVideoTitle.trim() || 'Project Video';
            const { error } = await supabase.from('project_video').insert({
                project_id: createdProjectId,
                title,
                video_url: trimmed,
                display_order: videos.length + 1,
            });

            if (error) {
                console.error('Video insert error:', error);
                setVideoUrlError('Failed to add video: ' + error.message);
            } else {
                // Fetch all videos separately instead of relying on INSERT RETURNING
                const { data: vids } = await supabase
                    .from('project_video')
                    .select('id, title, video_url, display_order')
                    .eq('project_id', createdProjectId)
                    .order('display_order');
                if (vids) setVideos(vids);
                setNewVideoUrl('');
                setNewVideoTitle('');
            }
        } catch (err: any) {
            console.error('Video insert exception:', err);
            setVideoUrlError('Failed to add video: ' + (err.message || 'Unknown error'));
        }
        setAddingVideo(false);
    };

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* Header Block */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-2 border-brutal-dark/10 pb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-brutal-dark text-brutal-bg px-2 py-1 text-xs font-bold font-data rounded uppercase">{role}</span>
                        </div>
                        <h1 className="font-heading font-bold text-5xl md:text-6xl tracking-tight-heading">
                            Welcome back, {user?.name || 'Maker'}.
                        </h1>
                    </div>
                    <div className="flex gap-4">
                        <Link to="/profile-setup" className="font-data text-sm font-bold flex items-center gap-2 border-2 border-brutal-dark/20 px-4 py-2 hover:bg-brutal-dark/5 interactive-lift transition-colors">
                            <Settings className="w-4 h-4" /> Edit Profile
                        </Link>
                    </div>
                </div>

                {/* Telemetry/Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 border-b-2 border-brutal-dark/10 pb-8 mb-8">
                    <Card className="p-6 bg-brutal-dark text-brutal-bg border-none shadow-xl">
                        <div className="flex items-center gap-2 text-brutal-bg/60 font-data text-xs uppercase font-bold tracking-widest mb-4">
                            <Zap className="w-4 h-4" /> Active Projects
                        </div>
                        <div className="text-4xl md:text-5xl font-heading font-bold">{activeProjects}</div>
                    </Card>

                    <Card className="p-6 border-2 border-brutal-dark/10">
                        <div className="flex items-center gap-2 text-brutal-dark/60 font-data text-xs uppercase font-bold tracking-widest mb-4">
                            <Calendar className="w-4 h-4" /> Upcoming Events
                        </div>
                        <div className="text-4xl md:text-5xl font-heading font-bold">{upcomingEvents}</div>
                    </Card>

                    <Card className="p-6 border-2 border-brutal-dark/10">
                        <div className="flex items-center gap-2 text-brutal-dark/60 font-data text-xs uppercase font-bold tracking-widest mb-4">
                            <Trophy className="w-4 h-4" /> Challenges
                        </div>
                        <div className="text-4xl md:text-5xl font-heading font-bold">{completedChallenges}</div>
                    </Card>
                    
                    <Card
                        className={`p-6 bg-brutal-red/10 border-2 border-brutal-red/20 text-brutal-red content-center flex flex-col justify-center items-center text-center transition-colors ${role === 'viewer' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-brutal-red hover:text-brutal-bg interactive-lift'}`}
                        onClick={() => { 
                            if (role !== 'viewer') {
                                setShowNewProject(true);
                                setCreateStep(1);
                                setCreatedProjectId(null);
                                setVideos([]);
                            }
                        }}
                    >
                        <Plus className="w-6 h-6 md:w-8 md:h-8 mb-2" />
                        <span className="font-data text-xs md:text-sm font-bold uppercase tracking-wider">Propose Project</span>
                    </Card>
                </div>

                {role === 'viewer' && (
                    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-r mb-8 font-data">
                        <p className="font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> View-Only Access</p>
                        <p className="text-sm mt-1">Your account is currently pending maker induction. You can set up your profile, but cannot join projects or challenges yet. Speak to a mentor to get inducted!</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div>
                        <RankBadge rank={rankAccess?.rank || 'Curious'} xp={rankAccess?.xp || 0} variant="full" />
                    </div>
                    <Card className="p-6 border-2 border-brutal-dark/10 flex flex-col max-h-[250px]">
                        <div className="flex items-center gap-2 text-brutal-dark/60 font-data text-xs uppercase font-bold tracking-widest mb-4 flex-shrink-0">
                            <Zap className="w-4 h-4" /> Recent Experience
                        </div>
                        <div className="overflow-y-auto pr-2 space-y-3 flex-1 font-data text-sm">
                            {(xpHistory || []).slice(0, 5).map(event => (
                                <div key={event.id} className="flex justify-between items-center border-b border-brutal-dark/5 pb-2 last:border-0 last:pb-0">
                                    <div className="font-medium text-brutal-dark">{event.reason}</div>
                                    <div className="font-bold text-green-600">+{event.amount} XP</div>
                                </div>
                            ))}
                            {(!xpHistory || xpHistory.length === 0) && (
                                <div className="text-brutal-dark/40 italic">Complete challenges or projects to earn XP!</div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Profile Completion Banner */}
                {!profileComplete && !bannerDismissed && (
                    <div className="flex items-center justify-between p-4 bg-brutal-dark text-brutal-bg rounded-2xl border border-brutal-dark/20">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-brutal-red animate-pulse" />
                            <span className="font-data text-sm font-bold">Your profile is incomplete — add a bio, avatar, and social links to appear in the Makers Directory.</span>
                        </div>
                        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                            <Link to="/profile-setup">
                                <Button size="sm" variant="secondary" className="bg-brutal-bg text-brutal-dark hover:bg-brutal-red hover:text-brutal-bg">
                                    Complete Profile
                                </Button>
                            </Link>
                            <button onClick={() => setBannerDismissed(true)} className="text-brutal-bg/50 hover:text-brutal-bg">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* New Project Modal */}
                {showNewProject && (
                    <Card ref={formRef} className="p-8 border-2 border-brutal-red/30 shadow-2xl relative scroll-mt-32">
                        <button onClick={handleCloseModal} className="absolute top-4 right-4 text-brutal-dark/50 hover:text-brutal-dark">
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="font-heading font-bold text-2xl uppercase tracking-tight-heading mb-6">
                            {createStep === 1 ? 'New Project Proposal' : 'Add Videos (Optional)'}
                        </h3>

                        {createStep === 1 ? (
                            <form onSubmit={handleCreateProject} className="space-y-4">
                                <div className="flex gap-3 mb-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewProjectForm(prev => ({ ...prev, tier: 'Tier 3' }))}
                                        className={`flex-1 p-4 rounded-xl border-2 text-left transition-colors ${
                                            newProjectForm.tier === 'Tier 3'
                                                ? 'border-brutal-red bg-brutal-red/5'
                                                : 'border-brutal-dark/20 hover:border-brutal-dark/40'
                                        }`}
                                    >
                                        <span className="font-heading font-bold text-sm uppercase block">T3 Architect Project</span>
                                        <span className="font-data text-xs text-brutal-dark/60">Part of Explorer Hub — originates from a Tier 3 challenge</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewProjectForm(prev => ({ ...prev, tier: '' }))}
                                        className={`flex-1 p-4 rounded-xl border-2 text-left transition-colors ${
                                            newProjectForm.tier !== 'Tier 3'
                                                ? 'border-brutal-red bg-brutal-red/5'
                                                : 'border-brutal-dark/20 hover:border-brutal-dark/40'
                                        }`}
                                    >
                                        <span className="font-heading font-bold text-sm uppercase block">Independent Project</span>
                                        <span className="font-data text-xs text-brutal-dark/60">Open-ended — self-initiated or community-driven</span>
                                    </button>
                                </div>

                                <Input
                                    label="Project Title"
                                    value={newProjectForm.title}
                                    onChange={(e) => setNewProjectForm(prev => ({ ...prev, title: e.target.value }))}
                                    required
                                />
                                <Input
                                    label="Summary"
                                    value={newProjectForm.summary}
                                    onChange={(e) => setNewProjectForm(prev => ({ ...prev, summary: e.target.value }))}
                                    placeholder="A one-line pitch for your project"
                                    required
                                />
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark mb-2 block">Description</label>
                                    <textarea
                                        className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded text-brutal-dark font-data focus:outline-none focus:border-brutal-dark focus:ring-1 focus:ring-brutal-dark transition-colors"
                                        rows={4}
                                        value={newProjectForm.description}
                                        onChange={(e) => setNewProjectForm(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Detailed description of your project..."
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Domain"
                                        value={newProjectForm.domain}
                                        onChange={(e) => setNewProjectForm(prev => ({ ...prev, domain: e.target.value }))}
                                        placeholder="e.g. Software & Robotics"
                                    />
                                    <Input
                                        label="Tier (Optional override)"
                                        value={newProjectForm.tier}
                                        onChange={(e) => setNewProjectForm(prev => ({ ...prev, tier: e.target.value }))}
                                        placeholder="e.g. Tier 2"
                                    />
                                </div>

                                {/* Inline primary video addition on Step 1 */}
                                <div className="mt-6 border-t border-brutal-dark/10 pt-6">
                                    <label className="font-data text-sm font-bold text-brutal-dark mb-2 flex items-center gap-2">
                                        <Play className="w-4 h-4 text-brutal-red" />
                                        Primary Video (Optional)
                                    </label>
                                    <div className="flex gap-4 items-start">
                                        <div className="flex-1 space-y-3">
                                            <Input
                                                label=""
                                                value={newVideoTitle}
                                                onChange={(e) => setNewVideoTitle(e.target.value)}
                                                placeholder="Video Title (e.g. Demo, Assembly)"
                                            />
                                            <div>
                                                <input
                                                    type="url"
                                                    placeholder="YouTube or Vimeo URL"
                                                    className={`w-full bg-white border-2 px-3 py-2.5 rounded text-brutal-dark font-data focus:outline-none focus:border-brutal-dark transition-colors ${
                                                        videoUrlError ? 'border-brutal-red bg-brutal-red/5' : 'border-brutal-dark/20'
                                                    }`}
                                                    value={newVideoUrl}
                                                    onChange={(e) => {
                                                        setNewVideoUrl(e.target.value);
                                                        if (e.target.value.trim() && !isValidVideoUrl(e.target.value)) {
                                                            setVideoUrlError('Invalid URL format');
                                                        } else {
                                                            setVideoUrlError('');
                                                        }
                                                    }}
                                                />
                                                {videoUrlError && (
                                                    <p className="font-data text-xs text-brutal-red mt-1 font-bold">{videoUrlError}</p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Live Preview Thumbnail */}
                                        <div className="w-40 h-28 hidden md:flex flex-shrink-0 bg-brutal-dark/5 border-2 border-brutal-dark/10 rounded-lg overflow-hidden items-center justify-center relative group">
                                            {newVideoUrl.trim() && isValidVideoUrl(newVideoUrl) && getYoutubeThumbnail(newVideoUrl) ? (
                                                <>
                                                    <img 
                                                        src={getYoutubeThumbnail(newVideoUrl)!} 
                                                        alt="Video Thumbnail" 
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                                        <div className="w-10 h-10 bg-brutal-red rounded-full flex items-center justify-center">
                                                            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center p-2 text-brutal-dark/30">
                                                    <Play className="w-8 h-8 mx-auto mb-1 opacity-50" />
                                                    <span className="font-data text-[10px] font-bold uppercase block">Preview</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="font-data text-xs text-brutal-dark/60 mt-2 italic">
                                        You can add more videos in the next step.
                                    </p>
                                </div>

                                <div className="flex justify-end gap-4 pt-6 mt-4 border-t border-brutal-dark/10">
                                    <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                                    <Button type="submit" disabled={creating}>
                                        {creating ? 'Creating...' : 'Create Draft Project'}
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-6">
                                <div className="bg-green-50 border-2 border-green-500/30 p-4 rounded-xl text-green-800 mb-6">
                                    <p className="font-bold flex items-center gap-2">Project created successfully!</p>
                                    <p className="text-sm font-data mt-1">You can attach videos now to demonstrate your work, or do it later.</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex gap-2 mb-4">
                                        <div className="flex-1 space-y-2">
                                            <input
                                                type="text"
                                                placeholder="Video Title (e.g. Demo, Assembly)"
                                                className="w-full bg-white border border-brutal-dark/20 px-3 py-2 rounded-lg font-data text-sm focus:outline-none focus:border-brutal-dark"
                                                value={newVideoTitle}
                                                onChange={(e) => setNewVideoTitle(e.target.value)}
                                            />
                                            <input
                                                type="url"
                                                placeholder="YouTube or Vimeo URL"
                                                className={`w-full bg-white border px-3 py-2 rounded-lg font-data text-sm focus:outline-none focus:border-brutal-dark ${
                                                    videoUrlError ? 'border-brutal-red bg-brutal-red/5' : 'border-brutal-dark/20'
                                                }`}
                                                value={newVideoUrl}
                                                onChange={(e) => {
                                                    setNewVideoUrl(e.target.value);
                                                    setVideoUrlError('');
                                                }}
                                            />
                                            {videoUrlError && (
                                                <p className="font-data text-xs text-brutal-red mt-1 font-bold">{videoUrlError}</p>
                                            )}
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleAddVideo}
                                            disabled={addingVideo || !newVideoUrl.trim()}
                                            className="mt-1 h-[88px]"
                                        >
                                            <Plus className="w-5 h-5 mb-1" /> Add
                                        </Button>
                                    </div>

                                    {videos.length > 0 && (
                                        <div className="space-y-2 mt-4 max-h-[250px] overflow-y-auto">
                                            {videos.map(v => {
                                                const thumb = getYoutubeThumbnail(v.video_url);
                                                return (
                                                    <div key={v.id} className="flex items-center gap-3 bg-white p-2 rounded-xl border border-brutal-dark/10">
                                                        <div className="w-16 h-10 bg-brutal-dark/5 rounded overflow-hidden flex-shrink-0 relative group cursor-pointer border border-brutal-dark/10 flex items-center justify-center">
                                                            {thumb ? (
                                                                <img src={thumb} alt={v.title} className="w-full h-full object-cover opacity-80" />
                                                            ) : (
                                                                <Play className="w-4 h-4 text-brutal-dark/40" />
                                                            )}
                                                        </div>
                                                        <div className="overflow-hidden flex-1">
                                                            <div className="font-data text-sm font-bold truncate">{v.title}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end pt-4 mt-6 border-t border-brutal-dark/10">
                                    <Button onClick={handleCloseModal}>Done</Button>
                                </div>
                            </div>
                        )}
                    </Card>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-8 border-t border-brutal-dark/5">

                    {/* Left Col = Alerts & Inductions */}
                    <div className="space-y-8">
                        <section>
                            <h3 className="font-heading text-2xl font-bold uppercase tracking-tight-heading flex items-center gap-2 mb-6">
                                <AlertTriangle className="w-5 h-5 text-brutal-red" /> Attention Required
                            </h3>
                            <div className="space-y-4">
                                {(myProjects || []).filter(p => p.status === 'rejected').map(p => (
                                    <div key={p.id} className="p-4 bg-brutal-red/10 border-2 border-brutal-red/30 rounded-xl text-brutal-dark">
                                        <strong className="block font-data text-sm uppercase mb-1">Project Rejected</strong>
                                        <p className="font-data text-sm">"{p.title}" was not approved. Edit and resubmit.</p>
                                    </div>
                                ))}
                                {(myProjects || []).filter(p => p.status === 'pending_review').map(p => (
                                    <div key={p.id} className="p-4 bg-yellow-500/10 border-2 border-yellow-500/50 rounded-xl text-brutal-dark">
                                        <strong className="block font-data text-sm uppercase mb-1">Under Review</strong>
                                        <p className="font-data text-sm">"{p.title}" is awaiting mentor approval.</p>
                                    </div>
                                ))}
                                {!(myProjects || []).some(p => p.status === 'rejected' || p.status === 'pending_review') && (
                                    <div className="p-4 bg-brutal-dark/5 border-2 border-brutal-dark/10 rounded-xl">
                                        <p className="font-data text-sm text-brutal-dark/60">No items require your attention.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Right Col = Content Hub */}
                    <div className="lg:col-span-2 space-y-12">

                        <section>
                            <div className="flex justify-between items-end border-b-2 border-brutal-dark/10 pb-2 mb-6">
                                <h3 className="font-heading text-3xl font-bold uppercase tracking-tight-heading">My Projects</h3>
                                <Link to="/projects" className="text-brutal-red font-data text-xs font-bold uppercase underline">View All Directory</Link>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {(myProjects || []).slice(0, 4).map((p) => (
                                    <Card key={p.id} className="flex flex-col p-4 hover:border-brutal-dark transition-colors cursor-pointer border-2 border-brutal-dark/10 shadow-md">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className={`px-2 py-0.5 text-[10px] font-bold font-data uppercase rounded ${
                                                p.status === 'active' ? 'bg-green-100 text-green-700' :
                                                p.status === 'draft' ? 'bg-brutal-dark/10 text-brutal-dark/60' :
                                                p.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-brutal-red/10 text-brutal-red'
                                            }`}>{p.status.replace('_', ' ')}</span>
                                        </div>
                                        <h4 className="font-heading font-bold text-xl mb-1">{p.title}</h4>
                                        <p className="font-data text-xs text-brutal-dark/60 line-clamp-2 flex-1">{p.summary}</p>
                                        {p.status === 'draft' || p.status === 'rejected' ? (
                                            <div className="mt-3 flex gap-2">
                                                <Button size="sm" onClick={() => navigate(`/projects/${p.id}/edit`)}>Edit Project</Button>
                                            </div>
                                        ) : (
                                            <div className="mt-3 flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => navigate(`/projects/${p.id}`)}>View Public</Button>
                                            </div>
                                        )}
                                    </Card>
                                ))}
                            </div>

                            {(myProjects || []).length === 0 && (
                                <div className="py-12 text-center font-data text-brutal-dark/50 border-2 border-dashed border-brutal-dark/20 rounded-2xl">
                                    No projects yet. Create your first one above!
                                </div>
                            )}
                        </section>

                    </div>
                </div>

        {/* ── Mentor-Specific Section ── */}
        {(role === 'mentor' || role === 'admin') && (
            <div className="pt-12 border-t-2 border-brutal-dark/10">
                <div className="flex items-center gap-3 mb-8">
                    <span className="bg-yellow-500 text-brutal-dark px-3 py-1 text-xs font-bold font-data rounded uppercase">Mentor Tools</span>
                    <h2 className="font-heading text-3xl font-bold uppercase tracking-tight-heading">Review Queue</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="p-6 border-2 border-yellow-500/30 bg-yellow-500/5">
                        <div className="flex items-center gap-2 mb-4">
                            <ClipboardCheck className="w-5 h-5 text-yellow-600" />
                            <h3 className="font-heading font-bold text-xl uppercase">Project Reviews</h3>
                        </div>
                        <p className="font-data text-sm text-brutal-dark/60 mb-4">
                            Review pending project submissions from makers. Approve or request changes.
                        </p>
                        <Link to="/admin/review-projects">
                            <Button variant="outline" size="sm" className="w-full">View Pending Projects</Button>
                        </Link>
                    </Card>

                    <Card className="p-6 border-2 border-yellow-500/30 bg-yellow-500/5">
                        <div className="flex items-center gap-2 mb-4">
                            <Trophy className="w-5 h-5 text-yellow-600" />
                            <h3 className="font-heading font-bold text-xl uppercase">Challenge Verification</h3>
                        </div>
                        <p className="font-data text-sm text-brutal-dark/60 mb-4">
                            Verify maker challenge completions and award badges.
                        </p>
                        <Link to="/admin/review-challenges">
                            <Button variant="outline" size="sm" className="w-full">View Submissions</Button>
                        </Link>
                    </Card>

                    <Card className="p-6 border-2 border-yellow-500/30 bg-yellow-500/5">
                        <div className="flex items-center gap-2 mb-4">
                            <Trophy className="w-5 h-5 text-yellow-600" />
                            <h3 className="font-heading font-bold text-xl uppercase">Event Submissions</h3>
                        </div>
                        <p className="font-data text-sm text-brutal-dark/60 mb-4">
                            Review and shortlist Build Challenge submissions.
                        </p>
                        <Link to="/admin/review-submissions">
                            <Button variant="outline" size="sm" className="w-full">Review Submissions</Button>
                        </Link>
                    </Card>

                    <Card className="p-6 border-2 border-yellow-500/30 bg-yellow-500/5">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="w-5 h-5 text-yellow-600" />
                            <h3 className="font-heading font-bold text-xl uppercase">Event Management</h3>
                        </div>
                        <p className="font-data text-sm text-brutal-dark/60 mb-4">
                            Schedule and manage makerspace events and workshops.
                        </p>
                        <Link to="/admin/events">
                            <Button variant="outline" size="sm" className="w-full">Manage Events</Button>
                        </Link>
                    </Card>
                    
                    <Card className="p-6 border-2 border-yellow-500/30 bg-yellow-500/5">
                        <div className="flex items-center gap-2 mb-4">
                            <Settings className="w-5 h-5 text-yellow-600" />
                            <h3 className="font-heading font-bold text-xl uppercase">Lab Inventory</h3>
                        </div>
                        <p className="font-data text-sm text-brutal-dark/60 mb-4">
                            Track supplies, adjust consumable quantities.
                        </p>
                        <Link to="/admin/inventory">
                            <Button variant="outline" size="sm" className="w-full">Manage Inventory</Button>
                        </Link>
                    </Card>
                </div>
            </div>
        )}

                {/* ── Admin-Specific Section ── */}
                {role === 'admin' && (
                    <div className="pt-12 border-t-2 border-brutal-dark/10">
                        <div className="flex items-center gap-3 mb-8">
                            <span className="bg-brutal-red text-brutal-bg px-3 py-1 text-xs font-bold font-data rounded uppercase">Admin Panel</span>
                            <h2 className="font-heading text-3xl font-bold uppercase tracking-tight-heading">System Control</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Card className="p-6 border-2 border-brutal-red/20 bg-brutal-red/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Users className="w-5 h-5 text-brutal-red" />
                                    <h3 className="font-heading font-bold text-lg uppercase">Users</h3>
                                </div>
                                <p className="font-data text-xs text-brutal-dark/60 mb-4 h-8">
                                    Manage accounts & roles.
                                </p>
                                <Link to="/admin/users">
                                    <Button variant="outline" size="sm" className="w-full">Manage Users</Button>
                                </Link>
                            </Card>

                            <Card className="p-6 border-2 border-brutal-red/20 bg-brutal-red/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Zap className="w-5 h-5 text-brutal-red" />
                                    <h3 className="font-heading font-bold text-lg uppercase">Challenges</h3>
                                </div>
                                <p className="font-data text-xs text-brutal-dark/60 mb-4 h-8">
                                    Create & publish challenges.
                                </p>
                                <Link to="/admin/challenges">
                                    <Button variant="outline" size="sm" className="w-full">Manage Challenges</Button>
                                </Link>
                            </Card>

                            <Card className="p-6 border-2 border-brutal-red/20 bg-brutal-red/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Award className="w-5 h-5 text-brutal-red" />
                                    <h3 className="font-heading font-bold text-lg uppercase">Badges</h3>
                                </div>
                                <p className="font-data text-xs text-brutal-dark/60 mb-4 h-8">
                                    Mint achievement badges.
                                </p>
                                <Link to="/admin/badges">
                                    <Button variant="outline" size="sm" className="w-full">Manage Badges</Button>
                                </Link>
                            </Card>

                            <Card className="p-6 border-2 border-brutal-red/20 bg-brutal-red/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Settings className="w-5 h-5 text-brutal-red" />
                                    <h3 className="font-heading font-bold text-lg uppercase">Store</h3>
                                </div>
                                <p className="font-data text-xs text-brutal-dark/60 mb-4 h-8">
                                    Manage store products.
                                </p>
                                <Link to="/admin/store">
                                    <Button variant="outline" size="sm" className="w-full">Manage Store</Button>
                                </Link>
                            </Card>

                            <Card className="p-6 border-2 border-brutal-red/20 bg-brutal-red/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Settings className="w-5 h-5 text-brutal-red" />
                                    <h3 className="font-heading font-bold text-lg uppercase">Equipment</h3>
                                </div>
                                <p className="font-data text-xs text-brutal-dark/60 mb-4 h-8">
                                    Lab tools & inductions.
                                </p>
                                <Link to="/admin/equipment">
                                    <Button variant="outline" size="sm" className="w-full">Manage Equipment</Button>
                                </Link>
                            </Card>

                            <Card className="p-6 border-2 border-brutal-red/20 bg-brutal-red/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Zap className="w-5 h-5 text-brutal-red" />
                                    <h3 className="font-heading font-bold text-lg uppercase">Projects</h3>
                                </div>
                                <p className="font-data text-xs text-brutal-dark/60 mb-4 h-8">
                                    View, manage & delete projects.
                                </p>
                                <Link to="/admin/projects">
                                    <Button variant="outline" size="sm" className="w-full">Manage Projects</Button>
                                </Link>
                            </Card>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
