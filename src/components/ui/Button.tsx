import React from 'react';
import { cn } from '../../lib/utils'; // We'll need to create this

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
    const baseStyles = 'inline-flex items-center justify-center font-heading font-medium tracking-tight rounded-full transition-all duration-300 ease-magnetic magnetic-btn';

    const variants = {
        primary: 'bg-brutal-red text-brutal-bg hover:bg-brutal-dark',
        secondary: 'bg-brutal-dark text-brutal-bg hover:bg-brutal-red',
        outline: 'border-2 border-brutal-dark text-brutal-dark hover:bg-brutal-dark hover:text-brutal-bg',
        ghost: 'text-brutal-dark hover:bg-black/5',
    };

    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    return (
        <button className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
            <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
        </button>
    );
}
