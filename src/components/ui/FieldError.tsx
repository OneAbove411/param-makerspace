import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FieldErrorProps {
    /** The error message. If falsy, the component renders nothing. */
    children?: React.ReactNode;
    /** DOM id, so inputs can reference it via `aria-describedby`. */
    id?: string;
    className?: string;
}

/**
 * Inline form-field error: icon + helper text. Used by every form. Pair with
 * `aria-invalid="true"` and `aria-describedby={id}` on the input for proper
 * screen-reader exposure.
 */
export function FieldError({ children, id, className }: FieldErrorProps) {
    if (!children) return null;
    return (
        <p
            id={id}
            role="alert"
            className={cn(
                'flex items-start gap-1.5 mt-1 font-data text-xs text-brutal-red leading-snug',
                className,
            )}
        >
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{children}</span>
        </p>
    );
}
