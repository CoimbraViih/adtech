import { getCredentialField } from "@/lib/integrations/credentials";

type SendAlertEmailParams = {
  to: string;
  alertTitle: string;
  alertBody: string;
  workspaceName: string;
};

export async function sendAlertEmail(
  organizationId: string,
  {
    to,
    alertTitle,
    alertBody,
    workspaceName,
  }: SendAlertEmailParams
): Promise<void> {
  const apiKey = await getCredentialField(organizationId, "resend", "api_key", "RESEND_API_KEY");
  if (!apiKey) {
    console.warn("[automation] RESEND_API_KEY not set — skipping email");
    return;
  }

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#E8390E;margin:0 0 8px">${alertTitle}</h2>
      <p style="color:#374151;margin:0 0 16px">${alertBody}</p>
      <p style="color:#6B7280;font-size:12px">Workspace: ${workspaceName}</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/automation"
         style="display:inline-block;margin-top:16px;padding:10px 20px;background:#E8390E;color:#fff;border-radius:6px;text-decoration:none;font-size:14px">
        Ver Alertas
      </a>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "AdFlow Alertas <alerts@adflow.app>",
      to,
      subject: alertTitle,
      html,
    }),
  });

  if (!res.ok) {
    console.error("[email] send failed:", res.status);
    return;
  }
  console.info("[email] alert email queued");
}
