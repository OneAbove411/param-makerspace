import React, { useRef, useState, useCallback } from 'react';
import { Image as TiptapImage } from '@tiptap/extension-image';
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';

/**
 * ResizableImage — Tiptap image node with a draggable resize handle.
 *
 * Why we extend the built-in image:
 *   The default `@tiptap/extension-image` renders a bare <img> with no
 *   way to set a width inline. Mentors writing a description need to
 *   crop large images down without leaving the editor, so we add a
 *   single attribute (`width`, in CSS px) and a NodeView that surfaces
 *   a corner-handle for proportional drag-resize.
 *
 *   Width is stored as an HTML attribute on the rendered <img>, so it
 *   round-trips through `editor.getJSON()` / `editor.getHTML()` cleanly
 *   and shows up unchanged on the public page.
 *
 *   Click on the image to select it; the handle appears on the bottom-
 *   right corner. Drag to resize. Min 80 px, max 100% of the editor's
 *   own content width (we let CSS clamp to `max-w-full` so the image
 *   never escapes its container).
 *
 *   Aspect ratio is preserved by only writing `width`; height is left
 *   to `auto` so the browser fills it in from the image's intrinsic
 *   dimensions.
 *
 * Theme: matches the brutalist look of the surrounding event page —
 *   2px solid border on selection, brand-red focus ring on the handle.
 */

export const ResizableImage = TiptapImage.extend({
    name: 'image',
    inline: false,
    group: 'block',
    draggable: true,

    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: null as number | null,
                parseHTML: (element) => {
                    const w = element.getAttribute('width');
                    return w ? parseInt(w, 10) : null;
                },
                renderHTML: (attributes) => {
                    if (!attributes.width) return {};
                    return { width: String(attributes.width) };
                },
            },
        };
    },

    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageView);
    },
});

function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState(false);

    const startResize = useCallback(
        (e: React.PointerEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const wrapper = wrapperRef.current;
            if (!wrapper) return;

            const startX = e.clientX;
            const startWidth = wrapper.offsetWidth;
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            setDragging(true);

            const onMove = (ev: PointerEvent) => {
                const next = Math.max(80, startWidth + (ev.clientX - startX));
                // Live preview by writing the inline style; we'll commit to the
                // node attribute on pointerup so the editor history records a
                // single undoable step, not one per pointer move.
                wrapper.style.width = `${next}px`;
            };
            const onUp = () => {
                setDragging(false);
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                if (!wrapperRef.current) return;
                const finalWidth = wrapperRef.current.offsetWidth;
                updateAttributes({ width: finalWidth });
            };

            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
        },
        [updateAttributes],
    );

    const width = (node.attrs.width as number | null) ?? undefined;
    const src = node.attrs.src as string;
    const alt = (node.attrs.alt as string) ?? '';

    return (
        <NodeViewWrapper
            as="figure"
            className="my-3 relative inline-block max-w-full"
            data-drag-handle
        >
            <div
                ref={wrapperRef}
                style={width ? { width: `${width}px`, maxWidth: '100%' } : undefined}
                className={`relative inline-block ${
                    selected
                        ? 'outline outline-2 outline-brutal-red outline-offset-2'
                        : 'outline outline-1 outline-brutal-dark/10'
                } rounded-lg overflow-hidden bg-brutal-bg/30`}
            >
                <img
                    src={src}
                    alt={alt}
                    className="block w-full h-auto select-none"
                    draggable={false}
                />
                {selected && (
                    <button
                        type="button"
                        aria-label="Resize image"
                        onPointerDown={startResize}
                        className={`absolute bottom-1 right-1 w-4 h-4 rounded-sm bg-brutal-red border-2 border-brutal-bg cursor-nwse-resize ${
                            dragging ? 'opacity-100' : 'opacity-90 hover:opacity-100'
                        }`}
                    />
                )}
            </div>
        </NodeViewWrapper>
    );
}

export default ResizableImage;
