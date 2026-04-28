import React, { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Type, AlignLeft, Image as ImageIcon, List as ListIcon, Info } from 'lucide-react';
import type { EventBlock } from '../../lib/database.types';

/**
 * BlockEditor — minimal structured body editor.
 *
 * The editor renders a vertical stack of block cards. Each card shows:
 *   - a compact type label (so authors always know what they are editing)
 *   - the editable field(s) for that block
 *   - move up / move down / delete buttons
 *
 * We deliberately do NOT ship a rich-text toolbar. The only formatting
 * per block is its type — everything else is plaintext, which keeps the
 * public renderer safe (no HTML injection) and the author decisions
 * cheap (no "why doesn't my bold stick?" bug reports).
 *
 * The editor reports changes via onChange(nextBlocks). The parent owns
 * the state — this component is controlled.
 */

export interface BlockEditorProps {
    blocks: EventBlock[];
    onChange: (blocks: EventBlock[]) => void;
    /** Shown above the blocks stack. Falls back to a neutral label. */
    label?: string;
    /** Optional hint copy shown under the label. */
    hint?: string;
}

const BLOCK_MENU: { kind: EventBlock['type']; label: string; icon: React.ComponentType<{ className?: string }>; factory: () => EventBlock }[] = [
    {
        kind: 'heading',
        label: 'Heading',
        icon: Type,
        factory: () => ({ type: 'heading', level: 2, text: '' }),
    },
    {
        kind: 'paragraph',
        label: 'Paragraph',
        icon: AlignLeft,
        factory: () => ({ type: 'paragraph', text: '' }),
    },
    {
        kind: 'image',
        label: 'Image',
        icon: ImageIcon,
        factory: () => ({ type: 'image', url: '', alt: '', caption: '' }),
    },
    {
        kind: 'list',
        label: 'List',
        icon: ListIcon,
        factory: () => ({ type: 'list', ordered: false, items: [''] }),
    },
    {
        kind: 'callout',
        label: 'Callout',
        icon: Info,
        factory: () => ({ type: 'callout', variant: 'info', text: '' }),
    },
];

export function BlockEditor({ blocks, onChange, label = 'Body', hint }: BlockEditorProps) {
    const [menuOpen, setMenuOpen] = useState(false);

    const addBlock = (kind: EventBlock['type']) => {
        const factory = BLOCK_MENU.find((b) => b.kind === kind)?.factory;
        if (!factory) return;
        onChange([...blocks, factory()]);
        setMenuOpen(false);
    };

    const updateBlock = (i: number, next: EventBlock) => {
        const copy = [...blocks];
        copy[i] = next;
        onChange(copy);
    };

    const deleteBlock = (i: number) => {
        onChange(blocks.filter((_, idx) => idx !== i));
    };

    const moveBlock = (i: number, dir: -1 | 1) => {
        const target = i + dir;
        if (target < 0 || target >= blocks.length) return;
        const copy = [...blocks];
        [copy[i], copy[target]] = [copy[target], copy[i]];
        onChange(copy);
    };

    return (
        <div className="space-y-3">
            <div>
                <label className="font-data text-sm font-bold text-brutal-dark block">{label}</label>
                {hint && <p className="font-data text-[11px] text-brutal-dark/50 mt-0.5">{hint}</p>}
            </div>

            {blocks.length === 0 && (
                <div className="p-6 bg-brutal-dark/[0.03] border-2 border-dashed border-brutal-dark/15 rounded-xl text-center font-data text-xs text-brutal-dark/40">
                    No content yet. Add a block below.
                </div>
            )}

            {blocks.map((block, i) => (
                <BlockCard
                    key={i}
                    index={i}
                    total={blocks.length}
                    block={block}
                    onChange={(next) => updateBlock(i, next)}
                    onMove={(dir) => moveBlock(i, dir)}
                    onDelete={() => deleteBlock(i)}
                />
            ))}

            {/* Add block button + menu */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-brutal-dark/20 hover:border-brutal-red hover:bg-brutal-red/5 rounded-xl font-data text-xs font-bold uppercase tracking-tight transition-colors"
                >
                    <Plus className="w-4 h-4" /> Add block
                </button>
                {menuOpen && (
                    <div className="mt-2 p-1.5 bg-white border-2 border-brutal-dark rounded-xl shadow-[4px_4px_0_0_rgba(17,17,17,1)] flex flex-wrap gap-1">
                        {BLOCK_MENU.map(({ kind, label, icon: Icon }) => (
                            <button
                                key={kind}
                                type="button"
                                onClick={() => addBlock(kind)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 font-data text-xs font-bold hover:bg-brutal-dark/5 rounded-lg"
                            >
                                <Icon className="w-3.5 h-3.5" /> {label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Per-block card ────────────────────────────────────────────────

interface BlockCardProps {
    index: number;
    total: number;
    block: EventBlock;
    onChange: (next: EventBlock) => void;
    onMove: (dir: -1 | 1) => void;
    onDelete: () => void;
}

function BlockCard({ index, total, block, onChange, onMove, onDelete }: BlockCardProps) {
    return (
        <div className="p-3 bg-white border-2 border-brutal-dark/10 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
                <span className="bg-brutal-dark/5 text-brutal-dark/60 text-[9px] font-data font-bold px-2 py-0.5 rounded uppercase tracking-widest">
                    {block.type}
                </span>
                <div className="ml-auto flex gap-1">
                    <button
                        type="button"
                        onClick={() => onMove(-1)}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-brutal-dark/5 disabled:opacity-30"
                        aria-label="Move up"
                    >
                        <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onMove(1)}
                        disabled={index === total - 1}
                        className="p-1 rounded hover:bg-brutal-dark/5 disabled:opacity-30"
                        aria-label="Move down"
                    >
                        <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        className="p-1 rounded hover:bg-brutal-red/10 text-brutal-red"
                        aria-label="Delete block"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            <BlockFields block={block} onChange={onChange} />
        </div>
    );
}

function BlockFields({ block, onChange }: { block: EventBlock; onChange: (b: EventBlock) => void }) {
    const inputClass = 'w-full h-9 rounded bg-brutal-bg border-2 border-brutal-dark/15 px-2 font-data text-sm focus:border-brutal-red focus:outline-none';
    const textareaClass = 'w-full rounded bg-brutal-bg border-2 border-brutal-dark/15 p-2 font-data text-sm min-h-[70px] focus:border-brutal-red focus:outline-none';

    switch (block.type) {
        case 'heading':
            return (
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <select
                            value={block.level}
                            onChange={(e) => onChange({ ...block, level: Number(e.target.value) as 2 | 3 })}
                            className="h-9 rounded bg-brutal-bg border-2 border-brutal-dark/15 px-2 font-data text-sm focus:border-brutal-red focus:outline-none"
                        >
                            <option value={2}>H2 — Section</option>
                            <option value={3}>H3 — Subsection</option>
                        </select>
                        <input
                            className={inputClass}
                            placeholder="Heading text"
                            value={block.text}
                            onChange={(e) => onChange({ ...block, text: e.target.value })}
                        />
                    </div>
                </div>
            );
        case 'paragraph':
            return (
                <textarea
                    className={textareaClass}
                    placeholder="Write a paragraph…"
                    value={block.text}
                    onChange={(e) => onChange({ ...block, text: e.target.value })}
                />
            );
        case 'image':
            return (
                <div className="space-y-2">
                    <input
                        className={inputClass}
                        placeholder="Image URL (https://…)"
                        value={block.url}
                        onChange={(e) => onChange({ ...block, url: e.target.value })}
                    />
                    <input
                        className={inputClass}
                        placeholder="Alt text (required for accessibility)"
                        value={block.alt}
                        onChange={(e) => onChange({ ...block, alt: e.target.value })}
                    />
                    <input
                        className={inputClass}
                        placeholder="Caption (optional)"
                        value={block.caption ?? ''}
                        onChange={(e) => onChange({ ...block, caption: e.target.value })}
                    />
                </div>
            );
        case 'list':
            return (
                <div className="space-y-2">
                    <label className="flex items-center gap-2 font-data text-xs">
                        <input
                            type="checkbox"
                            checked={block.ordered}
                            onChange={(e) => onChange({ ...block, ordered: e.target.checked })}
                        />
                        Numbered list
                    </label>
                    {block.items.map((item, i) => (
                        <div key={i} className="flex gap-2">
                            <input
                                className={inputClass}
                                placeholder={`Item ${i + 1}`}
                                value={item}
                                onChange={(e) => {
                                    const items = [...block.items];
                                    items[i] = e.target.value;
                                    onChange({ ...block, items });
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const items = block.items.filter((_, idx) => idx !== i);
                                    onChange({ ...block, items: items.length ? items : [''] });
                                }}
                                className="p-1.5 rounded hover:bg-brutal-red/10 text-brutal-red"
                                aria-label="Remove item"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => onChange({ ...block, items: [...block.items, ''] })}
                        className="font-data text-xs font-bold text-brutal-red hover:underline"
                    >
                        + Add item
                    </button>
                </div>
            );
        case 'callout':
            return (
                <div className="space-y-2">
                    <select
                        value={block.variant}
                        onChange={(e) => onChange({ ...block, variant: e.target.value as 'info' | 'warning' | 'success' })}
                        className="h-9 rounded bg-brutal-bg border-2 border-brutal-dark/15 px-2 font-data text-sm focus:border-brutal-red focus:outline-none"
                    >
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="success">Success</option>
                    </select>
                    <textarea
                        className={textareaClass}
                        placeholder="Callout text"
                        value={block.text}
                        onChange={(e) => onChange({ ...block, text: e.target.value })}
                    />
                </div>
            );
    }
}
