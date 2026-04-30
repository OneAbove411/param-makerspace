import React, { useState, useRef, useEffect } from 'react';
import { useProjectBom, useProjectBomMutations } from '../../lib/hooks';
import type { ProjectBomLine } from '../../lib/database.types';
import { X, Plus, ExternalLink, ShoppingCart, Printer, Package } from 'lucide-react';
import { cn } from '../../lib/utils';
import { smoothScrollIntoView } from '../../lib/scroll';

interface ProjectBomTabProps {
    projectId: string;
    isOwner: boolean;
    /** 'grid' = visual card layout (default), 'table' = compact table */
    variant?: 'grid' | 'table';
}

// ─── Generic component icon based on part name ─────────────────────────────
const PART_ICONS: Record<string, string> = {
    motor: '\u2699\uFE0F',
    servo: '\u2699\uFE0F',
    esp32: '\uD83D\uDCBB',
    arduino: '\uD83D\uDCBB',
    controller: '\uD83D\uDCBB',
    mcu: '\uD83D\uDCBB',
    sensor: '\uD83D\uDCE1',
    screw: '\uD83D\uDD29',
    bolt: '\uD83D\uDD29',
    nut: '\uD83D\uDD29',
    wire: '\u26A1',
    cable: '\u26A1',
    battery: '\uD83D\uDD0B',
    led: '\uD83D\uDCA1',
    resistor: '\u26A1',
    capacitor: '\u26A1',
    arm: '\uD83E\uDDBE',
    base: '\uD83E\uDDF1',
    plate: '\uD83E\uDDF1',
    frame: '\uD83E\uDDF1',
    chassis: '\uD83E\uDDF1',
    camera: '\uD83D\uDCF7',
    screen: '\uD83D\uDCFA',
    display: '\uD83D\uDCFA',
    wheel: '\u2B55',
    gear: '\u2699\uFE0F',
    bearing: '\u2B55',
    pcb: '\uD83D\uDFE9',
    board: '\uD83D\uDFE9',
    filament: '\uD83E\uDDF5',
    '3d': '\uD83D\uDDA8\uFE0F',
    print: '\uD83D\uDDA8\uFE0F',
};

function getPartIcon(partName: string): string {
    const lower = partName.toLowerCase();
    for (const [keyword, icon] of Object.entries(PART_ICONS)) {
        if (lower.includes(keyword)) return icon;
    }
    return '\uD83D\uDCE6'; // package emoji as default
}

function isPrintable(line: ProjectBomLine): boolean {
    const lower = (line.part + ' ' + (line.notes || '')).toLowerCase();
    return lower.includes('3d') || lower.includes('print') || lower.includes('filament') || lower.includes('pla') || lower.includes('stl');
}

// ─── Visual Card Grid (inspired by reference design) ───────────────────────

function BomCardGrid({ bomLines, isOwner, onEdit, onDelete }: {
    bomLines: ProjectBomLine[];
    isOwner: boolean;
    onEdit: (line: ProjectBomLine) => void;
    onDelete: (id: string) => void;
}) {
    const totalCost = bomLines.reduce((sum, l) => sum + (l.cost_cents || 0), 0);

    return (
        <div className="space-y-4">
            {/* Total cost bar */}
            {totalCost > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-brutal-dark/[0.03] border border-brutal-dark/8">
                    <span className="font-data text-[11px] font-bold uppercase tracking-widest text-brutal-dark/50">
                        Est. Total Cost
                    </span>
                    <span className="font-heading font-bold text-lg text-brutal-red tabular-nums">
                        {'\u20B9'}{(totalCost / 100).toFixed(2)}
                    </span>
                </div>
            )}

            {/* Card grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {bomLines.map((line) => {
                    const icon = getPartIcon(line.part);
                    const printable = isPrintable(line);
                    const hasCost = line.cost_cents !== null && line.cost_cents > 0;

                    return (
                        <div
                            key={line.id}
                            className={cn(
                                'group relative rounded-xl border-2 border-brutal-dark/8 bg-white overflow-hidden',
                                'hover:border-brutal-red/30 hover:shadow-[0_4px_20px_rgba(196,41,30,0.08)] transition-all duration-300',
                            )}
                        >
                            {/* Image / Icon area — large visual block */}
                            <div className="aspect-square bg-brutal-bg flex items-center justify-center relative overflow-hidden">
                                {line.image_url ? (
                                    <img
                                        src={line.image_url}
                                        alt={line.part}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        loading="lazy"
                                    />
                                ) : (
                                    <span className="text-4xl select-none group-hover:scale-110 transition-transform duration-300">
                                        {icon}
                                    </span>
                                )}
                                {/* Quantity badge */}
                                {line.quantity > 1 && (
                                    <span className="absolute top-2 right-2 min-w-[22px] h-[22px] flex items-center justify-center
                                                     rounded-full bg-brutal-dark text-brutal-bg font-data text-[9px] font-bold px-1.5">
                                        x{line.quantity}
                                    </span>
                                )}
                                {/* Owner edit overlay */}
                                {isOwner && (
                                    <div className="absolute inset-0 bg-brutal-dark/60 opacity-0 group-hover:opacity-100 transition-opacity
                                                    flex items-center justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onEdit(line)}
                                            className="px-2.5 py-1.5 bg-white text-brutal-dark font-data text-[10px] font-bold rounded-lg
                                                       hover:bg-brutal-red hover:text-white transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onDelete(line.id)}
                                            className="p-1.5 bg-white/90 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Info area */}
                            <div className="p-2.5 space-y-1.5">
                                <h4 className="font-heading font-bold text-[11px] uppercase tracking-tight leading-tight text-brutal-dark line-clamp-2">
                                    {line.part}
                                    {line.quantity > 1 && (
                                        <span className="text-brutal-dark/40 font-data ml-1">(x{line.quantity})</span>
                                    )}
                                </h4>

                                {line.reference && (
                                    <p className="font-data text-[9px] text-brutal-dark/40 truncate">
                                        {line.reference}
                                    </p>
                                )}

                                {/* Price + action row */}
                                <div className="flex items-center justify-between pt-1">
                                    {hasCost ? (
                                        <span className="font-heading font-bold text-sm text-brutal-dark tabular-nums">
                                            {'\u20B9'}{(line.cost_cents! / 100).toFixed(2)}
                                        </span>
                                    ) : (
                                        <span className="font-data text-[10px] text-brutal-dark/25">—</span>
                                    )}

                                    {/* Action button */}
                                    {line.source_url ? (
                                        <a
                                            href={line.source_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-brutal-red/10 text-brutal-red
                                                       font-data text-[9px] font-bold uppercase tracking-wider hover:bg-brutal-red hover:text-white transition-colors"
                                        >
                                            <ShoppingCart size={9} /> Buy
                                        </a>
                                    ) : printable ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 text-green-600
                                                         font-data text-[9px] font-bold uppercase tracking-wider">
                                            <Printer size={9} /> Print
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Compact Table (for "Overview" tab or fallback) ────────────────────────

function BomTable({ bomLines, isOwner, onEdit, onDelete }: {
    bomLines: ProjectBomLine[];
    isOwner: boolean;
    onEdit: (line: ProjectBomLine) => void;
    onDelete: (id: string) => void;
}) {
    return (
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
                                {line.cost_cents !== null ? `\u20B9${(line.cost_cents / 100).toFixed(2)}` : '—'}
                            </td>
                            <td className="p-2 text-xs text-brutal-dark/70">{line.notes || '—'}</td>
                            {isOwner && (
                                <td className="p-2 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => onEdit(line)}
                                            className="px-2 py-1 text-xs bg-brutal-dark/10 rounded hover:opacity-80"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => onDelete(line.id)}
                                            className="p-1 text-red-600 hover:opacity-80"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Main export ───────────────────────────────────────────────────────────

export function ProjectBomTab({ projectId, isOwner, variant = 'grid' }: ProjectBomTabProps) {
    const { data: bomLines, loading, refetch } = useProjectBom(projectId);
    const { addLine, updateLine, deleteLine } = useProjectBomMutations();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<Partial<ProjectBomLine>>({});
    const [showNewForm, setShowNewForm] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);

    // Scroll to form whenever it appears
    useEffect(() => {
        if (showNewForm && formRef.current) {
            smoothScrollIntoView(formRef.current, { block: 'center' });
        }
    }, [showNewForm]);

    const handleEdit = (line: ProjectBomLine) => {
        setEditingId(line.id);
        setEditValues(line);
        setShowNewForm(true);
    };

    const handleSave = async () => {
        if (editingId) {
            await updateLine(projectId, editingId, editValues);
            setEditingId(null);
        }
        setEditValues({});
        setShowNewForm(false);
        refetch();
    };

    const handleDelete = async (id: string) => {
        await deleteLine(projectId, id);
        refetch();
    };

    const handleAddNew = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            await handleSave();
            return;
        }
        const newLine: Omit<ProjectBomLine, 'id' | 'created_at'> = {
            project_id: projectId,
            reference: editValues.reference || '',
            part: editValues.part || '',
            quantity: editValues.quantity || 1,
            source_url: editValues.source_url || null,
            cost_cents: editValues.cost_cents || null,
            notes: editValues.notes || null,
            image_url: editValues.image_url || null,
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
                        <Package size={32} className="mx-auto text-brutal-dark/15 mb-3" />
                        <p className="font-data text-sm text-brutal-dark/40">No Bill of Materials yet</p>
                        {isOwner && (
                            <button
                                onClick={() => setShowNewForm(true)}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-brutal-dark text-white text-xs font-bold rounded-lg hover:bg-brutal-red transition-colors"
                            >
                                <Plus size={14} /> Add first component
                            </button>
                        )}
                    </div>
                )}
                {showNewForm && <div ref={formRef}><AddEditForm editValues={editValues} setEditValues={setEditValues} onSubmit={handleAddNew} onCancel={() => { setShowNewForm(false); setEditingId(null); setEditValues({}); }} isEditing={!!editingId} /></div>}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {variant === 'grid' ? (
                <BomCardGrid bomLines={bomLines} isOwner={isOwner} onEdit={handleEdit} onDelete={handleDelete} />
            ) : (
                <BomTable bomLines={bomLines} isOwner={isOwner} onEdit={handleEdit} onDelete={handleDelete} />
            )}

            {isOwner && !showNewForm && (
                <button
                    onClick={() => { setEditingId(null); setEditValues({}); setShowNewForm(true); }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-brutal-dark/10 text-brutal-dark text-xs font-bold rounded-lg hover:bg-brutal-dark/20 transition"
                >
                    <Plus size={14} /> Add component
                </button>
            )}

            {showNewForm && <div ref={formRef}><AddEditForm editValues={editValues} setEditValues={setEditValues} onSubmit={handleAddNew} onCancel={() => { setShowNewForm(false); setEditingId(null); setEditValues({}); }} isEditing={!!editingId} /></div>}
        </div>
    );
}

// ─── Shared add/edit form ──────────────────────────────────────────────────

function AddEditForm({ editValues, setEditValues, onSubmit, onCancel, isEditing }: {
    editValues: Partial<ProjectBomLine>;
    setEditValues: React.Dispatch<React.SetStateAction<Partial<ProjectBomLine>>>;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    isEditing: boolean;
}) {
    return (
        <form onSubmit={onSubmit} className="p-4 border-2 border-brutal-dark/10 rounded-xl bg-brutal-bg space-y-3">
            <p className="font-heading font-bold text-xs uppercase tracking-widest text-brutal-dark/50 mb-2">
                {isEditing ? 'Edit Component' : 'Add Component'}
            </p>
            <div className="grid grid-cols-2 gap-2">
                <input
                    type="text"
                    placeholder="Part name *"
                    value={editValues.part || ''}
                    onChange={(e) => setEditValues({ ...editValues, part: e.target.value })}
                    className="px-3 py-2 border-2 border-brutal-dark/10 rounded-lg text-xs font-data focus:border-brutal-red/40 focus:outline-none transition-colors"
                    required
                />
                <input
                    type="text"
                    placeholder="Reference (e.g. U1)"
                    value={editValues.reference || ''}
                    onChange={(e) => setEditValues({ ...editValues, reference: e.target.value })}
                    className="px-3 py-2 border-2 border-brutal-dark/10 rounded-lg text-xs font-data focus:border-brutal-red/40 focus:outline-none transition-colors"
                />
            </div>
            <div className="grid grid-cols-3 gap-2">
                <input
                    type="number"
                    placeholder="Qty"
                    value={editValues.quantity || ''}
                    onChange={(e) => setEditValues({ ...editValues, quantity: parseInt(e.target.value) || 1 })}
                    className="px-3 py-2 border-2 border-brutal-dark/10 rounded-lg text-xs font-data text-center focus:border-brutal-red/40 focus:outline-none transition-colors"
                />
                <input
                    type="number"
                    placeholder="Cost (cents)"
                    value={editValues.cost_cents || ''}
                    onChange={(e) => setEditValues({ ...editValues, cost_cents: e.target.value ? parseInt(e.target.value) : null })}
                    className="px-3 py-2 border-2 border-brutal-dark/10 rounded-lg text-xs font-data text-center focus:border-brutal-red/40 focus:outline-none transition-colors"
                />
                <input
                    type="text"
                    placeholder="Source URL"
                    value={editValues.source_url || ''}
                    onChange={(e) => setEditValues({ ...editValues, source_url: e.target.value })}
                    className="px-3 py-2 border-2 border-brutal-dark/10 rounded-lg text-xs font-data focus:border-brutal-red/40 focus:outline-none transition-colors"
                />
            </div>
            <input
                type="text"
                placeholder="Image URL (optional)"
                value={editValues.image_url || ''}
                onChange={(e) => setEditValues({ ...editValues, image_url: e.target.value })}
                className="w-full px-3 py-2 border-2 border-brutal-dark/10 rounded-lg text-xs font-data focus:border-brutal-red/40 focus:outline-none transition-colors"
            />
            <textarea
                placeholder="Notes"
                value={editValues.notes || ''}
                onChange={(e) => setEditValues({ ...editValues, notes: e.target.value })}
                className="w-full px-3 py-2 border-2 border-brutal-dark/10 rounded-lg text-xs font-data focus:border-brutal-red/40 focus:outline-none transition-colors"
                rows={2}
            />
            <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-brutal-red text-white text-xs font-bold rounded-lg hover:bg-brutal-dark transition-colors">
                    {isEditing ? 'Save Changes' : 'Add'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 bg-brutal-dark/10 text-brutal-dark text-xs font-bold rounded-lg hover:bg-brutal-dark/20 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
