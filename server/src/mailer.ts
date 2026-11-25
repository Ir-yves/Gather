import nodemailer from 'nodemailer';
import { config } from './config.js';

export function isPasswordResetEmailConfigured(): boolean {
  return Boolean(config.SMTP_HOST.trim() && (config.SMTP_FROM.trim() || config.SMTP_USER.trim()));
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void> {
  const subject = 'Reset your gather. password';
  const text = [
    `Hi ${name},`,
    '',
    'Use the link below to set a new password for your gather. account. It expires in 30 minutes.',
    '',
    resetUrl,
    '',
    'If you did not request this, you can ignore this email.'
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1d2440">
      <p>Hi ${escapeHtml(name)},</p>
      <p>Use the link below to set a new password for your gather. account. It expires in 30 minutes.</p>
      <p><a href="${escapeHtml(resetUrl)}" style="color:#4a62ca;font-weight:bold">Set a new password</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    </div>
  `;

  if (!isPasswordResetEmailConfigured()) {
    // Local development preview. Production refuses to start this flow without SMTP.
    console.info('[password reset email preview]', { to, subject, resetUrl });
    return;
  }

  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE === 'true',
    auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } : undefined
  });
  await transport.sendMail({
    from: config.SMTP_FROM || config.SMTP_USER,
    to,
    subject,
    text,
    html
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character] ?? character);
}
