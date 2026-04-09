import React, { useState } from 'react';
import { useProjectPins, useProjectPinMutations } from '../../lib/hooks';
import { MessageCircle, Send } from 'lucide-react';

interface ContextualPinProps {
    projectId: string;
    targetType: 'image' | 'log' | 'bom_row';
    targetId: string;
    containerRef: React.RefObject<HTMLElement>;
    canAddPin: boolean;
}

export function ContextualPin({ projectId, targetType, targetId, containerRef, canAddPin }: ContextualPinProps) {
    const { data: pins, loading, refetch } = useProjectPins(projectId, targetType, targetId);
    const { createPin } = useProjectPinMutations();
    const [showComposer, setShowComposer] = useState(false);
    const [composerCoords, setComposerCoords] = useState<{ x: number; y: number } | null>(null);
    const [newComment, setNewComment] = useState('');
    const [activePin, setActivePin] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!canAddPin || !e.shiftKey) return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const xPct = (x / rect.width) * 100;
        const yPct = (y / rect.height) * 100;

        setComposerCoords({ x, y });
        setShowComposer(true);
    };

    const handleSubmitPin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !composerCoords) return;

        setSubmitting(true);
        try {
            const { error } = await createPin({
                projectId,
                target_type: targetType,
                target_id: targetId,
                x_pct: (composerCoords.x / (containerRef.current?.offsetWidth || 1)) * 100,
                y_pct: (composerCoords.y / (containerRef.current?.offsetHeight || 1)) * 100,
                body: newComment,
            });
            if (!error) {
                setNewComment('');
                setShowComposer(false);
                setComposerCoords(null);
                refetch();
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return null;

    return (
        <div
            ref={containerRef as any}
            className="relative w-full"
            onClick={handleContainerClick}
            style={{ cursor: canAddPin && showComposer === false ? 'crosshair' : 'default' }}
        >
            {/* Pin dots */}
            {pins?.map((pin) => (
                <div
                    key={pin.id}
                    className="absolute w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-110 transition"
                    style={{
                        left: `${pin.x_pct || 0}%`,
                        top: `${pin.y_pct || 0}%`,
                        transform: 'translate(-50%, -50%)',
                    }}
                    onMouseEnter={() => setActivePin(pin.id)}
                    onMouseLeave={() => setActivePin(null)}
                    title={pin.comment?.content}
                >
                    <div className="absolute top-8 left-0 z-50 whitespace-nowrap">
                        {activePin === pin.id && pin.comment && (
                            <div className="bg-white border border-brutal-dark/20 rounded shadow-lg p-2 text-xs w-48">
                                <p className="font-bold text-brutal-dark">{pin.comment.author_name}</p>
                                <p className="text-brutal-dark/70 mt-1">{pin.comment.content}</p>
                                <p className="text-brutal-dark/40 text-xs mt-1">
                                    {new Date(pin.comment.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Composer */}
            {showComposer && composerCoords && (
                <div
                    className="absolute z-50 bg-white border-2 border-brutal-dark rounded-lg shadow-lg p-3 w-48"
                    style={{
                        left: `${composerCoords.x}px`,
                        top: `${composerCoords.y + 20}px`,
                        transform: 'translateX(-50%)',
                    }}
                >
                    <form onSubmit={handleSubmitPin} className="space-y-2">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Your comment..."
                            className="w-full px-2 py-1 border border-brutal-dark/20 rounded text-xs resize-none"
                            rows={3}
                            autoFocus
                        />
                        <div className="flex gap-1">
                            <button
                                type="submit"
                                disabled={!newComment.trim() || submitting}
                                className="flex-1 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded disabled:opacity-50 hover:opacity-80 transition inline-flex items-center justify-center gap-1"
                            >
                                <Send size={12} /> Post
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowComposer(false);
                                    setNewComment('');
                                }}
                                className="flex-1 px-2 py-1 bg-brutal-dark/10 text-xs rounded hover:opacity-80"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
