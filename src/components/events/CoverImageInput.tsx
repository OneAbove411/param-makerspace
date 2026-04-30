import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { uploadFile } from '../../lib/storage';

/**
 * CoverImageInput — combo field for the event wizard / EditBasicsModal.
 *
 * Why this exists:
 *   The original wizard exposed a bare URL <input>. Admins were copy-
 *   pasting Luma image URLs that hot-link-block, which rendered as a
 *   broken-image placeholder + alt text on the public page. There was
 *   no way to upload an image directly from the wizard — that flow only
 *   appeared *after* publish (InlineCoverImage on the live page).
 *
 *   This component closes that gap: in one control the admin can either
 *   upload a file (which goes to the `event-images` Supabase Storage
 *   bucket) OR paste an existing URL. Whichever path completes last
 *   wins; the resulting URL string is reported via onChange and the
 *   parent stays the source of truth.
 *
 * Notes:
 *   - The bucket `event-images` must exist + be public, with mentor/admin
 *     INSERT/UPDATE/DELETE policies. See misc/sql/supabase-schema.sql §12
 *     and the new migration `event-images-bucket.sql`.
 *   - A live thumbnail is rendered when the URL resolves so admins can
 *     see hot-link blocks (broken thumb) before publishing.
 *   - Path layout: `${userId}/cover-${ts}-${safeName}` so files are
 *     namespaced by uploader (matches RLS policies that key off auth.uid).
 */

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

interface CoverImageInputProps {
    value: string;
    onChange: (url: string) => void;
    /** Pass the current admin's id; the upload path namespaces by it. */
    userId: string | null | undefined;
    /** Optional id-namespace (e.g. 'event/<id>') for organisation. */
    pathPrefix?: string;
    label?: string;
    required?: boolean;
}

export function CoverImageInput({
    value,
    onChange,
    userId,
    pathPrefix,
    label = 'Cover image',
    required = false,
}: CoverImageInputProps) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Fingerprint we update when an upload succeeds — used to bust the
    // <img> cache so a second upload to the same path (upsert: true)
    // is reflected immediately in the preview.
    const [previewKey, setPreviewKey] = useState(0);

    const handleFile = async (file: File) => {
        setError(null);
        if (!ACCEPTED_TYPES.includes(file.type)) {
            setError('Unsupported image type (use jpeg, png, webp, gif, avif).');
            return;
        }
        if (!userId) {
            setError('You must be signed in to upload.');
            return;
        }
        setUploading(true);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
        const prefix = pathPrefix ?? userId;
        const path = `${prefix}/cover-${Date.now()}-${safeName}`;
        const { url, error: upErr } = await uploadFile('event-images', path, file);
        setUploading(false);
        if (fileRef.current) fileRef.current.value = '';
        if (upErr || !url) {
            setError(upErr ?? 'Upload failed.');
            return;
        }
        onChange(url);
        setPreviewKey((k) => k + 1);
    };

    const handlePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) void handleFile(f);
    };

    const clear = () => {
        onChange('');
        setError(null);
    };

    return (
        <div>
            <label className="font-data text-sm font-bold text-brutal-dark block mb-1">
                {label}
                {required && <span className="text-brutal-red ml-0.5">*</span>}
            </label>

            <div className="flex flex-col gap-2">
                {/* URL field */}
                <div className="flex items-center gap-2">
                    <input
                        type="url"
                        placeholder="Paste image URL or upload below…"
                        className="flex-1 h-10 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-3 font-data text-sm focus:border-brutal-red focus:outline-none"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                    />
                    {value && (
                        <button
                            type="button"
                            onClick={clear}
                            className="inline-flex items-center justify-center w-10 h-10 rounded border-2 border-brutal-dark/20 text-brutal-dark/60 hover:text-brutal-red hover:border-brutal-red"
                            title="Clear URL"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Upload action */}
                <div className="flex items-center gap-2">
                    <input
                        ref={fileRef}
                        type="file"
                        accept={ACCEPTED_TYPES.join(',')}
                        className="hidden"
                        onChange={handlePicked}
                    />
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-brutal-dark text-brutal-bg hover:bg-brutal-red font-data text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                    >
                        {uploading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <ImagePlus className="w-3.5 h-3.5" />
                        )}
                        {value ? 'Replace from device' : 'Upload from device'}
                    </button>
                    {value && (
                        <button
                            type="button"
                            onClick={clear}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded border-2 border-brutal-dark/15 text-brutal-dark/70 hover:text-brutal-red hover:border-brutal-red font-data text-[11px] font-bold uppercase tracking-wider"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                    )}
                </div>

                {/* Live preview — also surfaces hot-link blocks before publish */}
                {value && (
                    <div className="border-2 border-brutal-dark/10 rounded-lg overflow-hidden bg-brutal-dark/5 max-w-xs">
                        <img
                            key={previewKey}
                            src={value}
                            alt="Cover preview"
                            className="w-full h-auto block"
                            onError={() =>
                                setError(
                                    'Image failed to load. Some sites (e.g. Luma) block hot-linking — upload from your device instead.',
                                )
                            }
                            onLoad={() => setError(null)}
                        />
                    </div>
                )}

                {error && (
                    <p className="font-data text-[11px] text-brutal-red">{error}</p>
                )}
            </div>
        </div>
    );
}

export default CoverImageInput;
