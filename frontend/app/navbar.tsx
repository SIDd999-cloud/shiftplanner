"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"

export default function Navbar() {
  const { currentUser, logout } = useAuthStore()
  const router = useRouter()

  if (!currentUser) return null

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-6">
      <span className="font-bold text-slate-900 text-lg">ShiftPlanner</span>

      {currentUser.role === "manager" && (
        <>
          <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">Schedule</Link>
          <Link href="/people" className="text-sm text-slate-600 hover:text-slate-900">People</Link>
          <Link href="/tasks" className="text-sm text-slate-600 hover:text-slate-900">Tasks</Link>
          <Link href="/calendar" className="text-sm text-slate-600 hover:text-slate-900">Calendar</Link>
        </>
      )}

      {currentUser.role === "staff" && (
        <Link href="/profile" className="text-sm text-slate-600 hover:text-slate-900">My Profile</Link>
      )}

      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm text-slate-500">{currentUser.name}</span>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200 transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}
