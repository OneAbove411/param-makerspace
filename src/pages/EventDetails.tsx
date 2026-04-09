import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEvent, useEventRegistration, useComments, useEventWebsites, useMyEventWebsite, useEventWebsiteMutations, useEventHosts } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Calendar, MapPin, Users, ArrowLeft, ArrowRight, Send, Globe, Clock, Trophy, Image as ImageIcon, BookOpen, Star, UserCheck, Wrench, Award, ChevronRight, ExternalLink, Shield, Check, X, Eye, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';
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
        <div className="flex gap-2">
            {blocks.map(b => (
                <div key={b.label} className="text-center">
                    <div className="bg-brutal-dark text-brutal-bg w-12 h-12 md:w-14 md:h-14 rounded-lg flex flex-col items-center justify-center shadow-[3px_3px_0px_rgba(196,41,30,0.4)]">
                        <span className="font-heading font-bold text-lg md:text-xl leading-none">{String(b.value).padStart(2, '0')}</span>
                        <span className="font-data text-[7px] font-bold uppercase tracking-widest text-brutal-bg/40 mt-0.5">{b.label}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ════════════════════════════════════════════════════════════════
// SHARED: Sticky Register Bar — appears after user scrolls past hero
// ════════════════════════════════════════════════════════════════

const StickyRegisterBar = ({ event, isRegistered, user, actionLoading, handleRegister, handleUnregister, capacityRemaining }: any) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            // Show after scrolling past 60% of viewport
            setVisible(window.scrollY > window.innerHeight * 0.55);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const externalRsvpUrl = event.location?.startsWith('rsvp:') ? event.location.replace('rsvp:', '') : null;
    const isPast = new Date(event.date) < new Date();
    if (isPast) return null;

    return (
        <div
            aria-hidden={!visible}
            className={`fixed left-0 right-0 bottom-0 z-40 lg:hidden transition-transform duration-300 ${
                visible ? 'translate-y-0' : 'translate-y-full'
            }`}
        >
            <div className="mx-auto max-w-5xl m-3 md:m-4 bg-brutal-dark text-brutal-bg rounded-xl border-2 border-brutal-red/40 shadow-[6px_6px_0_0_rgba(196,41,30,0.4)] px-4 md:px-5 py-3 flex items-center gap-3 md:gap-4">
                <div className="flex-1 min-w-0">
                    <div className="font-heading font-bold text-sm md:text-base uppercase tracking-tight-heading truncate leading-tight">
                        {event.title}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 font-data text-[10px] text-brutal-bg/55">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                        {capacityRemaining !== null && (
                            <span className="flex items-center gap-1 tabular-nums">
                                <Users className="w-3 h-3" />
                                {capacityRemaining > 0 ? `${capacityRemaining} left` : 'Full'}
                            </span>
                        )}
                    </div>
                </div>
                {externalRsvpUrl ? (
                    <a href={externalRsvpUrl} target="_blank" rel="noreferrer">
                        <Button size="sm" className="bg-brutal-red text-brutal-bg hover:bg-brutal-bg hover:text-brutal-dark whitespace-nowrap">
                            RSVP <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                    </a>
                ) : isRegistered ? (
                    <button
                        onClick={handleUnregister}
                        disabled={actionLoading}
                        className="font-data text-[10px] text-brutal-bg/60 hover:text-brutal-red uppercase font-bold tracking-widest transition-colors whitespace-nowrap"
                    >
                        {actionLoading ? '...' : '✓ You\'re in · Cancel'}
                    </button>
                ) : event.registration_status === 'open' && (capacityRemaining === null || capacityRemaining > 0) ? (
                    user ? (
                        <Button
                            size="sm"
                            className="bg-brutal-red text-brutal-bg hover:bg-brutal-bg hover:text-brutal-dark whitespace-nowrap"
                            onClick={handleRegister}
                            disabled={actionLoading}
                        >
                            {actionLoading ? '...' : 'Register'} <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                    ) : (
                        <Link to="/login">
                            <Button size="sm" className="bg-brutal-bg text-brutal-dark hover:bg-brutal-red hover:text-brutal-bg whitespace-nowrap">
                                Log in
                            </Button>
                        </Link>
                    )
                ) : (
                    <span className="font-data text-[10px] text-brutal-bg/40 uppercase font-bold tracking-widest whitespace-nowrap">Closed</span>
                )}
            </div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════
// SHARED: Section dividers & helpers
// ════════════════════════════════════════════════════════════════

const SectionAnchor = ({ id, title, icon, dark }: { id: string; number?: string; title: string; icon?: React.ReactNode; dark?: boolean }) => (
    <div id={id} className="scroll-mt-24 mb-5">
        <div className={`w-10 h-px ${dark ? 'bg-brutal-bg/15' : 'bg-brutal-dark/15'} mb-2`} />
        <h2 className={`font-heading font-bold text-base md:text-lg uppercase tracking-tight-heading flex items-center gap-2 ${dark ? 'text-brutal-bg' : ''}`}>
            {icon} {title}
        </h2>
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

const DiscussionSection = ({ comments, user, deleteComment, handleComment, commentText, setCommentText, sectionId }: any) => (
    <section id={sectionId}>
        <SectionAnchor id={`${sectionId}-anchor`} title="Discussion" icon={<Send className="w-4 h-4 text-brutal-red" />} />

        {/* Composer — visible before the list so logged-in users always see it */}
        {user ? (
            <form onSubmit={handleComment} className="mb-5 p-3 rounded-xl border-2 border-brutal-dark/10 bg-brutal-bg flex gap-2 items-center focus-within:border-brutal-dark/30 transition-colors">
                <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Share a thought, ask a question…"
                    className="flex-1 bg-transparent px-2 py-1.5 font-data text-xs text-brutal-dark placeholder:text-brutal-dark/35 focus:outline-none"
                />
                <Button type="submit" size="sm" disabled={!commentText.trim()}>
                    <Send className="w-3 h-3 mr-1" /> Post
                </Button>
            </form>
        ) : (
            <div className="mb-5 p-3 rounded-xl border-2 border-brutal-dark/10 bg-brutal-dark/[0.03] flex items-center justify-between gap-3">
                <span className="font-data text-xs text-brutal-dark/55">Log in to join the discussion.</span>
                <Link to="/login" className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red hover:underline">Log in →</Link>
            </div>
        )}

        <div className="space-y-3">
            {comments.map((c: any) => (
                <div key={c.id} className="p-3 bg-brutal-dark/[0.03] rounded-xl border border-brutal-dark/10">
                    <div className="flex justify-between items-start mb-2">
                        <span className="font-data text-xs font-bold">{c.userName}</span>
                        <div className="flex items-center gap-2">
                            <span className="font-data text-[9px] text-brutal-dark/50">{new Date(c.created_at).toLocaleDateString()}</span>
                            {user && c.user_id === user.id && (
                                <button onClick={() => deleteComment(c.id)} className="text-brutal-red text-[9px] font-bold hover:underline">Delete</button>
                            )}
                        </div>
                    </div>
                    <p className="font-data text-xs text-brutal-dark/80 whitespace-pre-wrap">{c.content}</p>
                </div>
            ))}
            {comments.length === 0 && (
                <p className="font-data text-xs text-brutal-dark/40 text-center py-4">No comments yet. Be the first.</p>
            )}
        </div>
    </section>
);

// ════════════════════════════════════════════════════════════════
// MENTOR WEBSITE BANNER — PCBCupid-style embed of approved website
// Sits at top of main content column. If no approved website,
// renders nothing. Visual chrome matches brutalist aesthetic.
// NOTE: no Register button inside — the right sidebar owns that CTA.
// ════════════════════════════════════════════════════════════════

const EventWebsiteBanner = ({ eventId, fallback = null }: { eventId: string; fallback?: React.ReactNode }) => {
    const { data: websites, loading } = useEventWebsites(eventId);

    const website = websites && websites.length > 0 ? websites[0] : null;
    if (loading) return null;
    if (!website) return <>{fallback}</>;

    const hasHtml = !!website.html_content;
    const hasThumbnail = !!website.thumbnail_url;
    const hasFileUrl = !!website.file_url;

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
        <section>
            {/* Eyebrow */}
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-3.5 h-3.5 text-brutal-red flex-shrink-0" />
                    <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/55 truncate">
                        Event Page · by {website.host_names?.join(', ') || website.userName}
                    </span>
                </div>
                {(hasHtml || hasFileUrl) && (
                    <button
                        type="button"
                        onClick={openFullWebsite}
                        className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/55 hover:text-brutal-red flex items-center gap-1.5 flex-shrink-0"
                    >
                        Open full site <ExternalLink className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* Embedded preview frame */}
            <div className="relative w-full rounded-2xl overflow-hidden border-2 border-brutal-dark/10 bg-brutal-bg shadow-[6px_6px_0_0_rgba(196,41,30,0.15)] group">
                {hasHtml ? (
                    <div className="relative w-full" style={{ height: '62vh', maxHeight: '640px', minHeight: '380px' }}>
                        <iframe
                            srcDoc={website.html_content!}
                            title={website.title}
                            className="absolute inset-0 w-full h-full border-0 bg-brutal-bg"
                            // SECURITY: DO NOT combine `allow-scripts` with
                            // `allow-same-origin` — that combination lets the
                            // framed document remove its own sandbox attribute
                            // from the parent DOM and escape. `allow-scripts`
                            // alone is sufficient to run JS inside a unique
                            // null origin, which is what we want for
                            // untrusted, user-submitted HTML previews.
                            sandbox="allow-scripts"
                            referrerPolicy="no-referrer"
                        />
                        {/* Click-to-open overlay */}
                        <button
                            type="button"
                            onClick={openFullWebsite}
                            className="absolute inset-0 bg-brutal-dark/0 hover:bg-brutal-dark/15 transition-colors flex items-center justify-center"
                            aria-label="Open in new tab"
                        >
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-brutal-dark/85 backdrop-blur-sm text-brutal-bg px-4 py-2 rounded-lg font-data text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border border-brutal-bg/10">
                                <Maximize2 className="w-3.5 h-3.5" /> Click to open
                            </span>
                        </button>
                    </div>
                ) : hasThumbnail ? (
                    <div className="relative w-full">
                        <img src={website.thumbnail_url!} alt={website.title} className="w-full h-auto object-cover" />
                    </div>
                ) : (
                    <div className="p-8 flex items-center justify-between gap-4">
                        <div>
                            <div className="font-heading font-bold text-base uppercase tracking-tight-heading text-brutal-dark mb-1">
                                {website.title}
                            </div>
                            {website.description && (
                                <p className="font-data text-xs text-brutal-dark/60 max-w-md line-clamp-2">{website.description}</p>
                            )}
                        </div>
                        {hasFileUrl && (
                            <button
                                type="button"
                                onClick={openFullWebsite}
                                className="font-data text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg bg-brutal-dark text-brutal-bg hover:bg-brutal-red flex items-center gap-1.5 whitespace-nowrap"
                            >
                                Open <ExternalLink className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Caption strip */}
            {website.title && (hasHtml || hasThumbnail) && (
                <div className="mt-2.5 font-data text-[11px] text-brutal-dark/55">
                    <span className="font-bold text-brutal-dark/75">{website.title}</span>
                    {website.description && <> · {website.description}</>}
                </div>
            )}
        </section>
    );
};

// ════════════════════════════════════════════════════════════════
// REGISTRATION CTA (inline, not sidebar)
// ════════════════════════════════════════════════════════════════

const RegistrationCTA = ({ isRegistered, event, user, actionLoading, handleRegister, handleUnregister, capacityRemaining, customRegisterNode }: any) => {
    if (customRegisterNode) return customRegisterNode;

    return (
        <div className="bg-brutal-dark text-brutal-bg rounded-2xl p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brutal-red/10 rounded-bl-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-brutal-bg/5 rounded-tr-full pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-5">
                <div className="flex-1">
                    <h2 className="font-heading font-bold text-xl md:text-2xl uppercase tracking-tight-heading mb-2">
                        {isRegistered ? "You're In!" : "Secure Your Spot"}
                    </h2>
                    <p className="font-data text-xs md:text-sm text-brutal-bg/60 max-w-md">
                        {isRegistered
                            ? "You're registered. We'll see you there."
                            : capacityRemaining !== null
                                ? `Only ${capacityRemaining} spot${capacityRemaining !== 1 ? 's' : ''} remaining.`
                                : `${event.registration_count} makers have already joined.`
                        }
                    </p>
                </div>

                <div className="flex flex-col items-center gap-2 min-w-[180px]">
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
// HELPER: Add-to-calendar (inline ICS, no dep) — per audit F-903
// ════════════════════════════════════════════════════════════════

function formatGCalDate(d: Date) {
    // YYYYMMDDTHHMMSSZ
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function buildIcsDataUri(event: any) {
    const start = new Date(event.date);
    const end = event.end_date ? new Date(event.end_date) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const escape = (s: string) => (s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//PARAM Makerspace//Events//EN',
        'BEGIN:VEVENT',
        `UID:${event.id}@param.makerspace`,
        `DTSTAMP:${formatGCalDate(new Date())}`,
        `DTSTART:${formatGCalDate(start)}`,
        `DTEND:${formatGCalDate(end)}`,
        `SUMMARY:${escape(event.title)}`,
        `DESCRIPTION:${escape((event.tagline || '') + (event.description ? '\n' + event.description.split('---RECAP---')[0] : ''))}`,
        event.location && !event.location.startsWith('rsvp:') ? `LOCATION:${escape(event.location)}` : '',
        'END:VEVENT',
        'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines)}`;
}

function buildGoogleCalUrl(event: any) {
    const start = new Date(event.date);
    const end = event.end_date ? new Date(event.end_date) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates: `${formatGCalDate(start)}/${formatGCalDate(end)}`,
        details: (event.tagline || '') + (event.description ? '\n' + event.description.split('---RECAP---')[0] : ''),
        location: event.location && !event.location.startsWith('rsvp:') ? event.location : '',
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const AddToCalendarDropdown = ({ event }: { event: any }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const ics = buildIcsDataUri(event);
    const gcal = buildGoogleCalUrl(event);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="w-full flex items-center justify-center gap-1.5 font-data text-[10px] font-bold uppercase tracking-wider text-brutal-dark/60 hover:text-brutal-dark border border-brutal-dark/15 hover:border-brutal-dark/35 rounded-lg py-2 transition-colors bg-brutal-bg"
            >
                <Calendar className="w-3 h-3" /> Add to calendar
                <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div
                    role="menu"
                    className="absolute left-0 right-0 mt-1.5 z-30 bg-brutal-bg border-2 border-brutal-dark/15 rounded-lg shadow-[4px_4px_0_0_rgba(196,41,30,0.18)] overflow-hidden"
                >
                    <a
                        role="menuitem"
                        href={gcal}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setOpen(false)}
                        className="block px-3 py-2 font-data text-[11px] font-bold text-brutal-dark/75 hover:text-brutal-dark hover:bg-brutal-dark/5 transition-colors"
                    >
                        Google Calendar
                    </a>
                    <a
                        role="menuitem"
                        href={ics}
                        download={`${(event.title || 'event').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`}
                        onClick={() => setOpen(false)}
                        className="block px-3 py-2 font-data text-[11px] font-bold text-brutal-dark/75 hover:text-brutal-dark hover:bg-brutal-dark/5 transition-colors border-t border-brutal-dark/8"
                    >
                        Apple Calendar (.ics)
                    </a>
                    <a
                        role="menuitem"
                        href={ics}
                        download={`${(event.title || 'event').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`}
                        onClick={() => setOpen(false)}
                        className="block px-3 py-2 font-data text-[11px] font-bold text-brutal-dark/75 hover:text-brutal-dark hover:bg-brutal-dark/5 transition-colors border-t border-brutal-dark/8"
                    >
                        Outlook / .ics
                    </a>
                </div>
            )}
        </div>
    );
};

// ════════════════════════════════════════════════════════════════
// SHARED: ActionSidebar — Luma / Eventbrite-style sticky right rail
// Holds: countdown, date/time/location, capacity bar, register CTA,
//        add-to-calendar, hosts, share.
// ════════════════════════════════════════════════════════════════

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
        </aside>
    );
};

// ════════════════════════════════════════════════════════════════
// PRE-EVENT: IMMERSIVE LANDING PAGE
// ════════════════════════════════════════════════════════════════

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

// ════════════════════════════════════════════════════════════════
// MENTOR WORKSPACE — unified panel for mentors/admins
// Tabs: Page (website upload) · Registrations · Showcase Slots
// Replaces the old separate MentorControlsPanel + upload section.
// ════════════════════════════════════════════════════════════════

type MentorTab = 'page' | 'registrations' | 'slots';

const MentorControlsPanel = ({ eventId, user }: { eventId: string; user: any }) => {
    // ─── HOOKS — MUST be called unconditionally, in the same order every render ───
    const isMentorOrAdmin = !!user && (user.role === 'mentor' || user.role === 'admin');

    const [activeTab, setActiveTab] = useState<MentorTab>('page');
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [slots, setSlots] = useState<any[]>([]);
    const [loadingRegs, setLoadingRegs] = useState(false);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Pass undefined when not a mentor so the query no-ops, but the hook is still called.
    const { data: myWebsite, refetch: refetchMyWebsite } = useMyEventWebsite(isMentorOrAdmin ? eventId : undefined as any);
    const { submitWebsite, updateWebsite, deleteWebsite } = useEventWebsiteMutations();

    const fetchRegistrations = async () => {
        setLoadingRegs(true);
        const { data } = await supabase
            .from('event_registration')
            .select('id, user_id, registered_at, app_user:app_user!user_id(name, email)')
            .eq('event_id', eventId)
            .order('registered_at', { ascending: false });
        setRegistrations(data || []);
        setLoadingRegs(false);
    };

    const fetchSlots = async () => {
        setLoadingSlots(true);
        const { data } = await supabase
            .from('showcase_slot')
            .select('id, status, user_id, project:project!project_id(id, title), app_user:app_user!user_id(name)')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });
        setSlots(data || []);
        setLoadingSlots(false);
    };

    // Fetch on tab change (only when data needed). Hook is always called.
    useEffect(() => {
        if (!isMentorOrAdmin) return;
        if (activeTab === 'registrations' && registrations.length === 0 && !loadingRegs) {
            fetchRegistrations();
        }
        if (activeTab === 'slots' && slots.length === 0 && !loadingSlots) {
            fetchSlots();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, isMentorOrAdmin]);

    // ─── Now we can early-return safely (all hooks have been called) ───
    if (!isMentorOrAdmin) return null;

    const handleSlotAction = async (slotId: string, newStatus: string) => {
        setActionLoading(slotId);
        await supabase.from('showcase_slot').update({ status: newStatus }).eq('id', slotId);
        setActionLoading(null);
        fetchSlots();
    };

    const handleWebsiteSubmit = async (data: { title: string; description: string; html_content: string | null; file_url: string | null; host_names: string[]; }) => {
        if (myWebsite) {
            const { error } = await updateWebsite(myWebsite.id, {
                title: data.title,
                description: data.description || undefined,
                html_content: data.html_content || undefined,
                file_url: data.file_url || undefined,
                host_names: data.host_names,
                status: 'approved', // mentors auto-publish their own page
            } as any);
            if (error) throw new Error(error);
        } else {
            const { data: created, error } = await submitWebsite({
                event_id: eventId,
                user_id: user.id,
                title: data.title,
                description: data.description || undefined,
                html_content: data.html_content || undefined,
                file_url: data.file_url || undefined,
                host_names: data.host_names,
            });
            if (error) throw new Error(error);
            // Auto-publish: flip status to approved right after insert
            if (created?.id) {
                const { error: updErr } = await updateWebsite(created.id, { status: 'approved' } as any);
                if (updErr) throw new Error(updErr);
            }
        }
        await refetchMyWebsite();
    };

    const handleWebsiteDelete = async () => {
        if (myWebsite && deleteWebsite) {
            await deleteWebsite(myWebsite.id);
            await refetchMyWebsite();
        }
    };

    const websiteStatusLabel = myWebsite
        ? (myWebsite.status === 'approved' ? 'Live' : myWebsite.status === 'pending' ? 'Draft' : 'Rejected')
        : 'Empty';

    const tabs: { key: MentorTab; label: string; count?: number | string }[] = [
        { key: 'page', label: 'Event Page', count: websiteStatusLabel },
        { key: 'registrations', label: 'Registrations', count: registrations.length },
        { key: 'slots', label: 'Showcase Slots', count: slots.length },
    ];

    const pendingSlots = slots.filter(s => s.status === 'pending');
    const totalPending = pendingSlots.length;

    return (
        <section className="ed-section">
            {/* Header bar — always visible, not collapsible */}
            <div className="flex items-center justify-between gap-3 mb-3 px-1">
                <div className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-brutal-red" />
                    <span className="font-heading font-bold text-sm uppercase tracking-wider text-brutal-dark">Mentor Workspace</span>
                    {totalPending > 0 && (
                        <span className="bg-brutal-red text-brutal-bg text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                            {totalPending} pending
                        </span>
                    )}
                </div>
                <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/35">
                    Only you see this
                </span>
            </div>

            <div className="border-2 border-brutal-dark/10 rounded-2xl overflow-hidden bg-brutal-bg">
                {/* Tab bar */}
                <div className="flex border-b-2 border-brutal-dark/10 bg-brutal-dark/[0.03]">
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
                            {tab.count !== undefined && tab.count !== '' && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                    activeTab === tab.key ? 'bg-brutal-bg/20' : 'bg-brutal-dark/10'
                                }`}>{tab.count}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div className="p-4 md:p-5">
                    {/* PAGE (WEBSITE) TAB */}
                    {activeTab === 'page' && (
                        <div>
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <div>
                                    <h4 className="font-heading font-bold text-sm uppercase tracking-tight-heading text-brutal-dark">
                                        {myWebsite ? 'Your Event Page' : 'Set up your event page'}
                                    </h4>
                                    <p className="font-data text-[11px] text-brutal-dark/55 mt-0.5">
                                        {myWebsite
                                            ? 'This is what everyone sees at the top of the event. Updates go live immediately.'
                                            : 'Upload an HTML file with your event details — it will render at the top of this page for all visitors.'}
                                    </p>
                                </div>
                            </div>
                            <WebsiteUploadPanel
                                eventId={eventId}
                                userId={user.id}
                                userName={user.full_name || user.name || user.email || 'Mentor'}
                                existingSubmission={myWebsite || null}
                                onSubmit={handleWebsiteSubmit}
                                onDelete={myWebsite ? handleWebsiteDelete : undefined}
                                isRegistered={true}
                                mentorMode={true}
                            />
                        </div>
                    )}

                    {/* REGISTRATIONS TAB */}
                    {activeTab === 'registrations' && (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {loadingRegs ? (
                                <p className="font-data text-xs text-brutal-dark/40 text-center py-8">Loading registrations...</p>
                            ) : registrations.length === 0 ? (
                                <p className="font-data text-xs text-brutal-dark/40 text-center py-8">No registrations yet.</p>
                            ) : (
                                registrations.map((reg, i) => (
                                    <div key={reg.id} className="flex items-center justify-between py-2 px-3 bg-brutal-dark/[0.03] rounded-lg border border-brutal-dark/5">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="font-data text-[10px] text-brutal-dark/30 w-6 flex-shrink-0">{i + 1}.</span>
                                            <div className="min-w-0">
                                                <span className="font-data text-xs font-bold block truncate">{reg.app_user?.name || 'Unknown'}</span>
                                                <span className="font-data text-[10px] text-brutal-dark/40 truncate">{reg.app_user?.email}</span>
                                            </div>
                                        </div>
                                        <span className="font-data text-[9px] text-brutal-dark/30 flex-shrink-0 ml-2">
                                            {new Date(reg.registered_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* SHOWCASE SLOTS TAB */}
                    {activeTab === 'slots' && (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {loadingSlots ? (
                                <p className="font-data text-xs text-brutal-dark/40 text-center py-8">Loading slots...</p>
                            ) : slots.length === 0 ? (
                                <p className="font-data text-xs text-brutal-dark/40 text-center py-8">No slot requests yet.</p>
                            ) : (
                                slots.map(slot => (
                                    <div key={slot.id} className="flex items-center justify-between py-2 px-3 bg-brutal-dark/[0.03] rounded-lg border border-brutal-dark/5">
                                        <div className="flex-1 min-w-0">
                                            <span className="font-data text-xs font-bold block">{slot.app_user?.name || 'Unknown'}</span>
                                            <span className="font-data text-[10px] text-brutal-dark/50 block truncate">
                                                {slot.project?.title || 'No project linked'}
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
                </div>
            </div>
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
            {/* Sticky register bar — appears on scroll, hidden for past events inside component */}
            <StickyRegisterBar {...registrationProps} />
        </div>
    );
}
