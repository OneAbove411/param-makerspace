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
