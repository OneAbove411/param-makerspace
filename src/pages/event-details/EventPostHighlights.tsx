import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const BuildChallengePostHighlights = ({ id }: { id: string }) => {
    const [submissions, setSubmissions] = useState<any[]>([]);

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase
                .from('event_submission')
                .select('id, status, project:project!project_id(id, title, summary), team:event_team!team_id(name)')
                .eq('event_id', id)
                .in('status', ['accepted', 'winner']);
            setSubmissions(data || []);
        };
        fetch();
    }, [id]);

    if (submissions.length === 0) {
        return <p className="font-data text-xs text-brutal-dark/50 p-6 bg-brutal-dark/5 rounded-xl border border-dashed border-brutal-dark/10 text-center">No submissions to showcase yet.</p>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {submissions.map(sub => (
                <div key={sub.id} className="p-5 bg-brutal-bg border-4 border-brutal-dark shadow-[4px_4px_0px_#111] flex flex-col hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#111] transition-all">
                    <div className="flex justify-between items-start mb-3">
                        <span className={`px-2 py-1 text-[9px] font-bold font-data rounded uppercase ${
                            sub.status === 'winner' ? 'bg-brutal-red text-brutal-bg shadow-sm' : 'bg-brutal-dark/10 text-brutal-dark'
                        }`}>{sub.status}</span>
                    </div>
                    <h4 className="font-heading font-bold text-sm mb-2 line-clamp-2 leading-tight">{sub.project?.title || 'Unknown Project'}</h4>
                    {sub.team && <p className="font-data text-xs text-brutal-dark/60 mb-4 flex-1">Team: {sub.team.name}</p>}
                    <div className="mt-auto pt-3 border-t border-brutal-dark/10">
                        {sub.project && (
                            <Link to={`/projects/${sub.project.id}`} className="font-data text-xs text-brutal-dark hover:text-brutal-red font-bold uppercase flex items-center gap-1 group w-fit">
                                View Project <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

const MakerMeetupPostHighlights = ({ id }: { id: string }) => {
    const [slots, setSlots] = useState<any[]>([]);

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase
                .from('showcase_slot')
                .select('id, status, user_id, project:project!project_id(id, title), app_user:app_user!user_id(name)')
                .eq('event_id', id)
                .eq('status', 'approved');
            setSlots(data || []);
        };
        fetch();
    }, [id]);

    if (slots.length === 0) {
        return <p className="font-data text-xs text-brutal-dark/50 p-6 bg-brutal-dark/5 rounded-xl border border-dashed border-brutal-dark/10 text-center">No presenters to showcase.</p>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {slots.map(slot => (
                <div key={slot.id} className="p-5 bg-brutal-bg border-4 border-brutal-dark shadow-[4px_4px_0px_#111]">
                    <div className="font-heading font-bold text-sm leading-tight mb-2">{slot.app_user?.name}</div>
                    {slot.project && (
                        <Link to={`/projects/${slot.project.id}`} className="font-data text-xs font-bold uppercase text-brutal-dark hover:text-brutal-red block w-fit">
                            {slot.project.title} →
                        </Link>
                    )}
                </div>
            ))}
        </div>
    );
};

const TechTuesdayPostHighlights = ({ id }: { id: string }) => {
    const [slots, setSlots] = useState<any[]>([]);

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase
                .from('showcase_slot')
                .select('id, status, user_id, project:project!project_id(id, title), app_user:app_user!user_id(name)')
                .eq('event_id', id)
                .eq('status', 'approved');
            setSlots(data || []);
        };
        fetch();
    }, [id]);

    if (slots.length === 0) {
        return <p className="font-data text-xs text-brutal-dark/50 p-6 bg-brutal-dark/5 rounded-xl border border-dashed border-brutal-dark/10 text-center">Session highlights coming soon.</p>;
    }

    return (
        <div className="space-y-3">
            {slots.map((slot, index) => (
                <div key={slot.id} className="flex items-center gap-4 p-4 bg-brutal-bg border-4 border-brutal-dark shadow-[4px_4px_0px_#111]">
                    <span className="font-data text-2xl font-bold text-brutal-red w-10 text-right">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                        <div className="font-heading font-bold text-sm leading-tight uppercase tracking-tight">{slot.app_user?.name}</div>
                        {slot.project && (
                            <Link to={`/projects/${slot.project.id}`} className="font-data text-xs font-bold text-brutal-dark/60 hover:text-brutal-red transition-colors mt-1 block">
                                {slot.project.title}
                            </Link>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export { BuildChallengePostHighlights, MakerMeetupPostHighlights, TechTuesdayPostHighlights };
