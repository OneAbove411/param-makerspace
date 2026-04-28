import React from 'react';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import type { AutosaveStatus } from '../../lib/useAutosave';

/**
 * AutosavePill — small status chip for any surface that uses
 * `useAutosave`. Renders four visual states:
 *
 *   idle    → "All changes saved"   (fades after a beat)
 *   saving  → "Saving…"             (spinner)
 *   saved   → "Saved · HH:MM"       (checkmark, with last-saved time)
 *   error   → "Save failed"         (red chip)
 *
 * Deliberately not sticky / fixed-positioned — let the caller place
 * it wherever it fits the surface (top-right of a modal, beside a
 * page title, under a CTA).
 */

interface AutosavePillProps {
    status: AutosaveStatus;
    lastSavedAt: Date | null;
    /** Optional label override while idle, e.g. "Draft · autosaves while you type". */
    idleLabel?: string;
    className?: string;
}

export function AutosavePill({
    status,
    lastSavedAt,
    idleLabel = 'All changes saved',
    className = '',
}: AutosavePillProps) {
    const time = lastSavedAt
        ? lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;

    const base = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 font-data text-[10px] font-bold uppercase tracking-widest';

    if (status === 'saving') {
        return (
            <span className={`${base} border-blue-400/40 bg-blue-500/10 text-blue-700 ${className}`}>
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving…
            </span>
        );
    }
    if (status === 'error') {
        return (
            <span className={`${base} border-brutal-red/40 bg-brutal-red/10 text-brutal-red ${className}`}>
                <AlertCircle className="w-3 h-3" />
                Save failed — retry in a moment
            </span>
        );
    }
    if (status === 'saved') {
        return (
            <span className={`${base} border-green-500/30 bg-green-500/10 text-green-700 ${className}`}>
                <Check className="w-3 h-3" />
                Saved{time ? ` · ${time}` : ''}
            </span>
        );
    }
    // idle
    return (
        <span className={`${base} border-brutal-dark/15 bg-brutal-dark/5 text-brutal-dark/55 ${className}`}>
            {idleLabel}
        </span>
    );
}

export default AutosavePill;
