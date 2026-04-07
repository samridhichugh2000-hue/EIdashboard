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

    CREATE TABLE IF NOT EXISTS token_cache (
      id INTEGER PRIMARY KEY,
      access_token TEXT NOT NULL,
      device_token TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `);
}
