export function getEmbedUrl(url: string): string {
    if (url.includes('youtube.com/watch?v=')) {
        return url.replace('watch?v=', 'embed/');
    }
    if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes('vimeo.com/')) {
        return url.replace('vimeo.com/', 'player.vimeo.com/video/');
    }
    return url;
}

export function isValidVideoUrl(url: string): boolean {
    return (
        url.includes('youtube.com/watch') ||
        url.includes('youtu.be/') ||
        url.includes('youtube.com/shorts/') ||
        url.includes('vimeo.com/')
    );
}

export function getYoutubeThumbnail(url: string): string | null {
    // youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch) return `https://img.youtube.com/vi/${shortMatch[1]}/hqdefault.jpg`;
    // youtube.com/watch?v=VIDEO_ID
    const longMatch = url.match(/[?&]v=([^?&]+)/);
    if (longMatch) return `https://img.youtube.com/vi/${longMatch[1]}/hqdefault.jpg`;
    // youtube.com/shorts/VIDEO_ID
    const shortsMatch = url.match(/shorts\/([^?&]+)/);
    if (shortsMatch) return `https://img.youtube.com/vi/${shortsMatch[1]}/hqdefault.jpg`;
    return null;
}
