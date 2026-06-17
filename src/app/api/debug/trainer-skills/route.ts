import { NextResponse } from "next/server";
import { fetchTrainerSkillData } from "@/lib/rms-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = await fetchTrainerSkillData();
    const sample = raw.slice(0, 10);
    const keys = raw.length > 0 ? Object.keys(raw[0]) : [];
    return NextResponse.json({
      total: raw.length,
      keys,
      sample,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
