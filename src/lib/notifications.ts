/**
 * Notification email helper — calls the send-notification-email Edge Function.
 *
 * This is a fire-and-forget helper: it never throws or blocks the calling UI.
 * If the Edge Function is down or the email fails, the user action (comment,
 * like, approval) still succeeds — the notification is just silently skipped.
 */

import { supabase } from './supabase';

export type NotificationEmailType =
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

/**
 * Send a notification email via the Edge Function.
 * Fire-and-forget — never throws, never blocks.
 */
export async function sendNotificationEmail(
  type: NotificationEmailType,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: responseData, error } = await supabase.functions.invoke(
      'send-notification-email',
      { body: { type, data } },
    );

    if (error) {
      console.warn('[notifications] Edge Function returned error:', error);
      return;
    }

    if (responseData) {
      console.info('[notifications] Email result:', responseData);
    }
  } catch (err) {
    // Network-level failure (timeout, DNS, CORS, etc.)
    console.warn('[notifications] Failed to invoke Edge Function:', err);
  }
}
