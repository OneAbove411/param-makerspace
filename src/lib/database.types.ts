// ─── Database Types for Param Makerspace ───
// Auto-mapped to the Supabase schema. Keep in sync with supabase-schema.sql.

export type Role = 'viewer' | 'maker' | 'mentor' | 'admin';
export type ProjectStatus = 'draft' | 'pending_review' | 'active' | 'rejected';
export type ProjectVisibility = 'public' | 'private';
export type EventType = 'build_challenge' | 'maker_meetup' | 'tech_tuesday';
export type ReactionType = 'like' | 'upvote' | 'bookmark';
export type TargetType = 'project' | 'challenge' | 'event' | 'maker_profile';

// ─── Core ───

export interface AppUser {
    id: string;
    auth_id: string;
    email: string;
    name: string;
    role: Role;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface MakerProfile {
    id: string;
    user_id: string;
    display_name: string;
    pronouns: string | null;
    bio: string | null;
    aspirations: string | null;
    avatar_url: string | null;
    github_url: string | null;
    linkedin_url: string | null;
    website_url: string | null;
    is_public: boolean;
    created_at: string;
    updated_at: string;
}

export interface Skill {
    id: string;
    name: string;
    category: string | null;
    created_at: string;
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    tier: string;
    domain: string;
    badge_type: string;
    criteria: string;
    image_url: string | null;
    created_at: string;
}

export interface UserBadge {
    id: string;
    user_id: string;
    badge_id: string;
    awarded_at: string;
    awarded_by: string | null;
}

// ─── Projects ───

export interface Project {
    id: string;
    owner_id: string;
    title: string;
    summary: string;
    description: string;
    domain: string | null;
    tier: string | null;
    github_url: string | null;
    image_url: string | null;
    video_url: string | null;
    duration: string | null;
    status: ProjectStatus;
    visibility: ProjectVisibility;
    created_at: string;
    updated_at: string;
}

export interface ProjectMember {
    id: string;
    project_id: string;
    user_id: string;
    role: string;
    joined_at: string;
}

export interface ProjectMilestone {
    id: string;
    project_id: string;
    title: string;
    description: string | null;
    is_complete: boolean;
    display_order: number;
    created_at: string;
}

export interface ProjectImage {
    id: string;
    project_id: string;
    image_url: string;
    caption: string | null;
    display_order: number;
    created_at: string;
}

export interface ProjectVideo {
    id: string;
    project_id: string;
    title: string;
    video_url: string;
    display_order: number;
    created_at: string;
}

export interface ProjectFile {
    id: string;
    project_id: string;
    file_url: string;
    file_name: string;
    file_size: number | null;
    created_at: string;
}

// ─── Challenges ───

export interface Challenge {
    id: string;
    title: string;
    tier: string | null;
    domain: string | null;
    time_estimate: string | null;
    cover_image_url: string | null;
    mystery: string | null;
    core_idea: string | null;
    mission: string | null;
    success_criteria: string | null;
    status: string;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface ChallengeStep {
    id: string;
    challenge_id: string;
    step_text: string;
    display_order: number;
}

export interface ChallengeMaterial {
    id: string;
    challenge_id: string;
    name: string;
    display_order: number;
}

export interface ChallengeSkill {
    id: string;
    challenge_id: string;
    skill_name: string;
}

export interface ChallengeVocabulary {
    id: string;
    challenge_id: string;
    term: string;
    definition: string | null;
}

export interface ChallengeLevel {
    id: string;
    challenge_id: string;
    level_name: string;
    description: string | null;
}

export interface ChallengeImage {
    id: string;
    challenge_id: string;
    image_url: string;
    caption: string | null;
    display_order: number;
}

export interface ChallengeVideo {
    id: string;
    challenge_id: string;
    title: string;
    video_url: string;
    display_order: number;
}

export interface ChallengeCompletion {
    id: string;
    challenge_id: string;
    user_id: string;
    status: string;
    evidence_url: string | null;
    notes: string | null;
    verified_by: string | null;
    created_at: string;
    updated_at: string;
}

// ─── Events ───

export interface Event {
    id: string;
    title: string;
    description: string | null;
    event_type: EventType;
    date: string;
    end_date: string | null;
    location: string | null;
    capacity: number | null;
    cover_image_url: string | null;
    registration_status: string;
    auto_badge_id: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface EventRegistration {
    id: string;
    event_id: string;
    user_id: string;
    registered_at: string;
}

export interface EventCheckin {
    id: string;
    event_id: string;
    user_id: string;
    checked_in_at: string;
    checked_in_by: string | null;
}

export interface EventTeam {
    id: string;
    event_id: string;
    name: string;
    lead_id: string;
    created_at: string;
}

export interface EventTeamMember {
    id: string;
    team_id: string;
    user_id: string;
    joined_at: string;
}

export interface EventSubmission {
    id: string;
    event_id: string;
    team_id: string | null;
    user_id: string;
    project_id: string | null;
    status: string;
    created_at: string;
}

export interface ShowcaseSlot {
    id: string;
    event_id: string;
    user_id: string;
    project_id: string | null;
    status: string;
    created_at: string;
}

// ─── Community ───

export interface Comment {
    id: string;
    target_type: TargetType;
    target_id: string;
    user_id: string;
    content: string;
    created_at: string;
    updated_at: string;
}

export interface Reaction {
    id: string;
    target_type: TargetType;
    target_id: string;
    user_id: string;
    reaction_type: ReactionType;
    created_at: string;
}

export interface Tag {
    id: string;
    name: string;
    category: string | null;
    created_at: string;
}

export interface EntityTag {
    id: string;
    target_type: TargetType;
    target_id: string;
    tag_id: string;
    created_at: string;
}

// ─── Operations ───

export interface Equipment {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    is_active: boolean;
    requires_induction: boolean;
    created_at: string;
}

export interface EquipmentInduction {
    id: string;
    equipment_id: string;
    user_id: string;
    inducted_by: string | null;
    is_active: boolean;
    expires_at: string | null;
    created_at: string;
}

export interface EquipmentBooking {
    id: string;
    equipment_id: string;
    user_id: string;
    start_time: string;
    end_time: string;
    status: string;
    created_at: string;
}

export interface Inventory {
    id: string;
    name: string;
    description: string | null;
    quantity: number;
    unit: string | null;
    location: string | null;
    created_at: string;
    updated_at: string;
}

// ─── Store ───

export interface StoreProduct {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string | null;
    image_url: string | null;
    is_active: boolean;
    required_badge_id: string | null;
    created_at: string;
}

export interface StoreOrder {
    id: string;
    user_id: string;
    status: string;
    total: number;
    created_at: string;
    updated_at: string;
}

export interface StoreOrderItem {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
}

// ─── Supabase Database type (for createClient<Database>) ───
// Compatible with @supabase/supabase-js v2.49+

export interface Database {
    public: {
        Tables: {
            app_user: { Row: AppUser & Record<string, unknown>; Insert: (Partial<AppUser> & Pick<AppUser, 'auth_id' | 'email' | 'name'>) & Record<string, unknown>; Update: Partial<AppUser> & Record<string, unknown>; Relationships: [] };
            maker_profile: { Row: MakerProfile & Record<string, unknown>; Insert: (Partial<MakerProfile> & Pick<MakerProfile, 'user_id' | 'display_name'>) & Record<string, unknown>; Update: Partial<MakerProfile> & Record<string, unknown>; Relationships: [] };
            skill: { Row: Skill & Record<string, unknown>; Insert: (Partial<Skill> & Pick<Skill, 'name'>) & Record<string, unknown>; Update: Partial<Skill> & Record<string, unknown>; Relationships: [] };
            badge: { Row: Badge & Record<string, unknown>; Insert: (Partial<Badge> & Pick<Badge, 'name' | 'description' | 'tier' | 'domain' | 'badge_type' | 'criteria'>) & Record<string, unknown>; Update: Partial<Badge> & Record<string, unknown>; Relationships: [] };
            user_badge: { Row: UserBadge & Record<string, unknown>; Insert: (Partial<UserBadge> & Pick<UserBadge, 'user_id' | 'badge_id'>) & Record<string, unknown>; Update: Partial<UserBadge> & Record<string, unknown>; Relationships: [] };
            project: { Row: Project & Record<string, unknown>; Insert: (Partial<Project> & Pick<Project, 'owner_id' | 'title' | 'summary' | 'description'>) & Record<string, unknown>; Update: Partial<Project> & Record<string, unknown>; Relationships: [] };
            project_member: { Row: ProjectMember & Record<string, unknown>; Insert: (Partial<ProjectMember> & Pick<ProjectMember, 'project_id' | 'user_id'>) & Record<string, unknown>; Update: Partial<ProjectMember> & Record<string, unknown>; Relationships: [] };
            project_milestone: { Row: ProjectMilestone & Record<string, unknown>; Insert: (Partial<ProjectMilestone> & Pick<ProjectMilestone, 'project_id' | 'title'>) & Record<string, unknown>; Update: Partial<ProjectMilestone> & Record<string, unknown>; Relationships: [] };
            project_image: { Row: ProjectImage & Record<string, unknown>; Insert: (Partial<ProjectImage> & Pick<ProjectImage, 'project_id' | 'image_url'>) & Record<string, unknown>; Update: Partial<ProjectImage> & Record<string, unknown>; Relationships: [] };
            project_video: { Row: ProjectVideo & Record<string, unknown>; Insert: (Partial<ProjectVideo> & Pick<ProjectVideo, 'project_id' | 'title' | 'video_url'>) & Record<string, unknown>; Update: Partial<ProjectVideo> & Record<string, unknown>; Relationships: [] };
            project_file: { Row: ProjectFile & Record<string, unknown>; Insert: (Partial<ProjectFile> & Pick<ProjectFile, 'project_id' | 'file_url' | 'file_name'>) & Record<string, unknown>; Update: Partial<ProjectFile> & Record<string, unknown>; Relationships: [] };
            challenge: { Row: Challenge & Record<string, unknown>; Insert: (Partial<Challenge> & Pick<Challenge, 'title'>) & Record<string, unknown>; Update: Partial<Challenge> & Record<string, unknown>; Relationships: [] };
            challenge_step: { Row: ChallengeStep & Record<string, unknown>; Insert: (Partial<ChallengeStep> & Pick<ChallengeStep, 'challenge_id' | 'step_text'>) & Record<string, unknown>; Update: Partial<ChallengeStep> & Record<string, unknown>; Relationships: [] };
            challenge_material: { Row: ChallengeMaterial & Record<string, unknown>; Insert: (Partial<ChallengeMaterial> & Pick<ChallengeMaterial, 'challenge_id' | 'name'>) & Record<string, unknown>; Update: Partial<ChallengeMaterial> & Record<string, unknown>; Relationships: [] };
            challenge_skill: { Row: ChallengeSkill & Record<string, unknown>; Insert: (Partial<ChallengeSkill> & Pick<ChallengeSkill, 'challenge_id' | 'skill_name'>) & Record<string, unknown>; Update: Partial<ChallengeSkill> & Record<string, unknown>; Relationships: [] };
            challenge_vocabulary: { Row: ChallengeVocabulary & Record<string, unknown>; Insert: (Partial<ChallengeVocabulary> & Pick<ChallengeVocabulary, 'challenge_id' | 'term'>) & Record<string, unknown>; Update: Partial<ChallengeVocabulary> & Record<string, unknown>; Relationships: [] };
            challenge_level: { Row: ChallengeLevel & Record<string, unknown>; Insert: (Partial<ChallengeLevel> & Pick<ChallengeLevel, 'challenge_id' | 'level_name'>) & Record<string, unknown>; Update: Partial<ChallengeLevel> & Record<string, unknown>; Relationships: [] };
            challenge_image: { Row: ChallengeImage & Record<string, unknown>; Insert: (Partial<ChallengeImage> & Pick<ChallengeImage, 'challenge_id' | 'image_url'>) & Record<string, unknown>; Update: Partial<ChallengeImage> & Record<string, unknown>; Relationships: [] };
            challenge_video: { Row: ChallengeVideo & Record<string, unknown>; Insert: (Partial<ChallengeVideo> & Pick<ChallengeVideo, 'challenge_id' | 'title' | 'video_url'>) & Record<string, unknown>; Update: Partial<ChallengeVideo> & Record<string, unknown>; Relationships: [] };
            challenge_completion: { Row: ChallengeCompletion & Record<string, unknown>; Insert: (Partial<ChallengeCompletion> & Pick<ChallengeCompletion, 'challenge_id' | 'user_id'>) & Record<string, unknown>; Update: Partial<ChallengeCompletion> & Record<string, unknown>; Relationships: [] };
            event: { Row: Event & Record<string, unknown>; Insert: (Partial<Event> & Pick<Event, 'title' | 'event_type' | 'date'>) & Record<string, unknown>; Update: Partial<Event> & Record<string, unknown>; Relationships: [] };
            event_registration: { Row: EventRegistration & Record<string, unknown>; Insert: (Partial<EventRegistration> & Pick<EventRegistration, 'event_id' | 'user_id'>) & Record<string, unknown>; Update: Partial<EventRegistration> & Record<string, unknown>; Relationships: [] };
            event_checkin: { Row: EventCheckin & Record<string, unknown>; Insert: (Partial<EventCheckin> & Pick<EventCheckin, 'event_id' | 'user_id'>) & Record<string, unknown>; Update: Partial<EventCheckin> & Record<string, unknown>; Relationships: [] };
            event_team: { Row: EventTeam & Record<string, unknown>; Insert: (Partial<EventTeam> & Pick<EventTeam, 'event_id' | 'name' | 'lead_id'>) & Record<string, unknown>; Update: Partial<EventTeam> & Record<string, unknown>; Relationships: [] };
            event_team_member: { Row: EventTeamMember & Record<string, unknown>; Insert: (Partial<EventTeamMember> & Pick<EventTeamMember, 'team_id' | 'user_id'>) & Record<string, unknown>; Update: Partial<EventTeamMember> & Record<string, unknown>; Relationships: [] };
            event_submission: { Row: EventSubmission & Record<string, unknown>; Insert: (Partial<EventSubmission> & Pick<EventSubmission, 'event_id' | 'user_id'>) & Record<string, unknown>; Update: Partial<EventSubmission> & Record<string, unknown>; Relationships: [] };
            showcase_slot: { Row: ShowcaseSlot & Record<string, unknown>; Insert: (Partial<ShowcaseSlot> & Pick<ShowcaseSlot, 'event_id' | 'user_id'>) & Record<string, unknown>; Update: Partial<ShowcaseSlot> & Record<string, unknown>; Relationships: [] };
            comment: { Row: Comment & Record<string, unknown>; Insert: (Partial<Comment> & Pick<Comment, 'target_type' | 'target_id' | 'user_id' | 'content'>) & Record<string, unknown>; Update: Partial<Comment> & Record<string, unknown>; Relationships: [] };
            reaction: { Row: Reaction & Record<string, unknown>; Insert: (Partial<Reaction> & Pick<Reaction, 'target_type' | 'target_id' | 'user_id' | 'reaction_type'>) & Record<string, unknown>; Update: Partial<Reaction> & Record<string, unknown>; Relationships: [] };
            tag: { Row: Tag & Record<string, unknown>; Insert: (Partial<Tag> & Pick<Tag, 'name'>) & Record<string, unknown>; Update: Partial<Tag> & Record<string, unknown>; Relationships: [] };
            entity_tag: { Row: EntityTag & Record<string, unknown>; Insert: (Partial<EntityTag> & Pick<EntityTag, 'target_type' | 'target_id' | 'tag_id'>) & Record<string, unknown>; Update: Partial<EntityTag> & Record<string, unknown>; Relationships: [] };
            equipment: { Row: Equipment & Record<string, unknown>; Insert: (Partial<Equipment> & Pick<Equipment, 'name'>) & Record<string, unknown>; Update: Partial<Equipment> & Record<string, unknown>; Relationships: [] };
            equipment_induction: { Row: EquipmentInduction & Record<string, unknown>; Insert: (Partial<EquipmentInduction> & Pick<EquipmentInduction, 'equipment_id' | 'user_id'>) & Record<string, unknown>; Update: Partial<EquipmentInduction> & Record<string, unknown>; Relationships: [] };
            equipment_booking: { Row: EquipmentBooking & Record<string, unknown>; Insert: (Partial<EquipmentBooking> & Pick<EquipmentBooking, 'equipment_id' | 'user_id' | 'start_time' | 'end_time'>) & Record<string, unknown>; Update: Partial<EquipmentBooking> & Record<string, unknown>; Relationships: [] };
            inventory: { Row: Inventory & Record<string, unknown>; Insert: (Partial<Inventory> & Pick<Inventory, 'name' | 'quantity'>) & Record<string, unknown>; Update: Partial<Inventory> & Record<string, unknown>; Relationships: [] };
            store_product: { Row: StoreProduct & Record<string, unknown>; Insert: (Partial<StoreProduct> & Pick<StoreProduct, 'name' | 'description' | 'price'>) & Record<string, unknown>; Update: Partial<StoreProduct> & Record<string, unknown>; Relationships: [] };
            store_order: { Row: StoreOrder & Record<string, unknown>; Insert: (Partial<StoreOrder> & Pick<StoreOrder, 'user_id' | 'total'>) & Record<string, unknown>; Update: Partial<StoreOrder> & Record<string, unknown>; Relationships: [] };
            store_order_item: { Row: StoreOrderItem & Record<string, unknown>; Insert: (Partial<StoreOrderItem> & Pick<StoreOrderItem, 'order_id' | 'product_id' | 'quantity' | 'unit_price'>) & Record<string, unknown>; Update: Partial<StoreOrderItem> & Record<string, unknown>; Relationships: [] };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            get_my_role: { Args: Record<string, never>; Returns: Role };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
}
