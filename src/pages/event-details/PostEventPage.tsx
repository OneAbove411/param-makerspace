import React from 'react';
import { Calendar, Users, Star, Trophy, Image as ImageIcon, BookOpen, Award, Sparkles, Mic2, MapPin, Share2 } from 'lucide-react';
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
// PostEventPage — Luma-inspired two-column recap layout.
//
// LEFT column:  Cover image (muted/grayscale) · Hosts · Stats
// RIGHT column: Badges · Title · Date · Recap content · Gallery
//               · Discussion
// ─────────────────────────────────────────────────────────────

const PostEventPage = ({ event, hosts, id, user, registrationProps: _registrationProps, commentsProps }: any) => {
    const { role } = useAuth();
    const canEdit = role === 'mentor' || role === 'admin';
    const date = new Date(event.date);

    // Legacy description split
    const [aboutText, legacyRecap] = event.description?.includes('---RECAP---')
        ? event.description.split('---RECAP---')
        : [event.description, null];

    // Format date
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    let sectionNum = 1;
    const nextNum = () => String(sectionNum++).padStart(2, '0');

    return (
        <>
            {/* ── MAIN TWO-COLUMN LAYOUT ── */}
            <div className="max-w-6xl mx-auto px-6 md:px-10 lg:px-12 pt-28 md:pt-32 pb-10 md:pb-14">
                <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8 lg:gap-12">

                    {/* ════════════════════════════════════════════
                        LEFT COLUMN — Cover + Host Info + Stats
                        ════════════════════════════════════════════ */}
                    <div className="space-y-6">
                        {/* Cover image — muted for concluded events */}
                        <div className="relative rounded-2xl overflow-hidden bg-brutal-dark/[0.04] aspect-square">
                            {event.cover_image_url ? (
                                <img
                                    src={event.cover_image_url}
                                    alt={event.title}
                                    className="w-full h-full object-cover grayscale-[20%] opacity-80"
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
                            <InlineCoverImage eventId={id} currentUrl={event.cover_image_url ?? null} canEdit={canEdit} />
                        </div>

                        {/* Presented by */}
                        <div>
                            <p className="font-data text-[9px] font-bold uppercase tracking-[0.14em] text-brutal-dark/40 mb-2.5">
                                Presented by
                            </p>
                            <HostedBySection hosts={hosts} variant="light" />
                        </div>

                        {/* Stats strip */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-brutal-dark/[0.03] border border-brutal-dark/[0.06] rounded-xl p-4 text-center">
                                <p className="font-heading text-2xl font-bold text-brutal-dark">{event.registration_count || 0}</p>
                                <p className="font-data text-[9px] font-bold uppercase tracking-wider text-brutal-dark/40 mt-0.5">Attended</p>
                            </div>
                            <div className="bg-brutal-dark/[0.03] border border-brutal-dark/[0.06] rounded-xl p-4 text-center">
                                <p className="font-heading text-2xl font-bold text-brutal-dark">
                                    {event.gallery_urls?.length || 0}
                                </p>
                                <p className="font-data text-[9px] font-bold uppercase tracking-wider text-brutal-dark/40 mt-0.5">Photos</p>
                            </div>
                        </div>

                        {/* Share / actions */}
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

                        {/* Mentor controls */}
                        <MentorControlsPanel eventId={id} user={user} />
                    </div>

                    {/* ════════════════════════════════════════════
                        RIGHT COLUMN — Recap Content
                        ════════════════════════════════════════════ */}
                    <div className="space-y-8">
                        {/* Badges */}
                        <div className="ed-hero-text flex items-center gap-2 flex-wrap">
                            <span className="bg-brutal-dark/80 text-brutal-bg px-2.5 py-0.5 font-data text-[10px] font-bold rounded-full uppercase tracking-[0.12em]">
                                {formatEventType(event.event_type)}
                            </span>
                            <span className="bg-brutal-dark text-brutal-bg px-2.5 py-0.5 font-data text-[10px] font-bold rounded-full uppercase tracking-[0.12em] flex items-center gap-1.5">
                                <Star size={10} /> Concluded
                            </span>
                        </div>

                        {/* Title */}
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

                        {/* Tagline */}
                        <p className="ed-hero-text font-body text-base text-brutal-dark/50 max-w-xl -mt-3">
                            <InlineText
                                eventId={id}
                                column="tagline"
                                initialValue={event.tagline ?? null}
                                canEdit={canEdit}
                                placeholder="Add a one-line tagline…"
                                render={(v) => v ? <>{v}</> : (canEdit ? <span className="italic opacity-60">Add a tagline</span> : null)}
                            />
                        </p>

                        {/* Date + Location */}
                        <div className="flex flex-wrap gap-3 font-body text-sm text-brutal-dark/50 items-center">
                            <span className="inline-flex items-center gap-2 bg-brutal-dark/[0.04] px-3 py-1.5 rounded-full">
                                <Calendar className="w-3.5 h-3.5 text-brutal-dark/30" />
                                <InlineDateRange
                                    eventId={id}
                                    initialStart={event.date}
                                    initialEnd={event.end_date ?? null}
                                    canEdit={canEdit}
                                    render={(start) => (
                                        <>{start ? new Date(start).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD'}</>
                                    )}
                                />
                            </span>
                            {event.location && !event.location.startsWith('rsvp:') && (
                                <span className="inline-flex items-center gap-2 bg-brutal-dark/[0.04] px-3 py-1.5 rounded-full">
                                    <MapPin className="w-3.5 h-3.5 text-brutal-dark/30" />
                                    <InlineText
                                        eventId={id}
                                        column="location"
                                        initialValue={event.location ?? null}
                                        canEdit={canEdit}
                                        placeholder="Location"
                                        render={(v) => v ? <>{v}</> : <span>TBD</span>}
                                    />
                                </span>
                            )}
                        </div>

                        {/* ── Recap content sections ── */}

                        {/* Type-specific header blocks */}
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

                        {/* What happened */}
                        {(event.results_summary || legacyRecap) && (
                            <section id="what-happened" className="ed-section">
                                <SectionAnchor id="what-happened-anchor" number={nextNum()} title="What happened" icon={<Sparkles className="w-5 h-5 text-brutal-red" />} />
                                <div className="p-6 bg-brutal-dark text-brutal-bg rounded-2xl shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-brutal-red/15 rounded-bl-full pointer-events-none" />
                                    <p className="font-body text-[15px] text-brutal-bg/85 whitespace-pre-wrap leading-[1.7] relative z-10">
                                        {(event.results_summary ?? legacyRecap ?? '').trim()}
                                    </p>
                                </div>
                            </section>
                        )}

                        {/* Build Challenge results */}
                        {event.event_type === 'build_challenge' && (
                            <section id="bc-results" className="ed-section">
                                <SectionAnchor id="bc-results-anchor" number={nextNum()} title="Results" icon={<Trophy className="w-5 h-5 text-brutal-red" />} />
                                <BuildChallengeSection event={event} />
                            </section>
                        )}

                        {/* Maker Meetup results */}
                        {event.event_type === 'maker_meetup' && (
                            <section id="mm-results" className="ed-section">
                                <MakerMeetupSection event={event} />
                            </section>
                        )}

                        {/* Prizes */}
                        {event.event_type === 'build_challenge' && event.prizes_info && (
                            <section id="prizes" className="ed-section">
                                <SectionAnchor id="prizes-anchor" number={nextNum()} title="Prizes & Recognition" icon={<Award className="w-5 h-5 text-brutal-red" />} />
                                <div className="p-6 bg-gradient-to-br from-yellow-50/80 to-yellow-100/40 border border-yellow-400/20 rounded-2xl">
                                    <p className="font-body text-sm text-brutal-dark/75 whitespace-pre-wrap leading-relaxed">{event.prizes_info}</p>
                                </div>
                            </section>
                        )}

                        {/* Highlights */}
                        <HighlightsSection eventType={event.event_type} id={id} getNumber={nextNum} />

                        {/* Gallery — Luma-style 3-column grid */}
                        {event.gallery_urls && event.gallery_urls.length > 0 && (
                            <section id="gallery" className="ed-section">
                                <SectionAnchor id="gallery-anchor" number={nextNum()} title="Gallery" icon={<ImageIcon className="w-5 h-5 text-brutal-red" />} />
                                <GalleryGrid urls={event.gallery_urls} />
                            </section>
                        )}

                        {/* Project bridge */}
                        <PostEventProjectBridge eventId={id} eventTitle={event.title} />

                        {/* What we learned */}
                        {event.learnings && (
                            <section id="learnings" className="ed-section">
                                <SectionAnchor id="learnings-anchor" number={nextNum()} title="What we learned" icon={<BookOpen className="w-5 h-5 text-brutal-red" />} />
                                <div className="p-6 bg-brutal-dark/[0.03] rounded-2xl border border-brutal-dark/[0.06]">
                                    <p className="font-body text-[15px] text-brutal-dark/70 whitespace-pre-wrap leading-[1.7]">{event.learnings}</p>
                                </div>
                            </section>
                        )}

                        {/* About */}
                        {aboutText && (
                            <section id="about-post" className="ed-section">
                                <SectionAnchor id="about-post-anchor" number={nextNum()} title="About this Event" />
                                <div className="max-w-3xl">
                                    <p className="font-body text-[15px] text-brutal-dark/65 whitespace-pre-wrap leading-[1.7]">{aboutText.trim()}</p>
                                </div>
                            </section>
                        )}

                        {/* Pitch CTA */}
                        <PitchCTA defaultEventType={event.event_type} />

                        {/* Next event */}
                        <NextEventCard eventType={event.event_type} excludeId={id} />

                        {/* Discussion */}
                        <DiscussionSection {...commentsProps} sectionId="discussion-post" sectionNum={nextNum()} />
                    </div>
                </div>
            </div>
        </>
    );
};

// Highlights helper
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
