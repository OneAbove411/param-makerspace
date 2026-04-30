import React from 'react';
import { Calendar, MapPin, Share2 } from 'lucide-react';
import { formatEventType } from '../Events';
import HostedBySection from './HostedBySection';
import EventWebsiteBanner from './EventWebsiteBanner';
import ActionSidebar from './ActionSidebar';
import MentorControlsPanel from './MentorControlsPanel';
import { MakerMeetupPreEvent, BuildChallengePreEvent, TechTuesdayPreEvent } from './EventTypePages';
import { DiscussionSection } from './DiscussionSection';
import { SectionAnchor } from './SectionAnchor';
import { PitchCTA } from '../../components/speakers/PitchCTA';
import { useAuth } from '../../lib/auth';
import { InlineText } from '../../components/events/inline/InlineText';
import { InlineDateRange } from '../../components/events/inline/InlineDateRange';
import { InlineCoverImage } from '../../components/events/inline/InlineCoverImage';
import { InlineBlocks } from '../../components/events/inline/InlineBlocks';

// ─────────────────────────────────────────────────────────────
// PreEventPage — Luma-inspired two-column layout.
//
// LEFT column:  Cover image · Presenter/calendar info · Hosts
// RIGHT column: Type badge · Title · Date block · Location ·
//               Registration card · About · Discussion
//
// Mentors/admins see inline editing affordances.
// ─────────────────────────────────────────────────────────────

/** Luma-style calendar date block */
function CalendarDateBlock({ date }: { date: Date }) {
    const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = date.getDate();
    return (
        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-brutal-dark/[0.04] border border-brutal-dark/10 flex flex-col items-center justify-center">
            <span className="font-data text-[9px] font-bold uppercase tracking-wider text-brutal-red leading-none">{month}</span>
            <span className="font-heading text-xl font-bold text-brutal-dark leading-none mt-0.5">{day}</span>
        </div>
    );
}

const PreEventPage = ({ event, hosts, id, user, registrationProps, commentsProps }: any) => {
    const { role } = useAuth();
    const canEdit = role === 'mentor' || role === 'admin';
    const date = new Date(event.date);
    const endDate = event.end_date ? new Date(event.end_date) : null;

    // Split description into About (strip recap suffix if present)
    const [aboutText] = event.description?.includes('---RECAP---')
        ? event.description.split('---RECAP---')
        : [event.description, null];

    // Format date string
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const startTime = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const endTime = endDate
        ? endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        : null;

    // External RSVP detection
    const externalRsvpUrl = event.external_rsvp_url
        ? event.external_rsvp_url
        : (event.location?.startsWith('rsvp:') ? event.location.replace('rsvp:', '') : null);

    return (
        <>
            {/* ── MAIN TWO-COLUMN LAYOUT ── */}
            <div className="max-w-6xl mx-auto px-6 md:px-10 lg:px-12 pt-28 md:pt-32 pb-10 md:pb-14">
                <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8 lg:gap-12">

                    {/* ════════════════════════════════════════════
                        LEFT COLUMN — Cover + Host Info
                        ════════════════════════════════════════════ */}
                    <div className="space-y-6">
                        {/* Cover image */}
                        <div className="relative rounded-2xl overflow-hidden bg-brutal-dark/[0.04] aspect-square">
                            {event.cover_image_url ? (
                                <img
                                    src={event.cover_image_url}
                                    alt={event.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center bg-brutal-dark"
                                    style={{
                                        backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.05) 1px, transparent 1px)',
                                        backgroundSize: '24px 24px',
                                    }}
                                />
                            )}
                            {/* Inline cover editor overlay for mentors */}
                            <InlineCoverImage eventId={id} currentUrl={event.cover_image_url ?? null} canEdit={canEdit} />
                        </div>

                        {/* Presenter / calendar info */}
                        <div className="space-y-5">
                            {/* Hosted By — Luma-style with avatars */}
                            <div>
                                <p className="font-data text-[9px] font-bold uppercase tracking-[0.14em] text-brutal-dark/40 mb-2.5">
                                    Presented by
                                </p>
                                <HostedBySection hosts={hosts} variant="light" />
                            </div>

                            {/* Contact / report links */}
                            <div className="flex items-center gap-4 pt-2 border-t border-brutal-dark/[0.06]">
                                <button
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator.share({ title: event.title, url: window.location.href });
                                        } else {
                                            navigator.clipboard.writeText(window.location.href);
                                        }
                                    }}
                                    className="inline-flex items-center gap-1.5 font-data text-[10px] font-bold uppercase tracking-wider text-brutal-dark/40 hover:text-brutal-red transition-colors"
                                >
                                    <Share2 size={12} /> Share
                                </button>
                            </div>
                        </div>

                        {/* Mentor controls (renders nothing for public visitors) */}
                        <MentorControlsPanel eventId={id} user={user} />
                    </div>

                    {/* ════════════════════════════════════════════
                        RIGHT COLUMN — Event Info + Registration
                        ════════════════════════════════════════════ */}
                    <div className="space-y-8">
                        {/* Type badge */}
                        <div className="ed-hero-text flex items-center gap-2 flex-wrap">
                            <span className="bg-brutal-red text-brutal-bg px-2.5 py-0.5 font-data text-[10px] font-bold rounded-full uppercase tracking-[0.12em]">
                                {formatEventType(event.event_type)}
                            </span>
                        </div>

                        {/* Title (inline-editable) */}
                        <h1 className="ed-hero-text font-heading font-bold text-3xl sm:text-4xl md:text-[42px] leading-[1.05] text-brutal-dark max-w-2xl">
                            <InlineText
                                eventId={id}
                                column="title"
                                initialValue={event.title}
                                canEdit={canEdit}
                                placeholder="Event title"
                                render={(v) => <>{v}</>}
                            />
                        </h1>

                        {/* Tagline (inline-editable) */}
                        <p className="ed-hero-text font-body text-base text-brutal-dark/60 max-w-xl -mt-3">
                            <InlineText
                                eventId={id}
                                column="tagline"
                                initialValue={event.tagline ?? null}
                                canEdit={canEdit}
                                placeholder="Add a one-line tagline…"
                                render={(v) => v ? <>{v}</> : (canEdit ? <span className="italic opacity-60">Add a tagline</span> : null)}
                            />
                        </p>

                        {/* ── Date + Location rows (Luma-style) ── */}
                        <div className="space-y-3">
                            {/* Date row with calendar block */}
                            <div className="flex items-center gap-4">
                                <CalendarDateBlock date={date} />
                                <div>
                                    <p className="font-body text-[15px] font-semibold text-brutal-dark">
                                        <InlineDateRange
                                            eventId={id}
                                            initialStart={event.date}
                                            initialEnd={event.end_date ?? null}
                                            canEdit={canEdit}
                                            render={(start) => (
                                                <>{start ? new Date(start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'TBD'}</>
                                            )}
                                        />
                                    </p>
                                    <p className="font-body text-sm text-brutal-dark/50 mt-0.5">
                                        {startTime}{endTime ? ` – ${endTime}` : ''}
                                    </p>
                                </div>
                            </div>

                            {/* Location row */}
                            {event.location && !event.location.startsWith('rsvp:') && (
                                <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-brutal-dark/[0.04] border border-brutal-dark/10 flex items-center justify-center">
                                        <MapPin size={20} className="text-brutal-dark/30" />
                                    </div>
                                    <div>
                                        <p className="font-body text-[15px] font-semibold text-brutal-dark">
                                            <InlineText
                                                eventId={id}
                                                column="location"
                                                initialValue={event.location ?? null}
                                                canEdit={canEdit}
                                                placeholder="Location"
                                                inputClassName="min-w-[200px]"
                                                render={(v) => v ? <>{v}</> : (canEdit ? <span className="italic opacity-60">Add location</span> : <span>TBD</span>)}
                                            />
                                        </p>
                                        <p className="font-body text-sm text-brutal-dark/40 mt-0.5">In-person</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Registration card ── */}
                        <div className="ed-section">
                            <ActionSidebar event={event} registrationProps={registrationProps} />
                        </div>

                        {/* ── About Section ── */}
                        <div className="ed-section">
                            <EventWebsiteBanner eventId={id!} fallback={
                                <section>
                                    <SectionAnchor id="about-anchor" title="About this Event" />
                                    <InlineBlocks
                                        eventId={id}
                                        initialBlocks={event.description_blocks ?? null}
                                        canEdit={canEdit}
                                        readView={
                                            (event.description_blocks && event.description_blocks.length > 0) ? (
                                                <BlocksPreview blocks={event.description_blocks} />
                                            ) : aboutText ? (
                                                <div className="font-body text-[15px] leading-[1.7] text-brutal-dark/75 whitespace-pre-wrap">
                                                    {aboutText}
                                                </div>
                                            ) : canEdit ? (
                                                <div className="font-body text-sm text-brutal-dark/35 italic">
                                                    No description yet — click Edit to add one.
                                                </div>
                                            ) : null
                                        }
                                    />
                                </section>
                            } />
                        </div>

                        {/* ── Category-specific pre-event content ── */}
                        {event.event_type === 'maker_meetup' && (
                            <div className="ed-section">
                                <MakerMeetupPreEvent id={id} event={event} user={user} isRegistered={registrationProps.isRegistered} />
                            </div>
                        )}
                        {event.event_type === 'build_challenge' && (
                            <div className="ed-section">
                                <BuildChallengePreEvent id={id} event={event} user={user} isRegistered={registrationProps.isRegistered} />
                            </div>
                        )}
                        {event.event_type === 'tech_tuesday' && (
                            <div className="ed-section">
                                <TechTuesdayPreEvent id={id} event={event} user={user} />
                            </div>
                        )}

                        {/* Pitch CTA */}
                        <div className="ed-section">
                            <PitchCTA defaultEventType={event.event_type} />
                        </div>

                        {/* Discussion */}
                        <div className="ed-section">
                            <DiscussionSection {...commentsProps} sectionId="discussion" />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

// Minimal read-only block renderer for the About surface. Kept local
// rather than importing EventBody to avoid pulling in its header / CTA
// chrome, which isn't wanted here.
const BlocksPreview: React.FC<{ blocks: any[] }> = ({ blocks }) => (
    <div className="space-y-4 font-body text-[15px] leading-[1.7] text-brutal-dark/80">
        {blocks.map((b, i) => {
            switch (b.type) {
                case 'heading':
                    return b.level === 2 ? (
                        <h3 key={i} className="font-heading text-xl font-bold tracking-tight text-brutal-dark mt-2">{b.text}</h3>
                    ) : (
                        <h4 key={i} className="font-heading text-base font-bold tracking-tight text-brutal-dark mt-1">{b.text}</h4>
                    );
                case 'paragraph':
                    return <p key={i} className="whitespace-pre-wrap">{b.text}</p>;
                case 'image':
                    return (
                        <figure key={i} className="space-y-1.5">
                            <img src={b.url} alt={b.alt} className="w-full rounded-xl border border-brutal-dark/[0.06]" loading="lazy" />
                            {b.caption && <figcaption className="text-xs text-brutal-dark/45">{b.caption}</figcaption>}
                        </figure>
                    );
                case 'list':
                    return b.ordered ? (
                        <ol key={i} className="list-decimal pl-5 space-y-1.5">
                            {b.items.map((it: string, j: number) => <li key={j}>{it}</li>)}
                        </ol>
                    ) : (
                        <ul key={i} className="list-disc pl-5 space-y-1.5">
                            {b.items.map((it: string, j: number) => <li key={j}>{it}</li>)}
                        </ul>
                    );
                case 'callout': {
                    const tone = b.variant === 'warning' ? 'bg-yellow-50/80 border-yellow-400/30'
                        : b.variant === 'success' ? 'bg-green-50/80 border-green-400/30'
                        : 'bg-blue-50/80 border-blue-400/30';
                    return (
                        <div key={i} className={`p-4 border rounded-xl ${tone}`}>
                            <p className="whitespace-pre-wrap">{b.text}</p>
                        </div>
                    );
                }
                default:
                    return null;
            }
        })}
    </div>
);

export default PreEventPage;
