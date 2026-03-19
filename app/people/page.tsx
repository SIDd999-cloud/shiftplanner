"use client"
import { useState, useRef, useEffect } from "react"
import { useStore } from "@/lib/store"
import { VEHICLE_LABELS } from "@/lib/types"
import type { Gender, Vehicle, Person, EmploymentType } from "@/lib/types"
interface PersonForm {
  name: string
  gender: Gender
  vehicle: Vehicle
  healthNotes: string
  skills: string[]
  employmentType: EmploymentType
  maxShiftsPerDay: number
  isOvernight: boolean
}
const BLANK: PersonForm = { name: "", gender: "M", vehicle: "none", healthNotes: "", skills: [], employmentType: "volunteer", maxShiftsPerDay: 1, isOvernight: false }
export default function PeoplePage() {
  const { people, tasks, addPerson, updatePerson, removePerson } = useStore()
  const [form, setForm] = useState<PersonForm>(BLANK)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<PersonForm>(BLANK)
  const allSkills = [...new Set([...people.flatMap(p => p.skills), ...tasks.filter(t => t.requiredSkill).map(t => t.requiredSkill!)])].sort()
  function handleAdd() {
    if (!form.name.trim()) return
    addPerson({ name: form.name.trim(), gender: form.gender, vehicle: form.vehicle, healthNotes: form.healthNotes.trim(), skills: form.skills, employmentType: form.employmentType, maxShiftsPerDay: form.maxShiftsPerDay, isOvernight: form.isOvernight })
    setForm(BLANK)
  }
  function startEdit(p: Person) {
    setEditingId(p.id)
    setEditForm({ name: p.name, gender: p.gender, vehicle: p.vehicle, healthNotes: p.healthNotes, skills: [...p.skills], employmentType: p.employmentType ?? "volunteer", maxShiftsPerDay: p.maxShiftsPerDay ?? 1, isOvernight: p.isOvernight ?? false })
  }
  function saveEdit(person: Person) {
    updatePerson({ ...person, name: editForm.name.trim(), gender: editForm.gender, vehicle: editForm.vehicle, healthNotes: editForm.healthNotes.trim(), skills: editForm.skills, employmentType: editForm.employmentType, maxShiftsPerDay: editForm.maxShiftsPerDay, isOvernight: editForm.isOvernight })
    setEditingId(null)
  }
  function SkillPicker({ skills, onChange }: { skills: string[]; onChange: (s: string[]) => void }) {
    const [open, setOpen] = useState(false)
    const [newSkill, setNewSkill] = useState("")
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
      function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
      document.addEventListener("mousedown", handler)
      return () => document.removeEventListener("mousedown", handler)
    }, [])
    function toggle(s: string) { onChange(skills.includes(s) ? skills.filter(x => x !== s) : [...skills, s]) }
    function addNew() {
      if (!newSkill.trim() || skills.includes(newSkill.trim())) return
      onChange([...skills, newSkill.trim()])
      setNewSkill("")
    }
    return (
      <div ref={ref} className="relative">
        <p className="text-xs font-medium text-slate-500 mb-1">Skills</p>
        <button type="button" onClick={() => setOpen(v => !v)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-left flex items-center justify-between hover:bg-slate-50">
          <span className="text-slate-500">{skills.length === 0 ? "Select or add skills..." : skills.length + " skill" + (skills.length > 1 ? "s" : "") + " selected"}</span>
          <span className="text-slate-400">{open ? "▲" : "▼"}</span>
        </button>
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {skills.map(s => (
              <span key={s} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 rounded px-2 py-0.5 text-xs">
                {s}
                <button type="button" onClick={() => toggle(s)} className="text-slate-400 hover:text-slate-700">x</button>
              </span>
            ))}
          </div>
        )}
        {open && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg p-2 space-y-1">
            {allSkills.length > 0 && (
              <>
                <p className="text-xs text-slate-400 px-2 pb-1">Available skills</p>
                {allSkills.map(s => (
                  <button key={s} type="button" onClick={() => toggle(s)} className={"w-full text-left px-3 py-1.5 rounded-lg text-sm flex items-center justify-between hover:bg-slate-50 " + (skills.includes(s) ? "text-slate-900 font-medium" : "text-slate-600")}>
                    {s}{skills.includes(s) && <span className="text-blue-600 text-xs">✓</span>}
                  </button>
                ))}
                <hr className="border-slate-100 my-1" />
              </>
            )}
            <p className="text-xs text-slate-400 px-2 pb-1">Add new skill</p>
            <div className="flex gap-2 px-1">
              <input value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addNew() } }} placeholder="Type new skill..." className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400" />
              <button type="button" onClick={addNew} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-700">Add</button>
            </div>
          </div>
        )}
      </div>
    )
  }
  function FormFields({ f, setF }: { f: PersonForm; setF: (x: PersonForm) => void }) {
    return (
      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">Name</p>
          <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Full name" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Gender</p>
            <div className="flex gap-2">
              {(["M", "F"] as Gender[]).map(g => (
                <button key={g} type="button" onClick={() => setF({ ...f, gender: g })} className={"flex-1 rounded-lg border py-1.5 text-sm font-semibold transition-colors " + (f.gender === g ? (g === "M" ? "bg-blue-600 border-blue-600 text-white" : "bg-rose-500 border-rose-500 text-white") : "border-slate-200 text-slate-400 hover:bg-slate-50")}>{g}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Transport</p>
            <select value={f.vehicle} onChange={e => setF({ ...f, vehicle: e.target.value as Vehicle })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {(Object.entries(VEHICLE_LABELS) as [Vehicle, string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Type</p>
            <div className="flex gap-2">
              {(["volunteer", "employee"] as EmploymentType[]).map(t => (
                <button key={t} type="button" onClick={() => setF({ ...f, employmentType: t })} className={"flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors " + (f.employmentType === t ? "bg-slate-900 border-slate-900 text-white" : "border-slate-200 text-slate-400 hover:bg-slate-50")}>
                  {t === "volunteer" ? "Volunteer" : "Employee"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Max shifts/day</p>
            <input type="number" min={1} max={4} value={f.maxShiftsPerDay} onChange={e => setF({ ...f, maxShiftsPerDay: parseInt(e.target.value) || 1 })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={f.isOvernight} onChange={e => setF({ ...f, isOvernight: e.target.checked })} />
            Can do overnight shift
          </label>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">Allergies / Conditions / Medical notes</p>
          <textarea value={f.healthNotes} onChange={e => setF({ ...f, healthNotes: e.target.value })} placeholder="e.g. pollen allergy, type 2 diabetes..." rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none" />
        </div>
        <SkillPicker skills={f.skills} onChange={s => setF({ ...f, skills: s })} />
      </div>
    )
  }
  const volunteers = people.filter(p => (p.employmentType ?? "volunteer") === "volunteer")
  const employees = people.filter(p => p.employmentType === "employee")
  function PersonCard({ person }: { person: Person }) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        {editingId === person.id ? (
          <div>
            <FormFields f={editForm} setF={setEditForm} />
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => saveEdit(person)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">Save</button>
              <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className={"w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white " + (person.gender === "M" ? "bg-blue-600" : "bg-rose-500")}>
                {person.name[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-semibold text-slate-900">{person.name}</span>
                  <span className={"text-xs font-medium px-1.5 py-0.5 rounded " + (person.gender === "M" ? "bg-blue-100 text-blue-700" : "bg-rose-100 text-rose-600")}>{person.gender}</span>
                  {person.isOvernight && <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">🌙 Overnight</span>}
                  <span className="text-xs text-slate-400">Max {person.maxShiftsPerDay ?? 1} shift/day</span>
                </div>
                {person.vehicle !== "none" && <p className="text-xs text-slate-500 mb-1">{VEHICLE_LABELS[person.vehicle]}</p>}
                {person.healthNotes && <p className="text-xs text-orange-600 bg-orange-50 border border-orange-100 rounded px-2 py-1 mb-1">Note: {person.healthNotes}</p>}
                <div className="flex flex-wrap gap-1 mt-1">
                  {person.skills.length === 0 ? <span className="text-xs text-slate-400">No skills</span> : person.skills.map(s => <span key={s} className="bg-slate-100 text-slate-700 rounded px-2 py-0.5 text-xs">{s}</span>)}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button type="button" onClick={() => startEdit(person)} className="text-xs text-slate-500 hover:text-slate-900 border border-slate-200 rounded px-2 py-1">Edit</button>
              <button type="button" onClick={() => removePerson(person.id)} className="text-xs text-red-500 hover:text-red-700 border border-red-100 rounded px-2 py-1">Remove</button>
            </div>
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-6">People Database</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Add Person</h2>
        <FormFields f={form} setF={setForm} />
        <button type="button" onClick={handleAdd} disabled={!form.name.trim()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40">Add Person</button>
      </div>
      {employees.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Employees</h2>
          <div className="flex flex-col gap-3">
            {employees.map(p => <PersonCard key={p.id} person={p} />)}
          </div>
        </div>
      )}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Volunteers {volunteers.length === 0 && people.length === 0 ? "" : "(" + (volunteers.length) + ")"}</h2>
        <div className="flex flex-col gap-3">
          {people.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No people yet. Add someone above.</p>}
          {volunteers.map(p => <PersonCard key={p.id} person={p} />)}
        </div>
      </div>
    </div>
  )
}
