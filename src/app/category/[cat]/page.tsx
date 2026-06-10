export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getEmployees } from "@/lib/data";
import { categoryLabel } from "@/lib/utils";
import { EmployeeCategory } from "@/types/employee";
import EmployeeTable from "@/components/employee-list/EmployeeTable";
import DateRangeFilter from "@/components/DateRangeFilter";

const VALID_CATEGORIES: EmployeeCategory[] = ["sales", "trainer", "pt"];

const CATEGORY_DOTS: Record<string, string> = {
  sales:   "bg-teal-500",
  trainer: "bg-violet-500",
  pt:      "bg-amber-500",
};

interface CategoryPageProps {
  params: Promise<{ cat: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { cat } = await params;
  if (!VALID_CATEGORIES.includes(cat as EmployeeCategory)) notFound();

  const { from, to } = await searchParams;
  const category = cat as EmployeeCategory;
  const all = await getEmployees(category);

  const employees = all.filter((e) => {
    if (from && e.doj < from) return false;
    if (to   && e.doj > to)   return false;
    return true;
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${CATEGORY_DOTS[category]}`} />
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{employees.length} employees</p>
            {(from || to) && <p className="text-[10px] text-gray-400 mt-0.5">Date filtered</p>}
          </div>
        </div>
        <Suspense>
          <DateRangeFilter />
        </Suspense>
      </div>
      <EmployeeTable employees={employees} />
    </div>
  );
}

export function generateStaticParams() {
  return VALID_CATEGORIES.map((cat) => ({ cat }));
}
