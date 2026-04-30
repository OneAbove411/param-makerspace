import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { useAllProducts, useProductMutations } from '../../lib/hooks';
import { uploadFile } from '../../lib/storage';
import { Link } from 'react-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ShoppingBag, Plus, Trash2, Edit2, X, Image as ImageIcon } from 'lucide-react';
import type { StoreProduct } from '../../lib/database.types';
import { AdminPageShell } from '../../components/admin/AdminPageShell';
import { BrutalTabBar } from '../../components/admin/BrutalTabBar';
import type { TabOption } from '../../components/admin/BrutalTabBar';
import { ConfirmDeleteCard } from '../../components/admin/ConfirmDeleteCard';
import { smoothScrollIntoView } from '../../lib/scroll';

type CategoryFilter = 'all' | 'materials' | 'kits' | 'tools' | 'swag' | 'misc';

const CATEGORY_TABS: TabOption<CategoryFilter>[] = [
    { value: 'all', label: 'All' },
    { value: 'materials', label: 'Materials' },
    { value: 'kits', label: 'Kits' },
    { value: 'tools', label: 'Tools' },
    { value: 'swag', label: 'Swag' },
    { value: 'misc', label: 'Misc' },
];

const categories = ['materials', 'kits', 'tools', 'swag', 'misc'];

export function ManageStore() {
    const { role } = useAuth();
    const { data: products, loading, refetch } = useAllProducts();
    const { createProduct, updateProduct, deleteProduct } = useProductMutations();

    const [isEditing, setIsEditing] = useState<string | 'new' | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState<StoreProduct | null>(null);

    useEffect(() => {
        if (isEditing && formRef.current) {
            smoothScrollIntoView(formRef.current, { block: 'start' });
        }
    }, [isEditing]);

    // Form state
    const [form, setForm] = useState<Partial<StoreProduct>>({
        name: '', description: '', price: 0, category: 'materials', is_active: true
    });
    const [imageFile, setImageFile] = useState<File | null>(null);

    if (role !== 'admin') {
        return <div className="p-24 text-center font-data text-2xl">Access Denied: Admin Only</div>;
    }

    const filtered = (products || []).filter(p =>
        categoryFilter === 'all' ? true : p.category === categoryFilter
    );

    // Compute counts per category for tab badges
    const catCounts = (products || []).reduce<Record<string, number>>((acc, p) => {
        const cat = p.category ?? 'uncategorized';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {});
    const tabsWithCounts = CATEGORY_TABS.map(t => ({
        ...t,
        count: t.value === 'all' ? (products || []).length : (catCounts[t.value] || 0),
    }));

    const startEdit = (product?: StoreProduct) => {
        if (product) {
            setForm(product);
            setIsEditing(product.id);
        } else {
            setForm({
                name: '', description: '', price: 0,
                category: 'materials', is_active: true
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

            if (imageFile) {
                const path = `products/${Date.now()}-${imageFile.name}`;
                const { url, error } = await uploadFile('product-images', path, imageFile);
                if (error) throw new Error(error);
                if (url) coverUrl = url;
            }

            const payload = {
                ...form,
                image_url: coverUrl,
            } as any;

            if (isEditing === 'new') {
                const { error } = await createProduct(payload);
                if (error) throw new Error(error);
            } else if (isEditing) {
                const { error } = await updateProduct(isEditing, payload);
                if (error) throw new Error(error);
            }

            await refetch();
            cancelEdit();
        } catch (err: any) {
            alert(err.message || 'Failed to save product');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (product: StoreProduct) => {
        setActionLoading(true);
        const { error } = await deleteProduct(product.id);
        if (error) {
            alert(`Failed to delete product: ${error}`);
        }
        await refetch();
        setActionLoading(false);
        setDeleteTarget(null);
    };

    if (loading) return <div className="p-24 flex justify-center font-data">Loading store...</div>;

    return (
        <AdminPageShell
            role={role}
            title="Store & Inventory"
            subtitle="Manage products, materials, and kits available in the makerspace store."
            icon={ShoppingBag}
            headerAction={
                !isEditing ? (
                    <Button onClick={() => startEdit()}>
                        <Plus className="w-5 h-5 mr-2" /> Add Product
                    </Button>
                ) : undefined
            }
        >
            {/* ── Delete confirmation ─────────────────────────────── */}
            {deleteTarget && (
                <ConfirmDeleteCard
                    entityName={deleteTarget.name}
                    message={`Permanently delete "${deleteTarget.name}" from the store? This action cannot be undone.`}
                    onConfirm={() => handleDelete(deleteTarget)}
                    onCancel={() => setDeleteTarget(null)}
                    loading={actionLoading}
                />
            )}

            {isEditing ? (
                /* ── Edit / New form ─────────────────────────────── */
                <Card ref={formRef} className="p-8 border-2 border-brutal-dark border-t-8 border-t-brutal-red shadow-[6px_6px_0_0_rgba(17,17,17,1)] scroll-mt-32">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-heading font-bold text-3xl uppercase">
                            {isEditing === 'new' ? 'Create Product' : 'Edit Product'}
                        </h2>
                        <button onClick={cancelEdit} className="p-2 hover:bg-brutal-dark/10 rounded-full transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Product Name"
                                required
                                value={form.name || ''}
                                onChange={e => setForm({...form, name: e.target.value})}
                            />
                            <div>
                                <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Category</label>
                                <select
                                    className="w-full h-12 bg-brutal-bg border-2 border-brutal-dark px-4 font-data focus:border-brutal-red focus:outline-none"
                                    value={form.category || 'materials'}
                                    onChange={e => setForm({...form, category: e.target.value})}
                                >
                                    {categories.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Price (Credits/₹)"
                                    type="number"
                                    required
                                    value={form.price?.toString() || '0'}
                                    onChange={e => setForm({...form, price: parseFloat(e.target.value) || 0})}
                                />
                                <div className="flex flex-col justify-end pb-2">
                                    <label className="flex items-center gap-2 cursor-pointer font-data font-bold">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 accent-brutal-red"
                                            checked={form.is_active !== false}
                                            onChange={e => setForm({...form, is_active: e.target.checked})}
                                        />
                                        Visible in Store
                                    </label>
                                </div>
                            </div>
                            <Input
                                label="Required Badge ID (Optional)"
                                placeholder="UUID of badge..."
                                value={form.required_badge_id || ''}
                                onChange={e => setForm({...form, required_badge_id: e.target.value || undefined})}
                            />
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="font-data text-sm font-bold text-brutal-dark mb-1 block">Product Image</label>
                                <div className="flex items-center gap-4">
                                    {form.image_url && !imageFile && (
                                        <div className="w-20 h-20 border-2 border-brutal-dark object-cover overflow-hidden bg-white">
                                            <img src={form.image_url} alt="Product" className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                    <div className="flex-1 relative border-2 border-dashed border-brutal-dark/20 bg-brutal-dark/5 p-4 text-center hover:bg-brutal-dark/10 cursor-pointer transition-colors">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => setImageFile(e.target.files?.[0] || null)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <div className="flex flex-col items-center justify-center font-data text-sm text-brutal-dark/60 pointer-events-none">
                                            <ImageIcon className="w-6 h-6 mb-2 text-brutal-dark/40" />
                                            <span className="font-bold">{imageFile ? imageFile.name : 'Select product image'}</span>
                                            <span className="text-xs mt-1">PNG, JPG, WEBP</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Description</label>
                                <textarea
                                    required
                                    className="w-full bg-brutal-bg border-2 border-brutal-dark p-3 font-data min-h-[80px]"
                                    value={form.description || ''}
                                    onChange={e => setForm({...form, description: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-6 border-t-2 border-brutal-dark/10">
                            <Button type="button" variant="ghost" onClick={cancelEdit} disabled={actionLoading}>Cancel</Button>
                            <Button type="submit" disabled={actionLoading}>
                                {actionLoading ? 'Saving...' : 'Save Product'}
                            </Button>
                        </div>
                    </form>
                </Card>
            ) : (
                <>
                    {/* ── Category filter tabs ───────────────────────── */}
                    <div className="flex items-center gap-4 flex-wrap">
                        <BrutalTabBar<CategoryFilter>
                            tabs={tabsWithCounts}
                            activeTab={categoryFilter}
                            onTabChange={setCategoryFilter}
                        />
                        <span className="ml-auto font-data text-sm text-brutal-dark/50 font-bold">
                            {filtered.length} product{filtered.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* ── Product card grid ───────────────────────────── */}
                    {filtered.length === 0 ? (
                        <div className="p-12 text-center border-2 border-dashed border-brutal-dark/20 shadow-[6px_6px_0_0_rgba(17,17,17,1)]">
                            <ShoppingBag className="w-12 h-12 text-brutal-dark/20 mx-auto mb-4" />
                            <h3 className="font-heading font-bold text-2xl text-brutal-dark/50">No Products Found</h3>
                            <p className="font-data text-brutal-dark/40 mt-2">No products match the selected category.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.map(product => (
                                <div
                                    key={product.id}
                                    className={`border-2 border-brutal-dark bg-brutal-bg shadow-[6px_6px_0_0_rgba(17,17,17,1)] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[8px_8px_0_0_rgba(17,17,17,1)] transition-all duration-200 ease-magnetic overflow-hidden flex flex-col group ${!product.is_active ? 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100' : ''}`}
                                >
                                    {/* Product image */}
                                    <div className="relative h-48 bg-white border-b-2 border-brutal-dark overflow-hidden">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} loading="lazy" className="w-full h-full object-contain p-4" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-brutal-dark/15">
                                                <ShoppingBag className="w-16 h-16" />
                                            </div>
                                        )}
                                        {!product.is_active && (
                                            <div className="absolute top-3 right-3 bg-brutal-dark text-white font-data text-[10px] font-bold uppercase tracking-wider px-2 py-1 shadow-[2px_2px_0_0_rgba(17,17,17,0.6)]">
                                                INACTIVE
                                            </div>
                                        )}
                                    </div>

                                    {/* Card body */}
                                    <div className="p-5 flex flex-col flex-1 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-heading font-bold text-xl uppercase leading-tight line-clamp-2">{product.name}</h3>
                                            <span className="font-heading font-bold text-2xl text-brutal-red whitespace-nowrap ml-2">₹{product.price}</span>
                                        </div>

                                        <span className="inline-block px-2 py-0.5 bg-brutal-dark/10 text-brutal-dark font-data text-xs font-bold uppercase w-fit border border-brutal-dark/20">
                                            {product.category}
                                        </span>

                                        {product.description && (
                                            <p className="font-data text-sm text-brutal-dark/60 line-clamp-2">{product.description}</p>
                                        )}

                                        {/* Action buttons */}
                                        <div className="mt-auto flex gap-2 pt-3 border-t-2 border-brutal-dark/10">
                                            <button
                                                onClick={() => startEdit(product)}
                                                className="flex-1 flex items-center justify-center gap-2 p-2 border-2 border-brutal-dark font-data text-xs font-bold uppercase tracking-wide hover:bg-brutal-dark hover:text-white transition-colors"
                                                disabled={actionLoading}
                                            >
                                                <Edit2 className="w-3.5 h-3.5" /> Edit
                                            </button>
                                            <button
                                                onClick={() => setDeleteTarget(product)}
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
                        </div>
                    )}
                </>
            )}
        </AdminPageShell>
    );
}
