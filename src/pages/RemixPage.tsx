import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader } from 'lucide-react';
import { useProject, useRemixProject } from '../lib/hooks';
import { toast } from '../lib/toast';
import { Button } from '../components/ui/Button';

export function RemixPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: originProject, loading } = useProject(id);
    const { remix } = useRemixProject();
    const [title, setTitle] = useState('');
    const [isRemixing, setIsRemixing] = useState(false);

    // Pre-fill title when origin loads
    React.useEffect(() => {
        if (originProject?.title && !title) {
            setTitle(`${originProject.title} (Remix)`);
        }
    }, [originProject?.title, title]);

    const handleRemix = async () => {
        if (!originProject || !title.trim()) {
            toast.error('Please enter a title for your remix');
            return;
        }

        setIsRemixing(true);
        const { data, error } = await remix(originProject.id, title);

        if (error) {
            toast.error(error.message || 'Failed to create remix');
            setIsRemixing(false);
            return;
        }

        if (data?.id) {
            toast.success('Remix created! Redirecting to editor...');
            navigate(`/projects/${data.id}/edit/core`);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader className="animate-spin text-brutal-red" size={32} />
            </div>
        );
    }

    if (!originProject) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-6">
                <h1 className="font-heading text-xl font-bold text-brutal-dark">Project not found</h1>
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-brutal-red hover:text-brutal-dark transition"
                >
                    <ArrowLeft size={16} />
                    Go back
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-brutal-bg p-4">
            <div className="w-full max-w-2xl">
                {/* Card container */}
                <div className="bg-brutal-bg border-2 border-brutal-dark/10 rounded-lg p-8 space-y-6">
                    {/* Header */}
                    <div>
                        <h1 className="font-heading text-2xl font-bold text-brutal-dark uppercase tracking-tight">
                            Remix This Project
                        </h1>
                        <p className="text-brutal-dark/60 text-sm mt-2">
                            Create a new version building on the foundation of this project.
                        </p>
                    </div>

                    {/* Origin info card */}
                    <div className="bg-brutal-dark/[0.02] border border-brutal-dark/10 rounded p-4">
                        <div className="font-data text-xs uppercase tracking-wider text-brutal-dark/50 mb-2">
                            Remixing from
                        </div>
                        <h2 className="font-heading font-bold text-base text-brutal-dark mb-2">
                            {originProject.title}
                        </h2>
                        <p className="text-xs text-brutal-dark/60">
                            by <span className="font-bold">@{originProject.ownerName}</span>
                        </p>
                    </div>

                    {/* Title input */}
                    <div className="space-y-2">
                        <label htmlFor="title" className="block font-data text-xs font-bold uppercase tracking-wider text-brutal-dark">
                            Your remix title
                        </label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Robot Arm with Vision Capability"
                            className="w-full px-4 py-3 border-2 border-brutal-dark/10 rounded-lg font-data text-sm
                                focus:outline-none focus:border-brutal-red/40 focus:bg-brutal-red/[0.01]
                                transition-all duration-200"
                            disabled={isRemixing}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => navigate(`/projects/${originProject.id}`)}
                            className="flex-1 py-3 px-4 border-2 border-brutal-dark/10 rounded-lg
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
                            className="flex-1 py-3 px-4 bg-brutal-red text-brutal-bg rounded-lg
                                font-data text-xs font-bold uppercase tracking-wider
                                hover:bg-brutal-red/90 disabled:opacity-50 disabled:cursor-not-allowed
                                transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            {isRemixing ? (
                                <>
                                    <Loader size={14} className="animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Start Remix'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
