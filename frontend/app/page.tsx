


"use client"
import { useState, useRef, useEffect } from "react"
import { useStore } from "@/lib/store"
import { useAuthStore } from "@/lib/auth-store"
import { useRouter } from "next/navigation"
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

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

function newRow(): ShiftRow {
  return { id: Math.random().toString(36).slice(2), start: "", end: "", personId: "", taskId: "", note: "" }
}

// ── Time Picker ─────────────────────────────────────────────────────────────
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

// ── Row Input ───────────────────────────────────────────────────────────────
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
      <select value={row.personId} onChange={e => onUpdate("personId", e.target.value)}
        className="w-36 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
        <option value="">name...</option>
        {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {showTask && cat && (
        <select value={row.taskId} onChange={e => onUpdate("taskId", e.target.value)}
          className="w-36 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
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

// ── AI Chat Panel ───────────────────────────────────────────────────────────
function buildSystemPrompt(people: any[], tasks: any[]) {
  return `You are an AI scheduling assistant for Haven, a veterinary shelter. You help fill in the daily shift schedule.

AVAILABLE PEOPLE:
${people.map(p => `- name: "${p.name}", id: "${p.id}"${p.skills?.length ? `, skills: ${p.skills.join(", ")}` : ""}${p.healthNotes ? `, health: ${p.healthNotes}` : ""}`).join("\n")}

AVAILABLE TASKS:
${tasks.map(t => `- name: "${t.name}", id: "${t.id}"${(t as any).category ? `, category: ${(t as any).category}` : ""}`).join("\n")}

SHIFT CATEGORIES: early_morning (04:00-08:00), morning (08:00-12:00), afternoon (12:00-17:00), evening (17:00-21:00), overnight (21:00-04:00)

When the user describes who is available and their hours, respond with:
1. A brief friendly summary of what you are scheduling
2. A JSON block wrapped in <schedule> tags:

<schedule>
{
  "leaders": [
    { "personId": "...", "start": "HH:MM", "end": "HH:MM", "note": "" }
  ],
  "sections": {
    "early_morning": [{ "personId": "...", "taskId": "...", "start": "HH:MM", "end": "HH:MM", "note": "" }],
    "morning": [],
    "afternoon": [],
    "evening": [],
    "overnight": []
  },
  "notes": {
    "onDuty": "",
    "offDuty": "",
    "parvoWard": "",
    "other": ""
  }
}
</schedule>

Rules:
- Only use personId and taskId values from the lists above, never invent new ones
- Assign people to categories based on their hours (e.g. 09:00-17:00 goes into morning + afternoon)
- If someone is a leader or supervisor, add them to the leaders array as well
- Leave arrays empty [] if no one is scheduled for that section
- taskId can be empty string "" if no specific task is mentioned
- Always include all 5 section keys in sections even if empty`
}

function parseScheduleFromReply(reply: string) {
  const match = reply.match(/<schedule>([\s\S]*?)<\/schedule>/)
  if (!match) return null
  try { return JSON.parse(match[1].trim()) } catch { return null }
}

interface AIChatPanelProps {
  people: any[]
  tasks: any[]
  onApply: (data: any) => void
}

function AIChatPanel({ people, tasks, onApply }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [pendingSchedule, setPendingSchedule] = useState<any>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput("")
    setPendingSchedule(null)
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: text }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: buildSystemPrompt(people, tasks),
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      const reply: string = data.reply ?? "No response."
      setMessages(prev => [...prev, { role: "assistant", content: reply }])
      const parsed = parseScheduleFromReply(reply)
      if (parsed) setPendingSchedule(parsed)
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Error contacting AI. Check your connection and try again." }])
    } finally {
      setLoading(false)
    }
  }

  function displayContent(content: string) {
    return content.replace(/<schedule>[\s\S]*?<\/schedule>/g, "").trim()
  }

  const SUGGESTIONS = [
    "Alice 08:00-16:00, Bob 12:00-20:00, Carol overnight",
    "Who should be shift leader today?",
    "Schedule morning cleaning with available staff",
  ]

  return (
    <div className="flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden"
      style={{ height: "calc(100vh - 120px)", position: "sticky", top: "24px" }}>

      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-sm font-semibold text-slate-800">AI Assistant</span>
        <span className="ml-auto text-xs text-slate-400">{people.length} staff · {tasks.length} tasks</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="pt-4">
            <p className="text-xs text-slate-400 mb-3 text-center">Describe who is available and I'll fill the schedule</p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-xs text-slate-500 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 text-left leading-relaxed">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={"max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap " +
              (m.role === "user" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800")}>
              {displayContent(m.content)}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-xl px-4 py-2 text-slate-400 flex gap-1 items-center">
              <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
              <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
              <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Apply button */}
      {pendingSchedule && (
        <div className="px-4 py-3 border-t border-emerald-100 bg-emerald-50 flex-shrink-0">
          <p className="text-xs text-emerald-700 mb-2 font-medium">Schedule ready to apply</p>
          <button
            onClick={() => { onApply(pendingSchedule); setPendingSchedule(null) }}
            className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
            Apply to schedule ✓
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-100 flex gap-2 flex-shrink-0">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Who's available today?"
          disabled={loading}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
        />
        <button onClick={send} disabled={!input.trim() || loading}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40">
          ↑
        </button>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function SchedulePage() {
  const { people, tasks, solveSchedule, isSolving } = useStore()
  const { currentUser } = useAuthStore()
  const router = useRouter()
  if (currentUser?.role === "staff") { router.push("/profile"); return null }
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [leaders, setLeaders] = useState<ShiftRow[]>([newRow()])
  const [notes, setNotes] = useState<DailyNotes>({ onDuty: "", offDuty: "", parvoWard: "", other: "" })
  const [sections, setSections] = useState<Record<Category, ShiftRow[]>>({
    early_morning: [newRow()], morning: [newRow()], afternoon: [newRow()], evening: [newRow()], overnight: [newRow()],
  })
  const [copied, setCopied] = useState(false)
  const [aiFlash, setAiFlash] = useState(false)

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

  function handleApplySchedule(data: any) {
    if (data.leaders?.length) {
      setLeaders(data.leaders.map((r: any) => ({ ...newRow(), ...r })))
    }
    if (data.sections) {
      setSections(prev => {
        const next = { ...prev }
        for (const cat of SECTIONS) {
          if (data.sections[cat] !== undefined) {
            const rows: any[] = data.sections[cat]
            next[cat] = rows.length > 0 ? rows.map((r: any) => ({ ...newRow(), ...r })) : [newRow()]
          }
        }
        return next
      })
    }
    if (data.notes) {
      setNotes(prev => ({ ...prev, ...data.notes }))
    }
    setAiFlash(true)
    setTimeout(() => setAiFlash(false), 1200)
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
    <div className="flex gap-6 px-6 py-8 max-w-7xl mx-auto">
      {/* ── Left: Schedule Builder ── */}
      <div className={"flex-1 min-w-0 transition-all duration-500 rounded-xl " + (aiFlash ? "ring-2 ring-emerald-400" : "")}>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">🐾</span>
            <h1 className="text-xl font-bold text-slate-900">Haven schedule builder</h1>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
          </div>
          <button onClick={() => solveSchedule(date)} disabled={isSolving}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2">
            {isSolving ? <span className="animate-spin">⏳</span> : "✨"} Generate Schedule
          </button>
          <button onClick={handleReset}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50">
            Reset
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Shift Leaders</h2>
          {leaders.map(row => (
            <RowInput key={row.id} row={row} people={people} tasks={tasks}
              onUpdate={(f, v) => updateLeader(row.id, f, v)}
              onRemove={() => setLeaders(l => l.filter(r => r.id !== row.id))}
              showTask={false} />
          ))}
          <button onClick={() => setLeaders(l => [...l, newRow()])}
            className="text-sm text-slate-400 hover:text-slate-700 mt-1">+ add row</button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Daily Notes</h2>
          <div className="space-y-2">
            {(["onDuty", "offDuty", "parvoWard", "other"] as const).map(key => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-sm text-slate-500 w-24 flex-shrink-0">
                  {key === "onDuty" ? "On duty:" : key === "offDuty" ? "Off duty:" : key === "parvoWard" ? "Parvo ward:" : "Other:"}
                </span>
                <input value={notes[key]} onChange={e => setNotes(n => ({ ...n, [key]: e.target.value }))}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
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
              <RowInput key={row.id} row={row} people={people} tasks={tasks}
                onUpdate={(f, v) => updateRow(cat, row.id, f, v)}
                onRemove={() => setSections(s => ({ ...s, [cat]: s[cat].filter(r => r.id !== row.id) }))}
                showTask={true} cat={cat} />
            ))}
            <button onClick={() => setSections(s => ({ ...s, [cat]: [...s[cat], newRow()] }))}
              className="text-sm text-slate-400 hover:text-slate-700 mt-1">+ add row</button>
          </div>
        ))}

        <button onClick={handleCopyWhatsApp}
          className="w-full rounded-xl bg-slate-900 px-6 py-4 text-base font-semibold text-white hover:bg-slate-700 transition-colors mt-2">
          {copied ? "✓ Copied to clipboard!" : "Generate WhatsApp schedule ↗"}
        </button>
      </div>

      {/* ── Right: AI Chat ── */}
      <div className="w-80 flex-shrink-0">
        <AIChatPanel people={people} tasks={tasks} onApply={handleApplySchedule} />
      </div>
    </div>
  )
}
