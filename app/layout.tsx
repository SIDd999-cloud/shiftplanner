import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Link from "next/link"
const inter = Inter({ subsets: ["latin"] })
export const metadata: Metadata = {
  title: "ShiftPlanner",
  description: "Workforce scheduling for care homes",
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 min-h-screen`}>
        <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-6">
          <span className="font-bold text-slate-900 text-lg">ShiftPlanner</span>
          <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">Schedule</Link>
          <Link href="/people" className="text-sm text-slate-600 hover:text-slate-900">People</Link>
          <Link href="/tasks" className="text-sm text-slate-600 hover:text-slate-900">Tasks</Link>
          <Link href="/calendar" className="text-sm text-slate-600 hover:text-slate-900">Calendar</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}
