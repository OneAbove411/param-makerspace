import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useAllProducts, useProductMutations } from '../../lib/hooks';
import { uploadFile } from '../../lib/storage';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ShoppingBag, Plus, Trash2, Edit2, X, Image as ImageIcon } from 'lucide-react';
import type { StoreProduct } from '../../lib/database.types';

export function ManageStore() {
    const { role } = useAuth();
    const { data: products, loading, refetch } = useAllProducts();
    const { createProduct, updateProduct, deleteProduct } = useProductMutations();
    
    const [isEditing, setIsEditing] = useState<string | 'new' | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Form state
    const [form, setForm] = useState<Partial<StoreProduct>>({
        name: '', description: '', price: 0, category: 'materials', is_active: true
    });
    const [imageFile, setImageFile] = useState<File | null>(null);

    if (role !== 'admin') {
        return <div className="p-24 text-center font-data text-2xl">Access Denied: Admin Only</div>;
    }

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

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;
        setActionLoading(true);
        await deleteProduct(id);
        await refetch();
        setActionLoading(false);
    };

    if (loading) return <div className="p-24 flex justify-center font-data">Loading store...</div>;

    const categories = ['materials', 'kits', 'tools', 'swag', 'misc'];

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
                            <ShoppingBag className="w-10 h-10 text-brutal-red" />
                            Store & Inventory
                        </h1>
                        <p className="font-data text-lg text-brutal-dark/60 border-l-4 border-brutal-red pl-4 mt-4">
                            Manage products, materials, and kits available in the makerspace store.
                        </p>
                    </div>
                    {!isEditing && (
                        <Button onClick={() => startEdit()}>
                            <Plus className="w-5 h-5 mr-2" /> Add Product
                        </Button>
                    )}
                </div>

                {isEditing ? (
                    <Card className="p-8 border-2 border-brutal-dark/20 border-t-8 border-t-brutal-red shadow-xl">
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
                                        className="w-full h-12 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-4 font-data focus:border-brutal-red focus:ring-1 focus:ring-brutal-red outline-none"
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
                                            <div className="w-20 h-20 border-2 border-brutal-dark/20 rounded object-cover overflow-hidden bg-white">
                                                <img src={form.image_url} alt="Product" className="w-full h-full object-contain" />
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
                                                <span className="font-bold">{imageFile ? imageFile.name : 'Select product image'}</span>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products?.map(product => (
                            <Card key={product.id} className={`p-0 overflow-hidden border-2 flex flex-col group hover:border-brutal-red/50 transition-colors ${!product.is_active ? 'opacity-60 grayscale hover:grayscale-0' : ''}`}>
                                <div className="h-48 bg-white border-b-2 border-brutal-dark/10 relative">
                                    {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-contain p-4" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-brutal-dark/20 bg-brutal-dark/5">
                                            <ShoppingBag className="w-12 h-12" />
                                        </div>
                                    )}
                                    {!product.is_active && (
                                        <div className="absolute top-2 right-2 bg-brutal-dark text-white font-data text-xs font-bold px-2 py-1 rounded">
                                            INACTIVE
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 flex flex-col flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-heading font-bold text-xl uppercase leading-tight line-clamp-2">{product.name}</h3>
                                        <span className="font-heading font-bold text-xl text-brutal-red whitespace-nowrap ml-2">₹{product.price}</span>
                                    </div>
                                    <span className="inline-block px-2 py-0.5 bg-brutal-dark/5 text-brutal-dark font-data text-xs font-bold rounded uppercase w-fit mb-4">
                                        {product.category}
                                    </span>
                                    <div className="mt-auto flex gap-2 pt-4 border-t-2 border-dashed border-brutal-dark/10">
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => startEdit(product)}
                                            disabled={actionLoading}
                                        >
                                            <Edit2 className="w-4 h-4 mr-2" /> Edit
                                        </Button>
                                        <button 
                                            onClick={() => handleDelete(product.id)}
                                            className="p-2 border-2 border-brutal-red/20 text-brutal-red rounded hover:bg-brutal-red hover:text-white transition-colors"
                                            title="Delete"
                                            disabled={actionLoading}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                        {products?.length === 0 && (
                            <div className="col-span-1 md:col-span-3 p-12 text-center border-2 border-dashed border-brutal-dark/20 rounded-xl font-data text-brutal-dark/50">
                                No products in store.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
