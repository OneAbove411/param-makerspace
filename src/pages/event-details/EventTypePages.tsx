import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Users, Trophy, BookOpen, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { SectionAnchor } from './SectionAnchor';

const MakerMeetupPreEvent = ({ id, event, user, isRegistered }: any) => {
    const [slots, setSlots] = useState<any[]>([]);
    const [myProjects, setMyProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [topicText, setTopicText] = useState('');
    const [slotMode, setSlotMode] = useState<'project' | 'topic'>('project');
    const [loadingAction, setLoadingAction] = useState(false);

    const refetchSlots = async () => {
        const { data } = await supabase
            .from('showcase_slot')
            .select('id, status, user_id, project:project!project_id(id, title), app_user:app_user!user_id(name)')
            .eq('event_id', id);
        setSlots(data || []);
    };

    useEffect(() => {
        const fetchMyProjects = async () => {
            if (!user) return;
            const { data } = await supabase.from('project').select('id, title').eq('owner_id', user.id).eq('status', 'active');
            setMyProjects(data || []);
        };
        refetchSlots();
        fetchMyProjects();
    }, [id, user]);

    const approvedSlots = slots.filter(s => s.status === 'approved');
    const userSlot = user ? slots.find(s => s.user_id === user.id) : null;

    const handleBookSlot = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || loadingAction) return;
        setLoadingAction(true);
        const insertData: any = { event_id: id, user_id: user.id, status: 'pending' };
        if (slotMode === 'project' && selectedProjectId) {
            insertData.project_id = selectedProjectId;
        } else if (slotMode === 'topic' && topicText.trim()) {
            insertData.topic = topicText.trim();
        }
        await supabase.from('showcase_slot').insert(insertData);
        setLoadingAction(false);
        setTopicText('');
        setSelectedProjectId('');
        refetchSlots();
    };

    const canSubmit = slotMode === 'project' ? !!selectedProjectId : !!topicText.trim();

    return (
        <>
            {/* Confirmed Presenters */}
            {approvedSlots.length > 0 && (
                <section className="ed-section">
                    <SectionAnchor id="presenters" number="02" title="Confirmed Presenters" icon={<UserCheck className="w-5 h-5 text-brutal-dark/40" />} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {approvedSlots.map(slot => (
                            <div key={slot.id} className="p-5 bg-brutal-bg border-4 border-brutal-dark shadow-[4px_4px_0px_#111] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-default">
                                <div className="font-heading font-bold text-sm leading-tight mb-2">{slot.app_user?.name}</div>
                                {slot.project ? (
                                    <Link to={`/projects/${slot.project.id}`} className="font-data text-xs font-bold uppercase text-brutal-dark hover:text-brutal-red line-clamp-1 block mb-2 border-b border-brutal-dark/10 pb-2 w-fit">
                                        {slot.project.title}
                                    </Link>
                                ) : slot.topic ? (
                                    <p className="font-data text-xs text-brutal-dark/70 mb-2 border-b border-brutal-dark/10 pb-2">{slot.topic}</p>
                                ) : null}
                                <span className="font-data text-[9px] uppercase font-bold text-brutal-dark/40 block mt-2 tracking-widest">Presenting</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Book a Slot */}
            <section className="ed-section">
                <SectionAnchor id="book-slot" number="03" title="Book a Showcase Slot" />
                <p className="font-data text-xs text-brutal-dark/50 mb-4 max-w-lg">
                    Reserve a 5-minute lightning talk to show what you've been working on. You can present an existing project or pitch a topic you'd like to talk about.
                </p>
                {userSlot ? (
                    <div className={`p-5 rounded-xl max-w-lg ${userSlot.status === 'approved' ? 'bg-green-500/10 border border-green-500' : 'bg-yellow-500/10 border border-yellow-500'}`}>
                        <h4 className={`font-heading font-bold text-sm uppercase mb-2 ${userSlot.status === 'approved' ? 'text-green-800' : 'text-yellow-800'}`}>
                            {userSlot.status === 'approved' ? 'Slot Confirmed' : 'Slot Requested'}
                        </h4>
                        <p className={`font-data text-xs font-bold ${userSlot.status === 'approved' ? 'text-green-900/70' : 'text-yellow-900/70'}`}>
                            {userSlot.status === 'approved'
                                ? "You're on the lineup! Prepare your 5-minute talk."
                                : "Your request is pending mentor approval."
                            }
                        </p>
                        {(userSlot.project || userSlot.topic) && (
                            <p className="font-data text-xs text-brutal-dark/50 mt-2">
                                {userSlot.project ? `Project: ${userSlot.project.title}` : `Topic: ${userSlot.topic}`}
                            </p>
                        )}
                    </div>
                ) : user ? (
                    <form onSubmit={handleBookSlot} className="p-6 bg-brutal-dark/5 rounded-xl border border-brutal-dark/10 space-y-4 max-w-lg">
                        {/* Mode toggle */}
                        <div className="flex gap-1 bg-brutal-dark/10 rounded-lg p-1">
                            <button
                                type="button"
                                onClick={() => setSlotMode('project')}
                                className={`flex-1 py-2 px-3 rounded-md font-data text-[10px] font-bold uppercase tracking-wider transition-all ${
                                    slotMode === 'project'
                                        ? 'bg-brutal-dark text-brutal-bg shadow-sm'
                                        : 'text-brutal-dark/50 hover:text-brutal-dark'
                                }`}
                            >
                                Present a Project
                            </button>
                            <button
                                type="button"
                                onClick={() => setSlotMode('topic')}
                                className={`flex-1 py-2 px-3 rounded-md font-data text-[10px] font-bold uppercase tracking-wider transition-all ${
                                    slotMode === 'topic'
                                        ? 'bg-brutal-dark text-brutal-bg shadow-sm'
                                        : 'text-brutal-dark/50 hover:text-brutal-dark'
                                }`}
                            >
                                Pitch a Topic
                            </button>
                        </div>

                        {slotMode === 'project' ? (
                            <div>
                                <label className="font-data text-xs font-bold text-brutal-dark mb-2 block uppercase tracking-widest">Select a project</label>
                                <select
                                    className="w-full bg-brutal-bg border border-brutal-dark/15 px-3 py-2 rounded-xl font-data text-sm focus:outline-none focus:border-brutal-dark/30 appearance-none"
                                    value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}
                                >
                                    <option value="">Choose one of your projects...</option>
                                    {myProjects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                </select>
                                {myProjects.length === 0 && (
                                    <p className="font-data text-[10px] text-brutal-dark/40 mt-2">
                                        No projects yet.{' '}
                                        <Link to="/dashboard" className="text-brutal-red hover:underline">Create one first</Link>, or switch to "Pitch a Topic."
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div>
                                <label className="font-data text-xs font-bold text-brutal-dark mb-2 block uppercase tracking-widest">What will you talk about?</label>
                                <input
                                    type="text"
                                    value={topicText}
                                    onChange={e => setTopicText(e.target.value)}
                                    placeholder="e.g. 'How I built a drone from scratch'"
                                    className="w-full bg-brutal-bg border border-brutal-dark/15 px-3 py-2 rounded-xl font-data text-sm focus:outline-none focus:border-brutal-dark/30"
                                    maxLength={200}
                                />
                                <p className="font-data text-[10px] text-brutal-dark/30 mt-1 text-right">{topicText.length}/200</p>
                            </div>
                        )}

                        <Button type="submit" disabled={loadingAction || !isRegistered || !canSubmit} className="w-full justify-center" size="sm">
                            {!isRegistered ? 'Register first to book a slot' : loadingAction ? 'Submitting...' : 'Request a Slot'}
                        </Button>
                    </form>
                ) : (
                    <div className="p-8 bg-brutal-dark/5 rounded-xl border border-brutal-dark/10 border-dashed text-center max-w-lg">
                        <p className="font-data text-sm font-bold uppercase text-brutal-dark/60 mb-4">Log in to book a presentation slot.</p>
                        <Link to="/login"><Button variant="outline" size="sm">Log in</Button></Link>
                    </div>
                )}
            </section>
        </>
    );
};

const BuildChallengePreEvent = ({ id, event, user, isRegistered }: any) => {
    const [teams, setTeams] = useState<any[]>([]);
    const [myProjects, setMyProjects] = useState<any[]>([]);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [loadingAction, setLoadingAction] = useState(false);

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
        const { data: subData } = await supabase.from('event_submission').select('id, event_id, team_id, user_id, project_id, status, created_at').eq('event_id', id).eq('user_id', user.id);
        if (subData && subData.length > 0) setHasSubmitted(true);
    };

    useEffect(() => {
        fetchTeams();
        fetchMyProjects();
    }, [id, user]);

    const userTeamId = user ? teams.find(t => t.event_team_member?.some((m: any) => m.user_id === user.id))?.id : null;

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || loadingAction) return;
        setLoadingAction(true);
        const { data: team } = await supabase.from('event_team').insert({ event_id: id, name: newTeamName, lead_id: user.id }).select('id, event_id, name, lead_id, created_at').single();
        if (team) {
            await supabase.from('event_team_member').insert({ team_id: team.id, user_id: user.id });
        }
        setNewTeamName('');
        setLoadingAction(false);
        fetchTeams();
    };

    const handleJoinTeam = async (teamId: string) => {
        if (!user || loadingAction) return;
        setLoadingAction(true);
        await supabase.from('event_team_member').insert({ team_id: teamId, user_id: user.id });
        setLoadingAction(false);
        fetchTeams();
    };

    const handleSubmitProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || loadingAction) return;
        setLoadingAction(true);
        await supabase.from('event_submission').insert({
            event_id: id, user_id: user.id, team_id: userTeamId || null,
            project_id: selectedProjectId || null, status: 'submitted',
        });
        setHasSubmitted(true);
        setLoadingAction(false);
    };

    return (
        <>
            {/* Teams */}
            <section className="ed-section">
                <SectionAnchor id="teams" number="02" title="Teams" icon={<Users className="w-5 h-5 text-brutal-dark/40" />} />
                {teams.length > 0 ? (
                    <div className="space-y-3">
                        {teams.map(team => {
                            const isUserInTeam = user && team.event_team_member?.some((m: any) => m.user_id === user.id);
                            const canJoin = user && isRegistered && !userTeamId;
                            return (
                                <div key={team.id} className="p-4 bg-brutal-dark/5 rounded-xl border border-brutal-dark/10 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <h4 className="font-heading font-bold text-sm">{team.name}</h4>
                                            <span className="bg-brutal-dark text-brutal-bg text-[9px] px-2 py-0.5 rounded font-data font-bold uppercase">LEAD: {team.app_user?.name}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mb-1">
                                            {team.event_team_member?.map((m: any) => (
                                                <span key={m.id} className="bg-brutal-dark/10 px-2 py-0.5 rounded font-data text-[9px]">{m.app_user?.name}</span>
                                            ))}
                                        </div>
                                        <div className="font-data text-[9px] text-brutal-dark/50">{team.event_team_member?.length || 0} members</div>
                                    </div>
                                    <div>
                                        {isUserInTeam ? (
                                            <span className="text-green-600 font-data text-[9px] font-bold px-3 py-2 uppercase border border-green-500/30 rounded-full inline-block">You're in this team</span>
                                        ) : (
                                            <Button size="sm" onClick={() => handleJoinTeam(team.id)} disabled={!canJoin || loadingAction} className={(!canJoin && user) ? 'opacity-50 cursor-not-allowed' : ''}>
                                                Join Team
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="font-data text-xs text-brutal-dark/50 p-4 bg-brutal-dark/5 rounded-xl border border-brutal-dark/10 border-dashed text-center">No teams formed yet. Be the first!</p>
                )}

                {isRegistered && !userTeamId && (
                    <div className="mt-6 p-5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl max-w-lg">
                        <h4 className="font-heading font-bold text-sm mb-3 uppercase text-yellow-800">Create a Team</h4>
                        <form onSubmit={handleCreateTeam} className="flex gap-2">
                            <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                                placeholder="Enter team name..." required
                                className="flex-1 bg-brutal-bg border border-brutal-dark/15 px-3 py-2 rounded-xl font-data text-xs focus:outline-none focus:border-brutal-dark/30"
                            />
                            <Button type="submit" disabled={loadingAction} className="whitespace-nowrap">Create</Button>
                        </form>
                    </div>
                )}
            </section>

            {/* Submission Portal */}
            {isRegistered && (
                <section className="ed-section">
                    <SectionAnchor id="submit" number="03" title="Submit Your Project" icon={<Trophy className="w-5 h-5 text-brutal-dark/40" />} />
                    {hasSubmitted ? (
                        <div className="p-6 bg-brutal-dark text-brutal-bg rounded-xl text-center shadow-lg max-w-lg">
                            <div className="font-heading font-bold text-base mb-2 text-brutal-bg">Submission Received</div>
                            <p className="font-data text-xs text-brutal-bg/70">Your entry has been submitted. Results will be announced after review.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmitProject} className="p-6 bg-brutal-dark/5 rounded-xl border border-brutal-dark/10 space-y-4 max-w-lg">
                            <div>
                                <label className="font-data text-xs font-bold text-brutal-dark mb-2 block uppercase tracking-widest">Select Active Project</label>
                                <select className="w-full bg-brutal-bg border border-brutal-dark/15 px-3 py-2 rounded-xl font-data text-sm focus:outline-none focus:border-brutal-dark/30 appearance-none"
                                    value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} required
                                >
                                    <option value="">Link an existing project...</option>
                                    {myProjects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                </select>
                                <div className="mt-3 text-right">
                                    <Link to="/dashboard" className="font-data text-xs font-bold text-brutal-dark hover:text-brutal-red uppercase inline-block border-b border-transparent hover:border-brutal-red">Create a new project first →</Link>
                                </div>
                            </div>
                            <Button type="submit" disabled={loadingAction} className="w-full justify-center">Submit Entry</Button>
                        </form>
                    )}
                </section>
            )}
        </>
    );
};

const TechTuesdayPreEvent = ({ id, event, user }: any) => {
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

    return (
        <>
            {/* Featured Lineup */}
            <section className="ed-section">
                <SectionAnchor id="lineup" number="02" title="Featured Lineup" icon={<BookOpen className="w-5 h-5 text-brutal-dark/40" />} />
                {slots.length > 0 ? (
                    <div className="space-y-3">
                        {slots.map((slot, index) => (
                            <div key={slot.id} className="flex items-center gap-4 p-4 bg-brutal-bg border-4 border-brutal-dark shadow-[4px_4px_0px_#111]">
                                <span className="font-data text-2xl font-bold text-brutal-red w-10 text-right">{String(index + 1).padStart(2, '0')}</span>
                                <div>
                                    <div className="font-heading font-bold text-sm leading-tight uppercase tracking-tight">{slot.app_user?.name}</div>
                                    {slot.project && (
                                        <Link to={`/projects/${slot.project.id}`} className="font-data text-xs font-bold text-brutal-dark/60 hover:text-brutal-red transition-colors mt-1 block">
                                            {slot.project.title}
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-6 bg-brutal-dark/5 border border-dashed border-brutal-dark/20 rounded-xl">
                        <p className="font-data text-xs text-brutal-dark/50 italic text-center font-bold">Lineup will be announced soon.</p>
                    </div>
                )}
            </section>
        </>
    );
};

export { MakerMeetupPreEvent, BuildChallengePreEvent, TechTuesdayPreEvent };
