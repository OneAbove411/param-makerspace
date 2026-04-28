import React from 'react';
import { Link } from 'react-router';
import { Calendar, MapPin, Users, ArrowRight, ExternalLink, Check } from 'lucide-react';
import { XpRewardBadge } from '../../components/ui/XpRewardBadge';
import { XP_REWARDS } from '../../lib/constants';
import CountdownHero from './CountdownHero';
import AddToCalendarDropdown from './AddToCalendarDropdown';

// ─────────────────────────────────────────────────────────────
// ActionSidebar — Luma-inspired single unified card.
//
// Previous version stacked four separate cards (countdown, meta+register,
// hosts, XP rewards) which added visual clutter. Hosts are already shown
// in the hero via <HostedBySection/>, so we drop the duplicate card here.
// XP rewards are folded into a compact strip at the very bottom so the
// information is still accessible but no longer visually competes with
// the primary CTA.
// ─────────────────────────────────────────────────────────────

const ActionSidebar = ({ event, registrationProps }: any) => {
    const {
        isRegistered, user, actionLoading, handleRegister, handleUnregister, capacityRemaining,
    } = registrationProps;
    const date = new Date(event.date);
    const endDate = event.end_date ? new Date(event.end_date) : null;
    // P10 — prefer the first-class column added for Tech Tuesdays; fall back
    // to the legacy `location: 'rsvp:<url>'` convention for older rows.
    const externalRsvpUrl = event.external_rsvp_url
        ? event.external_rsvp_url
        : (event.location?.startsWith('rsvp:') ? event.location.replace('rsvp:', '') : null);
    const isLuma = typeof externalRsvpUrl === 'string' && /^https:\/\/(lu\.ma|luma\.com)\//i.test(externalRsvpUrl);
    const capacity = event.capacity || 0;
    const pct = capacity ? Math.min(100, Math.round((event.registration_count / capacity) * 100)) : 0;
    const isPast = new Date(event.date) < new Date();

    // Show XP line only when the event is still upcoming — post-event XP is already earned/irrelevant to the CTA rail.
    const showXpStrip = !isPast;
    const showPresentXp = showXpStrip && (event.event_type === 'build_challenge' || event.event_type === 'maker_meetup');

    return (
        <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1 [scrollbar-width:thin]">
            {/* ── Primary card — countdown + meta + register, all in one surface.
                `overflow-hidden` on the card means the dark countdown strip
                clips cleanly to the parent's rounded-2xl corners so the
                whole thing reads as one continuous surface, not two stacked
                cards. The red offset shadow is applied here so it sits
                evenly behind the full card. */}
            <div className="bg-brutal-bg rounded-2xl border-2 border-brutal-dark/15 shadow-[0_8px_24px_-8px_rgba(17,17,17,0.15),0_2px_6px_-1px_rgba(196,41,30,0.12)] overflow-hidden">

                {/* Countdown strip on top (only for upcoming events) —
                    fills edge-to-edge, no own border/radius, so it reads as
                    an integrated header of the same card, not a tile above it. */}
                {!isPast && (
                    <div className="bg-brutal-dark text-brutal-bg px-4 md:px-5 pt-4 pb-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-brutal-red/20 rounded-bl-full pointer-events-none" />
                        <span className="relative font-data text-[9px] font-bold uppercase tracking-widest text-brutal-bg/55 block mb-2.5">
                            Starts in
                        </span>
                        <div className="relative">
                            <CountdownHero date={event.date} />
                        </div>
                    </div>
                )}

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
                                className="w-full bg-brutal-red text-brutal-bg py-3.5 rounded-xl font-heading font-bold text-sm uppercase tracking-wider shadow-[4px_4px_0_0_rgba(17,17,17,0.3)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center justify-center gap-2"
                            >
                                {isLuma ? 'RSVP on Luma' : 'RSVP via External Link'} <ExternalLink className="w-3.5 h-3.5" />
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
                                className="w-full bg-brutal-red text-brutal-bg py-3.5 rounded-xl font-heading font-bold text-sm uppercase tracking-wider shadow-[4px_4px_0_0_rgba(17,17,17,0.3)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {actionLoading ? 'Registering...' : 'Register Now'} <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <Link to="/login" className="block">
                                <button
                                    type="button"
                                    className="w-full bg-brutal-dark text-brutal-bg py-3.5 rounded-xl font-heading font-bold text-sm uppercase tracking-wider shadow-[4px_4px_0_0_rgba(196,41,30,0.45)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center justify-center gap-2"
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

                {/* Compact XP strip — folded into the same card instead of a separate tile */}
                {showXpStrip && (
                    <div className="px-4 md:px-5 pb-4 pt-0">
                        <div className="border-t border-brutal-dark/10 pt-3 flex items-center justify-between gap-3 flex-wrap">
                            <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40">
                                Earn XP
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-data text-[10px] text-brutal-dark/55">Register</span>
                                    <XpRewardBadge amount={XP_REWARDS.event_registered} />
                                </div>
                                {showPresentXp && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-data text-[10px] text-brutal-dark/55">Present</span>
                                        <XpRewardBadge amount={XP_REWARDS.event_presented} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default ActionSidebar;
