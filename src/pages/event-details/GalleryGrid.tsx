import React, { useState } from 'react';
import { Lightbox } from '../../components/events/recap/Lightbox';

/**
 * GalleryGrid — public post-event image grid.
 *
 * Click any tile to open the in-app Lightbox. Kept controlled by
 * local state so callers don't need to manage lightbox plumbing.
 */

const GalleryGrid = ({ urls }: { urls: string[] }) => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    if (!urls || urls.length === 0) return null;

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {urls.map((url, i) => (
                    <button
                        key={`${url}-${i}`}
                        type="button"
                        onClick={() => setActiveIndex(i)}
                        className="aspect-[4/3] rounded-xl overflow-hidden border-2 border-brutal-dark/10 hover:border-brutal-red/40 transition-colors group cursor-pointer"
                        aria-label={`Open gallery image ${i + 1}`}
                    >
                        <img
                            src={url}
                            alt={`Gallery ${i + 1}`}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    </button>
                ))}
            </div>

            {activeIndex !== null && (
                <Lightbox
                    urls={urls}
                    index={activeIndex}
                    onClose={() => setActiveIndex(null)}
                    onIndexChange={setActiveIndex}
                />
            )}
        </>
    );
};

export default GalleryGrid;
