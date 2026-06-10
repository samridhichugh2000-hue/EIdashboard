export type FinalStatus = "Confirmed" | "In Progress" | "PA Issued" | "PIP Issued";
export type EmployeeCategory = "sales" | "trainer" | "pt";
export type IncidentType = "pos" | "neg";
export type PIPType = "PA" | "PIP";

export interface FeedbackEntry {
  rating: number | null;
  comment: string;
  postedOn: string; // "DD Mon YYYY"
  areaOfStrength: string | null;
  areaOfImprovement: string | null;
  quality: "below" | "satisfactory" | "above" | null; // AI-classified; null = pending/fallback
}

export interface NREntry {
  month: string;
  val: number;
}

export interface UtilizationEntry {
  month: string;
  val: number; // utilization percentage, e.g. 59.09
}

export interface PIPStatus {
  type: PIPType;
  issuedDate: string;
  endDate: string;
}

export interface HRIncident {
  type: IncidentType;
  comment: string;
  date: string;
}

export interface Employee {
  employeeId: string;
  name: string;
  category: EmployeeCategory;
  doj: string; // ISO date string
  tenureDays: number;
  reportingManager: string;
  department: string;
  feedback: {
    d30: FeedbackEntry | null;
    d60: FeedbackEntry | null;
    d90: FeedbackEntry | null;
  };
  nrData: NREntry[];        // Sales only
  utilization: UtilizationEntry[]; // Trainer only
  pipStatus: PIPStatus | null;
  hrIncidents: HRIncident[];
  finalStatus: FinalStatus;
  hrRemarks?: string | null;
}

export interface OverviewStats {
  total: number;
  confirmed: number;
  inProgress: number;
  paIssued: number;
  pipIssued: number;
}

export interface TeamStats extends OverviewStats {
  category: EmployeeCategory;
  label: string;
  icon: string;
}
