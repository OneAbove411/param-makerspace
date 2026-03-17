import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useAllChallenges, useChallengeMutations } from '../../lib/hooks';
import { uploadFile } from '../../lib/storage';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Zap, Plus, Trash2, Edit2, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Challenge } from '../../lib/database.types';

export function ManageChallenges() {
    const { user, role } = useAuth();
    const { data: challenges, loading, refetch } = useAllChallenges();
    const { createChallenge, updateChallenge, deleteChallenge } = useChallengeMutations();

    const [isEditing, setIsEditing] = useState<string | 'new' | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState<Partial<Challenge>>({
        title: '',
        tier: 'Tier 1',
        domain: 'Interdisciplinary',
        mystery: '',
        core_idea: '',
        mission: '',
        success_criteria: '',
        status: 'draft'
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);

    const [childData, setChildData] = useState<{
        steps: any[];
        materials: any[];
        vocabulary: any[];
        skills: any[];
    }>({ steps: [], materials: [], vocabulary: [], skills: [] });

    const fetchChildData = async (challengeId: string) => {
        const [stepsRes, matsRes, vocabRes, skillsRes] = await Promise.all([
            supabase.from('challenge_step').select('*').eq('challenge_id', challengeId).order('display_order'),
            supabase.from('challenge_material').select('*').eq('challenge_id', challengeId).order('display_order'),
            supabase.from('challenge_vocabulary').select('*').eq('challenge_id', challengeId),
            supabase.from('challenge_skill').select('*').eq('challenge_id', challengeId)
        ]);

        setChildData({
            steps: stepsRes.data || [],
            materials: matsRes.data || [],
            vocabulary: vocabRes.data || [],
            skills: skillsRes.data || []
        });
    };

    if (role !== 'admin') {
        return <div className="p-24 text-center font-data text-2xl">Access Denied: Admin Only</div>;
    }

    const startEdit = (challenge?: Challenge) => {
        if (challenge) {
            setForm(challenge);
            setEditingChallenge(challenge);
            setIsEditing(challenge.id);
            fetchChildData(challenge.id);
        } else {
            setForm({ title: '', status: 'draft', tier: 'Tier 1', domain: 'Interdisciplinary' });
            setEditingChallenge(null);
            setIsEditing('new');
        }
        setImageFile(null);
    };

    const cancelEdit = () => {
        setIsEditing(null);
        setForm({});
        setEditingChallenge(null);
        setImageFile(null);
        setChildData({ steps: [], materials: [], vocabulary: [], skills: [] });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setActionLoading(true);

        try {
            let coverUrl = form.cover_image_url;

            if (imageFile && user) {
                const path = `${user.id}/${Date.now()}-${imageFile.name}`;
                const { url, error } = await uploadFile('challenge-images', path, imageFile);
                if (error) throw new Error(error);
                if (url) coverUrl = url;
            }

            const payload = {
                ...form,
                cover_image_url: coverUrl,
                created_by: user?.id,
            } as any;

            if (isEditing === 'new') {
                const { error } = await createChallenge(payload);
                if (error) throw new Error(error);
            } else if (isEditing) {
                const { error } = await updateChallenge(isEditing, payload);
                if (error) throw new Error(error);
            }

            await refetch();
            cancelEdit();
        } catch (err: any) {
            alert(err.message || 'Failed to save challenge');
        } finally {
            setSaving(false);
            setActionLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure? This deletes all associated steps and completions.")) return;
        setActionLoading(true);
        await deleteChallenge(id);
        await refetch();
        setActionLoading(false);
    };

    if (loading) return <div className="p-24 flex justify-center font-data">Loading challenges...</div>;

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
                            <Zap className="w-10 h-10 text-brutal-red" />
                            Challenge Management
                        </h1>
                        <p className="font-data text-lg text-brutal-dark/60 border-l-4 border-brutal-red pl-4 mt-4">
                            Create, edit, and publish platform challenges.
                        </p>
                    </div>
                    {!isEditing && (
                        <Button onClick={() => startEdit()}>
                            <Plus className="w-5 h-5 mr-2" /> New Challenge
                        </Button>
                    )}
                </div>

                {/* ── EDIT / CREATE FORM ── */}
                {isEditing && (
                    <Card className="p-8 border-2 border-brutal-dark/20 border-t-8 border-t-brutal-red shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-heading font-bold text-3xl uppercase">
                                {isEditing === 'new' ? 'Signal New Challenge' : 'Edit Challenge'}
                            </h2>
                            <button onClick={cancelEdit} className="p-2 hover:bg-brutal-dark/10 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input
                                    label="Title"
                                    required
                                    value={form.title || ''}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                />
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark flex justify-between items-end">
                                        Status
                                        <span className={`text-xs px-2 py-0.5 rounded ${form.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {form.status?.toUpperCase()}
                                        </span>
                                    </label>
                                    <select
                                        className="w-full h-12 mt-1 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-4 font-data focus:border-brutal-red focus:ring-1 focus:ring-brutal-red outline-none"
                                        value={form.status || 'draft'}
                                        onChange={e => setForm({ ...form, status: e.target.value as any })}
                                    >
                                        <option value="draft">Draft (Hidden)</option>
                                        <option value="published">Published (Public)</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Domain</label>
                                    <select
                                        className="w-full h-12 mt-1 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-4 font-data focus:border-brutal-red focus:ring-1 focus:ring-brutal-red outline-none"
                                        value={form.domain || ''}
                                        onChange={e => setForm({...form, domain: e.target.value})}
                                    >
                                        <option value="">Select domain...</option>
                                        <option value="Electronics">Electronics</option>
                                        <option value="Robotics">Robotics</option>
                                        <option value="AI">AI</option>
                                        <option value="Design">Design</option>
                                        <option value="Fabrication">Fabrication</option>
                                        <option value="Bio">Bio</option>
                                        <option value="Interdisciplinary">Interdisciplinary</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Tier</label>
                                    <select
                                        className="w-full h-12 mt-1 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-4 font-data focus:border-brutal-red focus:ring-1 focus:ring-brutal-red outline-none"
                                        value={form.tier || ''}
                                        onChange={e => setForm({...form, tier: e.target.value})}
                                    >
                                        <option value="">Select tier...</option>
                                        <option value="Tier 1">Tier 1 — Explorer</option>
                                        <option value="Tier 2">Tier 2 — Solver</option>
                                        <option value="Tier 3">Tier 3 — Architect</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark mb-1 block">Cover Image</label>
                                    <div className="flex items-center gap-4">
                                        {form.cover_image_url && !imageFile && (
                                            <div className="w-20 h-20 border-2 border-brutal-dark/20 rounded object-cover overflow-hidden">
                                                <img src={form.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
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
                                                <span className="font-bold">{imageFile ? imageFile.name : 'Select new cover image'}</span>
                                                <span className="text-xs mt-1">PNG, JPG, WEBP • Max 5MB</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Mystery (Hook)</label>
                                    <textarea className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded font-data min-h-[80px]" value={form.mystery || ''} onChange={e => setForm({ ...form, mystery: e.target.value })} />
                                </div>
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Core Idea</label>
                                    <textarea className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded font-data min-h-[80px]" value={form.core_idea || ''} onChange={e => setForm({ ...form, core_idea: e.target.value })} />
                                </div>
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Mission (Brief)</label>
                                    <textarea className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded font-data min-h-[80px]" value={form.mission || ''} onChange={e => setForm({ ...form, mission: e.target.value })} />
                                </div>
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Success Criteria</label>
                                    <textarea className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded font-data min-h-[80px]" value={form.success_criteria || ''} onChange={e => setForm({ ...form, success_criteria: e.target.value })} />
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-6 border-t-2 border-brutal-dark/10">
                                <Button type="button" variant="ghost" onClick={cancelEdit} disabled={saving}>Cancel</Button>
                                <Button type="submit" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Challenge'}
                                </Button>
                            </div>
                        </form>

                        {/* ── CHILD DATA EDITORS (only when editing existing) ── */}
                        {isEditing !== 'new' && editingChallenge?.id && (
                            <div className="mt-8 space-y-6">
                                <h3 className="font-heading font-bold text-2xl uppercase border-b-2 border-brutal-dark pb-2">Challenge Details (Auto-saves)</h3>

                                {/* Materials Editor */}
                                <div className="bg-brutal-bg border-2 border-brutal-dark p-6">
                                    <h4 className="font-heading font-bold text-xl uppercase mb-4 flex justify-between">
                                        Materials <span className="text-brutal-dark/50 text-sm">{childData.materials.length} Items</span>
                                    </h4>
                                    <ul className="space-y-2 mb-4">
                                        {childData.materials.map((m: any) => (
                                            <li key={m.id} className="flex justify-between items-center bg-brutal-dark/5 p-2 px-4 border border-brutal-dark/20">
                                                <span className="font-data text-sm">{m.name}</span>
                                                <button
                                                    onClick={async () => {
                                                        await supabase.from('challenge_material').delete().eq('id', m.id);
                                                        fetchChildData(editingChallenge.id);
                                                    }}
                                                    className="text-brutal-red hover:bg-brutal-red/10 p-1"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const input = (e.target as any).elements.materialName;
                                        if (!input.value) return;
                                        await supabase.from('challenge_material').insert({ challenge_id: editingChallenge.id, name: input.value });
                                        input.value = '';
                                        fetchChildData(editingChallenge.id);
                                    }} className="flex gap-2">
                                        <input name="materialName" placeholder="New material name..." className="flex-1 bg-white border-2 border-brutal-dark p-2 font-data text-sm" />
                                        <Button type="submit"><Plus className="w-4 h-4" /></Button>
                                    </form>
                                </div>

                                {/* Steps Editor */}
                                <div className="bg-brutal-bg border-2 border-brutal-dark p-6">
                                    <h4 className="font-heading font-bold text-xl uppercase mb-4 flex justify-between">
                                        Steps <span className="text-brutal-dark/50 text-sm">{childData.steps.length} Items</span>
                                    </h4>
                                    <ul className="space-y-2 mb-4">
                                        {childData.steps.map((s: any, idx: number) => (
                                            <li key={s.id} className="flex justify-between items-center bg-brutal-dark/5 p-2 px-4 border border-brutal-dark/20">
                                                <span className="font-data text-sm"><strong className="mr-2">{idx + 1}.</strong>{s.step_text}</span>
                                                <button
                                                    onClick={async () => {
                                                        await supabase.from('challenge_step').delete().eq('id', s.id);
                                                        fetchChildData(editingChallenge.id);
                                                    }}
                                                    className="text-brutal-red hover:bg-brutal-red/10 p-1"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const input = (e.target as any).elements.stepText;
                                        if (!input.value) return;
                                        await supabase.from('challenge_step').insert({ challenge_id: editingChallenge.id, step_text: input.value, display_order: childData.steps.length + 1 });
                                        input.value = '';
                                        fetchChildData(editingChallenge.id);
                                    }} className="flex gap-2">
                                        <input name="stepText" placeholder="New step instructions..." className="flex-1 bg-white border-2 border-brutal-dark p-2 font-data text-sm" />
                                        <Button type="submit"><Plus className="w-4 h-4" /></Button>
                                    </form>
                                </div>

                                {/* Skills Editor */}
                                <div className="bg-brutal-bg border-2 border-brutal-dark p-6">
                                    <h4 className="font-heading font-bold text-xl uppercase mb-4 flex justify-between">
                                        Skills <span className="text-brutal-dark/50 text-sm">{childData.skills.length} Items</span>
                                    </h4>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {childData.skills.map((s: any) => (
                                            <span key={s.id} className="flex items-center gap-2 bg-brutal-dark text-brutal-bg px-3 py-1 font-data text-xs font-bold rounded">
                                                {s.skill_name}
                                                <button
                                                    onClick={async () => {
                                                        await supabase.from('challenge_skill').delete().eq('id', s.id);
                                                        fetchChildData(editingChallenge.id);
                                                    }}
                                                    className="hover:text-brutal-red"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const input = (e.target as any).elements.skillName;
                                        if (!input.value) return;
                                        await supabase.from('challenge_skill').insert({ challenge_id: editingChallenge.id, skill_name: input.value });
                                        input.value = '';
                                        fetchChildData(editingChallenge.id);
                                    }} className="flex gap-2">
                                        <input name="skillName" placeholder="New skill (e.g. Soldering)" className="flex-1 bg-white border-2 border-brutal-dark p-2 font-data text-sm" />
                                        <Button type="submit"><Plus className="w-4 h-4" /></Button>
                                    </form>
                                </div>

                                {/* Vocabulary Editor */}
                                <div className="bg-brutal-bg border-2 border-brutal-dark p-6">
                                    <h4 className="font-heading font-bold text-xl uppercase mb-4 flex justify-between">
                                        Vocabulary <span className="text-brutal-dark/50 text-sm">{childData.vocabulary.length} Items</span>
                                    </h4>
                                    <ul className="space-y-2 mb-4">
                                        {childData.vocabulary.map((v: any) => (
                                            <li key={v.id} className="flex flex-col bg-brutal-dark/5 p-3 border border-brutal-dark/20 relative pr-10">
                                                <strong className="font-heading font-bold text-lg leading-tight">{v.term}</strong>
                                                <span className="font-data text-sm text-brutal-dark/70 mt-1">{v.definition || 'No definition'}</span>
                                                <button
                                                    onClick={async () => {
                                                        await supabase.from('challenge_vocabulary').delete().eq('id', v.id);
                                                        fetchChildData(editingChallenge.id);
                                                    }}
                                                    className="text-brutal-red hover:bg-brutal-red/10 p-2 absolute right-2 top-2"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const term = (e.target as any).elements.term.value;
                                        const def = (e.target as any).elements.definition.value;
                                        if (!term) return;
                                        await supabase.from('challenge_vocabulary').insert({ challenge_id: editingChallenge.id, term, definition: def });
                                        (e.target as any).reset();
                                        fetchChildData(editingChallenge.id);
                                    }} className="flex flex-col md:flex-row gap-2">
                                        <input name="term" placeholder="Term" className="w-full md:w-1/3 bg-white border-2 border-brutal-dark p-2 font-data text-sm" />
                                        <input name="definition" placeholder="Definition" className="w-full md:flex-1 bg-white border-2 border-brutal-dark p-2 font-data text-sm" />
                                        <Button type="submit"><Plus className="w-4 h-4" /></Button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </Card>
                )}

                {/* ── CHALLENGE LIST (always visible) ── */}
                <div className="grid grid-cols-1 gap-4">
                    {challenges?.map(challenge => (
                        <Card key={challenge.id} className="p-4 border-2 flex items-center justify-between group hover:border-brutal-red/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-brutal-dark/10 rounded object-cover overflow-hidden border-2 border-brutal-dark flex-shrink-0">
                                    {challenge.cover_image_url ? (
                                        <img src={challenge.cover_image_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-brutal-dark/20">
                                            <Zap className="w-8 h-8" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-heading font-bold text-xl uppercase">{challenge.title}</h3>
                                    <div className="flex items-center gap-2 mt-1 font-data text-xs font-bold text-brutal-dark/60">
                                        <span className={`px-2 py-0.5 rounded ${challenge.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-brutal-dark/10 text-brutal-dark'}`}>
                                            {challenge.status?.toUpperCase()}
                                        </span>
                                        {challenge.domain && <span>• {challenge.domain}</span>}
                                        {challenge.tier && <span>• {challenge.tier}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => startEdit(challenge)}
                                    className="p-2 border-2 border-brutal-dark/20 rounded hover:bg-brutal-dark hover:text-white transition-colors"
                                    title="Edit"
                                    disabled={actionLoading}
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(challenge.id)}
                                    className="p-2 border-2 border-brutal-red/20 text-brutal-red rounded hover:bg-brutal-red hover:text-white transition-colors"
                                    title="Delete"
                                    disabled={actionLoading}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </Card>
                    ))}
                    {challenges?.length === 0 && (
                        <div className="p-12 text-center border-2 border-dashed border-brutal-dark/20 rounded-xl font-data text-brutal-dark/50">
                            No challenges found. Create one above.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}