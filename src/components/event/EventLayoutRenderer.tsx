// ════════════════════════════════════════════════════════════════
// EVENT LAYOUT RENDERER + INLINE EDITOR
// ════════════════════════════════════════════════════════════════
//
// Renders an EventLayout (array of typed blocks) as the main
// content column of the event detail page. When `editing` is
// true (mentor/admin only), each block gains an inline toolbar:
// move up, move down, edit, delete. An "Add block" palette lets
// mentors insert new blocks between existing ones.
//
// Style discipline: the wrapper is layout-only. Block content
// uses the site's existing brutalist tokens. No per-event colour
// overrides — the look is system-consistent by construction.
//
// ════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
    Type, AlignLeft, Image as ImageIcon, Video, Clock, Users,
    ArrowUp, ArrowDown, Trash2, Pencil, Plus, Check, X, ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router';
import type {
    AnyBlock, EventLayout, BlockType, ScheduleItem, HeadingBlock,
    RichTextBlock, ImageBlock, VideoBlock, RegistrationBlock, ScheduleBlock,
} from '../../lib/eventLayout';
import { makeBlock, nextId } from '../../lib/eventLayout';

// ── Shared utility ───────────────────────────────────────────

function embedVideoUrl(raw: string): string | null {
    if (!raw) return null;
    try {
        const u = new URL(raw);
        // YouTube watch / youtu.be
        if (u.hostname.includes('youtube.com')) {
            const v = u.searchParams.get('v');
            if (v) return `https://www.youtube.com/embed/${v}`;
        }
        if (u.hostname === 'youtu.be') {
            return `https://www.youtube.com/embed${u.pathname}`;
        }
        if (u.hostname.includes('vimeo.com')) {
            const id = u.pathname.replace(/^\//, '').split('/')[0];
            if (id) return `https://player.vimeo.com/video/${id}`;
        }
    } catch {
        return null;
    }
    return raw; // assume direct mp4
}

// ════════════════════════════════════════════════════════════════
// BLOCK VIEW COMPONENTS (read-only)
// ════════════════════════════════════════════════════════════════

const HeadingView: React.FC<{ block: HeadingBlock }> = ({ block }) => {
    const { text, level, eyebrow } = block.data;
    const baseCls = 'font-heading font-bold uppercase tracking-tight-heading text-brutal-dark';
    return (
        <div className="mb-1">
            {eyebrow && (
                <div className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40 mb-1">
                    {eyebrow}
                </div>
            )}
            {level === 1 && <h1 className={`${baseCls} text-3xl md:text-4xl`}>{text || 'Heading'}</h1>}
            {level === 2 && <h2 className={`${baseCls} text-xl md:text-2xl`}>{text || 'Heading'}</h2>}
            {level === 3 && <h3 className={`${baseCls} text-base md:text-lg`}>{text || 'Heading'}</h3>}
        </div>
    );
};

const RichTextView: React.FC<{ block: RichTextBlock }> = ({ block }) => (
    <div className="max-w-3xl">
        <p className="font-data text-sm md:text-base text-brutal-dark/80 whitespace-pre-wrap leading-relaxed">
            {block.data.body || ''}
        </p>
    </div>
);

const ImageView: React.FC<{ block: ImageBlock }> = ({ block }) => {
    const { url, alt, caption } = block.data;
    if (!url) {
        return (
            <div className="aspect-[16/9] rounded-2xl border-2 border-dashed border-brutal-dark/15 bg-brutal-dark/[0.02] flex items-center justify-center">
                <span className="font-data text-xs text-brutal-dark/35">No image URL set</span>
            </div>
        );
    }
    return (
        <figure className="space-y-2">
            <img
                src={url}
                alt={alt || ''}
                className="w-full rounded-2xl border-2 border-brutal-dark/10 object-cover"
            />
            {caption && (
                <figcaption className="font-data text-[11px] text-brutal-dark/50 italic">{caption}</figcaption>
            )}
        </figure>
    );
};

const VideoView: React.FC<{ block: VideoBlock }> = ({ block }) => {
    const { url, caption } = block.data;
    const embed = embedVideoUrl(url || '');
    if (!embed) {
        return (
            <div className="aspect-video rounded-2xl border-2 border-dashed border-brutal-dark/15 bg-brutal-dark/[0.02] flex items-center justify-center">
                <span className="font-data text-xs text-brutal-dark/35">No video URL set</span>
            </div>
        );
    }
    const isIframe = embed.startsWith('http') && (embed.includes('youtube') || embed.includes('vimeo'));
    return (
        <figure className="space-y-2">
            <div className="aspect-video rounded-2xl overflow-hidden border-2 border-brutal-dark/10 bg-brutal-dark/5">
                {isIframe ? (
                    <iframe
                        src={embed}
                        title={caption || 'Video'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                    />
                ) : (
                    <video src={embed} controls className="w-full h-full object-contain bg-black" />
                )}
            </div>
            {caption && (
                <figcaption className="font-data text-[11px] text-brutal-dark/50 italic">{caption}</figcaption>
            )}
        </figure>
    );
};

interface RegistrationBlockRenderProps {
    registrationProps: any;
}

const RegistrationView: React.FC<{ block: RegistrationBlock } & RegistrationBlockRenderProps> = ({ block, registrationProps }) => {
    const { headline, subtext } = block.data;
    const { isRegistered, event, user, actionLoading, handleRegister, handleUnregister, capacityRemaining } = registrationProps;
    const externalRsvpUrl = event?.location?.startsWith('rsvp:') ? event.location.replace('rsvp:', '') : null;

    return (
        <div className="bg-brutal-dark text-brutal-bg rounded-2xl p-6 md:p-7 relative overflow-hidden shadow-[6px_6px_0_0_rgba(196,41,30,0.25)]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brutal-red/10 rounded-bl-full pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-5">
                <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-bold text-xl md:text-2xl uppercase tracking-tight-heading mb-1.5">
                        {isRegistered ? "You're in!" : (headline || 'Save your spot')}
                    </h3>
                    <p className="font-data text-xs md:text-sm text-brutal-bg/60 max-w-md">
                        {isRegistered
                            ? "You're registered. We'll see you there."
                            : subtext || (capacityRemaining !== null && capacityRemaining !== undefined
                                ? `${capacityRemaining} spot${capacityRemaining !== 1 ? 's' : ''} remaining.`
                                : 'Tap Register to confirm your spot.')}
                    </p>
                </div>
                <div className="flex flex-col items-stretch md:items-end gap-2 min-w-[180px]">
                    {externalRsvpUrl ? (
                        <a href={externalRsvpUrl} target="_blank" rel="noreferrer">
                            <button className="w-full bg-brutal-red text-brutal-bg px-5 py-2.5 rounded-xl font-heading font-bold text-xs uppercase tracking-wider hover:bg-brutal-bg hover:text-brutal-dark transition-all flex items-center justify-center gap-2">
                                RSVP externally <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </a>
                    ) : isRegistered ? (
                        <>
                            <div className="bg-green-500/20 border border-green-400/30 text-green-300 px-5 py-2.5 rounded-full font-data text-xs font-bold uppercase tracking-wider text-center">
                                ✓ Registered
                            </div>
                            <button
                                onClick={handleUnregister}
                                disabled={actionLoading}
                                className="font-data text-[10px] text-brutal-bg/40 hover:text-brutal-red uppercase font-bold tracking-widest transition-colors text-center"
                            >
                                {actionLoading ? 'Processing…' : 'Cancel RSVP'}
                            </button>
                        </>
                    ) : event?.registration_status === 'open' && (capacityRemaining === null || capacityRemaining === undefined || capacityRemaining > 0) ? (
                        user ? (
                            <button
                                onClick={handleRegister}
                                disabled={actionLoading}
                                className="bg-brutal-red text-brutal-bg px-5 py-2.5 rounded-xl font-heading font-bold text-xs uppercase tracking-wider hover:bg-brutal-bg hover:text-brutal-dark transition-all flex items-center justify-center gap-2"
                            >
                                {actionLoading ? 'Registering…' : 'Register now'} <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        ) : (
                            <Link to="/login">
                                <button className="w-full bg-brutal-bg text-brutal-dark px-5 py-2.5 rounded-xl font-heading font-bold text-xs uppercase tracking-wider hover:bg-brutal-red hover:text-brutal-bg transition-all">
                                    Log in to register
                                </button>
                            </Link>
                        )
                    ) : (
                        <div className="bg-brutal-bg/10 border border-brutal-bg/20 px-5 py-2.5 rounded-full font-data text-xs font-bold uppercase text-brutal-bg/50 text-center">
                            Registration closed
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ScheduleView: React.FC<{ block: ScheduleBlock }> = ({ block }) => {
    const { title, items } = block.data;
    return (
        <div>
            {title && (
                <div className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40 mb-3">
                    {title}
                </div>
            )}
            <ol className="relative border-l-2 border-brutal-dark/10 ml-2 space-y-4">
                {items.map(item => (
                    <li key={item.id} className="pl-5 relative">
                        <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-brutal-red border-2 border-brutal-bg" />
                        <div className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red mb-0.5">
                            {item.time}
                        </div>
                        <div className="font-heading font-bold text-sm md:text-base text-brutal-dark uppercase tracking-tight-heading">
                            {item.title}
                        </div>
                        {item.detail && (
                            <div className="font-data text-xs text-brutal-dark/55 mt-0.5">{item.detail}</div>
                        )}
                    </li>
                ))}
                {items.length === 0 && (
                    <li className="pl-5 font-data text-xs text-brutal-dark/35 italic">No items yet.</li>
                )}
            </ol>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════
// BLOCK EDIT FORMS (in-place)
// ════════════════════════════════════════════════════════════════

const inputCls = 'w-full bg-brutal-bg border-2 border-brutal-dark/15 focus:border-brutal-dark/40 rounded-lg px-3 py-2 font-data text-sm text-brutal-dark outline-none transition-colors';
const labelCls = 'font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/45 mb-1 block';

const HeadingEdit: React.FC<{ block: HeadingBlock; onChange: (b: HeadingBlock) => void }> = ({ block, onChange }) => (
    <div className="space-y-2.5">
        <div>
            <label className={labelCls}>Eyebrow (optional)</label>
            <input
                className={inputCls}
                value={block.data.eyebrow || ''}
                onChange={(e) => onChange({ ...block, data: { ...block.data, eyebrow: e.target.value } })}
                placeholder="e.g. Overview"
            />
        </div>
        <div>
            <label className={labelCls}>Text</label>
            <input
                className={inputCls}
                value={block.data.text}
                onChange={(e) => onChange({ ...block, data: { ...block.data, text: e.target.value } })}
            />
        </div>
        <div>
            <label className={labelCls}>Size</label>
            <div className="flex gap-1.5">
                {[1, 2, 3].map(l => (
                    <button
                        key={l}
                        type="button"
                        onClick={() => onChange({ ...block, data: { ...block.data, level: l as 1 | 2 | 3 } })}
                        className={`flex-1 font-data text-xs font-bold py-1.5 rounded-lg border-2 transition-colors ${
                            block.data.level === l
                                ? 'bg-brutal-dark text-brutal-bg border-brutal-dark'
                                : 'bg-brutal-bg text-brutal-dark/60 border-brutal-dark/15 hover:border-brutal-dark/30'
                        }`}
                    >
                        H{l}
                    </button>
                ))}
            </div>
        </div>
    </div>
);

const RichTextEdit: React.FC<{ block: RichTextBlock; onChange: (b: RichTextBlock) => void }> = ({ block, onChange }) => (
    <div>
        <label className={labelCls}>Body</label>
        <textarea
            className={`${inputCls} min-h-[140px] resize-y`}
            value={block.data.body}
            onChange={(e) => onChange({ ...block, data: { body: e.target.value } })}
        />
    </div>
);

const ImageEdit: React.FC<{ block: ImageBlock; onChange: (b: ImageBlock) => void }> = ({ block, onChange }) => (
    <div className="space-y-2.5">
        <div>
            <label className={labelCls}>Image URL</label>
            <input
                className={inputCls}
                value={block.data.url}
                onChange={(e) => onChange({ ...block, data: { ...block.data, url: e.target.value } })}
                placeholder="https://…"
            />
        </div>
        <div>
            <label className={labelCls}>Alt text</label>
            <input
                className={inputCls}
                value={block.data.alt || ''}
                onChange={(e) => onChange({ ...block, data: { ...block.data, alt: e.target.value } })}
            />
        </div>
        <div>
            <label className={labelCls}>Caption (optional)</label>
            <input
                className={inputCls}
                value={block.data.caption || ''}
                onChange={(e) => onChange({ ...block, data: { ...block.data, caption: e.target.value } })}
            />
        </div>
    </div>
);

const VideoEdit: React.FC<{ block: VideoBlock; onChange: (b: VideoBlock) => void }> = ({ block, onChange }) => (
    <div className="space-y-2.5">
        <div>
            <label className={labelCls}>Video URL</label>
            <input
                className={inputCls}
                value={block.data.url}
                onChange={(e) => onChange({ ...block, data: { ...block.data, url: e.target.value } })}
                placeholder="YouTube, Vimeo, or direct mp4 URL"
            />
        </div>
        <div>
            <label className={labelCls}>Caption (optional)</label>
            <input
                className={inputCls}
                value={block.data.caption || ''}
                onChange={(e) => onChange({ ...block, data: { ...block.data, caption: e.target.value } })}
            />
        </div>
    </div>
);

const RegistrationEdit: React.FC<{ block: RegistrationBlock; onChange: (b: RegistrationBlock) => void }> = ({ block, onChange }) => (
    <div className="space-y-2.5">
        <div className="font-data text-[10px] text-brutal-dark/50 bg-brutal-dark/5 rounded-lg px-3 py-2 border border-brutal-dark/10">
            The Register button, capacity, and state are wired automatically. You only customise the copy.
        </div>
        <div>
            <label className={labelCls}>Headline</label>
            <input
                className={inputCls}
                value={block.data.headline || ''}
                onChange={(e) => onChange({ ...block, data: { ...block.data, headline: e.target.value } })}
                placeholder="Save your spot"
            />
        </div>
        <div>
            <label className={labelCls}>Subtext</label>
            <input
                className={inputCls}
                value={block.data.subtext || ''}
                onChange={(e) => onChange({ ...block, data: { ...block.data, subtext: e.target.value } })}
                placeholder="Helper text shown beneath the headline"
            />
        </div>
    </div>
);

const ScheduleEdit: React.FC<{ block: ScheduleBlock; onChange: (b: ScheduleBlock) => void }> = ({ block, onChange }) => {
    const updateItem = (id: string, patch: Partial<ScheduleItem>) => {
        onChange({
            ...block,
            data: {
                ...block.data,
                items: block.data.items.map(i => i.id === id ? { ...i, ...patch } : i),
            },
        });
    };
    const removeItem = (id: string) => {
        onChange({
            ...block,
            data: { ...block.data, items: block.data.items.filter(i => i.id !== id) },
        });
    };
    const addItem = () => {
        onChange({
            ...block,
            data: {
                ...block.data,
                items: [...block.data.items, { id: nextId('si'), time: '', title: '', detail: '' }],
            },
        });
    };

    return (
        <div className="space-y-3">
            <div>
                <label className={labelCls}>Section title</label>
                <input
                    className={inputCls}
                    value={block.data.title || ''}
                    onChange={(e) => onChange({ ...block, data: { ...block.data, title: e.target.value } })}
                    placeholder="Schedule"
                />
            </div>
            <div className="space-y-2">
                <label className={labelCls}>Items</label>
                {block.data.items.map(item => (
                    <div key={item.id} className="p-2.5 rounded-lg bg-brutal-dark/[0.03] border border-brutal-dark/10 space-y-2">
                        <div className="grid grid-cols-[110px_1fr_auto] gap-2">
                            <input
                                className={inputCls}
                                value={item.time}
                                onChange={(e) => updateItem(item.id, { time: e.target.value })}
                                placeholder="10:00 AM"
                            />
                            <input
                                className={inputCls}
                                value={item.title}
                                onChange={(e) => updateItem(item.id, { title: e.target.value })}
                                placeholder="Title"
                            />
                            <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="w-9 h-9 rounded-lg border-2 border-brutal-dark/15 text-brutal-dark/40 hover:text-brutal-red hover:border-brutal-red/40 transition-colors flex items-center justify-center"
                                aria-label="Remove item"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <input
                            className={inputCls}
                            value={item.detail || ''}
                            onChange={(e) => updateItem(item.id, { detail: e.target.value })}
                            placeholder="Detail (optional)"
                        />
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addItem}
                    className="w-full font-data text-[11px] font-bold uppercase tracking-widest text-brutal-dark/55 hover:text-brutal-dark border-2 border-dashed border-brutal-dark/20 hover:border-brutal-dark/40 rounded-lg py-2 transition-colors flex items-center justify-center gap-1.5"
                >
                    <Plus className="w-3.5 h-3.5" /> Add item
                </button>
            </div>
        </div>
    );
};

// ════════════════════════════════════════════════════════════════
// BLOCK SHELL — wraps each block with edit controls when editing
// ════════════════════════════════════════════════════════════════

interface BlockShellProps {
    block: AnyBlock;
    index: number;
    total: number;
    editing: boolean;
    onMove: (delta: -1 | 1) => void;
    onDelete: () => void;
    onChange: (next: AnyBlock) => void;
    registrationProps: any;
}

const BlockShell: React.FC<BlockShellProps> = ({ block, index, total, editing, onMove, onDelete, onChange, registrationProps }) => {
    const [localEdit, setLocalEdit] = useState(false);
    const [draft, setDraft] = useState<AnyBlock>(block);

    // Keep draft in sync if the outer block changes (e.g. from reorder)
    React.useEffect(() => { setDraft(block); }, [block]);

    const commit = () => {
        onChange(draft);
        setLocalEdit(false);
    };
    const cancel = () => {
        setDraft(block);
        setLocalEdit(false);
    };

    const view = (() => {
        switch (block.type) {
            case 'heading': return <HeadingView block={block} />;
            case 'richtext': return <RichTextView block={block} />;
            case 'image': return <ImageView block={block} />;
            case 'video': return <VideoView block={block} />;
            case 'registration': return <RegistrationView block={block} registrationProps={registrationProps} />;
            case 'schedule': return <ScheduleView block={block} />;
        }
    })();

    if (!editing) {
        return <div className="ed-section">{view}</div>;
    }

    return (
        <div className={`ed-section group relative rounded-2xl transition-all ${localEdit ? 'ring-2 ring-brutal-red/50 bg-brutal-bg p-4 md:p-5' : 'hover:ring-2 hover:ring-brutal-dark/15 hover:bg-brutal-dark/[0.015] p-2 -m-2'}`}>
            {/* Top toolbar */}
            <div className={`flex items-center justify-between mb-2 ${localEdit ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                <div className="flex items-center gap-1">
                    <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/35 px-1.5">
                        {BLOCK_META[block.type].label}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => onMove(-1)}
                        disabled={index === 0}
                        className="w-7 h-7 rounded-md border border-brutal-dark/15 text-brutal-dark/55 hover:text-brutal-dark hover:border-brutal-dark/35 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors bg-brutal-bg"
                        aria-label="Move up"
                    >
                        <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onMove(1)}
                        disabled={index === total - 1}
                        className="w-7 h-7 rounded-md border border-brutal-dark/15 text-brutal-dark/55 hover:text-brutal-dark hover:border-brutal-dark/35 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors bg-brutal-bg"
                        aria-label="Move down"
                    >
                        <ArrowDown className="w-3 h-3" />
                    </button>
                    {localEdit ? (
                        <>
                            <button
                                type="button"
                                onClick={commit}
                                className="w-7 h-7 rounded-md bg-brutal-dark text-brutal-bg hover:bg-brutal-red flex items-center justify-center transition-colors"
                                aria-label="Save block"
                            >
                                <Check className="w-3 h-3" />
                            </button>
                            <button
                                type="button"
                                onClick={cancel}
                                className="w-7 h-7 rounded-md border border-brutal-dark/15 text-brutal-dark/55 hover:text-brutal-red hover:border-brutal-red/35 flex items-center justify-center transition-colors bg-brutal-bg"
                                aria-label="Cancel"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => setLocalEdit(true)}
                                className="w-7 h-7 rounded-md border border-brutal-dark/15 text-brutal-dark/55 hover:text-brutal-dark hover:border-brutal-dark/35 flex items-center justify-center transition-colors bg-brutal-bg"
                                aria-label="Edit block"
                            >
                                <Pencil className="w-3 h-3" />
                            </button>
                            <button
                                type="button"
                                onClick={onDelete}
                                className="w-7 h-7 rounded-md border border-brutal-dark/15 text-brutal-dark/55 hover:text-brutal-red hover:border-brutal-red/35 flex items-center justify-center transition-colors bg-brutal-bg"
                                aria-label="Delete block"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Body — view or edit form */}
            {localEdit ? (
                <div>
                    {draft.type === 'heading' && <HeadingEdit block={draft} onChange={setDraft as any} />}
                    {draft.type === 'richtext' && <RichTextEdit block={draft} onChange={setDraft as any} />}
                    {draft.type === 'image' && <ImageEdit block={draft} onChange={setDraft as any} />}
                    {draft.type === 'video' && <VideoEdit block={draft} onChange={setDraft as any} />}
                    {draft.type === 'registration' && <RegistrationEdit block={draft} onChange={setDraft as any} />}
                    {draft.type === 'schedule' && <ScheduleEdit block={draft} onChange={setDraft as any} />}
                </div>
            ) : (
                view
            )}
        </div>
    );
};

// ════════════════════════════════════════════════════════════════
// INSERTER — "+" between blocks to add new ones
// ════════════════════════════════════════════════════════════════

const BLOCK_META: Record<BlockType, { label: string; icon: React.ReactNode }> = {
    heading:      { label: 'Heading',      icon: <Type className="w-3.5 h-3.5" /> },
    richtext:     { label: 'Rich text',    icon: <AlignLeft className="w-3.5 h-3.5" /> },
    image:        { label: 'Image',        icon: <ImageIcon className="w-3.5 h-3.5" /> },
    video:        { label: 'Video',        icon: <Video className="w-3.5 h-3.5" /> },
    registration: { label: 'Registration', icon: <Users className="w-3.5 h-3.5" /> },
    schedule:     { label: 'Schedule',     icon: <Clock className="w-3.5 h-3.5" /> },
};

const BLOCK_ORDER: BlockType[] = ['heading', 'richtext', 'image', 'video', 'registration', 'schedule'];

const Inserter: React.FC<{ onInsert: (type: BlockType) => void }> = ({ onInsert }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="ed-inserter relative my-1 flex items-center justify-center">
            {!open ? (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="opacity-0 hover:opacity-100 focus:opacity-100 group-hover/stack:opacity-60 transition-opacity font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50 hover:text-brutal-red border border-dashed border-brutal-dark/20 hover:border-brutal-red/40 rounded-full px-3 py-1 flex items-center gap-1.5 bg-brutal-bg"
                >
                    <Plus className="w-3 h-3" /> Add block
                </button>
            ) : (
                <div className="w-full bg-brutal-bg border-2 border-brutal-dark/15 rounded-xl p-2 shadow-[4px_4px_0_0_rgba(196,41,30,0.15)]">
                    <div className="flex items-center justify-between mb-1.5 px-1">
                        <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45">
                            Insert block
                        </span>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="text-brutal-dark/40 hover:text-brutal-red"
                            aria-label="Close palette"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {BLOCK_ORDER.map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => { onInsert(type); setOpen(false); }}
                                className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-brutal-dark/10 hover:border-brutal-dark/30 hover:bg-brutal-dark/[0.03] transition-colors font-data text-xs font-bold text-brutal-dark/75 hover:text-brutal-dark"
                            >
                                {BLOCK_META[type].icon}
                                {BLOCK_META[type].label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ════════════════════════════════════════════════════════════════
// ROOT: EventLayoutRenderer
// ════════════════════════════════════════════════════════════════

interface EventLayoutRendererProps {
    layout: EventLayout;
    editing: boolean;
    registrationProps: any;
    onChange: (next: EventLayout) => void;
}

export const EventLayoutRenderer: React.FC<EventLayoutRendererProps> = ({ layout, editing, registrationProps, onChange }) => {
    const updateBlock = (id: string, next: AnyBlock) => {
        onChange(layout.map(b => b.id === id ? next : b));
    };
    const deleteBlock = (id: string) => {
        onChange(layout.filter(b => b.id !== id));
    };
    const moveBlock = (id: string, delta: -1 | 1) => {
        const idx = layout.findIndex(b => b.id === id);
        if (idx === -1) return;
        const target = idx + delta;
        if (target < 0 || target >= layout.length) return;
        const next = layout.slice();
        [next[idx], next[target]] = [next[target], next[idx]];
        onChange(next);
    };
    const insertBlock = (index: number, type: BlockType) => {
        const next = layout.slice();
        next.splice(index, 0, makeBlock(type));
        onChange(next);
    };

    if (layout.length === 0) {
        return (
            <div className="space-y-8 group/stack">
                <div className="rounded-2xl border-2 border-dashed border-brutal-dark/15 p-10 text-center">
                    <p className="font-data text-xs text-brutal-dark/45 mb-3">No blocks yet.</p>
                    {editing && <Inserter onInsert={(type) => insertBlock(0, type)} />}
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-8 md:space-y-10 ${editing ? 'group/stack' : ''}`}>
            {editing && <Inserter onInsert={(type) => insertBlock(0, type)} />}
            {layout.map((block, i) => (
                <React.Fragment key={block.id}>
                    <BlockShell
                        block={block}
                        index={i}
                        total={layout.length}
                        editing={editing}
                        onMove={(delta) => moveBlock(block.id, delta)}
                        onDelete={() => deleteBlock(block.id)}
                        onChange={(next) => updateBlock(block.id, next)}
                        registrationProps={registrationProps}
                    />
                    {editing && <Inserter onInsert={(type) => insertBlock(i + 1, type)} />}
                </React.Fragment>
            ))}
        </div>
    );
};
