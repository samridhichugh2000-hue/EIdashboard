import { NextResponse } from "next/server";
import { getAuthTokens } from "@/lib/rms-auth";

const BASE_URL = "https://api.koenig-solutions.com";

export const dynamic = "force-dynamic";

async function getSkillToken() {
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
  if (!res.ok) throw new Error(`GetToken (skill) failed: ${res.status}`);
  const d = await res.json();
  if (d.statuscode !== 200) throw new Error(`GetToken (skill) error: ${JSON.stringify(d)}`);
  return { accessToken: d.content.accessToken, deviceToken: d.content.deviceToken };
}

async function callApi(accessToken: string, deviceToken: string, body: string) {
  const encodedToken = encodeURIComponent(accessToken);
  const url = `${BASE_URL}/api/Kites/Operator/common?apikey=217&accessToken=${encodedToken}&deviceToken=${deviceToken}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });
  const rawText = await res.text();
  let parsed: unknown;
  try { parsed = JSON.parse(rawText); } catch { parsed = rawText; }
  return { http_status: res.status, raw_response: parsed };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bodyParam = searchParams.get("body") ?? "{}";

  try {
    // Try 1: dedicated skill token
    const skillTokens = await getSkillToken();
    const withSkillToken = await callApi(skillTokens.accessToken, skillTokens.deviceToken, bodyParam);

    // Try 2: main auth token (Sakshipandey — worked for assignments)
    const mainTokens = await getAuthTokens();
    const withMainToken = await callApi(mainTokens.accessToken, mainTokens.deviceToken, bodyParam);

    return NextResponse.json({ withSkillToken, withMainToken });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
