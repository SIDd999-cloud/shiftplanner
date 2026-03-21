# ShiftPlanner 🐾

Workforce scheduling tool for care homes. Built with Next.js, FastAPI, and Claude AI.

**Live:** https://shiftplanner-nine.vercel.app

---

## Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind, Zustand
- **Backend:** Python, FastAPI, CP-SAT solver (Google OR-Tools)
- **AI:** Anthropic Claude API — natural language schedule builder

---

## Features

- Schedule builder (Shift Leaders, Early Morning, Morning, Afternoon, Evening, Overnight)
- AI Chat panel — describe who is available and Claude fills the schedule
- People database with skills, health notes, vehicle, employment type
- Tasks database
- Calendar view
- WhatsApp export
- PDF export
- Auth system (see below)
- Generate Schedule button — calls CP-SAT solver automatically

---

## Auth System

The auth system is **built but disabled in production** (no forced redirect).

### How it works at full regime
1. Each staff member logs in with their account
2. They fill in their availability (time slots per date)
3. The manager logs in, sees all staff, and clicks "Generate Schedule"
4. The CP-SAT solver uses availability data to build an optimal schedule

### Demo accounts
| Email | Role | Password |
|-------|------|----------|
| nick@haven.com | Manager | haven123 |
| ava@haven.com | Staff | haven123 |
| sid@haven.com | Staff | haven123 |

### Why it's disabled in production
The current auth is demo-only (Zustand + localStorage). Full production auth would require:
- **PostgreSQL** — persistent user and availability storage
- **JWT or OAuth** — secure session management
- **API protection** — backend routes authenticated per user

---

## Run locally
```bash
# Backend
cd shiftplanner/backend/backend
python3 -m uvicorn main:app --reload --port 8000

# Frontend
cd shiftplanner/frontend
npm run dev
```

---

## Solver

The CP-SAT solver lives in `backend/` and is not modified by the frontend. It receives `people`, `tasks`, `date`, and `availabilities` and returns optimized `entries`.
