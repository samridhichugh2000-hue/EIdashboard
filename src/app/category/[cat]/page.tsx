import { notFound } from "next/navigation";
import { getEmployees } from "@/lib/data";
import { categoryLabel } from "@/lib/utils";
import { EmployeeCategory } from "@/types/employee";
import EmployeeTable from "@/components/employee-list/EmployeeTable";

const VALID_CATEGORIES: EmployeeCategory[] = ["sales", "trainer", "pt"];

const CATEGORY_GRADIENTS: Record<string, string> = {
  sales:   "from-[#28C5BE] to-[#1E99C0]",
  trainer: "from-[#6C63FF] to-[#4F46E5]",
  pt:      "from-[#F59E0B] to-[#D97706]",
};

interface CategoryPageProps { params: Promise<{ cat: string }>; }

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { cat } = await params;
  if (!VALID_CATEGORIES.includes(cat as EmployeeCategory)) notFound();

  const category = cat as EmployeeCategory;
  const employees = await getEmployees(category);

  return (
    <div className="flex-1 p-6 space-y-5">
      <div className={`rounded-2xl bg-gradient-to-r ${CATEGORY_GRADIENTS[category]} px-6 py-5 shadow-md`}>
        <h2 className="text-2xl font-bold text-white">{categoryLabel(category)}</h2>
        <p className="text-sm text-white/70 mt-1">
          {employees.length} employee{employees.length !== 1 ? "s" : ""} in Extended Interview
        </p>
      </div>
      <EmployeeTable employees={employees} />
    </div>
  );
}

export function generateStaticParams() {
  return VALID_CATEGORIES.map((cat) => ({ cat }));
}
