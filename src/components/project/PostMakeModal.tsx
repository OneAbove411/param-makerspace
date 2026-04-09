import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useProjectMakeMutations } from '../../lib/hooks';

interface PostMakeModalProps {
    projectId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function PostMakeModal({ projectId, onClose, onSuccess }: PostMakeModalProps) {
    const { createMake } = useProjectMakeMutations();
    const [caption, setCaption] = useState('');
    const [buildNotes, setBuildNotes] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                setImageUrl(evt.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await createMake(projectId, {
                image_url: imageUrl || null,
                caption,
                build_notes: buildNotes || null,
            });
            if (!error) {
                onSuccess();
                onClose();
            } else {
                console.error('Error creating make:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Share your Make</h2>
                    <button onClick={onClose} className="p-1 hover:opacity-60">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Image Upload */}
                    <div>
                        <label className="text-xs font-bold text-brutal-dark/60 block mb-2">Photo</label>
                        <div
                            className="border-2 border-dashed border-brutal-dark/30 rounded-lg p-4 text-center cursor-pointer hover:bg-brutal-dark/5 transition"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {imageUrl ? (
                                <img src={imageUrl} alt="Make preview" className="w-full h-40 object-cover rounded" />
                            ) : (
                                <div className="py-8">
                                    <p className="text-sm text-brutal-dark/60">Click to upload an image</p>
                                    <p className="text-xs text-brutal-dark/40 mt-1">PNG, JPG up to 5MB</p>
                                </div>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                        />
                    </div>

                    {/* Caption */}
                    <div>
                        <label className="text-xs font-bold text-brutal-dark/60 block mb-2">Caption</label>
                        <textarea
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="Describe your build..."
                            className="w-full px-3 py-2 border border-brutal-dark/20 rounded text-sm resize-none"
                            rows={3}
                        />
                    </div>

                    {/* Build Notes */}
                    <div>
                        <label className="text-xs font-bold text-brutal-dark/60 block mb-2">Build Notes (optional)</label>
                        <textarea
                            value={buildNotes}
                            onChange={(e) => setBuildNotes(e.target.value)}
                            placeholder="What went well? What was challenging?"
                            className="w-full px-3 py-2 border border-brutal-dark/20 rounded text-sm resize-none"
                            rows={3}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4">
                        <button
                            type="submit"
                            disabled={loading || !caption}
                            className="flex-1 px-4 py-2 bg-brutal-dark text-white font-bold rounded disabled:opacity-50 hover:opacity-80 transition"
                        >
                            {loading ? 'Posting...' : 'Post Make'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-brutal-dark/10 rounded font-bold text-sm hover:opacity-80 transition"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
