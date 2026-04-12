# Phase 4 — Media, Widgets, App Intents, Spotlight

**Duration:** 6 weeks · **Budget:** ~42 hours total · **Pace:** 5–8 hrs/week

## Translating to your own app

Phase 4 introduces five distinct Apple frameworks in one phase: PhotoKit, MapKit, WidgetKit, App Intents, and CoreSpotlight. Anchor is specifically designed so that all five emerge naturally — photos attach to moments, a map view shows where you've been, widgets surface memories on the home screen, an App Shortcut lets you capture without opening the app, and Spotlight makes every entry findable system-wide. If you're building a different App 2, you need to map each framework to your concept deliberately, or you'll skip the ones that feel awkward and miss the point. Ask: does my concept have content worth surfacing in a widget? What action would someone want to trigger from Siri? What data should Spotlight index? If you genuinely cannot answer those questions for your concept, pick a different concept — not a different framework.

The non-negotiable system integrations for any App 2 are the final three: WidgetKit, App Intents, and CoreSpotlight. These are what the mastery gate requires, and they are where iOS developers most often under-invest. PhotoKit and MapKit are concept-dependent — if your app has no photos or no location data, adapt freely. But every app in this phase ships with a widget on your home screen, a Shortcut that triggers an action, and at least one entry findable via Spotlight. Those three touch the places in iOS that make an app feel like part of the system rather than a foreign object sitting on it.

---

## What you'll have at the end

1. **Anchor** — a location-aware photo/moments journal — running on your device and live on TestFlight with ≥10 external testers through at least 2 beta cycles.
2. A small/medium/large WidgetKit widget rendering on your home screen, using a `TimelineProvider` and deep-linking back into the app.
3. An App Intent implemented with the `AppIntents` framework (not legacy SiriKit) that surfaces in the Shortcuts app and can be triggered by Siri.
4. At least one Anchor entry indexed via `CSSearchableIndex` and findable by typing its content into iOS Spotlight.
5. A SwiftUI-native photo picker using `PhotosPicker` — not `UIImagePickerController`.
6. A MapKit map view with annotations and a custom overlay showing a region.
7. Your Shelf app (Phase 3, now live on the App Store) continues to be used daily. Anchor joins it on your home screen.

---

## What you WILL NOT do in Phase 4

- Use `UIImagePickerController` for photo selection. It is deprecated. The answer is `PhotosPicker`.
- Use legacy SiriKit (`INIntent`, `INExtension`, intent definition files). The modern path is the `AppIntents` framework with struct-based intents — less code, no separate extension required for basic cases.
- Submit Anchor to the App Store. TestFlight with real testers is the milestone. The App Store is optional if the app is good enough to bother.
- Introduce architecture complexity. A `@Model` + `@Observable` service layer is still enough. You do not need a repository pattern, a coordinator, or anything from your backend instincts.
- Write tests at scale. Phase 5 is where testing discipline lands. Write tests where they're trivially easy; don't block shipping on coverage targets.
- Drop Shelf. It stays on your phone and you keep using it. Dogfooding both apps simultaneously is intentional.

---

## Week 1 — Project setup + PhotoKit

**Theme:** Bootstrap Anchor. Ship photos to a persistent store before any other feature.

**Goal:** By end of week, you can create a moment, attach one or more photos from your library using `PhotosPicker`, persist the moment with SwiftData, and display a scrollable timeline of moments with thumbnail images.

### Day 1 — Scaffold Anchor (1–1.5 hrs)

1. Create a new Xcode project: iOS · SwiftUI · SwiftData. Name it `Anchor`.
2. Set up your data model. A minimal first pass:
   - `Moment`: `id: UUID`, `title: String`, `note: String`, `date: Date`, `latitude: Double?`, `longitude: Double?`, `photos: [MomentPhoto]`
   - `MomentPhoto`: `id: UUID`, `imageData: Data`, `assetIdentifier: String?`
3. Wire `@Model` macros. Add a `ModelContainer` in your `App` entry point.
4. Scaffold a `ContentView` with a `NavigationStack` and an empty list. No data yet.
5. Add a `+` toolbar button that presents a sheet for creating a moment. Sheet can be empty for now.
6. Run on device. Commit.

### Day 2 — PhotosPicker integration (1.5–2 hrs)

1. Read the PhotosUI documentation for `PhotosPicker`. It is SwiftUI-native — no delegate, no view controller.
2. In your creation sheet, add a `PhotosPicker` bound to `@State var selectedItems: [PhotosPickerItem] = []`. Set `maxSelectionCount: 5`, `matching: .images`.
3. On selection change, use `.loadTransferable(type: Data.self)` (or `Image.self`) to fetch the actual image data asynchronously. Store each result as a `MomentPhoto` with the raw `Data`.
4. Display selected thumbnails in a horizontal scroll row inside the sheet.
5. On save, persist the `Moment` with its photos into SwiftData.
6. In the timeline list, display each moment's first photo as a thumbnail — use `Image(data:)` wrapped in a fixed-frame `RoundedRectangle` clip. Handle the nil/empty case gracefully.

**Trap:** `loadTransferable` returns on a background context. Use `.task` modifiers and `@MainActor` isolation correctly — the SwiftUI compiler will warn you if you try to mutate `@State` from a non-main context.

### Day 3 — PHAsset identifiers + limited library (1.5 hrs)

1. When saving a `PhotosPickerItem`, also read its `itemIdentifier` (available from the picker item's `itemIdentifier` property). Store it in `MomentPhoto.assetIdentifier`.
2. Read: Apple documentation on limited photo library authorization (`PHAccessLevel.readWrite` vs `.addOnly`; `PHAuthorizationStatus.limited`). Understand what limited access means for your users before you ship.
3. For displaying full-resolution images later (e.g., in a detail view), write a `PhotosImageLoader` that uses `PHImageManager.default().requestImage(for:targetSize:contentMode:options:)` to fetch a `PHAsset` by local identifier. Keep this behind a protocol so it's testable later.
4. Add a detail view for each moment. Show the note, date, and full-width first photo (fetched via `PHImageManager`). Thumbnail fallback if the asset identifier is nil (image data already saved).

### Day 4 — Timeline view polish (1 hr)

1. Sort moments by date descending in your `@Query`.
2. Group moments by day using a `Dictionary(grouping:)` and render section headers with the date formatted as "April 12, 2026".
3. Swipe-to-delete on each row. Confirm deletion with a `.confirmationDialog`.
4. Run VoiceOver. Ensure each moment row has a meaningful `.accessibilityLabel` (moment title + date + number of photos). Check Dynamic Type at AX5 doesn't break the thumbnail layout.
5. Commit. Push. Open TestFlight internal distribution — add yourself and one trusted tester.

### Day 5–7 — Buffer / catch-up / polish (1–2 hrs)

If you're ahead: add a `PhotosPickerItem` change observer to detect when the user's library changes and prompt a refresh. If you're behind: ship what you have — an app that creates moments with photos and persists them is the Week 1 deliverable.

---

## Week 2 — MapKit: location, annotations, map view

**Theme:** Give every moment a place. Build the map view.

**Goal:** By end of week, creating a moment can capture the device's current location, the timeline shows a location label, and a separate map view displays all moments as annotations.

### Day 1 — Core Location + capture (1.5 hrs)

1. Add a `LocationService` — a `@MainActor`-isolated `@Observable` class wrapping `CLLocationManager`. Handle authorization request, status changes, and `CLLocationManagerDelegate` callbacks.
2. In the creation sheet, add a "Use current location" toggle. When tapped, call the service to get one-shot current location (`requestLocation()`). Store `latitude` and `longitude` on the `Moment`.
3. In `Info.plist`, add `NSLocationWhenInUseUsageDescription` with a clear, honest description.
4. Add a reverse-geocoded place name (use `CLGeocoder.reverseGeocodeLocation`) — store the result as `Moment.placeName: String?`. Display it in the timeline row and detail view.

### Day 2 — Map view with annotations (1.5–2 hrs)

1. Add a "Map" tab to your app (a `TabView` with Timeline and Map tabs).
2. In the Map tab, use the `Map` SwiftUI view (from `MapKit`, iOS 17 API). Refer to WWDC23 session "Meet MapKit for SwiftUI" — this API is substantially different from the pre-iOS 17 version.
3. Render each moment that has coordinates as a `Marker` (built-in, simple) or `Annotation` (custom SwiftUI view). Use `Annotation` if you want to show the moment's first photo thumbnail as the pin.
4. When the user taps an annotation, navigate to the moment's detail view.
5. Add a `.mapStyle(.standard(elevation: .realistic))` for visual richness.

### Day 3 — Custom overlay + region (1 hr)

1. Add a `MapPolyline` connecting moments in chronological order — a visual "path" through your day.
2. Set the camera position to frame all moments using `MapCameraPosition.automatic` or a computed `MKCoordinateRegion`.
3. Add a `MapUserLocationButton` so the user can snap to their current position.

### Day 4 — Search view (1.5 hrs)

1. Implement a search bar in the timeline using `.searchable`. Filter moments by title, note, or place name using `#Predicate` in the `@Query`.
2. In the map view, add a `.searchable` that accepts a place name and uses `MKLocalSearch.Request` to resolve it to a coordinate, then pans the map there.
3. Accessibility audit on the map view. `Annotation` views need `.accessibilityLabel` — VoiceOver users navigate map annotations with swipe gestures.

### Day 5–7 — Buffer / beta cycle 1 (1–2 hrs)

Cut a TestFlight build. Recruit at least 3 testers (friends/family). The app does not need to be beautiful yet — it needs to run without crashing. Ship it.

---

## Week 3 — WidgetKit: timeline providers, widget views, deep links

**Theme:** Put Anchor on the home screen.

**Goal:** By end of week, a WidgetKit extension ships with small, medium, and large widget sizes. The widget surfaces "on this day" moments or the most recent moment. Tapping it deep-links into the correct moment in the app.

### Day 1 — Widget extension setup (1 hr)

1. In Xcode, `File → New → Target → Widget Extension`. Name it `AnchorWidget`. Enable "Include Configuration Intent" — uncheck for now (you'll add configuration later).
2. Understand the WidgetKit structure: `TimelineProvider`, `TimelineEntry`, widget view, `@main` widget configuration. Watch "Meet WidgetKit" (WWDC20) if you haven't — it's the clearest introduction to the mental model.
3. Share your SwiftData `ModelContainer` between the app and the widget extension. Move the shared container setup to a common Swift package or a shared framework target. The widget runs in a separate process — it cannot share an in-memory store with the app.
4. Add the App Group entitlement to both the main app and widget extension targets so they share a container URL.

### Day 2 — TimelineProvider + entry model (1.5 hrs)

1. Define an `AnchorEntry: TimelineEntry` struct that holds `date: Date` and an array of `MomentSnapshot` (a lightweight, Codable struct — not `@Model` — with the data the widget needs: title, place name, date, a `UIImage` thumbnail encoded as `Data`).
2. Implement `TimelineProvider.getTimeline(in:completion:)`. Inside, open a `ModelContext` from your shared container, fetch the most recent moment and any moment from "on this day" (same day/month in prior years). Build timeline entries for the next 24 hours. Use `TimelineReloadPolicy.after(nextMidnight)` so the widget reloads at midnight.
3. Implement `placeholder(in:)` — return a dummy entry with placeholder data. Do not make network calls or database reads here; it must return synchronously.

### Day 3 — Widget views for three sizes (2 hrs)

1. Implement three distinct layouts gated on `widgetFamily` via `@Environment(\.widgetFamily)`:
   - **Small:** First photo thumbnail filling the widget, moment title as overlay text.
   - **Medium:** Thumbnail on the left, title + place name + date on the right.
   - **Large:** "On this day" header, up to 3 moment rows with thumbnails and notes.
2. Use `containerBackground(for:)` modifier (required from iOS 17; without it the widget gets a default background you can't control).
3. Apply `.widgetURL(url)` on the small widget. Use `Link(destination:)` inside the medium/large widgets to make individual moment rows tappable.
4. Deep link URL scheme: `anchor://moment/{id}`. Handle this in `ContentView` via `.onOpenURL`.

### Day 4 — Widget configuration + intent-backed widget (1.5 hrs)

1. Add a `WidgetConfigurationIntent` conforming to `AppIntent` so users can choose what the widget shows: "Recent moment" vs "On this day." This connects WidgetKit and App Intents — the intent provides the widget's configuration parameter.
2. Switch your `TimelineProvider` to `AppIntentTimelineProvider` and read the intent's parameters in `getTimeline`.
3. In the widget's `WidgetInfo.supportedFamilies`, declare `.systemSmall`, `.systemMedium`, `.systemLarge`.
4. Run on your phone. Add the widget to your home screen. It should live there for the rest of this phase and Phase 5.

### Day 5–7 — Buffer / polish (1–2 hrs)

Add `.privacySensitive()` to the photo thumbnail in the widget — it will show a placeholder on the Lock Screen when the device is locked. Verify by testing with Face ID locked. Fix any layout issues you find during real-world use.

---

## Week 4 — App Intents: Siri, Shortcuts, parameters

**Theme:** "Anchor this moment" — expose your app to the system.

**Goal:** By end of week, a Shortcut appears automatically in the Shortcuts app when Anchor is installed. The user can say "Anchor this moment" and the app creates a moment with current location. A parameter lets them specify the title by voice.

### Day 1 — App Intents framework orientation (1.5 hrs)

Before writing code, understand the landscape:

**App Intents (iOS 16+) is the modern API.** It uses struct-based intents conforming to `AppIntent`. No separate extension target required for basic intents. No `.intentdefinition` file. The intent struct is the source of truth.

**Legacy SiriKit (`INIntent`, `INExtension`, `.intentdefinition` files) is the old API.** Do not use it. You will encounter it in older tutorials and Stack Overflow answers — ignore them.

Watch "Dive into App Intents" (WWDC22) today. It is 30 minutes and covers everything you need for this week.

### Day 2 — Your first AppIntent (1.5 hrs)

1. Create `CreateMomentIntent`:
   ```swift
   struct CreateMomentIntent: AppIntent {
       static let title: LocalizedStringResource = "Anchor a Moment"
       static let description = IntentDescription("Creates a new moment at your current location.")

       @Parameter(title: "Title")
       var title: String

       @MainActor
       func perform() async throws -> some IntentResult & ProvidesDialog {
           // Resolve current location, create Moment in SwiftData
           // Return a dialog confirming creation
           return .result(dialog: "Anchored: \(title)")
       }
   }
   ```
2. Add `static var appShortcuts: [AppShortcut]` using the `@AppShortcutsBuilder` result builder. Define at least one spoken phrase: `"Anchor \(.applicationName)"` and `"Save a moment in \(.applicationName)"`.
3. Build and run. Open the Shortcuts app — your shortcut should appear automatically under the Anchor app section without the user needing to add it manually.
4. Trigger it via Siri. Say "Anchor a moment" and confirm it prompts for the title parameter and creates the moment.

### Day 3 — Entity + query (1.5 hrs)

1. Create a `MomentEntity` conforming to `AppEntity`. This is how App Intents represents your data to the system:
   ```swift
   struct MomentEntity: AppEntity {
       static let defaultQuery = MomentQuery()
       static var typeDisplayRepresentation: TypeDisplayRepresentation = "Moment"
       var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(title)") }
       var id: UUID
       var title: String
   }
   ```
2. Implement `MomentQuery: EntityQuery` with `func entities(for identifiers:)` and `func suggestedEntities()` — the latter populates the picker in Shortcuts when a user tries to parameterize an intent with a specific moment.
3. Create a second intent: `FindMomentIntent` that takes a `MomentEntity` parameter and returns a dialog summarizing that moment's details (date, place, note preview).

### Day 4 — App Shortcuts in Spotlight (1 hr)

1. App Shortcuts (intents with `appShortcuts`) surface in Spotlight automatically when the user searches for them. Test this: swipe down on the home screen, type "Anchor" — your shortcut should appear as a top result.
2. Add `AppShortcutsProvider` conformance if needed by your Xcode version.
3. Watch "Spotlight your app with App Shortcuts" (WWDC23) — 25 minutes. Pay attention to Flexible Matching (iOS 17) and how shortcut phrase synonyms work.
4. Review "Design Shortcuts for Spotlight" (WWDC23) for the visual design requirements — icon tint, shortcut ordering, and naming conventions.

### Day 5–7 — Buffer / beta cycle 2 (1–2 hrs)

Push a second TestFlight build. Your second beta should include the widget (from Week 3) and at least one working shortcut. Ask testers to run the shortcut and report what breaks.

---

## Week 5 — CoreSpotlight: index your content

**Theme:** Make every moment findable from anywhere in iOS.

**Goal:** By end of week, every saved moment is indexed in `CSSearchableIndex`. A user who swipe-searches from the home screen and types a moment's title, place name, or note text sees the moment appear as a Spotlight result. Tapping it opens Anchor to that exact moment.

### Day 1 — CoreSpotlight orientation (1 hr)

1. Read the CoreSpotlight framework documentation: `CSSearchableItem`, `CSSearchableItemAttributeSet`, `CSSearchableIndex`.
2. Understand what Spotlight indexes: the `contentType`, `title`, `contentDescription`, `keywords`, and optionally a `thumbnailData`. Spotlight does not index arbitrary text — everything goes through the attribute set.
3. Create a `SpotlightIndexer` service — a `@MainActor`-isolated `@Observable` class with a single method: `func index(moment: Moment) async throws`.

### Day 2 — Index moments (1.5 hrs)

1. In `SpotlightIndexer.index(moment:)`:
   ```swift
   let attributeSet = CSSearchableItemAttributeSet(contentType: .image)
   attributeSet.title = moment.title
   attributeSet.contentDescription = moment.note
   attributeSet.keywords = [moment.placeName ?? "", moment.title]
   attributeSet.thumbnailData = moment.photos.first?.imageData
   attributeSet.namedLocation = moment.placeName

   let item = CSSearchableItem(
       uniqueIdentifier: moment.id.uuidString,
       domainIdentifier: "com.yourname.anchor.moments",
       attributeSet: attributeSet
   )
   try await CSSearchableIndex.default().indexSearchableItems([item])
   ```
2. Call `index(moment:)` every time a moment is created or updated. Also call it on app launch for any moments not yet indexed (check a `isIndexed: Bool` flag on the `@Model`).
3. Call `CSSearchableIndex.default().deleteSearchableItems(withIdentifiers:)` when a moment is deleted.

### Day 3 — Handle the Spotlight continuation (1 hr)

1. When the user taps a Spotlight result, iOS calls `scene(_:continue:userActivity:)` (UIKit) or delivers the `NSUserActivity` through SwiftUI's `.onContinueUserActivity(CSSearchableItemActionType)` modifier.
2. Extract `userActivity.userInfo?[CSSearchableItemActivityIdentifier] as? String` to get the moment's UUID string.
3. Navigate directly to that moment's detail view. This is the same deep-link infrastructure you wired in Week 3 for widget taps — reuse it.
4. Test end-to-end: create a moment, background the app, open Spotlight, type a word from the moment's note. Tap the result. Confirm you land on the correct detail view.

### Day 4 — Batch index + index deletion on upgrade (1 hr)

1. On first launch after this update, re-index all existing moments in a background `Task`. Use `withTaskGroup` to index in parallel (max 10 concurrent is safe).
2. Add an "on this day" keyword array to the attribute set: for each moment, include the day and month as a keyword string (e.g., "April 12") so Spotlight surfaces past moments when the user searches for today's date.
3. Verify in Settings → Siri & Search → Anchor that your app's content appears in Siri Suggestions and Search. If it doesn't, you have a domain identifier or entitlement issue.

### Day 5–7 — Accessibility + full-app audit (1–2 hrs)

Run the Xcode Accessibility Inspector against every screen in Anchor. Fix anything it flags. Specifically check:
- Map annotations have spoken descriptions ("Moment: Kyoto Garden, April 12").
- Widget previews in the widget gallery have meaningful descriptions.
- The Spotlight result row — you cannot control its accessibility label, but the `title` and `contentDescription` on the attribute set are what VoiceOver reads in Spotlight. Make them good.

---

## Week 6 — Polish, TestFlight, iterate

**Theme:** Ship it. Real testers, real feedback, real fixes.

**Goal:** Anchor is on TestFlight with ≥10 external testers. You have completed at least 2 full beta cycles (build → tester feedback → fix → new build). The mastery gate items are confirmed working.

### Day 1 — Pre-ship polish pass (2 hrs)

Walk through every screen and fix the top three visual issues you've been living with:
1. Moment creation sheet: loading state while photo data is being fetched from the library.
2. Map view: handle the case where no moments have coordinates — show an empty state, not a blank map centered at 0,0.
3. Widget: test on all three sizes on a physical device, not just Simulator. Simulator widget rendering differs from on-device.

Add haptics using `SensoryFeedback`:
- `.success` when a moment is saved.
- `.impact` when a moment is deleted.
- `.selection` when switching between Timeline and Map tabs.

### Day 2 — App Store Connect + TestFlight external (1.5 hrs)

1. Archive the app (`Product → Archive`). You have done this before with Shelf — the process is identical.
2. Upload to App Store Connect. Create an external TestFlight group. Add testers by email — you need ≥10 for this milestone. Use friends, colleagues, or the developer forums.
3. External builds require a brief TestFlight review (usually <24 hrs). Submit for review. While waiting, continue with Day 3.
4. Add a TestFlight "What to test" description: exactly what you want testers to try — create a moment, use the widget, run the shortcut, search Spotlight.

### Day 3 — Instruments pass (1 hr)

Open Instruments on a device. Run the Time Profiler + SwiftUI template against Anchor:
1. Create 50 moments (use a debug helper to populate test data).
2. Scroll the timeline. Look for hitches (dropped frames in the SwiftUI template).
3. Switch to the map view. Watch memory allocation when 50 annotations render.
4. Fix the top issue you find — probably photo thumbnail decoding happening on the main thread. Move it to a background task.

Record your baseline numbers before fixing and after. If you can't see a difference in the trace, the fix wasn't real.

### Day 4 — Tester feedback + bug fixes (1.5 hrs)

By Day 4 your external build should be approved. Testers are reporting. Triage feedback into:
- **Crash** — fix immediately, cut a new build.
- **Confusing UX** — note it, fix if fast.
- **Missing feature** — defer to after the phase.

The goal is crash-free rate >99% before you declare Phase 4 done. Check Xcode Organizer → Crashes for symbolicated crash reports.

### Day 5–7 — Second beta cycle + mastery gate verification (2 hrs)

1. Ship a second TestFlight build incorporating fixes from the first round. Ask the same testers to re-test.
2. Go through the mastery gate checklist below. Every item must be confirmed on a physical device, not Simulator.
3. Verify dogfooding: Anchor is on your home screen. The widget is there. You have used the Shortcut at least once for real. You found a real moment via Spotlight.

---

## Mastery gate — end of Phase 4

Confirm every item on a physical device before moving to Phase 5.

- [ ] Anchor is live on TestFlight. ≥10 external testers have received and installed the build.
- [ ] You have completed ≥2 beta cycles: tester feedback → fix → new build.
- [ ] A moment created with `PhotosPicker` (not `UIImagePickerController`) persists correctly and photos display in the timeline and detail view.
- [ ] The map view shows annotations for all geotagged moments. Tapping an annotation navigates to the moment.
- [ ] The WidgetKit extension renders on your home screen. You have verified small, medium, and large sizes by editing the widget from the home screen.
- [ ] The widget deep-links: tapping a moment row in the medium/large widget opens Anchor to that specific moment.
- [ ] `CreateMomentIntent` appears in the Shortcuts app without any user setup. Triggering it from Siri creates a real moment with the spoken title.
- [ ] A moment's content is findable via iOS Spotlight search (swipe down from home screen → type a word from a moment's note → result appears → tapping it opens Anchor to that moment).
- [ ] VoiceOver can navigate the full timeline and detail view without getting stuck.
- [ ] Dynamic Type at AX5 does not break any layout.
- [ ] Anchor has been open in Instruments at least once and you have fixed at least one real performance issue confirmed by a trace.
- [ ] Crash-free rate in Xcode Organizer is >99% across your beta population.

---

## Resources — Phase 4

Ordered by priority. Read/watch must-use items in the week they become relevant, not all upfront.

### Primary references (must-use)

- 📘 **PhotosUI — PhotosPicker documentation** — https://developer.apple.com/documentation/photosu/photospicker
  > The canonical API reference. Read the overview section before Week 1 Day 2.

- 📘 **PhotoKit documentation** — https://developer.apple.com/documentation/photokit
  > Reference for `PHAsset`, `PHImageManager`, `PHAuthorizationStatus`. Read the "Fetching Assets" section for Week 1 Day 3.

- 📘 **MapKit for SwiftUI documentation** — https://developer.apple.com/documentation/mapkit/mapkit-for-swiftui
  > The iOS 17 SwiftUI Map API. Separate from the older `MKMapView` docs — make sure you're reading the right one.

- 📘 **WidgetKit documentation** — https://developer.apple.com/documentation/widgetkit
  > Read "Creating a Widget Extension" and "Keeping a Widget Up To Date" before Week 3.

- 📘 **App Intents documentation** — https://developer.apple.com/documentation/appintents
  > Read the "Making Actions and Content Discoverable and Widely Available" section before Week 4.

- 📘 **CoreSpotlight documentation** — https://developer.apple.com/documentation/corespotlight
  > Read `CSSearchableItem` and `CSSearchableIndex` reference pages before Week 5.

- 📘 **Human Interface Guidelines — Widgets** — https://developer.apple.com/design/human-interface-guidelines/widgets
  > Read before building any widget UI. Widget layout constraints are strict and opinionated.

- 📘 **Human Interface Guidelines — Siri** — https://developer.apple.com/design/human-interface-guidelines/siri
  > Read the "App Shortcuts" section before Week 4.

### Videos (must-watch)

- 🎬 **What's new in the Photos picker** — WWDC22 — https://developer.apple.com/videos/play/wwdc2022/10023/ (~14 min)
  > Watch before Week 1 Day 2. Covers `PhotosPicker` SwiftUI integration and `Transferable`.

- 🎬 **Improve access to Photos in your app** — WWDC21 — https://developer.apple.com/videos/play/wwdc2021/10046/ (~20 min)
  > Watch alongside WWDC22/10023. Covers `PHAsset`, limited library, and cloud identifiers.

- 🎬 **Meet MapKit for SwiftUI** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10043/ (~25 min)
  > Watch before Week 2 Day 2. This is the session for the iOS 17 `Map` SwiftUI API you will use.

- 🎬 **Meet WidgetKit** — WWDC20 — https://developer.apple.com/videos/play/wwdc2020/10028/ (~29 min)
  > Watch before Week 3 Day 1. The foundational mental model for `TimelineProvider` and widget views.

- 🎬 **Principles of great widgets** — WWDC21 — https://developer.apple.com/videos/play/wwdc2021/10048/ (~26 min)
  > Watch before Week 3 Day 2. Covers timeline reload policies, privacy redaction, and size configurations.

- 🎬 **Dive into App Intents** — WWDC22 — https://developer.apple.com/videos/play/wwdc2022/10032/ (~30 min)
  > Watch on Week 4 Day 1. The single most important video for this framework. Covers intents, entities, queries, and the architecture.

- 🎬 **Implement App Shortcuts with App Intents** — WWDC22 — https://developer.apple.com/videos/play/wwdc2022/10170/ (~23 min)
  > Watch on Week 4 Day 2. Covers zero-setup App Shortcuts, phrase building, and Siri tips.

- 🎬 **Spotlight your app with App Shortcuts** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10102/ (~25 min)
  > Watch on Week 4 Day 4. Covers Spotlight integration, Flexible Matching (iOS 17), and cross-device shortcuts.

### Videos (optional)

- 🎬 **What's new in MapKit** — WWDC22 — https://developer.apple.com/videos/play/wwdc2022/10035/ (~20 min)
  > Covers Look Around, selectable map features, and overlay blend modes. Watch if you want to go deeper on MapKit.

- 🎬 **Complications and widgets: Reloaded** — WWDC22 — https://developer.apple.com/videos/play/wwdc2022/10050/ (~25 min)
  > Covers accessory widget families (Lock Screen, complications). Optional unless you want a Lock Screen widget.

- 🎬 **Add intelligence to your widgets** — WWDC21 — https://developer.apple.com/videos/play/wwdc2021/10049/ (~19 min)
  > Covers Smart Stack relevance donations. Watch if your widget isn't appearing in Smart Stacks when expected.

- 🎬 **Bring widgets to new places** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10027/ (~18 min)
  > Covers `containerBackground`, iPad desktop widgets, StandBy mode, Apple Watch Smart Stack.

- 🎬 **Explore enhancements to App Intents** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10103/ (~30 min)
  > Covers interactive widget configuration with App Intents, parameter dependencies, and dynamic options.

- 🎬 **Design Shortcuts for Spotlight** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10193/ (~19 min)
  > Design guidance for how shortcuts appear in Spotlight — icon tint, ordering, naming. Watch if your Spotlight results look wrong.

### Books (optional, paid)

- 📗 **Advanced Swift** by objc.io — https://www.objc.io/books/advanced-swift/
  > Chapters on generics and protocol-oriented programming become relevant if you're designing the `PhotosImageLoader` protocol or the `SpotlightIndexer` service abstraction.

- 📗 **Practical Swift Concurrency** by Donny Wals — https://donnywals.com/books/practical-swift-concurrency/
  > If `loadTransferable` async patterns or the `PHImageManager` callback-to-async bridging isn't clicking, this book has the clearest treatment of those conversions.

### Free alternatives

- 🔗 **Hacking with Swift — WidgetKit** — https://www.hackingwithswift.com/books/ios-swiftui/creating-a-widget-extension
  > Paul Hudson's free tutorial. Good supplementary read if the Apple docs are unclear on widget project setup.
- 🔗 **Donny Wals blog — App Intents** — https://www.donnywals.com/category/app-intents/
  > Several short, accurate posts on App Intents edge cases. Search here before Stack Overflow.
- 🔗 **Swift by Sundell — MapKit** — https://www.swiftbysundell.com/
  > Search "MapKit SwiftUI" for articles on the newer Map API.
- 🔗 **Apple Developer Forums** — https://developer.apple.com/forums/
  > The WidgetKit and App Intents tags are active and staffed by Apple engineers. Better signal than Stack Overflow for framework-specific issues.

### Tools / services

- 🛠️ **TestFlight** — https://developer.apple.com/testflight/ — external beta distribution for ≥10 testers.
- 🛠️ **App Store Connect** — https://appstoreconnect.apple.com/ — you already have access from Phase 3; create the Anchor app record.
- 🛠️ **Instruments** (bundled with Xcode) — Time Profiler + SwiftUI template. Run it before calling Week 6 done.
- 🛠️ **SF Symbols app** — https://developer.apple.com/sf-symbols/ — pick symbols for the creation sheet, map annotations, and widget.
- 🛠️ **Core Location simulator** (Xcode → Debug → Simulate Location) — test location-based features without physically moving.

---

## If you get stuck

In rough order of what to try:

1. **Check the framework version.** WidgetKit, App Intents, and the SwiftUI `Map` API all changed significantly between iOS 16 and iOS 17. Confirm you're reading documentation and tutorials that match your deployment target. Anchor targets iOS 17 — if a tutorial is using `IntentConfiguration` with `.intentdefinition` files for widgets, it's iOS 15/16 era; find a newer source.
2. **Widget not updating?** Read "Keeping a Widget Up to Date" in the WidgetKit docs. Widget reloads are budget-constrained by the system. In development, use the Xcode widget simulator entry point to force a reload.
3. **App Intent not appearing in Shortcuts?** Rebuild clean. The App Intents static metadata extraction happens at compile time — sometimes a cached extraction is stale. `Product → Clean Build Folder`, then rebuild.
4. **Spotlight not returning results?** Verify your app has "Siri & Search" enabled in Settings → your app. Delete and reinstall the app — Spotlight index for a development build can get into a bad state. In production this is not an issue.
5. **PHImageManager returning nil?** You're probably calling it outside the main thread or before authorization is granted. Check authorization status before every `requestImage` call.
6. **Donny Wals blog** — https://www.donnywals.com/ — strongest free resource for App Intents edge cases and async patterns.
7. **Apple Developer Forums** — https://developer.apple.com/forums/ — WidgetKit and App Intents tags. Apple engineers respond to well-formed questions.
8. **Ask Claude** — describe the framework, the API you're calling, the behavior you see, and the behavior you expect. Paste the relevant 10–20 lines of code. Vague questions get vague answers.

Avoid Stack Overflow for any of the five frameworks in this phase. The answers predate iOS 17 and will point you toward deprecated or wrong APIs. Date-filter any search to 2023 or newer, and even then verify against Apple's official docs.

---

## When you're done

1. Every mastery gate checkbox is ticked.
2. Anchor is on TestFlight with ≥10 external testers and ≥2 beta cycles completed.
3. The widget is on your home screen. The shortcut is in the Shortcuts app. Spotlight returns your moments.
4. Both Shelf (App Store, Phase 3) and Anchor (TestFlight, Phase 4) are on your phone and you are actively using both.
5. Push everything to GitHub.

Phase 5 is where both of these apps get the engineering treatment they deserve: protocol-based service extraction, Swift Testing at scale, snapshot tests across Dynamic Type sizes and dark mode, and a CI pipeline that blocks merging on red. You will also turn on Swift 6 strict concurrency mode and fix every warning — if you've been disciplined about `@MainActor` and `Sendable` in Phases 3 and 4, this will be a minor cleanup; if you haven't, it will be educational. Phase 5 also refactors Anchor's `SpotlightIndexer`, `LocationService`, and `PhotosImageLoader` into testable, protocol-backed services — so the work you did in Phase 4 becomes the refactoring substrate.

Dogfooding continues. Both apps stay on your home screen through Phase 5 and beyond.
