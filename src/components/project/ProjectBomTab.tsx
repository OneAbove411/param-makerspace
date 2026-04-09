import React, { useState } from 'react';
import { useProjectBom, useProjectBomMutations } from '../../lib/hooks';
import type { ProjectBomLine } from '../../lib/database.types';
import { X, Plus, MessageCircle } from 'lucide-react';

interface ProjectBomTabProps {
    projectId: string;
    isOwner: boolean;
}

export function ProjectBomTab({ projectId, isOwner }: ProjectBomTabProps) {
    const { data: bomLines, loading, refetch } = useProjectBom(projectId);
    const { addLine, updateLine, deleteLine } = useProjectBomMutations();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<Partial<ProjectBomLine>>({});
    const [showNewForm, setShowNewForm] = useState(false);

    const handleEdit = (line: ProjectBomLine) => {
        setEditingId(line.id);
        setEditValues(line);
    };

    const handleSave = async (line: ProjectBomLine) => {
        await updateLine(projectId, line.id, editValues);
        setEditingId(null);
        refetch();
    };

    const handleDelete = async (id: string) => {
        await deleteLine(projectId, id);
        refetch();
    };

    const handleAddNew = async (e: React.FormEvent) => {
        e.preventDefault();
        const newLine: Omit<ProjectBomLine, 'id' | 'created_at'> = {
            project_id: projectId,
            reference: editValues.reference || '',
            part: editValues.part || '',
            quantity: editValues.quantity || 1,
            source_url: editValues.source_url || null,
            cost_cents: editValues.cost_cents || null,
            notes: editValues.notes || null,
            display_order: (bomLines?.length || 0),
        };
        await addLine(projectId, newLine);
        setEditValues({});
        setShowNewForm(false);
        refetch();
    };

    if (loading) return <div className="py-12 text-center text-brutal-dark/40">Loading BOM...</div>;

    if (!bomLines || bomLines.length === 0) {
        return (
            <div className="space-y-4">
                {!showNewForm && (
                    <div className="text-center py-12">
                        <p className="font-data text-sm text-brutal-dark/40">No Bill of Materials yet</p>
                        {isOwner && (
                            <button
                                onClick={() => setShowNewForm(true)}
                                className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-brutal-dark text-white text-xs font-bold rounded hover:opacity-80 transition"
                            >
                                <Plus size={14} /> Add first row
                            </button>
                        )}
                    </div>
                )}
                {showNewForm && (
                    <form onSubmit={handleAddNew} className="p-4 border border-brutal-dark/20 rounded bg-brutal-dark/5 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="text"
                                placeholder="Reference"
                                value={editValues.reference || ''}
                                onChange={(e) => setEditValues({ ...editValues, reference: e.target.value })}
                                className="px-2 py-1 border border-brutal-dark/20 rounded text-xs"
                            />
                            <input
                                type="text"
                                placeholder="Part"
                                value={editValues.part || ''}
                                onChange={(e) => setEditValues({ ...editValues, part: e.target.value })}
                                className="px-2 py-1 border border-brutal-dark/20 rounded text-xs"
                                required
                            />
                        </div>
                        <input
                            type="number"
                            placeholder="Qty"
                            value={editValues.quantity || ''}
                            onChange={(e) => setEditValues({ ...editValues, quantity: parseInt(e.target.value) || 1 })}
                            className="w-full px-2 py-1 border border-brutal-dark/20 rounded text-xs"
                        />
                        <input
                            type="text"
                            placeholder="Source URL"
                            value={editValues.source_url || ''}
                            onChange={(e) => setEditValues({ ...editValues, source_url: e.target.value })}
                            className="w-full px-2 py-1 border border-brutal-dark/20 rounded text-xs"
                        />
                        <textarea
                            placeholder="Notes"
                            value={editValues.notes || ''}
                            onChange={(e) => setEditValues({ ...editValues, notes: e.target.value })}
                            className="w-full px-2 py-1 border border-brutal-dark/20 rounded text-xs"
                            rows={2}
                        />
                        <div className="flex gap-2">
                            <button type="submit" className="px-3 py-1 bg-brutal-dark text-white text-xs font-bold rounded hover:opacity-80">
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowNewForm(false);
                                    setEditValues({});
                                }}
                                className="px-3 py-1 bg-brutal-dark/30 text-xs rounded hover:opacity-80"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b border-brutal-dark/20">
                            <th className="text-left p-2 font-bold text-xs text-brutal-dark/60">Reference</th>
                            <th className="text-left p-2 font-bold text-xs text-brutal-dark/60">Part</th>
                            <th className="text-center p-2 font-bold text-xs text-brutal-dark/60">Qty</th>
                            <th className="text-left p-2 font-bold text-xs text-brutal-dark/60">Source</th>
                            <th className="text-right p-2 font-bold text-xs text-brutal-dark/60">Cost</th>
                            <th className="text-left p-2 font-bold text-xs text-brutal-dark/60">Notes</th>
                            {isOwner && <th className="text-center p-2 font-bold text-xs text-brutal-dark/60">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {bomLines.map((line) => (
                            <tr key={line.id} className="border-b border-brutal-dark/10 hover:bg-brutal-dark/5">
                                {editingId === line.id ? (
                                    <>
                                        <td className="p-2">
                                            <input
                                                type="text"
                                                value={editValues.reference || ''}
                                                onChange={(e) => setEditValues({ ...editValues, reference: e.target.value })}
                                                className="w-full px-2 py-1 border border-brutal-dark/20 rounded text-xs"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="text"
                                                value={editValues.part || ''}
                                                onChange={(e) => setEditValues({ ...editValues, part: e.target.value })}
                                                className="w-full px-2 py-1 border border-brutal-dark/20 rounded text-xs"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                value={editValues.quantity || 1}
                                                onChange={(e) => setEditValues({ ...editValues, quantity: parseInt(e.target.value) })}
                                                className="w-full px-2 py-1 border border-brutal-dark/20 rounded text-xs text-center"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="text"
                                                value={editValues.source_url || ''}
                                                onChange={(e) => setEditValues({ ...editValues, source_url: e.target.value })}
                                                className="w-full px-2 py-1 border border-brutal-dark/20 rounded text-xs"
                                                placeholder="URL"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                value={editValues.cost_cents || ''}
                                                onChange={(e) => setEditValues({ ...editValues, cost_cents: e.target.value ? parseInt(e.target.value) : null })}
                                                className="w-full px-2 py-1 border border-brutal-dark/20 rounded text-xs text-right"
                                                placeholder="¢"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="text"
                                                value={editValues.notes || ''}
                                                onChange={(e) => setEditValues({ ...editValues, notes: e.target.value })}
                                                className="w-full px-2 py-1 border border-brutal-dark/20 rounded text-xs"
                                            />
                                        </td>
                                        <td className="p-2 text-center space-x-1">
                                            <button
                                                onClick={() => handleSave(line)}
                                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:opacity-80"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="px-2 py-1 bg-brutal-dark/30 text-xs rounded hover:opacity-80"
                                            >
                                                Cancel
                                            </button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="p-2 text-brutal-dark/80 font-mono text-xs">{line.reference}</td>
                                        <td className="p-2 font-bold text-brutal-dark">{line.part}</td>
                                        <td className="p-2 text-center text-brutal-dark/60">{line.quantity}</td>
                                        <td className="p-2 text-xs">
                                            {line.source_url ? (
                                                <a href={line.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline truncate">
                                                    Link
                                                </a>
                                            ) : (
                                                <span className="text-brutal-dark/30">—</span>
                                            )}
                                        </td>
                                        <td className="p-2 text-right text-brutal-dark/80">
                                            {line.cost_cents !== null ? `$${(line.cost_cents / 100).toFixed(2)}` : '—'}
                                        </td>
                                        <td className="p-2 text-xs text-brutal-dark/70">{line.notes || '—'}</td>
                                        <td className="p-2 text-center">
                                            {isOwner ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(line)}
                                                        className="px-2 py-1 text-xs bg-brutal-dark/10 rounded hover:opacity-80"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(line.id)}
                                                        className="p-1 text-red-600 hover:opacity-80"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : null}
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isOwner && !showNewForm && (
                <button
                    onClick={() => setShowNewForm(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-brutal-dark/10 text-brutal-dark text-xs font-bold rounded hover:bg-brutal-dark/20 transition"
                >
                    <Plus size={14} /> Add row
                </button>
            )}

            {showNewForm && (
                <form onSubmit={handleAddNew} className="p-4 border border-brutal-dark/20 rounded bg-brutal-dark/5 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="text"
                            placeholder="Reference"
                            value={editValues.reference || ''}
                            onChange={(e) => setEditValues({ ...editValues, reference: e.target.value })}
                            className="px-2 py-1 border border-brutal-dark/20 rounded text-xs"
                        />
                        <input
                            type="text"
                            placeholder="Part"
                            value={editValues.part || ''}
                            onChange={(e) => setEditValues({ ...editValues, part: e.target.value })}
                            className="px-2 py-1 border border-brutal-dark/20 rounded text-xs"
                            required
                        />
                    </div>
                    <input
                        type="text"
                        placeholder="Source URL"
                        value={editValues.source_url || ''}
                        onChange={(e) => setEditValues({ ...editValues, source_url: e.target.value })}
                        className="w-full px-2 py-1 border border-brutal-dark/20 rounded text-xs"
                    />
                    <textarea
                        placeholder="Notes"
                        value={editValues.notes || ''}
                        onChange={(e) => setEditValues({ ...editValues, notes: e.target.value })}
                        className="w-full px-2 py-1 border border-brutal-dark/20 rounded text-xs"
                        rows={2}
                    />
                    <div className="flex gap-2">
                        <button type="submit" className="px-3 py-1 bg-brutal-dark text-white text-xs font-bold rounded hover:opacity-80">
                            Save
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowNewForm(false);
                                setEditValues({});
                            }}
                            className="px-3 py-1 bg-brutal-dark/30 text-xs rounded hover:opacity-80"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
