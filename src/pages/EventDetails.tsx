import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEvent, useEventRegistration, useComments, useEventWebsites, useMyEventWebsite, useEventWebsiteMutations, useEventWebsitesForReview, useEventHosts } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Calendar, MapPin, Users, ArrowLeft, ArrowRight, Send, Globe, Clock, Trophy, Image as ImageIcon, BookOpen, Star, UserCheck, Wrench, Award, ChevronRight, ExternalLink, Shield, Check, X, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { formatEventType } from './Events';
import { WebsiteUploadPanel } from '../components/event/WebsiteUploadPanel';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ════════════════════════════════════════════════════════════════
// UTILITY: Detect pre/post event
// ════════════════════════════════════════════════════════════════

function useIsPast(date: string) {
    return new Date(date) < new Date();
}

// ════════════════════════════════════════════════════════════════
// SHARED: Hosted By
// ════════════════════════════════════════════════════════════════

const HostedBySection = ({ hosts, variant = 'light' }: { hosts: { id: string; user_id: string; name: string; avatar_url: string | null }[]; variant?: 'light' | 'dark' }) => {
    if (!hosts || hosts.length === 0) return null;
    const isDark = variant === 'dark';
    return (
        <div className="flex items-center gap-3 flex-wrap">
            <span className={`font-data text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-brutal-bg/40' : 'text-brutal-dark/40'}`}>Hosted By</span>
            <div className="flex items-center gap-2 flex-wrap">
                {hosts.map(host => (
                    <Link
                        key={host.id}
                        to={`/makers/${host.user_id}`}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors group ${
                            isDark
                                ? 'bg-brutal-bg/10 text-brutal-bg hover:bg-brutal-red'
                                : 'bg-brutal-dark text-brutal-bg hover:bg-brutal-red'
                        }`}
                    >
                        {host.avatar_url ? (
                            <img src={host.avatar_url} alt={host.name} className="w-5 h-5 rounded-full object-cover border border-brutal-bg/20" />
                        ) : (
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${isDark ? 'bg-brutal-bg/20' : 'bg-brutal-bg/20'}`}>
                                {host.name.charAt(0)}
                            </div>
                        )}
                        <span className="font-data text-[10px] font-bold uppercase tracking-wider">{host.name}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════
// SHARED: Countdown Timer (large, for hero)
// ════════════════════════════════════════════════════════════════

const CountdownHero = ({ date }: { date: string }) => {
    const [parts, setParts] = useState({ d: 0, h: 0, m: 0, s: 0 });
    const [expired, setExpired] = useState(false);

    useEffect(() => {
        const update = () => {
            const diff = new Date(date).getTime() - Date.now();
            if (diff <= 0) { setExpired(true); return; }
            setParts({
                d: Math.floor(diff / (1000 * 60 * 60 * 24)),
                h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                s: Math.floor((diff % (1000 * 60)) / 1000),
            });
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [date]);

    if (expired) return null;

    const blocks = [
        { label: 'Days', value: parts.d },
        { label: 'Hours', value: parts.h },
        { label: 'Minutes', value: parts.m },
        { label: 'Seconds', value: parts.s },
    ];

    return (
        <div className="flex gap-3">
            {blocks.map(b => (
                <div key={b.label} className="text-center">
                    <div className="bg-brutal-dark text-brutal-bg w-16 h-16 rounded-xl flex flex-col items-center justify-center shadow-[4px_4px_0px_rgba(196,41,30,0.4)]">
                        <span className="font-heading font-bold text-2xl leading-none">{String(b.value).padStart(2, '0')}</span>
                        <span className="font-data text-[7px] font-bold uppercase tracking-widest text-brutal-bg/40 mt-0.5">{b.label}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ════════════════════════════════════════════════════════════════
// SHARED: Section dividers & helpers
// ════════════════════════════════════════════════════════════════

const SectionAnchor = ({ id, number, title, icon, dark }: { id: string; number: string; title: string; icon?: React.ReactNode; dark?: boolean }) => (
    <div id={id} className="scroll-mt-24 flex items-center gap-4 mb-8">
        <span className={`font-data text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-brutal-bg/30' : 'text-brutal-dark/20'}`}>{number}</span>
        <div>
            <div className={`w-12 h-px ${dark ? 'bg-brutal-bg/10' : 'bg-brutal-dark/10'} mb-2`} />
            <h2 className={`font-heading font-bold text-xl uppercase tracking-tight-heading flex items-center gap-2 ${dark ? 'text-brutal-bg' : ''}`}>
                {icon} {title}
            </h2>
        </div>
    </div>
);

// ════════════════════════════════════════════════════════════════
// SHARED: Gallery
// ════════════════════════════════════════════════════════════════

const GalleryGrid = ({ urls }: { urls: string[] }) => {
    if (!urls || urls.length === 0) return null;
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {urls.map((url, i) => (
                <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden border-2 border-brutal-dark/10 hover:border-brutal-red/40 transition-colors group cursor-pointer">
                    <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
            ))}
        </div>
    );
};

// ════════════════════════════════════════════════════════════════
// SHARED: Post-Event Table of Contents Sidebar
// ════════════════════════════════════════════════════════════════

const RecapToC = ({ sections }: { sections: { id: string; label: string }[] }) => (
    <nav className="sticky top-28 space-y-1">
        <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/30 mb-3 block">Contents</span>
        {sections.map(s => (
            <a
                key={s.id}
                href={`#${s.id}`}
                className="block font-data text-xs text-brutal-dark/50 hover:text-brutal-red transition-colors py-1.5 border-l-2 border-brutal-dark/10 hover:border-brutal-red pl-3"
            >
                {s.label}
            </a>
        ))}
    </nav>
);

// ════════════════════════════════════════════════════════════════
// SHARED: Discussion
// ════════════════════════════════════════════════════════════════

const DiscussionSection = ({ comments, user, deleteComment, handleComment, commentText, setCommentText, sectionId, sectionNum }: any) => (
    <section id={sectionId}>
        <SectionAnchor id={`${sectionId}-anchor`} number={sectionNum} title="Discussion" />
        <div className="space-y-3 mb-6">
            {comments.map((c: any) => (
                <div key={c.id} className="p-3 bg-brutal-dark/5 rounded-xl border border-brutal-dark/10">
                    <div className="flex justify-between items-start mb-2">
                        <span className="font-data text-xs font-bold">{c.userName}</span>
                        <div className="flex items-center gap-2">
                            <span className="font-data text-[9px] text-brutal-dark/50">{new Date(c.created_at).toLocaleDateString()}</span>
                            {user && c.user_id === user.id && (
                                <button onClick={() => deleteComment(c.id)} className="text-brutal-red text-[9px] font-bold hover:underline">Delete</button>
                            )}
                        </div>
                    </div>
                    <p className="font-data text-xs text-brutal-dark/80">{c.content}</p>
                </div>
            ))}
            {comments.length === 0 && <p className="font-data text-xs text-brutal-dark/50">No comments yet.</p>}
        </div>
        {user && (
            <form onSubmit={handleComment} className="flex gap-2">
                <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-brutal-bg border border-brutal-dark/15 px-3 py-2 rounded-xl font-data text-xs focus:outline-none focus:border-brutal-dark/30"
                />
                <Button type="submit" size="sm"><Send className="w-3 h-3" /></Button>
            </form>
        )}
    </section>
);

// ════════════════════════════════════════════════════════════════
// MENTOR WEBSITE BANNER — renders approved website as event hero
// Like PCBCupid: large iframe banner with "Register Now" overlay
// ════════════════════════════════════════════════════════════════

const EventWebsiteBanner = ({ eventId, onRegisterClick, isRegistered, isPast, user }: {
    eventId: string;
    onRegisterClick?: () => void;
    isRegistered: boolean;
    isPast: boolean;
    user: any;
}) => {
    const { data: websites, loading } = useEventWebsites(eventId);
    const [expanded, setExpanded] = useState(false);

    // Get the first approved website (mentor's poster/landing page)
    const website = websites && websites.length > 0 ? websites[0] : null;

    if (loading || !website) return null;

    const hasHtml = !!website.html_content;
    const hasThumbnail = !!website.thumbnail_url;
    const hasFileUrl = !!website.file_url;

    // Open the full website in a new tab
    const openFullWebsite = () => {
        if (hasHtml) {
            const w = window.open('', '_blank');
            if (w) {
                w.document.open();
                w.document.write(website.html_content!);
                w.document.close();
            }
        } else if (hasFileUrl) {
            window.open(website.file_url!, '_blank');
        }
    };

    return (
        <>
            {/* Banner container */}
            <div className="relative w-full rounded-2xl overflow-hidden border-2 border-brutal-dark/10 bg-brutal-dark/5 group">
                {/* Iframe or image preview */}
                {hasHtml ? (
                    <div className="relative w-full" style={{ height: '70vh', maxHeight: '700px', minHeight: '400px' }}>
                        <iframe
                            srcDoc={website.html_content!}
                            title={website.title}
                            className="absolute inset-0 w-full h-full border-0"
                            sandbox="allow-scripts allow-same-origin"
                            style={{ pointerEvents: 'none' }}
                        />
                        {/* Clickable overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-brutal-dark/60 via-transparent to-transparent" />
                    </div>
                ) : hasThumbnail ? (
                    <div className="relative w-full" style={{ height: '70vh', maxHeight: '700px', minHeight: '400px' }}>
                        <img
                            src={website.thumbnail_url!}
                            alt={website.title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-brutal-dark/60 via-transparent to-transparent" />
                    </div>
                ) : null}

                {/* Overlay buttons — top right */}
                <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                    <button
                        onClick={openFullWebsite}
                        className="bg-brutal-dark/70 backdrop-blur-sm text-brutal-bg px-3 py-2 rounded-lg font-data text-[10px] font-bold uppercase tracking-wider hover:bg-brutal-dark transition-colors flex items-center gap-1.5 border border-brutal-bg/10"
                    >
                        <ExternalLink className="w-3 h-3" /> View Full Site
                    </button>
                </div>

                {/* Overlay: bottom left — title + Register Now */}
                {!isPast && (
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 z-10">
                        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                            <div>
                                <h3 className="font-heading font-bold text-lg md:text-xl text-brutal-bg uppercase tracking-tight-heading drop-shadow-lg">
                                    {website.title}
                                </h3>
                                {website.host_names && website.host_names.length > 0 && (
                                    <p className="font-data text-[10px] text-brutal-bg/60 mt-1 uppercase tracking-wider">
                                        By {website.host_names.join(', ')}
                                    </p>
                                )}
                            </div>
                            {!isRegistered && !user && (
                                <Link
                                    to="/login"
                                    className="bg-brutal-red text-brutal-bg px-6 py-3 rounded-xl font-heading font-bold text-sm uppercase tracking-wider shadow-[4px_4px_0px_rgba(0,0,0,0.3)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-2 whitespace-nowrap no-underline"
                                >
                                    Register Now <ArrowRight className="w-4 h-4" />
                                </Link>
                            )}
                            {!isRegistered && user && onRegisterClick && (
                                <button
                                    onClick={onRegisterClick}
                                    className="bg-brutal-red text-brutal-bg px-6 py-3 rounded-xl font-heading font-bold text-sm uppercase tracking-wider shadow-[4px_4px_0px_rgba(0,0,0,0.3)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center gap-2 whitespace-nowrap"
                                >
                                    Register Now <ArrowRight className="w-4 h-4" />
                                </button>
                            )}
                            {isRegistered && (
                                <div className="bg-green-500/20 border border-green-400/30 text-green-300 px-5 py-2.5 rounded-full font-data text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                                    ✓ Registered
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Expanded fullscreen modal */}
            {expanded && (
                <div className="fixed inset-0 z-50 bg-brutal-dark/95 flex items-center justify-center p-4">
                    <button
                        onClick={() => setExpanded(false)}
                        className="absolute top-6 right-6 bg-brutal-bg/10 text-brutal-bg px-4 py-2 rounded-lg font-data text-xs font-bold uppercase hover:bg-brutal-bg/20 transition-colors"
                    >
                        Close
                    </button>
                    {hasHtml ? (
                        <iframe
                            srcDoc={website.html_content!}
                            title={website.title}
                            className="w-full h-full rounded-xl border-0"
                            sandbox="allow-scripts allow-same-origin"
                        />
                    ) : hasThumbnail ? (
                        <img src={website.thumbnail_url!} alt={website.title} className="max-w-full max-h-full object-contain rounded-xl" />
                    ) : null}
                </div>
            )}
        </>
    );
};

// ════════════════════════════════════════════════════════════════
// MENTOR UPLOAD PANEL — only visible to mentors/admins
// ════════════════════════════════════════════════════════════════

const MentorWebsiteUploadSection = ({ eventId, user, isRegistered, sectionId, sectionNum }: { eventId: string; user: any; isRegistered: boolean; sectionId: string; sectionNum: string }) => {
    const { data: myWebsite, refetch: refetchMyWebsite } = useMyEventWebsite(eventId);
    const { data: websites, refetch: refetchWebsites } = useEventWebsites(eventId);
    const { submitWebsite, deleteWebsite } = useEventWebsiteMutations();

    // Only mentors and admins can see this
    if (!user || (user.role !== 'mentor' && user.role !== 'admin')) return null;

    const handleSubmit = async (data: { title: string; description: string; html_content: string | null; file_url: string | null; host_names: string[]; }) => {
        if (!user) throw new Error('You must be logged in.');
        const { error } = await submitWebsite({
            event_id: eventId, user_id: user.id, title: data.title,
            description: data.description || undefined,
            html_content: data.html_content || undefined,
            file_url: data.file_url || undefined,
            host_names: data.host_names,
        });
        if (error) throw new Error(error);
        refetchMyWebsite().catch(() => {});
        refetchWebsites().catch(() => {});
    };

    const handleDelete = async () => {
        if (!myWebsite) return;
        await deleteWebsite(myWebsite.id);
        refetchMyWebsite().catch(() => {});
        refetchWebsites().catch(() => {});
    };

    return (
        <section id={sectionId}>
            <SectionAnchor id={`${sectionId}-anchor`} number={sectionNum} title="Event Website (Mentor)" icon={<Globe className="w-5 h-5 text-brutal-red" />} />
            <p className="font-data text-xs text-brutal-dark/50 mb-4">
                Upload a website or poster for this event. Once approved, it will appear as the event's hero banner for all viewers.
            </p>
            <WebsiteUploadPanel
                eventId={eventId} userId={user.id} userName={user.name || 'Unknown'}
                existingSubmission={myWebsite} onSubmit={handleSubmit} onDelete={handleDelete}
                isRegistered={isRegistered}
            />
        </section>
    );
};

// ════════════════════════════════════════════════════════════════
// REGISTRATION CTA (inline, not sidebar)
// ════════════════════════════════════════════════════════════════

const RegistrationCTA = ({ isRegistered, event, user, actionLoading, handleRegister, handleUnregister, capacityRemaining, customRegisterNode }: any) => {
    if (customRegisterNode) return customRegisterNode;

    return (
        <div className="bg-brutal-dark text-brutal-bg rounded-2xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brutal-red/10 rounded-bl-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-brutal-bg/5 rounded-tr-full pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1">
                    <h2 className="font-heading font-bold text-2xl md:text-3xl uppercase tracking-tight-heading mb-3">
                        {isRegistered ? "You're In!" : "Secure Your Spot"}
                    </h2>
                    <p className="font-data text-sm text-brutal-bg/60 max-w-md">
                        {isRegistered
                            ? "You're registered for this event. We'll see you there."
                            : capacityRemaining !== null
                                ? `Only ${capacityRemaining} spot${capacityRemaining !== 1 ? 's' : ''} remaining. Don't miss out.`
                                : `${event.registration_count} makers have already registered. Join them.`
                        }
                    </p>
                </div>

                <div className="flex flex-col items-center gap-3 min-w-[200px]">
                    {isRegistered ? (
                        <>
                            <div className="bg-green-500/20 border border-green-400/30 text-green-300 px-6 py-3 rounded-full font-data text-sm font-bold uppercase tracking-wider">
                                ✓ Registered
                            </div>
                            <button
                                onClick={handleUnregister}
                                disabled={actionLoading}
                                className="font-data text-[10px] text-brutal-bg/40 hover:text-brutal-red uppercase font-bold tracking-widest transition-colors"
                            >
                                {actionLoading ? 'Processing...' : 'Unregister'}
                            </button>
                        </>
                    ) : event.registration_status === 'open' && (capacityRemaining === null || capacityRemaining > 0) ? (
                        user ? (
                            <Button
                                size="lg"
                                className="bg-brutal-red text-brutal-bg hover:bg-brutal-bg hover:text-brutal-dark shadow-[4px_4px_0px_rgba(245,243,238,0.2)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                                onClick={handleRegister}
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Registering...' : 'Register Now'}
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        ) : (
                            <Link to="/login">
                                <Button size="lg" className="bg-brutal-bg text-brutal-dark hover:bg-brutal-red hover:text-brutal-bg transition-all">
                                    Log in to Register
                                </Button>
                            </Link>
                        )
                    ) : (
                        <div className="bg-brutal-bg/10 border border-brutal-bg/20 px-6 py-3 rounded-full font-data text-sm font-bold uppercase text-brutal-bg/50">
                            Registration Closed
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════
// PRE-EVENT: IMMERSIVE LANDING PAGE
// ════════════════════════════════════════════════════════════════

const PreEventPage = ({ event, hosts, id, user, registrationProps, commentsProps }: any) => {
    const [aboutText] = event.description?.includes('---RECAP---')
        ? event.description.split('---RECAP---')
        : [event.description, null];

    const date = new Date(event.date);
    const capacityRemaining = event.capacity ? event.capacity - event.registration_count : null;

    // Category-specific accent
    const accents: Record<string, string> = {
        build_challenge: 'from-brutal-red/20 via-brutal-dark/90 to-brutal-dark',
        maker_meetup: 'from-brutal-dark/20 via-brutal-dark/80 to-brutal-dark',
        tech_tuesday: 'from-brutal-dark/10 via-brutal-dark/70 to-brutal-dark',
    };

    const externalRsvpUrl = event.location?.startsWith('rsvp:') ? event.location.replace('rsvp:', '') : null;

    const customRegisterNode = externalRsvpUrl ? (
        <div className="bg-brutal-dark text-brutal-bg rounded-2xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brutal-red/10 rounded-bl-full pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1">
                    <h2 className="font-heading font-bold text-2xl md:text-3xl uppercase tracking-tight-heading mb-3">RSVP Now</h2>
                    <p className="font-data text-sm text-brutal-bg/60 max-w-md">This event uses an external registration platform.</p>
                </div>
                <a href={externalRsvpUrl} target="_blank" rel="noreferrer">
                    <Button size="lg" className="bg-brutal-red text-brutal-bg hover:bg-brutal-bg hover:text-brutal-dark transition-all">
                        RSVP via External Link <ExternalLink className="w-4 h-4 ml-1" />
                    </Button>
                </a>
            </div>
        </div>
    ) : null;

    return (
        <>
            {/* ── HERO: Full-width immersive ── */}
            <section className="relative min-h-[85vh] flex items-end">
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
                    className="absolute top-28 left-6 md:left-12 lg:left-24 z-20 inline-flex items-center gap-2 font-data text-xs font-bold uppercase text-brutal-bg/70 hover:text-brutal-bg transition-colors bg-brutal-bg/10 backdrop-blur-sm px-3 py-2 rounded-full border border-brutal-bg/10"
                >
                    <ArrowLeft className="w-3 h-3" /> Back
                </Link>

                {/* Hero content */}
                <div className="relative z-10 w-full px-6 md:px-12 lg:px-24 pb-16 pt-48 max-w-7xl mx-auto">
                    <div className="flex flex-col gap-6">
                        {/* Type badge */}
                        <div className="flex items-center gap-3">
                            <span className="bg-brutal-red text-brutal-bg px-3 py-1 font-data text-[10px] font-bold rounded-full uppercase tracking-wider">
                                {formatEventType(event.event_type)}
                            </span>
                            {event.registration_status === 'open' && (
                                <span className="bg-green-500/20 text-green-300 border border-green-400/30 px-3 py-1 font-data text-[10px] font-bold rounded-full uppercase tracking-wider">
                                    Registration Open
                                </span>
                            )}
                        </div>

                        {/* Title */}
                        <h1 className="ed-hero-text font-heading font-bold text-4xl sm:text-6xl md:text-8xl uppercase tracking-tight-heading leading-[0.9] text-brutal-bg max-w-4xl">
                            {event.title}
                        </h1>

                        {/* Tagline */}
                        {event.tagline && (
                            <p className="ed-hero-text font-data text-base md:text-lg text-brutal-bg/60 max-w-xl">{event.tagline}</p>
                        )}

                        {/* Hosted by */}
                        <div className="ed-hero-text">
                            <HostedBySection hosts={hosts} variant="dark" />
                        </div>

                        {/* Meta info strip */}
                        <div className="ed-hero-text flex flex-wrap gap-4 font-data text-xs font-bold text-brutal-bg/80">
                            <div className="flex items-center gap-2 bg-brutal-bg/10 backdrop-blur-sm px-4 py-2 rounded-full">
                                <Calendar className="w-4 h-4 text-brutal-red" />
                                {date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                            <div className="flex items-center gap-2 bg-brutal-bg/10 backdrop-blur-sm px-4 py-2 rounded-full">
                                <Clock className="w-4 h-4 text-brutal-red" />
                                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {event.location && !event.location.startsWith('rsvp:') && (
                                <div className="flex items-center gap-2 bg-brutal-bg/10 backdrop-blur-sm px-4 py-2 rounded-full">
                                    <MapPin className="w-4 h-4 text-brutal-red" /> {event.location}
                                </div>
                            )}
                            <div className="flex items-center gap-2 bg-brutal-bg/10 backdrop-blur-sm px-4 py-2 rounded-full">
                                <Users className="w-4 h-4 text-brutal-red" />
                                {capacityRemaining !== null ? `${capacityRemaining} spots left` : `${event.registration_count} registered`}
                            </div>
                        </div>

                        {/* Countdown */}
                        <div className="ed-hero-text mt-4">
                            <CountdownHero date={event.date} />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── MENTOR WEBSITE BANNER — shown right below hero ── */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 -mt-8 relative z-20">
                <EventWebsiteBanner
                    eventId={id}
                    user={user}
                    onRegisterClick={() => {
                        const regSection = document.getElementById('registration');
                        if (regSection) regSection.scrollIntoView({ behavior: 'smooth' });
                        else registrationProps.handleRegister?.();
                    }}
                    isRegistered={registrationProps.isRegistered}
                    isPast={false}
                />
            </div>

            {/* ── BODY: Content sections ── */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-16 space-y-20">

                {/* Registration CTA — front and center */}
                <section id="registration" className="ed-section">
                    <RegistrationCTA {...registrationProps} customRegisterNode={customRegisterNode} />
                </section>

                {/* About / Description */}
                {aboutText && (
                    <section className="ed-section">
                        <SectionAnchor id="about" number="01" title="About" icon={
                            event.event_type === 'build_challenge' ? <Trophy className="w-5 h-5 text-brutal-red" /> :
                            event.event_type === 'tech_tuesday' ? <BookOpen className="w-5 h-5 text-brutal-red" /> :
                            <Wrench className="w-5 h-5 text-brutal-red" />
                        } />
                        <div className="max-w-3xl">
                            <p className="font-data text-sm md:text-base text-brutal-dark/80 whitespace-pre-wrap leading-relaxed">{aboutText.trim()}</p>
                        </div>
                    </section>
                )}

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

                {/* Mentor Website Upload — only visible to mentors/admins */}
                <MentorWebsiteUploadSection eventId={id} user={user} isRegistered={registrationProps.isRegistered} sectionId="mentor-upload" sectionNum="05" />

                {/* Mentor Controls */}
                <MentorControlsPanel eventId={id} user={user} />

                {/* Discussion */}
                <DiscussionSection {...commentsProps} sectionId="discussion" sectionNum="06" />
            </div>
        </>
    );
};

// ════════════════════════════════════════════════════════════════
// POST-EVENT: RECAP & ARCHIVE PAGE
// ════════════════════════════════════════════════════════════════

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
            <section className="relative min-h-[50vh] flex items-end">
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
                    className="absolute top-28 left-6 md:left-12 lg:left-24 z-20 inline-flex items-center gap-2 font-data text-xs font-bold uppercase text-brutal-bg/70 hover:text-brutal-bg transition-colors bg-brutal-bg/10 backdrop-blur-sm px-3 py-2 rounded-full border border-brutal-bg/10"
                >
                    <ArrowLeft className="w-3 h-3" /> Back
                </Link>

                <div className="relative z-10 w-full px-6 md:px-12 lg:px-24 pb-12 pt-48 max-w-7xl mx-auto">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="bg-brutal-dark/70 text-brutal-bg px-3 py-1 font-data text-[10px] font-bold rounded-full uppercase tracking-wider backdrop-blur-sm">
                            {formatEventType(event.event_type)}
                        </span>
                        <span className="bg-brutal-dark text-brutal-bg px-3 py-1 font-data text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5">
                            <Star className="w-3 h-3" /> Event Concluded
                        </span>
                    </div>

                    <h1 className="ed-hero-text font-heading font-bold text-3xl sm:text-5xl md:text-7xl uppercase tracking-tight-heading leading-[0.9] mb-3 max-w-4xl">
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

            {/* ── BODY: Sidebar + Content ── */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-16">
                    {/* Main content */}
                    <div className="space-y-20">
                        {/* Recap */}
                        {recapText && (
                            <section id="recap" className="ed-section">
                                <SectionAnchor id="recap-anchor" number={String(sectionNum++).padStart(2, '0')} title="Event Recap" icon={<Star className="w-5 h-5 text-brutal-red" />} />
                                <div className="p-8 bg-brutal-dark text-brutal-bg rounded-2xl shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-brutal-red/20 rounded-bl-full pointer-events-none" />
                                    <p className="font-data text-sm md:text-base text-brutal-bg/90 whitespace-pre-wrap leading-relaxed relative z-10">{recapText.trim()}</p>
                                </div>
                            </section>
                        )}

                        {/* Results */}
                        {event.results_summary && (
                            <section id="results" className="ed-section">
                                <SectionAnchor id="results-anchor" number={String(sectionNum++).padStart(2, '0')} title="Results" icon={<Trophy className="w-5 h-5 text-brutal-red" />} />
                                <div className="p-8 bg-brutal-dark text-brutal-bg rounded-2xl shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-brutal-red/20 rounded-bl-full pointer-events-none" />
                                    <p className="font-data text-sm text-brutal-bg/90 whitespace-pre-wrap leading-relaxed relative z-10">{event.results_summary}</p>
                                </div>
                            </section>
                        )}

                        {/* Prizes (Build Challenge) */}
                        {event.event_type === 'build_challenge' && event.prizes_info && (
                            <section id="prizes" className="ed-section">
                                <SectionAnchor id="prizes-anchor" number={String(sectionNum++).padStart(2, '0')} title="Prizes & Recognition" icon={<Award className="w-5 h-5 text-brutal-red" />} />
                                <div className="p-8 bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-2 border-yellow-400/30 rounded-2xl">
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
                                <div className="p-8 bg-gradient-to-br from-brutal-dark/5 to-brutal-dark/10 rounded-2xl border border-brutal-dark/10">
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

                        {/* Mentor Website Upload — only visible to mentors/admins */}
                        <MentorWebsiteUploadSection eventId={id} user={user} isRegistered={registrationProps.isRegistered} sectionId="mentor-upload-post" sectionNum={String(sectionNum++).padStart(2, '0')} />

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

// ════════════════════════════════════════════════════════════════
// CATEGORY PRE-EVENT SECTIONS
// ════════════════════════════════════════════════════════════════

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
            .select('id, status, user_id, topic, project:project!project_id(id, title), app_user:app_user!user_id(name)')
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
        const { data: subData } = await supabase.from('event_submission').select('*').eq('event_id', id).eq('user_id', user.id);
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
        const { data: team } = await supabase.from('event_team').insert({ event_id: id, name: newTeamName, lead_id: user.id }).select().single();
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

// ════════════════════════════════════════════════════════════════
// CATEGORY POST-EVENT HIGHLIGHTS
// ════════════════════════════════════════════════════════════════

const BuildChallengePostHighlights = ({ id }: { id: string }) => {
    const [submissions, setSubmissions] = useState<any[]>([]);

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase
                .from('event_submission')
                .select('id, status, project:project!project_id(id, title, summary), team:event_team!team_id(name)')
                .eq('event_id', id)
                .in('status', ['accepted', 'winner']);
            setSubmissions(data || []);
        };
        fetch();
    }, [id]);

    if (submissions.length === 0) {
        return <p className="font-data text-xs text-brutal-dark/50 p-6 bg-brutal-dark/5 rounded-xl border border-dashed border-brutal-dark/10 text-center">No submissions to showcase yet.</p>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {submissions.map(sub => (
                <div key={sub.id} className="p-5 bg-brutal-bg border-4 border-brutal-dark shadow-[4px_4px_0px_#111] flex flex-col hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#111] transition-all">
                    <div className="flex justify-between items-start mb-3">
                        <span className={`px-2 py-1 text-[9px] font-bold font-data rounded uppercase ${
                            sub.status === 'winner' ? 'bg-brutal-red text-brutal-bg shadow-sm' : 'bg-brutal-dark/10 text-brutal-dark'
                        }`}>{sub.status}</span>
                    </div>
                    <h4 className="font-heading font-bold text-sm mb-2 line-clamp-2 leading-tight">{sub.project?.title || 'Unknown Project'}</h4>
                    {sub.team && <p className="font-data text-xs text-brutal-dark/60 mb-4 flex-1">Team: {sub.team.name}</p>}
                    <div className="mt-auto pt-3 border-t border-brutal-dark/10">
                        {sub.project && (
                            <Link to={`/projects/${sub.project.id}`} className="font-data text-xs text-brutal-dark hover:text-brutal-red font-bold uppercase flex items-center gap-1 group w-fit">
                                View Project <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

const MakerMeetupPostHighlights = ({ id }: { id: string }) => {
    const [slots, setSlots] = useState<any[]>([]);

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase
                .from('showcase_slot')
                .select('id, status, user_id, project:project!project_id(id, title), app_user:app_user!user_id(name)')
                .eq('event_id', id)
                .eq('status', 'approved');
            setSlots(data || []);
        };
        fetch();
    }, [id]);

    if (slots.length === 0) {
        return <p className="font-data text-xs text-brutal-dark/50 p-6 bg-brutal-dark/5 rounded-xl border border-dashed border-brutal-dark/10 text-center">No presenters to showcase.</p>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {slots.map(slot => (
                <div key={slot.id} className="p-5 bg-brutal-bg border-4 border-brutal-dark shadow-[4px_4px_0px_#111]">
                    <div className="font-heading font-bold text-sm leading-tight mb-2">{slot.app_user?.name}</div>
                    {slot.project && (
                        <Link to={`/projects/${slot.project.id}`} className="font-data text-xs font-bold uppercase text-brutal-dark hover:text-brutal-red block w-fit">
                            {slot.project.title} →
                        </Link>
                    )}
                </div>
            ))}
        </div>
    );
};

const TechTuesdayPostHighlights = ({ id }: { id: string }) => {
    const [slots, setSlots] = useState<any[]>([]);

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase
                .from('showcase_slot')
                .select('id, status, user_id, project:project!project_id(id, title), app_user:app_user!user_id(name)')
                .eq('event_id', id)
                .eq('status', 'approved');
            setSlots(data || []);
        };
        fetch();
    }, [id]);

    if (slots.length === 0) {
        return <p className="font-data text-xs text-brutal-dark/50 p-6 bg-brutal-dark/5 rounded-xl border border-dashed border-brutal-dark/10 text-center">Session highlights coming soon.</p>;
    }

    return (
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
    );
};

// ════════════════════════════════════════════════════════════════
// MENTOR CONTROLS — inline on event page
// ════════════════════════════════════════════════════════════════

const MentorControlsPanel = ({ eventId, user }: { eventId: string; user: any }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'registrations' | 'slots' | 'websites'>('registrations');
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [slots, setSlots] = useState<any[]>([]);
    const [loadingRegs, setLoadingRegs] = useState(false);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const { data: websiteSubmissions, refetch: refetchWebsites } = useEventWebsitesForReview(eventId);

    // Only show for mentors/admins
    if (!user || (user.role !== 'mentor' && user.role !== 'admin')) return null;

    const fetchRegistrations = async () => {
        setLoadingRegs(true);
        const { data } = await supabase
            .from('event_registration')
            .select('id, user_id, created_at, app_user:app_user!user_id(name, email)')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });
        setRegistrations(data || []);
        setLoadingRegs(false);
    };

    const fetchSlots = async () => {
        setLoadingSlots(true);
        const { data } = await supabase
            .from('showcase_slot')
            .select('id, status, user_id, topic, project:project!project_id(id, title), app_user:app_user!user_id(name)')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });
        setSlots(data || []);
        setLoadingSlots(false);
    };

    const handleOpen = () => {
        if (!isOpen) {
            fetchRegistrations();
            fetchSlots();
        }
        setIsOpen(!isOpen);
    };

    const handleSlotAction = async (slotId: string, newStatus: string) => {
        setActionLoading(slotId);
        await supabase.from('showcase_slot').update({ status: newStatus }).eq('id', slotId);
        setActionLoading(null);
        fetchSlots();
    };

    const handleWebsiteAction = async (websiteId: string, newStatus: 'pending' | 'approved' | 'rejected') => {
        setActionLoading(websiteId);
        await supabase.from('event_website').update({ status: newStatus, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('id', websiteId);
        setActionLoading(null);
        refetchWebsites();
    };

    const tabs = [
        { key: 'registrations' as const, label: 'Registrations', count: registrations.length },
        { key: 'slots' as const, label: 'Showcase Slots', count: slots.length },
        { key: 'websites' as const, label: 'Websites', count: websiteSubmissions?.length || 0 },
    ];

    const pendingSlots = slots.filter(s => s.status === 'pending');
    const pendingWebsites = (websiteSubmissions || []).filter(w => w.status === 'pending');
    const totalPending = pendingSlots.length + pendingWebsites.length;

    return (
        <section className="ed-section">
            {/* Toggle bar */}
            <button
                onClick={handleOpen}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-brutal-dark to-brutal-dark/90 text-brutal-bg rounded-xl hover:from-brutal-red hover:to-brutal-red/90 transition-all group"
            >
                <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-brutal-red group-hover:text-brutal-bg transition-colors" />
                    <span className="font-heading font-bold text-sm uppercase tracking-wider">Mentor Controls</span>
                    {totalPending > 0 && (
                        <span className="bg-brutal-red text-brutal-bg text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                            {totalPending} pending
                        </span>
                    )}
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Expanded panel */}
            {isOpen && (
                <div className="mt-3 border-2 border-brutal-dark/10 rounded-xl overflow-hidden">
                    {/* Tab bar */}
                    <div className="flex border-b border-brutal-dark/10 bg-brutal-dark/5">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex-1 py-3 px-4 font-data text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                    activeTab === tab.key
                                        ? 'bg-brutal-dark text-brutal-bg'
                                        : 'text-brutal-dark/50 hover:text-brutal-dark hover:bg-brutal-dark/10'
                                }`}
                            >
                                {tab.label}
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                    activeTab === tab.key ? 'bg-brutal-bg/20' : 'bg-brutal-dark/10'
                                }`}>{tab.count}</span>
                            </button>
                        ))}
                    </div>

                    {/* Tab content */}
                    <div className="p-4 max-h-[400px] overflow-y-auto">
                        {/* REGISTRATIONS TAB */}
                        {activeTab === 'registrations' && (
                            <div className="space-y-2">
                                {loadingRegs ? (
                                    <p className="font-data text-xs text-brutal-dark/40 text-center py-8">Loading registrations...</p>
                                ) : registrations.length === 0 ? (
                                    <p className="font-data text-xs text-brutal-dark/40 text-center py-8">No registrations yet.</p>
                                ) : (
                                    registrations.map((reg, i) => (
                                        <div key={reg.id} className="flex items-center justify-between py-2 px-3 bg-brutal-bg rounded-lg border border-brutal-dark/5">
                                            <div className="flex items-center gap-3">
                                                <span className="font-data text-[10px] text-brutal-dark/30 w-6">{i + 1}.</span>
                                                <div>
                                                    <span className="font-data text-xs font-bold block">{reg.app_user?.name || 'Unknown'}</span>
                                                    <span className="font-data text-[10px] text-brutal-dark/40">{reg.app_user?.email}</span>
                                                </div>
                                            </div>
                                            <span className="font-data text-[9px] text-brutal-dark/30">
                                                {new Date(reg.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* SHOWCASE SLOTS TAB */}
                        {activeTab === 'slots' && (
                            <div className="space-y-2">
                                {loadingSlots ? (
                                    <p className="font-data text-xs text-brutal-dark/40 text-center py-8">Loading slots...</p>
                                ) : slots.length === 0 ? (
                                    <p className="font-data text-xs text-brutal-dark/40 text-center py-8">No slot requests yet.</p>
                                ) : (
                                    slots.map(slot => (
                                        <div key={slot.id} className="flex items-center justify-between py-2 px-3 bg-brutal-bg rounded-lg border border-brutal-dark/5">
                                            <div className="flex-1 min-w-0">
                                                <span className="font-data text-xs font-bold block">{slot.app_user?.name || 'Unknown'}</span>
                                                <span className="font-data text-[10px] text-brutal-dark/50 block truncate">
                                                    {slot.project?.title || slot.topic || 'No topic specified'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 ml-3 shrink-0">
                                                {slot.status === 'pending' ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleSlotAction(slot.id, 'approved')}
                                                            disabled={actionLoading === slot.id}
                                                            className="bg-green-500 text-white p-1.5 rounded-lg hover:bg-green-600 transition-colors"
                                                            title="Approve"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleSlotAction(slot.id, 'rejected')}
                                                            disabled={actionLoading === slot.id}
                                                            className="bg-brutal-red text-white p-1.5 rounded-lg hover:bg-red-700 transition-colors"
                                                            title="Reject"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className={`font-data text-[9px] font-bold uppercase px-2 py-1 rounded-full ${
                                                        slot.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>{slot.status}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* WEBSITES TAB */}
                        {activeTab === 'websites' && (
                            <div className="space-y-3">
                                {!websiteSubmissions || websiteSubmissions.length === 0 ? (
                                    <p className="font-data text-xs text-brutal-dark/40 text-center py-8">No website submissions yet.</p>
                                ) : (
                                    websiteSubmissions.map(w => (
                                        <div key={w.id} className="p-3 bg-brutal-bg rounded-lg border border-brutal-dark/5">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <span className="font-data text-xs font-bold block">{w.title}</span>
                                                    <span className="font-data text-[10px] text-brutal-dark/50">by {w.userName}</span>
                                                </div>
                                                <span className={`font-data text-[9px] font-bold uppercase px-2 py-1 rounded-full ${
                                                    w.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                    w.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>{w.status}</span>
                                            </div>
                                            {/* Preview thumbnail */}
                                            {w.html_content && (
                                                <div className="relative w-full h-32 rounded-lg overflow-hidden bg-brutal-dark/5 border border-brutal-dark/10 mb-2">
                                                    <iframe
                                                        srcDoc={w.html_content}
                                                        title={w.title}
                                                        className="absolute inset-0 w-full border-0"
                                                        style={{ height: '400%', width: '100%', transform: 'scale(0.25)', transformOrigin: 'top left', pointerEvents: 'none' }}
                                                        sandbox="allow-scripts"
                                                    />
                                                </div>
                                            )}
                                            {/* Actions */}
                                            {w.status === 'pending' && (
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        onClick={() => handleWebsiteAction(w.id, 'approved')}
                                                        disabled={actionLoading === w.id}
                                                        className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 text-white py-2 rounded-lg font-data text-[10px] font-bold uppercase hover:bg-green-600 transition-colors"
                                                    >
                                                        <Check className="w-3 h-3" /> Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleWebsiteAction(w.id, 'rejected')}
                                                        disabled={actionLoading === w.id}
                                                        className="flex-1 flex items-center justify-center gap-1.5 bg-brutal-red text-white py-2 rounded-lg font-data text-[10px] font-bold uppercase hover:bg-red-700 transition-colors"
                                                    >
                                                        <X className="w-3 h-3" /> Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};

// ════════════════════════════════════════════════════════════════
// MAIN EVENT DETAILS
// ════════════════════════════════════════════════════════════════

export function EventDetails() {
    const { id } = useParams();
    const { data: event, loading } = useEvent(id);
    const { user } = useAuth();
    const { isRegistered, register, unregister } = useEventRegistration(id);
    const { comments, addComment, deleteComment } = useComments('event', id);
    const { data: hosts } = useEventHosts(id);
    const [commentText, setCommentText] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const pageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!pageRef.current || !event) return;
        const ctx = gsap.context(() => {
            gsap.fromTo('.ed-hero-text',
                { y: 40, opacity: 0 },
                { y: 0, opacity: 1, stagger: 0.1, duration: 0.8, ease: 'power3.out' }
            );
            const sections = document.querySelectorAll('.ed-section');
            sections.forEach((section) => {
                gsap.fromTo(section, { opacity: 0, y: 20 }, {
                    opacity: 1, y: 0, duration: 0.6, ease: 'power3.out',
                    scrollTrigger: { trigger: section, start: 'top 85%', toggleActions: 'play none none none' },
                });
            });
        }, pageRef);
        return () => ctx.revert();
    }, [event]);

    const handleRegister = async () => {
        setActionLoading(true);
        await register();
        if (user && id) {
            try {
                const { onEventRegistration } = await import('../lib/badgeEngine');
                await onEventRegistration(user.id, id);
            } catch (err) {
                console.error('Failed to auto-award event badge', err);
            }
        }
        setActionLoading(false);
    };

    const handleUnregister = async () => {
        setActionLoading(true);
        await unregister();
        setActionLoading(false);
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        await addComment(commentText.trim());
        setCommentText('');
    };

    if (loading) {
        return (
            <div className="pt-32 px-12 flex-1 w-full bg-brutal-bg min-h-screen">
                <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
                    <div className="h-[60vh] bg-brutal-dark/5 rounded-xl" />
                    <div className="h-8 w-3/4 bg-brutal-dark/5 rounded" />
                    <div className="h-4 w-1/2 bg-brutal-dark/[0.03] rounded" />
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="pt-32 px-12 flex-1 w-full bg-brutal-bg min-h-screen text-center">
                <p className="font-data text-sm text-brutal-dark/50">Event not found.</p>
                <Link to="/events" className="font-data text-xs font-bold text-brutal-red mt-4 inline-block">← Back to Events</Link>
            </div>
        );
    }

    const isPast = new Date(event.date) < new Date();
    const capacityRemaining = event.capacity ? event.capacity - event.registration_count : null;

    const commentsProps = { comments, user, deleteComment, handleComment, commentText, setCommentText };
    const registrationProps = { isRegistered, event, user, actionLoading, handleRegister, handleUnregister, capacityRemaining };

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen">
            {isPast ? (
                <PostEventPage
                    event={event}
                    hosts={hosts || []}
                    id={id}
                    user={user}
                    registrationProps={registrationProps}
                    commentsProps={commentsProps}
                />
            ) : (
                <PreEventPage
                    event={event}
                    hosts={hosts || []}
                    id={id}
                    user={user}
                    registrationProps={registrationProps}
                    commentsProps={commentsProps}
                />
            )}
        </div>
    );
}
