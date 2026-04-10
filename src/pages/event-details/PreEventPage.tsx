import React from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { formatEventType } from '../Events';
import HostedBySection from './HostedBySection';
import EventWebsiteBanner from './EventWebsiteBanner';
import ActionSidebar from './ActionSidebar';
import MentorControlsPanel from './MentorControlsPanel';
import { MakerMeetupPreEvent, BuildChallengePreEvent, TechTuesdayPreEvent } from './EventTypePages';
import { DiscussionSection } from './DiscussionSection';
import { SectionAnchor } from './SectionAnchor';

const PreEventPage = ({ event, hosts, id, user, registrationProps, commentsProps }: any) => {
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
            {/* ── HERO: Shortened, compact ── */}
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

                {/* Back button */}
                <Link
                    to="/events"
                    className="absolute top-24 md:top-26 left-6 md:left-12 lg:left-24 z-20 inline-flex items-center gap-2 font-data text-[10px] font-bold uppercase text-brutal-bg/70 hover:text-brutal-bg transition-colors bg-brutal-bg/10 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-brutal-bg/10"
                >
                    <ArrowLeft className="w-3 h-3" /> Back
                </Link>

                {/* Hero content — compact */}
                <div className="relative z-10 w-full px-6 md:px-12 lg:px-24 pb-8 md:pb-10 pt-32 md:pt-36 max-w-7xl mx-auto">
                    <div className="flex flex-col gap-3 md:gap-4">
                        {/* Type badge */}
                        <div className="ed-hero-text flex items-center gap-2 flex-wrap">
                            <span className="bg-brutal-red text-brutal-bg px-2.5 py-0.5 font-data text-[10px] font-bold rounded-full uppercase tracking-wider">
                                {formatEventType(event.event_type)}
                            </span>
                            {event.registration_status === 'open' && (
                                <span className="bg-green-500/20 text-green-300 border border-green-400/30 px-2.5 py-0.5 font-data text-[10px] font-bold rounded-full uppercase tracking-wider">
                                    Registration Open
                                </span>
                            )}
                        </div>

                        {/* Title — shrunk */}
                        <h1 className="ed-hero-text font-heading font-bold text-3xl sm:text-5xl md:text-6xl uppercase tracking-tight-heading leading-[0.92] text-brutal-bg max-w-4xl">
                            {event.title}
                        </h1>

                        {/* Tagline */}
                        {event.tagline && (
                            <p className="ed-hero-text font-data text-sm md:text-base text-brutal-bg/60 max-w-xl">{event.tagline}</p>
                        )}

                        {/* Hosted by */}
                        <div className="ed-hero-text">
                            <HostedBySection hosts={hosts} variant="dark" />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── BODY: Two-pane layout — content left, sticky action sidebar right ── */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-10 md:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 md:gap-10">
                    {/* Main content column */}
                    <div className="min-w-0 space-y-10 md:space-y-12">
                        {/*
                          PCBCupid-style flow:
                          1. Mentor-uploaded website sits at the very top (the event's primary content).
                             For mentors/admins, this is the page they control.
                             For everyone else, this is what they see — or nothing at all if not set up.
                          2. Mentor Workspace is shown only to mentors/admins directly below, so they
                             can edit their page, review registrations, and manage showcase slots in one
                             unified area. Non-mentors never see this panel.
                          3. Description/about is shown only as a fallback when no mentor website exists
                             (mirroring PCBCupid, where the overview IS the mentor's content).
                        */}
                        <EventWebsiteBanner eventId={id!} fallback={!aboutText ? null : (
                            <section>
                                <SectionAnchor id="about-anchor" title="About this Event" />
                                <div className="font-data text-sm md:text-base leading-relaxed text-brutal-dark/80 whitespace-pre-wrap">
                                    {aboutText}
                                </div>
                            </section>
                        )} />

                        {/* Mentor Workspace — unified website upload + registrations + slots. Renders nothing for non-mentors. */}
                        <MentorControlsPanel eventId={id} user={user} />

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

                        {/* Discussion */}
                        <DiscussionSection {...commentsProps} sectionId="discussion" />
                    </div>

                    {/* Action sidebar — sticky right rail (desktop) / inline top (mobile) */}
                    <aside className="lg:order-last order-first">
                        <ActionSidebar event={event} hosts={hosts} registrationProps={registrationProps} />
                    </aside>
                </div>
            </div>
        </>
    );
};

export default PreEventPage;
