import React from 'react';
import { Calendar, Users, Star, Trophy, Image as ImageIcon, BookOpen, Award, Sparkles, Mic2, MapPin } from 'lucide-react';
import { formatEventType } from '../Events';
import HostedBySection from './HostedBySection';
import GalleryGrid from './GalleryGrid';
import MentorControlsPanel from './MentorControlsPanel';
import { DiscussionSection } from './DiscussionSection';
import { SectionAnchor } from './SectionAnchor';
import { BuildChallengePostHighlights, MakerMeetupPostHighlights, TechTuesdayPostHighlights } from './EventPostHighlights';
import { PostEventProjectBridge } from '../../components/event/PostEventProjectBridge';
import { BuildChallengeSection } from '../../components/events/build-challenge/BuildChallengeSection';
import { MakerMeetupSection } from '../../components/events/maker-meetup/MakerMeetupSection';
import { PitchCTA } from '../../components/speakers/PitchCTA';
import { NextEventCard } from '../../components/events/recap/NextEventCard';
import { MakerMeetupAttendeeCount } from '../../components/events/recap/MakerMeetupAttendeeCount';
import { TechTuesdaySpeakerBlock } from '../../components/events/recap/TechTuesdaySpeakerBlock';
import { useAuth } from '../../lib/auth';
import { InlineText } from '../../components/events/inline/InlineText';
import { InlineDateRange } from '../../components/events/inline/InlineDateRange';
import { InlineCoverImage } from '../../components/events/inline/InlineCoverImage';

// ─────────────────────────────────────────────────────────────
// PostEventPage — auto-generated recap (P12).
//
// Renders whatever the admin captured in the Recap tab plus
// type-specific blocks:
//
//   Hero           cover + title + tagline + date + participant count
//   Mentor panel   (only for mentor/admin viewers)
//   Type header    BC: Winners · MM: Attendee count · TT: Speaker card
//   What happened  results_summary
//   Category       BuildChallengeSection / MakerMeetupSection (status-aware)
//   Gallery        gallery_urls via GalleryGrid + Lightbox
//   Highlights     type-specific showcase/winner cards (pre-P8 data)
//   Project bridge "Did you build something?" call-to-action
//   What we learned learnings
//   About          description fallback
//   Pitch CTA      "Pitch your own talk"
//   Next <type>    auto-selected upcoming event of same type
//   Discussion     comments
//
// Saving IS publishing — any surface that has content appears on
// the public page. Missing surfaces silently hide.
// ─────────────────────────────────────────────────────────────

const PostEventPage = ({ event, hosts, id, user, registrationProps: _registrationProps, commentsProps }: any) => {
    const { role } = useAuth();
    const canEdit = role === 'mentor' || role === 'admin';

    // Legacy description used to carry an inline "---RECAP---" split;
    // keep reading it so rows written before the Recap tab existed
    // still render, but prefer results_summary when both are set.
    const [aboutText, legacyRecap] = event.description?.includes('---RECAP---')
        ? event.description.split('---RECAP---')
        : [event.description, null];

    let sectionNum = 1;
    const nextNum = () => String(sectionNum++).padStart(2, '0');

    return (
        <>
            {/* ── HERO: Muted post-event ── */}
            <section className="relative min-h-[38vh] md:min-h-[42vh] flex items-end">
                {event.cover_image_url ? (
                    <img src={event.cover_image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover grayscale-[30%] opacity-70" />
                ) : (
                    <div className="absolute inset-0 bg-brutal-dark" style={{
                        backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.04) 1px, transparent 1px)',
                        backgroundSize: '30px 30px',
                    }} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brutal-bg via-brutal-bg/90 to-brutal-dark/60" />

                {/* Cover-image editor (mentor/admin only) */}
                <InlineCoverImage eventId={id} currentUrl={event.cover_image_url ?? null} canEdit={canEdit} />

                <div className="relative z-10 w-full px-6 md:px-12 lg:px-24 pb-8 md:pb-10 pt-32 md:pt-36 max-w-7xl mx-auto">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="bg-brutal-dark/70 text-brutal-bg px-2.5 py-0.5 font-data text-[10px] font-bold rounded-full uppercase tracking-wider backdrop-blur-sm">
                            {formatEventType(event.event_type)}
                        </span>
                        <span className="bg-brutal-dark text-brutal-bg px-2.5 py-0.5 font-data text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5">
                            <Star className="w-3 h-3" /> Concluded
                        </span>
                    </div>

                    <h1 className="ed-hero-text font-heading font-bold text-3xl sm:text-4xl md:text-5xl uppercase tracking-tight-heading leading-[0.92] mb-2 max-w-4xl">
                        <InlineText
                            eventId={id}
                            column="title"
                            initialValue={event.title}
                            canEdit={canEdit}
                            placeholder="Event title"
                            render={(v) => <>{v}</>}
                        />
                    </h1>

                    <p className="ed-hero-text font-data text-sm text-brutal-dark/50 mb-4 max-w-xl">
                        <InlineText
                            eventId={id}
                            column="tagline"
                            initialValue={event.tagline ?? null}
                            canEdit={canEdit}
                            placeholder="Add a one-line tagline…"
                            render={(v) => v ? <>{v}</> : (canEdit ? <span className="italic opacity-60">Add a tagline</span> : null)}
                        />
                    </p>

                    <div className="ed-hero-text flex flex-wrap gap-3 font-data text-xs font-bold text-brutal-dark/60 items-center">
                        <span className="inline-flex items-center gap-2 bg-brutal-dark/10 px-3 py-1.5 rounded-full">
                            <Calendar className="w-3 h-3" />
                            <InlineDateRange
                                eventId={id}
                                initialStart={event.date}
                                initialEnd={event.end_date ?? null}
                                canEdit={canEdit}
                                render={(start) => (
                                    <>
                                        {start
                                            ? new Date(start).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                                            : 'TBD'}
                                    </>
                                )}
                            />
                        </span>
                        <span className="inline-flex items-center gap-2 bg-brutal-dark/10 px-3 py-1.5 rounded-full">
                            <MapPin className="w-3 h-3" />
                            <InlineText
                                eventId={id}
                                column="location"
                                initialValue={event.location ?? null}
                                canEdit={canEdit}
                                placeholder="Location"
                                render={(v) => v ? <>{v}</> : (canEdit ? <span className="italic opacity-60">Add location</span> : <span>TBD</span>)}
                            />
                        </span>
                        {event.event_type !== 'maker_meetup' && (
                            <div className="flex items-center gap-2 bg-brutal-dark/10 px-3 py-1.5 rounded-full">
                                <Users className="w-3 h-3" />
                                {event.registration_count} participated
                            </div>
                        )}
                    </div>

                    <div className="ed-hero-text mt-4">
                        <HostedBySection hosts={hosts} />
                    </div>
                </div>
            </section>

            {/* ── BODY: Single-column recap ── */}
            <div className="max-w-4xl mx-auto px-6 md:px-12 lg:px-24 py-10 md:py-12">
                <div className="space-y-10 md:space-y-14">

                    {/* Mentor Workspace first — so mentors can edit the recap without scrolling */}
                    <MentorControlsPanel eventId={id} user={user} />

                    {/* Type-specific header blocks (above "What happened") */}
                    {event.event_type === 'tech_tuesday' && (event.speaker_name || event.topic_summary) && (
                        <section id="speaker" className="ed-section">
                            <SectionAnchor id="speaker-anchor" number={nextNum()} title="Speaker" icon={<Mic2 className="w-5 h-5 text-brutal-red" />} />
                            <TechTuesdaySpeakerBlock event={event} />
                        </section>
                    )}

                    {event.event_type === 'maker_meetup' && (
                        <section id="mm-attendees" className="ed-section">
                            <SectionAnchor id="mm-attendees-anchor" number={nextNum()} title="Who came" icon={<Users className="w-5 h-5 text-brutal-red" />} />
                            <MakerMeetupAttendeeCount eventId={id} />
                        </section>
                    )}

                    {/* What happened — primary recap narrative */}
                    {(event.results_summary || legacyRecap) && (
                        <section id="what-happened" className="ed-section">
                            <SectionAnchor id="what-happened-anchor" number={nextNum()} title="What happened" icon={<Sparkles className="w-5 h-5 text-brutal-red" />} />
                            <div className="p-6 bg-brutal-dark text-brutal-bg rounded-2xl shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brutal-red/20 rounded-bl-full pointer-events-none" />
                                <p className="font-data text-sm md:text-base text-brutal-bg/90 whitespace-pre-wrap leading-relaxed relative z-10">
                                    {(event.results_summary ?? legacyRecap ?? '').trim()}
                                </p>
                            </div>
                        </section>
                    )}

                    {/* Build Challenge: winners + submissions gallery. BuildChallengeSection
                        phase-routes based on winners_published_at / submission_deadline. */}
                    {event.event_type === 'build_challenge' && (
                        <section id="bc-results" className="ed-section">
                            <SectionAnchor id="bc-results-anchor" number={nextNum()} title="Results" icon={<Trophy className="w-5 h-5 text-brutal-red" />} />
                            <BuildChallengeSection event={event} />
                        </section>
                    )}

                    {/* Maker Meetup: viewer-status card (selected → confirmation etc.). */}
                    {event.event_type === 'maker_meetup' && (
                        <section id="mm-results" className="ed-section">
                            <MakerMeetupSection event={event} />
                        </section>
                    )}

                    {/* Prizes (Build Challenge) — legacy prize_info field. */}
                    {event.event_type === 'build_challenge' && event.prizes_info && (
                        <section id="prizes" className="ed-section">
                            <SectionAnchor id="prizes-anchor" number={nextNum()} title="Prizes & Recognition" icon={<Award className="w-5 h-5 text-brutal-red" />} />
                            <div className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-2 border-yellow-400/30 rounded-2xl">
                                <p className="font-data text-sm text-brutal-dark/80 whitespace-pre-wrap leading-relaxed">{event.prizes_info}</p>
                            </div>
                        </section>
                    )}

                    {/* Type-specific highlights (pre-P8 showcase_slot / submission data).
                        HighlightsSection itself hides if the category has nothing to show. */}
                    <HighlightsSection
                        eventType={event.event_type}
                        id={id}
                        getNumber={nextNum}
                    />

                    {/* Gallery */}
                    {event.gallery_urls && event.gallery_urls.length > 0 && (
                        <section id="gallery" className="ed-section">
                            <SectionAnchor id="gallery-anchor" number={nextNum()} title="Gallery" icon={<ImageIcon className="w-5 h-5 text-brutal-red" />} />
                            <GalleryGrid urls={event.gallery_urls} />
                        </section>
                    )}

                    {/* "Did you build something?" — Maker Flywheel bridge */}
                    <PostEventProjectBridge eventId={id} eventTitle={event.title} />

                    {/* What we learned */}
                    {event.learnings && (
                        <section id="learnings" className="ed-section">
                            <SectionAnchor id="learnings-anchor" number={nextNum()} title="What we learned" icon={<BookOpen className="w-5 h-5 text-brutal-red" />} />
                            <div className="p-6 bg-gradient-to-br from-brutal-dark/5 to-brutal-dark/10 rounded-2xl border border-brutal-dark/10">
                                <p className="font-data text-sm text-brutal-dark/80 whitespace-pre-wrap leading-relaxed">{event.learnings}</p>
                            </div>
                        </section>
                    )}

                    {/* About — legacy description fallback */}
                    {aboutText && (
                        <section id="about-post" className="ed-section">
                            <SectionAnchor id="about-post-anchor" number={nextNum()} title="About this Event" />
                            <div className="max-w-3xl">
                                <p className="font-data text-sm text-brutal-dark/70 whitespace-pre-wrap leading-relaxed">{aboutText.trim()}</p>
                            </div>
                        </section>
                    )}

                    {/* P11 — Pitch CTA (collapsed by default) for folks inspired by
                        the recap to propose something of their own. */}
                    <PitchCTA defaultEventType={event.event_type} />

                    {/* P12 — Next event of same type. Renders only if one exists. */}
                    <NextEventCard eventType={event.event_type} excludeId={id} />

                    {/* Discussion */}
                    <DiscussionSection {...commentsProps} sectionId="discussion-post" sectionNum={nextNum()} />
                </div>
            </div>
        </>
    );
};

// Small helper to render the appropriate category-specific highlights block with
// a shared section header. Using a dedicated component keeps PostEventPage lean.
const HighlightsSection: React.FC<{ eventType: string; id: string; getNumber: () => string }> = ({ eventType, id, getNumber }) => {
    const number = getNumber();
    return (
        <section id="highlights" className="ed-section">
            <SectionAnchor id="highlights-anchor" number={number} title="Highlights" />
            {eventType === 'build_challenge' && <BuildChallengePostHighlights id={id} />}
            {eventType === 'maker_meetup' && <MakerMeetupPostHighlights id={id} />}
            {eventType === 'tech_tuesday' && <TechTuesdayPostHighlights id={id} />}
        </section>
    );
};

export default PostEventPage;
