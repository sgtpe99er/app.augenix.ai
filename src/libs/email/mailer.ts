/**
 * Email Mailer — powered by Forward Email (SMTP)
 *
 * Single abstraction for all outbound email in the app.
 * Requires: FORWARDEMAIL_SMTP_USER, FORWARDEMAIL_SMTP_PASS
 */

import nodemailer from 'nodemailer';

export interface MailOptions {
  to: string | string[];
  subject: string;
  /** Plain-text body */
  text?: string;
  /** HTML body (optional — falls back to text) */
  html?: string;
  /** Override the from address. Defaults to FORWARDEMAIL_SMTP_USER env var. */
  from?: string;
  replyTo?: string;
}

const transporter = nodemailer.createTransport({
  host: 'smtp.forwardemail.net',
  port: 465,
  secure: true,
  auth: {
    user: process.env.FORWARDEMAIL_SMTP_USER,
    pass: process.env.FORWARDEMAIL_SMTP_PASS,
  },
});

const DEFAULT_FROM = process.env.FORWARDEMAIL_SMTP_USER ?? 'noreply@freewebsite.deal';

export async function sendEmail(options: MailOptions): Promise<void> {
  const from = options.from ?? DEFAULT_FROM;

  await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    ...(options.html ? { html: options.html } : {}),
    ...(options.text ? { text: options.text } : {}),
  });

  const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  console.info(`[mailer] Sent "${options.subject}" → ${to}`);
}
