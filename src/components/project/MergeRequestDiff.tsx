import React from 'react';
import type { ProjectMergeRequest, Project } from '../../lib/database.types';
import { Check, X, ArrowLeft } from 'lucide-react';

interface MergeRequestDiffProps {
    mr: ProjectMergeRequest;
    sourceProject: Project | null;
    targetProject: Project | null;
    isTargetOwner: boolean;
    isSubmitter: boolean;
    onResolve: (status: 'accepted' | 'rejected' | 'withdrawn') => Promise<void>;
    loading: boolean;
}

export function MergeRequestDiff({
    mr,
    sourceProject,
    targetProject,
    isTargetOwner,
    isSubmitter,
    onResolve,
    loading,
}: MergeRequestDiffProps) {
    const snapshot = mr.diff_snapshot as any;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-brutal-dark/20 pb-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-brutal-dark">{mr.title}</h1>
                        <p className="text-sm text-brutal-dark/60 mt-1">{mr.body}</p>
                        <div className="flex gap-4 mt-3 text-xs text-brutal-dark/60">
                            <span>Created {new Date(mr.created_at).toLocaleDateString()}</span>
                            {mr.resolved_at && <span>Resolved {new Date(mr.resolved_at).toLocaleDateString()}</span>}
                        </div>
                    </div>
                    <span
                        className={`px-3 py-1 rounded text-xs font-bold ${
                            mr.status === 'open'
                                ? 'bg-blue-100 text-blue-900'
                                : mr.status === 'accepted'
                                  ? 'bg-green-100 text-green-900'
                                  : 'bg-red-100 text-red-900'
                        }`}
                    >
                        {mr.status.toUpperCase()}
                    </span>
                </div>
            </div>

            {/* Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Source */}
                <div className="space-y-3">
                    <h3 className="font-bold text-sm text-brutal-dark">From: {sourceProject?.title}</h3>
                    <div className="border border-brutal-dark/20 rounded p-3 space-y-2 text-sm bg-blue-50">
                        <div>
                            <span className="font-bold text-brutal-dark/60">Title</span>
                            <p className="text-brutal-dark">{snapshot?.title?.[0] || sourceProject?.title}</p>
                        </div>
                        <div>
                            <span className="font-bold text-brutal-dark/60">Description</span>
                            <p className="text-brutal-dark text-xs whitespace-pre-wrap">
                                {snapshot?.description?.[0] || sourceProject?.description || '(none)'}
                            </p>
                        </div>
                        {snapshot?.bom_lines?.[0] && (
                            <div>
                                <span className="font-bold text-brutal-dark/60 text-xs">BOM ({snapshot.bom_lines[0].length} items)</span>
                                <ul className="text-xs text-brutal-dark/70 mt-1 space-y-1">
                                    {snapshot.bom_lines[0].slice(0, 5).map((line: any, i: number) => (
                                        <li key={i}>
                                            + {line.part} (qty: {line.quantity})
                                        </li>
                                    ))}
                                    {snapshot.bom_lines[0].length > 5 && <li>+ {snapshot.bom_lines[0].length - 5} more</li>}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Target */}
                <div className="space-y-3">
                    <h3 className="font-bold text-sm text-brutal-dark">To: {targetProject?.title}</h3>
                    <div className="border border-brutal-dark/20 rounded p-3 space-y-2 text-sm bg-green-50">
                        <div>
                            <span className="font-bold text-brutal-dark/60">Title</span>
                            <p className="text-brutal-dark">{snapshot?.title?.[1] || targetProject?.title}</p>
                        </div>
                        <div>
                            <span className="font-bold text-brutal-dark/60">Description</span>
                            <p className="text-brutal-dark text-xs whitespace-pre-wrap">
                                {snapshot?.description?.[1] || targetProject?.description || '(none)'}
                            </p>
                        </div>
                        {snapshot?.bom_lines?.[1] && (
                            <div>
                                <span className="font-bold text-brutal-dark/60 text-xs">BOM ({snapshot.bom_lines[1].length} items)</span>
                                <ul className="text-xs text-brutal-dark/70 mt-1 space-y-1">
                                    {snapshot.bom_lines[1].slice(0, 5).map((line: any, i: number) => (
                                        <li key={i}>
                                            + {line.part} (qty: {line.quantity})
                                        </li>
                                    ))}
                                    {snapshot.bom_lines[1].length > 5 && <li>+ {snapshot.bom_lines[1].length - 5} more</li>}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            {mr.status === 'open' && (
                <div className="flex gap-2 pt-4 border-t border-brutal-dark/20">
                    {isTargetOwner && (
                        <>
                            <button
                                onClick={() => onResolve('accepted')}
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-bold rounded hover:opacity-80 disabled:opacity-50"
                            >
                                <Check size={16} /> Accept
                            </button>
                            <button
                                onClick={() => onResolve('rejected')}
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold rounded hover:opacity-80 disabled:opacity-50"
                            >
                                <X size={16} /> Reject
                            </button>
                        </>
                    )}
                    {isSubmitter && (
                        <button
                            onClick={() => onResolve('withdrawn')}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-brutal-dark/30 font-bold rounded hover:opacity-80 disabled:opacity-50"
                        >
                            <ArrowLeft size={16} /> Withdraw
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
