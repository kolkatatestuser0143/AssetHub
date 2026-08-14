import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly enabled: boolean;
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly appName: string;

  constructor() {
    this.enabled = String(process.env.MAIL_ENABLED ?? 'false').toLowerCase() === 'true';
    this.from = process.env.MAIL_FROM ?? process.env.SMTP_USER ?? '';
    this.appName = process.env.APP_NAME ?? 'AssetHub';

    if (!this.enabled) {
      this.transporter = null;
      return;
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const secure = String(process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true';

    if (!host || !user || !pass || !this.from) {
      throw new Error('MAIL_ENABLED=true requires SMTP_HOST, SMTP_USER, SMTP_PASSWORD and MAIL_FROM');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      requireTLS: !secure,
    });
  }

  isEnabled() {
    return this.enabled;
  }

  async sendTenantAccessEmail(input: {
    to: string;
    firstName: string;
    action: 'invite' | 'reset';
    setupUrl: string;
    expiresAt: Date;
  }) {
    if (!this.enabled || !this.transporter) {
      return { sent: false, disabled: true };
    }

    const title = input.action === 'invite' ? 'Your AssetHub account is ready' : 'Reset your AssetHub access';
    const intro = input.action === 'invite'
      ? 'A tenant administrator created an AssetHub account for you.'
      : 'A tenant administrator requested a new password setup for your AssetHub account.';

    const expires = input.expiresAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const text = [
      `Hello ${input.firstName},`,
      '',
      intro,
      '',
      `Use this secure link to set your password: ${input.setupUrl}`,
      '',
      `The link expires on ${expires} IST and can only be used once.`,
      '',
      'If you did not expect this message, contact your AssetHub administrator.',
      '',
      `— ${this.appName}`,
    ].join('\n');

    const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:32px;color:#0f172a"><div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px"><p style="font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#2563eb">${this.appName}</p><h1 style="font-size:24px;margin:8px 0 16px">${title}</h1><p style="font-size:15px;line-height:1.7;color:#475569">Hello ${this.escape(input.firstName)},</p><p style="font-size:15px;line-height:1.7;color:#475569">${this.escape(intro)}</p><p style="margin:28px 0"><a href="${this.escape(input.setupUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Set up password</a></p><p style="font-size:13px;line-height:1.6;color:#64748b">This secure link expires on ${this.escape(expires)} IST and can only be used once.</p><p style="font-size:13px;line-height:1.6;color:#64748b">If you did not expect this message, contact your AssetHub administrator.</p><p style="font-size:13px;color:#64748b;margin-top:28px">— ${this.escape(this.appName)}</p></div></body></html>`;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: input.to,
        subject: title,
        text,
        html,
      });
      return { sent: true, disabled: false };
    } catch {
      throw new ServiceUnavailableException('Invitation email could not be delivered. Please retry or use the generated setup link.');
    }
  }

  async sendLicenseExpiryEmail(input: {
    to: string;
    firstName: string;
    tenantName: string;
    planName: string;
    endsAt: Date;
    daysRemaining: number;
    expired: boolean;
  }) {
    if (!this.enabled || !this.transporter) return { sent: false, disabled: true };

    const subject = input.expired
      ? `AssetHub license expired — ${input.tenantName}`
      : `AssetHub license expires in ${input.daysRemaining} day${input.daysRemaining === 1 ? '' : 's'} — ${input.tenantName}`;
    const intro = input.expired
      ? `The AssetHub ${input.planName} license for ${input.tenantName} has expired.`
      : `The AssetHub ${input.planName} license for ${input.tenantName} expires in ${input.daysRemaining} day${input.daysRemaining === 1 ? '' : 's'}.`;
    const ends = input.endsAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const actionText = input.expired
      ? 'Please contact your AssetHub account administrator to renew the subscription.'
      : 'Please contact your AssetHub account administrator to renew the subscription before the expiry date.';

    const text = [
      `Hello ${input.firstName},`,
      '',
      intro,
      `Expiry: ${ends} IST`,
      '',
      actionText,
      '',
      'This notification was sent to a tenant user with billing access.',
      '',
      `— ${this.appName}`,
    ].join('\n');

    const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:32px;color:#0f172a"><div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px"><p style="font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#2563eb">${this.escape(this.appName)}</p><h1 style="font-size:24px;margin:8px 0 16px">${this.escape(subject)}</h1><p style="font-size:15px;line-height:1.7;color:#475569">Hello ${this.escape(input.firstName)},</p><p style="font-size:15px;line-height:1.7;color:#475569">${this.escape(intro)}</p><div style="background:#f8fafc;border-radius:12px;padding:16px;margin:20px 0"><p style="margin:0 0 8px;font-size:13px;color:#64748b">License expiry</p><p style="margin:0;font-weight:700">${this.escape(ends)} IST</p></div><p style="font-size:14px;line-height:1.7;color:#475569">${this.escape(actionText)}</p><p style="font-size:12px;line-height:1.6;color:#64748b;margin-top:24px">This notification was sent to a tenant user with billing access.</p><p style="font-size:13px;color:#64748b;margin-top:28px">— ${this.escape(this.appName)}</p></div></body></html>`;

    try {
      await this.transporter.sendMail({ from: this.from, to: input.to, subject, text, html });
      return { sent: true, disabled: false };
    } catch {
      throw new ServiceUnavailableException('License expiry notification could not be delivered.');
    }
  }

  private escape(value: string) {
    return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
  }
}
