import React, { useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { cn } from '../../lib/utils';

interface MagneticCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    /**
     * Maximum 3D tilt angle in degrees, applied to both rotateX and rotateY.
     * Scale is additive: `1` = barely perceptible, `4` = default-strong card
     * tilt used across the Projects grid, `8` = dramatic hero card, `12`+ =
     * disorienting — avoid. Default `8`.
     *
     * Recommended presets:
     *   1 — subtle   (form fields, dense lists)
     *   2 — light    (maker avatars)
     *   4 — medium   (project cards, challenge cards)
     *   6 — strong   (featured cards)
     *   8 — dramatic (hero / landing, default)
     */
    intensity?: number;
    liftOnHover?: boolean;
    glowOnHover?: boolean;
    className?: string;
}

/**
 * A card wrapper that follows the cursor with a 3D tilt effect (Lusion-inspired).
 * Uses GSAP quickTo for buttery-smooth 60fps interpolation.
 * No new dependencies — pure GSAP.
 */
export function MagneticCard({
    children,
    intensity = 8,
    liftOnHover = true,
    glowOnHover = false,
    className,
    ...props
}: MagneticCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const glowRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const card = cardRef.current;
        if (!card) return;

        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Normalize to -1 to 1
        const rotateX = ((y - centerY) / centerY) * -intensity;
        const rotateY = ((x - centerX) / centerX) * intensity;

        gsap.to(card, {
            rotateX,
            rotateY,
            duration: 0.4,
            ease: 'power2.out',
            transformPerspective: 800,
            transformOrigin: 'center center',
        });

        // Move the glow gradient to follow cursor
        if (glowRef.current) {
            gsap.to(glowRef.current, {
                background: `radial-gradient(circle at ${x}px ${y}px, rgba(196,41,30,0.08) 0%, transparent 60%)`,
                duration: 0.3,
            });
        }
    }, [intensity]);

    const handleMouseLeave = useCallback(() => {
        const card = cardRef.current;
        if (!card) return;

        gsap.to(card, {
            rotateX: 0,
            rotateY: 0,
            y: 0,
            duration: 0.6,
            ease: 'elastic.out(1, 0.5)',
        });

        if (glowRef.current) {
            gsap.to(glowRef.current, {
                background: 'transparent',
                duration: 0.4,
            });
        }
    }, []);

    const handleMouseEnter = useCallback(() => {
        if (liftOnHover && cardRef.current) {
            gsap.to(cardRef.current, {
                y: -6,
                duration: 0.3,
                ease: 'power2.out',
            });
        }
    }, [liftOnHover]);

    return (
        <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
            className={cn(
                'relative will-change-transform',
                className
            )}
            style={{ transformStyle: 'preserve-3d' }}
            {...props}
        >
            {/* Cursor-following glow overlay */}
            {glowOnHover && (
                <div
                    ref={glowRef}
                    className="absolute inset-0 rounded-[inherit] pointer-events-none z-10 transition-opacity"
                />
            )}
            {children}
        </div>
    );
}
