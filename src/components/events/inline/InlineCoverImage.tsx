import React, { useRef, useState, useCallback } from 'react';
import { ImagePlus, Trash2, Loader2 } from 'lucide-react';
import { uploadFile, deleteFile, extractPathFromUrl } from '../../../lib/storage';
import { supabase } from '../../../lib/supabase';
import { AutosavePill } from '../../shared/AutosavePill';
import type { AutosaveStatus } from '../../../lib/useAutosave';

/**
 * InlineCoverImage — hover-to-reveal editor overlay for the hero
 * cover image on the public event page. Mentors/admins see two
 * actions on hover: "Replace" (file picker) and "Remove". Everyone
 * else sees just the image.
 *
 * Upload target: the `event-images` bucket (already used by the
 * wizard). Path layout: `${eventId}/cover-<timestamp>-<name>`.
 *
 * Component is a positioned overlay — it's meant to be mounted
 * inside whatever container already renders the <img>, absolutely
 * positioned to cover it.
 */

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

interface InlineCoverImageProps {
    eventId: string;
    currentUrl: string | null;
    canEdit: boolean;
    onSaved?: (url: string | null) => void;
}

export function InlineCoverImage({ eventId, currentUrl, canEdit, onSaved }: InlineCoverImageProps) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState<AutosaveStatus>('idle');
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const writeCover = useCallback(async (url: string | null) => {
        setStatus('saving');
        const { error } = await supabase
            .from('event')
            .update({ cover_image_url: url })
            .eq('id', eventId);
        if (error) {
            setStatus('error');
            setErrorMsg(error.message);
            return false;
        }
        setLastSavedAt(new Date());
        setStatus('saved');
        onSaved?.(url);
        setTimeout(() => setStatus('idle'), 2000);
        return true;
    }, [eventId, onSaved]);

    const handleReplace = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setErrorMsg(null);
        if (!ACCEPTED_TYPES.includes(file.type)) {
            setErrorMsg('Unsupported image type (use jpeg, png, webp, gif, avif).');
            if (fileRef.current) fileRef.current.value = '';
            return;
        }
        setStatus('saving');
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
        const path = `${eventId}/cover-${Date.now()}-${safeName}`;
        const { url, error } = await uploadFile('event-images', path, file);
        if (fileRef.current) fileRef.current.value = '';
        if (error || !url) {
            setStatus('error');
            setErrorMsg(error ?? 'Upload failed.');
            return;
        }
        // Persist the new URL first, THEN try to clean up the old file.
        const ok = await writeCover(url);
        if (ok && currentUrl) {
            const oldPath = extractPathFromUrl(currentUrl, 'event-images');
            if (oldPath) {
                const { error: delErr } = await deleteFile('event-images', oldPath);
                if (delErr) {
                    // Non-fatal — leave the orphan file rather than revert the URL.
                    console.warn('Old cover-image cleanup failed:', delErr);
                }
            }
        }
    }, [currentUrl, eventId, writeCover]);

    const handleRemove = useCallback(async () => {
        setErrorMsg(null);
        const ok = await writeCover(null);
        if (ok && currentUrl) {
            const oldPath = extractPathFromUrl(currentUrl, 'event-images');
            if (oldPath) {
                const { error: delErr } = await deleteFile('event-images', oldPath);
                if (delErr) {
                    console.warn('Cover-image removal cleanup failed:', delErr);
                }
            }
        }
    }, [currentUrl, writeCover]);

    if (!canEdit) return null;

    return (
        <div className="absolute top-24 md:top-28 right-4 md:right-6 z-20 flex items-center gap-2">
            <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                className="hidden"
                onChange={handleReplace}
            />
            <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={status === 'saving'}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brutal-bg/95 hover:bg-brutal-bg text-brutal-dark font-data text-[11px] font-bold uppercase tracking-wider border-2 border-brutal-dark/15 shadow-[2px_2px_0_0_rgba(17,17,17,0.25)] backdrop-blur-sm transition-all disabled:opacity-50"
            >
                {status === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                {currentUrl ? 'Replace' : 'Upload cover'}
            </button>
            {currentUrl && (
                <button
                    type="button"
                    onClick={() => void handleRemove()}
                    disabled={status === 'saving'}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brutal-red text-brutal-bg hover:bg-brutal-dark font-data text-[11px] font-bold uppercase tracking-wider border-2 border-brutal-red hover:border-brutal-dark shadow-[2px_2px_0_0_rgba(17,17,17,0.25)] backdrop-blur-sm transition-all disabled:opacity-50"
                >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
            )}
            <AutosavePill status={status} lastSavedAt={lastSavedAt} idleLabel="Cover" />
            {errorMsg && (
                <span className="absolute top-12 right-0 mt-1 px-2 py-1 rounded bg-brutal-red text-white font-data text-[10px] max-w-xs">
                    {errorMsg}
                </span>
            )}
        </div>
    );
}

export default InlineCoverImage;
