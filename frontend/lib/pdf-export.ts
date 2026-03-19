import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type { Person, Task, ScheduleEntry } from "./types"
import { CATEGORY_LABELS } from "./types"
const CATEGORY_ORDER = ["early_morning", "morning", "afternoon", "evening"]
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
}
export function exportScheduleToPdf(entries: ScheduleEntry[], people: Person[], tasks: Task[]) {
  const doc = new jsPDF()
  const personName = (id: string) => people.find(p => p.id === id)?.name ?? id
  const taskName = (id: string) => tasks.find(t => t.id === id)?.name ?? id
  const dates = [...new Set(entries.map(e => e.date))].sort()
  let y = 16
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text("ShiftPlanner — Schedule", 14, y)
  y += 10
  for (const date of dates) {
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(15, 23, 42)
    doc.text(formatDate(date), 14, y)
    y += 6
    const dateEntries = entries.filter(e => e.date === date)
    for (const cat of CATEGORY_ORDER) {
      const catEntries = dateEntries.filter(e => e.category === cat)
      if (catEntries.length === 0) continue
      const leader = catEntries.find(e => e.isLeader)
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(71, 85, 105)
      doc.text(CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS].toUpperCase() + " SHIFT", 14, y)
      y += 5
      if (leader) {
        doc.setFontSize(10)
        doc.setFont("helvetica", "italic")
        doc.setTextColor(100, 116, 139)
        doc.text("Leader: " + personName(leader.personId), 14, y)
        y += 5
      }
      autoTable(doc, {
        startY: y,
        head: [["Person", "Task", "Start", "End"]],
        body: catEntries.map(e => [
          personName(e.personId) + (e.isLeader ? " ★" : ""),
          taskName(e.taskId),
          e.start,
          e.end,
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [15, 23, 42] },
        margin: { left: 14 },
      })
      y = (doc as any).lastAutoTable.finalY + 6
    }
    y += 4
    if (y > 260) { doc.addPage(); y = 16 }
  }
  doc.save("schedule.pdf")
}
