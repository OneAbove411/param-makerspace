/**
 * Centralized microcopy for the Param Makerspace UI.
 *
 * Why this file exists:
 * - One source of truth for the human-facing strings that show up in many
 *   places (auth verbs, loading states, async confirmations).
 * - Replaces inconsistent / jargon-y phrases like `Authenticate`,
 *   `Create Identity`, `New initialization?`, etc., with plain language that
 *   matches Nielsen H2 (Match between system and the real world).
 *
 * Usage:
 *     import { LOADING, AUTH } from '../lib/copy';
 *     <Button>{loading ? LOADING.saving : AUTH.signIn}</Button>
 */

/** Standardized loading microcopy. Always end with an ellipsis (…). */
export const LOADING = {
    loading: 'Loading…',
    saving: 'Saving…',
    redirecting: 'Redirecting…',
    uploading: 'Uploading…',
} as const;

/** Standardized auth verb microcopy. */
export const AUTH = {
    signIn: 'Sign in',
    signUp: 'Sign up',
    signOut: 'Sign out',
    resetPassword: 'Reset password',
    saveNewPassword: 'Save new password',
    continueWithGoogle: 'Continue with Google',
    sendResetLink: 'Send reset link',
} as const;

export type LoadingCopy = typeof LOADING;
export type AuthCopy = typeof AUTH;
