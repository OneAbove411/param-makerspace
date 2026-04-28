import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { AutosavePill } from '../../shared/AutosavePill';
import type { AutosaveStatus } from '../../../lib/useAutosave';

/**
 * InlineDateRange — click-to-edit for event.date + event.end_date.
 *
 * We commit both columns together because the wizard treats them
 * as a pair (end_date defaults to date+2h, and validation is
 * end_date >= date). Separate inline edits would let users save a
 * temporarily-inverted range.
 *
 * Input surface: two `datetime-local` inputs stacked. End is
 * optional — clearing it writes NULL (legitimate for single-point
 * events like Tech Tuesdays).
 */

interface InlineDateRangeProps {
    eventId: string;
    initialStart: string | null; // ISO
    initialEnd: string | null;   // ISO
    canEdit: boolean;
    render: (start: string | null, end: string | null) => React.ReactNode;
    onSaved?: (start: string | null, end: string | null) => void;
}

/** ISO → value attribute for <input type=datetime-local> (local tz). */
function toLocalInput(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    // datetime-local expects "YYYY-MM-DDTHH:MM", no timezone suffix.
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** value attribute → ISO string (assumes local tz). */
function fromLocalInput(local: string): string | null {
    if (!local) return null;
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
}

export function InlineDateRange({
    eventId,
    initialStart,
    initialEnd,
    canEdit,
    render,
    onSaved,
}: InlineDateRangeProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [start, setStart] = useState<string | null>(initialStart);
    const [end, setEnd] = useState<string | null>(initialEnd);
    const [draftStart, setDraftStart] = useState(toLocalInput(initialStart));
    const [draftEnd, setDraftEnd] = useState(toLocalInput(initialEnd));
    const [status, setStatus] = useState<AutosaveStatus>('idle');
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const firstInputRef = useRef<HTMLInputElement | null>(null);

    // Resync from the parent when it refetches (only while read-mode so
    // we don't stomp an active draft).
    useEffect(() => {
        if (isEditing) return;
        setStart(initialStart);
        setEnd(initialEnd);
        setDraftStart(toLocalInput(initialStart));
        setDraftEnd(toLocalInput(initialEnd));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialStart, initialEnd]);

    useEffect(() => {
        if (isEditing) firstInputRef.current?.focus();
    }, [isEditing]);

    const startEdit = useCallback(() => {
        if (!canEdit) return;
        setDraftStart(toLocalInput(start));
        setDraftEnd(toLocalInput(end));
        setErrorMsg(null);
        setIsEditing(true);
    }, [canEdit, start, end]);

    const cancel = useCallback(() => {
        setDraftStart(toLocalInput(start));
        setDraftEnd(toLocalInput(end));
        setErrorMsg(null);
        setIsEditing(false);
    }, [start, end]);

    const commit = useCallback(async () => {
        const startIso = fromLocalInput(draftStart);
        const endIso = fromLocalInput(draftEnd);
        if (!startIso) {
            setErrorMsg('Start date is required.');
            return;
        }
        if (endIso && new Date(endIso).getTime() < new Date(startIso).getTime()) {
            setErrorMsg('End must be on or after start.');
            return;
        }
        setErrorMsg(null);
        setStatus('saving');
        const { error } = await supabase
            .from('event')
            .update({ date: startIso, end_date: endIso })
            .eq('id', eventId);
        if (error) {
            setStatus('error');
            return;
        }
        setStart(startIso);
        setEnd(endIso);
        setLastSavedAt(new Date());
        setStatus('saved');
        setIsEditing(false);
        if (onSaved) onSaved(startIso, endIso);
        setTimeout(() => setStatus('idle'), 2000);
    }, [draftStart, draftEnd, eventId, onSaved]);

    if (!isEditing) {
        return (
            <span className="relative inline-flex items-center gap-2 group">
                {render(start, end)}
                {canEdit && (
                    <button
                        type="button"
                        onClick={startEdit}
                        title="Edit date"
                        aria-label="Edit date"
                        className="inline-flex items-center justify-center w-7 h-7 rounded border-2 border-brutal-dark/20 bg-brutal-bg/80 text-brutal-dark/60 hover:text-brutal-dark hover:border-brutal-dark opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                )}
            </span>
        );
    }

    const inputClass =
        'rounded-lg bg-brutal-bg border-2 border-brutal-red px-2 py-1.5 font-data text-sm focus:outline-none';

    return (
        <div className="inline-flex flex-wrap items-center gap-2 p-3 rounded-lg bg-brutal-dark/5 border-2 border-brutal-dark/10">
            <label className="flex flex-col gap-1">
                <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50">Start</span>
                <input
                    ref={firstInputRef}
                    type="datetime-local"
                    value={draftStart}
                    onChange={(e) => setDraftStart(e.target.value)}
                    className={inputClass}
                />
            </label>
            <label className="flex flex-col gap-1">
                <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50">End (optional)</span>
                <input
                    type="datetime-local"
                    value={draftEnd}
                    onChange={(e) => setDraftEnd(e.target.value)}
                    className={inputClass}
                />
            </label>
            <span className="inline-flex items-center gap-1 pt-5">
                <button
                    type="button"
                    onClick={() => void commit()}
                    aria-label="Save dates"
                    className="w-8 h-8 rounded border-2 border-brutal-dark bg-brutal-dark text-brutal-bg hover:bg-brutal-red hover:border-brutal-red inline-flex items-center justify-center"
                >
                    <Check className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={cancel}
                    aria-label="Cancel"
                    className="w-8 h-8 rounded border-2 border-brutal-dark/40 text-brutal-dark/60 hover:border-brutal-dark hover:text-brutal-dark inline-flex items-center justify-center"
                >
                    <X className="w-4 h-4" />
                </button>
                <AutosavePill status={status} lastSavedAt={lastSavedAt} idleLabel="Editing…" />
            </span>
            {errorMsg && (
                <div className="basis-full font-data text-[11px] font-bold text-brutal-red mt-1">
                    {errorMsg}
                </div>
            )}
        </div>
    );
}

export default InlineDateRange;
