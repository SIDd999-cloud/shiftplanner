import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Navbar from "./navbar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ShiftPlanner",
  description: "Workforce scheduling for care homes",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 min-h-screen`}>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  )
}
