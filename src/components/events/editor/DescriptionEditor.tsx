import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    EditorContent,
    useEditor,
    type Editor,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
    Bold,
    Italic,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Link as LinkIcon,
    ImagePlus,
    Quote,
    Loader2,
} from 'lucide-react';
import { uploadFile } from '../../../lib/storage';
import { ResizableImage } from './ResizableImage';

/**
 * DescriptionEditor — rich-text body editor for the event wizard.
 *
 * Built on Tiptap (ProseMirror under the hood). One control replaces the
 * old block-by-block editor. Mentors get the WYSIWYG feel they're used
 * to from any modern doc tool — type / format / paste / drag without
 * thinking in "blocks":
 *
 *   • Markdown shortcuts (Tiptap input rules):
 *       **bold** / __bold__   → bold
 *       *italic* / _italic_   → italic
 *       # / ##                → headings (H2/H3)
 *       - or *                → bulleted list
 *       1.                    → ordered list
 *       >                     → blockquote
 *       ---                   → horizontal divider
 *
 *   • Keyboard shortcuts (StarterKit defaults):
 *       Cmd/Ctrl + B / I / U / K / Z / Shift+Z, Enter, Shift+Enter
 *
 *   • Images:
 *       Toolbar button → file picker
 *       Paste image from clipboard
 *       Drag-drop image file from desktop
 *       All three upload to the existing `event-images` Supabase bucket
 *       and insert as a `<image>` node (resizable, see ResizableImage).
 *
 *   • Links:
 *       Toolbar button prompts for URL.
 *       Pasting a URL onto selected text auto-linkifies (Link extension).
 *
 * Storage: the wizard reads `editor.getJSON()` and stores the document
 * tree in `event.description_blocks` (already JSONB). The renderer in
 * EventBody dispatches by shape — Tiptap docs (`{type:'doc',content:[…]}`)
 * vs the legacy EventBlock[] array — so old events keep working.
 *
 * Theme: uses the existing brutalist tokens (font-data, brutal-red,
 * brutal-dark, brutal-bg, the 2px borders) — no new design language.
 */

interface DescriptionEditorProps {
    value: unknown;
    onChange: (doc: unknown) => void;
    /** Used to namespace uploaded images under `${userId}/desc/...`. */
    userId: string | null;
    placeholder?: string;
}

export function DescriptionEditor({
    value,
    onChange,
    userId,
    placeholder = 'Describe your event…',
}: DescriptionEditorProps) {
    const [uploading, setUploading] = useState(false);

    const editor: Editor | null = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
                // Keep the doc spec tight — no horizontal rule from StarterKit
                // because we'll add our own divider via markdown shortcut if
                // the user explicitly types `---`.
            }),
            Link.configure({
                openOnClick: false,
                autolink: true,
                HTMLAttributes: {
                    class: 'underline text-brutal-red',
                    rel: 'noopener nofollow',
                    target: '_blank',
                },
            }),
            Placeholder.configure({ placeholder }),
            ResizableImage.configure({ allowBase64: false }),
        ],
        content: isTiptapDoc(value) ? (value as any) : emptyDoc(),
        editorProps: {
            attributes: {
                // The editor surface itself — the actual <ProseMirror> div.
                class:
                    'tiptap-surface min-h-[200px] focus:outline-none font-data text-sm md:text-base leading-relaxed text-brutal-dark/85 px-4 py-3',
            },
            handlePaste: (_view: any, event: ClipboardEvent): boolean | void => {
                return handlePastedImages(event, (file) => uploadAndInsert(editorRef.current, file));
            },
            handleDrop: (_view: any, event: DragEvent): boolean | void => {
                return handleDroppedImages(event, (file) =>
                    uploadAndInsert(editorRef.current, file),
                );
            },
        },
        onUpdate: ({ editor }: { editor: Editor }) => {
            onChange(editor.getJSON());
        },
    });

    // Keep a ref for the paste/drop handlers so they don't capture stale state.
    const editorRef = useRef<any>(editor);
    useEffect(() => {
        editorRef.current = editor;
    }, [editor]);

    // ── External value updates (e.g. duplicate-last) ─────────────
    useEffect(() => {
        if (!editor) return;
        if (!isTiptapDoc(value)) return;
        const current = editor.getJSON();
        if (JSON.stringify(current) === JSON.stringify(value)) return;
        editor.commands.setContent(value as any, false);
    }, [editor, value]);

    // ── Image upload helper used by toolbar + paste + drop ───────
    const uploadAndInsert = useCallback(
        async (ed: Editor | null, file: File) => {
            if (!ed) return;
            if (!userId) {
                console.warn('No userId — image upload skipped.');
                return;
            }
            setUploading(true);
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
            const path = `${userId}/desc/${Date.now()}-${safeName}`;
            const { url, error } = await uploadFile('event-images', path, file);
            setUploading(false);
            if (error || !url) {
                console.warn('Image upload failed:', error);
                return;
            }
            ed.chain().focus().setImage({ src: url, alt: file.name }).run();
        },
        [userId],
    );

    const onToolbarImage = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            const f = input.files?.[0];
            if (f) await uploadAndInsert(editor, f);
        };
        input.click();
    };

    const onToolbarLink = () => {
        if (!editor) return;
        const prev = editor.getAttributes('link').href ?? '';
        const href = window.prompt('Link URL', prev);
        if (href === null) return;
        if (href === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    };

    if (!editor) {
        return (
            <div className="border-2 border-brutal-dark/15 rounded-xl p-4 font-data text-xs text-brutal-dark/40">
                Loading editor…
            </div>
        );
    }

    return (
        <div className="border-2 border-brutal-dark/20 rounded-xl bg-brutal-bg overflow-hidden focus-within:border-brutal-red transition-colors">
            <Toolbar
                editor={editor}
                onImage={onToolbarImage}
                onLink={onToolbarLink}
                uploading={uploading}
            />
            <EditorContent editor={editor} />
        </div>
    );
}

export default DescriptionEditor;

// ═══════════════════════════════════════════════════════════════════
// TOOLBAR
// ═══════════════════════════════════════════════════════════════════

function Toolbar({
    editor,
    onImage,
    onLink,
    uploading,
}: {
    editor: Editor;
    onImage: () => void;
    onLink: () => void;
    uploading: boolean;
}) {
    return (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b-2 border-brutal-dark/15 bg-brutal-bg/60">
            <ToolbarButton
                label="Heading 2"
                active={editor.isActive('heading', { level: 2 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
                <Heading2 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
                label="Heading 3"
                active={editor.isActive('heading', { level: 3 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
                <Heading3 className="w-4 h-4" />
            </ToolbarButton>

            <Divider />

            <ToolbarButton
                label="Bold"
                active={editor.isActive('bold')}
                onClick={() => editor.chain().focus().toggleBold().run()}
            >
                <Bold className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
                label="Italic"
                active={editor.isActive('italic')}
                onClick={() => editor.chain().focus().toggleItalic().run()}
            >
                <Italic className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton label="Link" active={editor.isActive('link')} onClick={onLink}>
                <LinkIcon className="w-4 h-4" />
            </ToolbarButton>

            <Divider />

            <ToolbarButton
                label="Bulleted list"
                active={editor.isActive('bulletList')}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
                <List className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
                label="Ordered list"
                active={editor.isActive('orderedList')}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
                <ListOrdered className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
                label="Quote"
                active={editor.isActive('blockquote')}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
                <Quote className="w-4 h-4" />
            </ToolbarButton>

            <Divider />

            <ToolbarButton label="Insert image" active={false} onClick={onImage}>
                {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <ImagePlus className="w-4 h-4" />
                )}
            </ToolbarButton>

            <span className="ml-auto font-data text-[10px] text-brutal-dark/40 px-2 hidden md:inline">
                Markdown: # / ## / - / 1. / **bold** / *italic*
            </span>
        </div>
    );
}

function ToolbarButton({
    label,
    active,
    onClick,
    children,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            aria-pressed={active}
            className={`inline-flex items-center justify-center w-8 h-8 rounded transition-colors ${
                active
                    ? 'bg-brutal-red text-brutal-bg'
                    : 'text-brutal-dark/70 hover:bg-brutal-dark/5 hover:text-brutal-dark'
            }`}
        >
            {children}
        </button>
    );
}

function Divider() {
    return <span className="self-stretch w-px bg-brutal-dark/15 mx-0.5" />;
}

// ═══════════════════════════════════════════════════════════════════
// PASTE / DROP HANDLERS
// ═══════════════════════════════════════════════════════════════════

/**
 * If the clipboard contains image files, intercept and upload them.
 * Returns true to tell ProseMirror we handled the event; false lets
 * the default paste path run (text, HTML from Notion / Google Docs,
 * etc.).
 */
function handlePastedImages(
    event: ClipboardEvent,
    upload: (file: File) => Promise<void> | void,
): boolean {
    const items = event.clipboardData?.items;
    if (!items) return false;
    const files: File[] = [];
    for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
            const f = item.getAsFile();
            if (f) files.push(f);
        }
    }
    if (files.length === 0) return false;
    event.preventDefault();
    files.forEach((f) => void upload(f));
    return true;
}

/**
 * Same idea for files dropped onto the editor surface.
 */
function handleDroppedImages(
    event: DragEvent,
    upload: (file: File) => Promise<void> | void,
): boolean {
    const dt = event.dataTransfer;
    if (!dt || dt.files.length === 0) return false;
    const imgs: File[] = [];
    for (const f of dt.files) {
        if (f.type.startsWith('image/')) imgs.push(f);
    }
    if (imgs.length === 0) return false;
    event.preventDefault();
    imgs.forEach((f) => void upload(f));
    return true;
}

// ═══════════════════════════════════════════════════════════════════
// SHAPE GUARDS / EMPTY DOC
// ═══════════════════════════════════════════════════════════════════

/**
 * Detect a Tiptap document so the wizard / renderer can dispatch
 * between (a) a Tiptap JSON tree and (b) the legacy EventBlock[] array.
 * Tiptap docs always start with `{ type: 'doc', content: [...] }`.
 */
export function isTiptapDoc(v: unknown): v is { type: 'doc'; content: any[] } {
    return (
        !!v &&
        typeof v === 'object' &&
        (v as { type?: unknown }).type === 'doc' &&
        Array.isArray((v as { content?: unknown }).content)
    );
}

/** A blank Tiptap document — used when the wizard starts from scratch. */
export function emptyDoc() {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
}

/**
 * Extract plaintext from a Tiptap doc — used for the legacy
 * `event.description` mirror that calendar export / OG previews read.
 */
export function tiptapDocToPlainText(doc: unknown): string {
    if (!isTiptapDoc(doc)) return '';
    return walk(doc).trim();

    function walk(node: unknown): string {
        if (!node || typeof node !== 'object') return '';
        const n = node as Record<string, unknown>;
        if (n.type === 'text' && typeof n.text === 'string') return n.text;
        if (n.type === 'image') {
            const alt = (n.attrs as { alt?: string } | undefined)?.alt ?? '';
            return alt ? `[image: ${alt}]` : '';
        }
        if (n.type === 'hardBreak') return '\n';
        const sep =
            n.type === 'paragraph' ||
            n.type === 'heading' ||
            n.type === 'bulletList' ||
            n.type === 'orderedList' ||
            n.type === 'listItem' ||
            n.type === 'blockquote'
                ? '\n'
                : '';
        if (Array.isArray(n.content)) {
            return n.content.map(walk).join('') + sep;
        }
        return '';
    }
}
