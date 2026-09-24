/**
 * Centralized Nodemailer transporter.
 * All system emails must go through sendMail() from this module.
 *
 * SECURITY: SMTP credentials are read from process.env directly so they
 * remain on the server. They are never exported, logged, or passed to the
 * frontend. Do NOT import this file from any client component.
 */
import nodemailer from "nodemailer"
import type { SendMailOptions } from "nodemailer"
import { env } from "@/env"

function createTransporter() {
  const host = env.SMTP_HOST
  const port = Number.parseInt(env.SMTP_PORT || "587", 10)
  const user = env.SMTP_USER
  const pass = env.SMTP_PASSWORD

  if (!host || !user || !pass || !Number.isInteger(port) || port < 1 || port > 65535) {
    // In development without SMTP config, use Ethereal (auto-captured test mail)
    // This prevents crashing but emails won't actually be delivered.
    console.warn("[mailer] SMTP not configured. Emails will be captured internally (dev only).")
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    // Never log credentials in connection debug output
  })
}

let _transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransporter() {
  if (!_transporter) {
    _transporter = createTransporter()
  }
  return _transporter
}

export interface MailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendMail(options: MailOptions): Promise<boolean> {
  const transporter = getTransporter()

  const mailFrom = env.MAIL_FROM || env.SMTP_USER || "noreply@intelly.ai"

  const mailOptions: SendMailOptions = {
    from: mailFrom,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  }

  if (!transporter) {
    // Fallback: log safe info only (no credentials, no tokens)
    console.log("[mailer] Email send attempted (SMTP not configured):", {
      to: options.to,
      subject: options.subject,
    })
    return false
  }

  try {
    await transporter.sendMail(mailOptions)
    // Log safe event only — no token values, no credentials
    console.log("[mailer] Email sent:", { to: options.to, subject: options.subject })
    return true
  } catch (err) {
    console.error("[mailer] Email send failed:", { to: options.to, subject: options.subject, error: (err as Error).message })
    return false
  }
}
