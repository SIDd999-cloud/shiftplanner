"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"

export default function LoginPage() {
  const { login } = useAuthStore()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  function handleLogin() {
    if (!email || !password) { setError("Fill in all fields."); return }
    const ok = login(email, password)
    if (!ok) { setError("Invalid email or password."); return }
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 w-full max-w-sm shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">🐾</span>
          <h1 className="text-xl font-bold text-slate-900">ShiftPlanner</h1>
        </div>
        <p className="text-sm text-slate-500 mb-6">Sign in to your account</p>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Email</p>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Password</p>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
          >
            Sign in
          </button>
        </div>
        <div className="mt-6 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-400 font-medium mb-1">Demo accounts:</p>
          <p className="text-xs text-slate-500">nick@haven.com — manager</p>
          <p className="text-xs text-slate-500">ava@haven.com — staff</p>
          <p className="text-xs text-slate-500 mb-1">sid@haven.com — staff</p>
          <p className="text-xs text-slate-400">Password: <span className="font-medium">haven123</span></p>
        </div>
      </div>
    </div>
  )
}
