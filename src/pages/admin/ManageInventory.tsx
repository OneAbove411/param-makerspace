import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { useInventory, useInventoryMutations } from '../../lib/hooks';
import { Link } from 'react-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Box, Plus, Trash2, Edit2, X, AlertCircle, Package } from 'lucide-react';
import type { Inventory } from '../../lib/database.types';
import { AdminPageShell } from '../../components/admin/AdminPageShell';
import { BrutalStatCard } from '../../components/admin/BrutalStatCard';
import { BrutalTable } from '../../components/admin/BrutalTable';
import type { BrutalColumn } from '../../components/admin/BrutalTable';
import { ConfirmDeleteCard } from '../../components/admin/ConfirmDeleteCard';
import { smoothScrollIntoView } from '../../lib/scroll';

export function ManageInventory() {
    const { role } = useAuth();
    const { data: inventoryItems, loading, refetch } = useInventory();
    const { createItem, updateItem, deleteItem } = useInventoryMutations();

    const [isEditing, setIsEditing] = useState<string | 'new' | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);

    // Delete confirmation state (replaces window.confirm)
    const [deleteTarget, setDeleteTarget] = useState<Inventory | null>(null);

    useEffect(() => {
        if (isEditing && formRef.current) {
            smoothScrollIntoView(formRef.current, { block: 'start' });
        }
    }, [isEditing]);

    // Form state
    const [form, setForm] = useState<Partial<Inventory>>({
        name: '', description: '', quantity: 0, unit: 'pcs', location: ''
    });

    if (role !== 'admin' && role !== 'mentor') {
        return <div className="p-24 text-center font-data text-2xl">Access Denied</div>;
    }

    const startEdit = (item?: Inventory) => {
        if (item) {
            setForm(item);
            setIsEditing(item.id);
        } else {
            setForm({ name: '', description: '', quantity: 0, unit: 'pcs', location: '' });
            setIsEditing('new');
        }
    };

    const cancelEdit = () => {
        setIsEditing(null);
        setForm({});
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);

        try {
            const payload = { ...form } as any;

            if (isEditing === 'new') {
                const { error } = await createItem(payload);
                if (error) throw new Error(error);
            } else if (isEditing) {
                const { error } = await updateItem(isEditing, payload);
                if (error) throw new Error(error);
            }

            await refetch();
            cancelEdit();
        } catch (err: any) {
            alert(err.message || 'Failed to save inventory item');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setActionLoading(true);
        await deleteItem(id);
        await refetch();
        setActionLoading(false);
        setDeleteTarget(null);
    };

    // Quick quantity adjust (inline)
    const handleQuickAdjust = async (id: string, currentQty: number, delta: number) => {
        const newQty = Math.max(0, currentQty + delta);
        if (newQty === currentQty) return;
        setActionLoading(true);
        await updateItem(id, { quantity: newQty });
        await refetch();
        setActionLoading(false);
    };

    if (loading) return <div className="p-24 flex justify-center font-data">Loading inventory...</div>;

    const lowStockItems = inventoryItems?.filter(i => i.quantity <= 5) || [];
    const totalItems = inventoryItems?.length || 0;

    // Max quantity for proportional bar widths
    const maxQty = Math.max(1, ...(inventoryItems?.map(i => i.quantity) || [1]));

    // ── Table column definitions ──────────────────────────────────
    const columns: BrutalColumn<Inventory>[] = [
        {
            key: 'item',
            header: 'Item',
            render: (item) => (
                <div>
                    <div className="font-bold text-brutal-dark flex items-center gap-2">
                        {item.name}
                        {item.quantity <= 5 && (
                            <span title="Low Stock">
                                <AlertCircle className="w-4 h-4 text-brutal-red" />
                            </span>
                        )}
                    </div>
                    <div className="text-sm text-brutal-dark/60 truncate max-w-xs">
                        {item.description}
                    </div>
                </div>
            ),
        },
        {
            key: 'location',
            header: 'Location',
            render: (item) => (
                <span className="font-data bg-brutal-paper border border-brutal-dark px-2 py-1 text-sm font-bold text-brutal-dark/80">
                    {item.location || 'Unassigned'}
                </span>
            ),
        },
        {
            key: 'quantity',
            header: 'Quantity',
            render: (item) => (
                <div className="flex items-center gap-3">
                    {/* Quantity number */}
                    <span
                        className={`font-heading font-bold text-xl min-w-[2.5rem] ${
                            item.quantity <= 5 ? 'text-brutal-red' : 'text-brutal-dark'
                        }`}
                    >
                        {item.quantity}
                    </span>
                    <span className="text-sm text-brutal-dark/60">{item.unit}</span>

                    {/* Mini proportional bar */}
                    <div className="hidden sm:block w-20 h-2 bg-brutal-dark/10 relative ml-2">
                        <div
                            className={`absolute inset-y-0 left-0 transition-all duration-300 ${
                                item.quantity <= 5 ? 'bg-brutal-red' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, (item.quantity / maxQty) * 100)}%` }}
                        />
                    </div>

                    {/* +/- stepper buttons */}
                    <div className="flex border-2 border-brutal-dark ml-2 overflow-hidden">
                        <button
                            onClick={() => handleQuickAdjust(item.id, item.quantity, -1)}
                            className="px-2.5 py-1 font-data font-bold hover:bg-brutal-red hover:text-white transition-colors disabled:opacity-50"
                            disabled={actionLoading || item.quantity <= 0}
                            title="Decrease"
                        >
                            −
                        </button>
                        <button
                            onClick={() => handleQuickAdjust(item.id, item.quantity, 1)}
                            className="px-2.5 py-1 font-data font-bold hover:bg-green-600 hover:text-white transition-colors border-l-2 border-brutal-dark disabled:opacity-50"
                            disabled={actionLoading}
                            title="Increase"
                        >
                            +
                        </button>
                    </div>
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            headerAlign: 'right' as const,
            cellClassName: 'text-right',
            render: (item) => (
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={() => startEdit(item)}
                        className="p-2 border-2 border-brutal-dark hover:bg-brutal-dark hover:text-white transition-colors"
                        title="Edit"
                        disabled={actionLoading}
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-2 border-2 border-brutal-red/20 text-brutal-red hover:bg-brutal-red hover:text-white transition-colors"
                        title="Delete"
                        disabled={actionLoading}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AdminPageShell
            role={role}
            title="Inventory Tracking"
            subtitle="Track consumables, spare parts, and general lab supplies."
            icon={Box}
            headerAction={
                !isEditing ? (
                    <Button onClick={() => startEdit()}>
                        <Plus className="w-5 h-5 mr-2" /> Track New Item
                    </Button>
                ) : undefined
            }
        >
            {/* ── Stat cards row ──────────────────────────────────── */}
            {!isEditing && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <BrutalStatCard
                        value={totalItems}
                        label="Total Items"
                        icon={Package}
                    />
                    <BrutalStatCard
                        value={lowStockItems.length}
                        label={`Item${lowStockItems.length !== 1 ? 's' : ''} below 5 units`}
                        icon={AlertCircle}
                        variant={lowStockItems.length > 0 ? 'alert' : 'default'}
                    />
                </div>
            )}

            {/* ── Low stock detail banner ─────────────────────────── */}
            {lowStockItems.length > 0 && !isEditing && (
                <div className="border-2 border-brutal-red/30 bg-red-50 p-4 flex items-start gap-4 shadow-[4px_4px_0_0_rgba(196,41,30,0.15)]">
                    <AlertCircle className="w-6 h-6 text-brutal-red flex-shrink-0 mt-1" />
                    <div>
                        <h3 className="font-heading font-bold text-xl text-brutal-dark uppercase">
                            Low Stock Alerts
                        </h3>
                        <ul className="list-disc pl-5 mt-2 font-data text-sm text-brutal-dark/70">
                            {lowStockItems.map(item => (
                                <li key={`alert-${item.id}`}>
                                    <strong>{item.name}</strong> has only {item.quantity} {item.unit} remaining
                                    {item.location && ` (Bin: ${item.location})`}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* ── Delete confirmation card ────────────────────────── */}
            {deleteTarget && (
                <ConfirmDeleteCard
                    entityName={deleteTarget.name}
                    message={`This will permanently remove "${deleteTarget.name}" from inventory. This action cannot be undone.`}
                    onConfirm={() => handleDelete(deleteTarget.id)}
                    onCancel={() => setDeleteTarget(null)}
                    loading={actionLoading}
                />
            )}

            {/* ── Edit / New form ─────────────────────────────────── */}
            {isEditing ? (
                <Card ref={formRef} className="p-8 border-2 border-brutal-dark border-t-8 border-t-brutal-red shadow-[6px_6px_0_0_rgba(17,17,17,1)] scroll-mt-32">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-heading font-bold text-3xl uppercase">
                            {isEditing === 'new' ? 'Add Inventory Item' : 'Edit Item'}
                        </h2>
                        <button onClick={cancelEdit} className="p-2 hover:bg-brutal-dark/10 rounded-full transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Item Name"
                                required
                                value={form.name || ''}
                                onChange={e => setForm({...form, name: e.target.value})}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    type="number"
                                    label="Quantity"
                                    required
                                    min="0"
                                    value={form.quantity?.toString() || '0'}
                                    onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 0})}
                                />
                                <Input
                                    label="Unit (e.g. g, pcs, ml)"
                                    value={form.unit || ''}
                                    onChange={e => setForm({...form, unit: e.target.value})}
                                />
                            </div>
                            <Input
                                label="Location / Bin Number"
                                value={form.location || ''}
                                placeholder="e.g. Rack A, Shelf 2"
                                onChange={e => setForm({...form, location: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Notes / Description</label>
                            <textarea
                                className="w-full bg-brutal-bg border-2 border-brutal-dark p-3 rounded font-data min-h-[80px]"
                                value={form.description || ''}
                                onChange={e => setForm({...form, description: e.target.value})}
                            />
                        </div>

                        <div className="flex justify-end gap-4 pt-6 border-t-2 border-brutal-dark/10">
                            <Button type="button" variant="ghost" onClick={cancelEdit} disabled={actionLoading}>Cancel</Button>
                            <Button type="submit" disabled={actionLoading}>
                                {actionLoading ? 'Saving...' : 'Save Item'}
                            </Button>
                        </div>
                    </form>
                </Card>
            ) : (
                /* ── Inventory table ──────────────────────────────── */
                <BrutalTable<Inventory>
                    columns={columns}
                    data={inventoryItems || []}
                    rowKey={(item) => item.id}
                    rowClassName={(item) =>
                        item.quantity <= 5
                            ? 'border-l-4 border-l-brutal-red bg-red-50 hover:bg-red-100/50'
                            : ''
                    }
                    emptyMessage="Inventory is currently empty."
                />
            )}
        </AdminPageShell>
    );
}
