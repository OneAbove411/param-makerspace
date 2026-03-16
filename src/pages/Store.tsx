import React, { useState } from 'react';
import { useProducts, useUserBadges, useStoreOrder } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CheckCircle2 } from 'lucide-react';

export function Store() {
    const { user } = useAuth();
    const { data: products, loading } = useProducts();
    const { data: userBadges } = useUserBadges(user?.id);
    const { placeOrder } = useStoreOrder();
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [ordered, setOrdered] = useState<string | null>(null);

    const userBadgeIds = (userBadges || []).map(ub => ub.badge_id);

    const handlePurchase = async (productId: string, price: number) => {
        if (!user) return;
        setPurchasing(productId);
        const { error } = await placeOrder(productId, price);
        setPurchasing(null);
        if (!error) {
            setOrdered(productId);
            setTimeout(() => setOrdered(null), 3000);
        }
    };

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="font-heading font-bold text-5xl md:text-7xl uppercase tracking-tight-heading mb-6">
                    Supply Store
                </h1>
                <p className="font-data text-xl text-brutal-dark/60 max-w-2xl border-l-4 border-brutal-dark/20 pl-4 mb-16">
                    Purchase materials and required tools. Some advanced items unlock based on earned system badges.
                </p>

                {loading ? (
                    <div className="py-20 text-center font-data text-brutal-dark/50">Loading products...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
                        {(products || []).map(product => {
                            const isLocked = product.required_badge_id && !userBadgeIds.includes(product.required_badge_id);
                            const justOrdered = ordered === product.id;

                            return (
                                <Card key={product.id} className="h-full flex flex-col overflow-hidden hover:border-brutal-dark transition-colors duration-300 group">
                                    <div className="h-64 w-full bg-white relative p-8 flex items-center justify-center border-b border-brutal-dark/10">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500 ease-out" />
                                        ) : (
                                            <div className="font-heading text-6xl text-brutal-dark/10">{product.name?.[0]?.toUpperCase()}</div>
                                        )}
                                        <div className="absolute top-4 left-4 flex gap-2">
                                            {product.category && <span className="bg-brutal-dark text-brutal-bg px-2 py-1 text-[10px] uppercase font-bold font-data rounded shadow-sm">{product.category}</span>}
                                        </div>
                                    </div>

                                    <div className="p-6 flex-1 flex flex-col bg-brutal-bg">
                                        <div className="flex justify-between items-start mb-4 gap-4">
                                            <h3 className="font-heading font-bold text-2xl leading-tight">{product.name}</h3>
                                            <span className="font-data text-xl font-bold bg-brutal-dark text-brutal-bg px-3 py-1 rounded-lg">₹{Number(product.price).toFixed(2)}</span>
                                        </div>
                                        <p className="font-data text-sm text-brutal-dark/70 mb-6 flex-1">{product.description}</p>

                                        {isLocked && product.requiredBadge ? (
                                            <div className="p-4 bg-brutal-red/10 border-2 border-brutal-red/20 rounded-xl mb-4 text-center">
                                                <span className="font-data text-[10px] uppercase font-bold text-brutal-red tracking-widest block mb-1">Requires Badge</span>
                                                <strong className="font-heading font-bold text-brutal-dark">{product.requiredBadge.name}</strong>
                                            </div>
                                        ) : null}

                                        {justOrdered ? (
                                            <div className="w-full p-3 bg-green-100 text-green-700 rounded-full text-center font-heading font-bold flex items-center justify-center gap-2">
                                                <CheckCircle2 className="w-5 h-5" /> Order Placed!
                                            </div>
                                        ) : (
                                            <Button
                                                className="w-full mt-auto"
                                                disabled={!!isLocked || purchasing === product.id || !user}
                                                onClick={() => handlePurchase(product.id, Number(product.price))}
                                            >
                                                {purchasing === product.id ? 'Processing...' :
                                                    isLocked ? 'Locked' :
                                                        !user ? 'Log in to Purchase' :
                                                            'Purchase'}
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            )
                        })}

                        {(products || []).length === 0 && !loading && (
                            <div className="col-span-full py-20 text-center font-data text-brutal-dark/50 border-2 border-dashed border-brutal-dark/20 rounded-2xl">
                                No products available yet.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
