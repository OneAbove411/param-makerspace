import React from 'react';
import { cn } from '../../lib/utils';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';

interface CascadeInfo {
    /** Entity type (e.g. "bookings", "inductions", "tag references") */
    label: string;
    /** Count of dependent entities that will be affected */
    count: number;
}

interface ConfirmDeleteCardProps {
    /** Name of the entity being deleted */
    entityName: string;
    /** Optional message overriding the default confirmation text */
    message?: string;
    /** Cascade dependencies to warn about */
    cascadeItems?: CascadeInfo[];
    /** Called when user confirms deletion */
    onConfirm: () => void;
    /** Called when user cancels */
    onCancel: () => void;
    /** Whether the delete operation is in progress */
    loading?: boolean;
    /** Additional className */
    className?: string;
}

/**
 * ConfirmDeleteCard — Neo-Brutalist deletion confirmation panel.
 *
 * Replaces browser `window.confirm` with an inline card that:
 *  - Shows the entity name being deleted
 *  - Lists cascade dependencies (e.g. "This will remove 3 bookings + 2 inductions")
 *  - Has clear Cancel / Delete buttons
 *  - Uses red border + warning styling
 *
 * Purely presentational — delete logic is delegated via onConfirm callback.
 */
export function ConfirmDeleteCard({
    entityName,
    message,
    cascadeItems,
    onConfirm,
    onCancel,
    loading = false,
    className,
}: ConfirmDeleteCardProps) {
    const hasCascade = cascadeItems && cascadeItems.some((c) => c.count > 0);

    return (
        <div
            className={cn(
                'border-2 border-brutal-red bg-red-50 p-6',
                'shadow-[6px_6px_0_0_rgba(196,41,30,0.4)]',
                className
            )}
            role="alertdialog"
            aria-labelledby="confirm-delete-title"
            aria-describedby="confirm-delete-desc"
        >
            <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-brutal-red flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-3">
                    <h3
                        id="confirm-delete-title"
                        className="font-heading font-bold text-lg uppercase text-brutal-dark"
                    >
                        Delete {entityName}?
                    </h3>

                    <p
                        id="confirm-delete-desc"
                        className="font-data text-sm text-brutal-dark/70"
                    >
                        {message || 'This action cannot be undone.'}
                    </p>

                    {hasCascade && (
                        <div className="border-l-4 border-brutal-red/40 pl-3 py-2 space-y-1">
                            <p className="font-data text-xs uppercase tracking-wide text-brutal-red font-bold">
                                This will also remove:
                            </p>
                            {cascadeItems!
                                .filter((c) => c.count > 0)
                                .map((c) => (
                                    <p key={c.label} className="font-data text-sm text-brutal-dark/80">
                                        <span className="font-bold">{c.count}</span> {c.label}
                                    </p>
                                ))}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onCancel}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={onConfirm}
                            loading={loading}
                            className="bg-brutal-red hover:bg-red-700"
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
