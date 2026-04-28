import React from 'react';
import { Calendar, MapPin } from 'lucide-react';
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
// PreEventPage — simplified flow + P13 inline editing.
//
// Mentors/admins see click-to-edit affordances on:
//   · Cover image (hero overlay)
//   · Title + tagline (hero)
//   · Date range (hero meta)
//   · Location (hero meta)
//   · Description blocks (fallback About section)
// Everyone else sees plain read-mode.
// ─────────────────────────────────────────────────────────────

const PreEventPage = ({ event, hosts, id, user, registrationProps, commentsProps }: any) => {
    const { role } = useAuth();
    const canEdit = role === 'mentor' || role === 'admin';

    // Category-specific accent
    const accents: Record<string, string> = {
        build_challenge: 'from-brutal-red/20 via-brutal-dark/90 to-brutal-dark',
        maker_meetup: 'from-brutal-dark/20 via-brutal-dark/80 to-brutal-dark',
        tech_tuesday: 'from-brutal-dark/10 via-brutal-dark/70 to-brutal-dark',
    };

    // Split description into About (strip recap suffix if present)
    const [aboutText] = event.description?.includes('---RECAP---')
        ? event.description.split('---RECAP---')
        : [event.description, null];

    return (
        <>
            {/* ── HERO ── */}
            <section className="relative min-h-[55vh] md:min-h-[60vh] flex items-end">
                {/* Background */}
                {event.cover_image_url ? (
                    <img src={event.cover_image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                    <div className="absolute inset-0 bg-brutal-dark" style={{
                        backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.04) 1px, transparent 1px)',
                        backgroundSize: '30px 30px',
                    }} />
                )}
                <div className={`absolute inset-0 bg-gradient-to-t ${accents[event.event_type] || accents.maker_meetup}`} />

                {/* Cover-image editor (mentor/admin only) */}
                <InlineCoverImage eventId={id} currentUrl={event.cover_image_url ?? null} canEdit={canEdit} />

                {/* Hero content */}
                <div className="relative z-10 w-full px-6 md:px-12 lg:px-24 pb-8 md:pb-10 pt-32 md:pt-36 max-w-7xl mx-auto">
                    <div className="flex flex-col gap-3 md:gap-4">
                        {/* Type badge */}
                        <div className="ed-hero-text flex items-center gap-2 flex-wrap">
                            <span className="bg-brutal-red text-brutal-bg px-2.5 py-0.5 font-data text-[10px] font-bold rounded-full uppercase tracking-wider">
                                {formatEventType(event.event_type)}
                            </span>
                        </div>

                        {/* Title (inline-editable) */}
                        <h1 className="ed-hero-text font-heading font-bold text-3xl sm:text-5xl md:text-6xl uppercase tracking-tight-heading leading-[0.92] text-brutal-bg max-w-4xl">
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
                        <p className="ed-hero-text font-data text-sm md:text-base text-brutal-bg/70 max-w-xl">
                            <InlineText
                                eventId={id}
                                column="tagline"
                                initialValue={event.tagline ?? null}
                                canEdit={canEdit}
                                placeholder="Add a one-line tagline…"
                                render={(v) => v ? <>{v}</> : (canEdit ? <span className="italic opacity-60">Add a tagline</span> : null)}
                            />
                        </p>

                        {/* Date + location row */}
                        <div className="ed-hero-text flex flex-wrap gap-3 items-center">
                            <span className="inline-flex items-center gap-2 bg-brutal-dark/30 backdrop-blur-sm text-brutal-bg/90 px-3 py-1.5 rounded-full font-data text-xs">
                                <Calendar className="w-3 h-3" />
                                <InlineDateRange
                                    eventId={id}
                                    initialStart={event.date}
                                    initialEnd={event.end_date ?? null}
                                    canEdit={canEdit}
                                    render={(start, end) => (
                                        <>
                                            {start
                                                ? new Date(start).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                : 'TBD'}
                                            {end && ` → ${new Date(end).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                                        </>
                                    )}
                                />
                            </span>
                            <span className="inline-flex items-center gap-2 bg-brutal-dark/30 backdrop-blur-sm text-brutal-bg/90 px-3 py-1.5 rounded-full font-data text-xs">
                                <MapPin className="w-3 h-3" />
                                <InlineText
                                    eventId={id}
                                    column="location"
                                    initialValue={event.location ?? null}
                                    canEdit={canEdit}
                                    placeholder="Location"
                                    inputClassName="min-w-[200px]"
                                    render={(v) => v ? <>{v}</> : (canEdit ? <span className="italic opacity-60">Add location</span> : <span>TBD</span>)}
                                />
                            </span>
                        </div>

                        {/* Hosted by */}
                        <div className="ed-hero-text">
                            <HostedBySection hosts={hosts} variant="dark" />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── BODY ── */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-10 md:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 md:gap-10">
                    {/* Main content column */}
                    <div className="min-w-0 space-y-10 md:space-y-12">
                        {/*
                          Mentor Workspace first — so mentors/admins land directly on their
                          controls without scrolling past public content. For everyone else
                          this renders nothing (early-return inside the component).
                        */}
                        <MentorControlsPanel eventId={id} user={user} />

                        {/*
                          About / description blocks — click-to-edit for mentors/admins.
                          Falls back to the legacy plain-text `aboutText` when the row has
                          no description_blocks (older rows). EventWebsiteBanner stays as
                          the mentor-uploaded page override and is rendered alongside.
                        */}
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
                                            <div className="font-data text-sm md:text-base leading-relaxed text-brutal-dark/80 whitespace-pre-wrap">
                                                {aboutText}
                                            </div>
                                        ) : canEdit ? (
                                            <div className="font-data text-sm text-brutal-dark/40 italic">
                                                No description yet — click Edit to add one.
                                            </div>
                                        ) : null
                                    }
                                />
                            </section>
                        } />

                        {/* Category-specific pre-event content */}
                        {event.event_type === 'maker_meetup' && (
                            <MakerMeetupPreEvent id={id} event={event} user={user} isRegistered={registrationProps.isRegistered} />
                        )}
                        {event.event_type === 'build_challenge' && (
                            <BuildChallengePreEvent id={id} event={event} user={user} isRegistered={registrationProps.isRegistered} />
                        )}
                        {event.event_type === 'tech_tuesday' && (
                            <TechTuesdayPreEvent id={id} event={event} user={user} />
                        )}

                        {/* P11 — "Pitch yourself as a speaker" CTA on every event page. */}
                        <PitchCTA defaultEventType={event.event_type} />

                        {/* Discussion */}
                        <DiscussionSection {...commentsProps} sectionId="discussion" />
                    </div>

                    {/* Action sidebar — unified single card (desktop sticky, mobile inline top) */}
                    <aside className="lg:order-last order-first">
                        <ActionSidebar event={event} registrationProps={registrationProps} />
                    </aside>
                </div>
            </div>
        </>
    );
};

// Minimal read-only block renderer for the About surface. Kept local
// rather than importing EventBody to avoid pulling in its header / CTA
// chrome, which isn't wanted here.
const BlocksPreview: React.FC<{ blocks: any[] }> = ({ blocks }) => (
    <div className="space-y-4 font-data text-sm md:text-base leading-relaxed text-brutal-dark/85">
        {blocks.map((b, i) => {
            switch (b.type) {
                case 'heading':
                    return b.level === 2 ? (
                        <h3 key={i} className="font-heading text-xl font-bold uppercase tracking-tight">{b.text}</h3>
                    ) : (
                        <h4 key={i} className="font-heading text-base font-bold uppercase tracking-tight">{b.text}</h4>
                    );
                case 'paragraph':
                    return <p key={i} className="whitespace-pre-wrap">{b.text}</p>;
                case 'image':
                    return (
                        <figure key={i} className="space-y-1">
                            <img src={b.url} alt={b.alt} className="w-full rounded-lg border-2 border-brutal-dark/10" loading="lazy" />
                            {b.caption && <figcaption className="text-xs text-brutal-dark/50">{b.caption}</figcaption>}
                        </figure>
                    );
                case 'list':
                    return b.ordered ? (
                        <ol key={i} className="list-decimal pl-5 space-y-1">
                            {b.items.map((it: string, j: number) => <li key={j}>{it}</li>)}
                        </ol>
                    ) : (
                        <ul key={i} className="list-disc pl-5 space-y-1">
                            {b.items.map((it: string, j: number) => <li key={j}>{it}</li>)}
                        </ul>
                    );
                case 'callout': {
                    const tone = b.variant === 'warning' ? 'bg-yellow-50 border-yellow-400/40'
                        : b.variant === 'success' ? 'bg-green-50 border-green-400/40'
                        : 'bg-blue-50 border-blue-400/40';
                    return (
                        <div key={i} className={`p-4 border-2 rounded-lg ${tone}`}>
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
