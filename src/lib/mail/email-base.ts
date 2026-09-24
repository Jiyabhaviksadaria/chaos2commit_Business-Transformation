export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

/** Shared email HTML wrapper used across all templates. */
export function emailBase({
  title,
  preheader,
  body,
}: {
  title: string
  preheader: string
  body: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F5F2EC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1A1A1A; }
    .wrapper { width: 100%; background-color: #F5F2EC; padding: 40px 16px; }
    .card { max-width: 560px; margin: 0 auto; background-color: #FDFCF9; border: 1px solid #E8E3D9; border-radius: 20px; overflow: hidden; }
    .header { padding: 32px 40px 24px; border-bottom: 1px solid #E8E3D9; }
    .logo { font-size: 15px; font-weight: 800; color: #1A1A1A; letter-spacing: -0.3px; }
    .logo span { color: #888; font-weight: 400; }
    .content { padding: 32px 40px; }
    h1 { font-size: 22px; font-weight: 800; color: #1A1A1A; margin: 0 0 12px; letter-spacing: -0.4px; }
    p { font-size: 14px; line-height: 1.7; color: #4A4A4A; margin: 0 0 16px; }
    .btn { display: inline-block; background-color: #1A1A1A; color: #FFFFFF !important; text-decoration: none; padding: 14px 28px; border-radius: 100px; font-size: 14px; font-weight: 700; margin: 8px 0 24px; }
    .btn-success { background-color: #18181C; }
    .divider { border: none; border-top: 1px solid #E8E3D9; margin: 24px 0; }
    .small { font-size: 12px; color: #888; line-height: 1.6; }
    .footer { padding: 20px 40px; background-color: #F5F2EC; border-top: 1px solid #E8E3D9; text-align: center; }
    .footer p { font-size: 12px; color: #888; margin: 0; }
    .pill { display: inline-block; background-color: #FEE895; color: #1A1A1A; padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
  </style>
</head>
<body>
  <!-- preheader hidden text -->
  <span style="display:none;font-size:1px;color:#FDFCF9;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo">Intelly <span>AI</span></div>
      </div>
      <div class="content">
        ${body}
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Intelly AI. All rights reserved.</p>
        <p style="margin-top:4px;">If you did not request this email, you can safely ignore it.</p>
      </div>
    </div>
  </div>
</body>
</html>`
}
