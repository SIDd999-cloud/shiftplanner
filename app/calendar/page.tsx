"use client"
import { useState, useMemo } from "react"
import { useStore } from "@/lib/store"
import { CATEGORY_LABELS } from "@/lib/types"
import type { Category } from "@/lib/types"
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)
const TIMELINE_START = 6 * 60
const TIMELINE_END = 24 * 60
const TIMELINE_DURATION = TIMELINE_END - TIMELINE_START
function getWeekDates(date: Date): string[] {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(date)
  mon.setDate(date.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}
function formatDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
}
function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}
function topPct(t: string) {
  return ((timeToMin(t) - TIMELINE_START) / TIMELINE_DURATION) * 100
}
function heightPct(start: string, end: string) {
  return Math.max(((timeToMin(end) - timeToMin(start)) / TIMELINE_DURATION) * 100, 3)
}
const CAT_COLOR: Record<Category, string> = {
  early_morning: "bg-amber-400 border-amber-500",
  morning: "bg-blue-400 border-blue-500",
  afternoon: "bg-emerald-400 border-emerald-500",
  evening: "bg-violet-400 border-violet-500",
}
function assignColumns(entries: any[]) {
  const sorted = [...entries].sort((a, b) => timeToMin(a.start) - timeToMin(b.start))
  const cols: number[] = []
  const endTimes: number[] = []
  return sorted.map(entry => {
    const start = timeToMin(entry.start)
    const end = timeToMin(entry.end)
    let col = 0
    for (let i = 0; i < endTimes.length; i++) {
      if (endTimes[i] <= start) { col = i; endTimes[i] = end; break }
      col = i + 1
    }
    if (col >= endTimes.length) endTimes.push(end)
    else endTimes[col] = end
    cols.push(col)
    return { ...entry, col }
  }).map(entry => ({ ...entry, totalCols: Math.max(...cols) + 1 }))
}
export default function CalendarPage() {
  const { entries, people, tasks } = useStore()
  const today = new Date().toISOString().slice(0, 10)
  const [view, setView] = useState<"day" | "week">("day")
  const [selectedDate, setSelectedDate] = useState(today)
  const weekDates = useMemo(() => getWeekDates(new Date(selectedDate + "T00:00:00")), [selectedDate])
  const personName = (id: string) => people.find(p => p.id === id)?.name ?? id
  const taskName = (id: string) => tasks.find(t => t.id === id)?.name ?? id
  const dayEntries = useMemo(() => assignColumns(entries.filter(e => e.date === selectedDate)), [entries, selectedDate])
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Calendar</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => { const d = new Date(selectedDate + "T00:00:00"); d.setDate(d.getDate() - (view === "day" ? 1 : 7)); setSelectedDate(d.toISOString().slice(0, 10)) }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">←</button>
          <button onClick={() => setSelectedDate(today)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">Today</button>
          <button onClick={() => { const d = new Date(selectedDate + "T00:00:00"); d.setDate(d.getDate() + (view === "day" ? 1 : 7)); setSelectedDate(d.toISOString().slice(0, 10)) }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">→</button>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden ml-2">
            <button onClick={() => setView("day")} className={"px-4 py-1.5 text-sm font-medium transition-colors " + (view === "day" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50")}>Day</button>
            <button onClick={() => setView("week")} className={"px-4 py-1.5 text-sm font-medium transition-colors " + (view === "week" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50")}>Week</button>
          </div>
        </div>
      </div>
      {view === "day" ? (
        <div>
          <h2 className="text-base font-semibold text-slate-700 mb-4">{formatDay(selectedDate)}{selectedDate === today ? " — Today" : ""}</h2>
          <div className="relative bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ minHeight: "720px" }}>
            {HOURS.map(h => (
              <div key={h} className="absolute left-0 right-0 border-t border-slate-100" style={{ top: `${((h * 60 - TIMELINE_START) / TIMELINE_DURATION) * 100}%` }}>
                <span className="absolute left-2 -translate-y-1/2 text-xs text-slate-400">{String(h).padStart(2, "0")}:00</span>
              </div>
            ))}
            <div className="absolute inset-0 left-14 right-2">
              {dayEntries.length === 0 && (
                <div className="flex items-center justify-center h-full text-sm text-slate-400">No entries for this day.</div>
              )}
              {dayEntries.map(entry => {
                const w = 100 / entry.totalCols
                const l = entry.col * w
                return (
                  <div
                    key={entry.id}
                    className={"absolute rounded-lg border p-2 overflow-hidden text-white shadow-sm " + CAT_COLOR[entry.category as Category]}
                    style={{ top: `${topPct(entry.start)}%`, height: `${heightPct(entry.start, entry.end)}%`, minHeight: "48px", left: `${l}%`, width: `${w - 0.5}%` }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-xs truncate">{personName(entry.personId)}</span>
                      {entry.isLeader && <span className="text-[10px] bg-white/30 rounded px-1 flex-shrink-0">★</span>}
                    </div>
                    <p className="text-[11px] opacity-90 truncate">{taskName(entry.taskId)}</p>
                    <p className="text-[10px] opacity-75">{entry.start} – {entry.end}</p>
                    <p className="text-[10px] opacity-75">{CATEGORY_LABELS[entry.category as Category]}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDates.map((date, i) => (
              <div key={date} className="text-center">
                <p className="text-xs text-slate-500">{DAYS[i]}</p>
                <button onClick={() => { setSelectedDate(date); setView("day") }} className={"w-8 h-8 mx-auto rounded-full text-sm font-semibold flex items-center justify-center transition-colors " + (date === today ? "bg-slate-900 text-white" : date === selectedDate ? "bg-slate-200 text-slate-900" : "text-slate-700 hover:bg-slate-100")}>
                  {new Date(date + "T00:00:00").getDate()}
                </button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map(date => {
              const dayEnt = assignColumns(entries.filter(e => e.date === date))
              return (
                <div key={date} className={"relative bg-white rounded-xl border overflow-hidden cursor-pointer hover:border-slate-300 transition-colors " + (date === today ? "border-slate-900" : "border-slate-200")} style={{ minHeight: "480px" }} onClick={() => { setSelectedDate(date); setView("day") }}>
                  {HOURS.map(h => (
                    <div key={h} className="absolute left-0 right-0 border-t border-slate-50" style={{ top: `${((h * 60 - TIMELINE_START) / TIMELINE_DURATION) * 100}%` }} />
                  ))}
                  {dayEnt.map(entry => {
                    const w = 100 / entry.totalCols
                    const l = entry.col * w
                    return (
                      <div key={entry.id} className={"absolute rounded p-1 overflow-hidden text-white text-[9px] " + CAT_COLOR[entry.category as Category]} style={{ top: `${topPct(entry.start)}%`, height: `${heightPct(entry.start, entry.end)}%`, minHeight: "24px", left: `${l}%`, width: `${w - 0.5}%` }} onClick={e => e.stopPropagation()}>
                        <p className="font-semibold truncate">{personName(entry.personId)}</p>
                        <p className="opacity-80 truncate">{taskName(entry.taskId)}</p>
                        <p className="opacity-70">{entry.start}–{entry.end}</p>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
