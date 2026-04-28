import React from 'react';
import type { EventBlock } from '../../lib/database.types';

/**
 * EventBody — safe renderer for the block-editor body.
 *
 * Reads a JSONB `description_blocks` array off an event and renders each
 * discriminated-union block to the DOM without any raw-HTML injection.
 * Every piece of user-supplied content flows through React's string
 * escaping (never `dangerouslySetInnerHTML`), so the block model doubles
 * as a sanitizer.
 *
 * Styling stays in brand: Tailwind utilities that match the rest of the
 * event pages (font-data, brutal-red accents, tight line-height).
 *
 * This is read-only. The editor lives in `src/components/events/BlockEditor`.
 */

export interface EventBodyProps {
    blocks: EventBlock[] | null | undefined;
    /** Optional fallback when there are no blocks. */
    fallback?: React.ReactNode;
    className?: string;
}

export function EventBody({ blocks, fallback = null, className }: EventBodyProps) {
    if (!blocks || blocks.length === 0) return <>{fallback}</>;
    return (
        <div className={className ?? 'space-y-6 font-data text-sm md:text-base leading-relaxed text-brutal-dark/80'}>
            {blocks.map((block, i) => <BlockRenderer key={i} block={block} />)}
        </div>
    );
}

function BlockRenderer({ block }: { block: EventBlock }) {
    switch (block.type) {
        case 'heading':
            // Level 2 = section heading, Level 3 = subsection. We rely on the
            // wizard to cap at these two levels so the page outline stays sane.
            if (block.level === 2) {
                return (
                    <h2 className="font-heading font-bold text-2xl md:text-3xl uppercase tracking-tight text-brutal-dark mt-8 first:mt-0">
                        {block.text}
                    </h2>
                );
            }
            return (
                <h3 className="font-heading font-bold text-lg md:text-xl uppercase tracking-tight text-brutal-dark mt-4 first:mt-0">
                    {block.text}
                </h3>
            );
        case 'paragraph':
            return (
                <p className="whitespace-pre-wrap">
                    {block.text}
                </p>
            );
        case 'image':
            return (
                <figure className="space-y-2">
                    <img
                        src={block.url}
                        alt={block.alt}
                        className="w-full rounded-lg border-2 border-brutal-dark/10"
                        loading="lazy"
                    />
                    {block.caption && (
                        <figcaption className="font-data text-xs text-brutal-dark/50 italic">
                            {block.caption}
                        </figcaption>
                    )}
                </figure>
            );
        case 'list':
            if (block.ordered) {
                return (
                    <ol className="list-decimal pl-6 space-y-1">
                        {block.items.map((item, i) => <li key={i}>{item}</li>)}
                    </ol>
                );
            }
            return (
                <ul className="list-disc pl-6 space-y-1">
                    {block.items.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
            );
        case 'callout': {
            const styles: Record<typeof block.variant, string> = {
                info: 'border-blue-400 bg-blue-50 text-blue-900',
                warning: 'border-amber-500 bg-amber-50 text-amber-900',
                success: 'border-green-500 bg-green-50 text-green-900',
            };
            return (
                <div className={`border-l-4 ${styles[block.variant]} p-4 rounded-r-lg`}>
                    <p className="whitespace-pre-wrap font-data text-sm md:text-base">
                        {block.text}
                    </p>
                </div>
            );
        }
    }
}

// ─── Plaintext mirror ──────────────────────────────────────────────
//
// Used by the wizard on publish to fill the legacy `event.description`
// column so calendar export, OG previews, and any legacy text readers
// keep working. Intentionally lossy: images become "[image: alt]" and
// callouts lose their variant.

export function blocksToPlainText(blocks: EventBlock[]): string {
    return blocks
        .map((block) => {
            switch (block.type) {
                case 'heading':
                    return block.text;
                case 'paragraph':
                    return block.text;
                case 'image':
                    return block.caption
                        ? `[image: ${block.alt} — ${block.caption}]`
                        : `[image: ${block.alt}]`;
                case 'list':
                    return block.items.map((item, i) =>
                        block.ordered ? `${i + 1}. ${item}` : `• ${item}`,
                    ).join('\n');
                case 'callout':
                    return block.text;
            }
        })
        .join('\n\n');
}
