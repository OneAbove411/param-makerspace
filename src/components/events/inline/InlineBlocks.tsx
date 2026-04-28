import React, { useEffect, useState, useCallback } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { AutosavePill } from '../../shared/AutosavePill';
import type { AutosaveStatus } from '../../../lib/useAutosave';
import type { EventBlock } from '../../../lib/database.types';
import { BlockEditor } from '../BlockEditor';

/**
 * InlineBlocks — click-to-edit wrapper around the reusable BlockEditor
 * (P4). Rendered in read-mode by the caller (EventBody); we only take
 * over once the mentor/admin clicks "Edit".
 *
 * On save we persist `description_blocks` and also mirror a plain-text
 * derivative into the legacy `description` column so calendar / OG
 * preview consumers keep working (same mirror logic the wizard uses).
 */

interface InlineBlocksProps {
    eventId: string;
    initialBlocks: EventBlock[] | null;
    canEdit: boolean;
    readView: React.ReactNode;
    onSaved?: (blocks: EventBlock[]) => void;
}

function blocksToPlainText(blocks: EventBlock[]): string {
    return blocks
        .map((b) => {
            switch (b.type) {
                case 'heading':
                case 'paragraph':
                case 'callout':
                    return b.text;
                case 'list':
                    return b.items.join('\n');
                case 'image':
                    return b.caption || b.alt || '';
                default:
                    return '';
            }
        })
        .filter(Boolean)
        .join('\n\n');
}

export function InlineBlocks({ eventId, initialBlocks, canEdit, readView, onSaved }: InlineBlocksProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [committed, setCommitted] = useState<EventBlock[]>(initialBlocks ?? []);
    const [draft, setDraft] = useState<EventBlock[]>(initialBlocks ?? []);
    const [status, setStatus] = useState<AutosaveStatus>('idle');
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

    useEffect(() => {
        if (isEditing) return;
        const a = JSON.stringify(initialBlocks ?? []);
        const b = JSON.stringify(committed);
        if (a !== b) {
            const next = initialBlocks ?? [];
            setCommitted(next);
            setDraft(next);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialBlocks]);

    const start = useCallback(() => {
        if (!canEdit) return;
        setDraft(committed);
        setIsEditing(true);
    }, [canEdit, committed]);

    const cancel = useCallback(() => {
        setDraft(committed);
        setIsEditing(false);
    }, [committed]);

    const commit = useCallback(async () => {
        setStatus('saving');
        const plain = blocksToPlainText(draft);
        const { error } = await supabase
            .from('event')
            .update({
                description_blocks: draft,
                description: plain || null,
            })
            .eq('id', eventId);
        if (error) {
            setStatus('error');
            return;
        }
        setCommitted(draft);
        setLastSavedAt(new Date());
        setStatus('saved');
        setIsEditing(false);
        if (onSaved) onSaved(draft);
        setTimeout(() => setStatus('idle'), 2000);
    }, [draft, eventId, onSaved]);

    if (!isEditing) {
        return (
            <div className="relative group">
                {readView}
                {canEdit && (
                    <button
                        type="button"
                        onClick={start}
                        title="Edit description"
                        aria-label="Edit description"
                        className="absolute top-0 right-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded border-2 border-brutal-dark/20 bg-brutal-bg/90 text-brutal-dark/70 hover:text-brutal-dark hover:border-brutal-dark opacity-0 group-hover:opacity-100 transition-opacity font-data text-[11px] font-bold uppercase tracking-widest"
                    >
                        <Pencil className="w-3 h-3" /> Edit
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 rounded-xl border-2 border-brutal-red/40 bg-brutal-red/5">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div className="font-data text-[11px] font-bold uppercase tracking-widest text-brutal-dark/60">
                    Editing description
                </div>
                <div className="inline-flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => void commit()}
                        aria-label="Save description"
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
                </div>
            </div>
            <BlockEditor
                blocks={draft}
                onChange={setDraft}
                label=""
                hint="Changes save when you click ✓."
            />
        </div>
    );
}

export default InlineBlocks;
