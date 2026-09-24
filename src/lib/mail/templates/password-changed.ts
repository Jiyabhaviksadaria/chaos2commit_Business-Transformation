import { sendMail } from "@/lib/mail/mailer"
import { emailBase, escapeHtml } from "@/lib/mail/email-base"

export async function sendPasswordChangedEmail(
  name: string,
  email: string
): Promise<boolean> {
  const appUrl = process.env.APP_URL || "http://localhost:3000"
  const loginUrl = `${appUrl}/login`
  const displayName = name || "there"
  const safeDisplayName = escapeHtml(displayName)
  const safeLoginUrl = escapeHtml(loginUrl)

  const html = emailBase({
    title: "Password changed — Intelly AI",
    preheader: "Your Intelly AI password was changed successfully.",
    body: `
      <div class="pill">Security Notice</div>
      <h1>Password changed successfully</h1>
      <p>Hello ${safeDisplayName},</p>
      <p>Your <strong>Intelly AI</strong> password was successfully changed.</p>
      <p>You can now sign in with your new password.</p>
      <a href="${safeLoginUrl}" class="btn">Sign In</a>
      <hr class="divider" />
      <p class="small">If you did not make this change, please contact support immediately and reset your password.</p>
    `,
  })

  const text = `
Hello ${displayName},

Your Intelly AI password was successfully changed.

You can sign in at: ${loginUrl}

If you did not make this change, please reset your password immediately.
  `.trim()

  return sendMail({
    to: email,
    subject: "Your password has been changed — Intelly AI",
    html,
    text,
  })
}
