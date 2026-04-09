import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useProject, useMergeRequestMutations } from '../lib/hooks';
import { supabase } from '../lib/supabase';
import { ArrowLeft } from 'lucide-react';

export function NewMergeRequestPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: project, loading: projectLoading } = useProject(id);
    const { create } = useMergeRequestMutations();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        // Only remixes can submit MRs
        if (!projectLoading && project && !project.remixed_from_id) {
            navigate(`/projects/${id}`);
        }
    }, [project, projectLoading, navigate, id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!project || !project.remixed_from_id || !user) return;

        setSubmitting(true);
        try {
            // Fetch BOM lines for both projects
            const { data: sourceBomData } = await supabase
                .from('project_bom_line')
                .select('part, quantity')
                .eq('project_id', project.id);

            const { data: targetBomData } = await supabase
                .from('project_bom_line')
                .select('part, quantity')
                .eq('project_id', project.remixed_from_id);

            const diffSnapshot = {
                title: [project.title, null],
                description: [project.description, null],
                bom_lines: [sourceBomData || [], targetBomData || []],
            };

            const { data, error } = await create({
                source_project_id: project.id,
                target_project_id: project.remixed_from_id,
                title,
                body,
                status: 'open',
                diff_snapshot: diffSnapshot,
                submitter_id: user?.id,
            });

            if (!error && data) {
                navigate(`/projects/${project.remixed_from_id}/merge-requests/${data.id}`);
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (projectLoading) {
        return (
            <div className="container mx-auto py-12 px-4">
                <p className="text-center text-brutal-dark/40">Loading...</p>
            </div>
        );
    }

    if (!project || !project.remixed_from_id) {
        return null;
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-2xl">
            <button
                onClick={() => navigate(`/projects/${id}`)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-bold text-brutal-dark hover:opacity-60 transition mb-6"
            >
                <ArrowLeft size={16} /> Back to Project
            </button>

            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-brutal-dark">Create Merge Request</h1>
                    <p className="text-sm text-brutal-dark/60 mt-2">
                        Submit your improvements to the original project for review
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 border border-brutal-dark/20 rounded-lg p-6">
                    <div>
                        <label className="text-sm font-bold text-brutal-dark/60 block mb-2">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Improved motor efficiency"
                            className="w-full px-3 py-2 border border-brutal-dark/20 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brutal-dark/30"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-sm font-bold text-brutal-dark/60 block mb-2">Description (optional)</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="What changes did you make? Why should the original creator accept this?"
                            className="w-full px-3 py-2 border border-brutal-dark/20 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brutal-dark/30"
                            rows={6}
                        />
                    </div>

                    <div className="pt-4 border-t border-brutal-dark/20 flex gap-3">
                        <button
                            type="submit"
                            disabled={submitting || !title}
                            className="flex-1 px-4 py-2 bg-brutal-dark text-white font-bold rounded disabled:opacity-50 hover:opacity-80 transition"
                        >
                            {submitting ? 'Creating...' : 'Create Merge Request'}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate(`/projects/${id}`)}
                            className="flex-1 px-4 py-2 bg-brutal-dark/10 font-bold rounded hover:opacity-80 transition"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
