import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Calendar, Users, ArrowRight, ExternalLink } from 'lucide-react';
import { Button } from '../../components/ui/Button';

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

export default StickyRegisterBar;
