import { cache } from "react";
import { getTursoClient, initSchema } from "@/lib/turso";
import {
  fetchEmployeeListData,
  fetchFeedbackData,
  fetchPIPData,
  fetchNRData,
  fetchUtilizationData,
  fetchAuditData,
  fetchNegativeFeedbackData,
} from "@/lib/rms-auth";
import { Employee, EmployeeCategory, FinalStatus, FeedbackEntry, PIPStatus, NREntry, UtilizationEntry, AuditEntry } from "@/types/employee";
import { computeTenureDays, inferMilestone, isoToApiDate, todayAsApiDate, cleanFeedbackText, cleanResignationDate, parseDateOfFb } from "@/lib/utils";
import { classifyFeedbackQuality } from "@/lib/openai";

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
export const getEmployees = cache(async function getEmployees(category?: EmployeeCategory): Promise<Employee[]> {
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
      await classifyPendingFeedback(db).catch((err) =>
        console.warn("OpenAI feedback classification failed (non-fatal):", err)
      );
    } catch (err) {
      console.warn("Employee/PIP/Feedback sync failed, serving cached data:", err);
    }

    // NR, Utilization, Enquiry-Audit, and Negative-Feedback sync independently — run even
    // if employee sync failed, using whatever employees are already in the DB
    try {
      await Promise.all([syncNR(db, now), syncUtilization(db, now), syncAudit(db, now), syncNegFeedback(db, now)]);
    } catch (err) {
      console.warn("NR/Utilization/Audit/NegFeedback sync failed:", err);
    }
  }

  return readEmployees(db, category);
});

// ─────────────────────────────────────────────────────────────────────────────
// Sync helpers
// ─────────────────────────────────────────────────────────────────────────────

type WriteStmt = { sql: string; args: (string | number | null)[] };

// Remote Turso has ~70ms/round-trip latency, so awaiting one write per row turns
// a few hundred rows into tens of seconds. db.batch() sends a chunk of statements
// in a single round-trip (transaction), collapsing N round-trips into N/chunk.
async function batchWrites(db: ReturnType<typeof getTursoClient>, stmts: WriteStmt[], chunk = 100) {
  for (let i = 0; i < stmts.length; i += chunk) {
    await db.batch(stmts.slice(i, i + chunk), "write");
  }
}

// EI tracking window: 90-day evaluation + buffer for completed/closed cohorts that
// remain on the dashboard. Must comfortably exceed the oldest displayed employee,
// otherwise aged rows stop being re-fetched and their category/department go stale.
const EMPLOYEE_SYNC_WINDOW_DAYS = 180;

async function syncEmployees(db: ReturnType<typeof getTursoClient>, now: number): Promise<string[]> {
  const toDate = new Date().toISOString().split("T")[0];
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - EMPLOYEE_SYNC_WINDOW_DAYS);
  const from = fromDate.toISOString().split("T")[0];

  const raw = await fetchEmployeeListData(from, toDate);
  const empIds: string[] = [];
  const stmts: WriteStmt[] = [];

  for (const r of raw) {
    const empId = `EMP${r.EmpID}`;
    const doj = r["Joining Date"].split("T")[0];
    empIds.push(empId);

    // "Corporate Sales" (and any other Sales sub-department) rolls up to the sales category
    const category =
      /sales/i.test(r.Department ?? "") ? "sales" :
      r.Department === "Training Delivery Inhouse" ? "trainer" :
      "pt";

    const department = r.Department ?? "";
    const dor = cleanResignationDate(r.DOR);
    const lwd = cleanResignationDate(r.LWD);
    const email = r.Email ?? "";

    // ON CONFLICT preserves final_status (manual overrides survive re-syncs) but updates category + department + resignation + email from API
    stmts.push({
      sql: `INSERT INTO employees (employee_id, name, category, department, doj, reporting_manager, final_status, dor, lwd, email, cached_at)
            VALUES (?, ?, ?, ?, ?, ?, 'In Progress', ?, ?, ?, ?)
            ON CONFLICT(employee_id) DO UPDATE SET
              name              = excluded.name,
              category          = excluded.category,
              department        = excluded.department,
              doj               = excluded.doj,
              reporting_manager = excluded.reporting_manager,
              dor               = excluded.dor,
              lwd               = excluded.lwd,
              email             = excluded.email,
              cached_at         = excluded.cached_at`,
      args: [empId, r["Employee Name"], category, department, doj, r["Manager Name"], dor, lwd, email, now],
    });
  }

  await batchWrites(db, stmts);
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

  const stmts: WriteStmt[] = [];
  for (const empId of allEmpIds) {
    const empCode = empId.replace(/\D/g, "");
    const record = activeByCode.get(empCode) ?? null;
    const pipType = record ? (record.Type === "PIP" ? "PIP" : "PA") : null;

    stmts.push({
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
      stmts.push({
        sql: `UPDATE employees SET final_status = ? WHERE employee_id = ? AND final_status != 'Confirmed'`,
        args: [newStatus, empId],
      });
    } else {
      // PIP/PA cleared — reset to In Progress (only if it was previously auto-set)
      stmts.push({
        sql: `UPDATE employees SET final_status = 'In Progress'
              WHERE employee_id = ? AND final_status IN ('PA Issued', 'PIP Issued')`,
        args: [empId],
      });
    }
  }

  await batchWrites(db, stmts);
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

  const stmts: WriteStmt[] = [];
  for (const r of raw) {
    const empId = `EMP${r.ReporteeEmpID}`;
    const doj = dojMap.get(empId);
    if (!doj) continue;

    const milestone = inferMilestone(doj, r.DateOfFb);
    if (!milestone) continue;

    const comment = cleanFeedbackText(
      [r.AreaOfStrength, r.AreaOfImprovement, r.OtherFeedback].filter(Boolean).join(" | ")
    );

    stmts.push({
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

  await batchWrites(db, stmts);
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

// Enquiry Audit Report (Sales only). Bulk API with no emp code in records — match by
// csm_name to the sales employee's name, counting only audits dated on/after their DOJ
// (so a same-name person's pre-join audits aren't attributed to a new joiner).
const normName = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

async function syncAudit(db: ReturnType<typeof getTursoClient>, now: number) {
  let raw: Awaited<ReturnType<typeof fetchAuditData>>;
  try {
    raw = await fetchAuditData();
  } catch {
    return; // non-fatal — leave existing entries in place
  }

  // Group full audit records by normalized csm_name (with a parsed timestamp for the DOJ filter)
  const recsByName = new Map<string, { ms: number; date: string; rating: string | null; remark: string | null; enquiryId: number | null }[]>();
  for (const r of raw) {
    if (!r.csm_name) continue;
    const d = parseDateOfFb(r.created_date_time ?? "");
    if (!d) continue;
    const key = normName(r.csm_name);
    if (!recsByName.has(key)) recsByName.set(key, []);
    recsByName.get(key)!.push({
      ms: d.getTime(),
      date: r.created_date_time ?? "",
      rating: r.rating ?? null,
      remark: cleanFeedbackText(r.remark) || null,
      enquiryId: r.enquiry_id ?? null,
    });
  }

  const sales = await db.execute({ sql: "SELECT employee_id, name, doj FROM employees WHERE category = 'sales'", args: [] });

  const stmts: WriteStmt[] = [];
  for (const e of sales.rows) {
    const empId = e.employee_id as string;
    const dojMs = new Date(e.doj as string).getTime();
    // Only audits dated on/after the employee's joining date (newest first)
    const entries = (recsByName.get(normName(e.name as string)) ?? [])
      .filter((a) => a.ms >= dojMs)
      .sort((a, b) => b.ms - a.ms);

    // Replace this employee's entries and refresh the count
    stmts.push({ sql: "DELETE FROM audit_entries WHERE employee_id = ?", args: [empId] });
    for (const a of entries) {
      stmts.push({
        sql: "INSERT INTO audit_entries (employee_id, audit_date, rating, remark, enquiry_id, cached_at) VALUES (?, ?, ?, ?, ?, ?)",
        args: [empId, a.date, a.rating, a.remark, a.enquiryId, now],
      });
    }
    stmts.push({ sql: "UPDATE employees SET audit_count = ? WHERE employee_id = ?", args: [entries.length, empId] });
  }

  await batchWrites(db, stmts);
}

// Negative Feedback Count (Trainer only). Per-email lookup; the API returns one row per
// trainer profile sharing that email, with Trainer = "Name;<empCode>". Match the row whose
// embedded emp code equals the dashboard employee so a shared email's other profile isn't counted.
async function syncNegFeedback(db: ReturnType<typeof getTursoClient>, now: number) {
  const rows = await db.execute({
    sql: "SELECT employee_id, email FROM employees WHERE category = 'trainer' AND email != ''",
    args: [],
  });

  const results = await Promise.allSettled(
    rows.rows.map(async (r) => {
      const empId = r.employee_id as string;
      const empCode = empId.replace(/\D/g, "");
      const recs = await fetchNegativeFeedbackData(r.email as string);
      const total = recs
        .filter((rec) => (rec.Trainer ?? "").split(";").pop()?.trim() === empCode)
        .reduce((sum, rec) => sum + (Number(rec.Total) || 0), 0);
      return { empId, total };
    })
  );

  const stmts: WriteStmt[] = [];
  for (const res of results) {
    if (res.status !== "fulfilled") continue; // skip failures — keep existing count
    stmts.push({ sql: "UPDATE employees SET neg_feedback_count = ? WHERE employee_id = ?", args: [res.value.total, res.value.empId] });
  }
  await batchWrites(db, stmts);
}

// ─────────────────────────────────────────────────────────────────────────────
// AI classification — runs after each sync for records with quality IS NULL
// ─────────────────────────────────────────────────────────────────────────────

async function classifyPendingFeedback(db: ReturnType<typeof getTursoClient>) {
  const rows = await db.execute({
    sql: `SELECT employee_id, milestone, comment, area_of_strength, area_of_improvement
          FROM feedback
          WHERE quality IS NULL AND comment IS NOT NULL AND comment != ''`,
    args: [],
  });

  if (rows.rows.length === 0) return;

  await Promise.allSettled(
    rows.rows.map(async (r) => {
      const parts = [r.area_of_strength, r.area_of_improvement, r.comment].filter(Boolean);
      const text = parts.join(" | ");
      try {
        const quality = await classifyFeedbackQuality(text);
        await db.execute({
          sql: "UPDATE feedback SET quality = ? WHERE employee_id = ? AND milestone = ?",
          args: [quality, r.employee_id, r.milestone],
        });
      } catch {
        // non-fatal — leave quality as NULL, heuristic fallback will be used
      }
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
    sql: `SELECT e.employee_id, e.name, e.category, e.department, e.doj, e.reporting_manager, e.final_status, e.hr_remarks, e.dor, e.lwd, e.audit_count, e.neg_feedback_count,
                 p.type AS pip_type, p.issued_date, p.end_date
          FROM employees e
          LEFT JOIN pip_status p ON e.employee_id = p.employee_id AND p.type != 'none'
          ${category ? "WHERE e.category = ?" : ""}
          ORDER BY e.doj DESC`,
    args: category ? [category] : [],
  });

  // Fetch feedback, NR, utilization, and audit entries in parallel
  const [fbRows, nrRows, utilRows, auditRows] = await Promise.all([
    db.execute({ sql: "SELECT employee_id, milestone, rating, comment, area_of_strength, area_of_improvement, posted_on, quality FROM feedback", args: [] }),
    db.execute({ sql: "SELECT employee_id, month, val FROM nr_data", args: [] }),
    db.execute({ sql: "SELECT employee_id, month, val FROM utilization", args: [] }),
    db.execute({ sql: "SELECT employee_id, audit_date, rating, remark FROM audit_entries ORDER BY id", args: [] }),
  ]);

  const feedbackMap = new Map<string, Map<string, FeedbackEntry>>();
  for (const r of fbRows.rows) {
    const eid = r.employee_id as string;
    if (!feedbackMap.has(eid)) feedbackMap.set(eid, new Map());
    feedbackMap.get(eid)!.set(r.milestone as string, {
      rating:           r.rating as number | null,
      comment:          (r.comment as string) ?? "",
      postedOn:         (r.posted_on as string) ?? "",
      areaOfStrength:   (r.area_of_strength as string | null) ?? null,
      areaOfImprovement:(r.area_of_improvement as string | null) ?? null,
      quality:          (r.quality as "below" | "satisfactory" | "above" | null) ?? null,
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

  // Audit entries keyed by employee_id (already filtered to since-DOJ at sync, newest first)
  const auditMap = new Map<string, AuditEntry[]>();
  for (const r of auditRows.rows) {
    const eid = r.employee_id as string;
    if (!auditMap.has(eid)) auditMap.set(eid, []);
    auditMap.get(eid)!.push({
      date:   (r.audit_date as string) ?? "",
      rating: (r.rating as string | null) ?? null,
      remark: (r.remark as string | null) ?? null,
    });
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
      department:       (r.department as string) || "—",
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
      resigned:          !!(r.dor as string),
      dateOfResignation: (r.dor as string) || null,
      lastWorkingDay:    (r.lwd as string) || null,
      auditCount:        Number(r.audit_count ?? 0),
      audits:            auditMap.get(eid) ?? [],
      negFeedbackCount:  Number(r.neg_feedback_count ?? 0),
    };
  });
}
