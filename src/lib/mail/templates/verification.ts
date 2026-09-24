import { sendMail } from "@/lib/mail/mailer"
import { emailBase, escapeHtml } from "@/lib/mail/email-base"

export async function sendVerificationEmail(
  name: string,
  email: string,
  rawToken: string
): Promise<boolean> {
  const appUrl = process.env.APP_URL || "http://localhost:3000"
  // Construct the verification URL on the server — frontend never builds token URLs
  const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(rawToken)}`

  const displayName = name || "there"
  const safeDisplayName = escapeHtml(displayName)
  const safeVerifyUrl = escapeHtml(verifyUrl)

  const html = emailBase({
    title: "Verify your email — Intelly AI",
    preheader: "Click the button to verify your email address and activate your account.",
    body: `
      <div class="pill">Email Verification</div>
      <h1>Verify your email address</h1>
      <p>Hello ${safeDisplayName},</p>
      <p>Welcome to <strong>Intelly AI</strong>. To activate your account and start building, please verify your email address by clicking the button below.</p>
      <a href="${safeVerifyUrl}" class="btn">Verify Email</a>
      <hr class="divider" />
      <p class="small">This link expires in <strong>24 hours</strong> and can only be used once.</p>
      <p class="small">If the button above doesn't work, copy and paste this link into your browser:<br/>
        <a href="${safeVerifyUrl}" style="color:#1A1A1A;word-break:break-all;">${safeVerifyUrl}</a>
      </p>
      <p class="small">If you did not create an account, you can safely ignore this email.</p>
    `,
  })

  const text = `
Hello ${displayName},

Welcome to Intelly AI. Please verify your email address to activate your account.

Verify your email: ${verifyUrl}

This link expires in 24 hours and can only be used once.

If you did not create an account, please ignore this email.
  `.trim()

  return sendMail({
    to: email,
    subject: "Verify your Intelly AI account",
    html,
    text,
  })
}
