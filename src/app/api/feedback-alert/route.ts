import { NextResponse } from "next/server";
import { sendMail } from "@/lib/ms-graph";
import { getManagerEmail } from "@/lib/manager-emails";
import { formatDate } from "@/lib/utils";

interface AlertBody {
  employeeId:        string;
  employeeName:      string;
  managerName:       string;
  doj:               string;
  tenureDays:        number;
  missingMilestones: string[]; // e.g. ["30-day", "60-day"]
}

function buildAlertHtml(body: AlertBody, managerFirstName: string): string {
  const milestoneRows = body.missingMilestones
    .map(m => `<li style="margin-bottom:4px;">• <strong>${m.replace("-d", "-D")} Extended Interview</strong> — feedback not yet submitted</li>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

  <!-- Header -->
  <div style="background:#1E99C0;padding:24px;">
    <p style="margin:0 0 2px;font-size:10px;font-weight:600;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.1em;">
      Koenig Solutions · Extended Interview
    </p>
    <h1 style="margin:0;font-size:18px;font-weight:700;color:#fff;">Feedback Submission Reminder</h1>
  </div>

  <!-- Body -->
  <div style="padding:24px;">
    <p style="margin:0 0 16px;font-size:14px;color:#374151;">Hi ${managerFirstName},</p>

    <p style="margin:0 0 16px;font-size:14px;color:#374151;">
      This is a reminder that the following feedback milestones are pending for
      <strong>${body.employeeName}</strong> (${body.employeeId}):
    </p>

    <ul style="margin:0 0 16px;padding:0;list-style:none;background:#fef9f0;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;">
      ${milestoneRows}
    </ul>

    <table style="width:100%;font-size:13px;color:#374151;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="padding:4px 0;color:#6b7280;">Employee</td>
        <td style="padding:4px 0;font-weight:600;">${body.employeeName}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#6b7280;">Employee ID</td>
        <td style="padding:4px 0;">${body.employeeId}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#6b7280;">Date of Joining</td>
        <td style="padding:4px 0;">${formatDate(body.doj)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#6b7280;">Tenure</td>
        <td style="padding:4px 0;">${body.tenureDays} days</td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:14px;color:#374151;">
      Please submit the feedback via RMS at the earliest.
    </p>

    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">
      This is an automated reminder from the EI Dashboard · HR Team, Koenig Solutions.
    </p>
  </div>
</div>
</body>
</html>`;
}

// GET /api/feedback-alert/preview?employeeId=&employeeName=&managerName=&doj=&tenureDays=&milestones=30-day,60-day
// Returns the rendered email HTML so it can be previewed in a new tab.
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const body: AlertBody = {
    employeeId:        p.get("employeeId")   ?? "",
    employeeName:      p.get("employeeName") ?? "",
    managerName:       p.get("managerName")  ?? "",
    doj:               p.get("doj")          ?? "",
    tenureDays:        parseInt(p.get("tenureDays") ?? "0"),
    missingMilestones: (p.get("milestones") ?? "").split(",").filter(Boolean),
  };
  const managerFirstName = body.managerName.split(" ")[0] || "Manager";
  const html = buildAlertHtml(body, managerFirstName);

  // Wrap with a preview banner so it's clear this is a draft
  const wrapped = html.replace(
    "<body",
    `<body`
  ).replace(
    `<div style="max-width:560px;`,
    `<div style="max-width:560px;margin-top:0;`
  ).replace(
    "</body>",
    `</body>`
  );

  const preview = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { margin: 0; font-family: Arial, sans-serif; background: #f3f4f6; }
  .banner { background: #1f2937; color: #fff; text-align: center; padding: 10px 16px; font-size: 12px; }
  .banner strong { color: #28C5BE; }
</style>
</head>
<body>
  <div class="banner">📧 <strong>Email Preview</strong> — This is a draft. Nothing has been sent yet.</div>
  ${wrapped.replace(/^<!DOCTYPE html>[\s\S]*?<body[^>]*>/, "").replace(/<\/body>[\s\S]*$/, "")}
</body></html>`;

  return new Response(preview, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function POST(request: Request) {
  let body: AlertBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const { employeeName, managerName, missingMilestones } = body;
  if (!employeeName || !managerName || !missingMilestones?.length) {
    return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
  }

  // Resolve manager email from the configured mapping (Graph directory read is
  // not permitted for this app, so we rely on src/lib/manager-emails.ts).
  const managerEmail = getManagerEmail(managerName);
  if (!managerEmail) {
    return NextResponse.json(
      { success: false, error: `No email on file for manager "${managerName}". Add it to src/lib/manager-emails.ts.` },
      { status: 404 }
    );
  }

  const managerFirstName = managerName.split(" ")[0];
  const subject = `Feedback Reminder — ${employeeName} (${missingMilestones.join(", ")})`;
  const html = buildAlertHtml(body, managerFirstName);

  try {
    await sendMail([managerEmail], subject, html);
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 502 });
  }

  return NextResponse.json({ success: true, sentTo: managerEmail });
}
