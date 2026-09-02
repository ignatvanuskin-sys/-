import nodemailer from "nodemailer";
import { decrypt } from "./crypto";
import { getBaseUrl } from "./utils";

export type MailboxConfig = {
  smtpHost: string;
  smtpPort: number;
  secure: boolean;
  login: string;
  passwordEncrypted: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string | null;
};

export function createTransporter(cfg: MailboxConfig) {
  const pass = decrypt(cfg.passwordEncrypted);
  return nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure: cfg.secure,
    auth: {
      user: cfg.login,
      pass,
    },
  });
}

export async function sendMail(opts: {
  mailbox: MailboxConfig;
  to: string;
  subject: string;
  html: string;
  text?: string;
  campaignId?: number;
  recipientId?: number;
}) {
  const transporter = createTransporter(opts.mailbox);
  const footerAddress = process.env.FOOTER_ADDRESS || "";
  const baseUrl = getBaseUrl();
  const unsubscribeUrl =
    opts.campaignId && opts.recipientId
      ? `${baseUrl}/api/unsubscribe?email=${encodeURIComponent(opts.to)}&c=${opts.campaignId}&r=${opts.recipientId}`
      : `${baseUrl}/api/unsubscribe?email=${encodeURIComponent(opts.to)}`;

  const htmlWithFooter = `${opts.html}<br/><br/><hr/><p style="font-size:12px;color:#888;">Чтобы отписаться, перейдите по ссылке: <a href="${unsubscribeUrl}">отписаться</a>${footerAddress ? `<br/>${footerAddress}` : ""}</p>`;

  const info = await transporter.sendMail({
    from: `"${opts.mailbox.fromName}" <${opts.mailbox.fromEmail}>`,
    to: opts.to,
    replyTo: opts.mailbox.replyTo || undefined,
    subject: opts.subject,
    html: htmlWithFooter,
    text: opts.text,
  });
  return info;
}

export async function verifyMailbox(cfg: MailboxConfig) {
  const transporter = createTransporter(cfg);
  await transporter.verify();
}
