import { NextResponse } from "next/server";
import { getEmployees } from "@/lib/data";
import { fetchIncidentData, RawIncidentRecord } from "@/lib/rms-auth";
import { sendMail } from "@/lib/ms-graph";
import { Employee } from "@/types/employee";

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

function fbCell(received: boolean, tenureDays: number, threshold: number): string {
  if (received) return `<span style="color:${C.green};font-weight:600;">✓ Received</span>`;
  if (tenureDays >= threshold) return `<span style="color:${C.red};font-weight:600;">Pending</span>`;
  return `<span style="color:#d1d5db;">—</span>`;
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

function incidentSummary(incidents: RawIncidentRecord[]): string {
  if (!incidents.length) return "—";
  const pos = incidents.filter(x => x.IncidentType === "Positive Incident").length;
  const neg = incidents.filter(x => x.IncidentType === "Negative Incident").length;
  return [pos > 0 && `${pos} Pos`, neg > 0 && `${neg} Neg`].filter(Boolean).join(" / ");
}

function statusBadge(status: string): string {
  if (status === "PA Issued")  return badge(status, C.amber, "#fef3c7");
  if (status === "PIP Issued") return badge(status, C.red,   "#fee2e2");
  if (status === "Confirmed")  return badge(status, C.green, "#dcfce7");
  return badge(status, C.teal, C.tealBg);
}

function pipBadge(emp: Employee): string {
  if (!emp.pipStatus) return `<span style="color:${C.gray}">None</span>`;
  const bg = emp.pipStatus.type === "PIP" ? "#fee2e2" : "#fef3c7";
  const color = emp.pipStatus.type === "PIP" ? C.red : C.amber;
  return badge(emp.pipStatus.type, color, bg);
}

// ── table renderers ────────────────────────────────────────────────────────

function commonRow(emp: Employee, incidents: RawIncidentRecord[], i: number, extraCells: string): string {
  const bg = i % 2 === 0 ? C.row0 : C.row1;
  return `
  <tr style="background:${bg};">
    ${td(`<span style="font-family:monospace;font-size:10px;">${emp.employeeId}</span>`)}
    ${td(emp.name, "left", true)}
    ${td(emp.department || "—")}
    ${td(emp.reportingManager)}
    ${td(formatDate(emp.doj))}
    ${td(`${emp.tenureDays}d`, "center")}
    ${td(pipBadge(emp), "center")}
    ${td(incidentSummary(incidents), "center")}
    ${td(fbCell(!!emp.feedback.d30, emp.tenureDays, 30), "center")}
    ${td(fbCell(!!emp.feedback.d60, emp.tenureDays, 60), "center")}
    ${td(fbCell(!!emp.feedback.d90, emp.tenureDays, 90), "center")}
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
  active: Employee[],
  incidentMap: Map<string, RawIncidentRecord[]>,
  today: string
): string {
  const sales   = active.filter(e => e.category === "sales");
  const trainer = active.filter(e => e.category === "trainer");
  const pt      = active.filter(e => e.category === "pt");

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
        { label: "Total Active", val: active.length, bg: C.tealBg, color: C.teal },
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
  const active = allEmployees.filter(e => e.finalStatus !== "Confirmed");

  const incidentResults = await Promise.allSettled(
    active.map(e =>
      fetchIncidentData(parseInt(e.employeeId.replace(/\D/g, ""), 10)).catch(() => [] as RawIncidentRecord[])
    )
  );
  const incidentMap = new Map<string, RawIncidentRecord[]>();
  active.forEach((e, i) => {
    const r = incidentResults[i];
    incidentMap.set(e.employeeId, r.status === "fulfilled" ? r.value : []);
  });

  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const subject = `EI Dashboard — 15-Day Performance Report (${today})`;
  const html = buildEmailHtml(active, incidentMap, today);

  try {
    await sendMail(to, subject, html);
  } catch (err) {
    console.warn("sendMail error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 502 });
  }

  return NextResponse.json({ success: true, sent: to.length });
}
