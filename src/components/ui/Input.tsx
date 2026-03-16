import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1 w-full">
                {label && <label className="font-data text-sm font-bold text-brutal-dark">{label}</label>}
                <input
                    ref={ref}
                    className={cn(
                        "flex h-12 w-full rouned-xl bg-brutal-bg border-2 border-brutal-dark/20 px-4 py-2 font-data text-sm",
                        "ring-offset-brutal-bg transition-colors focus-visible:outline-none focus-visible:border-brutal-red focus-visible:ring-2 focus-visible:ring-brutal-red/20",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        error && "border-brutal-red focus-visible:ring-brutal-red/50",
                        className
                    )}
                    {...props}
                />
                {error && <span className="text-brutal-red font-data text-xs mt-1">{error}</span>}
            </div>
        );
    }
);

Input.displayName = 'Input';
