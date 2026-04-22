/**
 * Shared helper for all template-based notification emails.
 * Loads the template from DB settings (with fallback to defaults),
 * interpolates variables, and sends via the mailer.
 */

import { sendEmail } from '@/libs/email/mailer';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { DEFAULT_EMAILS } from '@/app/admin/settings/settings-defaults';
// Emails must always link to the production domain, never localhost.
export const BASE_URL = process.env.ROOT_DOMAIN
  ? `https://${process.env.ROOT_DOMAIN}`
  : (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://freewebsite.deal');

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

export async function getEmailTemplates(): Promise<Record<string, { subject: string; body: string }>> {
  const { data } = await supabaseAdminClient
    .from('app_settings' as any)
    .select('email_templates')
    .eq('id', 'singleton')
    .single();
  return (data as any)?.email_templates ?? {};
}

/**
 * Generate a magic-link URL that routes through our /auth/callback endpoint.
 * Extracts the raw token from Supabase's action_link and builds a server-side
 * verifiable URL (avoids the implicit-flow hash-fragment problem).
 */
export async function generateMagicLinkUrl(
  email: string,
  nextPath = '/dashboard'
): Promise<string | null> {
  try {
    const { data: linkData, error } = await supabaseAdminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (error || !linkData?.properties?.action_link) {
      console.error('[email] generateLink failed for', email, ':', error?.message, error?.status);
      return null;
    }
    // Extract the raw token from Supabase's action_link URL
    const actionUrl = new URL(linkData.properties.action_link);
    const token = actionUrl.searchParams.get('token');
    if (!token) {
      console.error('[email] No token found in action_link');
      return null;
    }
    return `${BASE_URL}/auth/callback?token=${encodeURIComponent(token)}&type=magiclink&next=${encodeURIComponent(nextPath)}`;
  } catch (err) {
    console.error('[email] Failed to generate magic link:', err);
    return null;
  }
}

/** Map of link display labels by variable name. */
const LINK_LABELS: Record<string, string> = {
  dashboard_link: 'Open Dashboard',
  onboarding_link: 'Open Dashboard',
  website_url: 'Visit Your Website',
  website_link: 'View Your Website',
};

/**
 * Convert plain-text email body to simple HTML.
 * - Escapes HTML entities
 * - Wraps known link URLs in styled anchor tags with friendly labels
 * - Converts bare URLs to clickable links
 * - Converts newlines to <br>
 */
function textToHtml(text: string, vars: Record<string, string>): string {
  // Escape HTML entities
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Replace known link URLs with styled buttons/links
  for (const [varName, label] of Object.entries(LINK_LABELS)) {
    const url = vars[varName];
    if (!url) continue;
    // Escape the URL for use in regex (it was already HTML-escaped above)
    const escapedUrl = url
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const escapedForRegex = escapedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match patterns like "Open dashboard: <url>" or just the bare URL
    const labelPattern = new RegExp(`[^\\n]*?:\\s*${escapedForRegex}`, 'g');
    const buttonHtml = `<a href="${url}" style="display:inline-block;padding:12px 24px;background-color:#4CAF50;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">${label}</a>`;
    if (labelPattern.test(html)) {
      html = html.replace(labelPattern, buttonHtml);
    } else {
      html = html.replace(new RegExp(escapedForRegex, 'g'), buttonHtml);
    }
  }

  // Convert any remaining bare URLs to clickable links
  html = html.replace(
    /(?<!href=")(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#4CAF50;">$1</a>'
  );

  // Convert newlines to <br>
  html = html.replace(/\n/g, '<br>');

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.6;color:#333;">${html}</div>`;
}

export async function sendNotification({
  templateKey,
  to,
  vars,
  logLabel,
}: {
  templateKey: keyof typeof DEFAULT_EMAILS;
  to: string;
  vars: Record<string, string>;
  logLabel?: string;
}): Promise<void> {
  const templates = await getEmailTemplates();
  const template = templates[templateKey] ?? DEFAULT_EMAILS[templateKey];
  if (!template) throw new Error(`Unknown email template: ${templateKey}`);

  const subject = interpolate(template.subject, vars);
  const text = interpolate(template.body, vars);
  const html = textToHtml(text, vars);

  await sendEmail({ to, subject, text, html });
  console.info(`[email] ${logLabel ?? templateKey} → ${to}`);
}
