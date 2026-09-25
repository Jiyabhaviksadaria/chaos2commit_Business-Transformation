import { sendMail } from "@/lib/mail/mailer"
import { emailBase, escapeHtml } from "@/lib/mail/email-base"
import { getAppBaseUrl } from "@/lib/auth-tokens"

export async function sendPasswordResetEmail(
  name: string,
  email: string,
  rawToken: string
): Promise<boolean> {
  const appUrl = getAppBaseUrl()
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`
  const displayName = name || "there"
  const safeDisplayName = escapeHtml(displayName)
  const safeResetUrl = escapeHtml(resetUrl)

  const html = emailBase({
    title: "Reset your password — Intelly AI",
    preheader: "We received a request to reset your password. Click the link to proceed.",
    body: `
      <div class="pill">Password Reset</div>
      <h1>Reset your password</h1>
      <p>Hello ${safeDisplayName},</p>
      <p>We received a request to reset the password for your <strong>Intelly AI</strong> account. Click the button below to choose a new password.</p>
      <a href="${safeResetUrl}" class="btn">Reset Password</a>
      <hr class="divider" />
      <p class="small">This link expires in <strong>1 hour</strong> and can only be used once.</p>
      <p class="small">If the button above doesn't work, copy and paste this link into your browser:<br/>
        <a href="${safeResetUrl}" style="color:#1A1A1A;word-break:break-all;">${safeResetUrl}</a>
      </p>
      <p class="small">If you did not request a password reset, no changes were made to your account. You can safely ignore this email.</p>
    `,
  })

  const text = `
Hello ${displayName},

We received a request to reset your Intelly AI password.

Reset your password: ${resetUrl}

This link expires in 1 hour and can only be used once.

If you did not request a password reset, please ignore this email.
  `.trim()

  return sendMail({
    to: email,
    subject: "Reset your Intelly AI password",
    html,
    text,
  })
}
