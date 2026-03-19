"use client"
import { useState, useRef, useEffect } from "react"
import { useStore } from "@/lib/store"
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/types"
import type { Category } from "@/lib/types"

const SECTIONS: Category[] = ["early_morning", "morning", "afternoon", "evening", "overnight"]

const TIME_SLOTS = [
  "04:00","04:30","05:00","05:30","06:00","06:30","07:00","07:30",
  "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30",
  "20:00","20:30","21:00","21:30","22:00","22:30","23:00","23:30","00:00"
]

interface ShiftRow {
  id: string
  start: string
  end: string
  personId: string
  taskId: string
  note: string
}

interface DailyNotes {
  onDuty: string
  offDuty: string
  parvoWard: string
  other: string
}

function newRow(): ShiftRow {
  return { id: Math.random().toString(36).slice(2), start: "", end: "", personId: "", taskId: "", note: "" }
}

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="--:--"
        className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 text-center"
      />
      {open && (
        <div className="absolute z-50 top-9 left-0 bg-white border border-slate-200 rounded-xl shadow-xl p-2 grid grid-cols-4 gap-1 w-52">
          {TIME_SLOTS.map(t => (
            <button key={t} type="button" onMouseDown={e => { e.preventDefault(); onChange(t); setOpen(false) }}
              className={"rounded-lg px-2 py-1 text-xs font-medium transition-colors " + (value === t ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-700")}>
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface RowInputProps {
  row: ShiftRow
  onUpdate: (f: keyof ShiftRow, v: string) => void
  onRemove: () => void
  showTask?: boolean
  cat?: Category
  people: { id: string; name: string }[]
  tasks: { id: string; name: string; category?: Category }[]
}

function RowInput({ row, onUpdate, onRemove, showTask, cat, people, tasks }: RowInputProps) {
  const tasksByCat = tasks.filter(t => !t.category || t.category === cat)
  return (
    <div className="flex items-center gap-2 mb-2 flex-wrap">
      <TimePicker value={row.start} onChange={v => onUpdate("start", v)} />
      <span className="text-slate-300">–</span>
      <TimePicker value={row.end} onChange={v => onUpdate("end", v)} />
      <select value={row.personId} onChange={e => onUpdate("personId", e.target.value)} className="w-36 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
        <option value="">name...</option>
        {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {showTask && cat && (
        <select value={row.taskId} onChange={e => onUpdate("taskId", e.target.value)} className="w-36 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
          <option value="">task...</option>
          {tasksByCat.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      )}
      <input
        value={row.note}
        onChange={e => onUpdate("note", e.target.value)}
        placeholder="note (optional)"
        className="flex-1 min-w-32 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
      />
      <button onClick={onRemove} className="text-slate-300 hover:text-red-400 text-xl leading-none">×</button>
    </div>
  )
}

export default function SchedulePage() {
  const { people, tasks } = useStore()
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [leaders, setLeaders] = useState<ShiftRow[]>([newRow()])
  const [notes, setNotes] = useState<DailyNotes>({ onDuty: "", offDuty: "", parvoWard: "", other: "" })
  const [sections, setSections] = useState<Record<Category, ShiftRow[]>>({
    early_morning: [newRow()], morning: [newRow()], afternoon: [newRow()], evening: [newRow()], overnight: [newRow()],
  })
  const [copied, setCopied] = useState(false)

  const personName = (id: string) => people.find(p => p.id === id)?.name ?? ""
  const taskName = (id: string) => tasks.find(t => t.id === id)?.name ?? ""

  function updateLeader(id: string, field: keyof ShiftRow, value: string) {
    setLeaders(rows => rows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }
  function updateRow(cat: Category, id: string, field: keyof ShiftRow, value: string) {
    setSections(s => ({ ...s, [cat]: s[cat].map(r => r.id === id ? { ...r, [field]: value } : r) }))
  }
  function handleReset() {
    setLeaders([newRow()])
    setNotes({ onDuty: "", offDuty: "", parvoWard: "", other: "" })
    setSections({ early_morning: [newRow()], morning: [newRow()], afternoon: [newRow()], evening: [newRow()], overnight: [newRow()] })
  }
  function generateWhatsApp(): string {
    const d = new Date(date + "T00:00:00")
    const dayStr = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
    let text = "*" + dayStr + " – Haven Schedule*\n\n"
    const validLeaders = leaders.filter(r => r.personId || r.start)
    if (validLeaders.length > 0) {
      text += "*SHIFT LEADERS*\n"
      validLeaders.forEach(r => {
        text += "• " + (r.start || "...") + "–" + (r.end || "...") + " " + (personName(r.personId) || "?")
        if (r.note) text += " (" + r.note + ")"
        text += "\n"
      })
      text += "\n"
    }
    if (notes.onDuty) text += "On: " + notes.onDuty + "\n"
    if (notes.offDuty) text += "Off duty: " + notes.offDuty + "\n"
    if (notes.parvoWard) text += "Parvo ward: " + notes.parvoWard + "\n"
    if (notes.other) text += notes.other + "\n"
    if (notes.onDuty || notes.offDuty || notes.parvoWard || notes.other) text += "\n"
    SECTIONS.forEach(cat => {
      const valid = sections[cat].filter(r => r.personId || r.start)
      if (valid.length === 0) return
      text += "*" + CATEGORY_LABELS[cat].toUpperCase() + "*\n"
      valid.forEach(r => {
        text += "• " + (r.start || "...") + "–" + (r.end || "...") + " " + (personName(r.personId) || "?")
        if (r.taskId) text += " (" + taskName(r.taskId) + ")"
        else if (r.note) text += " (" + r.note + ")"
        text += "\n"
      })
      text += "\n"
    })
    return text.trim()
  }
  function handleCopyWhatsApp() {
    navigator.clipboard.writeText(generateWhatsApp())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">🐾</span>
          <h1 className="text-xl font-bold text-slate-900">Haven schedule builder</h1>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
        </div>
        <button onClick={handleReset} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50">Reset</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Shift Leaders</h2>
        {leaders.map(row => (
          <RowInput key={row.id} row={row} people={people} tasks={tasks} onUpdate={(f, v) => updateLeader(row.id, f, v)} onRemove={() => setLeaders(l => l.filter(r => r.id !== row.id))} showTask={false} />
        ))}
        <button onClick={() => setLeaders(l => [...l, newRow()])} className="text-sm text-slate-400 hover:text-slate-700 mt-1">+ add row</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Daily Notes</h2>
        <div className="space-y-2">
          {(["onDuty", "offDuty", "parvoWard", "other"] as const).map(key => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-sm text-slate-500 w-24 flex-shrink-0">
                {key === "onDuty" ? "On duty:" : key === "offDuty" ? "Off duty:" : key === "parvoWard" ? "Parvo ward:" : "Other:"}
              </span>
              <input value={notes[key]} onChange={e => setNotes(n => ({ ...n, [key]: e.target.value }))} className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
          ))}
        </div>
      </div>

      {SECTIONS.map(cat => (
        <div key={cat} className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
          <h2 className="mb-4">
            <span className={"inline-block px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-widest " + CATEGORY_COLORS[cat]}>
              {CATEGORY_LABELS[cat]}
            </span>
          </h2>
          {sections[cat].map(row => (
            <RowInput key={row.id} row={row} people={people} tasks={tasks} onUpdate={(f, v) => updateRow(cat, row.id, f, v)} onRemove={() => setSections(s => ({ ...s, [cat]: s[cat].filter(r => r.id !== row.id) }))} showTask={true} cat={cat} />
          ))}
          <button onClick={() => setSections(s => ({ ...s, [cat]: [...s[cat], newRow()] }))} className="text-sm text-slate-400 hover:text-slate-700 mt-1">+ add row</button>
        </div>
      ))}

      <button onClick={handleCopyWhatsApp} className="w-full rounded-xl bg-slate-900 px-6 py-4 text-base font-semibold text-white hover:bg-slate-700 transition-colors mt-2">
        {copied ? "✓ Copied to clipboard!" : "Generate WhatsApp schedule ↗"}
      </button>
    </div>
  )
}
