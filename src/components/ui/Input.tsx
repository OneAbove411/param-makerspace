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
                {label && <label className="font-data text-sm font-bold text-brutal-dark">{label}{props.required && <span className="text-brutal-red ml-0.5">*</span>}</label>}
                <input
                    ref={ref}
                    className={cn(
                        "flex h-12 w-full rounded-xl bg-brutal-bg border-2 border-brutal-dark/20 px-4 py-2 font-data text-sm",
                        "ring-offset-brutal-bg transition-all duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red focus-visible:border-brutal-red",
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
