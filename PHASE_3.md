# Phase 3 — Networking, Persistence, Share Extension, App Store v1

**Duration:** 5 weeks · **Budget:** ~32 hours total · **Pace:** 5–8 hrs/week

## Translating to your own app

Every app eventually needs to talk to the network, outlast a restart, reach into the system, and ship. Those four concerns are what Phase 3 is really teaching. The specific exercises use Shelf (URL metadata fetching, SwiftData queries, a Share Extension for Safari) because Shelf is the app in this curriculum — but the skills transfer directly. If you're building a personal book library instead of Shelf, you'd hit the Open Library API with `URLSession` + `Codable`, store books in SwiftData with `#Predicate`-backed searches, build a "Save Book from Safari" share extension, and go through exactly the same App Store Connect gauntlet. If you're building a film log, you'd call TMDB instead. The networking, persistence, and submission mechanics are identical; only the JSON schema changes.

The App Store submission process is the most bureaucratic milestone in the entire plan. Bundle IDs, certificates, provisioning profiles, privacy manifests, nutrition labels, screenshots, review guidelines — none of it is hard, but none of it is obvious, and all of it must be correct before Apple accepts a build. The goal of Phase 3 is to get through this machinery once, on a real app, while the scope is still small. Every future submission will be a repeat of these same steps, and they will feel routine by Phase 4.

---

## What you'll have at the end

1. Shelf fetches URL metadata (title, description, favicon) from the network when you save a link — using `URLSession` with async/await, `Codable`, and a retry policy.
2. SwiftData usage has matured: compound `#Predicate` queries, a background `ModelActor` for non-blocking imports, and one schema migration survived.
3. A Share Extension target ("Save to Shelf") that appears in Safari's share sheet and in any app that shares URLs. This is functional, not a stub.
4. A live App Store listing. Real screenshots, a privacy manifest, a privacy policy page, release notes, a support URL. Friends who were not asked to test it have downloaded it.
5. GitHub Actions running `xcodebuild test` on every push. CI is red-blocking from this phase forward.
6. Swift 6 strict concurrency mode is on. Zero warnings.
7. At least two TestFlight beta cycles completed before the App Store submission.

## What you WILL NOT do in Phase 3

- Introduce a repository pattern, a use-case layer, a coordinator, or any multi-layer architecture. `@Model` + a `@MainActor`-isolated `@Observable` service is the entire stack. If you feel the urge to add a layer, write down the urge and keep moving.
- Use Combine for networking. `URLSession` with async/await is the modern path and it is simpler.
- Use `ObservableObject` / `@Published` / `@StateObject`. You know why by now.
- Add features that aren't in the milestone. The goal is a shipped, stable v1.0 — not v2.0.
- Skip the App Store submission because it seems risky. One rejection is normal. Push through it.

---

## Week 1 — Networking: URLSession, Codable, error handling

**Theme:** Shelf fetches URL metadata on save. Teach yourself `URLSession` with async/await by building something you'll actually use.

**Goal:** When a user saves a URL, Shelf fires a network request to fetch the page's `<title>` and `<meta og:description>` tags, then updates the SwiftData record. The UI shows a loading state and handles errors gracefully.

### Day 1 — Read: URLSession modern API (1–1.5 hrs)

Read the following before writing any networking code:

- Apple doc: **Fetching Website Data into Memory** — https://developer.apple.com/documentation/foundation/url_loading_system/fetching_website_data_into_memory
- WWDC21 session: **Use async/await with URLSession** — https://developer.apple.com/videos/play/wwdc2021/10095/ (~26 min)

Then skim **Meet async/await in Swift** (WWDC21) if the underlying model is still fuzzy — https://developer.apple.com/videos/play/wwdc2021/10132/ (~25 min).

### Day 2 — Build the metadata fetcher (1.5–2 hrs)

Build `MetadataService` as a `@MainActor`-isolated `@Observable` class with a single async method:

```swift
@MainActor
@Observable
final class MetadataService {
    func fetch(url: URL) async throws -> PageMetadata
}
```

`PageMetadata` is a plain `Sendable` struct with `title: String?`, `description: String?`, `faviconURL: URL?`.

Parse the HTML response manually — look for `<title>` and `<meta name="og:title">` / `<meta name="og:description">`. No third-party HTML parser. This is ~40 lines of `String` manipulation and teaches you that HTML is not always well-formed JSON.

### Day 3 — Error handling and retries (1–1.5 hrs)

Networking fails. Handle it explicitly:

- Define a `MetadataError` enum with cases for network failure, bad status code (expose the code), timeout, and parse failure.
- Wrap the `URLSession` call in a retry helper: up to 2 retries with 500ms exponential backoff using `try await Task.sleep(for:)`.
- Use `URLRequest` with an explicit `.timeoutInterval` of 10 seconds — never fire a request without a timeout.

Test the error paths manually: kill network in Simulator settings and confirm the error state shows in the UI.

### Day 4–5 — Wire into the UI and write tests (1.5 hrs)

- Inject `MetadataService` via `@Environment` into the Save view. When a URL is entered and confirmed, kick off `await metadataService.fetch(url:)` inside `.task`.
- Show a `ProgressView` while fetching, display an inline error if it fails (don't modal-alert — inline is HIG-correct for this pattern).
- Write two `swift-testing` tests: one that stubs `URLSession` with a fake response and asserts the correct `PageMetadata` is returned, one that stubs a 404 and asserts `MetadataError.badStatusCode` is thrown.

**Turn on Swift 6 strict concurrency now.** In the Xcode project's Build Settings, set `SWIFT_STRICT_CONCURRENCY = complete`. Fix every warning before moving to Week 2. They are all telling you something true.

---

## Week 2 — SwiftData deeper: `#Predicate`, `ModelActor`, migrations

**Theme:** The data model needs to grow as the app grows. Learn how SwiftData handles querying and background work properly.

### Day 1 — `#Predicate` and FetchDescriptor (1–1.5 hrs)

Replace any string-based queries with `#Predicate`. Add a compound query: items that are tagged AND have non-nil `fetchedTitle` AND were created in the last 30 days.

Read: **Meet SwiftData** (WWDC23) — https://developer.apple.com/videos/play/wwdc2023/10187/ (~25 min). Then: **What's new in SwiftData** (WWDC24) — https://developer.apple.com/videos/play/wwdc2024/10137/ (~25 min) for `#Expression` and `#Index`.

### Day 2 — `ModelActor` for background imports (1.5 hrs)

The metadata fetch writes to SwiftData. That write should not block the main thread. Move the write into a `@ModelActor`:

```swift
@ModelActor
actor ShelfImporter {
    func importItem(url: URL, metadata: PageMetadata) async throws
}
```

Pass in a `ModelContainer` at init. Test that main-thread frame rate stays smooth during bulk import (import 50 URLs in a loop and open Instruments Time Profiler — verify no main-thread spikes).

Read the **ModelActor** section of: https://developer.apple.com/documentation/swiftdata/modelactor

### Day 3–4 — Schema migration (1.5–2 hrs)

Add a new field to your `@Model` — for example `var faviconData: Data?` to cache the downloaded favicon locally. This requires a `VersionedSchema` and a `MigrationPlan`. Write one. Run on a device with existing data and confirm no data is lost.

This will feel annoying. Do it anyway — you will need this skill in every future version.

Read: **Model your schema with SwiftData** (WWDC23) — https://developer.apple.com/documentation/swiftdata

### Day 5 — Performance check (30 min)

Open Xcode's SwiftUI Instruments template on the main list view with 200+ items loaded. Confirm no unexpected re-renders. If `@Query` is causing full-list refreshes on unrelated model changes, narrow the predicate or add `#Index` to the relevant fields.

Reference: **Demystify SwiftUI performance** (WWDC23) — https://developer.apple.com/videos/play/wwdc2023/10160/

---

## Week 3 — Share Extension: Save to Shelf from Safari

**Theme:** The Share Extension is the most system-integrated thing you've built so far. It appears in Safari's share sheet, in Notes, in Chrome. Build it properly.

### Day 1 — Understand App Extensions (1–1.5 hrs)

Read before writing a line:

- Apple doc: **App Extension Programming Guide** (share extensions section) — https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensionProgrammingGuide/Share/Share.html
- Apple doc: **NSExtensionActivationRule** — https://developer.apple.com/documentation/bundleresources/information_property_list/nsextension/nsextensionactivationrule

Key facts to internalize:
- The extension runs in a separate process with its own sandboxed container.
- It cannot directly access your main app's SwiftData store without App Groups.
- You must set up an App Group entitlement (`group.com.yourname.shelf`) on both the app target and the extension target.
- Communication from extension → main app can be via shared `UserDefaults(suiteName:)`, a shared file in the App Group container, or a deep-link URL that the main app reads on next launch.

### Day 2 — Add the Share Extension target (1.5–2 hrs)

In Xcode: `File → New → Target → Share Extension`. Name it `ShelfShareExtension`.

Minimum `NSExtensionActivationRule` for URLs:
```xml
<key>NSExtensionActivationSupportsWebURLWithMaxCount</key>
<integer>1</integer>
```

Enable the App Group entitlement on both targets. Verify in the Apple Developer portal that the App Group is provisioned.

Write the `ShareViewController` in SwiftUI (not the UIKit template Xcode generates — delete it). The extension's root view: a text field pre-filled with the shared URL, a "Save" button, a "Cancel" button. On Save, write the URL to the shared App Group `UserDefaults` suite. On app launch, Shelf reads from that suite and imports pending URLs.

### Day 3 — End-to-end test on device (1 hr)

Side-load to your phone. Open Safari. Navigate to any article. Tap Share. Confirm "Save to Shelf" appears in the share sheet. Confirm tapping it shows your extension UI. Confirm saving it persists the URL into Shelf.

Debug the process boundary: add `os_log` statements in both the extension and the main app import path, then watch Console.app to trace the handoff. This is the fastest way to understand cross-process debugging.

### Day 4 — Polish and edge cases (1 hr)

Handle: no URL in the share payload (show an error), URL already exists in Shelf (show a "already saved" state instead of duplicating), extension dismissed without saving (no-op).

Test VoiceOver in the extension UI. The extension must be accessible — it runs in the same system VoiceOver context as Safari.

### Day 5 — Commit and prep for TestFlight (30 min)

Commit. Tag `v0.9-beta`. Confirm both targets build cleanly with Swift 6 concurrency mode enabled.

---

## Week 4 — CI setup + TestFlight beta cycles

**Theme:** Before submitting to the App Store, two full TestFlight beta cycles and green CI on every commit.

### Day 1 — GitHub Actions CI (1.5–2 hrs)

CI starts here and stays green through every future phase.

Create `.github/workflows/ci.yml`:

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
      - uses: actions/checkout@v4
      - name: Select Xcode
        run: sudo xcode-select -s /Applications/Xcode_16.app/Contents/Developer
      - name: Build and test
        run: |
          xcodebuild test \
            -scheme Shelf \
            -destination 'platform=iOS Simulator,name=iPhone 16,OS=latest' \
            -resultBundlePath TestResults.xcresult \
            | xcpretty
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: TestResults.xcresult
```

Push. Confirm the workflow triggers and tests pass. If it fails on CI but passes locally, the most common cause is a simulator destination name mismatch — check `xcodebuild -showdestinations` output in the logs.

From this point forward: red CI is a blocker. Do not move to the next task with a red build.

### Day 2–3 — TestFlight beta cycle 1 (2 hrs)

- Archive (Product → Archive), then distribute via App Store Connect to internal testers.
- Send to 3–5 people you trust to actually install it. Not friends who will say "looks great!" — friends who will tell you it crashes.
- Install it on your own phone and use it as your primary read-later tool from today forward. **Dogfood starts now and never stops.**

Collect feedback. Fix the top 2–3 issues. Iterate. This is the tight loop that App Store quality requires.

### Day 4 — Beta cycle 2 (1–1.5 hrs)

Archive again. Upload to TestFlight. Fix any crash reports from Xcode Organizer before submitting to the App Store. A crash-free rate of >99.5% on TestFlight is your gate to submission.

### Day 5 — Privacy manifest and App Store prep (1.5 hrs)

Before App Store submission you need:

1. **Privacy manifest** (`PrivacyInfo.xcprivacy`) in your app target. Declare: network access (for URL metadata fetching), no data collection linked to user identity. Read: **Get started with privacy manifests** (WWDC23) — https://developer.apple.com/videos/play/wwdc2023/10060/ (~13 min)

2. **App Privacy nutrition labels** in App Store Connect. Be accurate — Apple reviews these.

3. **Privacy policy page.** A GitHub Pages single-pager is fine. It must be public and reachable. Minimum content: what data you collect (none that leaves the device), how to contact you.

4. **Screenshots.** Use the Xcode Simulator to capture at required sizes (6.7" and 5.5" at minimum). Add a short caption to each. Clean, real data — not Lorem Ipsum.

5. **Support URL.** Can be a GitHub repo page or a simple site page with your email.

---

## Week 5 — App Store submission and surviving review

**Theme:** File the submission, handle the first response from Apple (likely a rejection for something small), re-submit, ship.

### Day 1 — App Store Connect setup (1.5 hrs)

If you haven't already:

- Create the app record in App Store Connect.
- Set the Bundle ID to match your provisioning profile exactly.
- Fill in all metadata: name, subtitle (30 chars), description, keywords, category, age rating, copyright.
- Upload screenshots (you prepared them in Week 4).
- Set a support URL and privacy policy URL.
- Fill the App Privacy nutrition label honestly.

### Day 2 — First submission (1 hr)

In Xcode Organizer: select the archive, click "Distribute App" → "App Store Connect" → upload. Once processing completes in App Store Connect, select the build, add release notes, submit for review.

Common first-time rejection causes:
- Missing privacy policy URL.
- Screenshots show placeholder data.
- App crashes on first launch (often a missing entitlement for App Groups in the App Store build — confirm your provisioning profile includes the App Group).
- Privacy manifest omits a `Required Reason API` you use (check `UserDefaults` — it is a Required Reason API).

Read the rejection letter carefully. Fix exactly what it says. Do not fix things it doesn't mention. Re-submit the same day.

### Day 3–4 — Handle review response and re-submit (1–2 hrs)

First rejection: read, fix, re-submit. Second review typically goes faster. Most straightforward apps are approved within 1–3 business days.

While waiting, write the support page, double-check your GitHub Pages privacy policy is live, and confirm the TestFlight link you gave beta testers still works.

### Day 5 — Post-launch tasks (1 hr)

Once approved:

- Tag the commit `v1.0` in git.
- Enable automatic crash reports in Xcode Organizer (you get them for free via the App Store).
- Check your first crash report within 48 hours of launch — fix anything you find.
- Thank your beta testers personally. They saved you from shipping worse.

---

## Mastery gate — end of Phase 3

- [ ] Shelf v1.0 is live on the App Store. A stranger with an iPhone can find it, download it, and save a link from Safari.
- [ ] You have survived at least one Apple review rejection and addressed it without catastrophizing.
- [ ] The Share Extension appears in Safari's share sheet on your device and correctly saves URLs to Shelf.
- [ ] GitHub Actions CI runs `xcodebuild test` on every push. The badge is green.
- [ ] Swift 6 strict concurrency mode is on. Zero warnings in the main app target and in the extension target.
- [ ] SwiftData uses at least one `#Predicate` compound query and one `@ModelActor` background operation.
- [ ] The schema has been migrated at least once using `VersionedSchema` without data loss.
- [ ] `URLSession` requests have explicit timeouts, retry logic, and map network errors to a typed `Error` enum.
- [ ] Privacy manifest (`PrivacyInfo.xcprivacy`) is in the app target and accurately declares all API usage.
- [ ] The app has been through 2 TestFlight beta cycles. Friends who didn't write it are using it.
- [ ] You are using Shelf on your phone every day. If you're not reaching for it, you know why.
- [ ] You can, without looking it up, explain the process boundary between an app extension and its host app and describe the two common patterns for communicating across it.

---

## Resources — Phase 3

Ordered by priority. Must-use items are marked.

### Primary references (must-use)

- 📘 **URLSession documentation** — https://developer.apple.com/documentation/foundation/urlsession
  > Reference for `data(for:)`, request configuration, and `URLResponse` inspection.

- 📘 **SwiftData documentation** — https://developer.apple.com/documentation/swiftdata
  > Canonical reference for `#Predicate`, `ModelActor`, `VersionedSchema`, `MigrationPlan`.

- 📘 **App Extension Programming Guide (Share Extensions)** — https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensionProgrammingGuide/Share/Share.html
  > Still the most complete explanation of the extension lifecycle and the NSExtensionActivationRule format.

- 📘 **Updating an App to Use Strict Concurrency** — https://developer.apple.com/documentation/swift/updating-an-app-to-use-strict-concurrency
  > Short, practical. Work through it top-to-bottom once before enabling Swift 6 mode.

- 📘 **App Store Review Guidelines** — https://developer.apple.com/app-store/review/guidelines/
  > Read sections 2 (Performance), 5 (Legal), and the Data Collection and Storage section before submitting. Takes 30 minutes.

- 📘 **Required Reason APIs** — https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api
  > Check every API you use against this list before writing your privacy manifest.

### Videos (must-watch)

- 🎬 **Use async/await with URLSession** — WWDC21 — https://developer.apple.com/videos/play/wwdc2021/10095/ (~26 min)
  > The definitive guide to modern URLSession. Watch before writing any networking code.

- 🎬 **Meet SwiftData** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10187/ (~25 min)
  > Foundation for the deeper SwiftData work in Week 2.

- 🎬 **What's new in SwiftData** — WWDC24 — https://developer.apple.com/videos/play/wwdc2024/10137/ (~25 min)
  > `#Expression`, `#Index`, History API, Xcode previews with SwiftData.

- 🎬 **Get started with privacy manifests** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10060/ (~13 min)
  > Short and mandatory before App Store submission.

- 🎬 **Migrate your app to Swift 6** — WWDC24 — https://developer.apple.com/videos/play/wwdc2024/10169/ (~40 min)
  > Walk through exactly what enabling Swift 6 strict concurrency looks like in a real app.

### Videos (optional)

- 🎬 **Build an app with SwiftData** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10154/ (~25 min)
  > Code-along that reinforces the `@ModelActor` and `@Query` mental model.

- 🎬 **Demystify SwiftUI performance** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10160/ (~25 min)
  > For the Week 2 performance check. Understand view identity before profiling.

- 🎬 **What's new in privacy** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10053/ (~28 min)
  > Broader context on Required Reason APIs and data minimization. Watch before writing the privacy manifest.

- 🎬 **Meet Xcode Cloud** — WWDC21 — https://developer.apple.com/videos/play/wwdc2021/10267/ (~20 min)
  > If you prefer Xcode Cloud over GitHub Actions, this is the starting point. GitHub Actions is recommended here because it's portable and free at the usage level of a single app.

- 🎬 **What's new in Swift** — WWDC24 — https://developer.apple.com/videos/play/wwdc2024/10136/ (~30 min)
  > Context for Swift 6 language mode, typed throws, and what's changed.

### Books (optional, paid)

- 📗 **Practical Swift Concurrency** by Donny Wals — https://donnywals.com/books/practical-swift-concurrency/ (~$40)
  > If `Sendable`, `actor`, and `@MainActor` warnings are not clicking from the docs alone, this book will unblock you in a day. Strongly recommended for Phase 3.

- 📗 **Advanced Swift** by objc.io — https://www.objc.io/books/advanced-swift/ (~$49 ebook)
  > Chapters 1–5 are relevant for understanding the type system behavior you'll encounter while fixing Swift 6 warnings. Already recommended in Phase 0.

### Free alternatives

- 🔗 **Donny Wals blog** — https://www.donnywals.com/ — Best free resource on SwiftData and concurrency. Search specifically for "ModelActor" and "SwiftData migration."
- 🔗 **Hacking with Swift — URLSession** — https://www.hackingwithswift.com/books/ios-swiftui/sending-and-receiving-codable-data-with-urlsession-and-swiftui — Short, working example.
- 🔗 **Swift by Sundell — Share Extensions** — https://www.swiftbysundell.com/ — Search "share extension" for practical articles on the App Group handoff pattern.
- 🔗 **Apple Developer Forums** — https://developer.apple.com/forums/ — For review rejections, search for the specific guideline number Apple cited. Someone has been through it.

### Tools / services

- 🛠️ **App Store Connect** — https://appstoreconnect.apple.com/ — App records, TestFlight, review status, crash reports.
- 🛠️ **Apple Developer portal** — https://developer.apple.com/account/ — Bundle IDs, App Groups, provisioning profiles, certificates.
- 🛠️ **Transporter** — Mac App Store — Upload IPA files to App Store Connect when Xcode Organizer misbehaves.
- 🛠️ **GitHub Actions** — https://github.com/features/actions — CI. Free for public repos, 2000 min/month for private.
- 🛠️ **xcpretty** — `gem install xcpretty` — Makes `xcodebuild` output readable in CI logs.
- 🛠️ **Console.app** — Built into macOS — Essential for debugging cross-process extension logs.
- 🛠️ **GitHub Pages** — https://pages.github.com/ — Free static hosting for your privacy policy and support URL.

---

## If you get stuck

1. **Swift 6 concurrency warnings you can't resolve:** Enable one warning at a time rather than the full target at once. The `// swift-concurrency-migration: ignore` annotation is a temporary crutch — use it to ship, then remove it in Phase 5.
2. **Share Extension not appearing in Safari:** Confirm both targets have the App Group entitlement, that the entitlement string matches exactly, and that `NSExtensionActivationSupportsWebURLWithMaxCount` is ≥ 1 in the extension's `Info.plist`.
3. **App rejected for privacy manifest:** Read the rejection email exactly. Apple will name the specific Required Reason API you missed. Add the entry, re-archive, re-upload.
4. **SwiftData migration crash on device:** The most common cause is forgetting to add the old version to `SchemaMigrationPlan.stages`. Check that your `VersionedSchemaV1` exactly matches the schema that was on device before migration.
5. **GitHub Actions failing on simulator destination:** Run `xcodebuild -showdestinations -scheme Shelf` in a CI step and log the output to find the exact destination string the CI runner supports.
6. **General:** Apple Developer Forums > Stack Overflow for anything App Store or extension related. Answers there are dated and Apple-reviewed.

---

## When you're done

1. Shelf v1.0 is on the App Store. You have the listing URL.
2. Git is tagged `v1.0`. CI is green.
3. You can check every box in the Mastery Gate.
4. You've used Shelf on your phone for at least a week. You know exactly what's wrong with it and you're going to leave it alone for now.

Move to Phase 4. The next app is **Anchor** — a location-aware photo journal. Phase 4 introduces PhotoKit, MapKit, WidgetKit, App Intents, and CoreSpotlight. The craft investment from Phase 2 starts compounding there: photos + maps + motion + haptics is where iOS apps start feeling Apple-made rather than merely functional. The complexity step up is real — you'll be glad you shipped something boring first.
