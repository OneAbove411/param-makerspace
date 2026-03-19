// ─── Extract YouTube video ID from any YouTube URL format ───
function extractYoutubeId(url: string): string | null {
    // youtube.com/watch?v=VIDEO_ID (with optional extra params)
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return watchMatch[1];
    // youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];
    // youtube.com/shorts/VIDEO_ID
    const shortsMatch = url.match(/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];
    // youtube.com/embed/VIDEO_ID
    const embedMatch = url.match(/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
    return null;
}

export function getEmbedUrl(url: string): string {
    // YouTube — always extract ID and build a clean embed URL
    const ytId = extractYoutubeId(url);
    if (ytId) return `https://www.youtube.com/embed/${ytId}`;
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
}

export function isValidVideoUrl(url: string): boolean {
    return extractYoutubeId(url) !== null || /vimeo\.com\/\d+/.test(url);
}

export function getYoutubeThumbnail(url: string): string | null {
    const id = extractYoutubeId(url);
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    return null;
}
