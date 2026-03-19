# ShiftPlanner 🐾

Daily shift scheduling app for Haven, a veterinary shelter.
Built for the manager who builds the schedule every morning and sends it via WhatsApp.

## What it does
- Build the daily schedule visually (Shift Leaders, Morning, Afternoon, Evening, Overnight)
- AI Chat Assistant — describe who's available and the AI fills the schedule automatically
- Generate a WhatsApp-ready message with one click
- Manage staff database (volunteers + employees) with skills and health notes
- Manage tasks database with categories
- Export schedule as PDF
- Calendar view (daily + weekly)

## Tech Stack
- **Frontend** — Next.js 16, React, TypeScript, Tailwind CSS
- **Backend** — Python, FastAPI, Uvicorn
- **AI** — Anthropic Claude API

## How to run locally

**Backend:**
```bash
cd backend/backend
python3 -m uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000
