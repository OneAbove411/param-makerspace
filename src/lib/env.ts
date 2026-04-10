/**
 * Runtime environment validation.
 *
 * Validates required Vite environment variables at application startup
 * so the app fails fast with a clear message instead of silently producing
 * cryptic Supabase errors later.
 *
 * Call `validateEnv()` once in main.tsx before React renders.
 */

interface EnvConfig {
    VITE_SUPABASE_DATABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
}

function assertNonEmpty(value: unknown, name: string): asserts value is string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(
            `[param] Missing required env var: ${name}. ` +
            `Create a .env.local file with ${name}=<your value>. ` +
            `See README.md for setup instructions.`
        );
    }
}

function assertUrl(value: string, name: string): void {
    try {
        new URL(value);
    } catch {
        throw new Error(
            `[param] Invalid URL in env var ${name}: "${value}". ` +
            `Expected a valid Supabase project URL (e.g. https://abc123.supabase.co).`
        );
    }
}

/**
 * Validates and returns the typed environment config.
 * Throws with a developer-friendly message if anything is missing or malformed.
 */
export function validateEnv(): EnvConfig {
    const url = import.meta.env.VITE_SUPABASE_DATABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

    assertNonEmpty(url, 'VITE_SUPABASE_DATABASE_URL');
    assertNonEmpty(key, 'VITE_SUPABASE_ANON_KEY');

    // Catch placeholder values left from initial setup
    if (url.includes('YOUR_PROJECT')) {
        throw new Error(
            `[param] VITE_SUPABASE_DATABASE_URL still contains placeholder "YOUR_PROJECT". ` +
            `Replace it with your actual Supabase project URL in .env.local.`
        );
    }

    assertUrl(url, 'VITE_SUPABASE_DATABASE_URL');

    return { VITE_SUPABASE_DATABASE_URL: url, VITE_SUPABASE_ANON_KEY: key };
}
