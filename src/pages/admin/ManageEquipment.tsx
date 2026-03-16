import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useEquipment, useEquipmentMutations } from '../../lib/hooks';
import { uploadFile } from '../../lib/storage';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Settings, Plus, Trash2, Edit2, X, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import type { Equipment } from '../../lib/database.types';

export function ManageEquipment() {
    const { role } = useAuth();
    const { data: equipmentList, loading, refetch } = useEquipment();
    const { createEquipment, updateEquipment, deleteEquipment } = useEquipmentMutations();
    
    const [isEditing, setIsEditing] = useState<string | 'new' | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Form state
    const [form, setForm] = useState<Partial<Equipment>>({
        name: '', description: '', requires_induction: false
    });
    const [imageFile, setImageFile] = useState<File | null>(null);

    if (role !== 'admin') {
        return <div className="p-24 text-center font-data text-2xl">Access Denied: Admin Only</div>;
    }

    const startEdit = (equip?: Equipment) => {
        if (equip) {
            setForm(equip);
            setIsEditing(equip.id);
        } else {
            setForm({ name: '', description: '', requires_induction: false });
            setIsEditing('new');
        }
        setImageFile(null);
    };

    const cancelEdit = () => {
        setIsEditing(null);
        setForm({});
        setImageFile(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);

        try {
            let coverUrl = form.image_url;

            if (imageFile) {
                const path = `equipment/${Date.now()}-${imageFile.name}`;
                const { url, error } = await uploadFile('equipment-images', path, imageFile);
                if (error) throw new Error(error);
                if (url) coverUrl = url;
            }

            const payload = {
                ...form,
                image_url: coverUrl,
            } as any;

            if (isEditing === 'new') {
                await createEquipment(payload);
            } else if (isEditing) {
                await updateEquipment(isEditing, payload);
            }

            await refetch();
            cancelEdit();
        } catch (err: any) {
            alert(err.message || 'Failed to save equipment');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure? This will delete all booking/induction history for this machine.")) return;
        setActionLoading(true);
        await deleteEquipment(id);
        await refetch();
        setActionLoading(false);
    };

    if (loading) return <div className="p-24 flex justify-center font-data">Loading equipment...</div>;

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-3 mb-2">
                    <span className="bg-brutal-red text-white px-2 py-1 text-xs font-bold font-data rounded uppercase">Admin Panel</span>
                    <Link to="/dashboard" className="text-brutal-dark/60 hover:text-brutal-dark font-data text-sm font-bold ml-auto underline">
                        Back to Dashboard
                    </Link>
                </div>
                
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading flex items-center gap-4">
                            <Settings className="w-10 h-10 text-brutal-red" />
                            Equipment Directory
                        </h1>
                        <p className="font-data text-lg text-brutal-dark/60 border-l-4 border-brutal-red pl-4 mt-4">
                            Manage makerspace machines, tools, and their induction requirements.
                        </p>
                    </div>
                    {!isEditing && (
                        <Button onClick={() => startEdit()}>
                            <Plus className="w-5 h-5 mr-2" /> Add Machine
                        </Button>
                    )}
                </div>

                {isEditing ? (
                    <Card className="p-8 border-2 border-brutal-dark/20 border-t-8 border-t-brutal-red shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-heading font-bold text-3xl uppercase">
                                {isEditing === 'new' ? 'Register New Machine' : 'Edit Equipment'}
                            </h2>
                            <button onClick={cancelEdit} className="p-2 hover:bg-brutal-dark/10 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input 
                                    label="Machine Name (e.g., Voron 2.4 3D Printer)" 
                                    required 
                                    value={form.name || ''} 
                                    onChange={e => setForm({...form, name: e.target.value})} 
                                />
                                <div className="flex items-center pt-6">
                                    <label className="flex items-center gap-3 cursor-pointer p-4 border-2 border-yellow-500/30 bg-yellow-500/10 rounded-lg w-full transition-colors hover:bg-yellow-500/20">
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 accent-yellow-600"
                                            checked={form.requires_induction || false}
                                            onChange={e => setForm({...form, requires_induction: e.target.checked})}
                                        />
                                        <div>
                                            <span className="font-heading font-bold text-xl uppercase text-yellow-800 flex items-center gap-2">
                                                <AlertTriangle className="w-5 h-5" /> 
                                                Requires Induction
                                            </span>
                                            <p className="font-data text-xs text-yellow-800/80 mt-1">Users must be approved before booking this.</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark mb-1 block">Machine Photo</label>
                                    <div className="flex items-center gap-4">
                                        {form.image_url && !imageFile && (
                                            <div className="w-20 h-20 border-2 border-brutal-dark/20 rounded object-cover overflow-hidden bg-white">
                                                <img src={form.image_url} alt="Equipment" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="flex-1 relative border-2 border-dashed border-brutal-dark/20 bg-brutal-dark/5 p-4 rounded text-center hover:bg-brutal-dark/10 cursor-pointer transition-colors">
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                onChange={e => setImageFile(e.target.files?.[0] || null)}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <div className="flex flex-col items-center justify-center font-data text-sm text-brutal-dark/60 pointer-events-none">
                                                <ImageIcon className="w-6 h-6 mb-2 text-brutal-dark/40" />
                                                <span className="font-bold">{imageFile ? imageFile.name : 'Select machine photo'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Description & Specs</label>
                                    <textarea 
                                        className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded font-data min-h-[120px]" 
                                        value={form.description || ''} 
                                        placeholder="What is this machine used for? Key specifications?"
                                        onChange={e => setForm({...form, description: e.target.value})} 
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-6 border-t-2 border-brutal-dark/10">
                                <Button type="button" variant="ghost" onClick={cancelEdit} disabled={actionLoading}>Cancel</Button>
                                <Button type="submit" disabled={actionLoading}>
                                    {actionLoading ? 'Saving...' : 'Save Machine'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {equipmentList?.map(equip => (
                            <Card key={equip.id} className="p-4 border-2 flex items-center justify-between group hover:border-brutal-red/50 transition-colors">
                                <div className="flex items-center gap-6 flex-1 pr-4">
                                    <div className="w-20 h-20 bg-brutal-dark/10 rounded object-cover overflow-hidden border-2 border-brutal-dark flex-shrink-0 bg-white">
                                        {equip.image_url ? (
                                            <img src={equip.image_url} alt={equip.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-brutal-dark/20">
                                                <Settings className="w-8 h-8" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <h3 className="font-heading font-bold text-xl uppercase mb-1">{equip.name}</h3>
                                            {equip.requires_induction && (
                                                <span className="flex items-center gap-1 text-xs font-bold font-data bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                                    <AlertTriangle className="w-3 h-3" /> INDUCTION REQ
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-data text-sm text-brutal-dark/60 line-clamp-2">
                                            {equip.description || 'No description provided.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 pl-4 border-l-2 border-brutal-dark/10">
                                    <button 
                                        onClick={() => startEdit(equip)}
                                        className="p-2 border-2 border-brutal-dark/20 rounded hover:bg-brutal-dark hover:text-white transition-colors"
                                        title="Edit"
                                        disabled={actionLoading}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(equip.id)}
                                        className="p-2 border-2 border-brutal-red/20 text-brutal-red rounded hover:bg-brutal-red hover:text-white transition-colors"
                                        title="Delete"
                                        disabled={actionLoading}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </Card>
                        ))}
                        {equipmentList?.length === 0 && (
                            <div className="col-span-1 md:col-span-2 p-12 text-center border-2 border-dashed border-brutal-dark/20 rounded-xl font-data text-brutal-dark/50">
                                No equipment registered. Add your first machine above.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
