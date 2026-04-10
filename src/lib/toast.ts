/**
 * Imperative toast API. Used app-wide. The visual `<Toaster />` component
 * lives in `src/components/ui/Toaster.tsx` and subscribes to this store.
 *
 * Usage:
 *     import { toast } from '../lib/toast';
 *     toast.success('Project created');
 *     toast.error('Could not save');
 *     toast.loading('Uploading…');
 *     toast.promise(savePromise, { loading: 'Saving…', success: 'Saved', error: 'Failed' });
 */

export type ToastType = 'success' | 'error' | 'loading' | 'info';

export interface ToastRecord {
    id: number;
    type: ToastType;
    message: string;
    duration: number;
}

type Listener = (toasts: ToastRecord[]) => void;

class ToastStore {
    private toasts: ToastRecord[] = [];
    private listeners = new Set<Listener>();
    private nextId = 1;

    subscribe(fn: Listener) {
        this.listeners.add(fn);
        fn(this.toasts);
        return () => {
            this.listeners.delete(fn);
        };
    }

    private emit() {
        this.listeners.forEach((fn) => fn([...this.toasts]));
    }

    add(type: ToastType, message: string, duration?: number): number {
        const id = this.nextId++;
        const finalDuration =
            duration ?? (type === 'loading' ? Infinity : type === 'error' ? 6000 : 4000);
        this.toasts = [...this.toasts, { id, type, message, duration: finalDuration }];
        this.emit();
        if (Number.isFinite(finalDuration)) {
            window.setTimeout(() => this.dismiss(id), finalDuration);
        }
        return id;
    }

    update(id: number, patch: Partial<Omit<ToastRecord, 'id'>>) {
        this.toasts = this.toasts.map((t) => (t.id === id ? { ...t, ...patch } : t));
        this.emit();
        const updated = this.toasts.find((t) => t.id === id);
        if (updated && Number.isFinite(updated.duration)) {
            window.setTimeout(() => this.dismiss(id), updated.duration);
        }
    }

    dismiss(id: number) {
        this.toasts = this.toasts.filter((t) => t.id !== id);
        this.emit();
    }
}

export const toastStore = new ToastStore();

export const toast = {
    success: (message: string, duration?: number) => toastStore.add('success', message, duration),
    error: (message: string, duration?: number) => toastStore.add('error', message, duration),
    loading: (message: string) => toastStore.add('loading', message, Infinity),
    info: (message: string, duration?: number) => toastStore.add('info', message, duration),
    badgeEarned: (badgeName: string) =>
        toastStore.add('success', `🏅 Badge earned: ${badgeName}`, 5000),
    dismiss: (id: number) => toastStore.dismiss(id),
    promise: <T,>(
        promise: Promise<T>,
        msgs: {
            loading: string;
            success: string | ((value: T) => string);
            error: string | ((err: unknown) => string);
        },
    ): Promise<T> => {
        const id = toastStore.add('loading', msgs.loading, Infinity);
        return promise.then(
            (value) => {
                const message = typeof msgs.success === 'function' ? msgs.success(value) : msgs.success;
                toastStore.update(id, { type: 'success', message, duration: 4000 });
                return value;
            },
            (err) => {
                const message = typeof msgs.error === 'function' ? msgs.error(err) : msgs.error;
                toastStore.update(id, { type: 'error', message, duration: 6000 });
                throw err;
            },
        );
    },
};
