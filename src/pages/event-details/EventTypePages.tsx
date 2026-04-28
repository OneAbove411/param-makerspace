import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { BookOpen, UserCheck, Mic2, ExternalLink, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { SectionAnchor } from './SectionAnchor';
import { BuildChallengeSection } from '../../components/events/build-challenge/BuildChallengeSection';
import { MakerMeetupSection } from '../../components/events/maker-meetup/MakerMeetupSection';

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
            {/*
              P9: Maker Meetup apply → shortlist → interview → selection flow.
              Renders nothing (null) when event.application_deadline is unset,
              so older meetups that only use the showcase-slot UI below are
              unaffected.
            */}
            <section className="ed-section">
                <MakerMeetupSection event={event} />
            </section>

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

// BuildChallengePreEvent — thin wrapper around the P8 BuildChallengeSection
// orchestrator, which owns all phase/role routing (apply → submit → gallery
// → winners). The older team/submission flow has been retired; its tables
// (`event_team`, `event_team_member`, legacy submission columns) are no
// longer referenced here.
const BuildChallengePreEvent = ({ event }: any) => {
    return <BuildChallengeSection event={event} />;
};

const TechTuesdayPreEvent = ({ id, event, user }: any) => {
    // P10 — Tech Tuesdays are externally-RSVP'd via Luma. Registration,
    // shortlist and submission are not part of the flow.
    // If the admin has populated speaker/topic fields, render a compact
    // speaker card + prominent Luma CTA. Otherwise fall back to the
    // legacy showcase-slot lineup for older rows.
    const hasNewSpeakerBlock = !!(event.speaker_name || event.topic_summary);
    const externalRsvpUrl = event.external_rsvp_url
        ? event.external_rsvp_url
        : (event.location?.startsWith('rsvp:') ? event.location.replace('rsvp:', '') : null);
    const isLuma = typeof externalRsvpUrl === 'string' && /^https:\/\/(lu\.ma|luma\.com)\//i.test(externalRsvpUrl);

    const [slots, setSlots] = useState<any[]>([]);

    useEffect(() => {
        if (hasNewSpeakerBlock) return; // legacy lineup only for old events
        const fetchSlots = async () => {
            const { data } = await supabase
                .from('showcase_slot')
                .select('id, status, user_id, project:project!project_id(id, title), app_user:app_user!user_id(name)')
                .eq('event_id', id)
                .eq('status', 'approved');
            setSlots(data || []);
        };
        fetchSlots();
    }, [id, hasNewSpeakerBlock]);

    if (hasNewSpeakerBlock) {
        return (
            <>
                {/* Speaker + topic card */}
                <section className="ed-section">
                    <SectionAnchor id="speaker" number="02" title="Speaker" icon={<Mic2 className="w-5 h-5 text-brutal-dark/40" />} />
                    <div className="p-6 bg-brutal-bg border-4 border-brutal-dark shadow-[4px_4px_0px_#111] space-y-3">
                        {event.speaker_name && (
                            <div>
                                <div className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40 mb-1">
                                    Presenter
                                </div>
                                <div className="font-heading font-bold text-2xl leading-tight uppercase tracking-tight">
                                    {event.speaker_name}
                                </div>
                                {event.speaker_bio_short && (
                                    <p className="font-data text-sm text-brutal-dark/70 mt-1.5">
                                        {event.speaker_bio_short}
                                    </p>
                                )}
                            </div>
                        )}
                        {event.topic_summary && (
                            <div>
                                <div className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40 mb-1">
                                    Topic
                                </div>
                                <p className="font-data text-sm text-brutal-dark/80">
                                    {event.topic_summary}
                                </p>
                            </div>
                        )}
                        {event.duration_min && (
                            <div className="flex items-center gap-2 font-data text-xs text-brutal-dark/55 pt-2 border-t border-brutal-dark/10">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{event.duration_min} minutes</span>
                            </div>
                        )}
                    </div>
                </section>

                {/* Prominent Luma CTA — second copy of the sidebar button so mobile
                    readers hit it without scrolling back up. */}
                {externalRsvpUrl && (
                    <section className="ed-section">
                        <a href={externalRsvpUrl} target="_blank" rel="noreferrer" className="block">
                            <button
                                type="button"
                                className="w-full bg-brutal-red text-brutal-bg py-4 rounded-xl font-heading font-bold text-lg uppercase tracking-wider shadow-[4px_4px_0_0_rgba(0,0,0,0.25)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center justify-center gap-3"
                            >
                                {isLuma ? 'RSVP on Luma' : 'RSVP'} <ExternalLink className="w-5 h-5" />
                            </button>
                        </a>
                        <p className="font-data text-[11px] text-brutal-dark/50 text-center mt-2">
                            Registration is handled externally — Param doesn't track RSVPs for Tech Tuesdays.
                        </p>
                    </section>
                )}
            </>
        );
    }

    // Legacy fallback — rows without speaker fields still show the showcase lineup.
    return (
        <>
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
