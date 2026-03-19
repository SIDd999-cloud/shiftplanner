"use client"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Person, Task, ScheduleEntry, Category } from "./types"
import { generateId } from "./types"
interface Store {
  people: Person[]
  tasks: Task[]
  entries: ScheduleEntry[]
  isSolving: boolean
  addPerson: (person: Omit<Person, "id">) => void
  updatePerson: (person: Person) => void
  removePerson: (id: string) => void
  addTask: (task: Omit<Task, "id">) => void
  updateTask: (task: Task) => void
  removeTask: (id: string) => void
  addEntry: (entry: Omit<ScheduleEntry, "id">) => void
  updateEntry: (entry: ScheduleEntry) => void
  removeEntry: (id: string) => void
  getEntriesForDate: (date: string) => ScheduleEntry[]
  getEntriesForDateAndCategory: (date: string, category: Category) => ScheduleEntry[]
  resetSchedule: (date: string) => void
  resetAllEntries: () => void
  solveSchedule: (date: string) => Promise<string | null>
}
export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      people: [],
      tasks: [],
      entries: [],
      isSolving: false,
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
      solveSchedule: async (date) => {
        const { people, tasks } = get()
        if (people.length === 0 || tasks.length === 0) return "Add people and tasks first."
        set({ isSolving: true })
        try {
          const res = await fetch("http://localhost:8000/api/solve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ people, tasks, date }),
          })
          if (!res.ok) return "Error: " + await res.text()
          const data = await res.json()
          set((s) => ({ entries: [...s.entries.filter((e) => e.date !== date), ...data.entries] }))
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
