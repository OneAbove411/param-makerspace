import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Project } from '../../lib/database.types';

interface RemixFamilyProps {
    projectId: string;
    originId?: string | null;
}

interface FamilyNode {
    id: string;
    title: string;
    ownerName: string;
}

export function RemixFamily({ projectId, originId }: RemixFamilyProps) {
    const [origins, setOrigins] = useState<FamilyNode[]>([]);
    const [descendants, setDescendants] = useState<FamilyNode[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchFamily = async () => {
            setLoading(true);
            try {
                // Fetch origin chain (walk remixed_from_id up to root, max 5 levels)
                const originChain: FamilyNode[] = [];
                let currentId = originId;
                let depth = 0;

                while (currentId && depth < 5) {
                    const { data: project } = await supabase
                        .from('project')
                        .select('id, title, remixed_from_id, owner_id, app_user:app_user!owner_id(name)')
                        .eq('id', currentId)
                        .single();

                    if (!project) break;

                    const ownerName = (project as any).app_user?.name || 'Unknown';
                    originChain.unshift({
                        id: project.id,
                        title: project.title,
                        ownerName,
                    });

                    currentId = project.remixed_from_id;
                    depth++;
                }

                setOrigins(originChain);

                // Fetch descendants (direct children of THIS project)
                const { data: children } = await supabase
                    .from('project')
                    .select('id, title, owner_id, app_user:app_user!owner_id(name)')
                    .eq('remixed_from_id', projectId);

                if (children) {
                    const childNodes = children.map((c: any) => ({
                        id: c.id,
                        title: c.title,
                        ownerName: c.app_user?.name || 'Unknown',
                    }));
                    setDescendants(childNodes);
                }
            } catch (err) {
                console.error('Error fetching remix family:', err);
            } finally {
                setLoading(false);
            }
        };

        if (originId || projectId) {
            fetchFamily();
        }
    }, [originId, projectId]);

    if (!originId && descendants.length === 0) {
        return null;
    }

    return (
        <div className="py-5 border-t border-brutal-dark/10">
            <h3 className="font-heading font-bold text-xs uppercase tracking-tight-heading mb-4 px-1">
                Remix Family
            </h3>

            <div className="space-y-2 text-xs">
                {/* Origin chain */}
                {origins.length > 0 && (
                    <>
                        {origins.map((origin, idx) => (
                            <div key={origin.id}>
                                {idx > 0 && (
                                    <div className="text-brutal-dark/20 px-3 mb-1">↑</div>
                                )}
                                <Link
                                    to={`/projects/${origin.id}`}
                                    className="block px-3 py-1.5 rounded text-brutal-dark/70 hover:bg-brutal-dark/5 hover:text-brutal-dark transition"
                                >
                                    <div className="font-data text-[9px] uppercase tracking-wider text-brutal-dark/40">
                                        {idx === 0 ? 'Origin' : 'Remixed from'}
                                    </div>
                                    <div className="font-bold text-brutal-dark truncate">
                                        {origin.title}
                                    </div>
                                    <div className="text-brutal-dark/50">@{origin.ownerName}</div>
                                </Link>
                            </div>
                        ))}
                    </>
                )}

                {/* Current project indicator */}
                {(origins.length > 0 || descendants.length > 0) && (
                    <div className="px-3 py-1.5">
                        <div className="font-data text-[9px] uppercase tracking-wider text-brutal-red font-bold">
                            ● This Project
                        </div>
                    </div>
                )}

                {/* Descendants */}
                {descendants.length > 0 && (
                    <>
                        <div className="text-brutal-dark/20 px-3">↓</div>
                        <div className="px-3 py-1.5">
                            <div className="font-data text-[9px] uppercase tracking-wider text-brutal-dark/40 mb-2">
                                {descendants.length} {descendants.length === 1 ? 'remix' : 'remixes'}
                            </div>
                            <div className="space-y-1 pl-2 border-l border-brutal-dark/10">
                                {descendants.map((child) => (
                                    <Link
                                        key={child.id}
                                        to={`/projects/${child.id}`}
                                        className="block text-brutal-dark/70 hover:text-brutal-dark transition"
                                    >
                                        <div className="text-[9px] font-bold truncate">→ {child.title}</div>
                                        <div className="text-[8px] text-brutal-dark/50">@{child.ownerName}</div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
