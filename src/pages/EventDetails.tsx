import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEvent, useEventRegistration, useComments } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Calendar, MapPin, Users, ArrowLeft, Send } from 'lucide-react';
import { formatEventType } from './Events';

// Shared Components
const DiscussionSection = ({ comments, user, deleteComment, handleComment, commentText, setCommentText }: any) => (
    <section>
        <h3 className="font-heading font-bold text-2xl border-b-2 border-brutal-dark/10 pb-4 mb-6 uppercase">Discussion</h3>
        <div className="space-y-4 mb-6">
            {comments.map((c: any) => (
                <div key={c.id} className="p-4 bg-brutal-dark/5 rounded-xl border border-brutal-dark/10">
                    <div className="flex justify-between items-start mb-2">
                        <span className="font-data text-sm font-bold">{c.userName}</span>
                        <div className="flex items-center gap-2">
                            <span className="font-data text-xs text-brutal-dark/50">{new Date(c.created_at).toLocaleDateString()}</span>
                            {user && c.user_id === user.id && (
                                <button onClick={() => deleteComment(c.id)} className="text-brutal-red text-xs font-bold hover:underline">Delete</button>
                            )}
                        </div>
                    </div>
                    <p className="font-data text-sm text-brutal-dark/80">{c.content}</p>
                </div>
            ))}
            {comments.length === 0 && <p className="font-data text-sm text-brutal-dark/50">No comments yet.</p>}
        </div>

        {user && (
            <form onSubmit={handleComment} className="flex gap-3">
                <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-brutal-bg border-2 border-brutal-dark/20 px-4 py-3 rounded-xl font-data text-sm focus:outline-none focus:border-brutal-dark"
                />
                <Button type="submit" size="md"><Send className="w-4 h-4" /></Button>
            </form>
        )}
    </section>
);

const RegistrationSidebar = ({ isRegistered, event, user, actionLoading, handleRegister, handleUnregister, capacityRemaining, customRegisterNode }: any) => (
    <div className="bg-brutal-dark text-brutal-bg rounded-[2rem] p-8 mt-[-8rem] relative z-20 shadow-2xl">
        <h3 className="font-heading font-bold text-2xl mb-6 text-brutal-bg uppercase">Registration</h3>

        {customRegisterNode ? (
            customRegisterNode
        ) : isRegistered ? (
            <div className="space-y-6">
                <div className="p-4 border-2 border-green-400/50 bg-green-400/10 rounded-xl">
                    <p className="font-data text-brutal-bg font-bold text-center uppercase">✓ You're Registered</p>
                </div>
                <Button
                    size="lg"
                    className="w-full bg-brutal-bg/20 text-brutal-bg hover:bg-brutal-red hover:text-brutal-bg transition-colors"
                    onClick={handleUnregister}
                    disabled={actionLoading}
                >
                    {actionLoading ? 'Processing...' : 'Unregister'}
                </Button>
            </div>
        ) : event.registration_status === 'open' && (capacityRemaining === null || capacityRemaining > 0) ? (
            <div className="space-y-6">
                <p className="font-data text-sm text-brutal-bg/60">Spots are limited. Secure your place now.</p>
                {user ? (
                    <Button
                        size="lg"
                        className="w-full bg-brutal-bg text-brutal-dark hover:bg-brutal-red hover:text-brutal-bg transition-colors"
                        onClick={handleRegister}
                        disabled={actionLoading}
                    >
                        {actionLoading ? 'Registering...' : 'Register Now'}
                    </Button>
                ) : (
                    <Link to="/login" className="block">
                        <Button size="lg" className="w-full bg-brutal-bg text-brutal-dark hover:bg-brutal-red hover:text-brutal-bg transition-colors">
                            Log in to Register
                        </Button>
                    </Link>
                )}
            </div>
        ) : (
            <div className="p-4 border-2 border-brutal-red/50 bg-brutal-bg/10 rounded-xl">
                <p className="font-data text-brutal-bg font-bold text-center uppercase">Currently Closed</p>
            </div>
        )}
    </div>
);

// --- Layouts ---
const BuildChallengeContent = ({ id, event, user, commentsProps, registrationProps }: any) => {
    const [teams, setTeams] = useState<any[]>([]);
    const [myProjects, setMyProjects] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [loadingAction, setLoadingAction] = useState(false);
    
    // PRD: Only render when event_type === 'build_challenge'
    const isPast = new Date(event.date) < new Date();

    const fetchTeams = async () => {
        const { data } = await supabase
            .from('event_team')
            .select('id, name, lead_id, app_user:app_user!lead_id(name), event_team_member(id, user_id, app_user:app_user!user_id(name))')
            .eq('event_id', id);
        setTeams(data || []);
    };

    const fetchMyProjects = async () => {
        if (!user) return;
        const { data } = await supabase.from('project').select('id, title').eq('owner_id', user.id).eq('status', 'active');
        setMyProjects(data || []);
        
        const { data: subData } = await supabase.from('event_submission').select('*').eq('event_id', id).eq('user_id', user.id);
        if (subData && subData.length > 0) setHasSubmitted(true);
    };

    const fetchSubmissions = async () => {
        const { data } = await supabase
            .from('event_submission')
            .select('id, status, project:project!project_id(id, title, summary), team:event_team!team_id(name)')
            .eq('event_id', id)
            .in('status', ['accepted', 'winner']);
        setSubmissions(data || []);
    };

    useEffect(() => {
        fetchTeams();
        fetchMyProjects();
        if (isPast) fetchSubmissions();
    }, [id, user, isPast]);

    const userTeamId = user ? teams.find(t => t.event_team_member?.some((m: any) => m.user_id === user.id))?.id : null;

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || loadingAction) return;
        setLoadingAction(true);
        const { data: team } = await supabase.from('event_team').insert({ event_id: id, name: newTeamName, lead_id: user.id }).select().single();
        if (team) {
            await supabase.from('event_team_member').insert({ team_id: team.id, user_id: user.id });
            setNewTeamName('');
            await fetchTeams();
        }
        setLoadingAction(false);
    };

    const handleJoinTeam = async (teamId: string) => {
        if (!user || loadingAction) return;
        setLoadingAction(true);
        await supabase.from('event_team_member').insert({ team_id: teamId, user_id: user.id });
        await fetchTeams();
        setLoadingAction(false);
    };

    const handleSubmitProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || loadingAction) return;
        setLoadingAction(true);
        await supabase.from('event_submission').insert({
            event_id: id,
            user_id: user.id,
            team_id: userTeamId || null,
            project_id: selectedProjectId || null,
            status: 'submitted',
        });
        setHasSubmitted(true);
        setLoadingAction(false);
    };

    return (
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-16 grid grid-cols-1 md:grid-cols-3 gap-16 relative">
            <div className="md:col-span-2 space-y-12">
                <section>
                    <h3 className="font-heading font-bold text-3xl mb-6 tracking-tight-heading uppercase">About this Challenge</h3>
                    <p className="font-data text-lg text-brutal-dark/80 whitespace-pre-wrap leading-relaxed">{event.description}</p>
                </section>

                {/* Teams Section */}
                <section>
                    <h3 className="font-heading font-bold text-3xl mb-6 uppercase tracking-tight-heading">Teams</h3>
                    {teams.length > 0 ? (
                        <div className="space-y-4">
                            {teams.map(team => {
                                const isUserInTeam = user && team.event_team_member?.some((m: any) => m.user_id === user.id);
                                const canJoin = user && registrationProps.isRegistered && !userTeamId;
                                
                                return (
                                    <div key={team.id} className="p-6 bg-brutal-dark/5 rounded-xl border border-brutal-dark/10 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="font-heading font-bold text-xl">{team.name}</h4>
                                                <span className="bg-brutal-dark text-brutal-bg text-[10px] px-2 py-0.5 rounded font-data font-bold uppercase">LEAD: {team.app_user?.name}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {team.event_team_member?.map((m: any) => (
                                                    <span key={m.id} className="bg-brutal-dark/10 px-2 py-1 rounded font-data text-xs">{m.app_user?.name}</span>
                                                ))}
                                            </div>
                                            <div className="font-data text-xs text-brutal-dark/50">{team.event_team_member?.length || 0} members</div>
                                        </div>
                                        <div>
                                            {isUserInTeam ? (
                                                <span className="text-green-600 font-data text-xs font-bold px-3 py-2 uppercase border-2 border-green-500/30 rounded-full inline-block">You're in this team</span>
                                            ) : (
                                                <Button size="sm" onClick={() => handleJoinTeam(team.id)} disabled={!canJoin || loadingAction} className={(!canJoin && user) ? 'opacity-50 cursor-not-allowed' : ''}>
                                                    Join Team
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="font-data text-brutal-dark/50 p-6 bg-brutal-dark/5 rounded-xl border border-brutal-dark/10 border-dashed text-center">No teams formed yet.</p>
                    )}

                    {registrationProps.isRegistered && !userTeamId && (
                        <div className="mt-8 p-6 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-xl">
                            <h4 className="font-heading font-bold text-lg mb-4 uppercase text-yellow-800">Create a Team</h4>
                            <form onSubmit={handleCreateTeam} className="flex gap-4">
                                <input
                                    type="text"
                                    value={newTeamName}
                                    onChange={e => setNewTeamName(e.target.value)}
                                    placeholder="Enter team name..."
                                    className="flex-1 bg-brutal-bg border-2 border-brutal-dark/20 px-4 py-3 rounded-xl font-data text-sm focus:outline-none focus:border-brutal-dark"
                                    required
                                />
                                <Button type="submit" disabled={loadingAction} className="whitespace-nowrap">Create Team</Button>
                            </form>
                        </div>
                    )}
                </section>

                {/* Submission Portal */}
                {registrationProps.isRegistered && (
                    <section>
                        <h3 className="font-heading font-bold text-3xl mb-6 uppercase tracking-tight-heading">Submit Your Project</h3>
                        {hasSubmitted ? (
                            <div className="p-6 bg-brutal-dark text-brutal-bg rounded-[2rem] text-center shadow-lg">
                                <div className="font-heading font-bold text-2xl mb-2 text-brutal-bg">Submission Received</div>
                                <p className="font-data text-sm text-brutal-bg/70">Your entry has been submitted. Results will be announced after review.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmitProject} className="p-8 bg-brutal-dark/5 rounded-[2rem] border-2 border-brutal-dark/10 space-y-6">
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark mb-2 block uppercase tracking-widest">Select Active Project</label>
                                    <select 
                                        className="w-full bg-brutal-bg border-2 border-brutal-dark/20 px-4 py-3 rounded-xl font-data text-sm focus:outline-none focus:border-brutal-dark appearance-none"
                                        value={selectedProjectId}
                                        onChange={e => setSelectedProjectId(e.target.value)}
                                        required
                                    >
                                        <option value="">Link an existing project...</option>
                                        {myProjects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                    </select>
                                    <div className="mt-4 text-right">
                                        <Link to="/dashboard" className="font-data text-sm font-bold text-brutal-dark hover:text-brutal-red uppercase interactive-lift inline-block border-b-2 border-transparent hover:border-brutal-red">Create a new project first →</Link>
                                    </div>
                                </div>
                                <Button type="submit" disabled={loadingAction} className="w-full justify-center">Submit Entry</Button>
                            </form>
                        )}
                    </section>
                )}

                {/* Project Showcase */}
                {isPast && submissions.length > 0 && (
                    <section>
                        <h3 className="font-heading font-bold text-3xl mb-6 uppercase tracking-tight-heading">Project Showcase</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {submissions.map(sub => (
                                <div key={sub.id} className="p-6 bg-brutal-bg border-4 border-brutal-dark shadow-[4px_4px_0px_#111] flex flex-col hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#111] transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`px-2 py-1 text-[10px] font-bold font-data rounded uppercase ${
                                            sub.status === 'winner' ? 'bg-brutal-red text-brutal-bg shadow-sm' : 'bg-brutal-dark/10 text-brutal-dark'
                                        }`}>
                                            {sub.status}
                                        </span>
                                    </div>
                                    <h4 className="font-heading font-bold text-xl mb-2 line-clamp-2 leading-tight">{sub.project?.title || 'Unknown Project'}</h4>
                                    {sub.team && <p className="font-data text-sm text-brutal-dark/60 mb-6 flex-1">Team: {sub.team.name}</p>}
                                    <div className="mt-auto pt-4 border-t-2 border-brutal-dark/10">
                                        {sub.project && (
                                            <Link to={`/projects/${sub.project.id}`} className="font-data text-sm text-brutal-dark hover:text-brutal-red font-bold uppercase flex items-center gap-1 group w-fit">
                                                View Project <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <DiscussionSection {...commentsProps} />
            </div>
            <div className="space-y-8">
                <RegistrationSidebar {...registrationProps} />
                <p className="font-data text-xs font-bold text-brutal-dark/50 mt-4 text-center uppercase tracking-widest px-4">
                    After registering, join or create a team in the Teams section below.
                </p>
            </div>
        </div>
    )
};

const MakerMeetupContent = ({ id, event, user, commentsProps, registrationProps }: any) => {
    const [slots, setSlots] = useState<any[]>([]);
    const [myProjects, setMyProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [loadingAction, setLoadingAction] = useState(false);
    
    useEffect(() => {
        const fetchSlots = async () => {
            const { data } = await supabase
                .from('showcase_slot')
                .select('id, status, user_id, project:project!project_id(id, title), app_user:app_user!user_id(name)')
                .eq('event_id', id);
            setSlots(data || []);
        };
        const fetchMyProjects = async () => {
            if (!user) return;
            const { data } = await supabase.from('project').select('id, title').eq('owner_id', user.id).eq('status', 'active');
            setMyProjects(data || []);
        };
        fetchSlots();
        fetchMyProjects();
    }, [id, user]);

    const approvedSlots = slots.filter(s => s.status === 'approved');
    const userSlot = user ? slots.find(s => s.user_id === user.id) : null;

    const handleBookSlot = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || loadingAction) return;
        setLoadingAction(true);
        await supabase.from('showcase_slot').insert({
            event_id: id,
            user_id: user.id,
            project_id: selectedProjectId || null,
            status: 'pending',
        });
        const { data } = await supabase
            .from('showcase_slot')
            .select('id, status, user_id, project:project!project_id(id, title), app_user:app_user!user_id(name)')
            .eq('event_id', id);
        setSlots(data || []);
        setLoadingAction(false);
    };

    return (
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-16 grid grid-cols-1 md:grid-cols-3 gap-16 relative">
            <div className="md:col-span-2 space-y-12">
                <section>
                    <h3 className="font-heading font-bold text-3xl mb-6 tracking-tight-heading uppercase">About this Meetup</h3>
                    <p className="font-data text-lg text-brutal-dark/80 whitespace-pre-wrap leading-relaxed">{event.description}</p>
                </section>

                {/* Confirmed Presenters */}
                {approvedSlots.length > 0 && (
                    <section>
                        <h3 className="font-heading font-bold text-3xl mb-6 uppercase tracking-tight-heading">Confirmed Presenters</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {approvedSlots.map(slot => (
                                <div key={slot.id} className="p-6 bg-brutal-bg border-4 border-brutal-dark shadow-[4px_4px_0px_#111] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-default">
                                    <div className="font-heading font-bold text-xl leading-tight mb-2">{slot.app_user?.name}</div>
                                    {slot.project && (
                                        <Link to={`/projects/${slot.project.id}`} className="font-data text-sm font-bold uppercase text-brutal-dark hover:text-brutal-red line-clamp-1 block mb-3 border-b-2 border-brutal-dark/10 pb-2 w-fit">
                                            {slot.project.title}
                                        </Link>
                                    )}
                                    <span className="font-data text-[10px] uppercase font-bold text-brutal-dark/40 block mt-2 tracking-widest">Presenting</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Book a Slot */}
                <section>
                    <h3 className="font-heading font-bold text-3xl mb-6 uppercase tracking-tight-heading">Book a Showcase Slot</h3>
                    {userSlot ? (
                        <div className="p-6 bg-yellow-500/10 border-4 border-yellow-500 rounded-2xl">
                            <h4 className="font-heading font-bold text-xl uppercase mb-2 text-yellow-800">Slot Requested</h4>
                            <p className="font-data text-base font-bold text-yellow-900/70">
                                {userSlot.status === 'approved' 
                                    ? "Your slot is confirmed! You're on the lineup." 
                                    : "Your request is pending admin approval."}
                            </p>
                        </div>
                    ) : user ? (
                        <form onSubmit={handleBookSlot} className="p-8 bg-brutal-dark/5 rounded-[2rem] border-2 border-brutal-dark/10 space-y-6">
                            <div>
                                <label className="font-data text-sm font-bold text-brutal-dark mb-4 block uppercase tracking-widest">What will you showcase?</label>
                                <select 
                                    className="w-full bg-brutal-bg border-2 border-brutal-dark/20 px-4 py-3 rounded-xl font-data text-base focus:outline-none focus:border-brutal-dark mb-4 appearance-none"
                                    value={selectedProjectId}
                                    onChange={e => setSelectedProjectId(e.target.value)}
                                    required
                                >
                                    <option value="">Select a project...</option>
                                    {myProjects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                </select>
                                <textarea 
                                    placeholder="Any special requirements? (e.g. need power outlet)"
                                    className="w-full bg-brutal-bg border-2 border-brutal-dark/20 px-4 py-3 rounded-xl font-data text-base focus:outline-none focus:border-brutal-dark resize-y"
                                    rows={3}
                                />
                            </div>
                            <Button type="submit" disabled={loadingAction} className="w-full justify-center" size="lg">Request a Slot</Button>
                        </form>
                    ) : (
                        <div className="p-12 bg-brutal-dark/5 rounded-[2rem] border-2 border-brutal-dark/10 border-dashed text-center">
                            <p className="font-data text-lg font-bold uppercase text-brutal-dark/60 mb-6">Log in to book a presentation slot.</p>
                            <Link to="/login"><Button variant="outline" size="lg">Log in</Button></Link>
                        </div>
                    )}
                </section>

                <DiscussionSection {...commentsProps} />
            </div>
            <div className="space-y-8">
                <RegistrationSidebar {...registrationProps} />
            </div>
        </div>
    )
};

const TechTuesdayContent = ({ id, event, user, commentsProps, registrationProps }: any) => {
    const isPast = new Date(event.date) < new Date();
    
    // Fallback if missing ---RECAP--- divider, check PRD
    const [aboutText, recapText] = event.description?.includes('---RECAP---') 
        ? event.description.split('---RECAP---') 
        : [event.description, null];
        
    const externalRsvpUrl = event.location?.startsWith('rsvp:') ? event.location.replace('rsvp:', '') : null;

    const [slots, setSlots] = useState<any[]>([]);

    useEffect(() => {
        const fetchSlots = async () => {
            const { data } = await supabase
                .from('showcase_slot')
                .select('id, status, user_id, project:project!project_id(id, title), app_user:app_user!user_id(name)')
                .eq('event_id', id)
                .eq('status', 'approved');
            setSlots(data || []);
        };
        fetchSlots();
    }, [id]);

    const customRegisterNode = externalRsvpUrl ? (
        <div className="space-y-4">
            <a href={externalRsvpUrl} target="_blank" rel="noreferrer" className="block">
                <Button size="lg" className="w-full bg-brutal-bg text-brutal-dark hover:bg-brutal-red hover:text-brutal-bg shadow-[4px_4px_0px_#111] hover:translate-y-1 hover:shadow-none transition-all">
                    RSVP via External Link ↗
                </Button>
            </a>
            <p className="font-data text-[10px] uppercase font-bold text-brutal-bg/50 text-center mt-4">
                Opens in a new tab — hosted on an external platform
            </p>
        </div>
    ) : null;

    return (
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-16 grid grid-cols-1 md:grid-cols-3 gap-16 relative">
            <div className="md:col-span-2 space-y-12">
                
                {/* Recap Section */}
                {isPast && recapText && (
                    <div className="p-8 md:p-12 bg-brutal-dark text-brutal-bg rounded-[2rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brutal-red/20 rounded-bl-full pointer-events-none" />
                        <span className="font-data text-xs uppercase font-bold text-brutal-red tracking-widest block mb-6">Event Recap</span>
                        <p className="font-data text-[1.125rem] text-brutal-bg/90 whitespace-pre-wrap leading-relaxed">{recapText.trim()}</p>
                    </div>
                )}

                {/* Featured Lineup */}
                <section>
                    <h3 className="font-heading font-bold text-3xl mb-6 uppercase tracking-tight-heading">Featured Lineup</h3>
                    {slots.length > 0 ? (
                        <div className="space-y-4">
                            {slots.map((slot, index) => (
                                <div key={slot.id} className="flex items-center gap-6 p-6 bg-brutal-bg border-4 border-brutal-dark shadow-[4px_4px_0px_#111]">
                                    <span className="font-data text-4xl font-bold text-brutal-red w-12 text-right">{String(index + 1).padStart(2, '0')}</span>
                                    <div>
                                        <div className="font-heading font-bold text-2xl leading-tight mb-1 uppercase tracking-tight">{slot.app_user?.name}</div>
                                        {slot.project && <div className="font-data text-base font-bold text-brutal-dark/60 block mt-1"><Link to={`/projects/${slot.project.id}`} className="hover:text-brutal-red transition-colors">{slot.project.title}</Link></div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 bg-brutal-dark/5 border border-dashed border-brutal-dark/20 rounded-xl">
                            <p className="font-data text-brutal-dark/50 italic text-center font-bold">Lineup will be announced soon.</p>
                        </div>
                    )}
                </section>

                <section>
                    <h3 className="font-heading font-bold text-3xl mb-6 tracking-tight-heading uppercase">Session Details</h3>
                    <p className="font-data text-lg text-brutal-dark/80 whitespace-pre-wrap leading-relaxed">{aboutText.trim()}</p>
                </section>

                <DiscussionSection {...commentsProps} />
            </div>
            <div className="space-y-8">
                <RegistrationSidebar {...registrationProps} customRegisterNode={customRegisterNode} />
            </div>
        </div>
    )
};

export function EventDetails() {
    const { id } = useParams();
    const { data: event, loading } = useEvent(id);
    const { user } = useAuth();
    const { isRegistered, register, unregister } = useEventRegistration(id);
    const { comments, addComment, deleteComment } = useComments('event', id);
    const [commentText, setCommentText] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const handleRegister = async () => {
        setActionLoading(true);
        await register();
        
        if (user && id) {
            try {
                const { onEventRegistration } = await import('../lib/badgeEngine');
                await onEventRegistration(user.id, id);
            } catch (err) {
                console.error('Failed to auto-award event badge', err);
            }
        }
        
        setActionLoading(false);
    };

    const handleUnregister = async () => {
        setActionLoading(true);
        await unregister();
        setActionLoading(false);
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        await addComment(commentText.trim());
        setCommentText('');
    };

    if (loading) {
        return <div className="pt-32 px-12 font-data text-2xl">Loading event...</div>;
    }

    if (!event) {
        return <div className="pt-32 px-12 font-data text-2xl">Event not found.</div>;
    }

    const date = new Date(event.date);
    const capacityRemaining = event.capacity ? event.capacity - event.registration_count : null;

    const commentsProps = { comments, user, deleteComment, handleComment, commentText, setCommentText };
    const registrationProps = { isRegistered, event, user, actionLoading, handleRegister, handleUnregister, capacityRemaining };
    const sharedProps = { id, event, user, commentsProps, registrationProps };

    const isPast = date < new Date();

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-24 min-h-screen">
            <div className="h-[50vh] min-h-[400px] w-full relative">
                {event.cover_image_url && (
                    <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brutal-bg via-brutal-bg/80 to-brutal-dark/40" />

                <div className="absolute bottom-0 left-0 w-full px-6 md:px-12 lg:px-24 pb-12 z-10">
                    <Link to="/events" className="inline-flex items-center gap-2 font-data text-sm font-bold uppercase hover:text-brutal-red mb-8 bg-brutal-bg/90 backdrop-blur px-4 py-2 rounded-full border border-brutal-dark/10 interactive-lift">
                        <ArrowLeft className="w-4 h-4" /> Back to Events
                    </Link>

                    <div className="max-w-5xl">
                        <span className="bg-brutal-bg text-brutal-dark px-3 py-1 font-data text-xs font-bold rounded shadow-[2px_2px_0px_rgba(0,0,0,1)] border border-brutal-dark uppercase mb-4 inline-block">{formatEventType(event.event_type)}</span>
                        <h1 className="font-heading font-bold text-5xl md:text-7xl tracking-tight-heading leading-tight mb-6">
                            {event.title}
                        </h1>

                        <div className="flex flex-wrap gap-6 font-data text-base font-bold text-brutal-dark/90 bg-brutal-bg p-4 rounded-xl border-2 border-brutal-dark/10 shadow-[4px_4px_0px_rgba(0,0,0,0.1)] inline-flex">
                            <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-brutal-red" /> {date.toLocaleDateString()}</div>
                            {event.location && <div className="flex items-center gap-2"><MapPin className="w-5 h-5 text-brutal-red" /> {event.location.startsWith('rsvp:') ? 'External Location' : event.location}</div>}
                            <div className="flex items-center gap-2"><Users className="w-5 h-5 text-brutal-red" /> {capacityRemaining !== null ? `${capacityRemaining} / ${event.capacity} Spots` : `${event.registration_count} registered`}</div>
                        </div>
                    </div>
                </div>
            </div>

            {event.event_type === 'build_challenge' && <BuildChallengeContent {...sharedProps} />}
            {event.event_type === 'maker_meetup' && <MakerMeetupContent {...sharedProps} />}
            {event.event_type === 'tech_tuesday' && <TechTuesdayContent {...sharedProps} />}
        </div>
    );
}
