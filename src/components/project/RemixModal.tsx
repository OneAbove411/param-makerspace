import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader, X } from 'lucide-react';
import { useRemixProject } from '../../lib/hooks';
import { toast } from '../../lib/toast';
import type { ProjectListItem } from '../../lib/hooks';

interface RemixModalProps {
    open: boolean;
    origin: ProjectListItem | null;
    onClose: () => void;
}

export function RemixModal({ open, origin, onClose }: RemixModalProps) {
    const navigate = useNavigate();
    const { remix } = useRemixProject();
    const [title, setTitle] = useState('');
    const [isRemixing, setIsRemixing] = useState(false);

    // Pre-fill title when origin loads
    useEffect(() => {
        if (origin?.title && !title) {
            setTitle(`${origin.title} (Remix)`);
        }
    }, [origin?.title, open]);

    if (!open || !origin) {
        return null;
    }

    const handleRemix = async () => {
        if (!title.trim()) {
            toast.error('Please enter a title for your remix');
            return;
        }

        setIsRemixing(true);
        const { data, error } = await remix(origin.id, title);

        if (error) {
            toast.error(error.message || 'Failed to create remix');
            setIsRemixing(false);
            return;
        }

        if (data?.id) {
            onClose();
            toast.success('Remix created! Redirecting to editor...');
            navigate(`/projects/${data.id}/edit/core`);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-brutal-bg border-2 border-brutal-dark/10 rounded-lg shadow-2xl w-full max-w-md p-6 space-y-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="font-heading text-xl font-bold text-brutal-dark uppercase tracking-tight">
                                Remix This Project
                            </h2>
                            <p className="text-brutal-dark/60 text-xs mt-1">
                                Create a new version building on this project.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-brutal-dark/40 hover:text-brutal-dark transition"
                            disabled={isRemixing}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Origin info card */}
                    <div className="bg-brutal-dark/[0.02] border border-brutal-dark/10 rounded p-4">
                        <div className="font-data text-xs uppercase tracking-wider text-brutal-dark/50 mb-2">
                            Remixing from
                        </div>
                        <h3 className="font-heading font-bold text-sm text-brutal-dark mb-1">
                            {origin.title}
                        </h3>
                        <p className="text-xs text-brutal-dark/60">
                            by <span className="font-bold">@{origin.owner_name}</span>
                        </p>
                    </div>

                    {/* Title input */}
                    <div className="space-y-2">
                        <label htmlFor="remix-title" className="block font-data text-xs font-bold uppercase tracking-wider text-brutal-dark">
                            Your remix title
                        </label>
                        <input
                            id="remix-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Robot Arm with Vision"
                            className="w-full px-4 py-3 border-2 border-brutal-dark/10 rounded-lg font-data text-sm
                                focus:outline-none focus:border-brutal-red/40 focus:bg-brutal-red/[0.01]
                                transition-all duration-200"
                            disabled={isRemixing}
                            autoFocus
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 px-4 border-2 border-brutal-dark/10 rounded-lg
                                font-data text-xs font-bold uppercase tracking-wider
                                text-brutal-dark/60 hover:border-brutal-dark/40
                                transition-all duration-200"
                            disabled={isRemixing}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleRemix}
                            disabled={isRemixing || !title.trim()}
                            className="flex-1 py-2.5 px-4 bg-brutal-red text-brutal-bg rounded-lg
                                font-data text-xs font-bold uppercase tracking-wider
                                hover:bg-brutal-red/90 disabled:opacity-50 disabled:cursor-not-allowed
                                transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            {isRemixing ? (
                                <>
                                    <Loader size={12} className="animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Start Remix'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
