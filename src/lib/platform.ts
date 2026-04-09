/**
 * Platform detection utilities.
 *
 * Used by the §7 Dashboard cockpit to render the correct modifier key
 * symbol in keyboard hint affordances (Cmd+K vs Ctrl+K). The actual
 * keyboard listener in Dashboard.tsx already accepts BOTH metaKey and
 * ctrlKey, so this is purely a display concern.
 *
 * navigator.platform is officially deprecated but is the most reliable
 * way to distinguish Mac/iOS from everything else without parsing UA
 * strings. We fall back to userAgent if platform is empty (some
 * privacy-hardened browsers null it out).
 */

export function isMacPlatform(): boolean {
    if (typeof navigator === 'undefined') return false;
    const platform = (navigator.platform || '').toLowerCase();
    if (platform) {
        return /mac|iphone|ipad|ipod/.test(platform);
    }
    const ua = (navigator.userAgent || '').toLowerCase();
    return /mac|iphone|ipad|ipod/.test(ua);
}

/**
 * Returns the human-readable modifier key symbol for the current
 * platform: '⌘' on Apple devices, 'Ctrl' on everything else.
 */
export function getModKeySymbol(): string {
    return isMacPlatform() ? '⌘' : 'Ctrl';
}

/**
 * Returns the full keyboard shortcut label for the command palette,
 * e.g. '⌘K' or 'Ctrl K'. Mac uses no separator (convention), other
 * platforms use a thin space so it's readable.
 */
export function getCommandPaletteShortcut(): string {
    return isMacPlatform() ? '⌘K' : 'Ctrl K';
}
