import { getTursoClient, initSchema } from "@/lib/turso";
import {
  fetchEmployeeListData,
  fetchFeedbackData,
  fetchPIPData,
  fetchNRData,
  fetchUtilizationData,
} from "@/lib/rms-auth";
import { Employee, EmployeeCategory, FinalStatus, FeedbackEntry, PIPStatus, NREntry, UtilizationEntry } from "@/types/employee";
import { computeTenureDays, inferMilestone, isoToApiDate, todayAsApiDate, cleanFeedbackText } from "@/lib/utils";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let schemaReady = false;
async function ensureSchema() {
  if (!schemaReady) {
    await initSchema();
    schemaReady = true;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

// Single source of truth for all server components and API routes.
// On cache miss: syncs employees → PIP/PA → feedback in parallel, then reads
// everything back with JOINs so callers get fully-enriched Employee objects.
// Category and final_status stored in Turso survive re-syncs (manual overrides).
export async function getEmployees(category?: EmployeeCategory): Promise<Employee[]> {
  await ensureSchema();
  const db = getTursoClient();
  const now = Date.now();

  const ageCheck = await db.execute({ sql: "SELECT MAX(cached_at) AS latest FROM employees", args: [] });
  const latest = (ageCheck.rows[0]?.latest as number | null) ?? 0;

  if (latest <= now - CACHE_TTL_MS) {
    // Employee/PIP/Feedback sync (may fail if employee API is unavailable)
    let empIds: string[] = [];
    try {
      empIds = await syncEmployees(db, now);
      await Promise.all([syncPIP(db, empIds, now), syncFeedback(db, now)]);
    } catch (err) {
      console.warn("Employee/PIP/Feedback sync failed, serving cached data:", err);
    }

    // NR and Utilization sync independently — run even if employee sync failed,
    // using whatever employee IDs are already in the DB
    try {
      await Promise.all([syncNR(db, now), syncUtilization(db, now)]);
    } catch (err) {
      console.warn("NR/Utilization sync failed:", err);
    }
  }

  return readEmployees(db, category);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync helpers
// ─────────────────────────────────────────────────────────────────────────────

async function syncEmployees(db: ReturnType<typeof getTursoClient>, now: number): Promise<string[]> {
  const toDate = new Date().toISOString().split("T")[0];
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 120);
  const from = fromDate.toISOString().split("T")[0];

  const raw = await fetchEmployeeListData(from, toDate);
  const empIds: string[] = [];

  for (const r of raw) {
    const empId = `EMP${r.EmpID}`;
    const doj = r["Joining Date"].split("T")[0];
    empIds.push(empId);

    const category =
      r.Department === "Sales" ? "sales" :
      r.Department === "Training Delivery Inhouse" ? "trainer" :
      "pt";

    const department = r.Department ?? "";

    // ON CONFLICT preserves final_status (manual overrides survive re-syncs) but updates category + department from API
    await db.execute({
      sql: `INSERT INTO employees (employee_id, name, category, department, doj, reporting_manager, final_status, cached_at)
            VALUES (?, ?, ?, ?, ?, ?, 'In Progress', ?)
            ON CONFLICT(employee_id) DO UPDATE SET
              name              = excluded.name,
              category          = excluded.category,
              department        = excluded.department,
              doj               = excluded.doj,
              reporting_manager = excluded.reporting_manager,
              cached_at         = excluded.cached_at`,
      args: [empId, r["Employee Name"], category, department, doj, r["Manager Name"], now],
    });
  }

  return empIds;
}

// PIP API returns all company-wide records only for privileged (HR) EmpCodes.
// Use the configured service account code first (defaults to 3936, Sakshi Pandey - HR).
// Falls back to iterating EI employee codes if the primary code returns empty.
const PIP_SERVICE_EMPCODE = parseInt(process.env.RMS_PIP_EMPCODE || "3936", 10);

async function syncPIP(db: ReturnType<typeof getTursoClient>, empIds: string[], now: number) {
  if (empIds.length === 0) return;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const from = sixMonthsAgo.toISOString().split("T")[0];
  const to = new Date().toISOString().split("T")[0];

  let raw: Awaited<ReturnType<typeof fetchPIPData>> = [];

  // Try the service account code first (single call, no iteration needed)
  try {
    const result = await fetchPIPData(PIP_SERVICE_EMPCODE, from, to);
    if (result.length > 0) raw = result;
  } catch {
    // service code failed — fall back to iterating EI employee codes
  }

  // Fallback: iterate EI employee codes until one returns company-wide data
  if (raw.length === 0) {
    for (const empId of empIds) {
      const code = parseInt(empId.replace(/\D/g, ""), 10);
      if (code === PIP_SERVICE_EMPCODE) continue; // already tried
      try {
        const result = await fetchPIPData(code, from, to);
        if (result.length > 0) { raw = result; break; }
      } catch {
        continue;
      }
    }
  }

  if (raw.length === 0) return; // all codes returned empty — non-fatal

  // Keep the most-recent active record per employee
  const activeByCode = new Map<string, typeof raw[0]>();
  for (const r of raw) {
    if (!r.isActive) continue;
    const code = String(r.Empcode);
    const prev = activeByCode.get(code);
    if (!prev || r.Id > prev.Id) activeByCode.set(code, r);
  }

  // Update all employees in DB (not just current empIds) — older cohorts still need PIP/PA status
  const allEmpRows = await db.execute({ sql: "SELECT employee_id FROM employees", args: [] });
  const allEmpIds = allEmpRows.rows.map((r) => r.employee_id as string).filter((id) => id.startsWith("EMP"));

  for (const empId of allEmpIds) {
    const empCode = empId.replace(/\D/g, "");
    const record = activeByCode.get(empCode) ?? null;
    const pipType = record ? (record.Type === "PIP" ? "PIP" : "PA") : null;

    await db.execute({
      sql: `INSERT INTO pip_status (employee_id, type, issued_date, end_date, cached_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(employee_id) DO UPDATE SET
              type        = excluded.type,
              issued_date = excluded.issued_date,
              end_date    = excluded.end_date,
              cached_at   = excluded.cached_at`,
      args: [empId, pipType ?? "none", record?.FromDate ?? "", record?.ToDate ?? "", now],
    });

    if (pipType) {
      // Escalate status — but never touch "Confirmed" (terminal state)
      const newStatus = pipType === "PIP" ? "PIP Issued" : "PA Issued";
      await db.execute({
        sql: `UPDATE employees SET final_status = ? WHERE employee_id = ? AND final_status != 'Confirmed'`,
        args: [newStatus, empId],
      });
    } else {
      // PIP/PA cleared — reset to In Progress (only if it was previously auto-set)
      await db.execute({
        sql: `UPDATE employees SET final_status = 'In Progress'
              WHERE employee_id = ? AND final_status IN ('PA Issued', 'PIP Issued')`,
        args: [empId],
      });
    }
  }
}

// Feedback API is a bulk call — one request returns all feedback in the date range.
async function syncFeedback(db: ReturnType<typeof getTursoClient>, now: number) {
  // Use the oldest DOJ in the DB as start so long-tenured employees aren't missed
  const oldestRow = await db.execute({ sql: "SELECT MIN(doj) AS oldest FROM employees", args: [] });
  const oldestDoj = oldestRow.rows[0]?.oldest as string | null;
  const start = oldestDoj ? isoToApiDate(oldestDoj) : todayAsApiDate();
  const end = todayAsApiDate();

  let raw;
  try {
    raw = await fetchFeedbackData(start, end);
  } catch {
    return; // non-fatal
  }

  // DOJ lookup so we can infer milestone (d30/d60/d90) from feedback date
  const empRows = await db.execute({ sql: "SELECT employee_id, doj FROM employees", args: [] });
  const dojMap = new Map<string, string>();
  for (const r of empRows.rows) dojMap.set(r.employee_id as string, r.doj as string);

  for (const r of raw) {
    const empId = `EMP${r.ReporteeEmpID}`;
    const doj = dojMap.get(empId);
    if (!doj) continue;

    const milestone = inferMilestone(doj, r.DateOfFb);
    if (!milestone) continue;

    const comment = cleanFeedbackText(
      [r.AreaOfStrength, r.AreaOfImprovement, r.OtherFeedback].filter(Boolean).join(" | ")
    );

    await db.execute({
      sql: `INSERT INTO feedback (employee_id, milestone, rating, comment, area_of_strength, area_of_improvement, other_feedback, posted_on, cached_at)
            VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(employee_id, milestone) DO UPDATE SET
              comment             = excluded.comment,
              area_of_strength    = excluded.area_of_strength,
              area_of_improvement = excluded.area_of_improvement,
              other_feedback      = excluded.other_feedback,
              posted_on           = excluded.posted_on,
              cached_at           = excluded.cached_at`,
      args: [
        empId, milestone, comment,
        r.AreaOfStrength ?? null,
        r.AreaOfImprovement ?? null,
        r.OtherFeedback ?? null,
        r.DateOfFb, now,
      ],
    });
  }
}

async function syncNR(db: ReturnType<typeof getTursoClient>, now: number) {
  const rows = await db.execute({
    sql: "SELECT employee_id FROM employees WHERE category = 'sales'",
    args: [],
  });

  await Promise.allSettled(
    rows.rows.map(async (r) => {
      const empCode = parseInt((r.employee_id as string).replace(/\D/g, ""), 10);
      try {
        const raw = await fetchNRData(empCode);
        const parseM = (m: string) => { const [mon, yr] = m.split("-"); return new Date(`${mon} 1, ${yr}`).getTime(); };
        const data = raw
          .map((rec) => ({ month: rec.month, val: rec.TotalNR }))
          .sort((a, b) => parseM(b.month) - parseM(a.month))
          .slice(0, 3);
        await db.execute({ sql: "DELETE FROM nr_data WHERE employee_id = ?", args: [String(empCode)] });
        for (const entry of data) {
          await db.execute({
            sql: "INSERT INTO nr_data (employee_id, month, val, cached_at) VALUES (?, ?, ?, ?)",
            args: [String(empCode), entry.month, entry.val, now],
          });
        }
      } catch { /* non-fatal — skip this employee */ }
    })
  );
}

async function syncUtilization(db: ReturnType<typeof getTursoClient>, now: number) {
  const rows = await db.execute({
    sql: "SELECT employee_id FROM employees WHERE category = 'trainer'",
    args: [],
  });

  await Promise.allSettled(
    rows.rows.map(async (r) => {
      const empCode = parseInt((r.employee_id as string).replace(/\D/g, ""), 10);
      try {
        const raw = await fetchUtilizationData(empCode);
        await db.execute({ sql: "DELETE FROM utilization WHERE employee_id = ?", args: [String(empCode)] });
        for (const rec of raw) {
          await db.execute({
            sql: "INSERT INTO utilization (employee_id, month, val, cached_at) VALUES (?, ?, ?, ?)",
            args: [String(empCode), rec.MonthName, rec.Utilization, now],
          });
        }
      } catch { /* non-fatal — skip this employee */ }
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Read from Turso (enriched with PIP + feedback via JOIN/query)
// ─────────────────────────────────────────────────────────────────────────────

function monthToOrd(s: string): number {
  if (!s) return 0;
  // "YYYY-MM-DD" or "YYYY-MM"
  if (/^\d{4}-\d{2}/.test(s)) {
    const parts = s.split("-");
    return parseInt(parts[0]) * 12 + parseInt(parts[1]) - 1;
  }
  // "Apr-2026" or "Mar 2026" or "March 2026"
  // new Date("Apr 2026") is Invalid Date in V8 — use "Mon 1, YYYY" which is reliably parsed
  const match = s.match(/^([A-Za-z]+)[- ](\d{4})$/);
  if (match) {
    const d = new Date(`${match[1]} 1, ${match[2]}`);
    if (!isNaN(d.getTime())) return d.getFullYear() * 12 + d.getMonth();
  }
  return 0;
}

async function readEmployees(db: ReturnType<typeof getTursoClient>, category?: EmployeeCategory): Promise<Employee[]> {
  const empRows = await db.execute({
    sql: `SELECT e.employee_id, e.name, e.category, e.department, e.doj, e.reporting_manager, e.final_status, e.hr_remarks,
                 p.type AS pip_type, p.issued_date, p.end_date
          FROM employees e
          LEFT JOIN pip_status p ON e.employee_id = p.employee_id AND p.type != 'none'
          ${category ? "WHERE e.category = ?" : ""}
          ORDER BY e.doj DESC`,
    args: category ? [category] : [],
  });

  // Fetch feedback, NR, and utilization in parallel
  const [fbRows, nrRows, utilRows] = await Promise.all([
    db.execute({ sql: "SELECT employee_id, milestone, rating, comment, posted_on FROM feedback", args: [] }),
    db.execute({ sql: "SELECT employee_id, month, val FROM nr_data", args: [] }),
    db.execute({ sql: "SELECT employee_id, month, val FROM utilization", args: [] }),
  ]);

  const feedbackMap = new Map<string, Map<string, FeedbackEntry>>();
  for (const r of fbRows.rows) {
    const eid = r.employee_id as string;
    if (!feedbackMap.has(eid)) feedbackMap.set(eid, new Map());
    feedbackMap.get(eid)!.set(r.milestone as string, {
      rating:   r.rating as number | null,
      comment:  (r.comment as string) ?? "",
      postedOn: (r.posted_on as string) ?? "",
    });
  }

  // NR data is keyed by numeric empCode (no "EMP" prefix)
  const nrMap = new Map<string, NREntry[]>();
  for (const r of nrRows.rows) {
    const code = r.employee_id as string;
    if (!nrMap.has(code)) nrMap.set(code, []);
    nrMap.get(code)!.push({ month: r.month as string, val: Number(r.val) });
  }

  const utilMap = new Map<string, UtilizationEntry[]>();
  for (const r of utilRows.rows) {
    const code = r.employee_id as string;
    if (!utilMap.has(code)) utilMap.set(code, []);
    utilMap.get(code)!.push({ month: r.month as string, val: Number(r.val) });
  }

  return empRows.rows.map((r) => {
    const eid = r.employee_id as string;
    const doj = r.doj as string;
    const empFb = feedbackMap.get(eid);
    const empCode = eid.replace(/\D/g, "");
    const dojOrd = monthToOrd(doj);

    const pipStatus: PIPStatus | null = r.pip_type
      ? { type: r.pip_type as "PA" | "PIP", issuedDate: r.issued_date as string, endDate: r.end_date as string }
      : null;

    const nrData = (nrMap.get(empCode) ?? [])
      .filter((e) => monthToOrd(e.month) >= dojOrd)
      .sort((a, b) => monthToOrd(a.month) - monthToOrd(b.month));

    const utilization = (utilMap.get(empCode) ?? [])
      .filter((e) => monthToOrd(e.month) >= dojOrd)
      .sort((a, b) => monthToOrd(a.month) - monthToOrd(b.month));

    return {
      employeeId:       eid,
      name:             r.name as string,
      category:         r.category as EmployeeCategory,
      department:       (r.department as string) || (r.category === "sales" ? "Sales" : r.category === "trainer" ? "Training Delivery" : "Personal Training"),
      doj,
      tenureDays:       computeTenureDays(doj),
      reportingManager: r.reporting_manager as string,
      feedback: {
        d30: empFb?.get("d30") ?? null,
        d60: empFb?.get("d60") ?? null,
        d90: empFb?.get("d90") ?? null,
      },
      nrData,
      utilization,
      pipStatus,
      hrIncidents: [],
      finalStatus: (r.final_status as string) as FinalStatus,
      hrRemarks:   (r.hr_remarks as string | null) ?? null,
    };
  });
}
