import React, { useState, useEffect, useRef } from 'react';
import { useProducts, useUserBadges } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { Card } from '../components/ui/Card';
import { CheckCircle2, Lock, ArrowRight, Package, ShoppingBag, Sparkles } from 'lucide-react';
import { useStoreOrder } from '../lib/hooks';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '../lib/utils';

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────
// §8.e Store — Phase-2 visual cleanup.
//
// Refactored to share design language with Projects + Dashboard:
//   • Page identity (eyebrow + big heading)
//   • Bento stat row up top (Inventory / Unlocked / Locked)
//   • Card chrome: rounded-2xl + 6px red offset, hover lift -2/-2
//   • Locked-section: dark hero band with red shadow on cards
//
// useProducts / useUserBadges / useStoreOrder hooks unchanged.
// ─────────────────────────────────────────────────────────────

function ProductSkeleton() {
    return (
        <Card className="overflow-hidden animate-pulse border-2 border-brutal-dark/10 shadow-[6px_6px_0_0_rgba(196,41,30,0.10)]">
            <div className="aspect-[4/3] bg-brutal-dark/5" />
            <div className="p-5 space-y-3">
                <div className="h-3 w-20 bg-brutal-dark/8 rounded" />
                <div className="h-5 w-3/4 bg-brutal-dark/8 rounded" />
                <div className="h-3 w-full bg-brutal-dark/[0.05] rounded" />
                <div className="h-10 w-full bg-brutal-dark/5 rounded-full" />
            </div>
        </Card>
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

    // GSAP — entrance + scroll-triggered cards
    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.st-hero-text',
                { y: 24, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power3.out' }
            );
            gsap.fromTo('.st-bento-tile',
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power3.out', delay: 0.1 }
            );
        }, pageRef);
        return () => ctx.revert();
    }, []);

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
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg pt-28 md:pt-32 px-6 md:px-12 lg:px-24 min-h-screen">
            <div className="max-w-7xl mx-auto">

                {/* PAGE IDENTITY */}
                <div className="flex items-end justify-between mb-6 md:mb-8">
                    <div>
                        <p className="st-hero-text font-data text-[10px] font-bold uppercase tracking-[0.25em] text-brutal-dark/50 mb-2">
                            Maker Store
                        </p>
                        <h1 className="st-hero-text font-heading font-bold text-3xl md:text-4xl uppercase tracking-tight-heading text-brutal-dark">
                            {allProducts.length} item{allProducts.length === 1 ? '' : 's'}
                            <span className="text-brutal-dark/30"> · gear, materials, unlocks</span>
                        </h1>
                    </div>
                </div>

                {/* BENTO STATS ROW */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6 mb-12">
                    <BentoStat
                        icon={ShoppingBag}
                        label="Total Inventory"
                        value={loading ? null : allProducts.length}
                        sub="Items in catalogue"
                        dark
                        className="st-bento-tile"
                    />
                    <BentoStat
                        icon={Sparkles}
                        label="Unlocked For You"
                        value={loading ? null : unlockedProducts.length}
                        sub="Ready to purchase"
                        className="st-bento-tile"
                    />
                    <BentoStat
                        icon={Lock}
                        label="Badge-Gated"
                        value={loading ? null : lockedProducts.length}
                        sub="Earn badges to unlock"
                        className="st-bento-tile"
                    />
                </div>

                {/* ── 01 · AVAILABLE PRODUCTS ── */}
                <section className="pb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">01</span>
                        <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading">Inventory</h2>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            {[...Array(6)].map((_, i) => <ProductSkeleton key={i} />)}
                        </div>
                    ) : unlockedProducts.length > 0 ? (
                        <div className="st-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            {unlockedProducts.map(product => {
                                const justOrdered = ordered === product.id;

                                return (
                                    <Card
                                        key={product.id}
                                        className={cn(
                                            'st-card h-full flex flex-col overflow-hidden',
                                            'border-2 border-brutal-dark/15',
                                            'shadow-[6px_6px_0_0_rgba(196,41,30,0.18)]',
                                            'transition-all duration-200 ease-out',
                                            'hover:translate-x-[-2px] hover:translate-y-[-2px]',
                                            'hover:shadow-[8px_8px_0_0_rgba(196,41,30,0.28)]',
                                            'hover:border-brutal-red/40',
                                            'motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 motion-reduce:transition-none',
                                            'group',
                                        )}
                                    >
                                        {/* Image */}
                                        <div className="aspect-[4/3] w-full bg-white relative overflow-hidden border-b border-brutal-dark/10">
                                            {product.image_url ? (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center" style={{
                                                    backgroundImage: 'radial-gradient(circle, rgba(17,17,17,0.04) 1px, transparent 1px)',
                                                    backgroundSize: '20px 20px',
                                                }}>
                                                    <Package size={48} className="text-brutal-dark/12" />
                                                </div>
                                            )}
                                            {product.category && (
                                                <div className="absolute top-3 left-3 z-10">
                                                    <span className="bg-brutal-bg/95 backdrop-blur-sm text-brutal-dark px-2.5 py-1 text-[9px] font-bold font-data rounded uppercase tracking-wider border border-brutal-dark/15">
                                                        {product.category}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-5 flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-2 gap-3">
                                                <h3 className="font-heading font-bold text-base uppercase leading-tight tracking-tight-heading">
                                                    {product.name}
                                                </h3>
                                                <span className="font-data text-base font-bold text-brutal-red flex-shrink-0 tabular-nums">
                                                    ₹{Number(product.price).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="font-data text-xs text-brutal-dark/55 mb-5 flex-1 line-clamp-2 leading-relaxed">
                                                {product.description}
                                            </p>

                                            {justOrdered ? (
                                                <div className="w-full p-3 bg-green-50 text-green-700 border border-green-200 rounded-full text-center font-data text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                                                    <CheckCircle2 size={14} /> Order Placed
                                                </div>
                                            ) : (
                                                <button
                                                    className={cn(
                                                        'w-full flex items-center justify-center gap-2 py-3 rounded-full font-data text-xs font-bold uppercase tracking-widest transition-all duration-300 border-2',
                                                        !user
                                                            ? 'bg-brutal-bg text-brutal-dark/30 border-brutal-dark/15 cursor-not-allowed'
                                                            : purchasing === product.id
                                                                ? 'bg-brutal-dark/10 text-brutal-dark/50 border-brutal-dark/15 cursor-wait'
                                                                : 'bg-brutal-dark text-brutal-bg border-brutal-dark hover:bg-brutal-red hover:border-brutal-red shadow-[3px_3px_0_0_rgba(196,41,30,0.55)] hover:shadow-[4px_4px_0_0_rgba(196,41,30,0.7)]',
                                                    )}
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
                                    </Card>
                                );
                            })}
                        </div>
                    ) : !loading && allProducts.length === 0 ? (
                        <div className="py-24 text-center space-y-4">
                            <Package size={48} className="mx-auto text-brutal-dark/12" />
                            <div className="font-heading font-bold text-5xl text-brutal-dark/10 uppercase tracking-tight-heading">
                                Empty Shelves
                            </div>
                            <p className="font-data text-sm text-brutal-dark/40 max-w-md mx-auto">
                                No products available yet. Check back soon for new inventory.
                            </p>
                        </div>
                    ) : null}
                </section>

                {/* ── 02 · BADGE-GATED ITEMS ── */}
                {lockedProducts.length > 0 && (
                    <section className="pb-32">
                        <div className="rounded-2xl bg-brutal-dark text-brutal-bg p-6 md:p-10 border-2 border-brutal-dark shadow-[6px_6px_0_0_rgba(196,41,30,0.9)] relative overflow-hidden">
                            {/* Decorative dot grid background */}
                            <div
                                className="absolute inset-0 opacity-30 pointer-events-none"
                                aria-hidden
                                style={{
                                    backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.08) 1px, transparent 1px)',
                                    backgroundSize: '24px 24px',
                                }}
                            />
                            <div className="relative">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="font-data text-[10px] text-brutal-bg/40 font-bold uppercase tracking-widest">02</span>
                                    <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading text-brutal-bg">Restricted Access</h2>
                                </div>
                                <p className="font-data text-sm text-brutal-bg/55 max-w-xl mb-8">
                                    Earn the right badge by completing challenges and you can unlock these items.
                                </p>

                                <div className="st-locked-grid grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                                    {lockedProducts.map(product => (
                                        <div
                                            key={product.id}
                                            className={cn(
                                                'st-locked-card group relative rounded-2xl overflow-hidden border-2 border-brutal-bg/15 bg-brutal-bg/[0.04]',
                                                'transition-transform duration-150 ease-out',
                                                'hover:translate-x-[-2px] hover:translate-y-[-2px]',
                                                'motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0',
                                            )}
                                        >
                                            <div className="aspect-[16/9] w-full relative overflow-hidden">
                                                {product.image_url ? (
                                                    <img
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        loading="lazy"
                                                        className="w-full h-full object-cover blur-sm brightness-50 scale-105"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-brutal-bg/5" />
                                                )}
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <div className="w-14 h-14 rounded-full bg-brutal-red/90 backdrop-blur-md flex items-center justify-center border-2 border-brutal-bg/20 shadow-[3px_3px_0_0_rgba(0,0,0,0.4)]">
                                                        <Lock size={22} className="text-brutal-bg" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-5 flex items-center justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-heading font-bold text-base uppercase text-brutal-bg leading-tight truncate tracking-tight-heading">
                                                        {product.name}
                                                    </h3>
                                                    {product.requiredBadge && (
                                                        <span className="font-data text-[10px] text-brutal-bg/45 uppercase tracking-wider font-bold">
                                                            Requires: {product.requiredBadge.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex-shrink-0 text-right">
                                                    <span className="font-data text-base font-bold text-brutal-bg/65 tabular-nums">
                                                        ₹{Number(product.price).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {lockedProducts.length === 0 && <div className="pb-16" />}
            </div>
        </div>
    );
}

// ─── Internal: BentoStat clone ────────────────────────────────

interface BentoStatProps {
    icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
    label: string;
    value: number | null;
    sub: string;
    dark?: boolean;
    className?: string;
}

function BentoStat({ icon: Icon, label, value, sub, dark, className }: BentoStatProps) {
    return (
        <div
            className={cn(
                'group relative rounded-2xl p-5 min-h-[140px] overflow-hidden border-2',
                'flex flex-col justify-between',
                dark
                    ? 'bg-brutal-dark text-brutal-bg border-brutal-dark shadow-[6px_6px_0_0_rgba(196,41,30,0.9)]'
                    : 'bg-brutal-bg border-brutal-dark/20 shadow-[6px_6px_0_0_rgba(196,41,30,0.18)]',
                className,
            )}
        >
            <div className="flex items-start justify-between gap-3 relative">
                <Icon className={cn('w-5 h-5 flex-shrink-0', dark ? 'text-brutal-bg/70' : 'text-brutal-red')} aria-hidden />
                {value === null ? (
                    <div className={cn('h-9 w-12 rounded motion-safe:animate-pulse', dark ? 'bg-brutal-bg/15' : 'bg-brutal-dark/10')} />
                ) : (
                    <div className={cn('text-4xl font-heading font-bold tabular-nums leading-none', dark ? 'text-brutal-bg' : 'text-brutal-dark')}>
                        {value.toLocaleString()}
                    </div>
                )}
            </div>

            <div className="flex items-end justify-between gap-2">
                <div>
                    <div className={cn('font-data text-[11px] font-bold uppercase tracking-widest leading-snug', dark ? 'text-brutal-bg/65' : 'text-brutal-dark/60')}>
                        {label}
                    </div>
                    <div className={cn('font-data text-[10px] mt-1', dark ? 'text-brutal-bg/40' : 'text-brutal-dark/40')}>
                        {sub}
                    </div>
                </div>
            </div>
        </div>
    );
}
