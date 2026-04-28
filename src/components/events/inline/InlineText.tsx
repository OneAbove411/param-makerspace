import React, { useEffect, useRef } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { useInlineEdit } from '../../../lib/useInlineEdit';
import { AutosavePill } from '../../shared/AutosavePill';

/**
 * InlineText — click-to-edit shell for a single-line event column.
 *
 * Used for: title, tagline, location. The `render` prop lets the
 * caller keep arbitrary read-mode typography (hero H1 vs small
 * location chip) while this shell owns the edit affordance.
 *
 * Keyboard:
 *   Enter  → commit
 *   Escape → cancel
 *
 * Blur is deliberately NOT auto-commit — users clicking the
 * checkmark is less surprising than losing focus to a tooltip and
 * silently persisting.
 */

interface InlineTextProps {
    eventId: string;
    column: 'title' | 'tagline' | 'location';
    initialValue: string | null;
    canEdit: boolean;
    placeholder?: string;
    multiline?: boolean;
    inputClassName?: string;
    render: (value: string | null) => React.ReactNode;
    onSaved?: (value: string | null) => void;
}

export function InlineText({
    eventId,
    column,
    initialValue,
    canEdit,
    placeholder,
    multiline = false,
    inputClassName = '',
    render,
    onSaved,
}: InlineTextProps) {
    const edit = useInlineEdit<string>({
        eventId,
        column,
        initialValue: initialValue ?? '',
        canEdit,
        serialize: (d) => d.trim() || null,
        onSaved: (d) => onSaved?.(d.trim() || null),
    });

    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

    useEffect(() => {
        if (edit.isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select?.();
        }
    }, [edit.isEditing]);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void edit.commit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            edit.cancel();
        }
    };

    if (!edit.isEditing) {
        return (
            <span className="relative inline-block group align-baseline">
                {render(edit.value || null)}
                {canEdit && (
                    <button
                        type="button"
                        onClick={edit.start}
                        title={`Edit ${column}`}
                        aria-label={`Edit ${column}`}
                        className="ml-2 align-middle inline-flex items-center justify-center w-7 h-7 rounded border-2 border-brutal-dark/20 bg-brutal-bg/80 text-brutal-dark/60 hover:text-brutal-dark hover:border-brutal-dark opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                )}
            </span>
        );
    }

    const sharedClass =
        'w-full rounded-lg bg-brutal-bg border-2 border-brutal-red p-2 font-data text-sm focus:outline-none';
    return (
        <span className="flex items-center gap-2 flex-wrap">
            {multiline ? (
                <textarea
                    ref={(el) => { inputRef.current = el; }}
                    value={edit.draft}
                    onChange={(e) => edit.setDraft(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    rows={2}
                    className={`${sharedClass} ${inputClassName}`}
                />
            ) : (
                <input
                    ref={(el) => { inputRef.current = el; }}
                    type="text"
                    value={edit.draft}
                    onChange={(e) => edit.setDraft(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    className={`${sharedClass} ${inputClassName}`}
                />
            )}
            <span className="inline-flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => void edit.commit()}
                    title="Save (Enter)"
                    aria-label="Save"
                    className="w-8 h-8 rounded border-2 border-brutal-dark bg-brutal-dark text-brutal-bg hover:bg-brutal-red hover:border-brutal-red inline-flex items-center justify-center"
                >
                    <Check className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={edit.cancel}
                    title="Cancel (Esc)"
                    aria-label="Cancel"
                    className="w-8 h-8 rounded border-2 border-brutal-dark/40 text-brutal-dark/60 hover:border-brutal-dark hover:text-brutal-dark inline-flex items-center justify-center"
                >
                    <X className="w-4 h-4" />
                </button>
                <AutosavePill status={edit.status} lastSavedAt={edit.lastSavedAt} idleLabel="Editing…" />
            </span>
        </span>
    );
}

export default InlineText;
