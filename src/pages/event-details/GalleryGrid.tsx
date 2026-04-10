import React from 'react';

const GalleryGrid = ({ urls }: { urls: string[] }) => {
    if (!urls || urls.length === 0) return null;
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {urls.map((url, i) => (
                <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden border-2 border-brutal-dark/10 hover:border-brutal-red/40 transition-colors group cursor-pointer">
                    <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
            ))}
        </div>
    );
};

export default GalleryGrid;
