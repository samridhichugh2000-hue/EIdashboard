import { NextResponse } from "next/server";

const BASE_URL = "https://api.koenig-solutions.com";

export const dynamic = "force-dynamic";

async function getToken() {
  const res = await fetch(`${BASE_URL}/api/Kites/Operator/GetToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userName: "Samridhi_GetTrainerSkill",
      userPassword: "AYZTd73aeC!M",
      userRole: "Get Trainer Skills",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GetToken failed: ${res.status}`);
  const d = await res.json();
  if (d.statuscode !== 200) throw new Error(`GetToken error: ${JSON.stringify(d)}`);
  return { accessToken: d.content.accessToken, deviceToken: d.content.deviceToken };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bodyParam = searchParams.get("body") ?? "{}"; // e.g. ?body={"emp_code":4006}

  try {
    const { accessToken, deviceToken } = await getToken();
    const encodedToken = encodeURIComponent(accessToken);
    const url = `${BASE_URL}/api/Kites/Operator/common?apikey=217&accessToken=${encodedToken}&deviceToken=${deviceToken}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyParam,
      cache: "no-store",
    });

    const rawText = await res.text();
    let parsed: unknown;
    try { parsed = JSON.parse(rawText); } catch { parsed = rawText; }

    return NextResponse.json({
      http_status: res.status,
      raw_response: parsed,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
