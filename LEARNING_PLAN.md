# iOS Mastery Learning Plan

## Context

You are an experienced web/backend engineer who has never written Swift, used Xcode, or built an iOS app. You want to reach real mastery of modern iOS — not vibe-code a demo, but build the kind of app that reads as "this person knows what they're doing" to another senior iOS engineer, and that holds up visually and experientially next to Apple Design Award winners.

You have ~5–8 hours/week (evenings), a 12–18 month horizon, an Apple Silicon Mac, a recent iPhone, and an Apple Developer Program account. You care simultaneously about craft polish (motion, haptics, accessibility, HIG literacy), technical depth (non-trivial Apple frameworks), a unique product idea, and production-grade engineering (architecture, testing, CI, TestFlight, analytics, App Store Connect).

Going straight from zero to the intended on-device-AI capstone (a private semantic memory app) is too much scope at once — you'd spend months trying to reason about CoreML and embeddings while also still learning what `@State` is. The plan below instead builds through **three progressively harder shippable apps**, each establishing the foundations the next one depends on. The semantic memory app is the final capstone, but you only reach it after each required framework is already in your hands from a prior app.

Every phase ends with something on your device or in TestFlight. The enemy is tutorial hell; the remedy is always "ship the milestone, then move on."

---

## Philosophy

1. **Ship, don't consume.** Every phase has a concrete artifact (a milestone app, a refactor, a TestFlight build, an App Store submission). Books and videos are tools to *unblock* shipping, not substitutes for it.
2. **Craft and production rigor are woven, not bolted on.** Accessibility, HIG literacy, Instruments, testing, and CI start in early phases — not at the end.
3. **Modern Apple stack, not legacy.** SwiftUI (not UIKit as primary), Observation (`@Observable`, not `ObservableObject`/`@Published`), Swift Concurrency (not Combine as primary), SwiftData (not raw Core Data), Swift Testing (not XCTest). UIKit is an escape hatch via `UIViewRepresentable`, not a habit.
4. **No architecture astronautics.** Resist importing Redux/Clean/VIPER instincts from web/backend. Vanilla SwiftUI + `@Observable` + a small service/protocol layer is enough for 95% of apps, including all three milestone apps. Revisit architectural questions in Phase 5 with real code under your hands, not upfront.
5. **Dogfood relentlessly.** From Phase 3 onward, the current milestone app is installed on your phone and used daily. If you stop reaching for it, something is wrong — fix it before adding features.

---

## Phases at a glance

| # | Phase | Weeks (5–8 hrs/wk) | Deliverable |
|---|---|---|---|
| 0 | Tooling & Swift fundamentals | 3 | CLI tool + Swift Testing passing |
| 1 | SwiftUI foundations | 6 | App 1 MVP running on simulator |
| 2 | Craft: HIG, a11y, motion, haptics | 4 | App 1 polished + a11y-clean |
| 3 | Networking, persistence, share extension, App Store v1 | 5 | **App 1 → live on App Store** |
| 4 | Media: PhotoKit, Widgets, App Intents, Spotlight | 6 | **App 2 → TestFlight** |
| 5 | Advanced Swift, testing, CI, refactoring | 5 | Previous apps refactored, CI green, >70% logic coverage |
| 6 | Audio, background work, performance, Instruments | 6 | **App 3 → TestFlight** |
| 7 | Vision, embeddings, CoreML, on-device ML basics | 5 | App 3 v1.1 w/ OCR + semantic search, shipped |
| 8 | On-device LLM, App Intents at scale, Spotlight | 5 | Capstone alpha — natural-language query over personal memories |
| 9 | CloudKit + E2EE sync, privacy manifest | 4 | Capstone beta — multi-device, ciphertext-only |
| 10 | Launch: App Store polish, analytics, crash loop | 4 | **Capstone → live on App Store** |

**Total: ~53 weeks ≈ 12 months** at 6.5 hrs/wk average. Realistic range 12–18 months with life overhead.

---

## Phase 0 — Tooling and Swift the language (3 weeks)

**Why first.** Skipping Swift fundamentals to get to "the pretty stuff" is the single most common failure for web/backend converts. You will fight value semantics, `@Observable` semantics, and Sendable for months if you don't internalize them now.

**Goals**
- Xcode navigation, Simulator, device signing, schemes, build settings literacy.
- Swift language: value vs reference types, optionals, enums with associated values, protocols, generics, error handling, `async`/`await`, `Task`, actors, `Sendable`.
- Why Swift's type system feels different from TS/Go (value semantics, protocol-oriented, no heavy runtime reflection culture).
- Swift Package Manager basics and the `swift-testing` macro-based testing framework.

**Milestone**
A Swift Package command-line tool (`swift run`) that ingests a folder of `.txt` files, tokenizes them, builds an inverted index, and answers keyword queries. Concurrent ingestion via `TaskGroup`. Tested with `swift-testing`. Runs from the terminal; no UI yet.

**Mastery gate**
Without help you can explain when to use `struct` vs `class` vs `actor`; write a generic function constrained by multiple protocols; reason about `Sendable` and data races; use `async let` and `TaskGroup`; run tests with `swift-testing` from the CLI. **Do not open SwiftUI yet.**

> See `PHASE_0.md` for the detailed step-by-step guide.

---

## Phase 1 — SwiftUI foundations (6 weeks)

**Goals**
- SwiftUI mental model: views are values, `body` is a pure function of state, the framework diffs.
- Layout: stacks, `Layout` protocol basics, safe areas, `GeometryReader` (sparingly).
- State ownership: `@State`, `@Binding`, `@Observable` (ignore `ObservableObject` — it's legacy), `@Environment`, `@Bindable`.
- Navigation: `NavigationStack` with typed routes, `.sheet`, `.fullScreenCover`, search bars.
- Concurrency inside SwiftUI: `.task`, cancellation on view disappear.
- SwiftData basics: `@Model`, `@Query`, relationships.

**Milestone — App 1 MVP on simulator**

**App 1 recommended concept: "Shelf" — a personal reading/reference app.** Save articles, essays, or PDFs you want to read later. Local-first. Clean list/detail UI, tags, search, reading progress. No social features, no sync yet — all local. A genuinely useful, non-trivial app that everyone with a phone actually needs. (Alternatives if this doesn't excite you: a **personal book library** with Open Library API + barcode scanning; a **cooking/recipe vault**; a **film/TV watched log** with TMDB API. Pick based on which domain you'd actually use. Avoid the saturated categories — to-do, habits, journaling with prompts.)

Scope the MVP small: create/read/delete entries, tag, search, reading progress tracked locally. Side-load to your phone via free provisioning. Use it for a week before moving on.

**Trap to avoid**
Reaching for `@StateObject` + `ObservableObject` + `@Published` from older tutorials. On iOS 17+ it's `@Observable` + plain `let`/`@State` + `@Bindable`. Simpler, faster, no boilerplate. Old tutorials will actively mislead you.

**Mastery gate**
You can, without a tutorial, scaffold a new SwiftUI app with typed navigation, a SwiftData model, a list–detail flow, search, and run it on your device. You can explain why `@State` vs `@Observable` vs `@Environment` and pick correctly. You can read a SwiftUI view and predict when its `body` will re-evaluate.

---

## Phase 2 — Craft layer: HIG, accessibility, motion, haptics (4 weeks)

**Goals**
- HIG fluency — not memorization, but the instinct to ask "is this already an iOS convention?"
- SF Symbols 6, dynamic color, materials, Z-depth/hierarchy.
- `matchedGeometryEffect`, custom transitions, `PhaseAnimator`, `KeyframeAnimator`.
- Haptics via `SensoryFeedback` (the SwiftUI-native API — not `UIImpactFeedbackGenerator`).
- Accessibility fundamentals: VoiceOver rotor, `.accessibilityLabel`/`Value`/`Hint`, Dynamic Type scaling up to AX5, Reduce Motion, Increase Contrast, Voice Control.

**Milestone**
Take App 1's detail view and rebuild it with: a hero matched-geometry transition, contextual haptics on state changes, a custom pull-to-dismiss gesture, and a full a11y audit (Xcode Accessibility Inspector reports zero issues; VoiceOver walks through the app cleanly; Dynamic Type at AX5 does not break any layout). Record a short screen capture showing all three — motion, haptics, VoiceOver — working.

**Trap to avoid**
Treating a11y as a launch-week concern. Retrofitting Dynamic Type and VoiceOver across 40 screens will cost you a month. Five minutes per screen as you build them costs almost nothing.

**Mastery gate**
You can deliver a screen that is simultaneously animated, haptic, and fully accessible, and justify every motion decision against HIG (purposeful, never decorative). You can navigate App 1 eyes-closed using VoiceOver.

---

## Phase 3 — Networking, persistence, share extension, App Store v1 (5 weeks)

**Goals**
- `URLSession` with `async`/`await`, `Codable`, error handling; rate limiting and retries.
- SwiftData deeper: `#Predicate`, relationships, `ModelActor`, migrations, performance.
- **Share extension** — App 1 becomes a "Save to Shelf" target from Safari and other apps. This is a foundational iOS skill you'll reuse in every future app.
- App Store Connect onboarding: Bundle ID, certificates, provisioning, app record, privacy manifest, App Privacy nutrition labels, screenshots, App Store review pitfalls.

**Milestone — App 1 goes live on the App Store**
Ship **App 1 v1.0** to the App Store. Real listing, real screenshots, real privacy manifest. Release notes, support URL, privacy policy page (a GitHub Pages single-pager is fine). Internal TestFlight through at least 2 beta cycles with 3–5 friends. Crash-free rate >99.5%.

**Trap to avoid**
Architecture astronautics under deadline pressure. A `@Model` + a `@MainActor`-isolated `@Observable` service object is plenty. Do not introduce a repository pattern, a use-case layer, or a coordinator.

**Mastery gate**
App 1 is live on the App Store. You have survived a real Apple review (likely one rejection, which is normal). Friends you didn't write the app for are using it.

---

## Phase 4 — Media, widgets, App Intents, Spotlight (6 weeks)

**Goals**
- PhotoKit: `PhotosPicker`, `PHAsset` streaming, change observers, limited-library authorization, thumbnails.
- MapKit: annotations, regions, custom overlays.
- WidgetKit: small/medium/large widgets, timeline providers, deep links.
- App Intents: expose actions to Siri and Shortcuts; parameter types; intent-backed widgets.
- CoreSpotlight: index your app's content so system search finds it.

**Milestone — App 2 ships to TestFlight**

**App 2 recommended concept: "Anchor" — a photo/moments journal.** A location-aware visual journal. Pick moments, attach photos + a short note + a place. Timeline view, map view, search. Widgets that surface "on this day" or recent moments. Siri/Shortcuts integration so you can say "anchor this moment." Spotlight finds your entries from anywhere in the system.

This app is where the craft layer starts paying dividends — photos + maps + motion let you make something that *feels* Apple-made.

Ship to TestFlight with ≥10 external testers. Iterate through 2+ beta cycles. You do not need to ship it to the App Store unless you want to — App 2's value is what it teaches, not its presence on the store. But if it's good, ship it.

**Mastery gate**
App 2 is live on TestFlight with real testers, a widget on your home screen, a Shortcut that triggers an action, and an entry you can find via iOS Spotlight search.

---

## Phase 5 — Advanced Swift, testing, CI, refactor (5 weeks)

**Goals**
- Protocol-oriented design done right (and its limits — don't overuse).
- Result builders, property wrappers, macros (as a consumer).
- `swift-testing` at scale: parameterized tests, traits, `confirmation` for async.
- Snapshot testing via Point-Free's `swift-snapshot-testing`.
- Dependency injection without a framework — plain protocols + SwiftUI `Environment`.
- GitHub Actions CI running `xcodebuild test` on every push.

**Milestone**
Refactor App 1 and App 2: extract protocol-based services, inject via `Environment`, write unit tests covering non-view logic (target 70%+ line coverage), snapshot tests covering major views across Dynamic Type sizes and dark mode. Wire up a CI pipeline that blocks merging on red. Turn on **Swift 6 strict concurrency** mode and fix every warning (they are telling you about real data races).

**Trap to avoid**
Adopting **TCA (The Composable Architecture)** because "it feels like Redux." TCA is genuinely excellent; it is also a second language on top of SwiftUI. You need to hit vanilla SwiftUI's limits first — on your own code — before deciding you need more structure. Revisit TCA only if, after this phase, you have a concrete problem it solves for you.

**Mastery gate**
CI is green on every commit. Swift 6 concurrency warnings: zero. You can refactor a tangled view-model into a testable protocol-based design without breaking the UI. You have written at least one macro-based parameterized test.

---

## Phase 6 — Audio, background, performance, Instruments (6 weeks)

**Goals**
- AVFoundation audio: `AVAudioEngine`, recording, waveforms, playback, routing.
- Background execution: `BGTaskScheduler`, `BGProcessingTask` — and why they are not cron.
- Speech framework: `SFSpeechRecognizer`, on-device mode, limitations.
- Instruments: Time Profiler, Allocations, SwiftUI template, Hangs, Animation Hitches.
- SwiftUI performance: view identity, `@State` on large models, `AnyView` traps, excessive `GeometryReader`.
- MetricKit for real-world performance and hang telemetry.

**Milestone — App 3 ships to TestFlight**

**App 3 recommended concept: "Murmur" — a voice-memo + live transcription app.** Record, get on-device transcription, browse transcripts, search across them. Nothing leaves the device. Focus is on polish: beautiful waveform, silky playback, clean typography for transcripts, accurate haptics. Ship to TestFlight. Profile it on Instruments against a large library (200+ memos) and fix the top three hotspots with before/after numbers in a short README.

**Mastery gate**
App 3 is on TestFlight. You can open Instruments on a cold app, identify a SwiftUI redraw storm or a main-thread hang, and fix it. You know App 3's launch time, hitch rate, and memory ceiling as numbers, not feelings.

---

## Phase 7 — Vision, embeddings, CoreML on-device ML (5 weeks)

**Goals**
- Vision: text recognition (`VNRecognizeTextRequest`), document segmentation, image feature prints (`VNGenerateImageFeaturePrintRequest`).
- NaturalLanguage: `NLEmbedding`, `NLContextualEmbedding` (iOS 17+), sentence embeddings and their limits.
- CoreML: model formats, `MLTensor`, converting a small sentence-transformer with `coremltools`; background inference via actors.

**Milestone**
Ship App 3 **v1.1** with: (a) OCR over any imported screenshot/photo, (b) embedding-based semantic search across your transcripts and OCR'd images. Use `NLContextualEmbedding`, store embeddings as `Data` blobs in SwiftData, do a naive linear cosine-similarity scan (premature optimization is the enemy — works fine up to ~10k items). This phase turns App 3 into a natural bridge toward the capstone.

**Trap to avoid**
Hand-rolling a vector index before you need one. Also: using an image *classification* model when you want an image *embedding* — these are different tasks.

**Mastery gate**
You can take a trained model, convert to CoreML, ship it in an app bundle, run inference on a background actor, and display results in SwiftUI — without copy-pasting. You understand the difference between image embeddings (`VNFeaturePrint`) and text embeddings (`NLContextualEmbedding`) and when each applies.

---

## Phase 8 — Capstone alpha: on-device LLM, App Intents, Spotlight (5 weeks)

**Capstone concept: "Mnemo" (working name).** A private on-device semantic memory app. It ingests from the tools you already built — your reading-list (App 1), your moments (App 2), your voice memos (App 3) — and lets you ask anything in natural language: *"What did I read about Swift macros last month?"* *"Where was I when I recorded that memo about the Kyoto trip?"* Retrieval is embedding-based; answer synthesis is done by a small quantized LLM running fully on-device. Nothing leaves the phone.

**Goals**
- MLX Swift or `llama.cpp` via a Swift package; quantized small models (Phi-3-mini, Llama-3.2-1B).
- Streaming tokens into SwiftUI; cancellation.
- Prompt engineering for retrieval-augmented answers; structured output; citation of source memories.
- App Intents integration so Siri can answer a Mnemo query.
- CoreSpotlight indexing so system search surfaces Mnemo results.

**Milestone — Capstone alpha**
Internal-only build. Ask a question, top-k retrieval, LLM synthesizes an answer citing which source memories it used. Siri can trigger the query. System Spotlight returns memories. <3s answer latency on an iPhone 13; <1GB peak memory. Verify zero network traffic with Charles Proxy or Little Snitch.

**Trap to avoid**
Picking an LLM too large to run on a 3-year-old iPhone. Your target device is not your M-series Mac. Test on the oldest iPhone you can get your hands on. Also: don't let the LLM hallucinate citations — constrain it with structured output and verify retrieved source IDs before rendering.

**Mastery gate**
Siri → Mnemo → answer, end to end, offline.

---

## Phase 9 — CloudKit + E2EE sync (4 weeks)

**Goals**
- CloudKit private database, `CKRecord`, `CKSubscription`, delta sync.
- CryptoKit: symmetric encryption, HKDF, Secure Enclave-backed keys.
- E2EE pattern for CloudKit: device-generated keys in iCloud Keychain, only ciphertext in CloudKit records.
- Privacy manifest, required-reason APIs, App Privacy nutrition labels refreshed.

**Milestone — Capstone beta**
Mnemo syncs across your iPhone and iPad. CloudKit contains only ciphertext (verify with the CloudKit Dashboard — you should see blobs, not text). Keys live in the Secure Enclave and iCloud Keychain. New-device restore works. Write a one-page threat-model README.

**Trap to avoid**
Rolling your own crypto primitives. Use CryptoKit's high-level APIs (`SealedBox`, `HKDF`). And: don't sync until E2EE is working — once plaintext is in CloudKit, it's in iCloud backups forever.

**Mastery gate**
Two devices in sync. Network capture shows only ciphertext. You can explain the threat model in one paragraph to a non-engineer.

---

## Phase 10 — Capstone launch (4 weeks)

**Goals**
- App Store Connect at polish level: screenshots, App Preview video, keywords, privacy labels, localization basics.
- TestFlight external testing at ≥50 testers, three beta cycles.
- Crash reporting via Sentry (better than Apple's native); privacy-respecting analytics via TelemetryDeck or self-hosted PostHog.
- StoreKit 2 if you monetize.
- The polish loop: dogfood → feedback → fix → re-ship, weekly.

**Milestone — Capstone v1.0 live on the App Store**
Mnemo ships. 50+ external testers through 3+ beta cycles. Crash-free rate >99.5% pre-launch. Simple single-page marketing site (GitHub Pages). Read 5 ADA-winner post-mortems before you submit — your submission should be held to that standard.

**Mastery gate**
Live on the App Store. Real users, real reviews. Crash dashboard <0.5%. Three point-releases shipped in response to user feedback.

---

## What's woven through every phase (not standalone phases)

- **Accessibility.** Every milestone passes Accessibility Inspector and a VoiceOver walkthrough. Every new view checked at Dynamic Type AX5.
- **HIG literacy.** Before starting any new screen, ask: does iOS already have a convention for this? Usually yes.
- **Instruments.** Opened on every milestone at least once (Time Profiler + SwiftUI template minimum). Record baselines so regressions are visible.
- **Testing.** From Phase 1 onward, non-view logic has tests. From Phase 5, views get snapshot tests.
- **CI.** GitHub Actions running `xcodebuild test` on every push from Phase 3 onward. Red CI blocks the next phase.
- **TestFlight.** Internal from Phase 3, external from Phase 4.
- **App Store Connect hygiene.** Bundle IDs, certificates, provisioning, app records, privacy manifests — all set up in Phase 3, not Phase 10.
- **Dogfooding.** The current milestone is on your phone as a daily-use app from Phase 3 onward.
- **Design vocabulary.** One WWDC design/HIG session per week during Phases 2–10 alongside the engineering ones. ADA-caliber instinct comes from volume of exposure, not a single course.

---

## Traps and tripwires (in the order you'll encounter them)

1. **Skipping Swift fundamentals** to get to SwiftUI — you'll pay for months.
2. **Using `ObservableObject` / `@Published` / `@StateObject`** from older tutorials. Modern is `@Observable` + `@State` + `@Bindable` + `@Environment`.
3. **Reaching for UIKit answers from Stack Overflow.** UIKit bridging is an escape hatch, not a habit.
4. **Architecture astronautics** — importing Clean/VIPER/Redux before you need them. Vanilla SwiftUI is enough through App 2.
5. **Chasing TCA** before you've hit vanilla SwiftUI's limits in your own code. Revisit in Phase 5 only if needed.
6. **Accessibility as afterthought** — 40 screens retrofit = 1 lost month. 5 min/screen as you build = nothing.
7. **Tutorial hell** — if a phase is running 3× budget because you're watching more videos, stop and ship the milestone half-done; polish it next phase.
8. **Building only for yourself.** TestFlight by Phase 3, not Phase 10.
9. **Optimizing without Instruments.** Every perf fix needs a trace.
10. **Ignoring Swift 6 strict concurrency.** Turn it on in Phase 3 and fix every warning — they're real data races.
11. **Shipping an LLM too big** for the oldest phone you're targeting. Quantized 1B on iPhone 13 is a feature; 7B that thermal-throttles is a bug report.
12. **Unencrypted CloudKit data.** E2EE must exist before sync does — iCloud backups are forever.
13. **Skipping the HIG.** It's boring Apple prose. It's also the difference between "nice app" and "feels Apple-made."

---

## Verification — how you know this is working

This plan is "correct for you" if, checkpointed at each milestone:
- **After Phase 0**: you can read random Swift code on GitHub and mostly understand it.
- **After Phase 3**: App 1 is on the App Store. A stranger can install it. It survives Apple review.
- **After Phase 6**: App 3 is on TestFlight with profiled performance numbers you're willing to stand behind.
- **After Phase 8**: Mnemo answers a natural-language question about your own data — offline — on your phone.
- **After Phase 10**: Mnemo is on the App Store. You can point any iOS engineer at your three apps and be proud of the craft.

If a checkpoint starts slipping by more than 30%, the fix is almost always "ship the milestone smaller" — not "spend more weeks studying."
