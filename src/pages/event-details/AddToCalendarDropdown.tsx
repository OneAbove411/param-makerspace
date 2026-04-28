import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown } from 'lucide-react';

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
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

    // Position the menu with position: fixed so it escapes any
    // `overflow-hidden` / `overflow-auto` parent. The sidebar on the event
    // details page clips the dropdown otherwise — we saw that in the
    // screenshot where half the menu was eaten by the card border.
    const positionMenu = useCallback(() => {
        const btn = btnRef.current;
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        setMenuStyle({
            position: 'fixed',
            top: rect.bottom + 6,
            left: rect.left,
            width: rect.width,
        });
    }, []);

    useLayoutEffect(() => {
        if (!open) return;
        positionMenu();
    }, [open, positionMenu]);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            if (btnRef.current?.contains(t)) return;
            if (menuRef.current?.contains(t)) return;
            setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        const onReflow = () => positionMenu();
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        window.addEventListener('resize', onReflow);
        // `true` → catch scrolls from any ancestor (the sticky sidebar is
        // its own scroll container, so a plain window scroll listener isn't
        // enough).
        window.addEventListener('scroll', onReflow, true);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', onReflow);
            window.removeEventListener('scroll', onReflow, true);
        };
    }, [open, positionMenu]);

    const ics = buildIcsDataUri(event);
    const gcal = buildGoogleCalUrl(event);

    const menu = open ? (
        <div
            ref={menuRef}
            role="menu"
            style={menuStyle}
            className="z-[100] bg-brutal-bg border-2 border-brutal-dark/15 rounded-xl shadow-[4px_4px_0_0_rgba(196,41,30,0.2)] overflow-hidden"
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
                className="block px-3 py-2 font-data text-[11px] font-bold text-brutal-dark/75 hover:text-brutal-dark hover:bg-brutal-dark/5 transition-colors border-t border-brutal-dark/10"
            >
                Apple Calendar (.ics)
            </a>
            <a
                role="menuitem"
                href={ics}
                download={`${(event.title || 'event').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 font-data text-[11px] font-bold text-brutal-dark/75 hover:text-brutal-dark hover:bg-brutal-dark/5 transition-colors border-t border-brutal-dark/10"
            >
                Outlook / .ics
            </a>
        </div>
    ) : null;

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="w-full flex items-center justify-center gap-1.5 font-data text-[11px] font-bold uppercase tracking-wider text-brutal-dark/75 hover:text-brutal-dark border-2 border-brutal-dark/20 hover:border-brutal-dark/50 rounded-xl py-2.5 transition-colors bg-brutal-bg"
            >
                <Calendar className="w-3.5 h-3.5" /> Add to calendar
                <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {menu && typeof document !== 'undefined' ? createPortal(menu, document.body) : null}
        </>
    );
};

export default AddToCalendarDropdown;
export { formatGCalDate, buildIcsDataUri, buildGoogleCalUrl };
