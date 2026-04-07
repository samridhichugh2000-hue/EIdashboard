import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { MOCK_EMPLOYEES } from "@/lib/mock-data";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EI Dashboard — 90-Day Performance Tracker",
  description: "Extended Interview performance and evaluation dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const employees = MOCK_EMPLOYEES;
  const counts = {
    sales:   employees.filter((e) => e.category === "sales").length,
    trainer: employees.filter((e) => e.category === "trainer").length,
    pt:      employees.filter((e) => e.category === "pt").length,
  };

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="h-full flex bg-[#e6f7f5] antialiased">
        <Sidebar counts={counts} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
