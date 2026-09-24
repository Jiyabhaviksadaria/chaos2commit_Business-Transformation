import { sendMail } from "@/lib/mail/mailer"
import { emailBase, escapeHtml } from "@/lib/mail/email-base"

export async function sendDeploymentFailureEmail(
  name: string,
  email: string,
  appName: string,
  projectId: string
): Promise<boolean> {
  const appUrl = process.env.APP_URL || "http://localhost:3000"
  const projectUrl = `${appUrl}/projects/${projectId}`
  const displayName = name || "there"
  const safeDisplayName = escapeHtml(displayName)
  const safeAppName = escapeHtml(appName)
  const safeProjectUrl = escapeHtml(projectUrl)

  const html = emailBase({
    title: "Your deployment needs attention — Intelly AI",
    preheader: `The deployment for ${appName} could not be completed. Review the status in your platform.`,
    body: `
      <div class="pill" style="background:#FEE2E2;color:#991B1B;">Deployment Attention Required</div>
      <h1>Your deployment needs attention</h1>
      <p>Hello ${safeDisplayName},</p>
      <p>Unfortunately, the deployment for your application through Intelly AI could not be completed at this time.</p>
      <table style="width:100%;background:#F5F2EC;border-radius:12px;padding:16px;margin:0 0 20px;border:1px solid #E8E3D9;border-collapse:separate;border-spacing:0;">
        <tr><td style="padding:6px 0;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Application</td></tr>
        <tr><td style="padding:0;font-size:15px;font-weight:700;color:#1A1A1A;">${safeAppName}</td></tr>
      </table>
      <p>Please open the platform to review the deployment status and logs. You can retry the deployment from the project dashboard.</p>
      <a href="${safeProjectUrl}" class="btn">View Deployment</a>
      <hr class="divider" />
      <p class="small">If this issue persists, please check your deployment configuration or contact support.</p>
    `,
  })

  const text = `
Hello ${displayName},

Your deployment for "${appName}" could not be completed.

Review the deployment status: ${projectUrl}

Please open the platform to check the logs and retry if needed.
  `.trim()

  return sendMail({
    to: email,
    subject: `Your deployment through Intelly AI needs attention — ${appName}`,
    html,
    text,
  })
}
