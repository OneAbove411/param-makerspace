import React, { useState } from 'react';
import { useProjectMakes } from '../../lib/hooks';
import { useAuth } from '../../lib/auth';
import { PostMakeModal } from './PostMakeModal';
import { Plus } from 'lucide-react';

interface ProjectMakesTabProps {
    projectId: string;
}

export function ProjectMakesTab({ projectId }: ProjectMakesTabProps) {
    const { data: makes, loading, refetch } = useProjectMakes(projectId);
    const { user } = useAuth();
    const [showModal, setShowModal] = useState(false);

    if (loading) return <div className="py-12 text-center text-brutal-dark/40">Loading Makes...</div>;

    const handleSuccess = () => {
        refetch();
    };

    return (
        <div className="space-y-6">
            {user && (
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brutal-dark text-white font-bold rounded hover:opacity-80 transition"
                >
                    <Plus size={16} /> Post your Make
                </button>
            )}

            {!makes || makes.length === 0 ? (
                <div className="text-center py-6">
                    <p className="text-brutal-dark/40 font-data text-sm">No Makes yet. Be the first to build this.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {makes.map((make) => (
                        <div key={make.id} className="border border-brutal-dark/20 rounded-lg overflow-hidden hover:shadow-lg transition">
                            {make.image_url && (
                                <img src={make.image_url} alt={make.caption} loading="lazy" className="w-full h-40 object-cover" />
                            )}
                            <div className="p-4 space-y-2">
                                <p className="font-bold text-sm text-brutal-dark">{make.caption}</p>
                                {make.build_notes && <p className="text-xs text-brutal-dark/70 line-clamp-2">{make.build_notes}</p>}
                                <div className="flex items-center justify-between pt-2 border-t border-brutal-dark/10">
                                    <div className="flex items-center gap-2">
                                        {make.user_avatar_url && (
                                            <img src={make.user_avatar_url} alt={make.user_name} className="w-6 h-6 rounded-full" />
                                        )}
                                        <span className="text-xs text-brutal-dark/60">{make.user_name}</span>
                                    </div>
                                    <span className="text-xs text-brutal-dark/40">
                                        {new Date(make.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && <PostMakeModal projectId={projectId} onClose={() => setShowModal(false)} onSuccess={handleSuccess} />}
        </div>
    );
}
