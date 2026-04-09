import React from 'react';
import { cn } from '../../lib/utils'; // We'll need to create this

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    /**
     * When true, the button shows a spinner and is fully disabled (no pointer
     * events, no keyboard activation). Use this for any async onClick handler
     * so double-click / double-submit is physically impossible. See
     * §production-hardening.
     */
    loading?: boolean;
    children: React.ReactNode;
}

/**
 * `magnetic-btn` is a global class declared in `src/index.css`. It applies the
 * shared magnetic hover transform used across the brutalist button system
 * (subtle scale + shadow on hover, snap-back on leave). Apply it to any
 * button-like surface that should participate in the magnetic interaction
 * language. Do **not** redeclare this class — extend it via composition.
 */
export function Button({
    variant = 'primary',
    size = 'md',
    className,
    disabled,
    loading = false,
    type,
    children,
    ...props
}: ButtonProps) {
    const isDisabled = disabled || loading;
    const baseStyles = cn(
        'inline-flex items-center justify-center font-heading font-medium tracking-tight rounded-full',
        'transition-all duration-300 ease-magnetic magnetic-btn',
        // Always-visible focus ring (variant-aware via outline color override below)
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        // Disabled affordance
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    );

    const variants = {
        // Light foreground on dark/red bg → focus ring uses dark for contrast
        primary: 'bg-brutal-red text-brutal-bg hover:bg-brutal-dark focus-visible:outline-brutal-dark',
        secondary: 'bg-brutal-dark text-brutal-bg hover:bg-brutal-red focus-visible:outline-brutal-red',
        // Dark foreground on light bg → focus ring uses red for contrast
        outline: 'border-2 border-brutal-dark text-brutal-dark hover:bg-brutal-dark hover:text-brutal-bg focus-visible:outline-brutal-red',
        ghost: 'text-brutal-dark hover:bg-black/5 focus-visible:outline-brutal-red',
    };

    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    return (
        <button
            // Default to type="button" so buttons inside forms never become
            // accidental submits. Callers can still pass type="submit" when
            // they actually mean it.
            type={type ?? 'button'}
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            disabled={isDisabled}
            aria-busy={loading || undefined}
            {...props}
        >
            <span className="relative z-10 flex items-center justify-center gap-2">
                {loading && (
                    <span
                        aria-hidden="true"
                        className="inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin"
                    />
                )}
                {children}
            </span>
        </button>
    );
}
