import { useEffect } from 'react';

/**
 * Guard against losing unsaved form work.
 *
 * Hooks `window.beforeunload` so closing the tab / hitting refresh prompts
 * the native browser confirmation. Pass `formDirty=true` while the form has
 * unsaved changes; pass `false` after a successful save (or when the form
 * is pristine) to release the guard. The hook is a no-op when `formDirty`
 * is false.
 *
 * Note: in-app navigation (React Router link clicks) is not blocked here,
 * because this codebase uses `<BrowserRouter>` rather than the data router,
 * and `useBlocker` is only available with `createBrowserRouter`. The native
 * `beforeunload` guard still covers tab close, refresh, and full-page
 * navigations away from the app.
 *
 * Usage:
 *     const [dirty, setDirty] = useState(false);
 *     useUnsavedChanges(dirty);
 */
export function useUnsavedChanges(formDirty: boolean) {
    useEffect(() => {
        if (!formDirty) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            // Modern browsers ignore custom strings but require returnValue to be set.
            e.returnValue = '';
            return '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [formDirty]);
}
