# iOS Tutorial Companion App — Implementation Phases

This document breaks the app described in `APP_PLAN.md` into seven vertical implementation slices. Each phase ends with the app doing something new and demonstrably useful — building in order yields a continuously working tool rather than a half-finished codebase. For canonical schema DDL, API signatures, and the full file tree, refer to `APP_PLAN.md`; this document focuses on sequencing, scope boundaries, and verification.

---

## Phase map

| # | Name | Demo when done |
|---|---|---|
| 1 | Tracer bullet | Browser shows a clickable phase/week/day tree parsed from the real PHASE_*.md files |
| 2 | Day rendering | Any day renders with Shiki-highlighted Swift; sidebar is collapsible and tracks active day |
| 3 | Progress tracking | Toggle day status or tick a checkbox; reload; state persists; mastery-gate checklists work too |
| 4 | Notes | Write day and phase notes; autosave; preview as markdown; notes survive reloads |
| 5 | Phase overview + resources | Phase route shows curriculum framing; external links have per-link status toggles; mastery gate links from phase overview |
| 6 | Search + export | ⌘K finds a word in notes or plan content; Export downloads a clean per-phase markdown dump |
| 7 | Watcher + polish | Edit a PHASE_*.md file and the sidebar updates within ~1s; j/k/space/n keyboard shortcuts work; orphaned progress rows surface a warning |

---

## Phase 1 — Tracer bullet

**Depends on:** none · **Demo when done:** `http://localhost:5173` shows all 11 phases as a navigable tree; `/api/plan` returns valid JSON.

### Goal

Get the full stack wired end-to-end and prove the parser works against the real curriculum files. There is no database, no styling, and no markdown rendering yet — just a running Bun + Hono server that parses the PHASE_*.md files into a phase/week/day tree, exposes it at `/api/plan`, and a bare React page that renders that tree as clickable links. Every subsequent phase builds on this skeleton.

### Scope

1. Project scaffolding — `package.json`, `tsconfig.json`, `vite.config.ts`, `bunfig.toml`, `.gitignore`, `bun dev` script (Vite on 5173 + Hono on 5174 via `concurrently`)
2. `app/server/ids.ts` — slug generation using `github-slugger` (stable, consistent with heading anchor IDs)
3. `app/server/parser.ts` — `remark` + `unified` MDAST walk producing the full `Phase[]` tree (headings, weeks, days, checklist items, mastery gate, resources, PHASE_0 prerequisites as synthetic week)
4. `app/server/__tests__/parser.test.ts` — fixture-driven tests plus assertions against the real 11 PHASE_*.md files
5. `app/server/routes/plan.ts` + `app/server/index.ts` — `GET /api/plan` returning the in-memory parsed tree as JSON (cache invalidation deferred to Phase 7)
6. `app/src/main.tsx`, `app/src/App.tsx` — React entry; minimal layout (sidebar + main pane stubs)
7. `app/src/api.ts` — typed `fetchPlan()` wrapper
8. `app/src/components/Sidebar.tsx` — renders phase/week/day as nested plain `<ul>` links; no collapse yet

### Out of scope

- Markdown rendering in the main pane — Phase 2
- Collapsible sidebar, styling, Tailwind — Phase 2
- SQLite / any persistence — Phase 3
- File watcher (cache invalidation) — Phase 7
- Progress, notes, resources, search, export — Phases 3–6

### Files touched

- `app/package.json` (new)
- `app/tsconfig.json` (new)
- `app/bunfig.toml` (new)
- `app/vite.config.ts` (new)
- `app/.gitignore` (new)
- `app/server/index.ts` (new)
- `app/server/ids.ts` (new)
- `app/server/parser.ts` (new)
- `app/server/__tests__/parser.test.ts` (new)
- `app/server/routes/plan.ts` (new)
- `app/src/main.tsx` (new)
- `app/src/App.tsx` (new)
- `app/src/api.ts` (new)
- `app/src/components/Sidebar.tsx` (new, minimal)

### Acceptance criteria

- [ ] `bun install` completes without errors
- [ ] `bun test` passes: every PHASE_N.md produces exactly one `Phase`; phases 1–10 have ≥3 weeks each; every phase has exactly one `masteryGate`; total day count across all phases is within ±5 of a snapshotted baseline
- [ ] `bun dev` starts both Vite (5173) and Hono (5174) without errors
- [ ] `GET http://localhost:5174/api/plan` returns valid JSON with 11 phases, each containing weeks, days, a mastery gate, and resources
- [ ] Opening `http://localhost:5173` renders a sidebar listing all 11 phases with their weeks and days as plain links
- [ ] Clicking a day link changes the URL; main pane shows the day ID as placeholder text (no markdown rendering yet)
- [ ] No TypeScript errors (`bun tsc --noEmit`)

### Verification

1. `cd app && bun install && bun test` — all tests green
2. `bun dev` — both processes start; no errors in terminal
3. `curl http://localhost:5174/api/plan | jq '.phases | length'` → `11`
4. `curl http://localhost:5174/api/plan | jq '.phases[0].weeks | length'` → a positive number
5. Open `http://localhost:5173` — sidebar shows 11 phase entries; expand Phase 3; click a day; URL updates to something like `/phase/phase-3/week/1/day/day-1-...`; main pane shows the day ID string

### Next

Phase 2 adds the markdown renderer and collapsible sidebar so the app becomes a usable read-only viewer for the full iOS curriculum.

---

## Phase 2 — Day rendering

**Depends on:** Phase 1 · **Demo when done:** Click any day, see its content rendered with Shiki-highlighted Swift code blocks; sidebar is collapsible and highlights the active day.

### Goal

The app becomes genuinely useful as a read-only viewer. The day body — which can contain Swift code blocks, task checklists, links, and tables — renders correctly with syntax highlighting. The sidebar becomes collapsible and tracks which day is active. Tailwind and dark mode are wired here so every subsequent phase inherits the visual baseline.

### Scope

1. Install and configure Tailwind CSS (dark mode via system preference: `darkMode: 'media'`)
2. `app/src/components/Markdown.tsx` — `react-markdown` + `remark-gfm` + `rehype-raw` + Shiki wrapper; external links get `target="_blank" rel="noopener noreferrer"`
3. `app/src/components/DayView.tsx` — fetches the day's `bodyMarkdown` from the plan data already in client state, renders via `Markdown`; shows day heading and time budget
4. `app/src/components/Sidebar.tsx` — upgrade to collapsible phases and weeks; highlight the active day; overall structure fixed-width on the left
5. React Router setup — route `/phase/:phaseId/week/:weekN/day/:daySlug` → `DayView`; `/` → dashboard stub (heading + "pick a day" prompt)
6. `app/src/App.tsx` — fixed sidebar + scrollable main pane layout

### Out of scope

- Status toggles, checklist interactivity — Phase 3
- Notes editor — Phase 4
- Phase overview route (`/phase/:phaseId`) — Phase 5
- Resources panel — Phase 5
- Search modal — Phase 6
- File watcher — Phase 7

### Files touched

- `app/src/components/Markdown.tsx` (new)
- `app/src/components/DayView.tsx` (new)
- `app/src/components/Sidebar.tsx` (modified)
- `app/src/App.tsx` (modified)
- `app/tailwind.config.ts` (new)
- `app/postcss.config.js` (new)
- `app/src/styles/global.css` (new)
- `app/vite.config.ts` (modified — add Tailwind plugin)
- `app/package.json` (modified — add `react-markdown`, `remark-gfm`, `rehype-raw`, `shiki`, `react-router-dom`, `tailwindcss`, `@tailwindcss/vite`)

### Acceptance criteria

- [ ] Clicking any day in the sidebar navigates to its route and renders the full body markdown in the main pane
- [ ] Swift code blocks are syntax-highlighted via Shiki (Swift theme active)
- [ ] External links open in a new tab (`target="_blank"`) with `rel="noopener noreferrer"`
- [ ] Phase rows in the sidebar are collapsible; week rows are collapsible under their phase
- [ ] The currently-active day is visually highlighted in the sidebar (distinct background or colour)
- [ ] Dark mode activates automatically when the OS is set to dark; light mode when set to light
- [ ] All 11 phases can be navigated without console errors
- [ ] Inline `- [ ]` checklist items in day bodies render as visual checkboxes (read-only; interactivity is Phase 3)

### Verification

1. `bun dev`, open `http://localhost:5173`
2. Click Phase 1 → Week 1 → Day 1 — body markdown renders; any Swift blocks are coloured
3. Click an external link — opens in a new tab
4. Click the Phase 1 header in the sidebar — its weeks collapse; click again — they expand
5. Navigate to a day in Phase 3; confirm Phase 3 appears highlighted/open in the sidebar while Phase 1 is closed
6. Toggle system dark mode — app switches colour scheme immediately

### Next

Phase 3 adds SQLite so day status and checklist toggles actually persist across reloads, and the sidebar begins to reflect completion state.

---

## Phase 3 — Progress tracking

**Depends on:** Phase 2 · **Demo when done:** Toggle a day to "done", reload the browser; the checkmark is still there. Mastery-gate checklists use the same mechanism.

### Goal

The app gains memory. Day status (`todo` / `in_progress` / `done` / `skipped`) and inline checklist items can be toggled in the UI and survive a full browser reload. The mastery gate for each phase is exposed as its own route and shares the same checklist persistence mechanism — no separate implementation needed. The sidebar reflects overall completion with a progress bar and per-phase counts.

### Scope

1. `app/server/db.ts` — `bun:sqlite` schema creation for `day_progress` and `checklist_progress` tables; `app/data/progress.db` created on first run
2. `app/server/routes/progress.ts` — `GET /api/progress`, `PATCH /api/progress/day/:dayId` (touches `started_at` / `completed_at`), `PATCH /api/progress/checklist/:itemId`
3. Mount progress routes in `app/server/index.ts`
4. `app/src/api.ts` — typed wrappers for the three progress endpoints
5. `app/src/state/` — TanStack Query setup; `usePlan`, `useProgress`, `useUpdateDayStatus`, `useToggleChecklist` hooks
6. `app/src/components/DayView.tsx` — status dropdown (todo → in_progress → done / skipped); inline checklist items become interactive toggles
7. `app/src/components/Sidebar.tsx` — overall progress bar at top; per-phase completion count (e.g. `3 / 12`); phases with all days done show a checkmark
8. `app/src/components/MasteryGate.tsx` — fetches the phase's `masteryGate.checklist` from plan data; renders each item as a toggle backed by `checklist_progress`; route `/phase/:phaseId/mastery`
9. `.gitignore` entry: `data/*.db`

### Out of scope

- Notes tables and routes — Phase 4
- `resource_progress` table — Phase 5
- FTS triggers — Phase 6
- Orphan detection — Phase 7
- File watcher — Phase 7

### Files touched

- `app/server/db.ts` (new)
- `app/server/routes/progress.ts` (new)
- `app/server/index.ts` (modified)
- `app/src/api.ts` (modified)
- `app/src/state/index.ts` (new)
- `app/src/components/DayView.tsx` (modified)
- `app/src/components/Sidebar.tsx` (modified)
- `app/src/components/MasteryGate.tsx` (new)
- `app/src/App.tsx` (modified — add `/phase/:phaseId/mastery` route)
- `app/package.json` (modified — add `@tanstack/react-query`)
- `app/.gitignore` (modified)

### Acceptance criteria

- [ ] `app/data/progress.db` is created automatically on first `bun dev`
- [ ] Changing a day's status via the dropdown persists after a full browser reload
- [ ] `started_at` is set when status first moves off `todo`; `completed_at` is set when status reaches `done`; both are stored as ISO-8601 strings
- [ ] Ticking an inline day checklist item persists after reload
- [ ] `/phase/phase-3/mastery` renders the mastery gate checklist; ticking any item persists after reload
- [ ] Sidebar progress bar reflects done/total ratio across all days
- [ ] Per-phase completion count in the sidebar updates immediately when a day is toggled (optimistic update or fast refetch)

### Verification

1. `bun dev`, navigate to Phase 3 → Week 1 → Day 1
2. Change status to "In progress" → reload → status still "In progress"
3. Change to "Done" → `completed_at` should be set; sidebar count for Phase 3 increments
4. Tick one inline checklist item → reload → tick persists
5. Navigate to `/phase/phase-3/mastery` → tick one gate item → reload → tick persists
6. Confirm `app/data/progress.db` exists: `ls app/data/` shows `progress.db`

### Next

Phase 4 adds notes editors so you can capture per-day and per-phase observations that autosave and render as markdown preview.

---

## Phase 4 — Notes

**Depends on:** Phase 3 · **Demo when done:** Type a note on a day, wait one second, reload; the note is there. Phase notes and day notes are stored separately.

### Goal

Attach freeform notes to any day or any phase. Notes autosave 800ms after you stop typing, survive reloads, and can be previewed as rendered markdown using the same component as the day bodies. Day notes and phase notes are scoped independently in the database so retrospectives don't bleed into session notes.

### Scope

1. `app/server/db.ts` — add `day_notes` and `phase_notes` tables
2. `app/server/routes/notes.ts` — `GET /api/notes/day/:dayId`, `PUT /api/notes/day/:dayId`, `GET /api/notes/phase/:phaseId`, `PUT /api/notes/phase/:phaseId`
3. Mount notes routes in `app/server/index.ts`
4. `app/src/api.ts` — typed wrappers for the four notes endpoints
5. `app/src/components/NotesEditor.tsx` — `<textarea>` with a "Preview" toggle button; 800ms debounced autosave; "Saving…" / "Saved" status indicator; preview renders via the `Markdown` component
6. `app/src/components/DayView.tsx` — embed `NotesEditor` below the day body with label "Day notes"
7. Phase notes stub: `NotesEditor` is importable and will be embedded in `PhaseView` in Phase 5; no `PhaseView` yet

### Out of scope

- FTS indexing of notes — Phase 6
- Export of notes — Phase 6
- `PhaseView` component and phase route — Phase 5 (phase notes will be visible there)

### Files touched

- `app/server/db.ts` (modified)
- `app/server/routes/notes.ts` (new)
- `app/server/index.ts` (modified)
- `app/src/api.ts` (modified)
- `app/src/components/NotesEditor.tsx` (new)
- `app/src/components/DayView.tsx` (modified)

### Acceptance criteria

- [ ] Typing in the day notes area, waiting 800ms, then reloading: the note text persists
- [ ] "Saving…" indicator appears while the autosave debounce is pending; "Saved" appears after the PUT succeeds
- [ ] "Preview" toggle renders the note text as markdown (same Markdown component used for day bodies); toggle back shows the raw textarea
- [ ] A day with no notes yet loads without error; textarea starts empty
- [ ] Day notes and phase notes are independent: writing a day note does not overwrite the phase note for the same phase, and vice versa

### Verification

1. Navigate to Phase 3 → Week 1 → Day 1; type "test note `**bold**`"; wait 1s; reload → note persists
2. Toggle Preview → `**bold**` renders as **bold**; toggle back → raw textarea shows again
3. Navigate to a second day in the same phase; add a different note; reload both days — each retains only its own note
4. Directly call `GET /api/notes/day/<dayId>` and `GET /api/notes/phase/phase-3` — confirm they return different bodies

### Next

Phase 5 adds the phase overview route and resources panel so you can see the curriculum framing for each phase, tick off external links, and navigate to the mastery gate from the phase page.

---

## Phase 5 — Phase overview + resources

**Depends on:** Phase 4 · **Demo when done:** `/phase/phase-3` shows the curriculum framing sections and phase notes; `/phase/phase-3/resources` shows all links with per-link status toggles that persist.

### Goal

Complete the phase-level views. The phase route renders the three framing sections parsed from the markdown (Translating to your own app, What you'll have at the end, What you will not do), embeds the phase notes editor, and links to the mastery gate and resources panel. The resources panel shows every external link for the phase organised by category, each with a status toggle. PHASE_0.md has no "Translating" section; that absence is handled gracefully.

### Scope

1. `app/server/db.ts` — add `resource_progress` table
2. `app/server/routes/resources.ts` — `PATCH /api/resources/:urlB64` (`urlB64` is the resource URL base64url-encoded); idempotent upsert
3. Mount resources route in `app/server/index.ts`
4. `app/src/api.ts` — typed wrapper for resources endpoint
5. `app/src/components/PhaseView.tsx` — renders `translatingToYourOwnApp` (if present), `whatYoullHave`, `willNotDo` sections from the plan data via `Markdown`; embeds `NotesEditor` for phase notes; links to `/phase/:phaseId/mastery` and `/phase/:phaseId/resources`
6. `app/src/components/ResourcesPanel.tsx` — grouped by category (primary, videos-must, videos-optional, books, free-alt, tools, apple-dev); each entry shows label, URL, and a status toggle (`unread` / `reading` / `done` / `skip`); toggle state persisted via `resource_progress`
7. Wire routes `/phase/:phaseId` → `PhaseView` and `/phase/:phaseId/resources` → `ResourcesPanel` in `app/src/App.tsx`

### Out of scope

- FTS triggers for notes — Phase 6
- Export — Phase 6
- File watcher — Phase 7

### Files touched

- `app/server/db.ts` (modified)
- `app/server/routes/resources.ts` (new)
- `app/server/index.ts` (modified)
- `app/src/api.ts` (modified)
- `app/src/components/PhaseView.tsx` (new)
- `app/src/components/ResourcesPanel.tsx` (new)
- `app/src/App.tsx` (modified)

### Acceptance criteria

- [ ] `/phase/phase-3` renders the three framing sections as markdown (or two sections for PHASE_0 which has no "Translating" section)
- [ ] Phase notes editor on the phase page autosaves and persists; these are the same notes exposed by `GET /api/notes/phase/phase-3`
- [ ] Links to "Mastery gate" and "Resources" are visible on the phase overview page
- [ ] `/phase/phase-3/resources` shows all resource links grouped by category; all seven categories have headings (empty categories are omitted)
- [ ] Each resource link opens in a new tab; its status toggle cycles through `unread → reading → done → skip`; toggled state persists after reload
- [ ] `/phase/phase-0` renders without a crash despite having no "Translating to your own app" section

### Verification

1. `bun dev`, navigate to `/phase/phase-3` — three sections render
2. Add phase notes, wait 1s, reload — notes persist; day notes for a day in Phase 3 are unaffected
3. Navigate to `/phase/phase-3/resources` — links visible, grouped
4. Toggle one link to "done", reload — still "done"
5. Navigate to `/phase/phase-0` — page loads; only two framing sections present (no Translating section)

### Next

Phase 6 adds full-text search over notes and a plan-content scan, plus a one-click notes export — making the app into a retrieval tool, not just a tracker.

---

## Phase 6 — Search + export

**Depends on:** Phase 5 · **Demo when done:** ⌘K → type a word from a note → click the result → navigated to the right day. "Export notes" downloads a clean markdown file.

### Goal

You can find anything you've written and get it out. The search modal (⌘K) queries FTS over notes and a fallback in-memory scan over the plan tree, returning ranked snippets. Clicking a result closes the modal and navigates to the correct day or phase. Export produces a phase-ordered markdown file suitable for review outside the app or for archiving a cohort of notes.

### Scope

1. `app/server/db.ts` — add `notes_fts` virtual table (FTS5); add triggers on `day_notes` and `phase_notes` to keep it populated on insert / update / delete
2. `app/server/routes/search.ts` — `GET /api/search?q=...`; FTS query over `notes_fts` for notes hits; in-memory substring scan over the plan tree for plan-body hits; merge and return ranked `{ scope, id, snippet }[]`
3. `app/server/routes/export.ts` — `GET /api/export`; queries `day_notes` and `phase_notes`; assembles `my-notes.md` (H1 per phase, H2 per day that has notes, note body verbatim); returns as `Content-Disposition: attachment; filename="my-notes.md"`
4. Mount search and export routes in `app/server/index.ts`
5. `app/src/api.ts` — typed wrappers for search and export
6. `app/src/components/SearchBar.tsx` — global modal, ⌘K shortcut, debounced query, results list with snippets, click-to-navigate; Escape closes
7. `app/src/App.tsx` — render `SearchBar` outside the router so it's always accessible; `/search?q=...` route as a fallback results page
8. "Export notes" button in the sidebar footer (or phase view) that hits `/api/export` and triggers a browser download

### Out of scope

- File watcher — Phase 7
- Keyboard shortcuts beyond ⌘K — Phase 7

### Files touched

- `app/server/db.ts` (modified)
- `app/server/routes/search.ts` (new)
- `app/server/routes/export.ts` (new)
- `app/server/index.ts` (modified)
- `app/src/api.ts` (modified)
- `app/src/components/SearchBar.tsx` (new)
- `app/src/App.tsx` (modified)

### Acceptance criteria

- [ ] ⌘K (Cmd+K) opens the search modal from any page; Escape closes it
- [ ] Typing a word that appears in a day note returns at least one result with a text snippet; clicking navigates to that day
- [ ] Typing a word that appears in plan body text (e.g., "URLSession") returns a result
- [ ] Results from notes rank above results from plan body text
- [ ] Clicking "Export notes" triggers a browser download of `my-notes.md`
- [ ] The exported file has: an H1 for each phase that has any notes, an H2 for each day (within that phase) that has notes, and the note body verbatim under each H2
- [ ] Phases with no notes are omitted from the export entirely

### Verification

1. Ensure at least one day note exists (from Phase 4 work); open search with ⌘K
2. Type a unique word from that note → result with snippet appears → click → modal closes, navigated to the day
3. Type "URLSession" (appears in plan body text) → result appears
4. Click "Export notes" button → `my-notes.md` downloads → open in editor → phase/day headings present, note body intact
5. Confirm phases with no notes are absent from the export

### Next

Phase 7 closes the "markdown is source of truth" contract with the file watcher, adds keyboard navigation so you can drive the app without a mouse, and surfaces orphaned progress rows that would otherwise silently persist after a heading rename.

---

## Phase 7 — Watcher + polish

**Depends on:** Phase 6 · **Demo when done:** Edit a PHASE_*.md file and the sidebar updates within ~1s; `j`/`k`/`space`/`n` keyboard shortcuts work; a renamed heading that had progress shows an orphan warning.

### Goal

The app is feature-complete and pleasant to use daily for a year. The file watcher delivers on the "markdown is source of truth" invariant: editing a PHASE_*.md in any text editor updates the sidebar without a browser reload. Keyboard shortcuts let you navigate and toggle without touching the mouse — important for a tool you'll live inside during a multi-month program. Orphan detection prevents silent data drift when headings are renamed or deleted.

### Scope

1. `app/server/watcher.ts` — `fs.watch` on the repo root (non-recursive) watching `*.md` files; 100ms debounce; blows the in-memory plan cache; logs the changed filename to stdout
2. `app/server/index.ts` — start the watcher on boot; plan route re-parses from disk on next request after invalidation
3. Client-side auto-refresh — TanStack Query: `staleTime: 0` on the plan query, refetch on window focus, plus 10s polling interval so edits surface without requiring a focus event
4. `app/server/routes/orphans.ts` — `GET /api/orphans` (compares all `day_progress` + `checklist_progress` IDs against the current parsed tree; returns unmatched IDs); `DELETE /api/orphans/:id` (removes the row from whichever table owns it)
5. Mount orphan routes in `app/server/index.ts`
6. `app/src/components/Sidebar.tsx` — keyboard shortcuts: `j` / `k` move focused day up/down in sidebar order; `space` cycles the focused day's status; `n` moves focus to the notes textarea in the active day view; add orphan-warning banner when `/api/orphans` returns results, with a Delete button per orphan
7. ⌘K is already implemented in Phase 6

### Out of scope (post-v1)

- Richer notes editor (Milkdown, CodeMirror) — evaluate after using v1 for a few weeks
- Mobile-responsive layout
- Multi-user / remote hosting
- Notification / confetti when all phases are complete
- SSE / WebSocket for real-time watcher push (polling at 10s is sufficient for a single-user local tool)

### Files touched

- `app/server/watcher.ts` (new)
- `app/server/routes/orphans.ts` (new)
- `app/server/index.ts` (modified)
- `app/src/components/Sidebar.tsx` (modified)
- `app/src/App.tsx` (modified — add orphan query)

### Acceptance criteria

- [ ] Add `### Day 4 — test day (1 hr)` under Phase 3 Week 2 in `PHASE_3.md` and save; within ~1s the new day appears in the sidebar without a manual browser reload
- [ ] Delete that heading and save; within ~1s the day disappears from the sidebar
- [ ] `j` moves sidebar focus to the next day in tree order; `k` moves to the previous day; focus wraps at the list boundaries
- [ ] `space` cycles the focused day's status (`todo → in_progress → done → todo`); the change persists
- [ ] `n` moves keyboard focus to the notes textarea when a day view is open
- [ ] After adding a day, marking it done, then removing its heading from the markdown: a "Orphaned progress" warning appears in the sidebar listing that day ID
- [ ] Clicking "Delete" on an orphan removes the warning immediately and removes the DB row; a reload confirms the row is gone

### Verification

1. `bun dev`, open Phase 3 → Week 2 in the sidebar
2. In a text editor, add `### Day 4 — test day (1 hr)` under Week 2 in `PHASE_3.md`, save → new day appears in sidebar within ~1s; no browser reload needed
3. Delete the heading, save → day disappears within ~1s
4. Navigate to any day; press `j` → sidebar focus moves down; `k` → moves up; `space` → status cycles; reload → status persisted
5. Press `n` → cursor is in the notes textarea
6. Add a day heading, navigate to it, mark it done, then remove the heading from the markdown; within ~1s the sidebar shows "Orphaned progress" warning for that ID → click Delete → warning gone; `GET /api/orphans` returns an empty array

### Next

v1 is complete. Possible post-v1 directions: swap `NotesEditor` for a richer editor (Milkdown or CodeMirror for autocompletion and vim bindings); add a dashboard route at `/` that shows overall progress, current-phase summary, and last-edited note; wire SSE from the watcher so the browser updates instantly rather than on a poll interval.

---

## Appendix: dependency chain

Each phase depends linearly on the one before it. No phase skips ahead.

```
Phase 1 (data + API)
  └─ Phase 2 (rendering)
       └─ Phase 3 (persistence)
            └─ Phase 4 (notes)
                 └─ Phase 5 (phase views)
                      └─ Phase 6 (search + export)
                           └─ Phase 7 (watcher + polish)
```

**Cross-phase notes:**

- The parser (`app/server/parser.ts`) written in Phase 1 is never replaced — only the routes and UI layers built on top of it grow.
- The `checklist_progress` table introduced in Phase 3 handles both day inline checklists and mastery-gate checklists. Phase 5 adds the dedicated mastery-gate *view* but adds no new schema.
- The `notes_fts` virtual table added in Phase 6 is the only schema change after Phase 5; all other Phase 6 and 7 work is routes, components, and watcher logic.
- The file watcher in Phase 7 validates the core design decision from Phase 1: the in-memory plan cache (not the DB) is the source of truth for content, and it is always derivable from the markdown files on disk.
