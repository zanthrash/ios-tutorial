# iOS Tutorial Companion App — Plan

## Context

You have a 307-line `LEARNING_PLAN.md` and eleven `PHASE_0.md` … `PHASE_10.md` files (~5,200 lines total, ~300 external links, ~145 `- [ ]` checkboxes) that together describe a 12–18 month iOS mastery program. You want a local tool that:

1. **Presents** the plan as a navigable, structured tutorial (phase → week → day) rather than you scrolling through raw markdown.
2. **Tracks progress** at the day/task level, so you can see at a glance where you are.
3. **Captures notes** — both per-day (moment-to-moment learning) and per-phase (retrospectives, concept writeups in your own words).
4. **Surfaces resources** and lets you tick off the ~300 links as you work through them.
5. **Keeps the markdown files as source of truth** so you can edit the plan and have the app reflect it immediately.

The markdown structure is highly consistent across `PHASE_1.md`–`PHASE_10.md` (identical H2 skeleton: *Translating to your own app*, *What you'll have at the end*, *What you WILL NOT do*, *Week 1..N*, *Mastery gate*, *Resources*, *If you get stuck*, *When you're done*). `PHASE_0.md` is the only outlier (no "Translating to your own app", has "Prerequisites checklist", no Week 6). That consistency lets us parse the files into a reliable phase/week/day tree.

**Decisions already locked in:**
- Local web app, Bun + Hono backend + Vite + React SPA frontend.
- Parse markdown live from disk on each load (mtime-watched, in-memory cache).
- Day/task level is the primary checkable unit.
- Notes attach at both **per-day** and **per-phase** scope.
- Persistence: SQLite via `bun:sqlite`.
- Extras in v1: **resources panel per phase**, **full-text search**, **export notes to markdown**.

---

## Where the app lives

New subdirectory: `app/` inside this repo. Markdown files stay at the repo root as the content source. `progress.db` (gitignored) lives in `app/data/`.

```
/Users/zan/work/ios-tutorial/
├── LEARNING_PLAN.md           ← unchanged, content source
├── PHASE_0.md … PHASE_10.md   ← unchanged, content source
└── app/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── bunfig.toml
    ├── .gitignore             ← ignores data/*.db
    ├── server/
    │   ├── index.ts           ← Hono app + Bun server entry
    │   ├── parser.ts          ← markdown → phase tree
    │   ├── ids.ts             ← stable ID generation (slug-based)
    │   ├── db.ts              ← bun:sqlite schema + migrations
    │   ├── routes/
    │   │   ├── plan.ts
    │   │   ├── progress.ts
    │   │   ├── notes.ts
    │   │   ├── resources.ts
    │   │   ├── search.ts
    │   │   └── export.ts
    │   └── watcher.ts         ← fs.watch on ../*.md → invalidate cache
    ├── src/                   ← React app (Vite)
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── api.ts             ← typed fetch wrappers
    │   ├── components/
    │   │   ├── Sidebar.tsx            ← collapsible phase/week/day tree
    │   │   ├── DayView.tsx            ← renders day markdown + notes editor
    │   │   ├── PhaseView.tsx          ← phase overview + phase notes
    │   │   ├── ResourcesPanel.tsx
    │   │   ├── MasteryGate.tsx        ← first-class, per-phase
    │   │   ├── SearchBar.tsx
    │   │   ├── NotesEditor.tsx        ← textarea + markdown preview toggle
    │   │   └── Markdown.tsx           ← react-markdown + shiki wrapper
    │   ├── state/             ← tanstack-query for server state
    │   └── styles/
    └── data/
        └── progress.db        ← gitignored
```

---

## Data model

### Parsed content (in-memory, derived from markdown, never written to DB)

```ts
type Phase = {
  id: string;              // "phase-3"
  number: number;          // 3
  title: string;           // "Networking, persistence, share extension, App Store v1"
  duration: string;        // "5 weeks" (from header line)
  translatingToYourOwnApp?: string;  // H2 section markdown, if present
  willNotDo: string;       // H2 section markdown
  whatYoullHave: string;   // H2 section markdown
  weeks: Week[];
  masteryGate: MasteryGate;
  resources: ResourceGroup[];
  ifStuck: string;
  whenDone: string;
};

type Week = {
  id: string;              // "phase-3/week-2"
  number: number;
  title: string;           // H2 heading text after "Week N — "
  goal?: string;           // first line beginning "Goal:"
  days: Day[];
};

type Day = {
  id: string;              // "phase-3/week-2/day-3-urlsession-basics"  (slug, stable-ish)
  heading: string;         // "Day 3 — URLSession basics"
  timeBudget?: string;     // "2–3 hrs" parsed from heading
  bodyMarkdown: string;    // raw markdown body to render
  inlineChecklistItems: ChecklistItem[];  // `- [ ]` items found inside the body
};

type ChecklistItem = { id: string; text: string };  // id = `${dayId}#${index}`

type MasteryGate = {
  id: string;              // "phase-3/mastery-gate"
  bodyMarkdown: string;
  checklist: ChecklistItem[];  // almost all phases have these
};

type ResourceGroup = {
  category: "primary" | "videos-must" | "videos-optional" | "books" | "free-alt" | "tools" | "apple-dev";
  label: string;           // original H3 text
  items: Resource[];
};

type Resource = { id: string; url: string; label: string };
```

### Persisted (SQLite)

```sql
CREATE TABLE day_progress (
  day_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('todo','in_progress','done','skipped')) DEFAULT 'todo',
  started_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE checklist_progress (
  item_id TEXT PRIMARY KEY,   -- `${dayId}#${index}` or `${masteryGateId}#${index}`
  checked INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE day_notes (
  day_id TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE phase_notes (
  phase_id TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE resource_progress (
  url TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('unread','reading','done','skip')) DEFAULT 'unread',
  updated_at TEXT NOT NULL
);

-- FTS over notes for search
CREATE VIRTUAL TABLE notes_fts USING fts5(scope, scope_id, body, content='');
-- populate from day_notes + phase_notes via triggers
```

### ID stability note

Day IDs are slugified headings (`day-3-urlsession-basics`). If you rewrite a heading, that day "forgets" its progress. Acceptable for a single-user tool — but on startup the app will surface any orphaned progress rows (a small "unreachable progress" warning in the UI) so you can notice and either rename the heading back or delete orphans.

---

## API (Hono)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/plan` | Full parsed tree (phases → weeks → days, resources, mastery gates). Cached in memory, invalidated by file watcher. |
| GET | `/api/progress` | All `day_progress` + `checklist_progress` rows, keyed by id. |
| PATCH | `/api/progress/day/:dayId` | Body: `{status}`. Touches `started_at`/`completed_at`. |
| PATCH | `/api/progress/checklist/:itemId` | Body: `{checked}`. |
| GET | `/api/notes/day/:dayId` | → `{body, updated_at}` |
| PUT | `/api/notes/day/:dayId` | Body: `{body}` |
| GET | `/api/notes/phase/:phaseId` | → `{body, updated_at}` |
| PUT | `/api/notes/phase/:phaseId` | Body: `{body}` |
| PATCH | `/api/resources/:urlB64` | Body: `{status}`. URL is base64url-encoded in the path. |
| GET | `/api/search?q=...` | FTS over notes + simple in-memory scan over plan content; returns ranked snippets `{scope, id, snippet}`. |
| GET | `/api/export` | Returns `my-notes.md`: phase-ordered concatenation of all notes with headings. |

Single process: Bun serves both the API (`/api/*`) and the built SPA (everything else falls through to `index.html`). In dev, Vite runs on 5173 and proxies `/api` to Hono on 5174; `bun dev` runs both concurrently.

---

## Parser approach

Use `remark` + `remark-parse` + `unified` to get an MDAST, then walk it:

1. **File → phase**: filename gives `phase-N`; first H1 gives title.
2. **H2 sections**: split children into named sections by matching the known H2 titles. Unknown H2s (e.g., `PHASE_5.md`'s *Traps to avoid*) go into an `extraSections` bucket rendered after the standard ones.
3. **Weeks**: H2s matching `/^Week (\d+)\s*[—-]\s*(.+)/` become `Week` nodes. Their children up to the next H2 become their body.
4. **Days/tasks**: within a week, H3s are day/task units. Parse time-budget `(X–Y hrs)` from the heading. Extract any embedded `- [ ]` items as `inlineChecklistItems`.
5. **Resources**: under `## Resources — Phase N`, each H3 becomes a category. Links inside each category become `Resource` items. Map H3 text to one of the known category enums; anything unknown falls into `tools`.
6. **Mastery gate**: H2 `## Mastery gate — end of Phase N`. Any `- [ ]` items inside become its checklist.
7. **Prerequisites checklist** (`PHASE_0.md` only): treat as a synthetic "Week 0 — Prerequisites" with a single day that carries the checklist.

Parser has its own focused tests using small markdown fixtures (see Verification).

**File watcher**: `fs.watch` on the repo root (non-recursive) for `*.md` changes. On change, blow the in-memory plan cache; next `GET /api/plan` re-parses. Debounce at 100 ms.

---

## Frontend UX

**Layout**: fixed left sidebar (~320 px) + main content pane.

**Sidebar**:
- Top: overall progress bar + current-phase label.
- Tree: each phase collapsible, shows `✓✓✓ done` / `██░░ N/M` / count of in-progress days. Week and Day nodes indent under. Click a day → main pane.
- Search bar at the very top (⌘K focuses it).

**Main pane routes** (client-side, React Router):
- `/` → dashboard: overall progress, current day, last edited note, quick jump.
- `/phase/:phaseId` → phase overview: *Translating to your own app*, *What you'll have*, *What you will not do*, phase notes editor, mastery gate status, resources panel link.
- `/phase/:phaseId/week/:weekN/day/:daySlug` → day view: rendered markdown body, inline checklist toggles, status dropdown (`todo` → `in_progress` → `done`/`skipped`), day notes editor directly below.
- `/phase/:phaseId/mastery` → mastery gate view (special — it's the exit gate).
- `/phase/:phaseId/resources` → categorized resources with per-link status toggles.
- `/search?q=...` → results.

**Markdown rendering**: `react-markdown` + `remark-gfm` + `rehype-raw` + Shiki for code highlighting (Shiki supports Swift syntax out of the box, which matters here).

**Notes editor v1**: plain `<textarea>` with a "preview" toggle that renders via the same Markdown component. Auto-save debounced at 800 ms. Keep it boring — a richer editor (Milkdown/CodeMirror) is a later swap.

**Keyboard**: `j`/`k` to move between days in sidebar order, `space` to cycle day status, `n` to focus notes editor, `⌘K` for search. Important for a tool you'll live in for a year.

**Styling**: Tailwind. Dark mode by default (system-preference respecting). No design system — single-user tool, keep it tight.

---

## Dev loop

```
cd app
bun install
bun dev     # runs Vite (5173) and Hono (5174) concurrently
```

One top-level `bun dev` script runs both via `concurrently`. Production-style "run locally" mode (`bun start`) builds Vite to `dist/` and serves everything from the Hono process on a single port.

---

## Critical files to create

- `app/package.json`, `app/tsconfig.json`, `app/vite.config.ts`, `app/bunfig.toml`, `app/.gitignore`
- `app/server/index.ts` — Hono app wiring
- `app/server/parser.ts` — **the crux**; heavy unit-test target
- `app/server/ids.ts` — slug generation (use `github-slugger` for consistency with how headings get anchor IDs)
- `app/server/db.ts` — schema + `bun:sqlite` wrapper + FTS triggers
- `app/server/watcher.ts` — fs.watch + debounce
- `app/server/routes/*.ts` — the ten endpoints above
- `app/src/main.tsx`, `app/src/App.tsx`, `app/src/api.ts`
- `app/src/components/Sidebar.tsx`, `DayView.tsx`, `PhaseView.tsx`, `ResourcesPanel.tsx`, `MasteryGate.tsx`, `SearchBar.tsx`, `NotesEditor.tsx`, `Markdown.tsx`
- `app/server/__tests__/parser.test.ts` — fixture-driven, using small excerpts from real `PHASE_*.md`

No existing files in the repo are modified. `LEARNING_PLAN.md` and `PHASE_*.md` stay as the source of truth.

---

## Implementation order (tracer-bullet slices)

1. **Project scaffolding**: `bun init`, wire Vite + Hono to shared Bun process, "hello world" round-trip.
2. **Parser + `/api/plan`**: render a raw JSON dump page from the real markdown. No DB, no UI. Verify tree shape against the 11 phase files.
3. **Sidebar + DayView read-only**: render markdown for any day, no progress/notes yet.
4. **SQLite + progress tracking**: day status toggles persist, sidebar shows completion.
5. **Notes editors**: day + phase, auto-save, markdown preview.
6. **Resources panel**: categorized view per phase + per-link status.
7. **Mastery gate view** with checklist persistence.
8. **Search (FTS + plan scan)**.
9. **Export notes**.
10. **Keyboard shortcuts + polish**.

Each slice ends with the app running and usable.

---

## Verification

**Parser correctness (automated):**
- `app/server/__tests__/parser.test.ts` runs against small markdown fixtures and against the real `PHASE_*.md` files.
- Assertions: every `PHASE_N.md` produces exactly one `Phase`; phases 1–10 have ≥3 weeks; every phase has exactly one `masteryGate`; total day count across all phases is within ±5 of a snapshotted baseline (so accidental regressions in H3 detection are caught).
- Run: `bun test`.

**End-to-end smoke (manual):**
1. `cd app && bun install && bun dev`; open `http://localhost:5173`.
2. Sidebar shows 11 phases; click through Phase 3 → Week 2 → a day; markdown renders with syntax-highlighted Swift code blocks; external links open in a new tab.
3. Toggle a day to `done` — sidebar checkmark appears; reload the browser, status persists.
4. Type notes on that day; wait 1 s; reload; notes persist.
5. Navigate to `/phase/phase-3` and add phase-level notes; verify they persist separately from day notes.
6. Open `/phase/phase-3/resources`; click a link's status toggle; reload; state persists.
7. Edit `PHASE_3.md` (add a new `### Day 4 — test day` under Week 2) and save; reload the app; the new day appears in the sidebar within ~1 s (file watcher).
8. Type a word from your notes in the search bar (⌘K); confirm hit with snippet; clicking navigates to the scope.
9. Click "Export notes"; downloaded `my-notes.md` contains phase-ordered headings and all your notes.
10. Delete a heading in markdown you had notes on; reload; the UI shows an "orphan progress" warning for that ID and offers to delete it.

**Accessibility quick pass:** tab through the sidebar, confirm focus ring is visible and keyboard shortcuts work. (This is a you-only tool, but it's iOS-adjacent work — practicing accessibility instincts here is on-theme.)
