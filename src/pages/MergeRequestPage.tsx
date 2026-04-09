import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useProject, useMergeRequestMutations } from '../lib/hooks';
import { supabase } from '../lib/supabase';
import { MergeRequestDiff } from '../components/project/MergeRequestDiff';
import type { Project, ProjectMergeRequest } from '../lib/database.types';
import { ArrowLeft } from 'lucide-react';

export function MergeRequestPage() {
    const { id, mrId } = useParams<{ id: string; mrId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [mr, setMr] = useState<ProjectMergeRequest | null>(null);
    const [sourceProject, setSourceProject] = useState<Project | null>(null);
    const [targetProject, setTargetProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState(false);
    const { resolve } = useMergeRequestMutations();

    useEffect(() => {
        const loadMR = async () => {
            if (!mrId || !id) return;
            try {
                const { data: mrData, error: mrError } = await supabase
                    .from('project_merge_request')
                    .select('*')
                    .eq('id', mrId)
                    .single();

                if (mrError || !mrData) {
                    navigate(`/projects/${id}`);
                    return;
                }

                setMr(mrData);

                const { data: sourceData } = await supabase
                    .from('project')
                    .select('*')
                    .eq('id', mrData.source_project_id)
                    .single();

                const { data: targetData } = await supabase
                    .from('project')
                    .select('*')
                    .eq('id', mrData.target_project_id)
                    .single();

                setSourceProject(sourceData);
                setTargetProject(targetData);
            } finally {
                setLoading(false);
            }
        };

        loadMR();
    }, [mrId, id, navigate]);

    const handleResolve = async (status: 'accepted' | 'rejected' | 'withdrawn') => {
        if (!mr) return;
        setResolving(true);
        try {
            const { error } = await resolve(mr.id, status, mr.target_project_id);
            if (!error) {
                navigate(`/projects/${id}`);
            }
        } finally {
            setResolving(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto py-12 px-4">
                <p className="text-center text-brutal-dark/40">Loading...</p>
            </div>
        );
    }

    if (!mr || !sourceProject || !targetProject) {
        return (
            <div className="container mx-auto py-12 px-4">
                <p className="text-center text-brutal-dark/40">Merge request not found</p>
            </div>
        );
    }

    const isTargetOwner = user?.id === targetProject.owner_id;
    const isSubmitter = user?.id === mr.submitter_id;

    return (
        <div className="container mx-auto py-8 px-4">
            <button
                onClick={() => navigate(`/projects/${id}`)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-bold text-brutal-dark hover:opacity-60 transition mb-6"
            >
                <ArrowLeft size={16} /> Back to Project
            </button>

            <MergeRequestDiff
                mr={mr}
                sourceProject={sourceProject}
                targetProject={targetProject}
                isTargetOwner={isTargetOwner}
                isSubmitter={isSubmitter}
                onResolve={handleResolve}
                loading={resolving}
            />
        </div>
    );
}
