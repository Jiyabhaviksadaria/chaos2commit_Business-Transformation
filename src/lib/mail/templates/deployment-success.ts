import { sendMail } from "@/lib/mail/mailer"
import { emailBase, escapeHtml } from "@/lib/mail/email-base"

export async function sendDeploymentSuccessEmail(
  name: string,
  email: string,
  appName: string,
  deploymentUrl: string
): Promise<boolean> {
  const displayName = name || "there"
  const safeDisplayName = escapeHtml(displayName)
  const safeAppName = escapeHtml(appName)
  const safeDeploymentUrl = escapeHtml(deploymentUrl)

  const html = emailBase({
    title: "Your application is live! — Intelly AI",
    preheader: `${appName} has been successfully deployed and is now live.`,
    body: `
      <div class="pill">🎉 Deployment Successful</div>
      <h1>Your application is live!</h1>
      <p>Hello ${safeDisplayName},</p>
      <p>Your application has been <strong>successfully deployed through Intelly AI</strong> and is live on the internet.</p>
      <table style="width:100%;background:#F5F2EC;border-radius:12px;padding:16px;margin:0 0 20px;border:1px solid #E8E3D9;border-collapse:separate;border-spacing:0;">
        <tr><td style="padding:6px 0;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Application</td></tr>
        <tr><td style="padding:0 0 12px;font-size:15px;font-weight:700;color:#1A1A1A;">${safeAppName}</td></tr>
        <tr><td style="padding:6px 0;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Deployment URL</td></tr>
        <tr><td style="padding:0;font-size:13px;color:#1A1A1A;word-break:break-all;"><a href="${safeDeploymentUrl}" style="color:#1A1A1A;">${safeDeploymentUrl}</a></td></tr>
      </table>
      <a href="${safeDeploymentUrl}" class="btn">Open Application</a>
      <hr class="divider" />
      <p class="small">Deployment completed successfully. Thank you for using Intelly AI.</p>
    `,
  })

  const text = `
Hello ${displayName},

Your application "${appName}" has been successfully deployed through Intelly AI!

Open your application: ${deploymentUrl}

Thank you for using Intelly AI.
  `.trim()

  return sendMail({
    to: email,
    subject: `Your application has been deployed successfully through Intelly AI 🎉`,
    html,
    text,
  })
}
