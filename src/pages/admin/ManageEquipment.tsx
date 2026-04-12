import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { useEquipment, useEquipmentMutations } from '../../lib/hooks';
import { uploadFile } from '../../lib/storage';
import { Link } from 'react-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Settings, Plus, Trash2, Edit2, X, Image as ImageIcon, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Equipment } from '../../lib/database.types';
import { AdminPageShell } from '../../components/admin/AdminPageShell';
import { ConfirmDeleteCard } from '../../components/admin/ConfirmDeleteCard';

export function ManageEquipment() {
    const { role } = useAuth();
    const { data: equipmentList, loading, refetch } = useEquipment();
    const { createEquipment, updateEquipment, deleteEquipment } = useEquipmentMutations();

    const [isEditing, setIsEditing] = useState<string | 'new' | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);

    // Delete confirmation state (replaces window.confirm)
    const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);

    useEffect(() => {
        if (isEditing && formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [isEditing]);

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
                const { error } = await createEquipment(payload);
                if (error) throw new Error(error);
            } else if (isEditing) {
                const { error } = await updateEquipment(isEditing, payload);
                if (error) throw new Error(error);
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
        setActionLoading(true);
        await deleteEquipment(id);
        await refetch();
        setActionLoading(false);
        setDeleteTarget(null);
    };

    if (loading) return <div className="p-24 flex justify-center font-data">Loading equipment...</div>;

    return (
        <AdminPageShell
            role={role}
            title="Equipment Directory"
            subtitle="Manage makerspace machines, tools, and their induction requirements."
            icon={Settings}
            headerAction={
                !isEditing ? (
                    <Button onClick={() => startEdit()}>
                        <Plus className="w-5 h-5 mr-2" /> Add Machine
                    </Button>
                ) : undefined
            }
        >
            {/* ── Delete confirmation card ────────────────────────── */}
            {deleteTarget && (
                <ConfirmDeleteCard
                    entityName={deleteTarget.name}
                    message="This will delete all booking and induction history for this machine."
                    cascadeItems={[
                        { label: 'bookings', count: 0 },
                        { label: 'induction records', count: 0 },
                    ]}
                    onConfirm={() => handleDelete(deleteTarget.id)}
                    onCancel={() => setDeleteTarget(null)}
                    loading={actionLoading}
                />
            )}

            {isEditing ? (
                /* ── Edit / New form ─────────────────────────────── */
                <Card ref={formRef} className="p-8 border-2 border-brutal-dark border-t-8 border-t-brutal-red shadow-[6px_6px_0_0_rgba(17,17,17,1)] scroll-mt-32">
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
                                        <div className="w-20 h-20 border-2 border-brutal-dark rounded object-cover overflow-hidden bg-white">
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
                                    className="w-full bg-brutal-bg border-2 border-brutal-dark p-3 rounded font-data min-h-[120px]"
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
                /* ── Machine card grid ────────────────────────────── */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {equipmentList?.map(equip => (
                        <div
                            key={equip.id}
                            className="border-2 border-brutal-dark bg-brutal-bg shadow-[6px_6px_0_0_rgba(17,17,17,1)] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[8px_8px_0_0_rgba(17,17,17,1)] transition-all duration-200 ease-magnetic overflow-hidden group"
                        >
                            {/* Hero photo */}
                            <div className="relative aspect-[4/3] bg-brutal-dark/5 overflow-hidden">
                                {equip.image_url ? (
                                    <img
                                        src={equip.image_url}
                                        alt={equip.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-brutal-dark/15">
                                        <Settings className="w-16 h-16" />
                                    </div>
                                )}

                                {/* Induction ribbon (top-right diagonal) */}
                                {equip.requires_induction && (
                                    <div className="absolute top-3 right-3 bg-yellow-400 text-brutal-dark font-data text-[10px] font-bold uppercase tracking-wider px-2 py-1 shadow-[2px_2px_0_0_rgba(17,17,17,0.6)]">
                                        <span className="flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> Induction Req
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Card body */}
                            <div className="p-5 space-y-3">
                                <h3 className="font-heading font-bold text-xl uppercase leading-tight">
                                    {equip.name}
                                </h3>
                                <p className="font-data text-sm text-brutal-dark/60 line-clamp-2">
                                    {equip.description || 'No description provided.'}
                                </p>

                                {/* Status badge */}
                                <div>
                                    {equip.requires_induction ? (
                                        <span className="inline-flex items-center gap-1.5 border-2 border-yellow-500 bg-yellow-50 text-yellow-800 font-data text-xs font-bold uppercase tracking-wide px-2.5 py-1">
                                            <AlertTriangle className="w-3 h-3" /> Requires Induction
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 border-2 border-green-600 bg-green-50 text-green-700 font-data text-xs font-bold uppercase tracking-wide px-2.5 py-1">
                                            <CheckCircle className="w-3 h-3" /> Open Access
                                        </span>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-2 pt-2 border-t-2 border-brutal-dark/10">
                                    <button
                                        onClick={() => startEdit(equip)}
                                        className="flex-1 flex items-center justify-center gap-2 p-2 border-2 border-brutal-dark font-data text-xs font-bold uppercase tracking-wide hover:bg-brutal-dark hover:text-white transition-colors"
                                        title="Edit"
                                        disabled={actionLoading}
                                    >
                                        <Edit2 className="w-3.5 h-3.5" /> Edit
                                    </button>
                                    <button
                                        onClick={() => setDeleteTarget(equip)}
                                        className="flex-1 flex items-center justify-center gap-2 p-2 border-2 border-brutal-red/30 text-brutal-red font-data text-xs font-bold uppercase tracking-wide hover:bg-brutal-red hover:text-white transition-colors"
                                        title="Delete"
                                        disabled={actionLoading}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {equipmentList?.length === 0 && (
                        <div className="col-span-1 md:col-span-2 p-12 text-center border-2 border-dashed border-brutal-dark/20 font-data text-brutal-dark/50">
                            No equipment registered. Add your first machine above.
                        </div>
                    )}
                </div>
            )}
        </AdminPageShell>
    );
}
