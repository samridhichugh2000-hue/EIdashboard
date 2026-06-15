import { NextResponse } from "next/server";
import { sendMail } from "@/lib/ms-graph";
import { getManagerEmail } from "@/lib/manager-emails";
import { formatDate } from "@/lib/utils";

interface ClarificationBody {
  employeeId:    string;
  employeeName:  string;
  managerName:   string;
  doj:           string;
  tenureDays:    number;
  milestone:     string;   // e.g. "30-Day"
  feedbackText:  string;
  postedOn:      string;
}

function milestoneLabel(m: string) {
  return `${m} Extended Interview`;
}

function buildClarificationHtml(body: ClarificationBody, managerFirstName: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<div style="max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

  <!-- Header -->
  <div style="background:#dc2626;padding:24px;">
    <p style="margin:0 0 2px;font-size:10px;font-weight:600;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.1em;">
      Koenig Solutions · Extended Interview · HR Action Required
    </p>
    <h1 style="margin:0;font-size:18px;font-weight:700;color:#fff;">
      Feedback Clarification Request
    </h1>
  </div>

  <!-- Body -->
  <div style="padding:24px;">
    <p style="margin:0 0 16px;font-size:14px;color:#374151;">Hi ${managerFirstName},</p>

    <p style="margin:0 0 16px;font-size:14px;color:#374151;">
      The <strong>${milestoneLabel(body.milestone)}</strong> feedback for
      <strong>${body.employeeName}</strong> (${body.employeeId}) has been recorded as
      <span style="color:#dc2626;font-weight:700;">Below Satisfactory</span>.
    </p>

    <p style="margin:0 0 16px;font-size:14px;color:#374151;">
      To ensure the employee's performance is being properly tracked and supported, HR would like to
      understand the specific reasons behind this rating before any further action is taken.
    </p>

    <!-- Feedback block -->
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
      <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:.05em;">
        Feedback Recorded — ${body.milestone} · ${body.postedOn}
      </p>
      <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">${body.feedbackText}</p>
    </div>

    <!-- Employee details -->
    <table style="width:100%;font-size:12px;color:#374151;border-collapse:collapse;margin-bottom:20px;background:#f9fafb;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:6px 12px;color:#6b7280;width:40%;">Employee</td>
        <td style="padding:6px 12px;font-weight:600;">${body.employeeName}</td>
      </tr>
      <tr style="background:#fff;">
        <td style="padding:6px 12px;color:#6b7280;">Employee ID</td>
        <td style="padding:6px 12px;">${body.employeeId}</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;color:#6b7280;">Date of Joining</td>
        <td style="padding:6px 12px;">${formatDate(body.doj)}</td>
      </tr>
      <tr style="background:#fff;">
        <td style="padding:6px 12px;color:#6b7280;">Tenure</td>
        <td style="padding:6px 12px;">${body.tenureDays} days</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;color:#6b7280;">Milestone</td>
        <td style="padding:6px 12px;font-weight:600;color:#dc2626;">${milestoneLabel(body.milestone)}</td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:14px;color:#374151;">
      Please reply to this email at your earliest convenience.
    </p>

    <p style="margin:20px 0 0;font-size:11px;color:#9ca3af;">
      This is an automated request from the EI Dashboard · HR Team, Koenig Solutions.
    </p>
  </div>
</div>
</body>
</html>`;
}

export async function POST(request: Request) {
  let body: ClarificationBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const { employeeName, managerName, milestone, feedbackText } = body;
  if (!employeeName || !managerName || !milestone || !feedbackText) {
    return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
  }

  const managerEmail = getManagerEmail(managerName);
  if (!managerEmail) {
    return NextResponse.json(
      { success: false, error: `No email on file for manager "${managerName}". Add it to src/lib/manager-emails.ts.` },
      { status: 404 }
    );
  }

  const managerFirstName = managerName.split(" ")[0];
  const subject = `Feedback Clarification Required — ${employeeName} (${milestone} Extended Interview)`;
  const html = buildClarificationHtml(body, managerFirstName);

  try {
    await sendMail([managerEmail], subject, html);
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 502 });
  }

  return NextResponse.json({ success: true, sentTo: managerEmail });
}

// GET preview
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const body: ClarificationBody = {
    employeeId:   p.get("employeeId")   ?? "",
    employeeName: p.get("employeeName") ?? "",
    managerName:  p.get("managerName")  ?? "",
    doj:          p.get("doj")          ?? "",
    tenureDays:   parseInt(p.get("tenureDays") ?? "0"),
    milestone:    p.get("milestone")    ?? "",
    feedbackText: p.get("feedbackText") ?? "",
    postedOn:     p.get("postedOn")     ?? "",
  };
  const managerFirstName = body.managerName.split(" ")[0] || "Manager";
  const html = buildClarificationHtml(body, managerFirstName);

  const preview = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { margin: 0; font-family: Arial, sans-serif; background: #f3f4f6; }
  .banner { background: #1f2937; color: #fff; text-align: center; padding: 10px 16px; font-size: 12px; }
  .banner strong { color: #f87171; }
</style>
</head>
<body>
  <div class="banner">📧 <strong>Email Preview</strong> — This is a draft. Nothing has been sent yet.</div>
  ${html.replace(/^<!DOCTYPE html>[\s\S]*?<body[^>]*>/, "").replace(/<\/body>[\s\S]*$/, "")}
</body></html>`;

  return new Response(preview, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
