import React, { useState } from 'react';
import { useProjects } from '../lib/hooks';
import { Card } from '../components/ui/Card';
import { Link } from 'react-router-dom';
import { Heart, ArrowUpCircle } from 'lucide-react';

export function Projects() {
    const [filter, setFilter] = useState('All');
    const domains = ['All', 'Software & Robotics', 'Fabrication', 'Electronics'];
    const { data: projects, loading } = useProjects(filter);

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="font-heading font-bold text-5xl md:text-7xl uppercase tracking-tight-heading mb-8">
                    Project Archive
                </h1>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-12 border-b-2 border-brutal-dark/10 pb-6">
                    {domains.map(d => (
                        <button
                            key={d}
                            onClick={() => setFilter(d)}
                            className={`px-4 py-2 font-data text-sm rounded-full transition-colors border-2 ${filter === d
                                    ? 'bg-brutal-dark text-brutal-bg border-brutal-dark'
                                    : 'border-brutal-dark/20 text-brutal-dark hover:border-brutal-dark hover:bg-brutal-dark/5'
                                }`}
                        >
                            {d}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="py-20 text-center font-data text-brutal-dark/50">Loading projects...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
                        {(projects || []).map(project => (
                            <Link key={project.id} to={`/projects/${project.id}`} className="group interactive-lift block">
                                <Card className="h-full flex flex-col group-hover:border-brutal-red transition-colors duration-300 pointer-events-auto">
                                    <div className="h-48 w-full overflow-hidden bg-brutal-dark relative">
                                        {(project as any).cover_image_url || (project as any).coverImage ? (
                                            <img
                                                src={(project as any).cover_image_url || (project as any).coverImage}
                                                alt={project.title}
                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 ease-out"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-data text-brutal-bg/20">NO IMAGE</div>
                                        )}
                                        <div className="absolute top-4 left-4 flex gap-2">
                                            {project.tier && <span className="bg-brutal-bg text-brutal-dark px-2 py-1 text-xs font-bold font-data rounded border border-brutal-dark/10 shadow-sm">{project.tier}</span>}
                                        </div>
                                    </div>

                                    <div className="p-6 flex-1 flex flex-col">
                                        {project.domain && (
                                            <div className="flex gap-2 flex-wrap mb-4">
                                                <span className="text-[10px] font-data font-bold uppercase tracking-wider text-brutal-red">
                                                    #{project.domain}
                                                </span>
                                            </div>
                                        )}

                                        <h3 className="font-heading font-bold text-2xl mb-2 line-clamp-2 leading-tight">{project.title}</h3>
                                        <p className="font-data text-sm text-brutal-dark/70 line-clamp-3 mb-6 flex-1">
                                            {project.summary}
                                        </p>

                                        <div className="flex items-center justify-between border-t border-brutal-dark/10 pt-4 mt-auto">
                                            <div className="font-data text-xs font-bold text-brutal-dark/50 uppercase">
                                                {project.duration || 'Ongoing'}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        ))}

                        {(projects || []).length === 0 && !loading && (
                            <div className="col-span-full py-20 text-center font-data text-brutal-dark/50 border-2 border-dashed border-brutal-dark/20 rounded-2xl">
                                No projects found for this domain.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
