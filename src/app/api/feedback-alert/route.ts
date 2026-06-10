import { NextResponse } from "next/server";
import { lookupUserEmail, sendMail } from "@/lib/ms-graph";
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
    .map(m => `<li style="margin-bottom:4px;">• <strong>${m} review</strong> — feedback not yet submitted</li>`)
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

  // Look up manager's email via Microsoft Graph
  const managerEmail = await lookupUserEmail(managerName).catch(() => null);
  if (!managerEmail) {
    return NextResponse.json(
      { success: false, error: `Could not find email for manager "${managerName}" in the directory.` },
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
