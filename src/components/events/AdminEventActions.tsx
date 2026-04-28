import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Plus, ChevronDown, Settings, Trophy, Users, Mic2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { EVENT_TYPE_LABELS, EVENT_TYPE_SLUGS, EVENT_TYPE_TAGLINES } from '../../pages/admin/event-wizard/wizardTypes';

/**
 * AdminEventActions — mentor/admin-only shortcut strip for the public
 * Events listing page. Renders two entry points:
 *
 *   · "Add event" — dropdown exposing the three type-specific wizards
 *     (Build Challenge · Maker Meetup · Tech Tuesday). Each goes
 *     straight to /admin/events/new/<slug>.
 *   · "Manage events" — jump to the full admin list at /admin/events.
 *
 * Renders nothing for non-mentor/admin visitors (early return) so the
 * public page stays clean.
 *
 * Keeping this logic in a standalone component means the Events page
 * itself doesn't need auth wiring in its header layout.
 */

const TYPE_ICONS = {
    build_challenge: Trophy,
    maker_meetup: Users,
    tech_tuesday: Mic2,
} as const;

export function AdminEventActions() {
    const { role } = useAuth();
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on outside click / Escape.
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    if (role !== 'mentor' && role !== 'admin') return null;

    const types: Array<keyof typeof EVENT_TYPE_SLUGS> = ['build_challenge', 'maker_meetup', 'tech_tuesday'];

    return (
        <div className="flex items-center gap-2 flex-wrap" ref={menuRef}>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-brutal-red text-brutal-bg font-data text-xs font-bold uppercase tracking-wider rounded-xl border-2 border-brutal-red shadow-[3px_3px_0_0_rgba(17,17,17,0.18)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Add event
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                    <div
                        role="menu"
                        className="absolute right-0 mt-2 w-72 z-50 bg-brutal-bg border-2 border-brutal-dark rounded-xl shadow-[6px_6px_0_0_rgba(17,17,17,0.18)] overflow-hidden"
                    >
                        <div className="px-4 py-2 border-b-2 border-brutal-dark/10 font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50">
                            Choose event type
                        </div>
                        <ul className="py-1">
                            {types.map((t) => {
                                const Icon = TYPE_ICONS[t];
                                return (
                                    <li key={t}>
                                        <Link
                                            to={`/admin/events/new/${EVENT_TYPE_SLUGS[t]}`}
                                            role="menuitem"
                                            onClick={() => setOpen(false)}
                                            className="flex items-start gap-3 px-4 py-3 hover:bg-brutal-dark/5 transition-colors group"
                                        >
                                            <Icon className="w-4 h-4 mt-0.5 text-brutal-red flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-data text-sm font-bold text-brutal-dark group-hover:text-brutal-red transition-colors">
                                                    {EVENT_TYPE_LABELS[t]}
                                                </div>
                                                <div className="font-data text-[11px] text-brutal-dark/55 mt-0.5">
                                                    {EVENT_TYPE_TAGLINES[t]}
                                                </div>
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
            <Link
                to="/admin/events"
                className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-brutal-dark/30 hover:border-brutal-dark text-brutal-dark font-data text-xs font-bold uppercase tracking-wider rounded-xl bg-brutal-bg transition-colors"
            >
                <Settings className="w-3.5 h-3.5" />
                Manage
            </Link>
        </div>
    );
}

export default AdminEventActions;
