/**
 * API barrel export.
 *
 * Centralizes all data-access functions. Hooks and business logic
 * import from here (or from individual modules) instead of touching
 * `supabase.from(...)` directly.
 */

export * as projectsApi from './projects';
export * as challengesApi from './challenges';
export * as eventsApi from './events';
export * as usersApi from './users';
export * as badgesApi from './badges';
export * as tagsApi from './tags';
export * as equipmentApi from './equipment';
