import React, { useState, useEffect, useRef } from 'react';
import { useProducts, useUserBadges } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { Card } from '../components/ui/Card';
import { MagneticCard } from '../components/ui/MagneticCard';
import { Button } from '../components/ui/Button';
import { CheckCircle2, Lock, ShoppingBag, ArrowRight, Package } from 'lucide-react';
import { useStoreOrder } from '../lib/hooks';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function ProductSkeleton() {
    return (
        <div className="rounded-2xl border border-brutal-dark/8 overflow-hidden animate-pulse">
            <div className="aspect-[4/3] bg-brutal-dark/5" />
            <div className="p-5 space-y-3">
                <div className="h-5 w-3/4 bg-brutal-dark/5 rounded" />
                <div className="h-3 w-full bg-brutal-dark/[0.03] rounded" />
                <div className="h-10 w-full bg-brutal-dark/5 rounded-full" />
            </div>
        </div>
    );
}

export function Store() {
    const { user } = useAuth();
    const { data: products, loading } = useProducts();
    const { data: userBadges } = useUserBadges(user?.id);
    const { placeOrder } = useStoreOrder();
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [ordered, setOrdered] = useState<string | null>(null);
    const pageRef = useRef<HTMLDivElement>(null);
    const hasAnimated = useRef(false);

    const userBadgeIds = (userBadges || []).map(ub => ub.badge_id);

    // Separate unlocked and locked products
    const allProducts = products || [];
    const unlockedProducts = allProducts.filter(p => !p.required_badge_id || userBadgeIds.includes(p.required_badge_id));
    const lockedProducts = allProducts.filter(p => p.required_badge_id && !userBadgeIds.includes(p.required_badge_id));

    // GSAP — scroll-triggered cards, Strict Mode safe
    useEffect(() => {
        if (loading || !allProducts.length || !pageRef.current || hasAnimated.current) return;
        hasAnimated.current = true;

        const cards = pageRef.current.querySelectorAll('.st-card');
        if (cards.length) {
            gsap.fromTo(cards,
                { y: 30, opacity: 0 },
                {
                    y: 0, opacity: 1, duration: 0.45, stagger: 0.05, ease: 'power3.out',
                    scrollTrigger: { trigger: '.st-grid', start: 'top 85%' }
                }
            );
        }

        const locked = pageRef.current.querySelectorAll('.st-locked-card');
        if (locked.length) {
            gsap.fromTo(locked,
                { y: 30, opacity: 0 },
                {
                    y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out',
                    scrollTrigger: { trigger: '.st-locked-grid', start: 'top 85%' }
                }
            );
        }
    }, [loading, allProducts.length]);

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
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen">
            {/* Hero */}
            <section className="pt-36 pb-10 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto animate-[fadeInUp_0.6s_ease-out_both]">
                <h1 className="font-heading font-bold text-5xl md:text-7xl uppercase tracking-tight-heading mb-4">
                    Store
                </h1>
                <p className="font-data text-sm text-brutal-dark/50 max-w-xl border-l-2 border-brutal-red pl-4 leading-relaxed">
                    Purchase materials and required tools. Some advanced items
                    unlock based on earned system badges.
                </p>
            </section>

            {/* ── 01 · AVAILABLE PRODUCTS ── */}
            <section className="px-6 md:px-12 lg:px-24 max-w-7xl mx-auto pb-16 animate-[fadeInUp_0.6s_ease-out_0.15s_both]">
                <div className="flex items-center gap-3 mb-8">
                    <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">01</span>
                    <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">—</span>
                    <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">Inventory</span>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => <ProductSkeleton key={i} />)}
                    </div>
                ) : unlockedProducts.length > 0 ? (
                    <div className="st-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {unlockedProducts.map(product => {
                            const justOrdered = ordered === product.id;

                            return (
                                <MagneticCard key={product.id} className="st-card" glowOnHover intensity={5}>
                                    <div className="h-full flex flex-col rounded-2xl border border-brutal-dark/8 bg-brutal-bg overflow-hidden hover:border-brutal-dark/20 transition-all duration-300 hover:shadow-[0_4px_24px_rgba(17,17,17,0.06)]">
                                        {/* Image */}
                                        <div className="aspect-[4/3] w-full bg-white relative overflow-hidden group border-b border-brutal-dark/5">
                                            {product.image_url ? (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Package size={48} className="text-brutal-dark/8" />
                                                </div>
                                            )}
                                            {product.category && (
                                                <div className="absolute top-3 left-3">
                                                    <span className="bg-brutal-dark/80 backdrop-blur-sm text-brutal-bg px-2.5 py-1 text-[9px] font-bold font-data rounded uppercase tracking-wider">
                                                        Category: {product.category}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-5 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-2 gap-3">
                                                <h3 className="font-heading font-bold text-base uppercase leading-tight">{product.name}</h3>
                                                <span className="font-data text-sm font-bold text-brutal-dark flex-shrink-0">
                                                    ₹{Number(product.price).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="font-data text-xs text-brutal-dark/45 mb-5 flex-1 line-clamp-2 leading-relaxed">
                                                {product.description}
                                            </p>

                                            {justOrdered ? (
                                                <div className="w-full p-3 bg-green-50 text-green-700 rounded-full text-center font-data text-xs font-bold uppercase flex items-center justify-center gap-1.5">
                                                    <CheckCircle2 size={14} /> Order Placed
                                                </div>
                                            ) : (
                                                <button
                                                    className={`
                                                        w-full flex items-center justify-center gap-2 py-3 rounded-full font-data text-xs font-bold uppercase tracking-wider transition-all duration-300
                                                        ${!user
                                                            ? 'bg-brutal-dark/5 text-brutal-dark/30 cursor-not-allowed'
                                                            : purchasing === product.id
                                                                ? 'bg-brutal-dark/10 text-brutal-dark/50 cursor-wait'
                                                                : 'bg-brutal-red text-brutal-bg hover:bg-brutal-dark'
                                                        }
                                                    `}
                                                    disabled={!user || purchasing === product.id}
                                                    onClick={() => handlePurchase(product.id, Number(product.price))}
                                                >
                                                    {purchasing === product.id ? 'Processing...' :
                                                        !user ? 'Log in to Purchase' :
                                                            <>Purchase <ArrowRight size={14} /></>
                                                    }
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </MagneticCard>
                            );
                        })}
                    </div>
                ) : !loading && allProducts.length === 0 ? (
                    <div className="py-20 text-center border border-dashed border-brutal-dark/10 rounded-2xl">
                        <Package size={40} className="mx-auto text-brutal-dark/10 mb-4" />
                        <p className="font-data text-sm text-brutal-dark/30">No products available yet.</p>
                        <p className="font-data text-xs text-brutal-dark/20 mt-1">Check back soon for new inventory.</p>
                    </div>
                ) : null}
            </section>

            {/* ── 02 · BADGE-GATED ITEMS ── */}
            {lockedProducts.length > 0 && (
                <section className="bg-brutal-dark text-brutal-bg py-20">
                    <div className="px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
                        <div className="flex items-center gap-3 mb-8">
                            <span className="font-data text-[10px] text-brutal-bg/30 font-bold uppercase tracking-widest">02</span>
                            <span className="font-data text-[10px] text-brutal-bg/30 font-bold uppercase tracking-widest">—</span>
                            <span className="font-data text-[10px] text-brutal-bg/30 font-bold uppercase tracking-widest">Restricted Access</span>
                        </div>
                        <h2 className="font-heading font-bold text-2xl md:text-3xl uppercase mb-12">Badge-Gated Items</h2>

                        <div className="st-locked-grid grid grid-cols-1 md:grid-cols-2 gap-6">
                            {lockedProducts.map(product => (
                                <div
                                    key={product.id}
                                    className="st-locked-card group relative rounded-2xl overflow-hidden border border-brutal-bg/10 bg-brutal-bg/[0.04]"
                                >
                                    {/* Blurred image background */}
                                    <div className="aspect-[16/9] w-full relative overflow-hidden">
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt={product.name}
                                                className="w-full h-full object-cover blur-sm brightness-50 scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-brutal-bg/5" />
                                        )}
                                        {/* Lock overlay */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <div className="w-14 h-14 rounded-2xl bg-brutal-bg/10 backdrop-blur-md flex items-center justify-center mb-4">
                                                <Lock size={24} className="text-brutal-bg/70" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info bar */}
                                    <div className="p-5 flex items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-heading font-bold text-base uppercase text-brutal-bg/80 leading-tight truncate">
                                                {product.name}
                                            </h3>
                                            {product.requiredBadge && (
                                                <span className="font-data text-[10px] text-brutal-bg/30 uppercase tracking-wider">
                                                    Requires: {product.requiredBadge.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-shrink-0">
                                            <span className="font-data text-sm font-bold text-brutal-bg/50">
                                                ₹{Number(product.price).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Bottom spacer when no locked products */}
            {lockedProducts.length === 0 && <div className="pb-16" />}
        </div>
    );
}
