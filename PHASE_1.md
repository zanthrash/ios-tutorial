# Phase 1 — SwiftUI Foundations

**Duration:** 6 weeks · **Budget:** ~40 hours total · **Pace:** 5–8 hrs/week

In Phase 0 you built the CLI Indexer — a concurrent Swift package with no UI. That exercise forced you to internalize value semantics, protocols, and async/await before touching anything visual. Phase 1 is where you finally open the canvas.

---

## Translating to your own app

The skill Phase 1 teaches is **declarative UI wired to persistent, observable state**. Every exercise — list, detail, sheet, search bar, SwiftData model — is an instance of a single underlying idea: your views are pure functions of state, and the framework is responsible for keeping the screen in sync when that state changes. The app concept exists only to give that skill a real surface to land on.

A good Phase 1 app has three properties: (1) it has a clear **list–detail structure** so you are forced to use NavigationStack and typed routes; (2) it needs **some form of persistence** so you can't avoid SwiftData; and (3) it is **narrow enough in scope** that you can ship a working MVP in 6 weeks without cutting corners on the concepts. Shelf — a local reading/reference tracker — fits all three. So does a personal book library, a recipe vault, or a film log. What does not fit: a social app (networking belongs to Phase 3), anything with a camera or maps (Phase 4), anything whose primary interaction is audio (Phase 6). If you picked a different concept, map every exercise in the weekly breakdowns to your equivalent: your "article list" is your "recipe list," your "reading progress slider" is your "watched/unwatched toggle." The skill transfers exactly.

---

## What you'll have at the end

1. **Shelf** (or your chosen equivalent) running on the iOS Simulator and side-loaded to your physical iPhone.
2. Core features working: create, read, and delete entries; tag entries; search; track reading progress — all persisted locally via SwiftData.
3. A NavigationStack with typed routes (`enum Route: Hashable`), a list view, a detail view, a create/edit sheet, and a search bar.
4. State ownership you can justify: you can point at every `@State`, `@Binding`, `@Observable`, `@Environment`, and `@Bindable` in your code and explain why that choice and not the others.
5. The app side-loaded and used on your device for at least one full week before you call Phase 1 done.

---

## What you WILL NOT do in Phase 1

- Add networking or remote sync (Phase 3).
- Build custom animations, haptics, or transitions (Phase 2).
- Write Share Extensions or App Intents (Phase 3 / Phase 4).
- Run Instruments or write snapshot tests (Phase 5 / Phase 6).
- Use UIKit directly for anything.
- Use `ObservableObject`, `@Published`, `@StateObject`, or `@ObservedObject` — those are legacy. If a tutorial uses them, close it.
- Use `NavigationView` — it is deprecated. Use `NavigationStack`.
- Use Core Data — use SwiftData.

That's Phase 2 and beyond. Stay disciplined — this phase is about **SwiftUI fundamentals and SwiftData**, nothing else.

---

## Week 1 — SwiftUI mental model (5–7 hrs)

Goal: understand *why* SwiftUI works the way it does before writing a single line of Shelf. You will spend this week reading and doing targeted exercises, not building the app.

### Day 1 — Watch the foundational sessions (2 hrs)

Watch these two back-to-back. They are the conceptual foundation for everything in this phase.

1. **Demystify SwiftUI** (WWDC21, ~38 min) — https://developer.apple.com/videos/play/wwdc2021/10022/
   Identity, lifetime, dependencies. After this video you should be able to answer: "Why does SwiftUI sometimes preserve my `@State` and sometimes reset it?"

2. **Discover Observation in SwiftUI** (WWDC23, ~25 min) — https://developer.apple.com/videos/play/wwdc2023/10149/
   The `@Observable` macro and why it replaces `ObservableObject`. Pay close attention to the section comparing old code to new — this comparison will save you hours of confusion.

Do not take notes. Watch for understanding; you will return to these as reference.

### Day 2 — Apple's SwiftUI tutorial (2–3 hrs)

Work through **Apple's official "Introducing SwiftUI" tutorial**: https://developer.apple.com/tutorials/swiftui

Complete the first two sections: **SwiftUI essentials** and **Views**. Do the exercises, don't just read. When you hit something that uses `@StateObject` or `ObservableObject` (older tutorial versions sometimes do), note it as legacy and move on — you will not use those in your own app.

### Day 3-4 — Experiment in a scratch project (1–2 hrs)

Create a throwaway Xcode project called `SwiftUILab`. In it, write small isolated experiments:

```swift
// Experiment 1: verify body re-evaluation
struct Counter: View {
    @State private var count = 0
    var body: some View {
        let _ = Self._printChanges() // paste this in while experimenting
        Button("Count: \(count)") { count += 1 }
    }
}
```

Try: `@State` on a simple value; `@Binding` passed down one level; an `@Observable` class observed by a view. For each, use `Self._printChanges()` to see when `body` re-evaluates. Delete the project when you're done — this is scratch work.

### Day 5-7 — Create the Shelf Xcode project (1–2 hrs)

1. In Xcode: `File → New → Project` → iOS → **App**. Product Name: `Shelf`. Interface: **SwiftUI**. Storage: **SwiftData**. Language: **Swift**.
2. Xcode will generate a sample model and query. **Delete the generated `Item` model** — you'll write your own.
3. Set the deployment target to **iOS 17.0** (required for `@Observable` and SwiftData).
4. Set the bundle identifier to something real (e.g. `com.yourname.shelf`). Sign it with your developer account using the same flow you learned in Phase 0, Week 1 Day 2. Phase 0's instructions cover this — do not repeat the process here, just follow them.
5. Run on Simulator — the blank app should launch without errors.
6. Create a GitHub repo for Shelf and push the initial commit.

---

## Week 2 — Layout and stacks (6–8 hrs)

Goal: be able to build any static screen layout from a design using VStack, HStack, ZStack, and List without fighting the layout engine.

### Day 1 — Read: layout fundamentals (1–2 hrs)

Read the following Apple documentation pages (skim the API tables; read the conceptual prose carefully):

- SwiftUI Layout Fundamentals — search "Layout fundamentals" in Apple Developer docs
- `GeometryReader` documentation — understand why to use it sparingly: it breaks the parent-proposes-child-decides contract

Also skim **"Compose custom layouts with SwiftUI"** (WWDC22, ~27 min) — https://developer.apple.com/videos/play/wwdc2022/10056/ — you do not need to implement the `Layout` protocol this week, but you need to know it exists for when stacks aren't enough.

### Day 2 — Build the Shelf entry list screen (2–3 hrs)

Write the `ShelfEntry` model and your first real views:

```swift
import SwiftData

@Model
final class ShelfEntry {
    var title: String
    var url: String
    var tags: [String]
    var progressPercent: Int    // 0–100
    var createdAt: Date
    var notes: String

    init(title: String, url: String = "", tags: [String] = [],
         progressPercent: Int = 0, notes: String = "") {
        self.title = title
        self.url = url
        self.tags = tags
        self.progressPercent = progressPercent
        self.createdAt = .now
        self.notes = notes
    }
}
```

Build `EntryListView`: a `List` of entries fetched with `@Query`, each row showing title, tags, and a small progress indicator. Add a toolbar button that calls a closure to present the add sheet (not implemented yet — use a placeholder `Text("Add")`).

### Day 3-4 — Safe areas, padding, and List customisation (1–2 hrs)

Experiment with `.listStyle`, `.listRowSeparator`, `.listRowInsets`, `.contentMargins`. Make the list look intentional — not the Xcode default. You will polish this in Phase 2; for now just understand the modifiers that exist.

### Day 5-7 — Build the detail view (2–3 hrs)

Build `EntryDetailView`: displays all fields of a `ShelfEntry`. Include the progress percentage as a `ProgressView(value:)`. No editing yet — that's next week. Wire the list row to push the detail view (hard-code the navigation destination for now — you'll convert to typed routes in Week 3).

---

## Week 3 — Navigation and state ownership (6–8 hrs)

Goal: NavigationStack with typed routes working end-to-end; `@State`, `@Binding`, `@Observable`, `@Environment`, `@Bindable` — you can pick the right one without hesitating.

### Day 1 — Read and watch: navigation (1–2 hrs)

Watch **"The SwiftUI cookbook for navigation"** (WWDC22, ~20 min) — https://developer.apple.com/videos/play/wwdc2022/10054/

This session introduces `NavigationStack` with value-based navigation. The pattern you will use throughout Shelf:

```swift
enum Route: Hashable {
    case detail(ShelfEntry)
    case settings
}

NavigationStack(path: $path) {
    EntryListView()
        .navigationDestination(for: Route.self) { route in
            switch route {
            case .detail(let entry): EntryDetailView(entry: entry)
            case .settings:         SettingsView()
            }
        }
}
```

### Day 2 — Wire up typed navigation in Shelf (2–3 hrs)

Convert Shelf's navigation to use a typed `Route` enum. Pass the `path` binding down through `@Environment` or a simple `@Observable` navigation model. Your list rows push `.detail(entry)`. Add a `.sheet` for the "add entry" flow.

Build `AddEntryView`: a form with fields for title, URL/notes, and tags. When the user taps Save, insert a new `ShelfEntry` into `modelContext`:

```swift
@Environment(\.modelContext) private var modelContext

func save() {
    let entry = ShelfEntry(title: title, url: url, tags: parsedTags)
    modelContext.insert(entry)
}
```

### Day 3-4 — State ownership deep dive (2 hrs)

Write the following on paper or in a comment block — do not proceed until you can do this from memory:

| Scenario | Use |
|---|---|
| A counter local to one view | `@State` |
| A toggle passed into a child view that needs to mutate it | `@Binding` |
| A shared data model observed by multiple views | `@Observable` on the class; no wrapper needed in the view unless you need a binding |
| Getting a two-way binding into an `@Observable` property | `@Bindable` |
| App-wide services (modelContext, dismiss, colorScheme) | `@Environment` |

Make your `AddEntryView` use `@Bindable` to bind text fields directly to an `@Observable` draft model rather than local `@State` strings. Feel the difference.

### Day 5-7 — Edit flow (2–3 hrs)

Wire up editing: tapping a detail view should allow editing in place (or present a sheet). Use `@Bindable` to create two-way bindings on the `ShelfEntry` directly — SwiftData `@Model` classes conform to `Observable`, so `@Bindable` works on them:

```swift
struct EntryDetailView: View {
    @Bindable var entry: ShelfEntry
    // TextField("Title", text: $entry.title) — works directly
}
```

Add swipe-to-delete on the list using `.onDelete` and `modelContext.delete(_:)`.

---

## Week 4 — Concurrency and SwiftData queries (6–8 hrs)

Goal: `.task` for async work; `@Query` with predicates, sorting, and filtering; search working end-to-end.

### Day 1 — Watch: Meet SwiftData + Build an app with SwiftData (2 hrs)

Watch both back-to-back:

- **Meet SwiftData** (WWDC23, ~22 min) — https://developer.apple.com/videos/play/wwdc2023/10187/
- **Build an app with SwiftData** (WWDC23, ~26 min) — https://developer.apple.com/videos/play/wwdc2023/10154/

Focus on: `@Query` with `#Predicate` and `SortDescriptor`, `ModelContainer` setup, and how `modelContext` flows into views.

### Day 2 — Filtered queries and search (2–3 hrs)

Add a search bar to `EntryListView` using `.searchable`. Drive the filter with a dynamic `@Query`. The idiomatic pattern in SwiftData is to pass the search term into a subview that constructs the `@Query` with a `#Predicate`:

```swift
struct FilteredEntryList: View {
    @Query private var entries: [ShelfEntry]

    init(searchText: String) {
        let predicate = #Predicate<ShelfEntry> { entry in
            searchText.isEmpty || entry.title.localizedStandardContains(searchText)
        }
        _entries = Query(filter: predicate, sort: \.createdAt, order: .reverse)
    }

    var body: some View {
        ForEach(entries) { entry in
            EntryRow(entry: entry)
        }
    }
}
```

This pattern — constructing `@Query` in `init` via `_entries` — is the correct SwiftData approach. Not a computed `filter` on an unfiltered array.

### Day 3-4 — Tag filtering (2 hrs)

Add a horizontal tag filter strip above the list. When a tag chip is selected, filter entries to those containing that tag. Drive this with a second predicate in your filtered query view, or layer it as a client-side filter on a tag-scoped result. Either works at MVP scale.

### Day 5-7 — `.task`, async work, and reading progress (2–3 hrs)

Add reading progress: a slider in the detail view that updates `entry.progressPercent`. This is synchronous SwiftData — no `.task` needed.

Now add something that actually needs `.task`: when an entry has a URL, use `.task` to fetch the page title from the URL (a `URLSession` GET, parse `<title>` from HTML with a simple regex or string search) and pre-fill the entry title if it's blank. This teaches you the pattern:

```swift
.task {
    guard let url = URL(string: entry.url), entry.title.isEmpty else { return }
    // async work here — automatically cancelled when the view disappears
    if let fetchedTitle = await fetchTitle(from: url) {
        entry.title = fetchedTitle
    }
}
```

Cancellation on view disappear is automatic with `.task` — document this in a comment.

---

## Week 5 — Polish, edge cases, and device side-load (6–8 hrs)

Goal: the app is feature-complete to MVP spec. Side-loaded and running on your physical device.

### Day 1 — Wire up the full ModelContainer (1–2 hrs)

Confirm your `@main` App struct is configured correctly for production use. The Xcode SwiftData template generates a helper — audit it, understand every line:

```swift
@main
struct ShelfApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: ShelfEntry.self)
    }
}
```

Add error handling: wrap the container creation in a `do/catch` if you use a custom configuration, and present a user-visible error view rather than crashing silently.

### Day 2-3 — Edge cases and empty states (2–3 hrs)

- Empty list state: a `ContentUnavailableView` when no entries exist and no search is active.
- Empty search results: `ContentUnavailableView.search` when the query returns nothing.
- Long titles: verify your list row doesn't clip or overflow.
- Tags with special characters: confirm they round-trip through SwiftData correctly.
- App backgrounded and foregrounded: data persists.

### Day 4 — Side-load to device (1–2 hrs)

Follow the same device-signing flow from Phase 0, Week 1 Day 2 — connect your iPhone, select it as the destination, and run. The first time, you may need to trust the developer profile in Settings → General → VPN & Device Management.

If you hit a SwiftData migration error on device (schema mismatch from iterating during development), delete the app from the device and reinstall. Formal migrations are Phase 3.

### Day 5-7 — Use it (remaining hrs)

Use Shelf on your device as your actual reading tracker for the rest of this phase. Add real entries. Notice what feels broken. File those observations as GitHub issues — you'll fix them in Phase 2 and Phase 3, not now. Do not start feature work you haven't planned.

---

## Week 6 — Consolidate, test the mastery gate, wrap up (5–6 hrs)

Goal: you can build the mastery gate features from scratch without help. Clean up the codebase and check every box.

### Day 1-2 — Scaffold a second clean app from memory (2–3 hrs)

Without referencing Shelf, create a new throwaway Xcode project and scaffold the following in one session:

1. A `@Model` with at least two properties.
2. A `NavigationStack` with a typed `Route` enum and `navigationDestination`.
3. A list driven by `@Query`.
4. A `.sheet` for creating a new record, inserting it into `modelContext`.
5. A `.searchable` bar with a `#Predicate` filter.
6. Run it on Simulator.

If you can do this in under 90 minutes without googling, you've passed. If not, identify the gaps and spend the remaining days closing them — re-read the relevant week, re-watch the relevant WWDC session.

### Day 3-4 — Code review and cleanup (1–2 hrs)

Read every file in Shelf with fresh eyes. For each `@State`, `@Binding`, `@Observable`, `@Environment`, `@Bindable`, write a one-line comment explaining the ownership choice. If you can't justify it, refactor it.

Delete dead code. Ensure every view file has a `#Preview` that works.

### Day 5-7 — Final device test and mastery gate self-assessment (1–2 hrs)

Run the full app on device. Check every mastery gate box below. If any box is unchecked, spend the remaining time on it — not on new features.

---

## Mastery gate — end of Phase 1

You pass when you can do each of the following without a tutorial:

- [ ] Scaffold a new SwiftUI app with a `NavigationStack`, typed `Route` enum, and `navigationDestination` from scratch.
- [ ] Define a SwiftData `@Model`, configure a `ModelContainer`, query with `@Query` and a `#Predicate`, and insert/delete records.
- [ ] Implement a list–detail flow where the detail view binds directly to the model using `@Bindable`.
- [ ] Add a `.searchable` bar that filters a `@Query` result using a predicate constructed in `init`.
- [ ] Explain, without looking anything up, which property wrapper to use in each scenario:
  - a counter owned by one view
  - a boolean flag that two sibling views need to read and write
  - a shared service object observed by many views
  - a two-way text field binding into an `@Observable` class property
  - the SwiftUI environment's `modelContext`
- [ ] Read any SwiftUI view and predict which external changes will cause `body` to re-evaluate and which will not.
- [ ] Use `.task` for async work and explain why cancellation is automatic.
- [ ] Run the app on your physical device via direct provisioning.

---

## Resources — Phase 1

Ordered by priority. Must-use items are marked.

### Primary references (must-use)

- 📘 **SwiftUI documentation** — https://developer.apple.com/documentation/swiftui
  > Reference for every view, modifier, and property wrapper used in this phase. Do not read cover-to-cover; use as reference.

- 📘 **SwiftData documentation** — https://developer.apple.com/documentation/swiftdata
  > Reference for `@Model`, `@Query`, `ModelContainer`, `ModelContext`, `#Predicate`.

- 📘 **Apple's SwiftUI tutorials** ("Introducing SwiftUI") — https://developer.apple.com/tutorials/swiftui
  > Work through "SwiftUI essentials" and "Views" in Week 1. Use as reference thereafter.

### Videos (must-watch in Phase 1)

- 🎬 **Demystify SwiftUI** — WWDC21 — https://developer.apple.com/videos/play/wwdc2021/10022/ (~38 min)
  > Identity, lifetime, dependencies. The mental model for everything.

- 🎬 **Discover Observation in SwiftUI** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10149/ (~25 min)
  > `@Observable`, `@Bindable`, and why `ObservableObject` is legacy.

- 🎬 **The SwiftUI cookbook for navigation** — WWDC22 — https://developer.apple.com/videos/play/wwdc2022/10054/ (~20 min)
  > `NavigationStack`, value-based navigation, `navigationDestination`.

- 🎬 **Meet SwiftData** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10187/ (~22 min)
  > `@Model`, `@Query`, `ModelContainer` — the essential introduction.

- 🎬 **Build an app with SwiftData** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10154/ (~26 min)
  > Hands-on SwiftData + SwiftUI integration. Watch immediately after "Meet SwiftData."

### Videos (optional, if time)

- 🎬 **What's new in SwiftUI** — WWDC22 — https://developer.apple.com/videos/play/wwdc2022/10052/ (~50 min)
  > Good broad survey; skip sections on macOS/visionOS for now.

- 🎬 **What's new in SwiftUI** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10148/ (~48 min)
  > Introduces `@Observable` integration in depth; skip the visionOS sections.

- 🎬 **What's new in SwiftUI** — WWDC24 — https://developer.apple.com/videos/play/wwdc2024/10144/ (~35 min)
  > Good context for where SwiftUI is heading; optional in Phase 1.

- 🎬 **Compose custom layouts with SwiftUI** — WWDC22 — https://developer.apple.com/videos/play/wwdc2022/10056/ (~27 min)
  > `Layout` protocol, `Grid`, `ViewThatFits`. Watch if stacks aren't solving your layout problem.

- 🎬 **Demystify SwiftUI performance** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10160/ (~30 min)
  > How to read `printChanges()` output and reduce unnecessary re-renders. Save for Week 6 if needed.

### Books (optional, paid)

- 📗 **Thinking in SwiftUI** by objc.io (Chris Eidhof & Florian Kugler) — https://www.objc.io/books/thinking-in-swiftui/ (~$39 ebook)
  > The single best written treatment of how SwiftUI's layout and state system actually work. Not a tutorial; a mental model builder. Read alongside Week 1–2 if you buy it.

### Free alternatives / supplementary reading

- 🔗 **Hacking with Swift — SwiftUI by example (free)** — https://www.hackingwithswift.com/quick-start/swiftui — Paul Hudson's free SwiftUI reference. Excellent for "how do I do X" lookups when you know what you want but don't know the modifier name.
- 🔗 **Swift by Sundell** — https://www.swiftbysundell.com/ — Short, well-written articles on specific SwiftUI patterns. Search for specific topics as you encounter them.
- 🔗 **Donny Wals blog** — https://www.donnywals.com/ — Strong on SwiftData and `@Observable` specifically. Search "SwiftData" and "Observation" on his blog.

### Tools

- 🛠️ **SF Symbols app** — https://developer.apple.com/sf-symbols/ — Use for every icon in Shelf. Already installed from Phase 0.
- 🛠️ **Xcode Previews** — Use `#Preview` macros aggressively. Previews are your fast iteration loop; running in Simulator should be for integration checks.
- 🛠️ **`Self._printChanges()`** — Drop this into any `body` while debugging unexpected re-renders. Remove before committing.

---

## If you get stuck

In rough order of what to try:

1. **Check which property wrapper you're using.** A large fraction of Phase 1 bugs are wrong ownership: a `@State` that should be `@Bindable`, an `@Observable` class not observed because it was passed as a value type somewhere.
2. **Use `Self._printChanges()`** to see what triggered the re-render. Often it reveals a dependency you didn't intend.
3. **Read the SwiftData error message slowly.** "Model not found in any ModelContainer" means you forgot `.modelContainer(for:)` or you're previewing without setting one up.
4. **Hacking with Swift search** — https://www.hackingwithswift.com/quick-start/swiftui — Paul Hudson covers most common SwiftUI patterns with short examples.
5. **Apple Developer Forums** — https://developer.apple.com/forums/ — Better signal than Stack Overflow for SwiftUI. Filter to the SwiftUI tag.
6. **Ask Claude** — describe what you tried, paste the compiler error or unexpected behavior, say what you expected.

Avoid **Stack Overflow and pre-2023 blog posts** as primary sources. `ObservableObject`, `@StateObject`, `NavigationView`, and Core Data answers will actively mislead you. Trust Apple docs, WWDC sessions, and sources that mention `@Observable` and SwiftData first.

---

## When you're done

1. Shelf (or your equivalent) builds and runs on your physical device.
2. All five core features work: create, read, delete, tag, search, reading progress.
3. You can check every box in the Mastery Gate section.
4. You've used the app on your device for at least one week.
5. GitHub repo is up to date.

Move to Phase 2. Phase 2 is the craft layer: Human Interface Guidelines, accessibility, motion, and haptics. You will take Shelf's detail view and make it feel like it belongs next to Apple's own apps — matched geometry transitions, contextual haptics, full VoiceOver support, and Dynamic Type up to AX5. Do not start Phase 2 until you can check every mastery gate box above — retrofitting accessibility across an app you don't understand is painful.
