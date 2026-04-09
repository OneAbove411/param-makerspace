import React from 'react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    cta?: React.ReactNode;
    className?: string;
}

/**
 * Shared empty-state primitive. Built once here and only wired into surfaces
 * that have been explicitly approved — do **not** drop this into projects,
 * makers, or other content surfaces unprompted, since real population is
 * pending and a placeholder would mislead users.
 */
export function EmptyState({ title, description, icon, cta, className }: EmptyStateProps) {
    return (
        <div
            role="status"
            className={cn(
                'flex flex-col items-center justify-center text-center gap-4 px-6 py-16',
                'border-2 border-dashed border-brutal-dark/20 rounded-2xl bg-brutal-bg',
                className,
            )}
        >
            {icon && (
                <div className="text-brutal-dark/60" aria-hidden="true">
                    {icon}
                </div>
            )}
            <h3 className="font-heading text-2xl text-brutal-dark">{title}</h3>
            {description && (
                <p className="font-data text-sm text-brutal-dark/70 max-w-md leading-relaxed">
                    {description}
                </p>
            )}
            {cta && <div className="mt-2">{cta}</div>}
        </div>
    );
}
