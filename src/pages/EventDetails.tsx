import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router';
import { useEvent, useEventRegistration, useComments, useEventHosts } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Extracted components
import StickyRegisterBar from './event-details/StickyRegisterBar';
import PreEventPage from './event-details/PreEventPage';
import PostEventPage from './event-details/PostEventPage';
import { XPProgressStrip } from '../components/shared/XPProgressStrip';
import { WhatsNextClosure } from '../components/shared/WhatsNextClosure';

gsap.registerPlugin(ScrollTrigger);

// ════════════════════════════════════════════════════════════════
// MAIN EVENT DETAILS
// ════════════════════════════════════════════════════════════════

export function EventDetails() {
    const { id } = useParams();
    const { data: event, loading } = useEvent(id);
    const { user } = useAuth();
    const { isRegistered, register, unregister } = useEventRegistration(id);
    const {
        comments, totalCount, loading: commentsLoading, sortMode, setSortMode,
        addComment, editComment, deleteComment, toggleCommentLike, togglePin, reportComment,
    } = useComments('event', id);
    const { data: hosts } = useEventHosts(id);
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

    const isEventOwner = !!(user && event && (event as any).created_by === user.id);
    const commentsProps = {
        comments, totalCount, loading: commentsLoading, user,
        sortMode, setSortMode,
        addComment, editComment, deleteComment,
        toggleCommentLike, togglePin, reportComment,
        isTargetOwner: isEventOwner,
    };
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

            {/* Extended Action Region */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-8 bg-brutal-dark/5 border-t-2 border-brutal-dark/10">
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                    <div className="w-full md:w-auto">
                        <XPProgressStrip />
                    </div>
                </div>
                <div className="mt-8">
                    <WhatsNextClosure variant={isPast ? 'event-post' : 'event-pre'} />
                </div>
            </div>

            {/* Sticky register bar — appears on scroll, hidden for past events inside component */}
            <StickyRegisterBar {...registrationProps} />
        </div>
    );
}
