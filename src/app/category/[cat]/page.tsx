export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getEmployees } from "@/lib/data";
import { categoryLabel } from "@/lib/utils";
import { EmployeeCategory } from "@/types/employee";
import EmployeeTable from "@/components/employee-list/EmployeeTable";

const VALID_CATEGORIES: EmployeeCategory[] = ["sales", "trainer", "pt"];


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
    <div className="p-6">
      <EmployeeTable employees={employees} />
    </div>
  );
}

export function generateStaticParams() {
  return VALID_CATEGORIES.map((cat) => ({ cat }));
}
