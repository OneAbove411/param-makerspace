import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Check, X, Pencil } from 'lucide-react';

interface InlineEditInputProps {
    /** Current display value */
    value: string;
    /** Called when the user confirms a new value */
    onSave: (newValue: string) => void | Promise<void>;
    /** Optional: called if save is canceled */
    onCancel?: () => void;
    /** Placeholder for empty state */
    placeholder?: string;
    /** If true, shows the pencil icon and is editable */
    editable?: boolean;
    /** Additional className for the wrapper */
    className?: string;
}

/**
 * InlineEditInput — click-to-edit text field.
 *
 * Default state: renders the value as styled text with a pencil icon.
 * On pencil click: transforms into an input with confirm/cancel buttons.
 * On Enter: saves. On Escape: cancels.
 *
 * Designed for ManageTags inline tag renaming (replacing modal pattern).
 * Purely presentational — save logic is delegated via onSave callback.
 */
export function InlineEditInput({
    value,
    onSave,
    onCancel,
    placeholder = 'Enter value...',
    editable = true,
    className,
}: InlineEditInputProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync draft when external value changes while not editing
    useEffect(() => {
        if (!isEditing) setDraft(value);
    }, [value, isEditing]);

    // Auto-focus when entering edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const startEditing = () => {
        if (!editable) return;
        setDraft(value);
        setIsEditing(true);
    };

    const cancel = () => {
        setDraft(value);
        setIsEditing(false);
        onCancel?.();
    };

    const save = async () => {
        const trimmed = draft.trim();
        if (!trimmed || trimmed === value) {
            cancel();
            return;
        }
        setSaving(true);
        try {
            await onSave(trimmed);
            setIsEditing(false);
        } catch {
            // Keep editing on failure so user can retry
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            save();
        } else if (e.key === 'Escape') {
            cancel();
        }
    };

    if (!isEditing) {
        return (
            <span className={cn('inline-flex items-center gap-1.5 group', className)}>
                <span className="font-data text-sm text-brutal-dark">
                    {value || <span className="italic text-brutal-dark/40">{placeholder}</span>}
                </span>
                {editable && (
                    <button
                        type="button"
                        onClick={startEditing}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-brutal-dark/10 rounded transition-all"
                        aria-label={`Edit ${value}`}
                    >
                        <Pencil className="w-3 h-3 text-brutal-dark/60" />
                    </button>
                )}
            </span>
        );
    }

    return (
        <span className={cn('inline-flex items-center gap-1', className)}>
            <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={saving}
                className={cn(
                    'font-data text-sm bg-brutal-bg border-2 border-brutal-dark px-2 py-1',
                    'focus:outline-none focus:ring-2 focus:ring-brutal-red focus:ring-offset-1',
                    'transition-all duration-150',
                    saving && 'opacity-60'
                )}
                placeholder={placeholder}
            />
            <button
                type="button"
                onClick={save}
                disabled={saving}
                className="p-1 hover:bg-green-100 rounded transition-colors"
                aria-label="Save"
            >
                <Check className="w-3.5 h-3.5 text-green-600" />
            </button>
            <button
                type="button"
                onClick={cancel}
                disabled={saving}
                className="p-1 hover:bg-red-100 rounded transition-colors"
                aria-label="Cancel"
            >
                <X className="w-3.5 h-3.5 text-brutal-red" />
            </button>
        </span>
    );
}
