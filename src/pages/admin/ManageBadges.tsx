import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { useSupabaseQuery, useBadgeMutations } from '../../lib/hooks';
import { uploadFile } from '../../lib/storage';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Award, Plus, Trash2, Edit2, X, Image as ImageIcon } from 'lucide-react';
import type { Badge } from '../../lib/database.types';
import { PROGRESSION_BADGES, DOMAIN_BADGES } from '../../lib/progressionBadges';

export function ManageBadges() {
    const { user, role } = useAuth();
    const { data: badges, loading, refetch } = useSupabaseQuery<Badge[]>(async () => {
        return supabase.from('badge').select('id, name, description, tier, domain, badge_type, criteria, image_url, created_at').order('name');
    }, []);
    const { createBadge, updateBadge, deleteBadge } = useBadgeMutations();
    
    const [isEditing, setIsEditing] = useState<string | 'new' | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isEditing && formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [isEditing]);
    
    // Form state
    const [form, setForm] = useState<Partial<Badge>>({
        name: '', description: '', tier: 'standard', domain: 'general', badge_type: 'achievement', criteria: ''
    });
    const [imageFile, setImageFile] = useState<File | null>(null);

    if (role !== 'admin') {
        return <div className="p-24 text-center font-data text-2xl">Access Denied: Admin Only</div>;
    }

    const startEdit = (badge?: Badge) => {
        if (badge) {
            setForm(badge);
            setIsEditing(badge.id);
        } else {
            setForm({ 
                name: '', description: '', tier: 'standard', 
                domain: 'general', badge_type: 'achievement', criteria: '' 
            });
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

            if (imageFile && user) {
                const path = `${user.id}/${Date.now()}-${imageFile.name}`;
                const { url, error } = await uploadFile('badge-images', path, imageFile);
                if (error) throw new Error(error);
                if (url) coverUrl = url;
            }

            const payload = {
                ...form,
                image_url: coverUrl,
            } as any;

            if (isEditing === 'new') {
                const { error } = await createBadge(payload);
                if (error) throw new Error(error);
            } else if (isEditing) {
                const { error } = await updateBadge(isEditing, payload);
                if (error) throw new Error(error);
            }

            await refetch();
            cancelEdit();
        } catch (err: any) {
            alert(err.message || 'Failed to save badge');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure? This revokes the badge from all users who earned it.")) return;
        setActionLoading(true);
        await deleteBadge(id);
        await refetch();
        setActionLoading(false);
    };

    if (loading) return <div className="p-24 flex justify-center font-data">Loading badges...</div>;

    const progressionNames = ['Curious', 'Tinkerer', 'Builder', 'Maker', 'Innovator', 'Lab Pro'];
    const missingProgression = progressionNames.filter(name => !badges?.some(b => b.name === name));
    
    const domainNames = DOMAIN_BADGES.map(b => b.name);
    const missingDomain = domainNames.filter(name => !badges?.some(b => b.name === name));

    const handleSeedProgression = async () => {
        setActionLoading(true);
        for (const badge of PROGRESSION_BADGES) {
            if (missingProgression.includes(badge.name)) {
                await supabase.from('badge').insert(badge);
            }
        }
        await refetch();
        setActionLoading(false);
    };

    const handleSeedDomain = async () => {
        setActionLoading(true);
        for (const badge of DOMAIN_BADGES) {
            if (missingDomain.includes(badge.name)) {
                await supabase.from('badge').insert(badge);
            }
        }
        await refetch();
        setActionLoading(false);
    };

    const badgeTypes = ['achievement', 'skill', 'role', 'event'];

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
                            <Award className="w-10 h-10 text-brutal-red" />
                            Badge Directory
                        </h1>
                        <p className="font-data text-lg text-brutal-dark/60 border-l-4 border-brutal-red pl-4 mt-4">
                            Define credentials, achievements, and skill verifications for makers.
                        </p>
                    </div>
                    {!isEditing && (
                        <div className="flex gap-4">
                            {missingProgression.length > 0 && (
                                <Button variant="outline" onClick={handleSeedProgression} disabled={actionLoading}>
                                    Seed {missingProgression.length} Progression Badges
                                </Button>
                            )}
                            {missingDomain.length > 0 && (
                                <Button variant="outline" onClick={handleSeedDomain} disabled={actionLoading}>
                                    Seed {missingDomain.length} Domain Badges
                                </Button>
                            )}
                            <Button onClick={() => startEdit()}>
                                <Plus className="w-5 h-5 mr-2" /> New Badge
                            </Button>
                        </div>
                    )}
                </div>

                {isEditing ? (
                    <Card ref={formRef} className="p-8 border-2 border-brutal-dark rounded-2xl shadow-[6px_6px_0_0_rgba(196,41,30,0.18)] scroll-mt-32">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-heading font-bold text-3xl uppercase">
                                {isEditing === 'new' ? 'Mint New Badge' : 'Edit Badge'}
                            </h2>
                            <button onClick={cancelEdit} className="p-2 hover:bg-brutal-dark/10 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input 
                                    label="Badge Name" 
                                    required 
                                    value={form.name || ''} 
                                    onChange={e => setForm({...form, name: e.target.value})} 
                                />
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Type</label>
                                    <select 
                                        className="w-full h-12 rounded bg-brutal-bg border-2 border-brutal-dark px-4 font-data focus:border-brutal-red focus:ring-1 focus:ring-brutal-red outline-none"
                                        value={form.badge_type || 'achievement'}
                                        onChange={e => setForm({...form, badge_type: e.target.value})}
                                    >
                                        {badgeTypes.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <Input 
                                    label="Domain (e.g., Fabrication)" 
                                    required 
                                    value={form.domain || ''} 
                                    onChange={e => setForm({...form, domain: e.target.value})} 
                                />
                                <Input 
                                    label="Tier (e.g., standard, gold, master)" 
                                    required 
                                    value={form.tier || ''} 
                                    onChange={e => setForm({...form, tier: e.target.value})} 
                                />
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark mb-1 block">Badge Artwork (Square recommended)</label>
                                    <div className="flex items-center gap-4">
                                        {form.image_url && !imageFile && (
                                            <div className="w-20 h-20 border-2 border-brutal-dark/20 rounded object-cover overflow-hidden">
                                                <img src={form.image_url} alt="Badge" className="w-full h-full object-cover" />
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
                                                <span className="font-bold">{imageFile ? imageFile.name : 'Select badge artwork'}</span>
                                                <span className="text-xs mt-1">PNG, JPG, WEBP • Max 5MB</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Description</label>
                                    <textarea 
                                        required
                                        className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded font-data min-h-[80px]" 
                                        value={form.description || ''} 
                                        onChange={e => setForm({...form, description: e.target.value})} 
                                    />
                                </div>
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Earning Criteria</label>
                                    <textarea 
                                        required
                                        className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded font-data min-h-[80px]" 
                                        value={form.criteria || ''} 
                                        placeholder="What does a maker need to do to earn this?"
                                        onChange={e => setForm({...form, criteria: e.target.value})} 
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-6 border-t-2 border-brutal-dark/10">
                                <Button type="button" variant="ghost" onClick={cancelEdit} disabled={actionLoading}>Cancel</Button>
                                <Button type="submit" disabled={actionLoading}>
                                    {actionLoading ? 'Saving...' : 'Save Badge'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {badges?.map(badge => (
                            <Card key={badge.id} className="p-4 border-2 flex items-center justify-between group hover:border-brutal-red/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-brutal-dark/10 rounded-full object-cover overflow-hidden border-2 border-brutal-dark flex-shrink-0">
                                        {badge.image_url ? (
                                            <img src={badge.image_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-brutal-dark/20">
                                                <Award className="w-8 h-8" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="font-heading font-bold text-xl uppercase truncate">{badge.name}</h3>
                                        <div className="flex items-center gap-2 mt-1 font-data text-xs font-bold text-brutal-dark/60">
                                            <span className="px-2 py-0.5 rounded bg-brutal-dark/10 text-brutal-dark uppercase">
                                                {badge.badge_type}
                                            </span>
                                            <span>• {badge.domain}</span>
                                            <span>• {badge.tier}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <button 
                                        onClick={() => startEdit(badge)}
                                        className="p-2 border-2 border-brutal-dark/20 rounded hover:bg-brutal-dark hover:text-white transition-colors"
                                        title="Edit"
                                        disabled={actionLoading}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(badge.id)}
                                        className="p-2 border-2 border-brutal-red/20 text-brutal-red rounded hover:bg-brutal-red hover:text-white transition-colors"
                                        title="Delete"
                                        disabled={actionLoading}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </Card>
                        ))}
                        {badges?.length === 0 && (
                            <div className="col-span-1 md:col-span-2 p-12 text-center border-2 border-dashed border-brutal-dark/20 rounded-xl font-data text-brutal-dark/50">
                                No badges found. Mint one above.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
