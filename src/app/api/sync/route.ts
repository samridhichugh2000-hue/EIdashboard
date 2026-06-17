import { NextResponse } from "next/server";
import { forceSync } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await forceSync();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Force sync failed:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
