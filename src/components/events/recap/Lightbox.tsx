import React, { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Lightbox — minimal keyboard-aware image viewer for the public
 * gallery. Controlled externally: parent owns `index`, we emit
 * change requests via `onClose` and `onIndexChange`.
 *
 * Keyboard: Esc closes, ← / → cycle. Click the backdrop closes.
 * Clicking the image itself does nothing so readers can drag-select.
 */

export interface LightboxProps {
    urls: string[];
    index: number;
    onClose: () => void;
    onIndexChange: (next: number) => void;
}

export function Lightbox({ urls, index, onClose, onIndexChange }: LightboxProps) {
    const total = urls.length;

    const prev = useCallback(() => {
        if (total <= 1) return;
        onIndexChange((index - 1 + total) % total);
    }, [index, total, onIndexChange]);

    const next = useCallback(() => {
        if (total <= 1) return;
        onIndexChange((index + 1) % total);
    }, [index, total, onIndexChange]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowLeft') prev();
            else if (e.key === 'ArrowRight') next();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose, prev, next]);

    if (index < 0 || index >= total) return null;
    const url = urls[index];

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={`Gallery image ${index + 1} of ${total}`}
        >
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                aria-label="Close"
            >
                <X className="w-5 h-5" />
            </button>

            {total > 1 && (
                <>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); prev(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                        aria-label="Previous image"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); next(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                        aria-label="Next image"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </>
            )}

            <img
                src={url}
                alt={`Gallery image ${index + 1} of ${total}`}
                className="max-w-[92vw] max-h-[88vh] object-contain"
                onClick={(e) => e.stopPropagation()}
            />

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white font-data text-xs tabular-nums">
                {index + 1} / {total}
            </div>
        </div>
    );
}

export default Lightbox;
