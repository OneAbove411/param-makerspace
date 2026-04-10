/**
 * Backwards-compatibility shim.
 *
 * The 2,783-line monolith has been split into domain modules under
 * `src/lib/hooks/`. This file re-exports everything so that existing
 * `import { X } from '../lib/hooks'` statements continue to resolve
 * without any consumer changes.
 *
 * New code should import directly from the domain module:
 *   import { useProjects } from '../lib/hooks/useProjects'
 */
export * from './hooks/index';
