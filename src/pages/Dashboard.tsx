import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { useMyProjects, useMyStats, useProjectMutations, useMyProfile, useRankAccess, useMyXPHistory } from '../lib/hooks';
import { Card } from '../components/ui/Card';
import { RankBadge } from '../components/ui/RankBadge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Settings, Plus, Calendar, Trophy, Zap, AlertTriangle, X, ClipboardCheck, Users, Award } from 'lucide-react';
import { isValidVideoUrl } from '../lib/videoUtils';

export function Dashboard() {
    const { user, role } = useAuth();
    const navigate = useNavigate();
    const { data: stats } = useMyStats();
    const { data: myProjects, refetch: refetchProjects } = useMyProjects();
    const { createProject } = useProjectMutations();

    const [showNewProject, setShowNewProject] = useState(false);
    const [newProjectForm, setNewProjectForm] = useState({ title: '', summary: '', domain: '', tier: '', videoUrl: '' });
    const [creating, setCreating] = useState(false);
    const [bannerDismissed, setBannerDismissed] = useState(false);
    const [videoUrlError, setVideoUrlError] = useState('');

    const formRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (showNewProject && formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [showNewProject]);

    // Fixed domain/tier options
    const DOMAINS = ['Electronics', 'AI', 'Robotics', 'Embedded Systems', 'IoT', '3D Printing', 'Automation', 'Woodworks', 'Wireless Comms', 'Quantum Computing', 'Parallel Computing', 'Design', 'Fabrication', 'Bio & Life Sciences', 'Interdisciplinary'];
    const TIERS = ['Tier 1', 'Tier 2', 'Tier 3'];

    const { data: myProfile } = useMyProfile();
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
        if (!newProjectForm.title.trim()) return;
        setCreating(true);

        const videoUrl = newProjectForm.videoUrl.trim();

        // 1. Create the project first
        const { data: project, error } = await createProject({
            title: newProjectForm.title.trim(),
            summary: newProjectForm.summary.trim() || newProjectForm.title.trim(),
            description: '',
            domain: newProjectForm.domain || undefined,
            tier: newProjectForm.tier || undefined,
        });

        if (error || !project) {
            alert('Failed to create project: ' + (error || 'Unknown error'));
            setCreating(false);
            return;
        }

        // 2. Insert video in background — don't block the UI.
        //    The project is already created; video is best-effort.
        if (videoUrl && isValidVideoUrl(videoUrl)) {
            supabase.from('project_video').insert({
                project_id: project.id,
                title: 'Project Video',
                video_url: videoUrl,
                display_order: 1,
            }).then(({ error: videoError }) => {
                if (videoError) console.warn('Video insert failed:', videoError.message);
            });
        }

        handleCloseModal();
        setCreating(false);
        refetchProjects();
    };

    const handleCloseModal = () => {
        setShowNewProject(false);
        setNewProjectForm({ title: '', summary: '', domain: '', tier: '', videoUrl: '' });
        setVideoUrlError('');
    };

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* Header */}
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

                {/* Stats row */}
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
                        onClick={() => { if (role !== 'viewer') setShowNewProject(true); }}
                    >
                        <Plus className="w-6 h-6 md:w-8 md:h-8 mb-2" />
                        <span className="font-data text-xs md:text-sm font-bold uppercase tracking-wider">Propose Project</span>
                    </Card>
                </div>

                {role === 'viewer' && (
                    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-r mb-8 font-data">
                        <p className="font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> View-Only Access</p>
                        <p className="text-sm mt-1">Your account is currently pending maker induction. Speak to a mentor to get inducted!</p>
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

                {/* ── New Project Form — simple, no fluff ── */}
                {showNewProject && (
                    <Card ref={formRef} className="p-8 border-2 border-brutal-red/30 shadow-2xl relative scroll-mt-32">
                        <button onClick={handleCloseModal} className="absolute top-4 right-4 text-brutal-dark/50 hover:text-brutal-dark">
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="font-heading font-bold text-2xl uppercase tracking-tight-heading mb-6">New Project Proposal</h3>

                        <form onSubmit={handleCreateProject} className="space-y-4">
                            <Input
                                label="Project Title"
                                value={newProjectForm.title}
                                onChange={(e) => setNewProjectForm(prev => ({ ...prev, title: e.target.value }))}
                                required
                            />
                            <Input
                                label="Summary (optional)"
                                value={newProjectForm.summary}
                                onChange={(e) => setNewProjectForm(prev => ({ ...prev, summary: e.target.value }))}
                                placeholder="A one-line pitch for your project"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark mb-2 block">Domain</label>
                                    <select
                                        className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded text-brutal-dark font-data focus:outline-none focus:border-brutal-dark transition-colors"
                                        value={newProjectForm.domain}
                                        onChange={(e) => setNewProjectForm(prev => ({ ...prev, domain: e.target.value }))}
                                    >
                                        <option value="">Select domain...</option>
                                        {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark mb-2 block">Tier</label>
                                    <select
                                        className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded text-brutal-dark font-data focus:outline-none focus:border-brutal-dark transition-colors"
                                        value={newProjectForm.tier}
                                        onChange={(e) => setNewProjectForm(prev => ({ ...prev, tier: e.target.value }))}
                                    >
                                        <option value="">Select tier...</option>
                                        {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="font-data text-sm font-bold text-brutal-dark mb-2 block">Video URL (optional)</label>
                                <input
                                    type="text"
                                    placeholder="https://youtu.be/... or https://youtube.com/watch?v=..."
                                    className={`w-full bg-brutal-bg border-2 px-3 py-2.5 rounded text-brutal-dark font-data focus:outline-none focus:border-brutal-dark transition-colors ${videoUrlError ? 'border-brutal-red' : 'border-brutal-dark/20'}`}
                                    value={newProjectForm.videoUrl}
                                    onChange={(e) => {
                                        setNewProjectForm(prev => ({ ...prev, videoUrl: e.target.value }));
                                        const v = e.target.value.trim();
                                        setVideoUrlError(v && !isValidVideoUrl(v) ? 'Not a valid YouTube or Vimeo URL' : '');
                                    }}
                                />
                                {videoUrlError && <p className="font-data text-xs text-brutal-red mt-1">{videoUrlError}</p>}
                            </div>

                            <div className="flex justify-end gap-4 pt-4 border-t border-brutal-dark/10">
                                <Button type="button" variant="secondary" onClick={handleCloseModal} disabled={creating}>Cancel</Button>
                                <Button type="submit" disabled={creating || !newProjectForm.title.trim() || !!videoUrlError}>
                                    {creating ? 'Creating...' : 'Create Project'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-8 border-t border-brutal-dark/5">

                    {/* Left Col = Alerts */}
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

                    {/* Right Col = Projects */}
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
                                            <span className={`px-2 py-0.5 text-[10px] font-bold font-data uppercase rounded ${p.status === 'active' ? 'bg-green-100 text-green-700' :
                                                p.status === 'draft' ? 'bg-brutal-dark/10 text-brutal-dark/60' :
                                                    p.status === 'pending_review' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-brutal-red/10 text-brutal-red'
                                                }`}>{p.status.replace('_', ' ')}</span>
                                        </div>
                                        <h4 className="font-heading font-bold text-xl mb-1">{p.title}</h4>
                                        <p className="font-data text-xs text-brutal-dark/60 line-clamp-2 flex-1">{p.summary}</p>
                                        {p.status === 'draft' || p.status === 'rejected' ? (
                                            <div className="mt-3">
                                                <Button size="sm" onClick={() => navigate(`/projects/${p.id}/edit`)}>Edit Project</Button>
                                            </div>
                                        ) : (
                                            <div className="mt-3">
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

                {/* ── Mentor Tools ── */}
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
                                <p className="font-data text-sm text-brutal-dark/60 mb-4">Review pending project submissions from makers. Approve or request changes.</p>
                                <Link to="/admin/review-projects"><Button variant="outline" size="sm" className="w-full">View Pending Projects</Button></Link>
                            </Card>
                            <Card className="p-6 border-2 border-yellow-500/30 bg-yellow-500/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Trophy className="w-5 h-5 text-yellow-600" />
                                    <h3 className="font-heading font-bold text-xl uppercase">Challenge Verification</h3>
                                </div>
                                <p className="font-data text-sm text-brutal-dark/60 mb-4">Verify maker challenge completions and award badges.</p>
                                <Link to="/admin/review-challenges"><Button variant="outline" size="sm" className="w-full">View Submissions</Button></Link>
                            </Card>
                            <Card className="p-6 border-2 border-yellow-500/30 bg-yellow-500/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Trophy className="w-5 h-5 text-yellow-600" />
                                    <h3 className="font-heading font-bold text-xl uppercase">Event Submissions</h3>
                                </div>
                                <p className="font-data text-sm text-brutal-dark/60 mb-4">Review and shortlist Build Challenge submissions.</p>
                                <Link to="/admin/review-submissions"><Button variant="outline" size="sm" className="w-full">Review Submissions</Button></Link>
                            </Card>
                            <Card className="p-6 border-2 border-yellow-500/30 bg-yellow-500/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Calendar className="w-5 h-5 text-yellow-600" />
                                    <h3 className="font-heading font-bold text-xl uppercase">Event Management</h3>
                                </div>
                                <p className="font-data text-sm text-brutal-dark/60 mb-4">Schedule and manage makerspace events and workshops.</p>
                                <Link to="/admin/events"><Button variant="outline" size="sm" className="w-full">Manage Events</Button></Link>
                            </Card>
                            <Card className="p-6 border-2 border-yellow-500/30 bg-yellow-500/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Settings className="w-5 h-5 text-yellow-600" />
                                    <h3 className="font-heading font-bold text-xl uppercase">Lab Inventory</h3>
                                </div>
                                <p className="font-data text-sm text-brutal-dark/60 mb-4">Track supplies, adjust consumable quantities.</p>
                                <Link to="/admin/inventory"><Button variant="outline" size="sm" className="w-full">Manage Inventory</Button></Link>
                            </Card>
                        </div>
                    </div>
                )}

                {/* ── Admin Panel ── */}
                {role === 'admin' && (
                    <div className="pt-12 border-t-2 border-brutal-dark/10">
                        <div className="flex items-center gap-3 mb-8">
                            <span className="bg-brutal-red text-brutal-bg px-3 py-1 text-xs font-bold font-data rounded uppercase">Admin Panel</span>
                            <h2 className="font-heading text-3xl font-bold uppercase tracking-tight-heading">System Control</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Card className="p-6 border-2 border-brutal-red/20 bg-brutal-red/5">
                                <div className="flex items-center gap-2 mb-4"><Users className="w-5 h-5 text-brutal-red" /><h3 className="font-heading font-bold text-lg uppercase">Users</h3></div>
                                <p className="font-data text-xs text-brutal-dark/60 mb-4 h-8">Manage accounts & roles.</p>
                                <Link to="/admin/users"><Button variant="outline" size="sm" className="w-full">Manage Users</Button></Link>
                            </Card>
                            <Card className="p-6 border-2 border-brutal-red/20 bg-brutal-red/5">
                                <div className="flex items-center gap-2 mb-4"><Zap className="w-5 h-5 text-brutal-red" /><h3 className="font-heading font-bold text-lg uppercase">Challenges</h3></div>
                                <p className="font-data text-xs text-brutal-dark/60 mb-4 h-8">Create & publish challenges.</p>
                                <Link to="/admin/challenges"><Button variant="outline" size="sm" className="w-full">Manage Challenges</Button></Link>
                            </Card>
                            <Card className="p-6 border-2 border-brutal-red/20 bg-brutal-red/5">
                                <div className="flex items-center gap-2 mb-4"><Award className="w-5 h-5 text-brutal-red" /><h3 className="font-heading font-bold text-lg uppercase">Badges</h3></div>
                                <p className="font-data text-xs text-brutal-dark/60 mb-4 h-8">Mint achievement badges.</p>
                                <Link to="/admin/badges"><Button variant="outline" size="sm" className="w-full">Manage Badges</Button></Link>
                            </Card>
                            <Card className="p-6 border-2 border-brutal-red/20 bg-brutal-red/5">
                                <div className="flex items-center gap-2 mb-4"><Settings className="w-5 h-5 text-brutal-red" /><h3 className="font-heading font-bold text-lg uppercase">Store</h3></div>
                                <p className="font-data text-xs text-brutal-dark/60 mb-4 h-8">Manage store products.</p>
                                <Link to="/admin/store"><Button variant="outline" size="sm" className="w-full">Manage Store</Button></Link>
                            </Card>
                            <Card className="p-6 border-2 border-brutal-red/20 bg-brutal-red/5">
                                <div className="flex items-center gap-2 mb-4"><Settings className="w-5 h-5 text-brutal-red" /><h3 className="font-heading font-bold text-lg uppercase">Equipment</h3></div>
                                <p className="font-data text-xs text-brutal-dark/60 mb-4 h-8">Lab tools & inductions.</p>
                                <Link to="/admin/equipment"><Button variant="outline" size="sm" className="w-full">Manage Equipment</Button></Link>
                            </Card>
                            <Card className="p-6 border-2 border-brutal-red/20 bg-brutal-red/5">
                                <div className="flex items-center gap-2 mb-4"><Zap className="w-5 h-5 text-brutal-red" /><h3 className="font-heading font-bold text-lg uppercase">Projects</h3></div>
                                <p className="font-data text-xs text-brutal-dark/60 mb-4 h-8">View, manage & delete projects.</p>
                                <Link to="/admin/projects"><Button variant="outline" size="sm" className="w-full">Manage Projects</Button></Link>
                            </Card>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}