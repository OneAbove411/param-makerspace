import React, { useState, useRef, useCallback, memo } from 'react';
import { ExternalLink, Users } from 'lucide-react';
import type { EventWebsite } from '../../lib/database.types';

interface WebsiteEntry extends EventWebsite {
    userName: string;
    avatarUrl: string | null;
}

interface WebsiteShowcaseWallProps {
    websites: WebsiteEntry[];
    loading: boolean;
}

// ─── Stable style constants (avoid re-creating objects each render) ───
const IFRAME_SCALE = 0.35;
const IFRAME_PREVIEW_STYLE: React.CSSProperties = {
    transform: `scale(${IFRAME_SCALE})`,
    transformOrigin: 'top left',
    width: `${100 / IFRAME_SCALE}%`,
    height: `${100 / IFRAME_SCALE}%`,
};

const IFRAME_SUBMISSION_STYLE: React.CSSProperties = {
    transform: 'scale(0.5)',
    transformOrigin: 'top left',
    width: '200%',
    height: '200%',
};

/** Mini browser chrome for card previews */
const BrowserChrome = memo(({ children, title }: { children: React.ReactNode; title: string }) => (
    <div className="flex flex-col h-full">
        <div className="bg-brutal-dark/90 px-3 py-1.5 flex items-center gap-2 flex-shrink-0">
            <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-brutal-red/70" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/70" />
                <div className="w-2 h-2 rounded-full bg-green-500/70" />
            </div>
            <div className="flex-1 bg-brutal-dark/50 rounded px-2 py-0.5">
                <span className="font-mono text-[8px] text-brutal-bg/40 truncate block">{title || 'index.html'}</span>
            </div>
        </div>
        <div className="flex-1 overflow-hidden bg-white">
            {children}
        </div>
    </div>
));
BrowserChrome.displayName = 'BrowserChrome';

/** Opens a website submission in a new browser window/tab */
function openWebsiteInNewWindow(website: WebsiteEntry) {
    const hosts = website.host_names?.length > 0 ? website.host_names.join(' · ') : website.userName;
    const safeTitle = website.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const newWin = window.open('', '_blank');
    if (!newWin) return;

    newWin.document.open();
    newWin.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeTitle} — Param Makerspace</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1a1a1a; font-family: 'Inter', system-ui, -apple-system, sans-serif; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
  .header { display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; background: #111; border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; }
  .header-left { display: flex; align-items: center; gap: 14px; }
  .dots { display: flex; gap: 5px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; }
  .dot-r { background: rgba(239,68,68,0.7); }
  .dot-y { background: rgba(234,179,8,0.7); }
  .dot-g { background: rgba(34,197,94,0.7); }
  .title-block h1 { font-size: 13px; font-weight: 800; color: #f5f0e8; text-transform: uppercase; letter-spacing: 0.5px; }
  .hosts { font-size: 10px; color: rgba(245,240,232,0.45); font-weight: 600; margin-top: 2px; }
  .badge { background: rgba(239,68,68,0.15); color: #ef4444; font-size: 9px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid rgba(239,68,68,0.25); }
  .content { flex: 1; overflow: hidden; }
  .content iframe { width: 100%; height: 100%; border: none; }
</style>
</head>
<body>
<div class="header">
  <div class="header-left">
    <div class="dots"><div class="dot dot-r"></div><div class="dot dot-y"></div><div class="dot dot-g"></div></div>
    <div class="title-block">
      <h1>${safeTitle}</h1>
      <div class="hosts">By: ${hosts}</div>
    </div>
  </div>
  <span class="badge">Param Makerspace</span>
</div>
<div class="content">
  <iframe id="site-frame" sandbox="allow-scripts" title="${safeTitle}"></iframe>
</div>
</body>
</html>`);
    newWin.document.close();

    const frame = newWin.document.getElementById('site-frame') as HTMLIFrameElement | null;
    if (frame) {
        if (website.html_content) {
            frame.srcdoc = website.html_content;
        } else if (website.file_url) {
            frame.src = website.file_url;
        }
    }
}

/** Individual showcase card — memoized to prevent re-renders on sibling hover */
const ShowcaseCard = memo(({ website, isHovered, onHoverEnter, onHoverLeave, onClick }: {
    website: WebsiteEntry;
    isHovered: boolean;
    onHoverEnter: () => void;
    onHoverLeave: () => void;
    onClick: () => void;
}) => (
    <div
        className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-300 cursor-pointer ${
            isHovered
                ? 'border-brutal-red shadow-[6px_6px_0px_rgba(0,0,0,0.15)] translate-y-[-4px] scale-[1.02]'
                : 'border-brutal-dark/15 shadow-[4px_4px_0px_rgba(0,0,0,0.08)] hover:border-brutal-dark/30'
        }`}
        onMouseEnter={onHoverEnter}
        onMouseLeave={onHoverLeave}
        onClick={onClick}
    >
        <div className="aspect-[4/3]">
            <BrowserChrome title={website.title}>
                {website.html_content ? (
                    <iframe
                        srcDoc={website.html_content}
                        title={website.title}
                        className="w-full h-full pointer-events-none"
                        sandbox=""
                        loading="lazy"
                        style={IFRAME_PREVIEW_STYLE}
                    />
                ) : website.thumbnail_url ? (
                    <img src={website.thumbnail_url} alt={website.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-brutal-dark/5">
                        <ExternalLink className="w-8 h-8 text-brutal-dark/20" />
                    </div>
                )}
            </BrowserChrome>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-brutal-dark via-brutal-dark/90 to-transparent p-4 pt-10 transform transition-transform duration-300">
            <h4 className="font-heading font-bold text-brutal-bg text-sm uppercase tracking-tight leading-tight mb-1 line-clamp-1">
                {website.title}
            </h4>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-brutal-bg/40" />
                    <span className="font-data text-[9px] text-brutal-bg/60 font-bold uppercase tracking-wide">
                        {website.host_names?.length > 0 ? website.host_names.join(' · ') : website.userName}
                    </span>
                </div>
                <div className={`p-1.5 rounded-lg transition-all ${
                    isHovered ? 'bg-brutal-red text-brutal-bg' : 'bg-brutal-bg/10 text-brutal-bg/40'
                }`}>
                    <ExternalLink className="w-3 h-3" />
                </div>
            </div>
        </div>

        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 bg-gradient-to-tr from-transparent via-white/5 to-transparent ${
            isHovered ? 'opacity-100' : 'opacity-0'
        }`} />
    </div>
));
ShowcaseCard.displayName = 'ShowcaseCard';

export { IFRAME_PREVIEW_STYLE, IFRAME_SUBMISSION_STYLE };

export function WebsiteShowcaseWall({ websites, loading }: WebsiteShowcaseWallProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const wallRef = useRef<HTMLDivElement>(null);

    const handleCardClick = useCallback((website: WebsiteEntry) => {
        openWebsiteInNewWindow(website);
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="aspect-[4/3] bg-brutal-dark/5 rounded-xl animate-pulse border border-brutal-dark/10" />
                ))}
            </div>
        );
    }

    if (websites.length === 0) {
        return (
            <div className="p-12 bg-brutal-dark/5 border-2 border-dashed border-brutal-dark/15 rounded-xl text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-brutal-dark/10 rounded-2xl flex items-center justify-center">
                    <ExternalLink className="w-6 h-6 text-brutal-dark/30" />
                </div>
                <p className="font-data text-sm font-bold text-brutal-dark/50 uppercase">No websites showcased yet</p>
                <p className="font-data text-xs text-brutal-dark/40 mt-1">
                    Submissions will appear here once approved by mentors.
                </p>
            </div>
        );
    }

    return (
        <div ref={wallRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {websites.map((website) => (
                <ShowcaseCard
                    key={website.id}
                    website={website}
                    isHovered={hoveredId === website.id}
                    onHoverEnter={() => setHoveredId(website.id)}
                    onHoverLeave={() => setHoveredId(null)}
                    onClick={() => handleCardClick(website)}
                />
            ))}
        </div>
    );
}
