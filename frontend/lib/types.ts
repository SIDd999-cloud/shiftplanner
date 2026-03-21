export type Gender = "M" | "F"
export type Vehicle = "car" | "scooter" | "motorcycle" | "bicycle" | "none"
export type EmploymentType = "volunteer" | "employee"
export type Category = "early_morning" | "morning" | "afternoon" | "evening" | "overnight"
export interface Person {
  id: string
  name: string
  gender: Gender
  vehicle: Vehicle
  healthNotes: string
  skills: string[]
  employmentType: EmploymentType
  maxShiftsPerDay: number
}
export interface Task {
  id: string
  name: string
  requiredSkill?: string
  category?: Category
}
export interface ScheduleEntry {
  id: string
  personId: string
  date: string
  start: string
  end: string
  taskId: string
  category: Category
  isLeader: boolean
  isOvernight: boolean
}
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}
export function categoryFromTime(start: string): Category {
  const [h] = start.split(":").map(Number)
  const minutes = h * 60
  if (minutes >= 4 * 60 && minutes < 9 * 60) return "early_morning"
  if (minutes >= 9 * 60 && minutes < 13 * 60) return "morning"
  if (minutes >= 13 * 60 && minutes < 17 * 60) return "afternoon"
  if (minutes >= 17 * 60 && minutes < 21 * 60) return "evening"
  return "overnight"
}
export const CATEGORY_LABELS: Record<Category, string> = {
  early_morning: "Early Morning",
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  overnight: "Overnight",
}
export const CATEGORY_COLORS: Record<Category, string> = {
  early_morning: "bg-amber-100 border-amber-200 text-amber-800",
  morning: "bg-blue-100 border-blue-200 text-blue-800",
  afternoon: "bg-emerald-100 border-emerald-200 text-emerald-800",
  evening: "bg-violet-100 border-violet-200 text-violet-800",
  overnight: "bg-slate-100 border-slate-300 text-slate-700",
}
export const VEHICLE_LABELS: Record<Vehicle, string> = {
  car: "Car",
  scooter: "Scooter",
  motorcycle: "Motorcycle",
  bicycle: "Bicycle",
  none: "None",
}
export function getSkillColor(skill: string): string {
  const colors = [
    "bg-blue-100 text-blue-700 border-blue-200",
    "bg-emerald-100 text-emerald-700 border-emerald-200",
    "bg-orange-100 text-orange-700 border-orange-200",
    "bg-rose-100 text-rose-700 border-rose-200",
    "bg-violet-100 text-violet-700 border-violet-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-teal-100 text-teal-700 border-teal-200",
  ]
  let hash = 0
  for (let i = 0; i < skill.length; i++) hash = skill.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

// ── Auth & Users ─────────────────────────────────────────────────────────────
export type Role = "manager" | "staff"

export interface User {
  id: string
  email: string
  name: string
  role: Role
  personId?: string  // collegato al Person nel database
}

export interface TimeSlot {
  start: string  // "09:00"
  end: string    // "12:00"
}

export interface Availability {
  userId: string
  date: string
  slots: TimeSlot[]  // es. [{start:"09:00", end:"12:00"}, {start:"15:00", end:"17:00"}]
}
