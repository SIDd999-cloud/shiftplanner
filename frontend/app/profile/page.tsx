"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { useStore } from "@/lib/store"
import type { Category, Vehicle } from "@/lib/types"
import { CATEGORY_LABELS, CATEGORY_COLORS, VEHICLE_LABELS } from "@/lib/types"

const ALL_CATEGORIES: Category[] = ["early_morning", "morning", "afternoon", "evening", "overnight"]

const SKILLS_SUGGESTIONS = [
  "Medication", "First Aid", "Dementia Care", "Driving",
  "Cooking", "Manual Handling", "End of Life", "Mental Health"
]

export default function ProfilePage() {
  const router = useRouter()
  const { currentUser, logout, setAvailability, getAvailability } = useAuthStore()
  const { people, addPerson, updatePerson } = useStore()

  const today = new Date().toISOString().split("T")[0]
  const [selectedDate, setSelectedDate] = useState(today)

  const linkedPerson = people.find(p => p.id === currentUser?.personId)

  const [skills, setSkills] = useState<string[]>(linkedPerson?.skills ?? [])
  const [vehicle, setVehicle] = useState<Vehicle>(linkedPerson?.vehicle ?? "none")
  const [healthNotes, setHealthNotes] = useState(linkedPerson?.healthNotes ?? "")
  const [newSkill, setNewSkill] = useState("")
  const [saved, setSaved] = useState(false)

  if (!currentUser) {
    router.push("/login")
    return null
  }

  const availableCategories = getAvailability(currentUser.id, selectedDate)

  const toggleCategory = (cat: Category) => {
    const current = getAvailability(currentUser.id, selectedDate)
    const updated = current.includes(cat)
      ? current.filter(c => c !== cat)
      : [...current, cat]
    setAvailability(currentUser.id, selectedDate, updated)
  }

  const handleSave = () => {
    if (!currentUser.personId) return
    if (linkedPerson) {
      updatePerson({ ...linkedPerson, skills, vehicle, healthNotes })
    } else {
      addPerson({
        name: currentUser.name,
        gender: "M",
        vehicle,
        healthNotes,
        skills,
        employmentType: "employee",
        maxShiftsPerDay: 1,
      })
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addSkill = (skill: string) => {
    const s = skill.trim()
    if (s && !skills.includes(s)) setSkills([...skills, s])
    setNewSkill("")
  }

  const removeSkill = (skill: string) => setSkills(skills.filter(s => s !== skill))

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage your info and availability</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200 transition-colors"
          >
            Logout
          </button>
        </div>

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

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Profile Info</h2>

          <div>
            <label className="text-xs text-slate-500 font-medium mb-2 block">Vehicle</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(VEHICLE_LABELS) as Vehicle[]).map(v => (
                <button
                  key={v}
                  onClick={() => setVehicle(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    vehicle === v
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  {VEHICLE_LABELS[v]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 font-medium mb-2 block">Skills</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {skills.map(skill => (
                <span key={skill} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="hover:text-red-500 ml-0.5">×</button>
                </span>
              ))}
              {skills.length === 0 && <span className="text-xs text-slate-400">No skills added yet</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SKILLS_SUGGESTIONS.filter(s => !skills.includes(s)).map(s => (
                <button key={s} onClick={() => addSkill(s)}
                  className="px-2.5 py-1 rounded-full text-xs border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                  + {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addSkill(newSkill)}
                placeholder="Add custom skill..."
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <button onClick={() => addSkill(newSkill)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm hover:bg-slate-200 border border-slate-200 transition-colors">
                Add
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 font-medium mb-2 block">Health Notes</label>
            <textarea
              value={healthNotes}
              onChange={e => setHealthNotes(e.target.value)}
              placeholder="Any health considerations for scheduling (optional)..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors">
              Save Profile
            </button>
            {saved && <span className="text-sm text-emerald-600 font-medium">✓ Saved!</span>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Availability</h2>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
          <p className="text-xs text-slate-400">Select which shifts you are available for on this date</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ALL_CATEGORIES.map(cat => {
              const active = availableCategories.includes(cat)
              return (
                <button key={cat} onClick={() => toggleCategory(cat)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    active
                      ? CATEGORY_COLORS[cat] + " ring-2 ring-offset-1 ring-current"
                      : "bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300"
                  }`}>
                  {active ? "✓ " : ""}{CATEGORY_LABELS[cat]}
                </button>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
