import sys
import os
import json

import anthropic

# Ensure project root is on sys.path so solver/core/constraints_model imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from collections import defaultdict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI(title="ShiftPlanner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class Person(BaseModel):
    id: str
    name: str
    skills: list[str]
    availableDays: list[str] = []          # ["mon", "tue", ...]
    availability: dict[str, str] = {}
    max_hours_per_day: float = 8.0
    min_rest_minutes: int = 30


class Role(BaseModel):
    id: str
    required_skill: str
    required_count: int = 1
    notes: str = ""


class ShiftDef(BaseModel):
    id: str
    name: str
    start: str
    end: str
    date: str = "2026-01-01"
    category: str = "Morning"
    shiftLeaderId: str = ""
    repeatDays: list[str] = []
    roles: list[Role] = []


class GenerateRequest(BaseModel):
    people: list[Person]
    shifts: list[ShiftDef]


class RoleAssignmentOut(BaseModel):
    role_id: str
    required_skill: str
    required_count: int
    notes: str
    assigned_person_ids: list[str]
    unfulfilled: int


class ScheduleEntryOut(BaseModel):
    shift_id: str
    date: str
    shift_leader_id: str = ""
    role_assignments: list[RoleAssignmentOut]
    total_unfulfilled: int


class GenerateResponse(BaseModel):
    schedule: list[ScheduleEntryOut]


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@app.post("/api/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    if not req.shifts:
        return GenerateResponse(schedule=[])

    DAY_MAP = {"sun": 0, "mon": 1, "tue": 2, "wed": 3, "thu": 4, "fri": 5, "sat": 6}

    from datetime import date as dt_date
    def get_day_key(date_str: str) -> str:
        d = dt_date.fromisoformat(date_str)
        return ["sun","mon","tue","wed","thu","fri","sat"][d.weekday() + 1 if d.weekday() < 6 else 0]

    # Expand shifts based on repeatDays
    from datetime import date as dt_date, timedelta
    today = dt_date.today()
    week_dates = [(today + timedelta(days=i)).isoformat() for i in range(7)]

    expanded = []  # (shift, date)
    for shift in req.shifts:
        expanded.append((shift, shift.date))
        for d in week_dates:
            if d != shift.date:
                day_key = get_day_key(d)
                if day_key in shift.repeatDays:
                    expanded.append((shift, d))

    schedule = []
    person_time_assignments: dict[str, set] = {}  # personId -> set of timekeys

    for shift, date in expanded:
        day_key = get_day_key(date)
        time_key = f"{date}-{shift.start}-{shift.end}"

        role_assignments = []
        total_unfulfilled = 0

        for role in shift.roles:
            assigned_ids = []
            eligible = [
                p for p in req.people
                if (not p.availableDays or day_key in p.availableDays)
                and (not role.required_skill or role.required_skill in p.skills)
            ]

            for person in eligible:
                if len(assigned_ids) >= role.required_count:
                    break
                assignments = person_time_assignments.get(person.id, set())
                if time_key not in assignments:
                    assigned_ids.append(person.id)
                    assignments.add(time_key)
                    person_time_assignments[person.id] = assignments

            unfulfilled = max(0, role.required_count - len(assigned_ids))
            total_unfulfilled += unfulfilled

            role_assignments.append(RoleAssignmentOut(
                role_id=role.id,
                required_skill=role.required_skill,
                required_count=role.required_count,
                notes=role.notes,
                assigned_person_ids=assigned_ids,
                unfulfilled=unfulfilled,
            ))

        schedule.append(ScheduleEntryOut(
            shift_id=shift.id,
            date=date,
            shift_leader_id=shift.shiftLeaderId or "",
            role_assignments=role_assignments,
            total_unfulfilled=total_unfulfilled,
        ))

    return GenerateResponse(schedule=schedule)


# ---------------------------------------------------------------------------
# Refine endpoint
# ---------------------------------------------------------------------------

class RefineRequest(BaseModel):
    instruction: str
    current_schedule: list
    people: list = []

class RefineResponse(BaseModel):
    updated_schedule: list
    explanation: str


@app.post("/api/refine", response_model=RefineResponse)
def refine(req: RefineRequest):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    client = anthropic.Anthropic(api_key=api_key)

    
    people_json = json.dumps(req.people, indent=2)
    schedule_json = json.dumps(req.current_schedule, indent=2)
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=(
            "You are a shift scheduling assistant. "
            "The user will provide a current schedule (as JSON) and an instruction to modify it. "
            "Return a JSON object with exactly two keys: "
            '"updated_schedule" (the modified schedule as a list) and '
            '"explanation" (a brief plain-text explanation of the changes made). '
            "Respond with raw JSON only — no markdown, no code fences."
        ),
        messages=[
            {
                "role": "user",
                "content": (

                    f"People: {people_json}\n\n"
                    f"Current schedule:\n{schedule_json}\n\n"
                    f"Instruction: {req.instruction}"
                ),
            }
        ],
    )

    text = next(b.text for b in message.content if b.type == "text")
    data = json.loads(text)

    return RefineResponse(
        updated_schedule=data["updated_schedule"],
        explanation=data["explanation"],
    )


# ---------------------------------------------------------------------------
# New /api/solve endpoint — compatible with v0_project frontend
# ---------------------------------------------------------------------------
class SolvePerson(BaseModel):
    id: str
    name: str
    skills: list[str] = []
    maxShiftsPerDay: int = 1

class SolveTask(BaseModel):
    id: str
    name: str
    requiredSkill: str = ""
    category: str = ""

class SolveRequest(BaseModel):
    people: list[SolvePerson]
    tasks: list[SolveTask]
    date: str
    availabilities: list[dict] = []

class SolveEntry(BaseModel):
    id: str
    personId: str
    taskId: str
    date: str
    start: str
    end: str
    category: str
    isLeader: bool
    isOvernight: bool

class SolveResponse(BaseModel):
    entries: list[SolveEntry]

CATEGORY_TIMES = {
    "early_morning": ("06:00", "09:00"),
    "morning": ("09:00", "13:00"),
    "afternoon": ("13:00", "17:00"),
    "evening": ("17:00", "21:00"),
    "overnight": ("21:00", "04:00"),
}

import random, string

def new_id():
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=7))

@app.post("/api/solve", response_model=SolveResponse)
def solve(req: SolveRequest):
    from ortools.sat.python import cp_model

    people = req.people
    date = req.date

    # Pre-process tasks: assign category to "any shift" tasks
    ALL_CATS = ["early_morning", "morning", "afternoon", "evening", "overnight"]
    cat_counts = {c: 0 for c in ALL_CATS}
    for t in req.tasks:
        if t.category in ALL_CATS:
            cat_counts[t.category] += 1

    tasks = []
    for t in req.tasks:
        if not t.category or t.category not in ALL_CATS:
            least_cat = min(cat_counts, key=lambda c: cat_counts[c])
            cat_counts[least_cat] += 1
            tasks.append(SolveTask(id=t.id, name=t.name, requiredSkill=t.requiredSkill, category=least_cat))
        else:
            tasks.append(t)

    # --- Availability: parse time slots from req.availabilities ---
    # availabilities: list of {userId, personId, date, slots: [{start, end}]}
    avail_slots: dict[str, list[tuple[int,int]]] = {}  # personId -> list of (start_min, end_min)
    raw_avails = getattr(req, "availabilities", None) or []
    for av in raw_avails:
        av_date = av.get("date", "") if isinstance(av, dict) else getattr(av, "date", "")
        if av_date != date:
            continue
        person_id = av.get("personId", "") if isinstance(av, dict) else getattr(av, "personId", "")
        slots = av.get("slots", []) if isinstance(av, dict) else getattr(av, "slots", [])
        parsed = []
        for s in slots:
            s_start = s.get("start","00:00") if isinstance(s, dict) else s.start
            s_end = s.get("end","23:59") if isinstance(s, dict) else s.end
            sh, sm = map(int, s_start.split(":"))
            eh, em = map(int, s_end.split(":"))
            parsed.append((sh*60+sm, eh*60+em))
        if person_id:
            avail_slots[person_id] = parsed

    def is_available(person_id: str, cat: str) -> bool:
        # If no availability data for this person, assume available
        if person_id not in avail_slots:
            return True
        slots = avail_slots[person_id]
        if not slots:
            return True
        cat_start_str, cat_end_str = CATEGORY_TIMES.get(cat, ("09:00","17:00"))
        sh, sm = map(int, cat_start_str.split(":"))
        eh, em = map(int, cat_end_str.split(":"))
        cat_start = sh*60+sm
        cat_end = eh*60+em
        # Check if any slot covers this category
        for (s, e) in slots:
            if s <= cat_start and e >= cat_end:
                return True
        return False

    # --- Pre-process tasks: assign category to "any shift" tasks ---
    ALL_CATS = ["early_morning", "morning", "afternoon", "evening", "overnight"]
    cat_counts = {c: 0 for c in ALL_CATS}
    for t in tasks:
        if t.category in ALL_CATS:
            cat_counts[t.category] += 1
    processed = []
    for t in tasks:
        if not t.category or t.category not in ALL_CATS:
            least_cat = min(cat_counts, key=lambda c: cat_counts[c])
            cat_counts[least_cat] += 1
            processed.append(SolveTask(id=t.id, name=t.name, requiredSkill=t.requiredSkill, category=least_cat))
        else:
            processed.append(t)
    tasks = processed

    # --- Build CP-SAT model ---
    model = cp_model.CpModel()

    # x[p][t] = 1 if person p is assigned to task t
    x = {}
    for p in people:
        for t in tasks:
            x[(p.id, t.id)] = model.new_bool_var(f"x_{p.id}_{t.id}")

    # Constraint 1: each task assigned to exactly 1 person
    for t in tasks:
        model.add(sum(x[(p.id, t.id)] for p in people) == 1)

    # Constraint 2: skill match — if task requires skill, only skilled people
    for t in tasks:
        if t.requiredSkill:
            for p in people:
                if t.requiredSkill not in p.skills:
                    model.add(x[(p.id, t.id)] == 0)

    # Constraint 3: availability — only assign if person is available for that category
    for t in tasks:
        for p in people:
            if not is_available(p.id, t.category):
                model.add(x[(p.id, t.id)] == 0)

    # Constraint 4: max shifts per day
    for p in people:
        model.add(sum(x[(p.id, t.id)] for t in tasks) <= p.maxShiftsPerDay)

    # Constraint 5: one task per category per person
    from collections import defaultdict
    ALL_CATS = ["early_morning", "morning", "afternoon", "evening", "overnight"]
    cat_counts = {c: 0 for c in ALL_CATS}
    for t in tasks:
        if t.category in ALL_CATS:
            cat_counts[t.category] += 1

    processed_tasks = []
    for t in tasks:
        if not t.category or t.category not in ALL_CATS:
            least_cat = min(cat_counts, key=lambda c: cat_counts[c])
            cat_counts[least_cat] += 1
            processed_tasks.append(SolveTask(id=t.id, name=t.name, requiredSkill=t.requiredSkill, category=least_cat))
        else:
            processed_tasks.append(t)
    tasks = processed_tasks

    tasks_by_cat = defaultdict(list)
    for t in tasks:
        tasks_by_cat[t.category].append(t)

    for p in people:
        for cat, cat_tasks in tasks_by_cat.items():
            model.add(sum(x[(p.id, t.id)] for t in cat_tasks) <= 1)

    # Objective: maximize assignments + balance workload (minimize max shifts)
    total_assigned = sum(x[(p.id, t.id)] for p in people for t in tasks)
    
    # Balance: minimize variance by minimizing sum of squares (approximate with max)
    shifts_per_person = [sum(x[(p.id, t.id)] for t in tasks) for p in people]
    max_shifts = model.new_int_var(0, len(tasks), "max_shifts")
    for sp in shifts_per_person:
        model.add(sp <= max_shifts)

    # Maximize assignments, secondarily minimize max_shifts
    model.maximize(total_assigned * 100 - max_shifts)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 10.0
    status = solver.solve(model)

    entries = []
    leader_assigned = set()

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for t in tasks:
            for p in people:
                if solver.value(x[(p.id, t.id)]) == 1:
                    start, end = CATEGORY_TIMES.get(t.category, ("09:00","17:00"))
                    is_leader = t.category not in leader_assigned
                    if is_leader:
                        leader_assigned.add(t.category)
                    entries.append(SolveEntry(
                        id=new_id(),
                        personId=p.id,
                        taskId=t.id,
                        date=date,
                        start=start,
                        end=end,
                        category=t.category,
                        isLeader=is_leader,
                        isOvernight=(t.category == "overnight"),
                    ))
    else:
        # Fallback: greedy if CP-SAT finds nothing
        shifts_count = {p.id: 0 for p in people}
        for t in tasks:
            eligible = [
                p for p in people
                if shifts_count[p.id] < p.maxShiftsPerDay
                and (not t.requiredSkill or t.requiredSkill in p.skills)
                and is_available(p.id, t.category)
            ]
            if not eligible:
                eligible = [p for p in people if not t.requiredSkill or t.requiredSkill in p.skills]
            if not eligible:
                continue
            eligible.sort(key=lambda p: shifts_count[p.id])
            person = eligible[0]
            is_leader = t.category not in leader_assigned
            if is_leader:
                leader_assigned.add(t.category)
            start, end = CATEGORY_TIMES.get(t.category, ("09:00","17:00"))
            entries.append(SolveEntry(
                id=new_id(),
                personId=person.id,
                taskId=t.id,
                date=date,
                start=start,
                end=end,
                category=t.category,
                isLeader=is_leader,
                isOvernight=(t.category == "overnight"),
            ))
            shifts_count[person.id] += 1

    return SolveResponse(entries=entries)


# ---------------------------------------------------------------------------
# Chat endpoint — proxies Anthropic API to avoid CORS
# ---------------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    system: str = ""

class ChatResponse(BaseModel):
    reply: str

@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        system=req.system,
        messages=[{"role": m.role, "content": m.content} for m in req.messages],
    )
    text = next(b.text for b in message.content if b.type == "text")
    return ChatResponse(reply=text)
