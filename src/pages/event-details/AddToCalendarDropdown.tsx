import React, { useState, useEffect, useRef } from 'react';
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

export default AddToCalendarDropdown;
export { formatGCalDate, buildIcsDataUri, buildGoogleCalUrl };
