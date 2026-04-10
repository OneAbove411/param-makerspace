import React from 'react';
import { Globe, ExternalLink, Maximize2 } from 'lucide-react';
import { useEventWebsites } from '../../lib/hooks';

const EventWebsiteBanner = ({ eventId, fallback = null }: { eventId: string; fallback?: React.ReactNode }) => {
    const { data: websites, loading } = useEventWebsites(eventId);

    const website = websites && websites.length > 0 ? websites[0] : null;
    if (loading) return null;
    if (!website) return <>{fallback}</>;

    const hasHtml = !!website.html_content;
    const hasThumbnail = !!website.thumbnail_url;
    const hasFileUrl = !!website.file_url;

    const openFullWebsite = () => {
        if (hasHtml) {
            const w = window.open('', '_blank');
            if (w) {
                w.document.open();
                w.document.write(website.html_content!);
                w.document.close();
            }
        } else if (hasFileUrl) {
            window.open(website.file_url!, '_blank');
        }
    };

    return (
        <section>
            {/* Eyebrow */}
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-3.5 h-3.5 text-brutal-red flex-shrink-0" />
                    <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/55 truncate">
                        Event Page · by {website.host_names?.join(', ') || website.userName}
                    </span>
                </div>
                {(hasHtml || hasFileUrl) && (
                    <button
                        type="button"
                        onClick={openFullWebsite}
                        className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/55 hover:text-brutal-red flex items-center gap-1.5 flex-shrink-0"
                    >
                        Open full site <ExternalLink className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* Embedded preview frame */}
            <div className="relative w-full rounded-2xl overflow-hidden border-2 border-brutal-dark/10 bg-brutal-bg shadow-[6px_6px_0_0_rgba(196,41,30,0.15)] group">
                {hasHtml ? (
                    <div className="relative w-full" style={{ height: '62vh', maxHeight: '640px', minHeight: '380px' }}>
                        <iframe
                            srcDoc={website.html_content!}
                            title={website.title}
                            className="absolute inset-0 w-full h-full border-0 bg-brutal-bg"
                            // SECURITY: DO NOT combine `allow-scripts` with
                            // `allow-same-origin` — that combination lets the
                            // framed document remove its own sandbox attribute
                            // from the parent DOM and escape. `allow-scripts`
                            // alone is sufficient to run JS inside a unique
                            // null origin, which is what we want for
                            // untrusted, user-submitted HTML previews.
                            sandbox="allow-scripts"
                            referrerPolicy="no-referrer"
                        />
                        {/* Click-to-open overlay */}
                        <button
                            type="button"
                            onClick={openFullWebsite}
                            className="absolute inset-0 bg-brutal-dark/0 hover:bg-brutal-dark/15 transition-colors flex items-center justify-center"
                            aria-label="Open in new tab"
                        >
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-brutal-dark/85 backdrop-blur-sm text-brutal-bg px-4 py-2 rounded-lg font-data text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border border-brutal-bg/10">
                                <Maximize2 className="w-3.5 h-3.5" /> Click to open
                            </span>
                        </button>
                    </div>
                ) : hasThumbnail ? (
                    <div className="relative w-full">
                        <img src={website.thumbnail_url!} alt={website.title} className="w-full h-auto object-cover" />
                    </div>
                ) : (
                    <div className="p-8 flex items-center justify-between gap-4">
                        <div>
                            <div className="font-heading font-bold text-base uppercase tracking-tight-heading text-brutal-dark mb-1">
                                {website.title}
                            </div>
                            {website.description && (
                                <p className="font-data text-xs text-brutal-dark/60 max-w-md line-clamp-2">{website.description}</p>
                            )}
                        </div>
                        {hasFileUrl && (
                            <button
                                type="button"
                                onClick={openFullWebsite}
                                className="font-data text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg bg-brutal-dark text-brutal-bg hover:bg-brutal-red flex items-center gap-1.5 whitespace-nowrap"
                            >
                                Open <ExternalLink className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Caption strip */}
            {website.title && (hasHtml || hasThumbnail) && (
                <div className="mt-2.5 font-data text-[11px] text-brutal-dark/55">
                    <span className="font-bold text-brutal-dark/75">{website.title}</span>
                    {website.description && <> · {website.description}</>}
                </div>
            )}
        </section>
    );
};

export default EventWebsiteBanner;
