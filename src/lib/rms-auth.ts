const BASE_URL = "https://api.koenig-solutions.com";

interface TokenResponse {
  accessToken: string;
  deviceToken: string;
}

const TOKEN_TTL_MS = 50 * 60 * 1000; // 50 minutes

// Token cache for incidents / feedback / PIP / utilization APIs
let tokenCache: (TokenResponse & { expiresAt: number }) | null = null;

export async function getAuthTokens(): Promise<TokenResponse> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now) {
    return { accessToken: tokenCache.accessToken, deviceToken: tokenCache.deviceToken };
  }

  const res = await fetch(`${BASE_URL}/api/Kites/Operator/GetToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userName: process.env.RMS_USERNAME || "Sakshipandey",
      userPassword: process.env.RMS_PASSWORD || "Sakshipandey@123",
      userRole: process.env.RMS_ROLE_FEEDBACK || "GetIncidentData",
    }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`GetToken failed: ${res.status}`);

  const data = await res.json();
  if (data.statuscode !== 200) throw new Error(`GetToken error: ${data.message}`);

  tokenCache = {
    accessToken: data.content.accessToken,
    deviceToken: data.content.deviceToken,
    expiresAt: now + TOKEN_TTL_MS,
  };

  return { accessToken: tokenCache.accessToken, deviceToken: tokenCache.deviceToken };
}

// Separate token cache for the employee directory API (role=NJ)
let employeeTokenCache: (TokenResponse & { expiresAt: number }) | null = null;

async function getEmployeeAuthTokens(): Promise<TokenResponse> {
  const now = Date.now();
  if (employeeTokenCache && employeeTokenCache.expiresAt > now) {
    return { accessToken: employeeTokenCache.accessToken, deviceToken: employeeTokenCache.deviceToken };
  }

  const res = await fetch(`${BASE_URL}/api/Kites/Operator/GetToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userName: process.env.RMS_EMPLOYEE_USERNAME || "Sakshi",
      userPassword: process.env.RMS_EMPLOYEE_PASSWORD || "Sakshi@123",
      userRole: process.env.RMS_EMPLOYEE_ROLE || "NJ",
    }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`GetToken (employee) failed: ${res.status}`);

  const data = await res.json();
  if (data.statuscode !== 200) throw new Error(`GetToken (employee) error: ${data.message}`);

  employeeTokenCache = {
    accessToken: data.content.accessToken,
    deviceToken: data.content.deviceToken,
    expiresAt: now + TOKEN_TTL_MS,
  };

  return { accessToken: employeeTokenCache.accessToken, deviceToken: employeeTokenCache.deviceToken };
}

// Separate token cache for the Enquiry Audit Report API (role="Enquiry Audit Report")
let auditTokenCache: (TokenResponse & { expiresAt: number }) | null = null;

async function getAuditAuthTokens(): Promise<TokenResponse> {
  const now = Date.now();
  if (auditTokenCache && auditTokenCache.expiresAt > now) {
    return { accessToken: auditTokenCache.accessToken, deviceToken: auditTokenCache.deviceToken };
  }

  const res = await fetch(`${BASE_URL}/api/Kites/Operator/GetToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userName: process.env.RMS_AUDIT_USERNAME || "Samridhi_EnquiryAuditRep",
      userPassword: process.env.RMS_AUDIT_PASSWORD || "aaggw6UgwC$6",
      userRole: process.env.RMS_AUDIT_ROLE || "Enquiry Audit Report",
    }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`GetToken (audit) failed: ${res.status}`);

  const data = await res.json();
  if (data.statuscode !== 200) throw new Error(`GetToken (audit) error: ${data.message}`);

  auditTokenCache = {
    accessToken: data.content.accessToken,
    deviceToken: data.content.deviceToken,
    expiresAt: now + TOKEN_TTL_MS,
  };

  return { accessToken: auditTokenCache.accessToken, deviceToken: auditTokenCache.deviceToken };
}

// Enquiry Audit Report API — apikey=203, bulk call (one request returns all audits).
// Sales-only. Records carry csm_name (no emp code), so callers match by name.
export async function fetchAuditData(): Promise<RawAuditRecord[]> {
  const { accessToken, deviceToken } = await getAuditAuthTokens();
  const encodedToken = encodeURIComponent(accessToken);

  const url = `${BASE_URL}/api/Kites/Operator/common?apikey=203&accessToken=${encodedToken}&deviceToken=${deviceToken}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ start_date: "", end_date: "", csm_user_id: "", client_email_address: "" }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Audit API failed: ${res.status}`);

  const data = await res.json();
  if (data.statuscode !== 200) throw new Error(`Audit API error: ${data.message}`);

  const content = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
  return (content ?? []) as RawAuditRecord[];
}

export interface RawAuditRecord {
  csm_name: string | null;
  created_date_time: string | null;  // "DD Mon YYYY"
  rating: string | null;
  remark: string | null;
  enquiry_id: number | null;
  enquiry_audit_id: number | null;
  client_email_adress: string | null; // (sic) API misspells "address"
}

// Separate token cache for the Trainer Assignments API (role="Get Trainer Negative Feedback")
let trainerAssignmentTokenCache: (TokenResponse & { expiresAt: number }) | null = null;

async function getTrainerAssignmentAuthTokens(): Promise<TokenResponse> {
  const now = Date.now();
  if (trainerAssignmentTokenCache && trainerAssignmentTokenCache.expiresAt > now) {
    return { accessToken: trainerAssignmentTokenCache.accessToken, deviceToken: trainerAssignmentTokenCache.deviceToken };
  }

  const res = await fetch(`${BASE_URL}/api/Kites/Operator/GetToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userName: process.env.RMS_TRAINER_ASSIGN_USERNAME || "Samridhi_GetTrainerNegat",
      userPassword: process.env.RMS_TRAINER_ASSIGN_PASSWORD || "EXy8#8MwxY9G",
      userRole: process.env.RMS_TRAINER_ASSIGN_ROLE || "Get Trainer Negative Feedback",
    }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`GetToken (trainer-assignments) failed: ${res.status}`);

  const data = await res.json();
  if (data.statuscode !== 200) throw new Error(`GetToken (trainer-assignments) error: ${data.message}`);

  trainerAssignmentTokenCache = {
    accessToken: data.content.accessToken,
    deviceToken: data.content.deviceToken,
    expiresAt: now + TOKEN_TTL_MS,
  };

  return { accessToken: trainerAssignmentTokenCache.accessToken, deviceToken: trainerAssignmentTokenCache.deviceToken };
}

// Trainer Assignments API — apikey=218, per-empCode call (Trainer-only).
// Returns assignments with associated client feedback data.
export async function fetchTrainerAssignmentData(empCode: number): Promise<RawTrainerAssignment[]> {
  const { accessToken, deviceToken } = await getTrainerAssignmentAuthTokens();
  const encodedToken = encodeURIComponent(accessToken);

  const url = `${BASE_URL}/api/Kites/Operator/common?apikey=218&accessToken=${encodedToken}&deviceToken=${deviceToken}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employee_id: String(empCode) }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Trainer Assignments API failed: ${res.status}`);

  const data = await res.json();
  if (data.statuscode !== 200) throw new Error(`Trainer Assignments API error: ${data.message}`);

  const content = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
  return (content ?? []) as RawTrainerAssignment[];
}

export interface RawTrainerAssignment {
  client_name: string | null;
  client_ID: string | null;
  trainer_name: string | null;
  csm_name: string | null;
  sc_id: string | null;
  feedback_id: string | null;
  feedback_date: string | null;
  feedback_question: string | null;
  feedback_answer: string | null;
  assignment_start_date: string | null;
  assignment_end_date: string | null;
  assignment_delivery_mode: string | null;
  assignment_id: string | null;
}

export async function fetchFeedbackData(startDate: string, endDate: string, employeeName = "") {
  const { accessToken, deviceToken } = await getAuthTokens();
  const encodedToken = encodeURIComponent(accessToken);

  const url = `${BASE_URL}/api/Kites/Operator/common?apikey=37&accessToken=${encodedToken}&deviceToken=${deviceToken}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Startdate: startDate, Enddate: endDate, EmployeeName: employeeName }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Feedback API failed: ${res.status}`);

  const data = await res.json();
  if (data.statuscode !== 200) throw new Error(`Feedback API error: ${data.message}`);

  // content is a JSON string — must parse
  return JSON.parse(data.content) as RawFeedbackRecord[];
}

export interface RawFeedbackRecord {
  ReporteeEmpID: number;
  DirectReporteeName: string;
  ManagerEmpID: number;
  ManagerName: string;
  AreaOfStrength: string | null;
  AreaOfImprovement: string | null;
  OtherFeedback: string | null;
  DateOfFb: string; // "DD Mon YYYY"
}

// HR Incidents API — apikey=36, per-employee call, content is JSON string
export async function fetchIncidentData(empCode: number): Promise<RawIncidentRecord[]> {
  const { accessToken, deviceToken } = await getAuthTokens();
  const encodedToken = encodeURIComponent(accessToken);

  const url = `${BASE_URL}/api/Kites/Operator/common?apikey=36&accessToken=${encodedToken}&deviceToken=${deviceToken}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ EmpCode: empCode }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Incidents API failed: ${res.status}`);

  const data = await res.json();
  if (data.statuscode !== 200) throw new Error(`Incidents API error: ${data.message}`);

  // content is a JSON string — must parse
  return JSON.parse(data.content) as RawIncidentRecord[];
}

export interface RawIncidentRecord {
  IncidentDate: string;       // "YYYY-MM-DDT00:00:00"
  EmpName: string;
  ReportingManager: string;
  Reason: string;
  Type: string | null;
  IncidentType: "Positive Incident" | "Negative Incident";
  ReportedBy: string | null;
}

// Trainer Utilization API — apikey=39, per-employee call
export async function fetchUtilizationData(empCode: number): Promise<RawUtilizationRecord[]> {
  const { accessToken, deviceToken } = await getAuthTokens();
  const encodedToken = encodeURIComponent(accessToken);

  const url = `${BASE_URL}/api/Kites/Operator/common?apikey=39&accessToken=${encodedToken}&deviceToken=${deviceToken}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ EmpCode: empCode }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Utilization API failed: ${res.status}`);

  const data = await res.json();
  if (data.statuscode !== 200) throw new Error(`Utilization API error: ${data.message}`);

  const content = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
  return (content ?? []) as RawUtilizationRecord[];
}

export interface RawUtilizationRecord {
  EmployeeCode: string;
  EmployeeName: string;
  ReportingManager: string;
  Utilization: number;  // percentage, e.g. 59.09
  MonthName: string;    // "Mar 2026"
}

// PIP Panel API — apikey=38, per-employee call with date range
export async function fetchPIPData(empCode: number, from: string, to: string): Promise<RawPIPRecord[]> {
  const { accessToken, deviceToken } = await getAuthTokens();
  const encodedToken = encodeURIComponent(accessToken);

  const url = `${BASE_URL}/api/Kites/Operator/common?apikey=38&accessToken=${encodedToken}&deviceToken=${deviceToken}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ EmpCode: empCode, From: from, To: to, Type: 8 }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`PIP API failed: ${res.status}`);

  const data = await res.json();
  if (data.statuscode !== 200) throw new Error(`PIP API error: ${data.message}`);

  // content may be a JSON string or a direct array depending on API version
  const content = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
  return content as RawPIPRecord[];
}

export interface RawPIPRecord {
  Id: number;
  Empcode: number;
  Name: string;
  Manager: string;
  FromDate: string;        // "1 Apr 2026"
  ToDate: string;          // "30 Apr 2026"
  CreatedOn: string;       // "Apr 1 2026 12:48PM"
  isActive: boolean;
  comment: string;
  Resigned: boolean;
  Type: "PIP" | "Performance Alert";  // API returns these two values
  InitaitedBy: string;
  ResignationDate: string;
}

// NR (Net Revenue) API — apikey=42, per-employee call, content is JSON string
export async function fetchNRData(empId: number): Promise<RawNRRecord[]> {
  const { accessToken, deviceToken } = await getAuthTokens();
  const encodedToken = encodeURIComponent(accessToken);

  const url = `${BASE_URL}/api/Kites/Operator/common?apikey=42&accessToken=${encodedToken}&deviceToken=${deviceToken}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ EmpId: String(empId) }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`NR API failed: ${res.status}`);

  const data = await res.json();
  if (data.statuscode !== 200) throw new Error(`NR API error: ${data.message}`);

  const content = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
  return (content ?? []) as RawNRRecord[];
}

export interface RawNRRecord {
  month: string;   // "Apr-2026"
  TotalNR: number; // can be negative
}

// Employee Directory API — apikey=47, date-range bulk fetch
export async function fetchEmployeeListData(from: string, to: string): Promise<RawEmployeeRecord[]> {
  const { accessToken, deviceToken } = await getEmployeeAuthTokens();
  const encodedToken = encodeURIComponent(accessToken);

  const url = `${BASE_URL}/api/Kites/Operator/common?apikey=47&accessToken=${encodedToken}&deviceToken=${deviceToken}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ From: from, To: to }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Employee API failed: ${res.status}`);

  const data = await res.json();
  if (data.statuscode !== 200) throw new Error(`Employee API error: ${data.message}`);

  // content is a JSON string — must parse
  const content = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
  return (content ?? []) as RawEmployeeRecord[];
}

// Raw version — returns unparsed records for debugging
export async function fetchRawEmployeeListData(from: string, to: string): Promise<Record<string, unknown>[]> {
  const { accessToken, deviceToken } = await getEmployeeAuthTokens();
  const encodedToken = encodeURIComponent(accessToken);
  const url = `${BASE_URL}/api/Kites/Operator/common?apikey=47&accessToken=${encodedToken}&deviceToken=${deviceToken}`;
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ From: from, To: to }), cache: "no-store" });
  if (!res.ok) throw new Error(`Employee API failed: ${res.status}`);
  const data = await res.json();
  if (data.statuscode !== 200) throw new Error(`Employee API error: ${data.message}`);
  const content = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
  return (content ?? []) as Record<string, unknown>[];
}

export interface RawEmployeeRecord {
  EmpID: number;
  "Employee Name": string;
  "Joining Date": string;  // "2026-03-31T00:00:00"
  "Manager Name": string;
  Department: string;
  Email?: string;
  DOR?: string;            // Date of Resignation — "1900-01-01T..." sentinel means not resigned
  LWD?: string;            // Last Working Day — may be "1900-01-01T..." even when DOR is set
}
