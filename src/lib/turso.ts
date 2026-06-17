import { createClient } from "@libsql/client";

let client: ReturnType<typeof createClient> | null = null;

export function getTursoClient() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export async function initSchema() {
  const db = getTursoClient();

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS employees (
      employee_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      doj TEXT NOT NULL,
      reporting_manager TEXT,
      department TEXT NOT NULL DEFAULT '',
      final_status TEXT NOT NULL DEFAULT 'In Progress',
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      milestone TEXT NOT NULL,
      rating INTEGER,
      comment TEXT,
      area_of_strength TEXT,
      area_of_improvement TEXT,
      other_feedback TEXT,
      posted_on TEXT,
      cached_at INTEGER NOT NULL,
      UNIQUE(employee_id, milestone)
    );

    CREATE TABLE IF NOT EXISTS nr_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      month TEXT NOT NULL,
      val REAL NOT NULL,
      cached_at INTEGER NOT NULL,
      UNIQUE(employee_id, month)
    );

    CREATE TABLE IF NOT EXISTS utilization (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      month TEXT NOT NULL,
      val REAL NOT NULL,
      cached_at INTEGER NOT NULL,
      UNIQUE(employee_id, month)
    );

    CREATE TABLE IF NOT EXISTS audit_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      audit_date TEXT,
      rating TEXT,
      remark TEXT,
      enquiry_id INTEGER,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pip_status (
      employee_id TEXT PRIMARY KEY,
      type TEXT,
      issued_date TEXT,
      end_date TEXT,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hr_incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      type TEXT NOT NULL,
      comment TEXT,
      date TEXT,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trainer_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      assignment_id TEXT,
      client_name TEXT,
      client_id TEXT,
      sc_id TEXT,
      start_date TEXT,
      end_date TEXT,
      delivery_mode TEXT,
      feedback_id TEXT,
      feedback_date TEXT,
      feedback_question TEXT,
      feedback_answer TEXT,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS token_cache (
      id INTEGER PRIMARY KEY,
      access_token TEXT NOT NULL,
      device_token TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `);

  // Migration: add department column to existing databases
  try {
    await db.execute({ sql: "ALTER TABLE employees ADD COLUMN department TEXT NOT NULL DEFAULT ''", args: [] });
  } catch {
    // column already exists — safe to ignore
  }

  // Migration: add HR remarks column
  try {
    await db.execute({ sql: "ALTER TABLE employees ADD COLUMN hr_remarks TEXT", args: [] });
  } catch {}

  // Migration: add AI-classified quality column to feedback
  try {
    await db.execute({ sql: "ALTER TABLE feedback ADD COLUMN quality TEXT", args: [] });
  } catch {}

  // Migration: add resignation columns (date of resignation + last working day)
  try {
    await db.execute({ sql: "ALTER TABLE employees ADD COLUMN dor TEXT NOT NULL DEFAULT ''", args: [] });
  } catch {}
  try {
    await db.execute({ sql: "ALTER TABLE employees ADD COLUMN lwd TEXT NOT NULL DEFAULT ''", args: [] });
  } catch {}

  // Migration: add enquiry-audit count (Sales only; matched by csm_name since DOJ)
  try {
    await db.execute({ sql: "ALTER TABLE employees ADD COLUMN audit_count INTEGER NOT NULL DEFAULT 0", args: [] });
  } catch {}

  // Migration: email (needed to query the negative-feedback API) + neg-feedback count (Trainer only)
  try {
    await db.execute({ sql: "ALTER TABLE employees ADD COLUMN email TEXT NOT NULL DEFAULT ''", args: [] });
  } catch {}
  try {
    await db.execute({ sql: "ALTER TABLE employees ADD COLUMN neg_feedback_count INTEGER NOT NULL DEFAULT 0", args: [] });
  } catch {}
}
