/**
 * Barrel re-export — backwards compatibility.
 *
 * Every existing `import { X } from '../lib/hooks'` continues to work
 * because this index re-exports every symbol from the domain modules.
 */

// Cache infrastructure
export {
    useSupabaseQuery,
    invalidateProjectCache,
    invalidateProjectListCache,
    invalidateQueryCache,
    patchProjectCache,
    refetchAllActiveQueries,
} from './cache';

// Projects
export {
    useProjects,
    useMyBookmarkedProjectIds,
    useToggleProjectBookmark,
    useMyProjects,
    useProject,
    useProjectMutations,
    useProjectImageMutations,
    useProjectFileMutations,
    useRemixProject,
    useProjectBom,
    useProjectBomMutations,
    useProjectMakes,
    useProjectMakeMutations,
    useProjectPins,
    useProjectPinMutations,
    useProjectMergeRequests,
    useMergeRequestMutations,
} from './useProjects';
export type { ProjectListItem, ProjectWithRelations } from './useProjects';

// Challenges
export {
    useChallenges,
    useMyBookmarkedChallengeIds,
    useMyRecentlyBookmarkedChallengeIds,
    useToggleChallengeBookmark,
    useMyChallengeCompletionStatus,
    useChallenge,
    useChallengeCompletion,
} from './useChallenges';

// Events
export {
    useEvents,
    useEvent,
    useEventHosts,
    useEventHostMutations,
    useEventRegistration,
    useEventWebsites,
    useMyEventWebsite,
    useEventWebsitesForReview,
    useEventWebsiteMutations,
    useAllEvents,
    useEventMutations,
} from './useEvents';

// Community (Reactions + Comments)
export {
    useReaction,
    useComments,
} from './useComments';

// Profile
export {
    useMakers,
    useMaker,
    useMyProfile,
    useProfileMutation,
    useMyStats,
    useRankAccess,
    useMyXPHistory,
} from './useProfile';

// Badges & Store
export {
    useBadges,
    useUserBadges,
    useBadgeMutations,
    useProducts,
    useAllProducts,
    useProductMutations,
    useStoreOrder,
} from './useBadges';

// Admin
export {
    useAllUsers,
    useUserMutations,
    useAllChallenges,
    useChallengeMutations,
    usePendingProjects,
    useAllProjectsAdmin,
    useProjectReviewMutations,
    useAdminProjectMutations,
    usePendingCompletions,
    useCompletionReviewMutations,
} from './useAdmin';

// Equipment & Inventory
export {
    useEquipment,
    useEquipmentMutations,
    useInventory,
    useInventoryMutations,
} from './useEquipment';
