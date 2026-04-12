# Phase 5 — Advanced Swift, Testing, CI, Refactor

**Duration:** 5 weeks · **Budget:** ~34 hours total · **Pace:** 5–8 hrs/week

## Translating to your own app

This phase does not build anything new. It surgically improves what already exists: **Shelf** (App 1, live on the App Store) and **Anchor** (App 2, on TestFlight). Every technique you apply here is concept-agnostic — the protocol-based service extraction, the test harness, and the CI pipeline are identical regardless of whether your app stores book entries or journal moments. If you built different apps in Phases 1–4, the same principles apply directly to them.

"Protocol-based service" means this: instead of a view or view-model calling a concrete type directly (e.g., `SwiftDataBookStore()`), you define a protocol (`BookStoring`) that describes the operations, write the concrete type conforming to that protocol, and inject the conforming instance through SwiftUI's `Environment`. In tests you inject a mock conformance instead. The view never knows which it got. This is the entire dependency injection pattern, no framework required. Phase 5 is the right time to retrofit it because you now have real, non-trivial apps with real pain points — the seams where you need it will be obvious.

---

## What you'll have at the end

1. **Shelf** refactored: protocol-based service layer injected via `Environment`; Swift 6 strict concurrency on, zero warnings.
2. **Anchor** refactored: same treatment, plus any PhotoKit or MapKit boundary wrappers extracted as protocols.
3. **Unit test suite** for both apps covering non-view logic — target 70%+ line coverage on service objects, model logic, and transformation functions.
4. **Snapshot tests** covering major views at multiple Dynamic Type sizes and in light and dark mode.
5. **GitHub Actions CI** that runs `xcodebuild test` on every push and blocks merge on red.
6. A working understanding of when protocol-oriented design helps and when it adds noise.

---

## What you WILL NOT do in Phase 5

- Build a new app or add user-facing features to Shelf or Anchor.
- Adopt TCA, Clean Architecture, VIPER, or any third-party architecture framework. (See the trap warning below.)
- Write tests for SwiftUI `body` properties or test view rendering logic through unit tests — that is what snapshot tests cover.
- Introduce a dependency injection container or service locator. Plain `Environment` is enough.
- Spend time on visual polish. This is engineering work, not craft work.

---

## Week 1 — Protocol extraction and SwiftUI Environment injection

**Theme:** Identify the concrete dependencies in Shelf and Anchor, extract them behind protocols, inject via `Environment`.

**Goal by end of week:** Both apps compile and run identically after refactor. No behavior change — you are only restructuring access paths.

### Day 1 — Audit and map dependencies (1 hr)

For each app, open the codebase and list every place a view or view-model instantiates or directly calls:
- A SwiftData `ModelContext` beyond simple `@Query` reads
- A `URLSession` or network call
- A `FileManager` operation
- Any PhotoKit or MapKit interaction (Anchor)
- Any singleton or global function with side effects

Write this list in a `REFACTOR_NOTES.md` scratch file (delete it at the end of the phase). This is your extraction target list.

### Day 2–3 — Extract service protocols for Shelf (2–3 hrs)

A typical Shelf service might look like:

```swift
protocol ArticleStoring: Sendable {
    func save(_ article: Article) async throws
    func delete(id: UUID) async throws
    func fetchAll() async throws -> [Article]
}
```

Write the concrete SwiftData-backed conformance. Then define an `EnvironmentKey` and register the concrete implementation at the app root:

```swift
struct ArticleStoreKey: EnvironmentKey {
    static let defaultValue: any ArticleStoring = SwiftDataArticleStore()
}

extension EnvironmentValues {
    var articleStore: any ArticleStoring {
        get { self[ArticleStoreKey.self] }
        set { self[ArticleStoreKey.self] = newValue }
    }
}
```

Views access it via `@Environment(\.articleStore)`. Replace every direct call site.

### Day 4–5 — Repeat for Anchor; enable Swift 6 concurrency mode on both (2–3 hrs)

In each app's `project.pbxproj` (via Xcode → Build Settings → Swift Language Version → "Swift 6") or in a Swift Package's `Package.swift`:

```swift
swiftSettings: [.enableExperimentalFeature("StrictConcurrency")]
```

For Xcode projects, set **Strict Concurrency Checking** to **Complete** under Build Settings. Fix every warning. Warnings are not style suggestions — they are data race reports the compiler caught ahead of time. Common patterns you'll hit:

- A `@MainActor`-isolated type calling into something not isolated — annotate the service `@MainActor` or make it fully `Sendable` via an `actor`.
- A closure passed to `.task {}` capturing a non-`Sendable` reference — make the model `final class` with `@unchecked Sendable` (temporarily) or convert it to a `Sendable` struct.

Commit when both apps build clean under Swift 6.

---

## Week 2 — Unit tests: services, models, transformations

**Theme:** Write tests that cover every non-view code path with a mock injected via Environment.

**Goal by end of week:** 70%+ line coverage on service objects and model logic. All tests green locally.

### Day 1 — Add test targets and mock services (1 hr)

Add a Unit Test target to each Xcode project (File → New → Target → Unit Testing Bundle). Add `swift-testing` if not already present — it ships with Xcode 16, so for Xcode-project tests you just import it:

```swift
import Testing
@testable import Shelf
```

Write a `MockArticleStore` that conforms to `ArticleStoring` and stores data in an in-memory array. Because you designed the protocol to be `Sendable` with async methods, the mock is trivial to write and needs no SwiftData.

### Day 2–4 — Write the test suite (3–4 hrs)

Cover these categories:

**Model logic** — any computed property, sorting, filtering, or transformation on a model struct. Example: `Article.isUnread`, `Article.tags(matching:)`, reading progress percentage calculation.

**Service logic** — save/fetch/delete round trips against the mock. Verify that calling `save` followed by `fetchAll` returns the saved item.

**Parameterized tests** — use `@Test(arguments:)` for anything with multiple valid inputs. This is the macro-based parameterized test the mastery gate requires:

```swift
@Test(
    "tag normalization",
    arguments: [
        ("  Swift  ", "swift"),
        ("iOS Development", "ios development"),
        ("", ""),
    ]
)
func tagNormalization(input: String, expected: String) {
    #expect(Tag.normalize(input) == expected)
}
```

**Async confirmation tests** — for any async notification or event stream, use `confirmation`:

```swift
@Test func saveEmitsChangeEvent() async {
    await confirmation("store emits change after save") { confirm in
        let store = MockArticleStore(onChange: { confirm() })
        try await store.save(Article.fixture())
    }
}
```

### Day 5 — Measure coverage and fill gaps (1 hr)

In Xcode: Product → Scheme → Edit Scheme → Test → Options → Enable Code Coverage. Run tests. Open the Report Navigator → Coverage tab. Identify uncovered branches in service files and write targeted tests to cover them. You are not chasing 100% — you are covering the logic that can break silently.

---

## Week 3 — Snapshot testing across Dynamic Type and dark mode

**Theme:** Add `swift-snapshot-testing` and write image snapshots of major views.

**Goal by end of week:** Every primary view in Shelf and Anchor has at least three snapshots: default size, large accessibility size (AX3+), and dark mode.

### Day 1 — Add swift-snapshot-testing (30 min)

In Xcode: File → Add Package Dependencies → enter:

```
https://github.com/pointfreeco/swift-snapshot-testing
```

Current stable version: 1.17.x. Add the `SnapshotTesting` product to your test target. The library adds one function: `assertSnapshot(of:as:)`.

### Day 2–3 — Write snapshot tests for Shelf (2–3 hrs)

Snapshot tests go in a separate test target or in a clearly named subfolder of your existing test target. They snapshot view controllers or SwiftUI views wrapped in a `UIHostingController`.

**Basic device snapshot:**

```swift
import SnapshotTesting
import Testing
import SwiftUI

@MainActor
struct ArticleListSnapshotTests {
    @Test func articleListDefault() {
        let view = ArticleListView(store: MockArticleStore.populated())
        assertSnapshot(of: UIHostingController(rootView: view), as: .image(on: .iPhone13))
    }
}
```

**Dark mode:**

```swift
@Test func articleListDarkMode() {
    let view = ArticleListView(store: MockArticleStore.populated())
    let vc = UIHostingController(rootView: view)
    assertSnapshot(
        of: vc,
        as: .image(on: .iPhone13, traits: UITraitCollection(userInterfaceStyle: .dark))
    )
}
```

**Dynamic Type (large accessibility size):**

```swift
@Test func articleListAccessibilityXL() {
    let view = ArticleListView(store: MockArticleStore.populated())
    let vc = UIHostingController(rootView: view)
    assertSnapshot(
        of: vc,
        as: .image(on: .iPhone13, traits: UITraitCollection(preferredContentSizeCategory: .accessibilityExtraLarge))
    )
}
```

The first time you run snapshot tests, there are no reference images — the test creates them and fails with "recorded snapshot." Run once to record, then run again to assert. Commit the `__Snapshots__` folder — it is the source of truth for your UI regression suite.

### Day 4–5 — Repeat for Anchor; review over-testing trap (1–2 hrs)

Snapshot Anchor's primary views: the moment timeline, the map view, the add-moment sheet. Then stop and explicitly ask: *am I testing logic here or just pixel positions?* Snapshot tests are regression tests, not logic tests. Their value is catching unintended visual regressions — a layout that broke at AX5, a color that disappeared in dark mode. Writing 40 snapshot tests for a 5-screen app is over-investment; 8–12 covering the primary compositions is right.

**Trap to avoid:** Over-testing views. Snapshot tests on major views catch real regressions. Unit testing every `body` property does not. Concentrate test coverage on service objects, model logic, transformations, and any code with conditional branching. A view whose sole job is to render a model's properties needs a snapshot test, not a unit test.

---

## Week 4 — GitHub Actions CI

**Theme:** Wire up a CI pipeline that runs your full test suite on every push.

**Goal by end of week:** Every push to `main` or any open PR triggers `xcodebuild test`. Red CI blocks merge.

### Day 1 — Create the workflow file (1 hr)

Create `.github/workflows/ci.yml` in each app's repository (or a monorepo root if applicable):

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: macos-15
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Select Xcode
        run: sudo xcode-select -s /Applications/Xcode_16.2.app

      - name: Build and test
        run: |
          xcodebuild test \
            -scheme Shelf \
            -destination 'platform=iOS Simulator,name=iPhone 16,OS=18.2' \
            -resultBundlePath TestResults.xcresult \
            | xcpretty

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: TestResults.xcresult
```

Key points:
- `macos-15` runners have Xcode 16 pre-installed. Check the GitHub Actions runner images page for current available Xcode versions — these change with OS releases.
- The `-destination` simulator name must match a simulator actually available on the runner. `iPhone 16` with `OS=18.2` is a safe default for `macos-15` as of early 2026. If the job fails on an unavailable simulator, check GitHub's `actions/runner-images` repo for the current simulator list.
- `xcpretty` formats the otherwise verbose `xcodebuild` output. Install it: `gem install xcpretty` — or omit it and pipe to `tee` if you want raw output.
- For a Swift Package (not an Xcode project), replace the `xcodebuild` line with `swift test --enable-code-coverage`.

### Day 2 — Enable branch protection (30 min)

In GitHub → repository Settings → Branches → Add branch protection rule for `main`:
- Check "Require status checks to pass before merging."
- Select the `test` job from your workflow.
- Check "Require branches to be up to date before merging."

Push a deliberately failing test to verify that CI blocks the merge. Fix it. This is the proof that CI is load-bearing, not decorative.

### Day 3–4 — Fix CI-only failures (1–2 hrs)

The most common CI-only failures:
- **Snapshot test platform mismatch** — snapshots recorded on your Mac at a specific scale differ from the CI simulator's scale. Record snapshots from a simulator at the same resolution and OS version CI uses. Consider adding a `--record` flag controlled by an environment variable.
- **Missing simulator** — see above; pin your `-destination` to what the runner actually has.
- **Keychain access** — if anything reads from the Keychain in tests, it will fail on CI. Mock it via the service protocol instead.
- **Hardcoded absolute paths** — use `Bundle.module` for test fixtures, not paths that only work on your machine.

### Day 5 — Apply the same CI setup to the second app (1 hr)

Anchor's workflow is identical. Duplicate, change the scheme name and any simulator differences, push. Both apps now have green CI.

---

## Week 5 — Advanced Swift language features: result builders, property wrappers, macros as consumer

**Theme:** Learn the language features you have been using without knowing how they work. Build one small exercise to internalize each. Apply where genuinely useful in Shelf or Anchor.

**Goal by end of week:** You can read a `@resultBuilder` definition and understand what it desugars to. You can write a property wrapper from scratch. You can use Swift macros as a consumer (not an author) and understand what code they expand to.

### Day 1–2 — Result builders (1.5 hrs)

Read the TSPL section on result builders. Then read the `@ViewBuilder` source — you have been using a result builder since your first SwiftUI screen. Key insight: every `VStack { ... }` closure is not magic; it is a function builder transformation from an implicit `buildBlock(...)` call.

Exercise: write a `@StringBuilder` that transforms a closure of optional strings into a joined, non-nil result. Apply it nowhere; this is pure understanding work.

### Day 3 — Property wrappers (1 hr)

You already use `@State`, `@Environment`, `@Query`, `@AppStorage`. Write one from scratch: a `@Clamped<T: Comparable>` property wrapper that keeps a numeric value within a declared range. Takes 30–60 minutes. The goal is reading — when you encounter a custom property wrapper in a library, you will no longer treat it as magic.

### Day 4–5 — Macros as a consumer (1.5 hrs)

You cannot write a macro without a separate macro package; that is out of scope here. But you can expand them. In Xcode, right-click any `#expect(...)` call → Expand Macro. Do the same with `@Observable` on a model class. Understand that macros are code generators, not runtime magic, and that they are fully inspectable.

Find one place in Shelf or Anchor where the expansion of `@Observable` produced more boilerplate than you realized. This is the mechanical literacy you need to debug macro-related compiler errors.

---

## Mastery gate — end of Phase 5

All of the following must be true before you move to Phase 6.

**CI**
- [ ] GitHub Actions CI runs on every push to `main` for both Shelf and Anchor.
- [ ] A deliberately broken test blocks merge. You have verified this manually.
- [ ] CI has been green on the last three consecutive commits.

**Concurrency**
- [ ] Swift 6 strict concurrency mode is active in both apps (Build Settings → Swift Language Version → Swift 6, or Strict Concurrency Checking → Complete).
- [ ] Zero concurrency warnings in both apps. Zero. Not "mostly zero."

**Testing**
- [ ] 70%+ line coverage on non-view code in Shelf (confirmed in Xcode coverage report).
- [ ] 70%+ line coverage on non-view code in Anchor.
- [ ] At least one `@Test(arguments:)` parameterized test is present and passing.
- [ ] At least one `confirmation` async test is present and passing.
- [ ] Snapshot tests cover each primary view in both apps at: default size, an accessibility size (AX3 or larger), and dark mode.

**Architecture**
- [ ] You can, without referencing any tutorial, extract a new concrete type from a view, define a protocol for it, and inject it via `Environment` — in under 20 minutes on a fresh screen.
- [ ] Every major service in Shelf and Anchor is accessed through a protocol, not a concrete type, in production code.

**Language**
- [ ] You can read a `@resultBuilder` definition and explain what `buildBlock` does.
- [ ] You can write a property wrapper from scratch.
- [ ] You can expand a macro in Xcode and explain what code it generated.

If you cannot check all boxes: do not move on. Phase 6 builds on green CI. Red CI entering Phase 6 means you spend Week 1 on Phase 5 debt instead of AVFoundation.

---

## Resources — Phase 5

Ordered by priority. Must-use items are marked.

### Primary references (must-use)

- 📘 **The Swift Programming Language — Protocols** — https://docs.swift.org/swift-book/documentation/the-swift-programming-language/protocols/
  > Re-read with the lens of protocol-as-boundary, not protocol-as-type. Pay attention to `any` vs `some` and when associated types force a concrete type.

- 📘 **The Swift Programming Language — Result Builders** — https://docs.swift.org/swift-book/documentation/the-swift-programming-language/advancedoperators/#Result-Builders
  > Read this when you hit Week 5 Day 1.

- 📘 **The Swift Programming Language — Property Wrappers** — https://docs.swift.org/swift-book/documentation/the-swift-programming-language/properties/#Property-Wrappers

- 📘 **swift-snapshot-testing README** — https://github.com/pointfreeco/swift-snapshot-testing
  > The README is the primary reference. Read the "Snapshot Strategies" section in full before writing your first snapshot test.

- 📘 **Swift Testing documentation** — https://developer.apple.com/documentation/testing
  > Reference for `@Test(arguments:)`, traits, `confirmation`. You already know the basics from Phase 0; this phase uses the advanced features.

### Videos (must-watch)

- 🎬 **Meet Swift Testing** — WWDC24 — https://developer.apple.com/videos/play/wwdc2024/10179/ (~24 min)
  > If you watched this in Phase 0, re-watch with the Phase 5 features in mind: parameterized tests and `confirmation`.

- 🎬 **Go further with Swift Testing** — WWDC24 — https://developer.apple.com/videos/play/wwdc2024/10195/ (~26 min)
  > Covers parameterized testing, traits, tags, and async testing in depth. Watch before Week 2.

- 🎬 **Migrate your app to Swift 6** — WWDC24 — https://developer.apple.com/videos/play/wwdc2024/10169/ (~41 min)
  > Walks through real Swift 6 migration on a sample app. Watch before Week 1 Day 5. The CoffeeTracker patterns map directly to what you'll encounter in Shelf and Anchor.

- 🎬 **Embrace Swift generics** — WWDC22 — https://developer.apple.com/videos/play/wwdc2022/110352/ (~30 min)
  > Builds the mental model for `some` vs `any` and when to use associated types. Essential before designing service protocols.

- 🎬 **Design protocol interfaces in Swift** — WWDC22 — https://developer.apple.com/videos/play/wwdc2022/110353/ (~26 min)
  > Sequel to "Embrace Swift generics." Watch immediately after.

### Videos (optional)

- 🎬 **Explore structured concurrency in Swift** — WWDC21 — https://developer.apple.com/videos/play/wwdc2021/10134/
  > If Swift 6 concurrency warnings in your apps are confusing, this fills in the mental model.

- 🎬 **Protect mutable state with Swift actors** — WWDC21 — https://developer.apple.com/videos/play/wwdc2021/10133/
  > The canonical actor explanation. Worth re-watching if any `actor` isolation warning in Week 1 is opaque.

### Books (optional, paid)

- 📗 **Advanced Swift** by objc.io — https://www.objc.io/books/advanced-swift/ (~$49 ebook)
  > Chapters 6–10 cover protocols, generics, and the Swift type system at depth. Phase 0 suggested reading chapters 1–5; this phase is when the rest of the book pays off. Recommended but not required.

- 📗 **Practical Swift Concurrency** by Donny Wals — https://donnywals.com/books/
  > If Swift 6 concurrency warnings aren't clicking from TSPL + WWDC24, this book resolves them with practical patterns. One purchase covers Phase 5 and all future phases.

### Free alternatives

- 🔗 **Swift by Sundell — Dependency injection** — https://www.swiftbysundell.com/ — Search "dependency injection" and "protocols." John Sundell's articles on this exact pattern are the most practical free writing available.
- 🔗 **Donny Wals blog — Swift concurrency** — https://www.donnywals.com/ — Best free writing on `Sendable`, `@MainActor` isolation, and actor boundaries.
- 🔗 **GitHub Actions runner images (macOS)** — https://github.com/actions/runner-images/blob/main/images/macos/macos-15-Readme.md — The authoritative list of what Xcode versions and simulators are available on `macos-15` runners. Check this when your CI destination fails.

### Tools / services

- 🛠️ **swift-snapshot-testing** — https://github.com/pointfreeco/swift-snapshot-testing — Add via Xcode's package manager.
- 🛠️ **xcpretty** — https://github.com/xcpretty/xcpretty — Formats `xcodebuild` output in CI. `gem install xcpretty`.
- 🛠️ **GitHub Actions** — https://github.com/features/actions — Free for public repos; 2,000 minutes/month for private repos on the free plan. Your CI jobs will use roughly 10–20 minutes per run for an Xcode build and test.
- 🛠️ **Xcode Coverage report** — built-in. Product → Scheme → Edit Scheme → Test → Options → Code Coverage. Run tests, then check the Report Navigator.

---

## Traps to avoid

**Trap 1 — TCA before vanilla SwiftUI has failed you.**
TCA (The Composable Architecture, by Point-Free) is genuinely excellent engineering. It is also a second language on top of SwiftUI — one that takes weeks to internalize and comes with real costs: testing discipline, a steeper onboarding curve for collaborators, and indirection layers that feel wrong until they suddenly feel right. You are not ready for it yet, not because it is bad, but because you have not hit vanilla SwiftUI's concrete limits in your own code. After this phase, if you have a specific, named problem that vanilla `@Observable` + `Environment` + service protocols cannot solve, then evaluate TCA. "It feels like Redux and I liked Redux" is not that problem. Revisit after Phase 6 with evidence.

**Trap 2 — Snapshot testing everything.**
Snapshot tests catch unintended visual regressions. They are not unit tests. Do not snapshot every view. Snapshot the major compositions: the primary list view, the primary detail view, any sheet or modal that has non-trivial layout, and anything that uses Dynamic Type significantly. A 10-screen app with 30 snapshot tests (3 variants each = 90 reference images) is about right. 200 snapshot tests is maintenance debt. Focus unit test coverage on service objects, model logic, transformations, and anything with conditional branching — not on SwiftUI `body` properties.

---

## If you get stuck

1. **Concurrency warning you can't decipher** — paste the full error into Claude with the surrounding 20 lines of code. The pattern (non-Sendable capture, missing `@MainActor`, actor isolation boundary) is almost always identifiable from the error text.
2. **Snapshot test fails on CI but passes locally** — the simulator scale factor differs. Record reference images from the same OS and device type that CI uses. Use an environment variable (`RECORD_SNAPSHOTS=1`) to conditionally call `record: true` on CI.
3. **CI can't find the simulator** — check the GitHub Actions runner images README for `macos-15` to find the exact simulator name/OS string. The destination must match exactly.
4. **Protocol design feels wrong (lots of `any`)** — you are probably designing protocols with associated types where none are needed, or making things protocols that should be concrete types. Read the "Embrace Swift generics" WWDC22 session. The rule: if the only conformance is your one concrete type and a mock in tests, the protocol is doing its job.
5. **Coverage is stuck below 70%** — open the coverage report, click into the service file, and look for the red lines. Uncovered branches usually mean: error paths not tested, optional-handling branches, or delegation callbacks. Write a targeted test for each red branch — don't write tests at random hoping coverage climbs.
6. **Apple Developer Forums** — https://developer.apple.com/forums/ — Better signal than Stack Overflow for Swift 6 concurrency questions.
7. **Swift Forums** — https://forums.swift.org/ — Appropriate for language-level questions about protocol design and generics.

---

## When you're done

1. Both Shelf and Anchor have a green CI badge. You have personally broken it and watched CI block the merge.
2. Both apps build under Swift 6 with zero concurrency warnings.
3. Coverage reports show 70%+ on service/model code in both projects.
4. Snapshot reference images are committed to both repositories.
5. You can check every box in the Mastery Gate section.
6. **Do not add features to Shelf or Anchor here.** You will return to them as data sources in the capstone (Phase 8). Leave them clean.

Move to **Phase 6: Audio, Background Work, Performance, and Instruments** — where you will build App 3, **Murmur**, a voice-memo and live transcription app. That phase is the last one before the frameworks get serious.
