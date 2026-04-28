// ─── Database Types for Param Makerspace ───
// Auto-mapped to the Supabase schema. Keep in sync with supabase-schema.sql.

export type Role = 'viewer' | 'maker' | 'mentor' | 'admin';
export type ProjectStatus = 'draft' | 'pending_review' | 'active' | 'rejected';
export type ProjectVisibility = 'public' | 'private';
export type EventType = 'build_challenge' | 'maker_meetup' | 'tech_tuesday';
export type EventPhase = 'draft' | 'pre_event' | 'live' | 'post_event';
// NOTE: The database CHECK constraint in supabase-schema.sql still accepts
// 'upvote' for backwards compatibility with historical rows. The application
// intentionally narrows the TS union to only the reaction types it will
// write going forward. Historical 'upvote' rows in the database become
// dormant data — they are not rendered anywhere in the UI.
export type ReactionType = 'like' | 'bookmark';
export type TargetType = 'project' | 'challenge' | 'event' | 'maker_profile';

// ─── Core ───

export interface AppUser {
    id: string;
    auth_id: string;
    email: string;
    name: string;
    role: Role;
    xp: number;
    rank: string;
    rank_override: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface XPEvent {
    id: string;
    user_id: string;
    amount: number;
    reason: string;
    reference_id: string | null;
    reference_type: string | null;
    created_at: string;
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
    duration: string | null;
    remixed_from_id: string | null;
    is_hardware: boolean;
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

export interface ProjectBomLine {
    id: string;
    project_id: string;
    reference: string;
    part: string;
    quantity: number;
    source_url: string | null;
    cost_cents: number | null;
    notes: string | null;
    image_url: string | null;
    display_order: number;
    created_at: string;
}

export interface ProjectMake {
    id: string;
    project_id: string;
    user_id: string;
    image_url: string | null;
    caption: string;
    build_notes: string | null;
    created_at: string;
}

export interface ProjectCommentPin {
    id: string;
    project_id: string;
    target_type: 'image' | 'log' | 'bom_row';
    target_id: string;
    x_pct: number | null;
    y_pct: number | null;
    comment_id: string | null;
    created_at: string;
}

export interface ProjectMergeRequest {
    id: string;
    source_project_id: string;
    target_project_id: string;
    submitter_id: string;
    title: string;
    body: string | null;
    status: 'open' | 'accepted' | 'rejected' | 'withdrawn';
    diff_snapshot: any;
    created_at: string;
    resolved_at: string | null;
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
    // Extended fields for the new event page flow
    tagline: string | null;
    gallery_urls: string[] | null;
    results_summary: string | null;
    prizes_info: string | null;
    learnings: string | null;
    /**
     * Block-editor body (P4 of the events-page refactor). JSONB array of
     * discriminated-union blocks: heading | paragraph | image | list | callout.
     * The legacy `description` TEXT column is kept as a plaintext mirror so
     * calendar export / OG previews keep working.
     */
    description_blocks: EventBlock[] | null;
    // ─── Build Challenge config (P8) ───
    shortlist_deadline: string | null;
    submission_deadline: string | null;
    prize_summary: string | null;
    team_size_max: number | null;
    /**
     * Flipping from null → timestamp makes event_winner rows public.
     * Controlled by the "Publish winners" button on the admin Winners tab.
     */
    winners_published_at: string | null;
    // ─── Maker Meetup config (P9) ───
    /** ISO timestamp — end of application window for meetups. */
    application_deadline: string | null;
    /** Default interview slot length in minutes (used by the admin batch tool). */
    interview_slot_length_min: number | null;
    /**
     * Flipping from null → timestamp makes the final selection status
     * visible to applicants. Controlled by "Publish selection" on the
     * admin Selection sub-tab.
     */
    selection_published_at: string | null;
    /** Optional virtual meeting link shown on booked-slot confirmation. */
    meeting_url: string | null;
    // ─── Tech Tuesday / event_series config (P10) ───
    /** Nullable FK to event_series — set for recurring events like Tech Tuesdays. */
    series_id: string | null;
    /** External RSVP URL (Luma). Required for published tech_tuesday events. */
    external_rsvp_url: string | null;
    /** Speaker display name on the event page (tech_tuesday). */
    speaker_name: string | null;
    /** One-line speaker bio (tech_tuesday). */
    speaker_bio_short: string | null;
    /** One-paragraph topic description (tech_tuesday). */
    topic_summary: string | null;
    /** Advertised event duration in minutes (tech_tuesday). */
    duration_min: number | null;
    created_at: string;
    updated_at: string;
}

/**
 * A recurring-event template — e.g. the weekly Tech Tuesday.
 * event.series_id points to one of these rows so admins can clone,
 * bulk-edit defaults, and feature-flag series-specific behaviour.
 */
export interface EventSeries {
    id: string;
    event_type: EventType;
    title_template: string;
    default_location: string | null;
    default_duration_min: number | null;
    default_capacity: number | null;
    default_cover_image_url: string | null;
    owner_id: string | null;
    created_at: string;
    updated_at: string;
}

// ─── Speaker pitch (P11) ───

/**
 * Submission lifecycle for a self-serve speaker pitch.
 * Anyone (signed in or not) can create a 'new' pitch. Admins move it
 * through 'reviewing' → 'accepted' (which launches a prefilled wizard)
 * or 'archived'.
 */
export type SpeakerPitchStatus = 'new' | 'reviewing' | 'accepted' | 'archived';

export interface SpeakerPitch {
    id: string;
    /** Nullable — anonymous/logged-out pitchers are allowed. */
    user_id: string | null;
    name: string;
    email: string;
    topic_title: string;
    /** Block-editor body; capped at 5 blocks by the form. */
    topic_abstract: EventBlock[];
    /** Which event_type the pitcher thinks fits best. */
    preferred_event_type: EventType;
    /** Up to 3 URLs of past talks / recordings. */
    past_talk_links: string[];
    status: SpeakerPitchStatus;
    /** Admin who last touched the pitch. */
    reviewer_id: string | null;
    /** Admin-only note surfaced on the detail page. */
    reviewer_note: string | null;
    created_at: string;
    updated_at: string;
}

/** Block-editor blocks stored on event.description_blocks (jsonb). */
export type EventBlock =
    | { type: 'heading'; level: 2 | 3; text: string }
    | { type: 'paragraph'; text: string }
    | { type: 'image'; url: string; alt: string; caption?: string }
    | { type: 'list'; ordered: boolean; items: string[] }
    | { type: 'callout'; variant: 'info' | 'warning' | 'success'; text: string };

/**
 * Per-user, per-type wizard draft. One row per (user_id, event_type).
 * Payload is the entire wizard form as JSON — generic on purpose so
 * we don't migrate this table every time the wizard adds a field.
 */
export interface EventDraft {
    id: string;
    user_id: string;
    event_type: EventType;
    payload: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface EventHost {
    id: string;
    event_id: string;
    user_id: string;
    created_at: string;
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

/**
 * Build Challenge submission row.
 *
 * The table pre-dates Prompt 8 and originally supported a lighter-weight
 * flow. P8 extends it with the submission-form columns (title/repo/demo/
 * description_blocks) and a lock window (`locked_at`) that the server
 * sets when submission_deadline hits.
 *
 * `application_id` is nullable to keep pre-P8 rows valid; new Build
 * Challenge submissions always have it set.
 */
export interface EventSubmission {
    id: string;
    event_id: string;
    team_id: string | null;
    user_id: string;
    project_id: string | null;
    application_id: string | null;
    title: string | null;
    repo_url: string | null;
    demo_url: string | null;
    description_blocks: EventBlock[];
    submitted_at: string | null;
    locked_at: string | null;
    status: string;
    created_at: string;
    updated_at: string;
}

/**
 * A single row in event_application.
 *
 * The status enum was widened in Prompt 9 to include 'selected' so the
 * Maker Meetup pipeline can distinguish "passed interview + invited
 * to join" from "shortlisted to interview". Build Challenge flows
 * never use 'selected'.
 */
export type EventApplicationStatus =
    | 'pending'
    | 'shortlisted'
    | 'rejected'
    | 'withdrawn'
    | 'selected';

/**
 * Past-work link captured on a Maker Meetup application.
 * Stored as a JSONB array on event_application.past_work_links.
 */
export interface PastWorkLink {
    label: string;
    url: string;
}

export interface EventApplication {
    id: string;
    event_id: string;
    /** Captain (BC) or applicant (MM) — the row owner. */
    user_id: string;
    team_name: string;
    /** Other platform users tagged as team members (uuid[]). Empty for meetups. */
    team_member_user_ids: string[];
    pitch: string;
    status: EventApplicationStatus;
    /** Meetup-only: JSONB array of { label, url } entries. */
    past_work_links: PastWorkLink[];
    created_at: string;
    updated_at: string;
}

/**
 * A published winner row. rank 1/2/3 for podium; negative values are
 * reserved for honourable mentions (-1, -2, …). Rendering order is
 * ASC rank (positives first, then negatives).
 */
export interface EventWinner {
    id: string;
    event_id: string;
    submission_id: string;
    rank: number;
    prize_label: string;
    citation: string;
    created_at: string;
}

/** Admin-only scratch note on a submission. */
export interface EventSubmissionNote {
    id: string;
    submission_id: string;
    author_id: string;
    body: string;
    created_at: string;
    updated_at: string;
}

/** Maker Meetup interview slot status lifecycle (P9). */
export type EventInterviewSlotStatus = 'open' | 'booked' | 'done' | 'no_show';

/**
 * A bookable interview window created by an admin for a Maker Meetup
 * event. The applicant claims one by flipping status 'open' → 'booked'
 * and setting application_id. A partial unique index enforces one
 * booking per application per event.
 */
export interface EventInterviewSlot {
    id: string;
    event_id: string;
    start_at: string;
    end_at: string;
    mentor_user_id: string;
    /** Null while status = 'open'. Set to applicant's application.id on book. */
    application_id: string | null;
    status: EventInterviewSlotStatus;
    created_at: string;
    updated_at: string;
}

/**
 * Admin-only private note on an application, used by the Maker Meetup
 * Selection sub-tab. One row per (application, author_id) — each admin
 * keeps their own note.
 */
export interface EventSelectionNote {
    id: string;
    application_id: string;
    author_id: string;
    body: string;
    created_at: string;
    updated_at: string;
}

export interface ShowcaseSlot {
    id: string;
    event_id: string;
    user_id: string;
    project_id: string | null;
    // topic: string | null; — column not yet in DB, re-enable after migration
    status: string;
    created_at: string;
}

export interface EventWebsite {
    id: string;
    event_id: string;
    user_id: string;
    title: string;
    description: string | null;
    html_content: string | null;
    file_url: string | null;
    thumbnail_url: string | null;
    host_names: string[];
    status: 'pending' | 'approved' | 'rejected';
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
}

// ─── Community ───

export interface Comment {
    id: string;
    target_type: TargetType;
    target_id: string;
    user_id: string;
    parent_id: string | null;
    content: string;
    is_pinned: boolean;
    created_at: string;
    updated_at: string;
}

export interface CommentMention {
    id: string;
    comment_id: string;
    user_id: string;
    created_at: string;
}

export type CommentReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other';
export type CommentReportStatus = 'pending' | 'reviewed' | 'dismissed';

export interface CommentReport {
    id: string;
    comment_id: string;
    reporter_id: string;
    reason: CommentReportReason;
    details: string | null;
    status: CommentReportStatus;
    created_at: string;
}

export type ReactionTargetType = TargetType | 'comment';

export interface Reaction {
    id: string;
    target_type: ReactionTargetType;
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

// ─── Notifications ───

export type NotificationType =
  | 'project_approved'
  | 'project_rejected'
  | 'new_comment'
  | 'comment_reply'
  | 'comment_mention'
  | 'new_reaction'
  | 'event_broadcast'
  | 'event_update'
  | 'event_reminder'
  | 'welcome_back';

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    body: string | null;
    link: string | null;
    is_read: boolean;
    created_at: string;
}

export interface EventEmailLog {
    id: string;
    event_id: string;
    sent_by: string;
    subject: string;
    body: string;
    recipient_count: number;
    sent_at: string;
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
            xp_event: { Row: XPEvent & Record<string, unknown>; Insert: (Partial<XPEvent> & Pick<XPEvent, 'user_id' | 'amount' | 'reason'>) & Record<string, unknown>; Update: Partial<XPEvent> & Record<string, unknown>; Relationships: [] };
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
            project_bom_line: { Row: ProjectBomLine & Record<string, unknown>; Insert: (Partial<ProjectBomLine> & Pick<ProjectBomLine, 'project_id' | 'reference' | 'part' | 'quantity'>) & Record<string, unknown>; Update: Partial<ProjectBomLine> & Record<string, unknown>; Relationships: [] };
            project_make: { Row: ProjectMake & Record<string, unknown>; Insert: (Partial<ProjectMake> & Pick<ProjectMake, 'project_id' | 'user_id' | 'caption'>) & Record<string, unknown>; Update: Partial<ProjectMake> & Record<string, unknown>; Relationships: [] };
            project_comment_pin: { Row: ProjectCommentPin & Record<string, unknown>; Insert: (Partial<ProjectCommentPin> & Pick<ProjectCommentPin, 'project_id' | 'target_type' | 'target_id'>) & Record<string, unknown>; Update: Partial<ProjectCommentPin> & Record<string, unknown>; Relationships: [] };
            project_merge_request: { Row: ProjectMergeRequest & Record<string, unknown>; Insert: (Partial<ProjectMergeRequest> & Pick<ProjectMergeRequest, 'source_project_id' | 'target_project_id' | 'submitter_id' | 'title'>) & Record<string, unknown>; Update: Partial<ProjectMergeRequest> & Record<string, unknown>; Relationships: [] };
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
            event_series: { Row: EventSeries & Record<string, unknown>; Insert: (Partial<EventSeries> & Pick<EventSeries, 'event_type' | 'title_template'>) & Record<string, unknown>; Update: Partial<EventSeries> & Record<string, unknown>; Relationships: [] };
            speaker_pitch: { Row: SpeakerPitch & Record<string, unknown>; Insert: (Partial<SpeakerPitch> & Pick<SpeakerPitch, 'name' | 'email' | 'topic_title' | 'preferred_event_type'>) & Record<string, unknown>; Update: Partial<SpeakerPitch> & Record<string, unknown>; Relationships: [] };
            event_draft: { Row: EventDraft & Record<string, unknown>; Insert: (Partial<EventDraft> & Pick<EventDraft, 'user_id' | 'event_type'>) & Record<string, unknown>; Update: Partial<EventDraft> & Record<string, unknown>; Relationships: [] };
            event_host: { Row: EventHost & Record<string, unknown>; Insert: (Partial<EventHost> & Pick<EventHost, 'event_id' | 'user_id'>) & Record<string, unknown>; Update: Partial<EventHost> & Record<string, unknown>; Relationships: [] };
            event_registration: { Row: EventRegistration & Record<string, unknown>; Insert: (Partial<EventRegistration> & Pick<EventRegistration, 'event_id' | 'user_id'>) & Record<string, unknown>; Update: Partial<EventRegistration> & Record<string, unknown>; Relationships: [] };
            event_checkin: { Row: EventCheckin & Record<string, unknown>; Insert: (Partial<EventCheckin> & Pick<EventCheckin, 'event_id' | 'user_id'>) & Record<string, unknown>; Update: Partial<EventCheckin> & Record<string, unknown>; Relationships: [] };
            event_team: { Row: EventTeam & Record<string, unknown>; Insert: (Partial<EventTeam> & Pick<EventTeam, 'event_id' | 'name' | 'lead_id'>) & Record<string, unknown>; Update: Partial<EventTeam> & Record<string, unknown>; Relationships: [] };
            event_team_member: { Row: EventTeamMember & Record<string, unknown>; Insert: (Partial<EventTeamMember> & Pick<EventTeamMember, 'team_id' | 'user_id'>) & Record<string, unknown>; Update: Partial<EventTeamMember> & Record<string, unknown>; Relationships: [] };
            event_submission: { Row: EventSubmission & Record<string, unknown>; Insert: (Partial<EventSubmission> & Pick<EventSubmission, 'event_id' | 'user_id'>) & Record<string, unknown>; Update: Partial<EventSubmission> & Record<string, unknown>; Relationships: [] };
            event_application: { Row: EventApplication & Record<string, unknown>; Insert: (Partial<EventApplication> & Pick<EventApplication, 'event_id' | 'user_id' | 'team_name' | 'pitch'>) & Record<string, unknown>; Update: Partial<EventApplication> & Record<string, unknown>; Relationships: [] };
            event_winner: { Row: EventWinner & Record<string, unknown>; Insert: (Partial<EventWinner> & Pick<EventWinner, 'event_id' | 'submission_id' | 'rank' | 'prize_label'>) & Record<string, unknown>; Update: Partial<EventWinner> & Record<string, unknown>; Relationships: [] };
            event_submission_note: { Row: EventSubmissionNote & Record<string, unknown>; Insert: (Partial<EventSubmissionNote> & Pick<EventSubmissionNote, 'submission_id' | 'author_id' | 'body'>) & Record<string, unknown>; Update: Partial<EventSubmissionNote> & Record<string, unknown>; Relationships: [] };
            event_interview_slot: { Row: EventInterviewSlot & Record<string, unknown>; Insert: (Partial<EventInterviewSlot> & Pick<EventInterviewSlot, 'event_id' | 'start_at' | 'end_at' | 'mentor_user_id'>) & Record<string, unknown>; Update: Partial<EventInterviewSlot> & Record<string, unknown>; Relationships: [] };
            event_selection_note: { Row: EventSelectionNote & Record<string, unknown>; Insert: (Partial<EventSelectionNote> & Pick<EventSelectionNote, 'application_id' | 'author_id' | 'body'>) & Record<string, unknown>; Update: Partial<EventSelectionNote> & Record<string, unknown>; Relationships: [] };
            showcase_slot: { Row: ShowcaseSlot & Record<string, unknown>; Insert: (Partial<ShowcaseSlot> & Pick<ShowcaseSlot, 'event_id' | 'user_id'>) & Record<string, unknown>; Update: Partial<ShowcaseSlot> & Record<string, unknown>; Relationships: [] };
            event_website: { Row: EventWebsite & Record<string, unknown>; Insert: (Partial<EventWebsite> & Pick<EventWebsite, 'event_id' | 'user_id' | 'title'>) & Record<string, unknown>; Update: Partial<EventWebsite> & Record<string, unknown>; Relationships: [] };
            comment: { Row: Comment & Record<string, unknown>; Insert: (Partial<Comment> & Pick<Comment, 'target_type' | 'target_id' | 'user_id' | 'content'>) & Record<string, unknown>; Update: Partial<Comment> & Record<string, unknown>; Relationships: [] };
            comment_mention: { Row: CommentMention & Record<string, unknown>; Insert: (Partial<CommentMention> & Pick<CommentMention, 'comment_id' | 'user_id'>) & Record<string, unknown>; Update: Partial<CommentMention> & Record<string, unknown>; Relationships: [] };
            comment_report: { Row: CommentReport & Record<string, unknown>; Insert: (Partial<CommentReport> & Pick<CommentReport, 'comment_id' | 'reporter_id' | 'reason'>) & Record<string, unknown>; Update: Partial<CommentReport> & Record<string, unknown>; Relationships: [] };
            reaction: { Row: Reaction & Record<string, unknown>; Insert: (Partial<Reaction> & Pick<Reaction, 'target_type' | 'target_id' | 'user_id' | 'reaction_type'>) & Record<string, unknown>; Update: Partial<Reaction> & Record<string, unknown>; Relationships: [] };
            tag: { Row: Tag & Record<string, unknown>; Insert: (Partial<Tag> & Pick<Tag, 'name'>) & Record<string, unknown>; Update: Partial<Tag> & Record<string, unknown>; Relationships: [] };
            entity_tag: { Row: EntityTag & Record<string, unknown>; Insert: (Partial<EntityTag> & Pick<EntityTag, 'target_type' | 'target_id' | 'tag_id'>) & Record<string, unknown>; Update: Partial<EntityTag> & Record<string, unknown>; Relationships: [] };
            equipment: { Row: Equipment & Record<string, unknown>; Insert: (Partial<Equipment> & Pick<Equipment, 'name'>) & Record<string, unknown>; Update: Partial<Equipment> & Record<string, unknown>; Relationships: [] };
            equipment_induction: { Row: EquipmentInduction & Record<string, unknown>; Insert: (Partial<EquipmentInduction> & Pick<EquipmentInduction, 'equipment_id' | 'user_id'>) & Record<string, unknown>; Update: Partial<EquipmentInduction> & Record<string, unknown>; Relationships: [] };
            equipment_booking: { Row: EquipmentBooking & Record<string, unknown>; Insert: (Partial<EquipmentBooking> & Pick<EquipmentBooking, 'equipment_id' | 'user_id' | 'start_time' | 'end_time'>) & Record<string, unknown>; Update: Partial<EquipmentBooking> & Record<string, unknown>; Relationships: [] };
            inventory: { Row: Inventory & Record<string, unknown>; Insert: (Partial<Inventory> & Pick<Inventory, 'name' | 'quantity'>) & Record<string, unknown>; Update: Partial<Inventory> & Record<string, unknown>; Relationships: [] };
            notification: { Row: Notification & Record<string, unknown>; Insert: (Partial<Notification> & Pick<Notification, 'user_id' | 'type' | 'title'>) & Record<string, unknown>; Update: Partial<Notification> & Record<string, unknown>; Relationships: [] };
            event_email_log: { Row: EventEmailLog & Record<string, unknown>; Insert: (Partial<EventEmailLog> & Pick<EventEmailLog, 'event_id' | 'sent_by' | 'subject' | 'body'>) & Record<string, unknown>; Update: Partial<EventEmailLog> & Record<string, unknown>; Relationships: [] };
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
