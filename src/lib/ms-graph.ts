let cachedToken: { value: string; expiresAt: number } | null = null;

async function getGraphToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.value;

  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id:     process.env.MS_CLIENT_ID!,
        client_secret: process.env.MS_CLIENT_SECRET!,
        scope: "https://graph.microsoft.com/.default",
      }),
      cache: "no-store",
    }
  );

  if (!res.ok) throw new Error(`Graph token fetch failed: ${res.status}`);
  const data = await res.json();
  if (!data.access_token) throw new Error(`Graph token error: ${data.error_description ?? JSON.stringify(data)}`);

  cachedToken = { value: data.access_token, expiresAt: now + (data.expires_in ?? 3600) * 1000 };
  return cachedToken.value;
}

export async function sendMail(to: string[], subject: string, htmlBody: string): Promise<void> {
  const token = await getGraphToken();
  const fromEmail = process.env.MS_FROM_EMAIL!;

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromEmail)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "HTML", content: htmlBody },
          toRecipients: to.map((address) => ({ emailAddress: { address } })),
          from: { emailAddress: { address: fromEmail, name: "EI Dashboard · HR" } },
        },
        saveToSentItems: true,
      }),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph sendMail failed (${res.status}): ${err}`);
  }
}
