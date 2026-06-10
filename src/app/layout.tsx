export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { getEmployees } from "@/lib/data";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "EI Dashboard — 90-Day Performance Tracker",
  description: "Extended Interview performance and evaluation dashboard",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const employees = await getEmployees().catch(() => []);
  const counts = {
    sales:   employees.filter((e) => e.category === "sales").length,
    trainer: employees.filter((e) => e.category === "trainer").length,
    pt:      employees.filter((e) => e.category === "pt").length,
  };

  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full flex bg-[#F4F7FE] antialiased font-[family-name:var(--font-inter)]">
        <Sidebar counts={counts} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
