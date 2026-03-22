"use client"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Person, Task, ScheduleEntry, Category } from "./types"
import { generateId } from "./types"
import { useAuthStore } from "./auth-store"

// ── Schedule form types ───────────────────────────────────────────────────────

export interface ShiftRow {
  id: string
  start: string
  end: string
  personId: string
  taskId: string
  note: string
}

export interface DailyNotes {
  onDuty: string
  offDuty: string
  parvoWard: string
  other: string
}

export function newRow(): ShiftRow {
  return { id: generateId(), start: "", end: "", personId: "", taskId: "", note: "" }
}

const emptySections = (): Record<Category, ShiftRow[]> => ({
  early_morning: [newRow()],
  morning: [newRow()],
  afternoon: [newRow()],
  evening: [newRow()],
  overnight: [newRow()],
})

const emptyNotes = (): DailyNotes => ({
  onDuty: "", offDuty: "", parvoWard: "", other: ""
})

// ── Store interface ───────────────────────────────────────────────────────────

interface Store {
  // Data
  people: Person[]
  tasks: Task[]
  entries: ScheduleEntry[]
  isSolving: boolean

  // Schedule form state (persisted)
  scheduleDate: string
  leaders: ShiftRow[]
  notes: DailyNotes
  sections: Record<Category, ShiftRow[]>

  // People actions
  addPerson: (person: Omit<Person, "id">) => void
  updatePerson: (person: Person) => void
  removePerson: (id: string) => void

  // Task actions
  addTask: (task: Omit<Task, "id">) => void
  updateTask: (task: Task) => void
  removeTask: (id: string) => void

  // Entry actions
  addEntry: (entry: Omit<ScheduleEntry, "id">) => void
  updateEntry: (entry: ScheduleEntry) => void
  removeEntry: (id: string) => void
  getEntriesForDate: (date: string) => ScheduleEntry[]
  getEntriesForDateAndCategory: (date: string, category: Category) => ScheduleEntry[]
  resetSchedule: (date: string) => void
  resetAllEntries: () => void

  // Schedule form actions
  setScheduleDate: (date: string) => void
  setLeaders: (leaders: ShiftRow[] | ((prev: ShiftRow[]) => ShiftRow[])) => void
  setNotes: (notes: DailyNotes) => void
  setSections: (sections: Record<Category, ShiftRow[]> | ((prev: Record<Category, ShiftRow[]>) => Record<Category, ShiftRow[]>)) => void
  resetForm: () => void

  // Solver
  solveSchedule: (date: string) => Promise<string | null>
}

// ── Store implementation ──────────────────────────────────────────────────────

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      people: [],
      tasks: [],
      entries: [],
      isSolving: false,
      scheduleDate: new Date().toISOString().slice(0, 10),
      leaders: [newRow()],
      notes: emptyNotes(),
      sections: emptySections(),

      addPerson: (personData) =>
        set((s) => ({ people: [...s.people, { id: generateId(), ...personData }] })),
      updatePerson: (person) =>
        set((s) => ({ people: s.people.map((p) => (p.id === person.id ? person : p)) })),
      removePerson: (id) =>
        set((s) => ({ people: s.people.filter((p) => p.id !== id) })),

      addTask: (taskData) =>
        set((s) => ({ tasks: [...s.tasks, { id: generateId(), ...taskData }] })),
      updateTask: (task) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === task.id ? task : t)) })),
      removeTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      addEntry: (entry) =>
        set((s) => ({ entries: [...s.entries, { ...entry, id: generateId() }] })),
      updateEntry: (entry) =>
        set((s) => ({ entries: s.entries.map((e) => (e.id === entry.id ? entry : e)) })),
      removeEntry: (id) =>
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      getEntriesForDate: (date) =>
        get().entries.filter((e) => e.date === date),
      getEntriesForDateAndCategory: (date, category) =>
        get().entries.filter((e) => e.date === date && e.category === category),
      resetSchedule: (date) =>
        set((s) => ({ entries: s.entries.filter((e) => e.date !== date) })),
      resetAllEntries: () => set({ entries: [] }),

      setScheduleDate: (date) => set({ scheduleDate: date }),
      setLeaders: (leaders) =>
        set((s) => ({ leaders: typeof leaders === "function" ? leaders(s.leaders) : leaders })),
      setNotes: (notes) => set({ notes }),
      setSections: (sections) =>
        set((s) => ({ sections: typeof sections === "function" ? sections(s.sections) : sections })),
      resetForm: () => set({ leaders: [newRow()], notes: emptyNotes(), sections: emptySections() }),

      solveSchedule: async (date) => {
        const { people, tasks } = get()
        if (people.length === 0 || tasks.length === 0) return "Add people and tasks first."
        set({ isSolving: true })
        try {
          const res = await fetch("http://localhost:8000/api/solve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              people,
              tasks,
              date,
              availabilities: useAuthStore.getState().availability,
            }),
          })
          if (!res.ok) return "Error: " + await res.text()
          const data = await res.json()

          // Save entries to store
          set((s) => ({ entries: [...s.entries.filter((e) => e.date !== date), ...data.entries] }))

          // Convert entries to form rows
          const newSections = emptySections()
          const newLeaders: ShiftRow[] = []

          for (const entry of data.entries) {
            const row: ShiftRow = {
              id: entry.id,
              start: entry.start,
              end: entry.end,
              personId: entry.personId,
              taskId: entry.taskId,
              note: "",
            }
            if (entry.isLeader) {
              newLeaders.push(row)
            } else {
              const cat = entry.category as Category
              if (newSections[cat]) {
                // Replace the empty placeholder row
                if (newSections[cat].length === 1 && !newSections[cat][0].personId) {
                  newSections[cat] = [row]
                } else {
                  newSections[cat].push(row)
                }
              }
            }
          }

          set({
            leaders: newLeaders.length > 0 ? newLeaders : [newRow()],
            sections: newSections,
          })

          return null
        } catch (e) {
          return "Could not connect to backend."
        } finally {
          set({ isSolving: false })
        }
      },
    }),
    { name: "shiftplanner-store" }
  )
)
