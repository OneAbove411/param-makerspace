import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useInventory, useInventoryMutations } from '../../lib/hooks';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Box, Plus, Trash2, Edit2, X, AlertCircle } from 'lucide-react';
import type { Inventory } from '../../lib/database.types';

export function ManageInventory() {
    const { role } = useAuth();
    const { data: inventoryItems, loading, refetch } = useInventory();
    const { createItem, updateItem, deleteItem } = useInventoryMutations();
    
    const [isEditing, setIsEditing] = useState<string | 'new' | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    
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
                await createItem(payload);
            } else if (isEditing) {
                await updateItem(isEditing, payload);
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
        if (!window.confirm("Delete this inventory item?")) return;
        setActionLoading(true);
        await deleteItem(id);
        await refetch();
        setActionLoading(false);
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

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-3 mb-2">
                    <span className="bg-brutal-red text-white px-2 py-1 text-xs font-bold font-data rounded uppercase">
                        {role === 'admin' ? 'Admin Panel' : 'Mentor Tools'}
                    </span>
                    <Link to="/dashboard" className="text-brutal-dark/60 hover:text-brutal-dark font-data text-sm font-bold ml-auto underline">
                        Back to Dashboard
                    </Link>
                </div>
                
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading flex items-center gap-4">
                            <Box className="w-10 h-10 text-brutal-red" />
                            Inventory Tracking
                        </h1>
                        <p className="font-data text-lg text-brutal-dark/60 border-l-4 border-brutal-red pl-4 mt-4">
                            Track consumables, spare parts, and general lab supplies.
                        </p>
                    </div>
                    {!isEditing && (
                        <Button onClick={() => startEdit()}>
                            <Plus className="w-5 h-5 mr-2" /> Track New Item
                        </Button>
                    )}
                </div>

                {lowStockItems.length > 0 && !isEditing && (
                    <div className="bg-yellow-100 border-2 border-yellow-500/30 p-4 rounded-xl flex items-start gap-4 mb-8">
                        <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="font-heading font-bold text-xl text-yellow-800 uppercase">Low Stock Alerts</h3>
                            <ul className="list-disc pl-5 mt-2 font-data text-sm text-yellow-800/80">
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

                {isEditing ? (
                    <Card className="p-8 border-2 border-brutal-dark/20 border-t-8 border-t-brutal-red shadow-xl">
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
                                    className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded font-data min-h-[80px]" 
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
                    <Card className="overflow-hidden border-2 border-brutal-dark/10">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse font-data">
                                <thead>
                                    <tr className="bg-brutal-dark/5 border-b-2 border-brutal-dark/10">
                                        <th className="p-4 font-bold text-sm uppercase text-brutal-dark/60 tracking-wider">Item</th>
                                        <th className="p-4 font-bold text-sm uppercase text-brutal-dark/60 tracking-wider">Location</th>
                                        <th className="p-4 font-bold text-sm uppercase text-brutal-dark/60 tracking-wider flex items-center justify-between">
                                            <span>Quantity</span>
                                        </th>
                                        <th className="p-4 font-bold text-sm uppercase text-brutal-dark/60 tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brutal-dark/5">
                                    {inventoryItems?.map(item => (
                                        <tr key={item.id} className={`hover:bg-brutal-dark/5 transition-colors ${item.quantity <= 5 ? 'bg-red-50 hover:bg-red-100/50' : ''}`}>
                                            <td className="p-4">
                                                <div className="font-bold text-brutal-dark flex items-center gap-2">
                                                    {item.name}
                                                    {item.quantity <= 5 && <span title="Low Stock"><AlertCircle className="w-4 h-4 text-brutal-red" /></span>}
                                                </div>
                                                <div className="text-sm text-brutal-dark/60 truncate max-w-xs">{item.description}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="bg-brutal-dark/5 px-2 py-1 rounded text-sm font-bold text-brutal-dark/80 font-mono">
                                                    {item.location || 'Unassigned'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <span className={`font-heading font-bold text-xl ${item.quantity <= 5 ? 'text-brutal-red' : 'text-brutal-dark'}`}>
                                                        {item.quantity}
                                                    </span>
                                                    <span className="text-sm text-brutal-dark/60">{item.unit}</span>
                                                    
                                                    <div className="flex bg-brutal-bg border-2 border-brutal-dark/10 rounded ml-4 overflow-hidden">
                                                        <button 
                                                            onClick={() => handleQuickAdjust(item.id, item.quantity, -1)}
                                                            className="px-2 py-1 hover:bg-brutal-red hover:text-white transition-colors disabled:opacity-50"
                                                            disabled={actionLoading || item.quantity <= 0}
                                                            title="Decrease"
                                                        >
                                                            -
                                                        </button>
                                                        <button 
                                                            onClick={() => handleQuickAdjust(item.id, item.quantity, 1)}
                                                            className="px-2 py-1 hover:bg-green-600 hover:text-white transition-colors border-l-2 border-brutal-dark/10 disabled:opacity-50"
                                                            disabled={actionLoading}
                                                            title="Increase"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <button 
                                                        onClick={() => startEdit(item)}
                                                        className="p-2 border-2 border-brutal-dark/20 rounded hover:bg-brutal-dark hover:text-white transition-colors"
                                                        title="Edit"
                                                        disabled={actionLoading}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-2 border-2 border-brutal-red/20 text-brutal-red rounded hover:bg-brutal-red hover:text-white transition-colors"
                                                        title="Delete"
                                                        disabled={actionLoading}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {inventoryItems?.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-12 text-center text-brutal-dark/50 italic border-dashed border-t border-b bg-transparent">
                                                Inventory is currently empty.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
