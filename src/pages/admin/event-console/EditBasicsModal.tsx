import React, { useCallback, useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { Event, EventBlock } from '../../../lib/database.types';
import { BlockEditor } from '../../../components/events/BlockEditor';
import { blocksToPlainText } from '../../../components/events/EventBody';
import { useAutosave, type AutosaveStatus } from '../../../lib/useAutosave';
import { updateEvent } from '../../../lib/api/events';

/**
 * EditBasicsModal — inline editor for the event's public-page essentials.
 *
 * Mounted at /admin/events/:id/edit as a sibling route of the console.
 * Matches the ops-console contract: there is no "Save" button — edits
 * autosave on idle (800ms debounce, shared `useAutosave` hook). The
 * user hits "Done" (or ESC, or clicks the backdrop) to close.
 *
 * What we edit here:
 *   - Title, tagline, cover image URL
 *   - Date, end date, location, capacity
 *   - Registration status (open / closed)
 *   - description_blocks (via the shared <BlockEditor>)
 *
 * When description_blocks change, we also mirror them into the legacy
 * `description` TEXT column so calendar exports / OG previews keep
 * working. That mirror matches the wizard's publish path — same
 * helper (`blocksToPlainText`).
 *
 * Type-specific columns (prize_summary, speaker_name, etc.) are NOT
 * edited here — they live on their own Step-2 column space that
 * lands in Prompts 8/9/10 along with the schema to back them.
 */

interface EditBasicsModalProps {
    event: Event;
    onClose: () => void;
    /** Called after a successful autosave so the parent can refresh its copy. */
    onSaved: () => void;
}

interface EditForm {
    title: string;
    tagline: string;
    cover_image_url: string;
    date: string;       // datetime-local
    end_date: string;   // datetime-local (may be empty)
    location: string;
    capacity: string;   // string so "" means "no cap"
    registration_status: 'open' | 'closed';
    description_blocks: EventBlock[];
}

function eventToForm(e: Event): EditForm {
    return {
        title: e.title ?? '',
        tagline: e.tagline ?? '',
        cover_image_url: e.cover_image_url ?? '',
        date: toDateTimeLocal(e.date),
        end_date: toDateTimeLocal(e.end_date),
        location: e.location ?? '',
        capacity: e.capacity !== null && e.capacity !== undefined ? String(e.capacity) : '',
        registration_status: (e.registration_status === 'closed' ? 'closed' : 'open'),
        description_blocks: (e.description_blocks ?? []) as EventBlock[],
    };
}

export function EditBasicsModal({ event, onClose, onSaved }: EditBasicsModalProps) {
    const [form, setForm] = useState<EditForm>(() => eventToForm(event));
    const [validationError, setValidationError] = useState<string | null>(null);

    // ─── ESC-to-close + focus trap ───────────────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    // ─── Save handler ────────────────────────────────────────
    const saveForm = useCallback(
        async (value: EditForm): Promise<{ error?: string }> => {
            // Validate before hitting Supabase — show inline error, don't
            // thrash the DB with a doomed round-trip.
            if (!value.title.trim()) {
                setValidationError('Title is required');
                return { error: 'Title is required' };
            }
            if (!value.date) {
                setValidationError('Start date is required');
                return { error: 'Start date is required' };
            }
            if (value.end_date && Date.parse(value.end_date) < Date.parse(value.date)) {
                setValidationError('End date cannot be before start date');
                return { error: 'End date cannot be before start date' };
            }
            let capNum: number | null = null;
            if (value.capacity.trim() !== '') {
                const parsed = Number.parseInt(value.capacity, 10);
                if (!Number.isFinite(parsed) || parsed < 0) {
                    setValidationError('Capacity must be a non-negative number');
                    return { error: 'Capacity must be a non-negative number' };
                }
                capNum = parsed;
            }
            setValidationError(null);

            const updates: Partial<Event> = {
                title: value.title.trim(),
                tagline: value.tagline.trim() || null,
                cover_image_url: value.cover_image_url.trim() || null,
                date: new Date(value.date).toISOString(),
                end_date: value.end_date ? new Date(value.end_date).toISOString() : null,
                location: value.location.trim() || null,
                capacity: capNum,
                registration_status: value.registration_status,
                description_blocks: value.description_blocks,
                // Mirror to legacy description column so calendar/OG fallbacks keep working.
                description: blocksToPlainText(value.description_blocks) || null,
            };

            const { error } = await updateEvent(event.id, updates);
            if (error) return { error: error.message };
            onSaved();
            return {};
        },
        [event.id, onSaved],
    );

    const { status, lastSavedAt } = useAutosave<EditForm>({
        value: form,
        onSave: saveForm,
        delayMs: 800,
        hydrationKey: event.id,
    });

    // ─── Render ──────────────────────────────────────────────
    return (
        <div
            className="fixed inset-0 z-50 bg-brutal-dark/60 flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-basics-title"
                className="bg-brutal-bg border-2 border-brutal-dark shadow-[8px_8px_0_rgba(0,0,0,0.15)] w-full max-w-3xl my-12 max-h-[90vh] overflow-y-auto"
            >
                <header className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-4 border-b-2 border-brutal-dark bg-brutal-bg">
                    <h2 id="edit-basics-title" className="font-heading font-bold text-2xl uppercase truncate">
                        Edit basics
                    </h2>
                    <div className="flex items-center gap-3">
                        <SaveBadge status={status} savedAt={lastSavedAt} />
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 hover:bg-brutal-dark/10 rounded-full transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                <div className="p-6 space-y-6">
                    {validationError && (
                        <div className="flex items-start gap-2 p-3 border-2 border-brutal-red bg-brutal-red/5 font-data text-sm">
                            <AlertCircle className="w-4 h-4 text-brutal-red flex-shrink-0 mt-0.5" />
                            <span>{validationError}</span>
                        </div>
                    )}

                    <Field label="Title" required>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            className={inputClass}
                        />
                    </Field>

                    <Field
                        label="Tagline"
                        hint="One line shown under the title on the public page."
                    >
                        <input
                            type="text"
                            value={form.tagline}
                            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Cover image URL">
                        <input
                            type="url"
                            value={form.cover_image_url}
                            onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                            placeholder="https://…"
                            className={inputClass}
                        />
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Start" required>
                            <input
                                type="datetime-local"
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                                className={inputClass}
                            />
                        </Field>
                        <Field label="End (optional)">
                            <input
                                type="datetime-local"
                                value={form.end_date}
                                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                                className={inputClass}
                            />
                        </Field>
                    </div>

                    <Field label="Location / venue">
                        <input
                            type="text"
                            value={form.location}
                            onChange={(e) => setForm({ ...form, location: e.target.value })}
                            className={inputClass}
                        />
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Capacity" hint="Leave empty for no cap.">
                            <input
                                type="number"
                                min={0}
                                value={form.capacity}
                                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Registration">
                            <select
                                value={form.registration_status}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        registration_status: e.target.value === 'closed' ? 'closed' : 'open',
                                    })
                                }
                                className={inputClass}
                            >
                                <option value="open">Open</option>
                                <option value="closed">Closed</option>
                            </select>
                        </Field>
                    </div>

                    <div>
                        <BlockEditor
                            blocks={form.description_blocks}
                            onChange={(blocks) => setForm({ ...form, description_blocks: blocks })}
                            label="Body"
                            hint="Public description. Add headings, paragraphs, images, lists, callouts."
                        />
                    </div>
                </div>

                <footer className="sticky bottom-0 z-10 flex items-center justify-between gap-3 px-6 py-4 border-t-2 border-brutal-dark bg-brutal-bg">
                    <span className="font-data text-xs text-brutal-dark/50">
                        Changes save automatically.
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border-2 border-brutal-dark hover:bg-brutal-dark hover:text-white font-data text-sm font-bold transition-colors"
                    >
                        Done
                    </button>
                </footer>
            </div>
        </div>
    );
}

// ─── Bits ────────────────────────────────────────────────────

const inputClass =
    'w-full px-3 py-2 border-2 border-brutal-dark bg-white font-data text-sm focus:outline-none focus:border-brutal-red';

function Field({
    label,
    required,
    hint,
    children,
}: {
    label: string;
    required?: boolean;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block space-y-1">
            <div className="font-data text-xs font-bold uppercase tracking-wide text-brutal-dark/70">
                {label}
                {required && <span className="text-brutal-red ml-1">*</span>}
            </div>
            {children}
            {hint && <div className="font-data text-xs text-brutal-dark/50">{hint}</div>}
        </label>
    );
}

function SaveBadge({ status, savedAt }: { status: AutosaveStatus; savedAt: Date | null }) {
    if (status === 'saving') {
        return (
            <span className="inline-flex items-center gap-1 font-data text-xs text-brutal-dark/60">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving…
            </span>
        );
    }
    if (status === 'error') {
        return (
            <span className="inline-flex items-center gap-1 font-data text-xs text-brutal-red">
                <AlertCircle className="w-3 h-3" /> Save failed
            </span>
        );
    }
    if (status === 'saved') {
        return (
            <span className="inline-flex items-center gap-1 font-data text-xs text-green-700">
                <CheckCircle2 className="w-3 h-3" />
                {savedAt ? `Saved · ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Saved'}
            </span>
        );
    }
    return <span className="font-data text-xs text-brutal-dark/40">Idle</span>;
}

// ─── Date helpers ────────────────────────────────────────────

/** Convert an ISO or null value into the format <input type="datetime-local"> expects. */
function toDateTimeLocal(iso: string | null | undefined): string {
    if (!iso) return '';
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return '';
    const d = new Date(t);
    // yyyy-mm-ddThh:mm (local time)
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
