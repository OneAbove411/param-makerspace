
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ─── Types ───

interface EmailPayload {
  type: EmailType;
  data: Record<string, unknown>;
}

type EmailType =
  | "project_approved"
  | "project_rejected"
  | "new_comment"
  | "comment_reply"
  | "comment_mention"
  | "new_reaction"
  | "event_update"
  | "event_reminder"
  | "event_broadcast"
  | "welcome_back";

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

// ─── SMTP Setup ───

function createSMTPClient(): SMTPClient {
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASS");
  if (!user || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS environment secrets are required. Set them via `supabase secrets set`.");
  }
  return new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: {
        username: user,
        password: pass,
      },
    },
    content_encoding: "base64",
  });
}

// ─── Supabase Admin Client ───

function createSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ─── Email Builders ───
// Each builder fetches necessary data from the DB and returns EmailMessage(s).

const SITE_URL = () => Deno.env.get("SITE_URL") || "https://makerspace.paraminnovation.org";
const FROM = () => Deno.env.get("SMTP_USER") || "makersadmin@paraminnovation.org";
const FROM_NAME = "Param Makerspace";

async function buildProjectApproved(data: Record<string, unknown>): Promise<EmailMessage[]> {
  const supabase = createSupabaseAdmin();
  const projectId = data.project_id as string;

  const { data: project } = await supabase
    .from("project")
    .select("title, owner_id")
    .eq("id", projectId)
    .single();

  if (!project) return [];

  const { data: owner } = await supabase
    .from("app_user")
    .select("email, name")
    .eq("id", project.owner_id)
    .single();

  if (!owner) return [];

  return [{
    to: owner.email,
    subject: `Your project "${project.title}" has been approved!`,
    html: renderTemplate("project_approved", {
      user_name: owner.name,
      project_title: project.title,
      project_url: `${SITE_URL()}/projects/${projectId}`,
    }),
  }];
}

async function buildProjectRejected(data: Record<string, unknown>): Promise<EmailMessage[]> {
  const supabase = createSupabaseAdmin();
  const projectId = data.project_id as string;
  const reason = (data.reason as string) || "No reason provided.";

  const { data: project } = await supabase
    .from("project")
    .select("title, owner_id")
    .eq("id", projectId)
    .single();

  if (!project) return [];

  const { data: owner } = await supabase
    .from("app_user")
    .select("email, name")
    .eq("id", project.owner_id)
    .single();

  if (!owner) return [];

  return [{
    to: owner.email,
    subject: `Your project "${project.title}" needs changes`,
    html: renderTemplate("project_rejected", {
      user_name: owner.name,
      project_title: project.title,
      reason,
      project_url: `${SITE_URL()}/dashboard`,
    }),
  }];
}

// ─── Universal target resolver ───
// Looks up the owner and title/name for any target type.

interface TargetInfo {
  ownerId: string;
  title: string;
  url: string;
}

async function resolveTarget(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  targetType: string,
  targetId: string,
): Promise<TargetInfo | null> {
  switch (targetType) {
    case "project": {
      const { data } = await supabase.from("project").select("title, owner_id").eq("id", targetId).single();
      if (!data) return null;
      return { ownerId: data.owner_id, title: data.title, url: `${SITE_URL()}/projects/${targetId}` };
    }
    case "event": {
      const { data } = await supabase.from("event").select("title, created_by").eq("id", targetId).single();
      if (!data || !data.created_by) return null;
      return { ownerId: data.created_by, title: data.title, url: `${SITE_URL()}/events/${targetId}` };
    }
    case "challenge": {
      const { data } = await supabase.from("challenge").select("title, created_by").eq("id", targetId).single();
      if (!data || !data.created_by) return null;
      return { ownerId: data.created_by, title: data.title, url: `${SITE_URL()}/challenges/${targetId}` };
    }
    case "maker_profile": {
      const { data } = await supabase.from("maker_profile").select("display_name, user_id").eq("id", targetId).single();
      if (!data) return null;
      return { ownerId: data.user_id, title: data.display_name || "your profile", url: `${SITE_URL()}/makers/${targetId}` };
    }
    default:
      return null;
  }
}

// Human-readable label for target types in email subject/body
function targetLabel(targetType: string): string {
  switch (targetType) {
    case "project": return "project";
    case "event": return "event";
    case "challenge": return "challenge";
    case "maker_profile": return "profile";
    default: return "post";
  }
}

async function buildNewComment(data: Record<string, unknown>): Promise<EmailMessage[]> {
  const supabase = createSupabaseAdmin();
  const targetType = data.target_type as string;
  const targetId = data.target_id as string;
  const commenterId = data.commenter_id as string;
  const commentContent = data.comment_content as string;

  const target = await resolveTarget(supabase, targetType, targetId);
  if (!target) return [];

  // Don't notify if user comments on their own content
  if (target.ownerId === commenterId) return [];

  // Skip if the owner was already notified via mention or reply
  const alreadyNotified = (data.already_notified_ids as string[] | undefined) || [];
  if (alreadyNotified.includes(target.ownerId)) return [];

  const { data: commenter } = await supabase
    .from("app_user")
    .select("name")
    .eq("id", commenterId)
    .single();

  const { data: owner } = await supabase
    .from("app_user")
    .select("email, name")
    .eq("id", target.ownerId)
    .single();

  if (!owner || !commenter) return [];

  const label = targetLabel(targetType);

  return [{
    to: owner.email,
    subject: `${commenter.name} commented on your ${label} "${target.title}"`,
    html: renderTemplate("new_comment", {
      user_name: owner.name,
      commenter_name: commenter.name,
      project_title: target.title,
      comment_preview: commentContent.slice(0, 200),
      project_url: target.url,
    }),
  }];
}

async function buildCommentReply(data: Record<string, unknown>): Promise<EmailMessage[]> {
  const supabase = createSupabaseAdmin();
  const targetType = data.target_type as string;
  const targetId = data.target_id as string;
  const replierId = data.replier_id as string;
  const parentUserId = data.parent_comment_user_id as string;
  const commentContent = data.comment_content as string;

  // Don't notify if user replies to their own comment
  if (replierId === parentUserId) return [];

  const target = await resolveTarget(supabase, targetType, targetId);
  if (!target) return [];

  const { data: replier } = await supabase
    .from("app_user")
    .select("name")
    .eq("id", replierId)
    .single();

  const { data: parentUser } = await supabase
    .from("app_user")
    .select("email, name")
    .eq("id", parentUserId)
    .single();

  if (!parentUser || !replier) return [];

  const label = targetLabel(targetType);

  return [{
    to: parentUser.email,
    subject: `${replier.name} replied to your comment on "${target.title}"`,
    html: renderTemplate("comment_reply", {
      user_name: parentUser.name,
      replier_name: replier.name,
      target_title: target.title,
      target_label: label,
      comment_preview: commentContent.slice(0, 200),
      target_url: target.url,
    }),
  }];
}

async function buildCommentMention(data: Record<string, unknown>): Promise<EmailMessage[]> {
  const supabase = createSupabaseAdmin();
  const targetType = data.target_type as string;
  const targetId = data.target_id as string;
  const mentionerId = data.mentioner_id as string;
  const mentionedUserId = data.mentioned_user_id as string;
  const commentContent = data.comment_content as string;

  // Don't notify if user mentions themselves
  if (mentionerId === mentionedUserId) return [];

  const target = await resolveTarget(supabase, targetType, targetId);
  if (!target) return [];

  const { data: mentioner } = await supabase
    .from("app_user")
    .select("name")
    .eq("id", mentionerId)
    .single();

  const { data: mentionedUser } = await supabase
    .from("app_user")
    .select("email, name")
    .eq("id", mentionedUserId)
    .single();

  if (!mentionedUser || !mentioner) return [];

  const label = targetLabel(targetType);

  return [{
    to: mentionedUser.email,
    subject: `${mentioner.name} mentioned you in a comment on "${target.title}"`,
    html: renderTemplate("comment_mention", {
      user_name: mentionedUser.name,
      mentioner_name: mentioner.name,
      target_title: target.title,
      target_label: label,
      comment_preview: commentContent.slice(0, 200),
      target_url: target.url,
    }),
  }];
}

async function buildNewReaction(data: Record<string, unknown>): Promise<EmailMessage[]> {
  const supabase = createSupabaseAdmin();
  const targetType = data.target_type as string;
  const targetId = data.target_id as string;
  const reactorId = data.reactor_id as string;
  const reactionType = data.reaction_type as string;

  const target = await resolveTarget(supabase, targetType, targetId);
  if (!target) return [];

  // Don't notify if user reacts to their own content
  if (target.ownerId === reactorId) return [];

  // Deduplicate: skip if we already sent a reaction notification for this target+owner
  // in the last 5 minutes. Prevents email spam from rapid like/unlike/re-like toggling.
  const notifLinkMap: Record<string, string> = {
    project: `/projects/${targetId}`,
    event: `/events/${targetId}`,
    challenge: `/challenges/${targetId}`,
    maker_profile: `/makers/${targetId}`,
  };
  const notifLink = notifLinkMap[targetType] || `/projects/${targetId}`;

  const { count } = await supabase
    .from("notification")
    .select("id", { count: "exact", head: true })
    .eq("user_id", target.ownerId)
    .eq("type", "new_reaction")
    .eq("link", notifLink)
    .gte("created_at", new Date(Date.now() - 5 * 60_000).toISOString());

  if ((count ?? 0) > 0) return [];

  const { data: reactor } = await supabase
    .from("app_user")
    .select("name")
    .eq("id", reactorId)
    .single();

  const { data: owner } = await supabase
    .from("app_user")
    .select("email, name")
    .eq("id", target.ownerId)
    .single();

  if (!owner || !reactor) return [];

  const verb = reactionType === "bookmark" ? "bookmarked" : "liked";
  const label = targetLabel(targetType);

  return [{
    to: owner.email,
    subject: `${reactor.name} ${verb} your ${label} "${target.title}"`,
    html: renderTemplate("new_reaction", {
      user_name: owner.name,
      reactor_name: reactor.name,
      project_title: target.title,
      reaction_type: verb,
      project_url: target.url,
    }),
  }];
}

async function buildEventBroadcast(data: Record<string, unknown>): Promise<EmailMessage[]> {
  const supabase = createSupabaseAdmin();
  const eventId = data.event_id as string;
  const subject = data.subject as string;
  const body = data.body as string;
  const sentBy = data.sent_by as string;

  // Get event info
  const { data: event } = await supabase
    .from("event")
    .select("title")
    .eq("id", eventId)
    .single();

  if (!event) return [];

  // Get sender info
  const { data: sender } = await supabase
    .from("app_user")
    .select("name")
    .eq("id", sentBy)
    .single();

  // Get all registrant emails
  const { data: registrations } = await supabase
    .from("event_registration")
    .select("user_id")
    .eq("event_id", eventId);

  if (!registrations || registrations.length === 0) return [];

  const userIds = registrations.map((r: { user_id: string }) => r.user_id);
  const { data: users } = await supabase
    .from("app_user")
    .select("email, name")
    .in("id", userIds);

  if (!users) return [];

  // Log the broadcast
  await supabase.from("event_email_log").insert({
    event_id: eventId,
    sent_by: sentBy,
    subject,
    body,
    recipient_count: users.length,
  });

  return users.map((user: { email: string; name: string }) => ({
    to: user.email,
    subject,
    html: renderTemplate("event_broadcast", {
      user_name: user.name,
      event_title: event.title,
      sender_name: sender?.name || "A mentor",
      body,
      event_url: `${SITE_URL()}/events/${eventId}`,
    }),
  }));
}

async function buildEventReminder(data: Record<string, unknown>): Promise<EmailMessage[]> {
  const supabase = createSupabaseAdmin();
  const eventId = data.event_id as string;

  const { data: event } = await supabase
    .from("event")
    .select("title, date, location")
    .eq("id", eventId)
    .single();

  if (!event) return [];

  const { data: registrations } = await supabase
    .from("event_registration")
    .select("user_id")
    .eq("event_id", eventId);

  if (!registrations || registrations.length === 0) return [];

  const userIds = registrations.map((r: { user_id: string }) => r.user_id);
  const { data: users } = await supabase
    .from("app_user")
    .select("email, name")
    .in("id", userIds);

  if (!users) return [];

  return users.map((user: { email: string; name: string }) => ({
    to: user.email,
    subject: `Reminder: "${event.title}" is coming up!`,
    html: renderTemplate("event_reminder", {
      user_name: user.name,
      event_title: event.title,
      event_date: event.date,
      event_location: event.location || "TBA",
      event_url: `${SITE_URL()}/events/${eventId}`,
    }),
  }));
}

async function buildWelcomeBack(data: Record<string, unknown>): Promise<EmailMessage[]> {
  const supabase = createSupabaseAdmin();
  const userId = data.user_id as string;

  const { data: user } = await supabase
    .from("app_user")
    .select("email, name")
    .eq("id", userId)
    .single();

  if (!user) return [];

  // Fetch recent activity to include in the email
  const { data: recentProjects } = await supabase
    .from("project")
    .select("title, id")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(3);

  const { data: upcomingEvents } = await supabase
    .from("event")
    .select("title, id, date")
    .gte("date", new Date().toISOString())
    .order("date", { ascending: true })
    .limit(3);

  const projectsList = (recentProjects || [])
    .map((p: { title: string; id: string }) =>
      `<li><a href="${SITE_URL()}/projects/${p.id}" style="color:#C4291E;text-decoration:none;">${p.title}</a></li>`
    )
    .join("");

  const eventsList = (upcomingEvents || [])
    .map((e: { title: string; id: string; date: string }) =>
      `<li><a href="${SITE_URL()}/events/${e.id}" style="color:#C4291E;text-decoration:none;">${e.title}</a> — ${new Date(e.date).toLocaleDateString()}</li>`
    )
    .join("");

  return [{
    to: user.email,
    subject: "We miss you at Param Makerspace!",
    html: renderTemplate("welcome_back", {
      user_name: user.name,
      recent_projects_html: projectsList || "<li>No new projects yet — be the first!</li>",
      upcoming_events_html: eventsList || "<li>No upcoming events right now.</li>",
      site_url: SITE_URL(),
    }),
  }];
}

// ─── Template Renderer ───

function renderTemplate(type: string, vars: Record<string, string>): string {
  const templates: Record<string, string> = {
    project_approved: TEMPLATE_PROJECT_APPROVED,
    project_rejected: TEMPLATE_PROJECT_REJECTED,
    new_comment: TEMPLATE_NEW_COMMENT,
    comment_reply: TEMPLATE_COMMENT_REPLY,
    comment_mention: TEMPLATE_COMMENT_MENTION,
    new_reaction: TEMPLATE_NEW_REACTION,
    event_broadcast: TEMPLATE_EVENT_BROADCAST,
    event_reminder: TEMPLATE_EVENT_REMINDER,
    welcome_back: TEMPLATE_WELCOME_BACK,
  };

  let html = templates[type] || templates["project_approved"];

  // Fields that contain URLs or raw HTML — must NOT be HTML-escaped
  const rawFields = new Set([
    "project_url", "event_url", "site_url",
    "recent_projects_html", "upcoming_events_html", "body",
  ]);

  for (const [key, value] of Object.entries(vars)) {
    if (rawFields.has(key)) {
      // Replace both {{{key}}} (raw marker) and {{key}} with unescaped value
      html = html.replaceAll(`{{{${key}}}}`, value);
      html = html.replaceAll(`{{${key}}}`, value);
    } else {
      // Escape HTML for safe text insertion
      html = html.replaceAll(`{{{${key}}}}`, value);
      html = html.replaceAll(`{{${key}}}`, escapeHtml(value));
    }
  }
  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Email Dispatch Map ───

const builders: Record<EmailType, (data: Record<string, unknown>) => Promise<EmailMessage[]>> = {
  project_approved: buildProjectApproved,
  project_rejected: buildProjectRejected,
  new_comment: buildNewComment,
  comment_reply: buildCommentReply,
  comment_mention: buildCommentMention,
  new_reaction: buildNewReaction,
  event_update: buildEventBroadcast,  // alias
  event_broadcast: buildEventBroadcast,
  event_reminder: buildEventReminder,
  welcome_back: buildWelcomeBack,
};

// ─── Main Handler ───

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-webhook-secret, x-client-info, x-app-version, apikey",
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Parse payload — supports both direct calls and Supabase webhook format
    const rawBody = await req.json();

    let payload: EmailPayload;

    // Supabase Database Webhooks send: { type: "INSERT", table: "...", record: {...}, old_record: {...} }
    if (rawBody.type === "INSERT" || rawBody.type === "UPDATE") {
      payload = mapWebhookToPayload(rawBody);
    } else {
      // Direct invocation: { type: "project_approved", data: { ... } }
      payload = rawBody as EmailPayload;
    }

    if (!payload.type || !builders[payload.type]) {
      return new Response(JSON.stringify({ error: `Unknown email type: ${payload.type}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build email messages
    const allMessages = await builders[payload.type](payload.data);

    if (allMessages.length === 0) {
      return new Response(JSON.stringify({ sent: 0, note: "No recipients found or notification skipped" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter out users who have opted out of email notifications
    // (graceful: if the column doesn't exist yet, skip filtering)
    let messages = allMessages;
    try {
      const supabaseAdmin = createSupabaseAdmin();
      const recipientEmails = allMessages.map((m) => m.to);
      const { data: optedOutUsers, error: optOutError } = await supabaseAdmin
        .from("app_user")
        .select("email")
        .in("email", recipientEmails)
        .eq("email_notifications_enabled", false);

      if (!optOutError && optedOutUsers) {
        const optedOutEmails = new Set(optedOutUsers.map((u: { email: string }) => u.email));
        messages = allMessages.filter((m) => !optedOutEmails.has(m.to));
      }
    } catch (optErr) {
      console.warn("Opt-out filter skipped (column may not exist):", optErr);
    }

    if (messages.length === 0) {
      return new Response(JSON.stringify({ sent: 0, note: "All recipients have opted out of email notifications" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via SMTP
    const client = createSMTPClient();
    let sent = 0;
    const errors: string[] = [];

    for (const msg of messages) {
      try {
        await client.send({
          from: `${FROM_NAME} <${FROM()}>`,
          to: msg.to,
          subject: msg.subject,
          content: "",
          html: msg.html,
        });
        sent++;
      } catch (err) {
        errors.push(`Failed to send to ${msg.to}: ${(err as Error).message}`);
        console.error(`SMTP error for ${msg.to}:`, err);
      }
    }

    await client.close();

    // Also insert in-app notifications
    await insertInAppNotifications(payload, messages);

    return new Response(
      JSON.stringify({ sent, total: messages.length, errors: errors.length > 0 ? errors : undefined }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge Function error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// ─── Webhook-to-Payload Mapper ───
// Converts Supabase database webhook payloads to our EmailPayload format.

function mapWebhookToPayload(webhook: Record<string, unknown>): EmailPayload {
  const table = webhook.table as string;
  const record = webhook.record as Record<string, unknown>;
  const oldRecord = webhook.old_record as Record<string, unknown> | null;

  // project status changed
  if (table === "project" && webhook.type === "UPDATE" && record.status !== oldRecord?.status) {
    if (record.status === "active") {
      return { type: "project_approved", data: { project_id: record.id } };
    }
    if (record.status === "rejected") {
      return { type: "project_rejected", data: { project_id: record.id, reason: record.review_note || "" } };
    }
  }

  // new comment
  if (table === "comment" && webhook.type === "INSERT") {
    return {
      type: "new_comment",
      data: {
        target_type: record.target_type,
        target_id: record.target_id,
        commenter_id: record.user_id,
        comment_content: record.content,
      },
    };
  }

  // new reaction
  if (table === "reaction" && webhook.type === "INSERT") {
    return {
      type: "new_reaction",
      data: {
        target_type: record.target_type,
        target_id: record.target_id,
        reactor_id: record.user_id,
        reaction_type: record.reaction_type,
      },
    };
  }

  // Unknown webhook — return null-safe payload that will produce 0 emails
  console.warn(`Unhandled webhook: table=${table}, type=${webhook.type}`);
  return { type: "project_approved", data: {} };
}

// ─── In-App Notification Insert ───

async function insertInAppNotifications(payload: EmailPayload, messages: EmailMessage[]) {
  try {
    const supabase = createSupabaseAdmin();

    // Resolve the notification link based on email type and target info
    const targetType = payload.data.target_type as string | undefined;
    const targetId = (payload.data.project_id || payload.data.target_id || payload.data.event_id || "") as string;

    const linkMap: Record<string, string> = {
      project: `/projects/${targetId}`,
      event: `/events/${targetId}`,
      challenge: `/challenges/${targetId}`,
      maker_profile: `/makers/${targetId}`,
    };

    const typeToLink: Record<string, string> = {
      project_approved: `/projects/${targetId}`,
      project_rejected: "/dashboard",
      new_comment: linkMap[targetType || "project"] || `/projects/${targetId}`,
      comment_reply: linkMap[targetType || "project"] || `/projects/${targetId}`,
      comment_mention: linkMap[targetType || "project"] || `/projects/${targetId}`,
      new_reaction: linkMap[targetType || "project"] || `/projects/${targetId}`,
      event_broadcast: `/events/${targetId}`,
      event_update: `/events/${targetId}`,
      event_reminder: `/events/${targetId}`,
      welcome_back: "/",
    };

    const link = typeToLink[payload.type] || "/";

    // Resolve recipient user IDs from emails
    const emails = messages.map((m) => m.to);
    const { data: users } = await supabase
      .from("app_user")
      .select("id, email")
      .in("email", emails);

    if (!users || users.length === 0) return;

    const emailToId = new Map(users.map((u: { id: string; email: string }) => [u.email, u.id]));

    const notifications = messages
      .filter((m) => emailToId.has(m.to))
      .map((m) => ({
        user_id: emailToId.get(m.to)!,
        type: payload.type,
        title: m.subject,
        link,
        is_read: false,
      }));

    if (notifications.length > 0) {
      await supabase.from("notification").insert(notifications);
    }
  } catch (err) {
    // Don't fail the email send if notification insert fails
    console.error("Failed to insert in-app notifications:", err);
  }
}

// ─── HTML Email Templates ───
// Matching the existing Param Makerspace brand:
// - Background: #F5F3EE
// - Card: #FFFFFF with border-radius:16px
// - Accent: #C4291E
// - Text: #111111
// - Font: Space Grotesk / Space Mono

const TEMPLATE_SHELL_START = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F5F3EE;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;color:#111111;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F3EE;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">
        <tr><td style="padding:0 0 32px 0;">
          <span style="font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.04em;color:#111111;text-transform:uppercase;">PARAM</span>
          <span style="font-family:'Space Mono',monospace;font-size:10px;color:#111111;opacity:0.4;display:block;margin-top:-2px;text-transform:uppercase;">makersadda</span>
        </td></tr>
        <tr><td style="background-color:#FFFFFF;border:2px solid rgba(17,17,17,0.08);border-radius:16px;padding:48px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">`;

const TEMPLATE_SHELL_END = `
          </table>
        </td></tr>
        <tr><td style="padding:32px 0 0 0;" align="center">
          <p style="margin:0;font-family:'Space Mono',monospace;font-size:10px;color:rgba(17,17,17,0.3);text-transform:uppercase;letter-spacing:0.05em;">Param Innovation AI &amp; Robotics Lab</p>
          <p style="margin:6px 0 0 0;font-family:'Space Mono',monospace;font-size:10px;color:rgba(17,17,17,0.2);line-height:1.5;">Chikhli, Gujarat, India</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

function wrapTemplate(title: string, subtitle: string, bodyHtml: string, ctaText: string, ctaUrl: string): string {
  // Build compact HTML with no inter-tag whitespace (prevents =20 QP artifacts)
  const html = [
    TEMPLATE_SHELL_START,
    `<tr><td style="padding:0 0 8px 0;">`,
    `<h1 style="margin:0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:28px;font-weight:700;letter-spacing:-0.04em;text-transform:uppercase;color:#111111;">${title}</h1>`,
    `</td></tr>`,
    `<tr><td style="padding:0 0 32px 0;">`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>`,
    `<td style="width:3px;background-color:#C4291E;"></td>`,
    `<td style="padding:4px 0 4px 12px;">`,
    `<p style="margin:0;font-family:'Space Mono',monospace;font-size:12px;color:rgba(17,17,17,0.5);line-height:1.5;">${subtitle}</p>`,
    `</td>`,
    `</tr></table>`,
    `</td></tr>`,
    `<tr><td style="padding:0 0 32px 0;">`,
    bodyHtml,
    `</td></tr>`,
    `<tr><td style="padding:0 0 32px 0;" align="center">`,
    `<a href="${ctaUrl}" target="_blank" style="display:inline-block;background-color:#111111;color:#F5F3EE;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;text-decoration:none;padding:16px 48px;border-radius:12px;">`,
    ctaText,
    `</a>`,
    `</td></tr>`,
    TEMPLATE_SHELL_END,
  ].join("");
  return html;
}

// ─── Individual Templates ───

const TEMPLATE_PROJECT_APPROVED = wrapTemplate(
  "Project Approved",
  "Your project is now live",
  `<p style="margin:0 0 16px 0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#111111;">
    Hey {{user_name}}, great news! Your project <strong>"{{project_title}}"</strong> has been reviewed and approved. It's now live on Param Makerspace for the community to see.
  </p>`,
  "View Your Project",
  "{{project_url}}"
);

const TEMPLATE_PROJECT_REJECTED = wrapTemplate(
  "Changes Needed",
  "Your project needs a few updates",
  `<p style="margin:0 0 16px 0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#111111;">
    Hey {{user_name}}, your project <strong>"{{project_title}}"</strong> has been reviewed and needs some changes before it can go live.
  </p>
  <div style="background-color:#F5F3EE;border-left:3px solid #C4291E;padding:16px 20px;border-radius:8px;margin:0 0 16px 0;">
    <p style="margin:0;font-family:'Space Mono',monospace;font-size:12px;color:rgba(17,17,17,0.5);line-height:1.4;text-transform:uppercase;letter-spacing:0.05em;">Reviewer Feedback</p>
    <p style="margin:8px 0 0 0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#111111;">{{reason}}</p>
  </div>`,
  "Edit Your Project",
  "{{project_url}}"
);

const TEMPLATE_NEW_COMMENT = wrapTemplate(
  "New Comment",
  "Someone commented on your post",
  `<p style="margin:0 0 16px 0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#111111;">
    Hey {{user_name}}, <strong>{{commenter_name}}</strong> left a comment on <strong>"{{project_title}}"</strong>:
  </p>
  <div style="background-color:#F5F3EE;padding:16px 20px;border-radius:8px;margin:0 0 16px 0;">
    <p style="margin:0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#111111;font-style:italic;">"{{comment_preview}}"</p>
  </div>`,
  "View Comment",
  "{{project_url}}"
);

const TEMPLATE_COMMENT_REPLY = wrapTemplate(
  "New Reply",
  "Someone replied to your comment",
  `<p style="margin:0 0 16px 0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#111111;">
    Hey {{user_name}}, <strong>{{replier_name}}</strong> replied to your comment on the {{target_label}} <strong>"{{target_title}}"</strong>:
  </p>
  <div style="background-color:#F5F3EE;padding:16px 20px;border-radius:8px;margin:0 0 16px 0;">
    <p style="margin:0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#111111;font-style:italic;">"{{comment_preview}}"</p>
  </div>`,
  "View Reply",
  "{{target_url}}"
);

const TEMPLATE_COMMENT_MENTION = wrapTemplate(
  "You Were Mentioned",
  "Someone mentioned you in a comment",
  `<p style="margin:0 0 16px 0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#111111;">
    Hey {{user_name}}, <strong>{{mentioner_name}}</strong> mentioned you in a comment on the {{target_label}} <strong>"{{target_title}}"</strong>:
  </p>
  <div style="background-color:#F5F3EE;padding:16px 20px;border-radius:8px;margin:0 0 16px 0;">
    <p style="margin:0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#111111;font-style:italic;">"{{comment_preview}}"</p>
  </div>`,
  "View Comment",
  "{{target_url}}"
);

const TEMPLATE_NEW_REACTION = wrapTemplate(
  "New {{reaction_type}}",
  "Your post is getting attention",
  `<p style="margin:0 0 16px 0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#111111;">
    Hey {{user_name}}, <strong>{{reactor_name}}</strong> {{reaction_type}} <strong>"{{project_title}}"</strong>. Keep up the great work!
  </p>`,
  "Check It Out",
  "{{project_url}}"
);

const TEMPLATE_EVENT_BROADCAST = wrapTemplate(
  "Event Update",
  "A message about {{event_title}}",
  `<p style="margin:0 0 16px 0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#111111;">
    Hey {{user_name}}, <strong>{{sender_name}}</strong> sent an update about <strong>"{{event_title}}"</strong>:
  </p>
  <div style="background-color:#F5F3EE;padding:16px 20px;border-radius:8px;margin:0 0 16px 0;">
    <p style="margin:0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#111111;">{{{body}}}</p>
  </div>`,
  "View Event",
  "{{event_url}}"
);

const TEMPLATE_EVENT_REMINDER = wrapTemplate(
  "Event Reminder",
  "Don't forget — an event is coming up",
  `<p style="margin:0 0 16px 0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#111111;">
    Hey {{user_name}}, just a reminder that <strong>"{{event_title}}"</strong> is coming up!
  </p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">
    <tr>
      <td style="padding:4px 0;font-family:'Space Mono',monospace;font-size:12px;color:rgba(17,17,17,0.5);width:80px;">Date</td>
      <td style="padding:4px 0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:14px;color:#111111;">{{event_date}}</td>
    </tr>
    <tr>
      <td style="padding:4px 0;font-family:'Space Mono',monospace;font-size:12px;color:rgba(17,17,17,0.5);width:80px;">Location</td>
      <td style="padding:4px 0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:14px;color:#111111;">{{event_location}}</td>
    </tr>
  </table>`,
  "View Event Details",
  "{{event_url}}"
);

const TEMPLATE_WELCOME_BACK = wrapTemplate(
  "We Miss You",
  "Here's what's new at Param Makerspace",
  `<p style="margin:0 0 16px 0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#111111;">
    Hey {{user_name}}, it's been a while! Here's what's been happening at Param Makerspace:
  </p>
  <p style="margin:0 0 8px 0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#111111;">Recent Projects</p>
  <ul style="margin:0 0 16px 0;padding-left:20px;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.8;color:#111111;">{{{recent_projects_html}}}</ul>
  <p style="margin:0 0 8px 0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#111111;">Upcoming Events</p>
  <ul style="margin:0 0 16px 0;padding-left:20px;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.8;color:#111111;">{{{upcoming_events_html}}}</ul>`,
  "Explore Makerspace",
  "{{site_url}}"
);
