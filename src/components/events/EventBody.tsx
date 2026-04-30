import React from 'react';
import type { EventBlock } from '../../lib/database.types';

/**
 * EventBody — safe renderer for the event description field.
 *
 * The wizard has gone through two storage shapes for `description_blocks`
 * over the lifetime of the project, and the public page has to render
 * both transparently:
 *
 *   1. Legacy block-editor — JSONB array of discriminated-union
 *      EventBlock objects (heading | paragraph | image | list | callout).
 *      Used by every event published before the WYSIWYG rewrite.
 *
 *   2. Tiptap document — JSONB tree shaped { type:'doc', content:[…] }.
 *      Used by every event published with the new DescriptionEditor.
 *
 * We dispatch on the shape: if it looks like a Tiptap doc we render via
 * a small recursive walker; otherwise we fall back to the original
 * BlockRenderer. Both paths only ever emit ordinary React elements
 * (never dangerouslySetInnerHTML), so the renderer doubles as the
 * sanitizer.
 *
 * Styling stays in brand: Tailwind utilities that match the rest of
 * the event pages (font-data, brutal-red accents, tight line-height).
 */

export interface EventBodyProps {
    /**
     * Either a legacy EventBlock[], a Tiptap doc node, or null/undefined.
     * Loosely typed because the storage column is JSONB and the value
     * here can come from older rows.
     */
    blocks: unknown;
    /** Optional fallback when there is nothing to render. */
    fallback?: React.ReactNode;
    className?: string;
}

const WRAPPER_CLS =
    'space-y-6 font-data text-sm md:text-base leading-relaxed text-brutal-dark/80';

export function EventBody({ blocks, fallback = null, className }: EventBodyProps) {
    if (isTiptapDoc(blocks)) {
        return (
            <div className={className ?? WRAPPER_CLS}>
                <TiptapNodes nodes={blocks.content ?? []} />
            </div>
        );
    }
    if (Array.isArray(blocks) && blocks.length > 0) {
        return (
            <div className={className ?? WRAPPER_CLS}>
                {(blocks as EventBlock[]).map((block, i) => (
                    <BlockRenderer key={i} block={block} />
                ))}
            </div>
        );
    }
    return <>{fallback}</>;
}

// ═══════════════════════════════════════════════════════════════════
// LEGACY BLOCK-EDITOR RENDERER (unchanged)
// ═══════════════════════════════════════════════════════════════════

function BlockRenderer({ block }: { block: EventBlock }) {
    switch (block.type) {
        case 'heading':
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
            return <p className="whitespace-pre-wrap">{block.text}</p>;
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
                        {block.items.map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ol>
                );
            }
            return (
                <ul className="list-disc pl-6 space-y-1">
                    {block.items.map((item, i) => (
                        <li key={i}>{item}</li>
                    ))}
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

// ═══════════════════════════════════════════════════════════════════
// TIPTAP DOCUMENT RENDERER (new)
// ═══════════════════════════════════════════════════════════════════
//
// Recursively walks a Tiptap document tree and emits ordinary React
// elements. Why not @tiptap/react in editable=false mode? — that pulls
// the entire ProseMirror runtime into the public page bundle. This
// walker is ~80 lines and renders every node the editor produces with
// no dependency cost.

interface TiptapNode {
    type: string;
    attrs?: Record<string, unknown>;
    content?: TiptapNode[];
    text?: string;
    marks?: { type: string; attrs?: Record<string, unknown> }[];
}

function TiptapNodes({ nodes }: { nodes: TiptapNode[] }) {
    return (
        <>
            {nodes.map((node, i) => (
                <TiptapNode key={i} node={node} />
            ))}
        </>
    );
}

function TiptapNode({ node }: { node: TiptapNode }) {
    switch (node.type) {
        case 'paragraph':
            return (
                <p>
                    <TiptapInlineNodes nodes={node.content ?? []} />
                </p>
            );
        case 'heading': {
            const level = (node.attrs?.level as number | undefined) ?? 2;
            const cls =
                level === 2
                    ? 'font-heading font-bold text-2xl md:text-3xl uppercase tracking-tight text-brutal-dark mt-8 first:mt-0'
                    : 'font-heading font-bold text-lg md:text-xl uppercase tracking-tight text-brutal-dark mt-4 first:mt-0';
            const Tag = level === 2 ? 'h2' : ('h3' as const);
            return (
                <Tag className={cls}>
                    <TiptapInlineNodes nodes={node.content ?? []} />
                </Tag>
            );
        }
        case 'bulletList':
            return (
                <ul className="list-disc pl-6 space-y-1">
                    <TiptapNodes nodes={node.content ?? []} />
                </ul>
            );
        case 'orderedList':
            return (
                <ol className="list-decimal pl-6 space-y-1">
                    <TiptapNodes nodes={node.content ?? []} />
                </ol>
            );
        case 'listItem':
            return (
                <li>
                    <TiptapNodes nodes={node.content ?? []} />
                </li>
            );
        case 'blockquote':
            return (
                <blockquote className="border-l-4 border-brutal-red bg-brutal-red/5 pl-4 py-2 italic">
                    <TiptapNodes nodes={node.content ?? []} />
                </blockquote>
            );
        case 'horizontalRule':
            return <hr className="border-t-2 border-brutal-dark/15 my-6" />;
        case 'image': {
            const src = node.attrs?.src as string | undefined;
            const alt = (node.attrs?.alt as string | undefined) ?? '';
            const width = node.attrs?.width as number | undefined;
            if (!src) return null;
            return (
                <figure className="my-3">
                    <img
                        src={src}
                        alt={alt}
                        loading="lazy"
                        className="rounded-lg border-2 border-brutal-dark/10 max-w-full h-auto"
                        style={width ? { width: `${width}px` } : undefined}
                    />
                </figure>
            );
        }
        case 'codeBlock':
            return (
                <pre className="bg-brutal-dark/5 border-2 border-brutal-dark/10 rounded-lg p-3 overflow-x-auto text-xs">
                    <code>
                        <TiptapInlineNodes nodes={node.content ?? []} />
                    </code>
                </pre>
            );
        default:
            // Unknown node type: render its content if any so the page
            // doesn't lose data; otherwise drop it.
            if (node.content) {
                return <TiptapNodes nodes={node.content} />;
            }
            return null;
    }
}

function TiptapInlineNodes({ nodes }: { nodes: TiptapNode[] }) {
    return (
        <>
            {nodes.map((node, i) => (
                <TiptapInline key={i} node={node} />
            ))}
        </>
    );
}

function TiptapInline({ node }: { node: TiptapNode }) {
    if (node.type === 'hardBreak') return <br />;
    if (node.type === 'text') {
        let el: React.ReactNode = node.text ?? '';
        for (const mark of node.marks ?? []) {
            switch (mark.type) {
                case 'bold':
                    el = <strong>{el}</strong>;
                    break;
                case 'italic':
                    el = <em>{el}</em>;
                    break;
                case 'code':
                    el = (
                        <code className="bg-brutal-dark/5 px-1 rounded text-[0.85em]">
                            {el}
                        </code>
                    );
                    break;
                case 'strike':
                    el = <s>{el}</s>;
                    break;
                case 'link': {
                    const href = (mark.attrs?.href as string | undefined) ?? '#';
                    el = (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="underline text-brutal-red hover:text-brutal-dark"
                        >
                            {el}
                        </a>
                    );
                    break;
                }
            }
        }
        return <>{el}</>;
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════════
// SHAPE GUARD
// ═══════════════════════════════════════════════════════════════════

function isTiptapDoc(v: unknown): v is { type: 'doc'; content?: TiptapNode[] } {
    return (
        !!v &&
        typeof v === 'object' &&
        (v as { type?: unknown }).type === 'doc'
    );
}

// ═══════════════════════════════════════════════════════════════════
// PLAINTEXT MIRROR
// ═══════════════════════════════════════════════════════════════════
//
// Used by callers that need a plain-text version of the body — calendar
// exports, OG previews, share blurbs. Handles both storage shapes; the
// new DescriptionEditor exports its own walker (`tiptapDocToPlainText`)
// for the wizard's publish path so this is a fallback for legacy code.

export function blocksToPlainText(input: unknown): string {
    if (isTiptapDoc(input)) {
        return tiptapToText(input).trim();
    }
    if (!Array.isArray(input)) return '';
    const blocks = input as EventBlock[];
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
                    return block.items
                        .map((item, i) => (block.ordered ? `${i + 1}. ${item}` : `• ${item}`))
                        .join('\n');
                case 'callout':
                    return block.text;
            }
        })
        .join('\n\n');
}

function tiptapToText(node: TiptapNode | { type: 'doc'; content?: TiptapNode[] }): string {
    if (!node || typeof node !== 'object') return '';
    const n = node as TiptapNode;
    if (n.type === 'text' && typeof n.text === 'string') return n.text;
    if (n.type === 'image') {
        const alt = (n.attrs?.alt as string | undefined) ?? '';
        return alt ? `[image: ${alt}]` : '';
    }
    if (n.type === 'hardBreak') return '\n';
    const sep =
        n.type === 'paragraph' ||
        n.type === 'heading' ||
        n.type === 'listItem' ||
        n.type === 'blockquote' ||
        n.type === 'codeBlock'
            ? '\n'
            : '';
    if (Array.isArray(n.content)) {
        return n.content.map(tiptapToText).join('') + sep;
    }
    return '';
}
