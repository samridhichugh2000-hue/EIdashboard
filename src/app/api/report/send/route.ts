import { NextResponse } from "next/server";
import { getEmployees } from "@/lib/data";
import { fetchIncidentData, RawIncidentRecord } from "@/lib/rms-auth";
import { sendMail } from "@/lib/ms-graph";
import { Employee } from "@/types/employee";
import { getFeedbackQuality } from "@/lib/utils";

// ── HTML email helpers (inline styles — email-client safe) ─────────────────

const C = {
  teal:   "#1E99C0",
  tealBg: "#e6f7f5",
  red:    "#dc2626",
  amber:  "#d97706",
  green:  "#16a34a",
  gray:   "#6b7280",
  row0:   "#ffffff",
  row1:   "#f8fafc",
};

function th(text: string, align = "left") {
  return `<th style="padding:6px 8px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#fff;text-align:${align};background:${C.teal};white-space:nowrap;">${text}</th>`;
}
function td(content: string, align = "left", bold = false) {
  return `<td style="padding:5px 8px;font-size:11px;vertical-align:top;text-align:${align};${bold ? "font-weight:600;" : ""}color:#374151;">${content}</td>`;
}

function badge(text: string, color: string, bg: string) {
  return `<span style="display:inline-block;padding:1px 6px;border-radius:9999px;font-size:10px;font-weight:600;color:${color};background:${bg};">${text}</span>`;
}

function fmtNR(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000)   return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${abs}`;
}

function fbCell(entry: Employee["feedback"]["d30"], tenureDays: number, threshold: number): string {
  if (!entry) {
    if (tenureDays >= threshold) return `<span style="color:${C.red};font-weight:600;">Pending</span>`;
    return `<span style="color:#d1d5db;">—</span>`;
  }
  const quality = getFeedbackQuality(entry);
  const bg    = quality === "below" ? "#fef2f2"   : quality === "above" ? "#ecfdf5" : "#f0fdf4";
  const color = quality === "below" ? C.red       : quality === "above" ? "#059669" : C.green;
  const label = quality === "below" ? "Below Satisfactory" : quality === "above" ? "Above Satisfactory" : "Satisfactory";
  return `<div style="min-width:160px;background:${bg};border-radius:4px;padding:4px 6px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
      <span style="font-size:9px;color:#9ca3af;">${entry.postedOn}</span>
      <span style="font-size:9px;font-weight:700;color:${color};">${label}</span>
    </div>
    <div style="font-size:10px;color:#374151;line-height:1.4;word-wrap:break-word;white-space:pre-wrap;">${entry.comment || "—"}</div>
  </div>`;
}

function nrCell(entry: Employee["nrData"][0] | undefined): string {
  if (!entry) return `<span style="color:#d1d5db;">—</span>`;
  return `<span style="color:${entry.val < 0 ? C.red : "#111827"}">${entry.month}<br/>${fmtNR(entry.val)}</span>`;
}

function utilCell(entry: Employee["utilization"][0] | undefined): string {
  if (!entry) return `<span style="color:#d1d5db;">—</span>`;
  const color = entry.val >= 70 ? C.green : entry.val >= 40 ? C.amber : C.red;
  return `<span style="color:${color}">${entry.month}<br/>${entry.val.toFixed(1)}%</span>`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtIncDate(dateStr: string): string {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function incidentCell(incidents: RawIncidentRecord[]): string {
  if (!incidents.length) return `<span style="color:#d1d5db;">—</span>`;
  return `<div style="min-width:160px;">${
    incidents.map(inc => {
      const pos = inc.IncidentType === "Positive Incident";
      return `<div style="margin-bottom:6px;">
        <div style="font-size:9px;color:#9ca3af;">${fmtIncDate(inc.IncidentDate)}</div>
        <div style="font-size:10px;font-weight:600;color:${pos ? C.green : C.red};line-height:1.4;">${pos ? "+" : "−"} ${inc.Reason}</div>
      </div>`;
    }).join("")
  }</div>`;
}

function statusBadge(status: string): string {
  if (status === "PA Issued")  return badge(status, C.amber, "#fef3c7");
  if (status === "PIP Issued") return badge(status, C.red,   "#fee2e2");
  if (status === "Confirmed")  return badge(status, C.green, "#dcfce7");
  return badge(status, C.teal, C.tealBg);
}

function pipCell(emp: Employee): string {
  if (!emp.pipStatus) return `<span style="color:${C.gray}">None</span>`;
  const isP = emp.pipStatus.type === "PIP";
  const bg = isP ? "#fee2e2" : "#fef3c7";
  const color = isP ? C.red : C.amber;
  return `<div style="min-width:110px;">
    ${badge(emp.pipStatus.type, color, bg)}
    ${emp.pipStatus.issuedDate ? `<div style="font-size:9px;color:#6b7280;margin-top:3px;">From: ${emp.pipStatus.issuedDate}</div>` : ""}
    ${emp.pipStatus.endDate    ? `<div style="font-size:9px;color:#6b7280;">To: ${emp.pipStatus.endDate}</div>` : ""}
  </div>`;
}

// ── table renderers ────────────────────────────────────────────────────────

function empPriority(emp: Employee): 0 | 1 | 2 | 3 {
  if (emp.finalStatus === "Confirmed") return 3;
  const hasBelow = [emp.feedback.d30, emp.feedback.d60, emp.feedback.d90]
    .filter(Boolean).some(e => getFeedbackQuality(e!) === "below");
  if (hasBelow) return 0;
  if (emp.pipStatus !== null) return 1;
  return 2;
}

function sortByPriority(list: Employee[]): Employee[] {
  return [...list].sort((a, b) => empPriority(a) - empPriority(b));
}

function commonRow(emp: Employee, incidents: RawIncidentRecord[], i: number, extraCells: string): string {
  const p  = empPriority(emp);
  const bg = p === 0 ? "#fff5f5"
           : p === 1 ? "#fffbeb"
           : p === 3 ? "#f3f4f6"
           : i % 2 === 0 ? C.row0 : C.row1;
  return `
  <tr style="background:${bg};">
    ${td(`<span style="font-family:monospace;font-size:10px;">${emp.employeeId}</span>`)}
    ${td(emp.name, "left", true)}
    ${td(emp.department || "—")}
    ${td(emp.reportingManager)}
    ${td(formatDate(emp.doj))}
    ${td(`${emp.tenureDays}d`, "center")}
    ${td(pipCell(emp))}
    ${td(incidentCell(incidents))}
    ${td(fbCell(emp.feedback.d30, emp.tenureDays, 30))}
    ${td(fbCell(emp.feedback.d60, emp.tenureDays, 60))}
    ${td(fbCell(emp.feedback.d90, emp.tenureDays, 90))}
    ${extraCells}
    ${td(statusBadge(emp.finalStatus), "center")}
    ${td(emp.hrRemarks ? `<em style="color:#374151;">${emp.hrRemarks}</em>` : `<span style="color:#d1d5db;">—</span>`)}
    ${td(emp.finalStatus === "Confirmed" ? badge("Yes", C.green, "#dcfce7") : badge("No", C.gray, "#f3f4f6"), "center")}
  </tr>`;
}

function salesHeaders(): string {
  return `<tr>${th("Emp ID")}${th("Name")}${th("Department")}${th("Manager")}${th("DOJ")}${th("Tenure","center")}${th("PA/PIP","center")}${th("Incidents","center")}${th("30d FB","center")}${th("60d FB","center")}${th("90d FB","center")}${th("NR M1","right")}${th("NR M2","right")}${th("NR M3","right")}${th("Final Status","center")}${th("HR Remarks")}${th("Closed","center")}</tr>`;
}
function trainerHeaders(): string {
  return `<tr>${th("Emp ID")}${th("Name")}${th("Department")}${th("Manager")}${th("DOJ")}${th("Tenure","center")}${th("PA/PIP","center")}${th("Incidents","center")}${th("30d FB","center")}${th("60d FB","center")}${th("90d FB","center")}${th("Util M1","right")}${th("Util M2","right")}${th("Util M3","right")}${th("Final Status","center")}${th("HR Remarks")}${th("Closed","center")}</tr>`;
}
function ptHeaders(): string {
  return `<tr>${th("Emp ID")}${th("Name")}${th("Department")}${th("Manager")}${th("DOJ")}${th("Tenure","center")}${th("PA/PIP","center")}${th("Incidents","center")}${th("30d FB","center")}${th("60d FB","center")}${th("90d FB","center")}${th("Final Status","center")}${th("HR Remarks")}${th("Closed","center")}</tr>`;
}

function section(title: string, headers: string, rows: string): string {
  if (!rows) return "";
  return `
  <h3 style="font-size:13px;font-weight:700;color:#111827;margin:28px 0 8px;">${title}</h3>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
    <thead>${headers}</thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildEmailHtml(
  reportPool: Employee[],
  incidentMap: Map<string, RawIncidentRecord[]>,
  today: string
): string {
  const sales   = sortByPriority(reportPool.filter(e => e.category === "sales"));
  const trainer = sortByPriority(reportPool.filter(e => e.category === "trainer"));
  const pt      = sortByPriority(reportPool.filter(e => e.category === "pt"));

  const salesRows   = sales.map((e, i) => commonRow(e, incidentMap.get(e.employeeId) ?? [], i, `${td(nrCell(e.nrData[0]), "right")}${td(nrCell(e.nrData[1]), "right")}${td(nrCell(e.nrData[2]), "right")}`)).join("");
  const trainerRows = trainer.map((e, i) => commonRow(e, incidentMap.get(e.employeeId) ?? [], i, `${td(utilCell(e.utilization[0]), "right")}${td(utilCell(e.utilization[1]), "right")}${td(utilCell(e.utilization[2]), "right")}`)).join("");
  const ptRows      = pt.map((e, i) => commonRow(e, incidentMap.get(e.employeeId) ?? [], i, "")).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<div style="max-width:1200px;margin:0 auto;padding:24px;">

  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.teal};border-radius:12px 12px 0 0;">
    <tr>
      <td style="padding:20px 24px;">
        <p style="margin:0 0 2px;font-size:10px;font-weight:600;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.1em;">Koenig Solutions · Extended Interview</p>
        <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;">15-Day Performance Report</h1>
      </td>
      <td style="padding:20px 24px;text-align:right;vertical-align:middle;">
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,.7);">Generated: ${today}</p>
      </td>
    </tr>
  </table>

  <!-- Summary strip -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
    <tr>
      ${[
        { label: "Total", val: reportPool.length, bg: C.tealBg, color: C.teal },
        { label: "Sales",        val: sales.length,  bg: "#eff6ff", color: "#1d4ed8" },
        { label: "Trainer",      val: trainer.length, bg: "#f5f3ff", color: "#7c3aed" },
        { label: "PT Team",      val: pt.length,      bg: "#fffbeb", color: "#b45309" },
      ].map(s => `<td style="padding:16px 20px;border-right:1px solid #f0f0f0;background:${s.bg};text-align:center;">
        <p style="margin:0 0 2px;font-size:10px;color:${s.color};font-weight:600;">${s.label}</p>
        <p style="margin:0;font-size:24px;font-weight:700;color:${s.color};">${s.val}</p>
      </td>`).join("")}
    </tr>
  </table>

  <!-- Content -->
  <div style="background:#fff;padding:16px 24px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    ${section("Sales Team", salesHeaders(), salesRows)}
    ${section("Trainer Team", trainerHeaders(), trainerRows)}
    ${section("PT Team", ptHeaders(), ptRows)}
  </div>

  <!-- Footer -->
  <p style="text-align:center;font-size:10px;color:#9ca3af;margin-top:16px;">EI Dashboard · Koenig Solutions · Auto-generated report</p>
</div>
</body>
</html>`;
}

// ── route handler ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: { to: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const to = (body.to ?? []).map((s: string) => s.trim()).filter(Boolean);
  if (to.length === 0) {
    return NextResponse.json({ success: false, error: "At least one recipient required" }, { status: 400 });
  }

  const allEmployees = await getEmployees().catch(() => [] as Employee[]);
  const reportPool = allEmployees.filter(e => e.tenureDays >= 30);

  const incidentResults = await Promise.allSettled(
    reportPool.map(e =>
      fetchIncidentData(parseInt(e.employeeId.replace(/\D/g, ""), 10)).catch(() => [] as RawIncidentRecord[])
    )
  );
  const incidentMap = new Map<string, RawIncidentRecord[]>();
  reportPool.forEach((e, i) => {
    const r = incidentResults[i];
    incidentMap.set(e.employeeId, r.status === "fulfilled" ? r.value : []);
  });

  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const subject = `EI Dashboard — 15-Day Performance Report (${today})`;
  const html = buildEmailHtml(reportPool, incidentMap, today);

  try {
    await sendMail(to, subject, html);
  } catch (err) {
    console.warn("sendMail error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 502 });
  }

  return NextResponse.json({ success: true, sent: to.length });
}
