import React, { useRef, useState } from 'react';
import { Upload, X, GripVertical, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { uploadFile, deleteFile, extractPathFromUrl } from '../../../lib/storage';

/**
 * GalleryUploader — drag-drop / click-to-pick uploader for a set of
 * image URLs.
 *
 * Controlled component: the parent owns `urls` and provides `onChange`.
 * We expose three actions:
 *   - Upload: accepts image files, uploads each to 'event-gallery',
 *     appends the resulting public URL to `urls`.
 *   - Reorder: native HTML5 drag-drop on tiles.
 *   - Delete: removes the URL from the list AND attempts to delete
 *     the underlying file (silently logs if the delete fails —
 *     removing the URL is the user-visible win, orphan cleanup is
 *     secondary).
 *
 * Per-file errors (too big, wrong type, network) surface as a banner
 * without blocking uploads already in-flight.
 */

export interface GalleryUploaderProps {
    urls: string[];
    onChange: (next: string[]) => void;
    /** Scoping prefix inside the bucket so each event's files are grouped. */
    eventId: string;
    /** When false, the uploader is read-only (no pick / drop / delete). */
    canEdit?: boolean;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export function GalleryUploader({ urls, onChange, eventId, canEdit = true }: GalleryUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [isDropZoneActive, setIsDropZoneActive] = useState(false);

    // ─── Upload pipeline ───────────────────────────────────────────
    const uploadFiles = async (files: File[]) => {
        if (!files.length) return;
        setUploading(true);
        setUploadError(null);
        const next: string[] = [...urls];
        for (const file of files) {
            if (!ACCEPTED_TYPES.includes(file.type)) {
                setUploadError(`"${file.name}" isn't a supported image type (jpeg / png / webp / gif / avif).`);
                continue;
            }
            // Path layout: <eventId>/<timestamp>-<filename>. The timestamp
            // prefix dodges collisions and keeps listings sortable.
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
            const path = `${eventId}/${Date.now()}-${safeName}`;
            const { url, error } = await uploadFile('event-gallery', path, file);
            if (error || !url) {
                setUploadError(error ?? `Failed to upload "${file.name}".`);
                continue;
            }
            next.push(url);
        }
        onChange(next);
        setUploading(false);
    };

    const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const list = e.target.files ? Array.from(e.target.files) : [];
        await uploadFiles(list);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ─── Delete ────────────────────────────────────────────────────
    const handleDelete = async (i: number) => {
        const doomedUrl = urls[i];
        onChange(urls.filter((_, idx) => idx !== i));
        // Best-effort backend cleanup — if it fails we don't re-insert
        // the URL, because leaving an orphan file is better UX than
        // leaving a dead URL in the gallery.
        const path = extractPathFromUrl(doomedUrl, 'event-gallery');
        if (path) {
            const { error } = await deleteFile('event-gallery', path);
            if (error) {
                console.warn('Gallery file delete failed (orphan left behind):', error);
            }
        }
    };

    // ─── Drag-reorder ──────────────────────────────────────────────
    const handleDragStart = (i: number) => (e: React.DragEvent<HTMLDivElement>) => {
        setDragIndex(i);
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragOver = (i: number) => (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragIndex !== null && dragIndex !== i) setDragOverIndex(i);
    };
    const handleDrop = (i: number) => (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === i) {
            setDragIndex(null);
            setDragOverIndex(null);
            return;
        }
        const next = [...urls];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(i, 0, moved);
        onChange(next);
        setDragIndex(null);
        setDragOverIndex(null);
    };
    const handleDragEnd = () => {
        setDragIndex(null);
        setDragOverIndex(null);
    };

    // ─── Drop zone (for dropping files from OS) ────────────────────
    const handleZoneDragOver = (e: React.DragEvent) => {
        // Only treat as a file-drop if the drag carries files — reorder
        // drags set dragIndex and shouldn't light up the drop zone.
        if (!canEdit) return;
        if (dragIndex !== null) return;
        e.preventDefault();
        setIsDropZoneActive(true);
    };
    const handleZoneDragLeave = () => setIsDropZoneActive(false);
    const handleZoneDrop = async (e: React.DragEvent) => {
        setIsDropZoneActive(false);
        if (!canEdit) return;
        if (dragIndex !== null) return;
        const files = Array.from(e.dataTransfer.files ?? []);
        if (!files.length) return;
        e.preventDefault();
        await uploadFiles(files);
    };

    return (
        <div className="space-y-3">
            {/* Drop zone */}
            {canEdit && (
                <div
                    onDragOver={handleZoneDragOver}
                    onDragLeave={handleZoneDragLeave}
                    onDrop={handleZoneDrop}
                    className={
                        'relative border-2 border-dashed rounded-xl p-6 text-center transition-colors '
                        + (isDropZoneActive
                            ? 'border-brutal-red bg-brutal-red/5'
                            : 'border-brutal-dark/20 hover:border-brutal-dark/40')
                    }
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_TYPES.join(',')}
                        multiple
                        onChange={handleFilePick}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploading}
                    />
                    <Upload className="w-6 h-6 mx-auto text-brutal-dark/40 mb-2" />
                    <div className="font-data text-sm font-bold text-brutal-dark">
                        {uploading ? 'Uploading…' : 'Drop images here or click to pick'}
                    </div>
                    <div className="font-data text-[11px] text-brutal-dark/50 mt-1">
                        JPEG, PNG, WEBP, GIF, AVIF · up to 10 MB each
                    </div>
                </div>
            )}

            {uploadError && (
                <div className="flex items-start gap-2 p-3 border-2 border-brutal-red/40 bg-brutal-red/5 rounded-lg font-data text-sm text-brutal-red">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{uploadError}</span>
                </div>
            )}

            {/* Tile grid */}
            {urls.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {urls.map((url, i) => {
                        const isDragTarget = dragOverIndex === i && dragIndex !== null && dragIndex !== i;
                        return (
                            <div
                                key={`${url}-${i}`}
                                draggable={canEdit}
                                onDragStart={handleDragStart(i)}
                                onDragOver={handleDragOver(i)}
                                onDrop={handleDrop(i)}
                                onDragEnd={handleDragEnd}
                                className={
                                    'relative aspect-square rounded-lg overflow-hidden border-2 group '
                                    + (isDragTarget ? 'border-brutal-red ring-2 ring-brutal-red/30' : 'border-brutal-dark/10')
                                }
                            >
                                <img
                                    src={url}
                                    alt={`Gallery image ${i + 1}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                                {canEdit && (
                                    <>
                                        <div className="absolute top-1 left-1 w-6 h-6 rounded bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                                            <GripVertical className="w-3 h-3" />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { void handleDelete(i); }}
                                            className="absolute top-1 right-1 w-6 h-6 rounded bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-brutal-red transition-all"
                                            aria-label="Delete image"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </>
                                )}
                                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white font-data text-[9px] font-bold tabular-nums">
                                    {i + 1}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-brutal-dark/10 rounded-lg font-data text-xs text-brutal-dark/45">
                    <ImageIcon className="w-4 h-4" /> No images yet.
                </div>
            )}
        </div>
    );
}

export default GalleryUploader;
