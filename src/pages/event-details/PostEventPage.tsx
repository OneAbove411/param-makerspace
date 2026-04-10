import React from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Calendar, Users, Star, Trophy, Image as ImageIcon, BookOpen, Award } from 'lucide-react';
import { formatEventType } from '../Events';
import HostedBySection from './HostedBySection';
import GalleryGrid from './GalleryGrid';
import MentorControlsPanel from './MentorControlsPanel';
import { DiscussionSection } from './DiscussionSection';
import { SectionAnchor } from './SectionAnchor';
import { RecapToC } from './RecapToC';
import { BuildChallengePostHighlights, MakerMeetupPostHighlights, TechTuesdayPostHighlights } from './EventPostHighlights';

const PostEventPage = ({ event, hosts, id, user, registrationProps, commentsProps }: any) => {
    const [aboutText, recapText] = event.description?.includes('---RECAP---')
        ? event.description.split('---RECAP---')
        : [event.description, null];

    const date = new Date(event.date);

    // Build ToC sections dynamically
    const tocSections: { id: string; label: string }[] = [];
    if (recapText) tocSections.push({ id: 'recap', label: 'Event Recap' });
    if (event.results_summary) tocSections.push({ id: 'results', label: 'Results' });
    if (event.event_type === 'build_challenge' && event.prizes_info) tocSections.push({ id: 'prizes', label: 'Prizes' });
    tocSections.push({ id: 'highlights', label: 'Highlights' });
    if (event.gallery_urls?.length) tocSections.push({ id: 'gallery', label: 'Gallery' });
    if (event.learnings) tocSections.push({ id: 'learnings', label: 'Key Learnings' });
    if (aboutText) tocSections.push({ id: 'about-post', label: 'About' });
    tocSections.push({ id: 'discussion-post', label: 'Discussion' });

    let sectionNum = 1;

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

                <Link
                    to="/events"
                    className="absolute top-24 md:top-26 left-6 md:left-12 lg:left-24 z-20 inline-flex items-center gap-2 font-data text-[10px] font-bold uppercase text-brutal-bg/70 hover:text-brutal-bg transition-colors bg-brutal-bg/10 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-brutal-bg/10"
                >
                    <ArrowLeft className="w-3 h-3" /> Back
                </Link>

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
                        {event.title}
                    </h1>

                    {event.tagline && (
                        <p className="ed-hero-text font-data text-sm text-brutal-dark/50 mb-4 max-w-xl">{event.tagline}</p>
                    )}

                    <div className="ed-hero-text flex flex-wrap gap-3 font-data text-xs font-bold text-brutal-dark/60">
                        <div className="flex items-center gap-2 bg-brutal-dark/10 px-3 py-1.5 rounded-full">
                            <Calendar className="w-3 h-3" />
                            {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-2 bg-brutal-dark/10 px-3 py-1.5 rounded-full">
                            <Users className="w-3 h-3" />
                            {event.registration_count} participated
                        </div>
                    </div>

                    <div className="ed-hero-text mt-4">
                        <HostedBySection hosts={hosts} />
                    </div>
                </div>
            </section>

            {/* ── BODY: Sidebar + Content — tightened ── */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-10 md:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-10 md:gap-14">
                    {/* Main content */}
                    <div className="space-y-10 md:space-y-14">
                        {/* Recap */}
                        {recapText && (
                            <section id="recap" className="ed-section">
                                <SectionAnchor id="recap-anchor" number={String(sectionNum++).padStart(2, '0')} title="Event Recap" icon={<Star className="w-5 h-5 text-brutal-red" />} />
                                <div className="p-6 bg-brutal-dark text-brutal-bg rounded-2xl shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-brutal-red/20 rounded-bl-full pointer-events-none" />
                                    <p className="font-data text-sm md:text-base text-brutal-bg/90 whitespace-pre-wrap leading-relaxed relative z-10">{recapText.trim()}</p>
                                </div>
                            </section>
                        )}

                        {/* Results */}
                        {event.results_summary && (
                            <section id="results" className="ed-section">
                                <SectionAnchor id="results-anchor" number={String(sectionNum++).padStart(2, '0')} title="Results" icon={<Trophy className="w-5 h-5 text-brutal-red" />} />
                                <div className="p-6 bg-brutal-dark text-brutal-bg rounded-2xl shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-brutal-red/20 rounded-bl-full pointer-events-none" />
                                    <p className="font-data text-sm text-brutal-bg/90 whitespace-pre-wrap leading-relaxed relative z-10">{event.results_summary}</p>
                                </div>
                            </section>
                        )}

                        {/* Prizes (Build Challenge) */}
                        {event.event_type === 'build_challenge' && event.prizes_info && (
                            <section id="prizes" className="ed-section">
                                <SectionAnchor id="prizes-anchor" number={String(sectionNum++).padStart(2, '0')} title="Prizes & Recognition" icon={<Award className="w-5 h-5 text-brutal-red" />} />
                                <div className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-2 border-yellow-400/30 rounded-2xl">
                                    <p className="font-data text-sm text-brutal-dark/80 whitespace-pre-wrap leading-relaxed">{event.prizes_info}</p>
                                </div>
                            </section>
                        )}

                        {/* Category-specific post-event highlights */}
                        <section id="highlights" className="ed-section">
                            <SectionAnchor id="highlights-anchor" number={String(sectionNum++).padStart(2, '0')} title="Highlights" />
                            {event.event_type === 'build_challenge' && (
                                <BuildChallengePostHighlights id={id} />
                            )}
                            {event.event_type === 'maker_meetup' && (
                                <MakerMeetupPostHighlights id={id} />
                            )}
                            {event.event_type === 'tech_tuesday' && (
                                <TechTuesdayPostHighlights id={id} />
                            )}
                        </section>

                        {/* Gallery */}
                        {event.gallery_urls && event.gallery_urls.length > 0 && (
                            <section id="gallery" className="ed-section">
                                <SectionAnchor id="gallery-anchor" number={String(sectionNum++).padStart(2, '0')} title="Gallery" icon={<ImageIcon className="w-5 h-5 text-brutal-red" />} />
                                <GalleryGrid urls={event.gallery_urls} />
                            </section>
                        )}

                        {/* Learnings */}
                        {event.learnings && (
                            <section id="learnings" className="ed-section">
                                <SectionAnchor id="learnings-anchor" number={String(sectionNum++).padStart(2, '0')} title="Key Learnings" icon={<BookOpen className="w-5 h-5 text-brutal-red" />} />
                                <div className="p-6 bg-gradient-to-br from-brutal-dark/5 to-brutal-dark/10 rounded-2xl border border-brutal-dark/10">
                                    <p className="font-data text-sm text-brutal-dark/80 whitespace-pre-wrap leading-relaxed">{event.learnings}</p>
                                </div>
                            </section>
                        )}

                        {/* About */}
                        {aboutText && (
                            <section id="about-post" className="ed-section">
                                <SectionAnchor id="about-post-anchor" number={String(sectionNum++).padStart(2, '0')} title="About this Event" />
                                <div className="max-w-3xl">
                                    <p className="font-data text-sm text-brutal-dark/70 whitespace-pre-wrap leading-relaxed">{aboutText.trim()}</p>
                                </div>
                            </section>
                        )}

                        {/* Mentor Controls */}
                        <MentorControlsPanel eventId={id} user={user} />

                        {/* Discussion */}
                        <DiscussionSection {...commentsProps} sectionId="discussion-post" sectionNum={String(sectionNum++).padStart(2, '0')} />
                    </div>

                    {/* Sidebar: ToC (desktop only) */}
                    <aside className="hidden lg:block">
                        <RecapToC sections={tocSections} />
                    </aside>
                </div>
            </div>
        </>
    );
};

export default PostEventPage;
