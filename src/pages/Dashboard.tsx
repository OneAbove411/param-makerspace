import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Link, useNavigate } from 'react-router-dom';
import { useMyProjects, useMyStats, useProjectMutations } from '../lib/hooks';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Settings, Plus, Calendar, Trophy, Zap, AlertTriangle, X, ClipboardCheck, Users } from 'lucide-react';

export function Dashboard() {
    const { user, role } = useAuth();
    const navigate = useNavigate();
    const { data: stats } = useMyStats();
    const { data: myProjects, refetch: refetchProjects } = useMyProjects();
    const { createProject } = useProjectMutations();

    const [showNewProject, setShowNewProject] = useState(false);
    const [newProjectForm, setNewProjectForm] = useState({ title: '', summary: '', description: '', domain: '', tier: '' });
    const [creating, setCreating] = useState(false);

    const activeProjects = stats?.activeProjects || 0;
    const upcomingEvents = stats?.upcomingEvents || 0;
    const completedChallenges = stats?.completedChallenges || 0;

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        const { data: project, error } = await createProject(newProjectForm);
        setCreating(false);
        if (!error && project) {
            setShowNewProject(false);
            setNewProjectForm({ title: '', summary: '', description: '', domain: '', tier: '' });
            refetchProjects();
        }
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                    <Card className="p-6 bg-brutal-dark text-brutal-bg border-none shadow-xl">
                        <div className="flex items-center gap-2 text-brutal-bg/60 font-data text-xs uppercase font-bold tracking-widest mb-4">
                            <Zap className="w-4 h-4" /> Active Projects
                        </div>
                        <div className="text-5xl font-heading font-bold">{activeProjects}</div>
                    </Card>

                    <Card className="p-6 border-2 border-brutal-dark/10">
                        <div className="flex items-center gap-2 text-brutal-dark/60 font-data text-xs uppercase font-bold tracking-widest mb-4">
                            <Calendar className="w-4 h-4" /> Upcoming Events
                        </div>
                        <div className="text-5xl font-heading font-bold">{upcomingEvents}</div>
                    </Card>

                    <Card className="p-6 border-2 border-brutal-dark/10">
                        <div className="flex items-center gap-2 text-brutal-dark/60 font-data text-xs uppercase font-bold tracking-widest mb-4">
                            <Trophy className="w-4 h-4" /> Completed Challenges
                        </div>
                        <div className="text-5xl font-heading font-bold">{completedChallenges}</div>
                    </Card>

                    <Card
                        className="p-6 bg-brutal-red/10 border-2 border-brutal-red/20 text-brutal-red content-center flex flex-col justify-center items-center text-center cursor-pointer hover:bg-brutal-red hover:text-brutal-bg transition-colors interactive-lift"
                        onClick={() => setShowNewProject(true)}
                    >
                        <Plus className="w-8 h-8 mb-2" />
                        <span className="font-data text-sm font-bold uppercase tracking-wider">Propose New Project</span>
                    </Card>
                </div>

                {/* New Project Modal */}
                {showNewProject && (
                    <Card className="p-8 border-2 border-brutal-red/30 shadow-2xl relative">
                        <button onClick={() => setShowNewProject(false)} className="absolute top-4 right-4 text-brutal-dark/50 hover:text-brutal-dark">
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
                                    label="Tier"
                                    value={newProjectForm.tier}
                                    onChange={(e) => setNewProjectForm(prev => ({ ...prev, tier: e.target.value }))}
                                    placeholder="e.g. Tier 2"
                                />
                            </div>
                            <div className="flex justify-end gap-4 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setShowNewProject(false)}>Cancel</Button>
                                <Button type="submit" disabled={creating}>
                                    {creating ? 'Creating...' : 'Create Draft Project'}
                                </Button>
                            </div>
                        </form>
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
                                        {p.status === 'draft' && (
                                            <div className="mt-3 flex gap-2">
                                                <Button size="sm" onClick={() => navigate(`/projects/${p.id}`)}>View</Button>
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Card className="p-6 border-2 border-yellow-500/30 bg-yellow-500/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <ClipboardCheck className="w-5 h-5 text-yellow-600" />
                                    <h3 className="font-heading font-bold text-xl uppercase">Project Reviews</h3>
                                </div>
                                <p className="font-data text-sm text-brutal-dark/60 mb-4">
                                    Review pending project submissions from makers. Approve or request changes.
                                </p>
                                <Link to="/projects">
                                    <Button variant="outline" size="sm">View Pending Projects</Button>
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
                                <Link to="/challenges">
                                    <Button variant="outline" size="sm">View Submissions</Button>
                                </Link>
                            </Card>

                            <Card className="p-6 border-2 border-yellow-500/30 bg-yellow-500/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Calendar className="w-5 h-5 text-yellow-600" />
                                    <h3 className="font-heading font-bold text-xl uppercase">Event Management</h3>
                                </div>
                                <p className="font-data text-sm text-brutal-dark/60 mb-4">
                                    Create and manage makerspace events, handle check-ins.
                                </p>
                                <Link to="/events">
                                    <Button variant="outline" size="sm">Manage Events</Button>
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

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card className="p-6 border-2 border-brutal-red/20 bg-brutal-red/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Users className="w-5 h-5 text-brutal-red" />
                                    <h3 className="font-heading font-bold text-lg uppercase">Users</h3>
                                </div>
                                <p className="font-data text-xs text-brutal-dark/60 mb-4">
                                    Manage user accounts, roles, and permissions.
                                </p>
                                <Link to="/makers">
                                    <Button variant="outline" size="sm">Manage Users</Button>
                                </Link>
                            </Card>

                            <Card className="p-6 border-2 border-brutal-red/20 bg-brutal-red/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Zap className="w-5 h-5 text-brutal-red" />
                                    <h3 className="font-heading font-bold text-lg uppercase">Challenges</h3>
                                </div>
                                <p className="font-data text-xs text-brutal-dark/60 mb-4">
                                    Create, edit, and publish challenges.
                                </p>
                                <Link to="/challenges">
                                    <Button variant="outline" size="sm">Manage Challenges</Button>
                                </Link>
                            </Card>

                            <Card className="p-6 border-2 border-brutal-red/20 bg-brutal-red/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Settings className="w-5 h-5 text-brutal-red" />
                                    <h3 className="font-heading font-bold text-lg uppercase">Store & Inventory</h3>
                                </div>
                                <p className="font-data text-xs text-brutal-dark/60 mb-4">
                                    Manage products, inventory, and equipment.
                                </p>
                                <Link to="/store">
                                    <Button variant="outline" size="sm">Manage Store</Button>
                                </Link>
                            </Card>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
