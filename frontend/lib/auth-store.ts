import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { User, Availability, TimeSlot } from "./types"
import { generateId } from "./types"

interface AuthStore {
  currentUser: User | null
  users: User[]
  availability: Availability[]
  login: (email: string, password: string) => boolean
  logout: () => void
  registerUser: (email: string, name: string, role: "manager" | "staff", personId?: string) => User
  setAvailability: (userId: string, date: string, slots: TimeSlot[]) => void
  getAvailability: (userId: string, date: string) => TimeSlot[]
}

// Demo users pre-caricati
const DEMO_USERS: User[] = [
  { id: "u1", email: "nick@haven.com", name: "Nick", role: "manager" },
  { id: "u2", email: "ava@haven.com", name: "Ava", role: "staff", personId: "" },
  { id: "u3", email: "sid@haven.com", name: "Sid", role: "staff", personId: "" },
]

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: DEMO_USERS,
      availability: [],

      login: (email, password) => {
        // Per ora password è sempre "haven123" per tutti
        if (password !== "haven123") return false
        const user = get().users.find(u => u.email === email)
        if (!user) return false
        set({ currentUser: user })
        return true
      },

      logout: () => set({ currentUser: null }),

      registerUser: (email, name, role, personId) => {
        const user: User = { id: generateId(), email, name, role, personId }
        set(s => ({ users: [...s.users, user] }))
        return user
      },

      setAvailability: (userId, date, categories) => {
        set(s => ({
          availability: [
            ...s.availability.filter(a => !(a.userId === userId && a.date === date)),
            { userId, date, categories }
          ]
        }))
      },

      getAvailability: (userId, date) => {
        return get().availability.find(a => a.userId === userId && a.date === date)?.categories ?? []
      },
    }),
    { name: "shiftplanner-auth" }
  )
)
