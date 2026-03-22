"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { useStore } from "@/lib/store"
import type { Vehicle, TimeSlot } from "@/lib/types"
import { VEHICLE_LABELS } from "@/lib/types"

export default function ProfilePage() {
  const router = useRouter()
  const { currentUser, logout, setAvailability, getAvailability } = useAuthStore()
  const { people, addPerson, updatePerson } = useStore()

  const today = new Date().toISOString().split("T")[0]
  const [selectedDate, setSelectedDate] = useState(today)

  const linkedPerson = people.find(p => p.id === currentUser?.personId)

  const [vehicle, setVehicle] = useState<Vehicle>(linkedPerson?.vehicle ?? "none")
  const [healthNotes, setHealthNotes] = useState(linkedPerson?.healthNotes ?? "")
  const [saved, setSaved] = useState(false)

  const slots = getAvailability(currentUser?.id ?? "", selectedDate)

  const addSlot = () => {
    setAvailability(currentUser!.id, selectedDate, [...slots, { start: "09:00", end: "17:00" }])
  }

  const removeSlot = (i: number) => {
    setAvailability(currentUser!.id, selectedDate, slots.filter((_, idx) => idx !== i))
  }

  const updateSlot = (i: number, field: "start" | "end", value: string) => {
    const updated = slots.map((s, idx) => idx === i ? { ...s, [field]: value } : s)
    setAvailability(currentUser!.id, selectedDate, updated)
  }

  useEffect(() => {
    if (!currentUser) router.push("/login")
  }, [currentUser, router])
  if (!currentUser) return null

  const handleSave = () => {
    if (!currentUser.personId) return
    if (linkedPerson) {
      updatePerson({ ...linkedPerson, vehicle, healthNotes })
    } else {
      addPerson({ name: currentUser.name, gender: "M", vehicle, healthNotes, skills: [], employmentType: "employee", maxShiftsPerDay: 1 })
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLogout = () => { logout(); router.push("/login") }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage your info and availability</p>
          </div>
          <button onClick={handleLogout}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200 transition-colors">
            Logout
          </button>
        </div>

        {/* Account — read only */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Account</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Name</p>
              <p className="text-sm font-medium text-slate-800">{currentUser.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Email</p>
              <p className="text-sm font-medium text-slate-800">{currentUser.email}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Role</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                currentUser.role === "manager" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"
              }`}>
                {currentUser.role === "manager" ? "Manager" : "Staff"}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Profile Info</h2>

          <div>
            <label className="text-xs text-slate-500 font-medium mb-2 block">Vehicle</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(VEHICLE_LABELS) as Vehicle[]).map(v => (
                <button key={v} onClick={() => setVehicle(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    vehicle === v ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                  }`}>
                  {VEHICLE_LABELS[v]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 font-medium mb-2 block">Health Notes</label>
            <textarea value={healthNotes} onChange={e => setHealthNotes(e.target.value)}
              placeholder="Any health considerations for scheduling (optional)..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none" />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors">
              Save Profile
            </button>
            {saved && <span className="text-sm text-emerald-600 font-medium">✓ Saved!</span>}
          </div>
        </div>

        {/* Availability */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Availability</h2>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
          </div>
          <p className="text-xs text-slate-400">Add the time slots you are available for on this date</p>

          <div className="space-y-2">
            {slots.map((slot, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="time" value={slot.start} onChange={e => updateSlot(i, "start", e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                <span className="text-slate-400 text-sm">—</span>
                <input type="time" value={slot.end} onChange={e => updateSlot(i, "end", e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                <button onClick={() => removeSlot(i)}
                  className="text-slate-300 hover:text-red-400 text-xl leading-none ml-1">×</button>
              </div>
            ))}
            {slots.length === 0 && (
              <p className="text-xs text-slate-400">No slots added yet</p>
            )}
          </div>

          <button onClick={addSlot}
            className="text-sm text-slate-500 hover:text-slate-800 border border-dashed border-slate-300 hover:border-slate-400 px-4 py-2 rounded-lg transition-colors w-full">
            + Add time slot
          </button>
        </div>

      </div>
    </div>
  )
}
