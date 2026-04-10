import React from 'react';
import { Link } from 'react-router';
import { Calendar, MapPin, Users, ArrowRight, ExternalLink, Check } from 'lucide-react';
import { XpRewardBadge } from '../../components/ui/XpRewardBadge';
import { XP_REWARDS } from '../../lib/constants';
import CountdownHero from './CountdownHero';
import AddToCalendarDropdown from './AddToCalendarDropdown';

const ActionSidebar = ({ event, hosts, registrationProps }: any) => {
    const {
        isRegistered, user, actionLoading, handleRegister, handleUnregister, capacityRemaining,
    } = registrationProps;
    const date = new Date(event.date);
    const endDate = event.end_date ? new Date(event.end_date) : null;
    const externalRsvpUrl = event.location?.startsWith('rsvp:') ? event.location.replace('rsvp:', '') : null;
    const capacity = event.capacity || 0;
    const pct = capacity ? Math.min(100, Math.round((event.registration_count / capacity) * 100)) : 0;

    return (
        <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1 space-y-3 [scrollbar-width:thin]">
            {/* Countdown card */}
            <div className="bg-brutal-dark text-brutal-bg rounded-2xl p-4 md:p-5 border-2 border-brutal-dark shadow-[6px_6px_0_0_rgba(196,41,30,0.35)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-brutal-red/15 rounded-bl-full pointer-events-none" />
                <span className="relative font-data text-[9px] font-bold uppercase tracking-widest text-brutal-bg/50 block mb-2">
                    Starts in
                </span>
                <div className="relative">
                    <CountdownHero date={event.date} />
                </div>
            </div>

            {/* Meta + Register card — no overflow-hidden so the calendar dropdown can spill out */}
            <div className="bg-brutal-bg rounded-2xl border-2 border-brutal-dark/15 shadow-[6px_6px_0_0_rgba(196,41,30,0.18)]">
                {/* Meta rows */}
                <div className="p-4 md:p-5 space-y-2.5 border-b border-brutal-dark/10">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brutal-red/10 border border-brutal-red/20 flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-4 h-4 text-brutal-red" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40">When</div>
                            <div className="font-data text-xs font-bold text-brutal-dark leading-tight">
                                {date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                            <div className="font-data text-[11px] text-brutal-dark/55 tabular-nums">
                                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {endDate && ` — ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            </div>
                        </div>
                    </div>

                    {event.location && !externalRsvpUrl && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-brutal-red/10 border border-brutal-red/20 flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-4 h-4 text-brutal-red" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40">Where</div>
                                <div className="font-data text-xs font-bold text-brutal-dark leading-tight line-clamp-2">{event.location}</div>
                            </div>
                        </div>
                    )}
                    {externalRsvpUrl && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-brutal-red/10 border border-brutal-red/20 flex items-center justify-center flex-shrink-0">
                                <ExternalLink className="w-4 h-4 text-brutal-red" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40">Registration</div>
                                <div className="font-data text-xs font-bold text-brutal-dark leading-tight line-clamp-1">External platform</div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brutal-red/10 border border-brutal-red/20 flex items-center justify-center flex-shrink-0">
                            <Users className="w-4 h-4 text-brutal-red" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                                <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40">Attending</div>
                                <div className="font-data text-[10px] font-bold text-brutal-dark tabular-nums">
                                    {capacity > 0 ? `${event.registration_count}/${capacity}` : `${event.registration_count}`}
                                </div>
                            </div>
                            {capacity > 0 ? (
                                <>
                                    <div className="mt-1 h-1.5 w-full bg-brutal-dark/10 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-brutal-dark' : pct >= 80 ? 'bg-brutal-red' : 'bg-green-500'}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <div className="font-data text-[10px] text-brutal-dark/55 mt-1">
                                        {capacityRemaining !== null && capacityRemaining > 0
                                            ? `${capacityRemaining} spot${capacityRemaining !== 1 ? 's' : ''} left`
                                            : 'At capacity'}
                                    </div>
                                </>
                            ) : (
                                <div className="font-data text-[10px] text-brutal-dark/55 mt-0.5">
                                    Unlimited capacity
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Register CTA */}
                <div className="p-4 md:p-5 space-y-2.5">
                    {externalRsvpUrl ? (
                        <a href={externalRsvpUrl} target="_blank" rel="noreferrer" className="block">
                            <button
                                type="button"
                                className="w-full bg-brutal-red text-brutal-bg py-3 rounded-xl font-heading font-bold text-sm uppercase tracking-wider shadow-[3px_3px_0_0_rgba(0,0,0,0.25)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all flex items-center justify-center gap-2"
                            >
                                RSVP via External Link <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                        </a>
                    ) : isRegistered ? (
                        <>
                            <div className="w-full bg-green-500/15 border-2 border-green-500/30 text-green-700 py-3 rounded-xl font-data text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                                <Check className="w-4 h-4" /> You're going
                            </div>
                            <button
                                type="button"
                                onClick={handleUnregister}
                                disabled={actionLoading}
                                className="w-full font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/45 hover:text-brutal-red transition-colors py-1"
                            >
                                {actionLoading ? 'Processing...' : 'Cancel RSVP'}
                            </button>
                        </>
                    ) : event.registration_status === 'open' && (capacityRemaining === null || capacityRemaining > 0) ? (
                        user ? (
                            <button
                                type="button"
                                onClick={handleRegister}
                                disabled={actionLoading}
                                className="w-full bg-brutal-red text-brutal-bg py-3 rounded-xl font-heading font-bold text-sm uppercase tracking-wider shadow-[3px_3px_0_0_rgba(0,0,0,0.25)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {actionLoading ? 'Registering...' : 'Register Now'} <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <Link to="/login" className="block">
                                <button
                                    type="button"
                                    className="w-full bg-brutal-dark text-brutal-bg py-3 rounded-xl font-heading font-bold text-sm uppercase tracking-wider shadow-[3px_3px_0_0_rgba(196,41,30,0.4)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all flex items-center justify-center gap-2"
                                >
                                    Log in to Register
                                </button>
                            </Link>
                        )
                    ) : (
                        <div className="w-full bg-brutal-dark/5 border-2 border-brutal-dark/15 text-brutal-dark/50 py-3 rounded-xl font-data text-xs font-bold uppercase tracking-wider text-center">
                            Registration Closed
                        </div>
                    )}

                    <AddToCalendarDropdown event={event} />
                </div>
            </div>

            {/* Hosts card */}
            {hosts && hosts.length > 0 && (
                <div className="bg-brutal-bg rounded-2xl border-2 border-brutal-dark/15 shadow-[6px_6px_0_0_rgba(196,41,30,0.18)] p-4 md:p-5">
                    <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40 mb-3">
                        Hosted by
                    </div>
                    <div className="space-y-2">
                        {hosts.map((host: any) => (
                            <Link
                                key={host.id}
                                to={`/makers/${host.user_id}`}
                                className="flex items-center gap-2.5 p-2 -mx-2 rounded-lg hover:bg-brutal-dark/5 transition-colors group"
                            >
                                {host.avatar_url ? (
                                    <img src={host.avatar_url} alt={host.name} className="w-9 h-9 rounded-full object-cover border-2 border-brutal-dark/15" />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-brutal-dark/10 border-2 border-brutal-dark/15 flex items-center justify-center font-data text-xs font-bold text-brutal-dark/60">
                                        {host.name.charAt(0)}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="font-data text-xs font-bold text-brutal-dark group-hover:text-brutal-red transition-colors line-clamp-1">
                                        {host.name}
                                    </div>
                                    <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40">
                                        Mentor · Host
                                    </div>
                                </div>
                                <ArrowRight className="w-3 h-3 text-brutal-dark/25 group-hover:text-brutal-red group-hover:translate-x-0.5 transition-all" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* XP Rewards */}
            <div className="bg-brutal-bg rounded-2xl border-2 border-brutal-dark/15 shadow-[6px_6px_0_0_rgba(196,41,30,0.18)] p-4 md:p-5 space-y-2">
                <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40 mb-2">
                    XP Rewards
                </div>
                <div className="flex items-center justify-between">
                    <span className="font-data text-[10px] text-brutal-dark/60">Register</span>
                    <XpRewardBadge amount={XP_REWARDS.event_registered} />
                </div>
                {event.event_type === 'build_challenge' && (
                    <div className="flex items-center justify-between">
                        <span className="font-data text-[10px] text-brutal-dark/60">Present / Submit</span>
                        <XpRewardBadge amount={XP_REWARDS.event_presented} />
                    </div>
                )}
                {event.event_type === 'maker_meetup' && (
                    <div className="flex items-center justify-between">
                        <span className="font-data text-[10px] text-brutal-dark/60">Present</span>
                        <XpRewardBadge amount={XP_REWARDS.event_presented} />
                    </div>
                )}
            </div>
        </aside>
    );
};

export default ActionSidebar;
