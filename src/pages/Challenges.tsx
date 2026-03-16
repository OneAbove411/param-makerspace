import React, { useState } from 'react';
import { useChallenges } from '../lib/hooks';
import { Card } from '../components/ui/Card';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';

export function Challenges() {
    const [filter, setFilter] = useState('All');
    const tiers = ['All', 'Tier 1', 'Tier 2', 'Tier 3'];
    const { data: challenges, loading } = useChallenges(filter);

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="font-heading font-bold text-5xl md:text-7xl uppercase tracking-tight-heading mb-8">
                    Challenge Database
                </h1>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-12 border-b-2 border-brutal-dark/10 pb-6">
                    {tiers.map(t => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={`px-4 py-2 font-data text-sm rounded-full transition-colors border-2 ${filter === t
                                    ? 'bg-brutal-red text-brutal-bg border-brutal-red'
                                    : 'border-brutal-dark/20 text-brutal-dark hover:border-brutal-dark hover:bg-brutal-dark/5'
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="py-20 text-center font-data text-brutal-dark/50">Loading challenges...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
                        {(challenges || []).map(challenge => (
                            <Link key={challenge.id} to={`/challenges/${challenge.id}`} className="group interactive-lift block">
                                <Card className="h-full flex flex-col group-hover:border-brutal-dark transition-colors duration-300 pointer-events-auto">
                                    <div className="h-48 w-full overflow-hidden bg-brutal-dark relative">
                                        {challenge.cover_image_url ? (
                                            <img
                                                src={challenge.cover_image_url}
                                                alt={challenge.title}
                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 ease-out"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-data text-brutal-bg/20">NO IMAGE</div>
                                        )}
                                        <div className="absolute top-4 left-4 flex gap-2">
                                            {challenge.tier && <span className="bg-brutal-dark text-brutal-bg px-2 py-1 text-xs font-bold font-data rounded border border-brutal-dark/10 shadow-sm">{challenge.tier}</span>}
                                            {challenge.domain && <span className="bg-brutal-bg text-brutal-dark px-2 py-1 text-xs font-bold font-data rounded border border-brutal-bg/10 shadow-sm">{challenge.domain}</span>}
                                        </div>
                                    </div>

                                    <div className="p-6 flex-1 flex flex-col">
                                        <h3 className="font-heading font-bold text-2xl mb-4 line-clamp-2 leading-tight">{challenge.title}</h3>

                                        <div className="flex items-center justify-between border-t border-brutal-dark/10 pt-4 mt-auto">
                                            <div className="flex items-center gap-2 font-data text-xs font-bold text-brutal-dark/60 uppercase">
                                                <Clock className="w-4 h-4" /> {challenge.time_estimate || 'Varies'}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        ))}

                        {(challenges || []).length === 0 && !loading && (
                            <div className="col-span-full py-20 text-center font-data text-brutal-dark/50 border-2 border-dashed border-brutal-dark/20 rounded-2xl">
                                No challenges found.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
