export const dynamic = "force-dynamic";

import { getEmployees } from "@/lib/data";
import { fetchIncidentData, RawIncidentRecord } from "@/lib/rms-auth";
import { Employee, NREntry, UtilizationEntry } from "@/types/employee";
import { formatDate } from "@/lib/utils";
import PrintButton from "@/components/report/PrintButton";
import SendEmailButton from "@/components/report/SendEmailButton";

// ── helpers ────────────────────────────────────────────────────────────────

function formatNR(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000)   return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${abs}`;
}

function FBCell({ received, tenureDays, threshold }: { received: boolean; tenureDays: number; threshold: number }) {
  if (received)              return <span className="text-green-700 font-medium">✓ Received</span>;
  if (tenureDays >= threshold) return <span className="text-red-600 font-medium">Pending</span>;
  return <span className="text-gray-300">—</span>;
}

function NRCol({ entry }: { entry: NREntry | undefined }) {
  if (!entry) return <span className="text-gray-300">—</span>;
  return (
    <span className={entry.val < 0 ? "text-red-600" : "text-gray-800"}>
      {entry.month}<br />{formatNR(entry.val)}
    </span>
  );
}

function UtilCol({ entry }: { entry: UtilizationEntry | undefined }) {
  if (!entry) return <span className="text-gray-300">—</span>;
  const color = entry.val >= 70 ? "text-green-700" : entry.val >= 40 ? "text-amber-600" : "text-red-600";
  return (
    <span className={color}>
      {entry.month}<br />{entry.val.toFixed(1)}%
    </span>
  );
}

function incidentSummary(incidents: RawIncidentRecord[]): string {
  if (incidents.length === 0) return "—";
  const pos = incidents.filter(x => x.IncidentType === "Positive Incident").length;
  const neg = incidents.filter(x => x.IncidentType === "Negative Incident").length;
  return [pos > 0 && `${pos} Pos`, neg > 0 && `${neg} Neg`].filter(Boolean).join(" / ");
}

// ── shared table components ────────────────────────────────────────────────

const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
  <th className={`px-2 py-2 font-semibold text-[10px] uppercase tracking-wide whitespace-nowrap ${right ? "text-right" : "text-left"}`}>
    {children}
  </th>
);

const TD = ({ children, center, right, muted }: { children: React.ReactNode; center?: boolean; right?: boolean; muted?: boolean }) => (
  <td className={`px-2 py-2 text-[11px] align-top ${center ? "text-center" : right ? "text-right" : ""} ${muted ? "text-gray-400" : "text-gray-700"}`}>
    {children}
  </td>
);

// ── section renderers ─────────────────────────────────────────────────────

function SalesTable({ employees, incidentMap }: { employees: Employee[]; incidentMap: Map<string, RawIncidentRecord[]> }) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-[#1E99C0] text-white text-left">
          <TH>Emp ID</TH>
          <TH>Name</TH>
          <TH>Department</TH>
          <TH>Manager</TH>
          <TH>DOJ</TH>
          <TH>Tenure</TH>
          <TH>PA / PIP</TH>
          <TH>Incidents</TH>
          <TH>30d FB</TH>
          <TH>60d FB</TH>
          <TH>90d FB</TH>
          <TH right>NR M1</TH>
          <TH right>NR M2</TH>
          <TH right>NR M3</TH>
          <TH>Final Status</TH>
          <TH>HR Remarks</TH>
          <TH>Closed</TH>
        </tr>
      </thead>
      <tbody>
        {employees.map((emp, i) => {
          const incidents = incidentMap.get(emp.employeeId) ?? [];
          return (
            <tr key={emp.employeeId} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              <TD><span className="font-mono">{emp.employeeId}</span></TD>
              <TD><span className="font-semibold">{emp.name}</span></TD>
              <TD>{emp.department}</TD>
              <TD>{emp.reportingManager}</TD>
              <TD>{formatDate(emp.doj)}</TD>
              <TD center>{emp.tenureDays}d</TD>
              <TD center>
                {emp.pipStatus
                  ? <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${emp.pipStatus.type === "PIP" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{emp.pipStatus.type}</span>
                  : <span className="text-gray-400">None</span>}
              </TD>
              <TD center>{incidentSummary(incidents)}</TD>
              <TD center><FBCell received={!!emp.feedback.d30} tenureDays={emp.tenureDays} threshold={30} /></TD>
              <TD center><FBCell received={!!emp.feedback.d60} tenureDays={emp.tenureDays} threshold={60} /></TD>
              <TD center><FBCell received={!!emp.feedback.d90} tenureDays={emp.tenureDays} threshold={90} /></TD>
              <TD right><NRCol entry={emp.nrData[0]} /></TD>
              <TD right><NRCol entry={emp.nrData[1]} /></TD>
              <TD right><NRCol entry={emp.nrData[2]} /></TD>
              <TD>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  emp.finalStatus === "PA Issued"  ? "bg-amber-100 text-amber-700" :
                  emp.finalStatus === "PIP Issued" ? "bg-red-100 text-red-700"    :
                  "bg-blue-100 text-blue-700"
                }`}>{emp.finalStatus}</span>
              </TD>
              <TD>{emp.hrRemarks || <span className="text-gray-300">—</span>}</TD>
              <TD center>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${emp.finalStatus === "Confirmed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {emp.finalStatus === "Confirmed" ? "Yes" : "No"}
                </span>
              </TD>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TrainerTable({ employees, incidentMap }: { employees: Employee[]; incidentMap: Map<string, RawIncidentRecord[]> }) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-[#1E99C0] text-white text-left">
          <TH>Emp ID</TH>
          <TH>Name</TH>
          <TH>Department</TH>
          <TH>Manager</TH>
          <TH>DOJ</TH>
          <TH>Tenure</TH>
          <TH>PA / PIP</TH>
          <TH>Incidents</TH>
          <TH>30d FB</TH>
          <TH>60d FB</TH>
          <TH>90d FB</TH>
          <TH right>Util M1</TH>
          <TH right>Util M2</TH>
          <TH right>Util M3</TH>
          <TH>Final Status</TH>
          <TH>HR Remarks</TH>
          <TH>Closed</TH>
        </tr>
      </thead>
      <tbody>
        {employees.map((emp, i) => {
          const incidents = incidentMap.get(emp.employeeId) ?? [];
          return (
            <tr key={emp.employeeId} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              <TD><span className="font-mono">{emp.employeeId}</span></TD>
              <TD><span className="font-semibold">{emp.name}</span></TD>
              <TD>{emp.department}</TD>
              <TD>{emp.reportingManager}</TD>
              <TD>{formatDate(emp.doj)}</TD>
              <TD center>{emp.tenureDays}d</TD>
              <TD center>
                {emp.pipStatus
                  ? <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${emp.pipStatus.type === "PIP" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{emp.pipStatus.type}</span>
                  : <span className="text-gray-400">None</span>}
              </TD>
              <TD center>{incidentSummary(incidents)}</TD>
              <TD center><FBCell received={!!emp.feedback.d30} tenureDays={emp.tenureDays} threshold={30} /></TD>
              <TD center><FBCell received={!!emp.feedback.d60} tenureDays={emp.tenureDays} threshold={60} /></TD>
              <TD center><FBCell received={!!emp.feedback.d90} tenureDays={emp.tenureDays} threshold={90} /></TD>
              <TD right><UtilCol entry={emp.utilization[0]} /></TD>
              <TD right><UtilCol entry={emp.utilization[1]} /></TD>
              <TD right><UtilCol entry={emp.utilization[2]} /></TD>
              <TD>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  emp.finalStatus === "PA Issued"  ? "bg-amber-100 text-amber-700" :
                  emp.finalStatus === "PIP Issued" ? "bg-red-100 text-red-700"    :
                  "bg-blue-100 text-blue-700"
                }`}>{emp.finalStatus}</span>
              </TD>
              <TD>{emp.hrRemarks || <span className="text-gray-300">—</span>}</TD>
              <TD center>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${emp.finalStatus === "Confirmed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {emp.finalStatus === "Confirmed" ? "Yes" : "No"}
                </span>
              </TD>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PTTable({ employees, incidentMap }: { employees: Employee[]; incidentMap: Map<string, RawIncidentRecord[]> }) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-[#1E99C0] text-white text-left">
          <TH>Emp ID</TH>
          <TH>Name</TH>
          <TH>Department</TH>
          <TH>Manager</TH>
          <TH>DOJ</TH>
          <TH>Tenure</TH>
          <TH>PA / PIP</TH>
          <TH>Incidents</TH>
          <TH>30d FB</TH>
          <TH>60d FB</TH>
          <TH>90d FB</TH>
          <TH>Final Status</TH>
          <TH>HR Remarks</TH>
          <TH>Closed</TH>
        </tr>
      </thead>
      <tbody>
        {employees.map((emp, i) => {
          const incidents = incidentMap.get(emp.employeeId) ?? [];
          return (
            <tr key={emp.employeeId} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              <TD><span className="font-mono">{emp.employeeId}</span></TD>
              <TD><span className="font-semibold">{emp.name}</span></TD>
              <TD>{emp.department}</TD>
              <TD>{emp.reportingManager}</TD>
              <TD>{formatDate(emp.doj)}</TD>
              <TD center>{emp.tenureDays}d</TD>
              <TD center>
                {emp.pipStatus
                  ? <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${emp.pipStatus.type === "PIP" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{emp.pipStatus.type}</span>
                  : <span className="text-gray-400">None</span>}
              </TD>
              <TD center>{incidentSummary(incidents)}</TD>
              <TD center><FBCell received={!!emp.feedback.d30} tenureDays={emp.tenureDays} threshold={30} /></TD>
              <TD center><FBCell received={!!emp.feedback.d60} tenureDays={emp.tenureDays} threshold={60} /></TD>
              <TD center><FBCell received={!!emp.feedback.d90} tenureDays={emp.tenureDays} threshold={90} /></TD>
              <TD>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  emp.finalStatus === "PA Issued"  ? "bg-amber-100 text-amber-700" :
                  emp.finalStatus === "PIP Issued" ? "bg-red-100 text-red-700"    :
                  "bg-blue-100 text-blue-700"
                }`}>{emp.finalStatus}</span>
              </TD>
              <TD>{emp.hrRemarks || <span className="text-gray-300">—</span>}</TD>
              <TD center>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${emp.finalStatus === "Confirmed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {emp.finalStatus === "Confirmed" ? "Yes" : "No"}
                </span>
              </TD>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── page ──────────────────────────────────────────────────────────────────

export default async function ReportPage() {
  const allEmployees = await getEmployees().catch(() => [] as Employee[]);

  // Include all non-confirmed employees (In Progress + PA Issued + PIP Issued)
  const active = allEmployees.filter(e => e.finalStatus !== "Confirmed");

  // Fetch incidents for every active employee in parallel
  const incidentResults = await Promise.allSettled(
    active.map(e => fetchIncidentData(parseInt(e.employeeId.replace(/\D/g, ""), 10)).catch(() => [] as RawIncidentRecord[]))
  );
  const incidentMap = new Map<string, RawIncidentRecord[]>();
  active.forEach((e, i) => {
    const r = incidentResults[i];
    incidentMap.set(e.employeeId, r.status === "fulfilled" ? r.value : []);
  });

  const sales   = active.filter(e => e.category === "sales");
  const trainer = active.filter(e => e.category === "trainer");
  const pt      = active.filter(e => e.category === "pt");

  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="bg-white min-h-screen p-8 text-gray-800">

      {/* Toolbar — hidden in print */}
      <div className="no-print mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1E99C0]">15-Day Performance Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">All active employees · Generated {today}</p>
        </div>
        <div className="flex items-center gap-3">
          <SendEmailButton />
          <PrintButton />
        </div>
      </div>

      {/* ── Report header (visible in print) ── */}
      <div className="mb-5 pb-4 border-b-2 border-[#28C5BE]">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold text-[#28C5BE] uppercase tracking-widest mb-0.5">Koenig Solutions · Extended Interview</p>
            <h2 className="text-2xl font-bold text-gray-800">15-Day Performance Report</h2>
          </div>
          <p className="text-xs text-gray-500">Generated: {today}</p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="mb-6 grid grid-cols-4 gap-3">
        {[
          { label: "Total Active",  value: active.length,  color: "bg-[#e6f7f5] text-[#1E99C0]" },
          { label: "Sales",         value: sales.length,   color: "bg-blue-50 text-blue-700"     },
          { label: "Trainer",       value: trainer.length, color: "bg-purple-50 text-purple-700" },
          { label: "PT Team",       value: pt.length,      color: "bg-amber-50 text-amber-700"   },
        ].map(s => (
          <div key={s.label} className={`rounded-xl px-4 py-3 ${s.color}`}>
            <p className="text-xs font-medium opacity-70">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Sales ── */}
      {sales.length > 0 && (
        <section className="mb-8 print:break-before-auto">
          <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            Sales Team
            <span className="text-xs font-normal bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{sales.length} employees</span>
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
            <SalesTable employees={sales} incidentMap={incidentMap} />
          </div>
        </section>
      )}

      {/* ── Trainer ── */}
      {trainer.length > 0 && (
        <section className="mb-8 print:break-before-page">
          <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            Trainer Team
            <span className="text-xs font-normal bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{trainer.length} employees</span>
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
            <TrainerTable employees={trainer} incidentMap={incidentMap} />
          </div>
        </section>
      )}

      {/* ── PT Team ── */}
      {pt.length > 0 && (
        <section className="mb-8 print:break-before-page">
          <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            PT Team
            <span className="text-xs font-normal bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{pt.length} employees</span>
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
            <PTTable employees={pt} incidentMap={incidentMap} />
          </div>
        </section>
      )}

      {active.length === 0 && (
        <div className="text-center py-20 text-gray-400">No active employees found.</div>
      )}
    </div>
  );
}
