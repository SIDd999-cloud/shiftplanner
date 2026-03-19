"use client"
import { useState } from "react"
import { useStore } from "@/lib/store"
import { getSkillColor, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/types"
import type { Task, Category } from "@/lib/types"
const CATEGORIES = Object.entries(CATEGORY_LABELS) as [Category, string][]
export default function TasksPage() {
  const { tasks, addTask, updateTask, removeTask } = useStore()
  const [newName, setNewName] = useState("")
  const [newSkill, setNewSkill] = useState("")
  const [newCategory, setNewCategory] = useState<Category | "">("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editSkill, setEditSkill] = useState("")
  const [editCategory, setEditCategory] = useState<Category | "">("")
  function handleAdd() {
    if (!newName.trim()) return
    addTask({ name: newName.trim(), requiredSkill: newSkill.trim() || undefined, category: newCategory || undefined })
    setNewName("")
    setNewSkill("")
    setNewCategory("")
  }
  function startEdit(task: Task) {
    setEditingId(task.id)
    setEditName(task.name)
    setEditSkill(task.requiredSkill ?? "")
    setEditCategory(task.category ?? "")
  }
  function saveEdit(task: Task) {
    if (editName.trim()) updateTask({ ...task, name: editName.trim(), requiredSkill: editSkill.trim() || undefined, category: editCategory || undefined })
    setEditingId(null)
  }
  const fixedTasks = tasks.filter(t => t.category)
  const anyTasks = tasks.filter(t => !t.category)
  const grouped = CATEGORIES.map(([cat, label]) => ({
    cat, label,
    tasks: fixedTasks.filter(t => t.category === cat)
  })).filter(g => g.tasks.length > 0)
  function TaskRow({ task }: { task: Task }) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        {editingId === task.id ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Task name</p>
              <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveEdit(task); if (e.key === "Escape") setEditingId(null) }} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Shift</p>
                <select value={editCategory} onChange={e => setEditCategory(e.target.value as Category | "")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <option value="">Any shift</option>
                  {CATEGORIES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Required skill <span className="text-slate-400">(optional)</span></p>
                <input value={editSkill} onChange={e => setEditSkill(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => saveEdit(task)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">Save</button>
              <button onClick={() => setEditingId(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={"w-2 h-2 rounded-full flex-shrink-0 " + (task.requiredSkill ? "bg-blue-500" : "bg-slate-300")} />
              <div className="min-w-0">
                <span className="font-medium text-slate-900">{task.name}</span>
                {task.requiredSkill && (
                  <span className={"ml-2 text-xs px-2 py-0.5 rounded-full border font-medium " + getSkillColor(task.requiredSkill)}>
                    {task.requiredSkill}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => startEdit(task)} className="text-xs text-slate-500 hover:text-slate-900 border border-slate-200 rounded px-2 py-1">Edit</button>
              <button onClick={() => removeTask(task.id)} className="text-xs text-red-500 hover:text-red-700 border border-red-100 rounded px-2 py-1">Remove</button>
            </div>
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Tasks Database</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Add Task</h2>
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">Task name</p>
          <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} placeholder="e.g. Helis physio, Clean kitchen..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Shift</p>
            <select value={newCategory} onChange={e => setNewCategory(e.target.value as Category | "")} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">Any shift</option>
              {CATEGORIES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Required skill <span className="text-slate-400">(optional)</span></p>
            <input value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="e.g. physio, cleaning..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
        </div>
        <button onClick={handleAdd} disabled={!newName.trim()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40">Add Task</button>
      </div>
      <div className="space-y-6">
        {tasks.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No tasks yet. Add one above.</p>}
        {anyTasks.length > 0 && (
          <div>
            <div className="inline-block text-xs font-semibold px-3 py-1 rounded-full border mb-3 bg-slate-100 border-slate-200 text-slate-600">
              Any Shift
            </div>
            <div className="flex flex-col gap-2">
              {anyTasks.map(task => <TaskRow key={task.id} task={task} />)}
            </div>
          </div>
        )}
        {grouped.map(({ cat, label, tasks: catTasks }) => (
          <div key={cat}>
            <div className={"inline-block text-xs font-semibold px-3 py-1 rounded-full border mb-3 " + CATEGORY_COLORS[cat]}>
              {label}
            </div>
            <div className="flex flex-col gap-2">
              {catTasks.map(task => <TaskRow key={task.id} task={task} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
