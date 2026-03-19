"use client"

import { useState, useEffect, useCallback } from "react"
import type { Person, ShiftDef, ScheduleEntry, RoleAssignment } from "@/lib/types"
import { generateId, getDayKey, getWeekDates } from "@/lib/types"

const STORAGE_KEY = "shiftplanner-data-v2"
const API_BASE = "http://localhost:8000"

interface StoredData {
  people: Person[]
  shifts: ShiftDef[]
}

function loadFromStorage(): StoredData | null {
  if (typeof window === "undefined") return null
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) return JSON.parse(data)
  } catch {}
  return null
}

function saveToStorage(data: StoredData) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function useShiftPlanner() {
  const [people, setPeople] = useState<Person[]>([])
  const [shifts, setShifts] = useState<ShiftDef[]>([])
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [nlpExplanation, setNlpExplanation] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRefining, setIsRefining] = useState(false)

  useEffect(() => {
    const stored = loadFromStorage()
    if (stored) {
      setPeople(stored.people)
      setShifts(stored.shifts)
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) saveToStorage({ people, shifts })
  }, [people, shifts, isLoaded])

  const getAllSkills = useCallback((): string[] => {
    const skillSet = new Set<string>()
    people.forEach((p) => p.skills.forEach((s) => skillSet.add(s)))
    shifts.forEach((s) => s.roles?.forEach((r) => { if (r.required_skill) skillSet.add(r.required_skill) }))
    return Array.from(skillSet).sort()
  }, [people, shifts])

  const addPerson = useCallback(() => {
    setPeople((prev) => [...prev, { id: generateId(), name: "New Person", skills: [], availableDays: ["mon", "tue", "wed", "thu", "fri"] }])
  }, [])

  const updatePerson = useCallback((updated: Person) => {
    setPeople((prev) => prev.map((p) => p.id === updated.id ? updated : p))
  }, [])

  const removePerson = useCallback((id: string) => {
    setPeople((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const addShift = useCallback(() => {
    const today = new Date().toISOString().split("T")[0]
    setShifts((prev) => [...prev, {
      id: generateId(), name: "New Shift", start: "09:00", end: "17:00",
      date: today, category: "Morning", repeatDays: [],
      roles: [{ id: generateId(), required_skill: "", required_count: 1, notes: "" }],
    }])
  }, [])

  const updateShift = useCallback((updated: ShiftDef) => {
    setShifts((prev) => prev.map((s) => s.id === updated.id ? updated : s))
  }, [])

  const removeShift = useCallback((id: string) => {
    setShifts((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const generateSchedule = useCallback(async () => {
    setError(null)
    setNlpExplanation(null)
    setIsGenerating(true)

    if (shifts.length === 0) { setError("Please add at least one shift."); setIsGenerating(false); return }
    if (people.length === 0) { setError("Please add at least one person."); setIsGenerating(false); return }

    try {
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ people, shifts }),
      })
      const data = await res.json()

      // Convert backend response to ScheduleEntry[]
      const entries: ScheduleEntry[] = data.schedule.map((entry: any) => {
        const shift = shifts.find(s => s.id === entry.shift_id)!
        const shiftLeader = people.find(p => p.id === entry.shift_leader_id)
        const roleAssignments: RoleAssignment[] = entry.role_assignments.map((ra: any) => ({
          role: shift.roles.find(r => r.id === ra.role_id) || { id: ra.role_id, required_skill: ra.required_skill, required_count: ra.required_count, notes: ra.notes },
          assignedPeople: ra.assigned_person_ids.map((id: string) => people.find(p => p.id === id)).filter(Boolean),
          unfulfilled: ra.unfulfilled,
        }))
        return { shift, date: entry.date, shiftLeader, roleAssignments, totalUnfulfilled: entry.total_unfulfilled }
      })

      entries.sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : a.shift.start.localeCompare(b.shift.start))
      setSchedule(entries)

      const unfulfilledCount = entries.filter(e => e.totalUnfulfilled > 0).length
      setNlpExplanation(unfulfilledCount > 0
        ? `Schedule generated with ${unfulfilledCount} shift(s) not fully staffed.`
        : "Schedule generated successfully! All shifts are fully staffed.")
    } catch (err) {
      setError("Could not reach backend — is it running on port 8000?")
    } finally {
      setIsGenerating(false)
    }
  }, [shifts, people])

  const reset = useCallback(() => {
    setSchedule([])
    setError(null)
    setNlpExplanation(null)
  }, [])

  const processNlpCommand = useCallback(async (command: string) => {
    setError(null)
    setIsRefining(true)
    try {
      const res = await fetch(`${API_BASE}/api/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: command, current_schedule: schedule, people }),
      })
      const data = await res.json()
      setNlpExplanation(data.explanation)
    } catch {
      setError("Refine request failed — is the backend running?")
    } finally {
      setIsRefining(false)
    }
  }, [schedule, people])

  return {
    people, shifts, schedule, error, nlpExplanation, isLoaded, isGenerating, isRefining,
    getAllSkills, addPerson, updatePerson, removePerson,
    addShift, updateShift, removeShift, generateSchedule, reset, processNlpCommand,
  }
}
