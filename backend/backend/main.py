import sys, os, json, random, string
import anthropic
from collections import defaultdict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ortools.sat.python import cp_model

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

app = FastAPI(title="ShiftPlanner API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

ALL_CATS = ["early_morning", "morning", "afternoon", "evening", "overnight"]

CATEGORY_TIMES = {
    "early_morning": ("06:00", "09:00"),
    "morning":       ("09:00", "13:00"),
    "afternoon":     ("13:00", "17:00"),
    "evening":       ("17:00", "21:00"),
    "overnight":     ("21:00", "04:00"),
}

def new_id():
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=7))

# ---------------------------------------------------------------------------
# /api/solve — CP-SAT scheduler
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

def preprocess_tasks(tasks: list[SolveTask]) -> list[SolveTask]:
    """Assign a category to tasks with no category, distributed evenly."""
    cat_counts = {c: 0 for c in ALL_CATS}
    for t in tasks:
        if t.category in ALL_CATS:
            cat_counts[t.category] += 1
    result = []
    for t in tasks:
        if not t.category or t.category not in ALL_CATS:
            least_cat = min(cat_counts, key=lambda c: cat_counts[c])
            cat_counts[least_cat] += 1
            result.append(SolveTask(id=t.id, name=t.name, requiredSkill=t.requiredSkill, category=least_cat))
        else:
            result.append(t)
    return result

def parse_availabilities(raw_avails: list, date: str) -> dict[str, list[tuple[int,int]]]:
    """Parse availability slots into {personId: [(start_min, end_min)]}."""
    avail_slots = {}
    for av in raw_avails:
        av_date = av.get("date", "") if isinstance(av, dict) else getattr(av, "date", "")
        if av_date != date:
            continue
        person_id = av.get("personId", "") if isinstance(av, dict) else getattr(av, "personId", "")
        slots = av.get("slots", []) if isinstance(av, dict) else getattr(av, "slots", [])
        parsed = []
        for s in slots:
            s_start = s.get("start", "00:00") if isinstance(s, dict) else s.start
            s_end   = s.get("end",   "23:59") if isinstance(s, dict) else s.end
            sh, sm = map(int, s_start.split(":"))
            eh, em = map(int, s_end.split(":"))
            parsed.append((sh*60+sm, eh*60+em))
        if person_id:
            avail_slots[person_id] = parsed
    return avail_slots

def is_available(avail_slots: dict, person_id: str, cat: str) -> bool:
    """Return True if person is available for the given category."""
    if person_id not in avail_slots:
        return True
    slots = avail_slots[person_id]
    if not slots:
        return True
    cat_start_str, cat_end_str = CATEGORY_TIMES.get(cat, ("09:00", "17:00"))
    sh, sm = map(int, cat_start_str.split(":"))
    eh, em = map(int, cat_end_str.split(":"))
    cat_start = sh*60+sm
    cat_end   = eh*60+em
    return any(s <= cat_start and e >= cat_end for s, e in slots)

@app.post("/api/solve", response_model=SolveResponse)
def solve(req: SolveRequest):
    people = req.people
    date   = req.date
    tasks  = preprocess_tasks(req.tasks)
    avail_slots = parse_availabilities(req.availabilities, date)

    model = cp_model.CpModel()

    # x[person_id, task_id] = 1 if person is assigned to task
    x = {
        (p.id, t.id): model.new_bool_var(f"x_{p.id}_{t.id}")
        for p in people for t in tasks
    }

    # C1: each task assigned to exactly 1 person
    for t in tasks:
        model.add(sum(x[(p.id, t.id)] for p in people) == 1)

    # C2: skill match
    for t in tasks:
        if t.requiredSkill:
            for p in people:
                if t.requiredSkill not in p.skills:
                    model.add(x[(p.id, t.id)] == 0)

    # C3: availability
    for t in tasks:
        for p in people:
            if not is_available(avail_slots, p.id, t.category):
                model.add(x[(p.id, t.id)] == 0)

    # C4: max shifts per day per person
    for p in people:
        model.add(sum(x[(p.id, t.id)] for t in tasks) <= p.maxShiftsPerDay)

    # C5: max 1 task per category per person
    tasks_by_cat = defaultdict(list)
    for t in tasks:
        tasks_by_cat[t.category].append(t)
    for p in people:
        for cat_tasks in tasks_by_cat.values():
            model.add(sum(x[(p.id, t.id)] for t in cat_tasks) <= 1)

    # Objective: maximize assignments, secondarily balance workload
    total_assigned = sum(x[(p.id, t.id)] for p in people for t in tasks)
    max_shifts = model.new_int_var(0, len(tasks), "max_shifts")
    for p in people:
        model.add(sum(x[(p.id, t.id)] for t in tasks) <= max_shifts)
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
                    start, end = CATEGORY_TIMES.get(t.category, ("09:00", "17:00"))
                    is_leader = t.category not in leader_assigned
                    if is_leader:
                        leader_assigned.add(t.category)
                    entries.append(SolveEntry(
                        id=new_id(), personId=p.id, taskId=t.id, date=date,
                        start=start, end=end, category=t.category,
                        isLeader=is_leader, isOvernight=(t.category == "overnight"),
                    ))
    else:
        # Greedy fallback
        shifts_count = {p.id: 0 for p in people}
        for t in tasks:
            eligible = [
                p for p in people
                if shifts_count[p.id] < p.maxShiftsPerDay
                and (not t.requiredSkill or t.requiredSkill in p.skills)
                and is_available(avail_slots, p.id, t.category)
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
            start, end = CATEGORY_TIMES.get(t.category, ("09:00", "17:00"))
            entries.append(SolveEntry(
                id=new_id(), personId=person.id, taskId=t.id, date=date,
                start=start, end=end, category=t.category,
                isLeader=is_leader, isOvernight=(t.category == "overnight"),
            ))
            shifts_count[person.id] += 1

    return SolveResponse(entries=entries)


# ---------------------------------------------------------------------------
# /api/chat — proxies Anthropic API
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
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1500,
        system=req.system,
        messages=[{"role": m.role, "content": m.content} for m in req.messages],
    )
    text = next(b.text for b in message.content if b.type == "text")
    return ChatResponse(reply=text)


# ---------------------------------------------------------------------------
# /api/refine — AI schedule refinement
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
    client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
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
        messages=[{"role": "user", "content": (
            f"People: {json.dumps(req.people, indent=2)}\n\n"
            f"Current schedule:\n{json.dumps(req.current_schedule, indent=2)}\n\n"
            f"Instruction: {req.instruction}"
        )}],
    )
    text = next(b.text for b in message.content if b.type == "text")
    data = json.loads(text)
    return RefineResponse(updated_schedule=data["updated_schedule"], explanation=data["explanation"])
