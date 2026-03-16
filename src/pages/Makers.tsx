import React, { useState } from 'react';
import { useMakers } from '../lib/hooks';
import { Card } from '../components/ui/Card';
import { Link } from 'react-router-dom';

export function Makers() {
    const [filter, setFilter] = useState('All');
    const domains = ['All', 'Robotics', 'Software', 'Fabrication'];
    const { data: makers, loading } = useMakers(filter);

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="font-heading font-bold text-5xl md:text-7xl uppercase tracking-tight-heading mb-8">
                    Makers Directory
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
                    <div className="py-20 text-center font-data text-brutal-dark/50">Loading makers...</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 pb-32">
                        {(makers || []).map(maker => (
                            <Link key={maker.id} to={`/makers/${maker.id}`} className="group interactive-lift block">
                                <Card className="h-full flex flex-col group-hover:border-brutal-red transition-colors duration-300">
                                    <div className="aspect-square w-full overflow-hidden bg-brutal-dark relative">
                                        {maker.avatar_url ? (
                                            <img
                                                src={maker.avatar_url}
                                                alt={maker.display_name}
                                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-heading text-6xl text-brutal-bg/20">
                                                {maker.display_name?.[0]?.toUpperCase() || '?'}
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6 flex-1 flex flex-col">
                                        <h3 className="font-heading font-bold text-2xl mb-2">{maker.display_name}</h3>
                                        <p className="font-data text-sm text-brutal-dark/70 line-clamp-2 mb-4">
                                            {maker.bio || 'No bio yet.'}
                                        </p>

                                        <div className="flex flex-wrap gap-2 mt-auto">
                                            {maker.skills.slice(0, 3).map(s => (
                                                <span key={s} className="text-[10px] font-data font-bold uppercase tracking-wider bg-brutal-dark/5 px-2 py-1 rounded">
                                                    {s}
                                                </span>
                                            ))}
                                            {maker.skills.length > 3 && (
                                                <span className="text-[10px] font-data font-bold uppercase tracking-wider bg-brutal-dark/5 px-2 py-1 rounded">
                                                    +{maker.skills.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        ))}

                        {(makers || []).length === 0 && !loading && (
                            <div className="col-span-full py-20 text-center font-data text-brutal-dark/50 border-2 border-dashed border-brutal-dark/20 rounded-2xl">
                                No makers found.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
