import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toastStore, type ToastRecord, type ToastType } from '../../lib/toast';

/**
 * Brutalist toast viewport. Mounted once via `<Toaster />` in `RootLayout`.
 *
 * Trigger toasts from anywhere with the imperative `toast` API exported from
 * `src/lib/toast.ts`:
 *
 *     import { toast } from '../../lib/toast';
 *     toast.success('Project created');
 *
 * Custom-built (no `sonner` dependency) so the brutalist look stays
 * consistent and the bundle stays lean.
 */

const ICONS: Record<ToastType, React.ComponentType<{ className?: string }>> = {
    success: CheckCircle2,
    error: AlertCircle,
    loading: Loader2,
    info: Info,
};

const TONE: Record<ToastType, string> = {
    success: 'border-brutal-dark bg-brutal-bg text-brutal-dark',
    error: 'border-brutal-red bg-brutal-bg text-brutal-dark',
    loading: 'border-brutal-dark bg-brutal-bg text-brutal-dark',
    info: 'border-brutal-dark bg-brutal-bg text-brutal-dark',
};

export function Toaster() {
    const [items, setItems] = useState<ToastRecord[]>([]);

    useEffect(() => {
        const unsubscribe = toastStore.subscribe(setItems);
        return () => {
            unsubscribe();
        };
    }, []);

    return (
        <div
            aria-live="polite"
            aria-atomic="true"
            className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6"
        >
            {items.map((t) => {
                const Icon = ICONS[t.type];
                return (
                    <div
                        key={t.id}
                        role={t.type === 'error' ? 'alert' : 'status'}
                        className={cn(
                            'pointer-events-auto flex w-full max-w-md items-start gap-3 border-2 px-4 py-3 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] font-data text-sm',
                            'transition-all duration-200 ease-out',
                            TONE[t.type],
                        )}
                    >
                        <Icon
                            className={cn(
                                'h-5 w-5 mt-0.5 shrink-0',
                                t.type === 'success' && 'text-brutal-dark',
                                t.type === 'error' && 'text-brutal-red',
                                t.type === 'loading' && 'text-brutal-red animate-spin',
                                t.type === 'info' && 'text-brutal-dark',
                            )}
                        />
                        <span className="flex-1 leading-snug">{t.message}</span>
                        <button
                            type="button"
                            aria-label="Dismiss notification"
                            className="shrink-0 rounded-md p-1 text-brutal-dark/60 hover:text-brutal-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                            onClick={() => toastStore.dismiss(t.id)}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
