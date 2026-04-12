# Phase 6 — Audio, Background Work, Performance, Instruments

**Duration:** 6 weeks · **Budget:** ~42 hours total · **Pace:** 5–8 hrs/week

## Translating to your own app

The skills in this phase look audio-specific but aren't. AVFoundation, background execution, and Instruments are three of the most universally applicable frameworks on the platform. Any app that plays music, records audio, speaks aloud, or plays video touches AVFoundation. Any app that syncs, refreshes content, or runs deferred maintenance uses BGTaskScheduler. And Instruments — every non-trivial app benefits from a profiling pass before shipping; skipping it is how you end up on Reddit.

What is specific to audio apps: AVAudioEngine's node-graph model, waveform level metering via AVAudioPCMBuffer, and SFSpeechRecognizer's per-session limitations. Everything else — identifying a main-thread hang, fixing a SwiftUI redraw storm, understanding why your launch time regressed, reading MetricKit diagnostics from production users — applies equally to a recipe app, a fitness tracker, a journaling tool, or the Mnemo capstone you're building toward. Learn it here in Murmur; carry it everywhere.

## What you'll have at the end

1. Murmur, a voice-memo + live transcription app, on TestFlight with real external testers.
2. On-device transcription via SFSpeechRecognizer — nothing leaves the device.
3. A waveform visualization that renders in real time during recording and during playback scrubbing.
4. Background processing via BGTaskScheduler (post-processing transcripts when the app isn't in the foreground).
5. MetricKit integrated: hang reports and performance diagnostics are captured and logged.
6. A profiling README with before/after Instruments numbers for the top three hotspots found in a 200+ memo library.
7. CI pipeline extended from Phase 5 to cover Murmur — all tests green, same GitHub Actions workflow.

## What you WILL NOT do in Phase 6

- Build a server-side component. Nothing leaves the device — no uploads, no sync, no cloud transcription.
- Use Combine. AVAudioEngine level metering flows into SwiftUI via `AsyncStream`; everywhere else is `async`/`await` and `@Observable`. Combine is legacy.
- Implement CloudKit or iCloud sync (that's Phase 9, and it doesn't belong here).
- Reach for UIKit audio views. The waveform is a custom SwiftUI `Canvas`-based view. No UIKit bridging needed.
- Import a third-party audio SDK. AVFoundation is the answer.
- Optimize prematurely. Run Instruments first. Fix what the trace tells you, not what you assume.

---

## Week 1 — AVFoundation fundamentals: recording and playback

Goal: by end of week, Murmur can record a memo, save it to disk, and play it back. No transcription yet, no waveform. Just reliable audio I/O.

### Day 1 — Project setup and audio session configuration (1–2 hrs)

1. Create a new Xcode project: `File → New → Project → iOS App`. Name: `Murmur`. SwiftUI, Swift. Bundle ID in reverse-DNS format.
2. Add the project to the ios-tutorial GitHub repo in a `murmur/` subdirectory (not a separate repo — keep everything in one place like Shelf and Anchor).
3. Configure `Info.plist` with the required permission key:
   ```
   NSMicrophoneUsageDescription
   ```
   Write a real description string — App Review will read it.
4. Configure `AVAudioSession` at app launch. Murmur needs `.playAndRecord` category with `.defaultToSpeaker` and `.allowBluetooth` options. Do this in a dedicated `AudioSessionManager` actor, not inline in a view:
   ```swift
   actor AudioSessionManager {
       func configure() throws {
           let session = AVAudioSession.sharedInstance()
           try session.setCategory(.playAndRecord,
                                   options: [.defaultToSpeaker, .allowBluetooth])
           try session.setActive(true)
       }
   }
   ```
5. Handle interruptions (phone calls, Siri) by observing `AVAudioSession.interruptionNotification`. If you don't, recording silently stops mid-memo and the user loses data.

### Day 2–3 — AVAudioRecorder: record and persist (2–3 hrs)

1. Build a `RecordingService` actor that wraps `AVAudioRecorder`. Accept a file URL (in the app's Documents directory), start recording, stop recording, return the file URL.
2. Use `.m4a` format (`kAudioFormatMPEG4AAC`) at 44100 Hz, mono. Good quality, small files, plays back everywhere.
3. Persist memo metadata in SwiftData: `@Model class Memo` with `id`, `title`, `createdAt`, `duration`, `fileURL` (stored as a relative path string, not an absolute URL — absolute paths change on iOS after app updates).
4. Wire up a minimal recording screen: one large button, tap to start, tap to stop. No animation yet. Focus on correctness.

### Day 4–5 — AVAudioPlayer: playback (1–2 hrs)

1. Build a `PlaybackService` actor that wraps `AVAudioPlayer`. Load from URL, play, pause, seek to time, observe current time via a periodic timer.
2. Expose playback state to SwiftUI via an `@Observable` view model. Current time, duration, isPlaying.
3. Build a minimal playback row in the memo list: play/pause button, time elapsed. No waveform yet.
4. Test on a physical device. The Simulator's microphone is unreliable; don't trust simulator results for recording quality.

### Day 6–7 — Persistence hygiene and first commit (1 hr)

1. Verify file cleanup: when a memo is deleted from SwiftData, also delete the audio file on disk. If you don't, deleted memos accumulate silently.
2. Extend the Phase 5 CI pipeline to run Murmur's tests. Add a test target to the Murmur project; write two tests: one that verifies RecordingService produces a non-zero file after a simulated recording, one that verifies deletion cleans up the file.
3. Commit and push. CI should be green.

**Checkpoint:** Record a memo on your phone, kill the app, reopen it, play it back. It works.

---

## Week 2 — Waveform visualization

Goal: a real-time waveform during recording and a static waveform during playback. This is where you'll first encounter SwiftUI performance issues — address them directly.

### Day 1–2 — Level metering during recording (2 hrs)

1. Enable `isMeteringEnabled = true` on `AVAudioRecorder`.
2. Attach a repeating `Timer` (every ~50ms) while recording is active to call `updateMeters()` and read `averagePower(forChannel:)` and `peakPower(forChannel:)`.
3. Convert raw dB values to a normalized 0–1 amplitude using a dB-to-linear mapping (roughly: `pow(10, dBValue / 20)`). Clamp to [0, 1].
4. Push samples into an `@Observable` model as a `[Float]` array (ring buffer, capped at ~200 samples for real-time display).

### Day 3–4 — SwiftUI Canvas waveform (2–3 hrs)

1. Draw the waveform using SwiftUI `Canvas`. Do not use `Shape` with `Path` for this — Canvas draws once per frame without creating View nodes for each bar, which matters at 200 samples.
   ```swift
   Canvas { context, size in
       for (index, sample) in samples.enumerated() {
           let x = CGFloat(index) / CGFloat(samples.count) * size.width
           let barHeight = CGFloat(sample) * size.height
           let rect = CGRect(x: x, y: (size.height - barHeight) / 2,
                             width: barWidth, height: barHeight)
           context.fill(Path(rect), with: .color(.accent))
       }
   }
   .frame(height: 80)
   ```
2. Keep the waveform view's dependencies narrow: pass `samples` as a `let [Float]` parameter, not a reference to the full `@Observable` model. This limits redraws to changes in `samples` only.

### Day 5 — Static waveform for saved memos (1–2 hrs)

1. For saved memos, generate a downsampled waveform at save time using `AVAssetReader` + `AVAssetReaderTrackOutput`. Read the PCM data, downsample to ~200 points, store as `[Float]` in SwiftData (as a `Data` blob).
2. This runs as a background task after recording stops — do it in a `Task { }` with `.userInitiated` priority, not on the main actor.
3. The static waveform doubles as a scrubbing target: tap a position on the waveform to seek playback.

### Day 6–7 — Performance check (1 hr)

1. Open Instruments now, before there's a performance problem. Run the **SwiftUI** template while recording. Look at the View Body column. If anything is re-evaluating unexpectedly often, fix it.
2. Record the baseline numbers: body evaluation count per second during recording playback. You'll compare against this after the large-library stress test in Week 6.

**Checkpoint:** Record a memo. Watch the waveform animate in real time. Stop. The waveform freezes into the saved shape. Tap it to scrub.

---

## Week 3 — On-device transcription with SFSpeechRecognizer

Goal: after a recording ends, transcribe it on-device. Display the transcript in the memo detail view. Respect the framework's real limitations.

### Day 1 — Permission and availability check (1 hr)

1. Request `SFSpeechRecognizer` authorization separately from microphone permission. Both are required. Add `NSSpeechRecognitionUsageDescription` to `Info.plist`.
2. Check `SFSpeechRecognizer.authorizationStatus()` at launch. If `.denied` or `.restricted`, show a non-modal prompt explaining what's missing. Do not hide transcription silently.
3. Check `recognizer.isAvailable` before attempting recognition. The recognizer can become unavailable (no language model downloaded for the user's locale). Handle this gracefully — transcription is a feature, not a hard dependency.

### Day 2–3 — On-device transcription pipeline (2–3 hrs)

1. Build a `TranscriptionService` actor. It accepts a file URL and returns a `String`.
2. Use `SFSpeechAudioBufferRecognitionRequest` rather than `SFSpeechURLRecognitionRequest` for better control. Load the audio file into an `AVAudioFile`, read it into `AVAudioPCMBuffer` chunks, append them to the request.
3. Set `.requiresOnDeviceRecognition = true`. This is non-negotiable for Murmur's privacy guarantee.

   **Critical caveat — read this before coding:**
   - `requiresOnDeviceRecognition = true` requires iOS 16+.
   - On-device recognition is only available for some languages. For unsupported locales, the recognizer falls back to server-side or returns `.notAvailable`. Detect this and surface it to the user.
   - On-device recognition has a hard 1-minute limit per session. For memos longer than 60 seconds, split the audio into 55-second segments (with a small overlap), transcribe each, concatenate. This is not optional — the framework will silently stop transcribing mid-memo if you exceed the limit.

4. For the segment-and-concatenate approach, overlap segments by ~2 seconds to avoid cutting words at boundaries. Trim the overlapping tail from each segment's transcript before joining.

### Day 4 — Storing and displaying transcripts (1 hr)

1. Add `transcript: String?` and `transcriptState: TranscriptState` to the `Memo` model. `TranscriptState` is an enum: `.pending`, `.inProgress`, `.done`, `.failed(String)`.
2. In the memo detail view, show the transcript in a scrollable `Text` with a `.font(.body)` and reasonable line spacing. Clean typography matters — this is a reading surface.
3. Highlight search terms in the transcript view when the user has an active search query. Use `AttributedString` for this — don't concatenate `Text` nodes, which defeats Dynamic Type.

### Day 5–6 — Search across transcripts (1–2 hrs)

1. Add a search bar to the memo list (`.searchable` modifier on `NavigationStack`). Filter memos by title OR transcript content.
2. Use SwiftData's `#Predicate` for the filter — push it to the store, don't filter in memory.
   ```swift
   #Predicate<Memo> { memo in
       memo.title.localizedStandardContains(query) ||
       (memo.transcript ?? "").localizedStandardContains(query)
   }
   ```
3. Test search with 20+ memos. If it feels slow, open Instruments before guessing the cause.

### Day 7 — Accessibility pass (1 hr)

Transcripts are a reading experience. Check:
- Dynamic Type at AX5: does the transcript view scroll correctly? Does the waveform scale gracefully or clip?
- VoiceOver: can a user navigate to a memo, hear its title and duration, and read the transcript?
- Reduce Motion: disable any waveform animation, show a static bar instead.

**Checkpoint:** Record a 30-second memo in a supported language. After 5–10 seconds, a transcript appears. Search finds it.

---

## Week 4 — Background execution with BGTaskScheduler

Goal: understand what BGTaskScheduler actually is (it is not cron), implement background transcript processing for memos that didn't get transcribed in the foreground, and handle all the gotchas.

### Day 1 — Mental model: BGTaskScheduler is not cron (1 hr)

Read this before writing any code.

`BGTaskScheduler` schedules work with the OS. The OS decides when to actually run it. "When to run it" typically means: device is charging, low activity, connected to Wi-Fi, and the user is likely asleep or not using the phone. There is no way to force execution on demand. There is no guarantee of timing. A scheduled `BGProcessingTask` may not run for hours. Plan accordingly.

Two task types:
- `BGAppRefreshTask`: short (~30 seconds of CPU budget), intended for refreshing content. Runs more frequently.
- `BGProcessingTask`: longer (minutes of CPU budget), intended for expensive work like ML inference or batch processing. Requires the device to be charging (by default). Use this for batch transcription of a backlog of memos.

Murmur uses `BGProcessingTask` for: re-transcribing failed memos in bulk, and building the waveform data for any memos that failed waveform generation (e.g., if the user killed the app mid-process).

### Day 2–3 — Implement BGProcessingTask (2–3 hrs)

1. Register the background task identifier in `Info.plist` under `BGTaskSchedulerPermittedIdentifiers`. Use a reverse-DNS string like `com.yourname.murmur.process-transcripts`.
2. Register the handler at app startup (in `@main App.init`, not in a View):
   ```swift
   BGTaskScheduler.shared.register(
       forTaskWithIdentifier: "com.yourname.murmur.process-transcripts",
       using: nil
   ) { task in
       handleTranscriptionBacklogTask(task as! BGProcessingTask)
   }
   ```
3. In `handleTranscriptionBacklogTask`: fetch all memos with `transcriptState == .pending` or `.failed`, transcribe them one by one, call `task.setTaskCompleted(success:)` when done. Set `task.expirationHandler` to cancel in-flight work and mark remaining memos back to `.pending`.
4. Schedule the task when the app enters the background:
   ```swift
   func scheduleTranscriptionBacklog() {
       let request = BGProcessingTaskRequest(
           identifier: "com.yourname.murmur.process-transcripts")
       request.requiresNetworkConnectivity = false
       request.requiresExternalPower = true
       try? BGTaskScheduler.shared.submit(request)
   }
   ```

### Day 4 — Testing background tasks (1 hr)

You cannot wait overnight to test this. Use the Xcode debugger to simulate background task launch:

1. Run the app on a device (not simulator — background tasks don't run reliably in simulator).
2. Pause execution in the debugger.
3. In the Xcode console, run:
   ```
   e -l objc -- (void)[[BGTaskScheduler sharedScheduler] _simulateLaunchForTaskWithIdentifier:@"com.yourname.murmur.process-transcripts"]
   ```
4. Resume execution. The background task handler fires immediately.
5. Verify: pending memos get transcribed, `task.setTaskCompleted(success: true)` is called, no crash.

### Day 5 — Edge cases and battery hygiene (1 hr)

1. If `task.expirationHandler` fires, you have a few seconds to clean up. Mark in-progress memos back to `.pending` so the next run picks them up. Do not try to finish the current transcription.
2. Do not re-schedule a background task inside the background task handler itself. Schedule it in `scenePhase == .background` only.
3. Verify energy impact in Instruments (Energy Log template) during a simulated background task run. The transcription work should not peg the CPU.

### Day 6–7 — Manual transcription retry in foreground (1 hr)

Add a "Retry transcription" context menu item on any memo with `transcriptState == .failed`. Trigger `TranscriptionService` directly (not via BGTask) on the main app's process. This is the escape hatch for users whose background task never ran.

**Checkpoint:** Force a simulated background task execution in the debugger. All pending memos get transcribed. Kill the app mid-task, reopen, verify memos are in `.pending` (not corrupted state).

---

## Week 5 — MetricKit, polish, and TestFlight

Goal: integrate MetricKit, finish the UI polish pass, prepare for TestFlight.

### Day 1–2 — MetricKit integration (2 hrs)

1. Create a `MetricKitSubscriber` class that conforms to `MXMetricManagerSubscriber`:
   ```swift
   final class MetricKitSubscriber: NSObject, MXMetricManagerSubscriber {
       override init() {
           super.init()
           MXMetricManager.shared.add(self)
       }

       func didReceive(_ payloads: [MXMetricPayload]) {
           for payload in payloads {
               // Log to your preferred logger
               // Key fields: launchMetrics, responsiveness, memory
               print(payload.jsonRepresentation())
           }
       }

       func didReceive(_ payloads: [MXDiagnosticPayload]) {
           for payload in payloads {
               // Hang diagnostics, CPU exceptions, disk writes
               print(payload.jsonRepresentation())
           }
       }
   }
   ```
2. Instantiate `MetricKitSubscriber` once at app launch and keep a strong reference. MetricKit delivers payloads at most once per day; you'll mostly see data during TestFlight.
3. For Phase 6, logging to the console is sufficient. In a production app you'd ship these to a backend (Sentry, your own endpoint). Don't build that now.

### Day 3–4 — UI polish (2–3 hrs)

Murmur's transcript list is a reading surface. Polish matters here.

1. Typography: transcripts use `.body` size, `.design(.rounded)` or `.design(.serif)` depending on your aesthetic preference. Line spacing set via `.lineSpacing(4)`. Add reasonable `.padding(.horizontal)`.
2. Waveform in the playback view: use `.accent` color for the active (played) portion, `.secondary` for the remaining. Animate the playhead position with `.animation(.linear(duration: 0.05), value: currentTime)`.
3. Haptics: use `SensoryFeedback` (not `UIImpactFeedbackGenerator`) on recording start/stop. A `.impact(.heavy)` on start, `.success` on successful save.
4. Empty state: a new Murmur install has no memos. The empty state should not be a generic "No items" label. Write something specific ("Tap the microphone to record your first memo.") and pair it with an SF Symbol.
5. Memo row swipe-to-delete with a `.destructive` label. Deletion deletes both the SwiftData record and the audio file on disk.

### Day 5 — Accessibility final pass (1 hr)

Run the Accessibility Inspector on:
- The recording screen (is the record button labeled? Does its state change announcement work during recording?)
- The transcript view (does VoiceOver read the transcript? Does Dynamic Type AX5 break the layout?)
- The waveform (mark it `.accessibilityHidden(true)` — it is decorative for VoiceOver users)

### Day 6–7 — TestFlight prep and submission (2 hrs)

1. Set the build version to 1.0 (0). Archive: `Product → Archive`.
2. In App Store Connect: create the Murmur app record. Choose a Bundle ID that matches your Xcode project. Fill in privacy nutrition labels (Murmur collects nothing, but you must explicitly declare "no data collected").
3. Add a `NSMicrophoneUsageDescription`, `NSSpeechRecognitionUsageDescription` to privacy manifest (`PrivacyInfo.xcprivacy`) with accurate reason codes. Apple validates these.
4. Submit the build to TestFlight. Add yourself and 3–5 external testers (friends). Send the TestFlight invite.

**Checkpoint:** Murmur is live on TestFlight. At least two people who are not you have installed it.

---

## Week 6 — Instruments profiling and fixing the top three hotspots

Goal: profile Murmur against a large library (200+ memos), identify the top three performance hotspots, fix them, and document the before/after numbers. This is the milestone deliverable.

### Day 1 — Generate a large library (1 hr)

1. Write a test helper (not production code) that seeds SwiftData with 200+ `Memo` records, each with a realistic transcript string (~500 characters) and a synthetic waveform data blob.
2. You don't need 200 real audio files — the seed can use a short shared audio file. The goal is to stress-test the list rendering and search index, not audio playback.
3. Install this build on your device. Navigate the memo list. Does it scroll at 60fps or does it hitch?

### Day 2–3 — Time Profiler and SwiftUI template (2–3 hrs)

Open Instruments. You will run three templates:

**Template 1: Time Profiler**
- Profile a cold launch of Murmur.
- Note the time from process start to first interactive frame. This is your launch time baseline.
- Drill into the heaviest call stacks. Common offenders: SwiftData fetches on the main thread, large image decodes, synchronous file reads at launch.

**Template 2: SwiftUI (includes Hangs and Animation Hitches)**
- Profile scrolling through the 200-memo list at normal speed and at maximum scroll velocity.
- Look at the View Body column. Any view with unexpectedly high body evaluation counts is a dependency leak — it's observing more state than it needs.
- Look at the Hitch Rate metric. Target: <5 ms/s. If you see >10 ms/s, there's a frame-rendering problem, not just a logic problem.

**Template 3: Allocations**
- Profile the app for 2 minutes of normal use: launch, scroll, record a memo, play it back.
- Look at "All Allocations" growth over time. A healthy app flattens out after the initial ramp. If memory keeps growing linearly, you have a retain cycle or a collection that never drains.
- Filter to your module name to ignore system allocations.

### Day 4 — Fix the top three hotspots (2–3 hrs)

Common issues you will likely find in a 200-memo library:

**Issue 1: Waveform data loaded eagerly for all visible cells.**
The waveform `Data` blob may be decoded and rendered even for off-screen cells. Fix: make the waveform a lazy-loaded property or use `.task { }` on the cell to load waveform data only when the cell becomes visible. Compare hitch rate before/after.

**Issue 2: SwiftData `@Query` fetching full transcript text for all 200 memos in the list view.**
The list only needs `title`, `createdAt`, and `duration` — not the full transcript blob. Fix: create a lightweight `MemoSummary` struct with only the fields needed for the list; fetch full data only in the detail view. Compare allocations peak and Time Profiler list-scroll time before/after.

**Issue 3: Overly broad `@Observable` dependencies in the recording view.**
If `RecordingViewModel` holds both the level-meter samples and the global memo list, every new sample triggers a redraw of any view observing the model — including views that don't display the waveform. Fix: split into two `@Observable` classes: `RecordingSession` (live recording state) and `MemoStore` (list + search). Compare SwiftUI body evaluation count before/after.

Your top three may differ — follow the trace, not these guesses.

### Day 5–6 — Write the profiling README (1–2 hrs)

In `murmur/PROFILING.md`, write a short document covering:

1. **Test setup**: device model, iOS version, library size (memo count).
2. **Baseline numbers** (before fixes): launch time (ms), hitch rate (ms/s during list scroll), peak memory (MB during 2-minute session).
3. For each of the three hotspots:
   - What Instruments showed (screenshot or description of the flamegraph/metric)
   - Root cause (one sentence)
   - Fix (code change, described concisely)
   - After numbers (same metrics as baseline)
4. **Summary table** with before/after for all three fixes.

This document is the milestone deliverable alongside the TestFlight build. A senior iOS engineer should be able to read it and trust that you know what you're doing with Instruments.

### Day 7 — Final TestFlight update and CI verification (1 hr)

1. Archive the fixed build, increment the build number, submit to TestFlight.
2. Confirm CI is green on the final commit: `xcodebuild test` runs Murmur's unit tests, passes.
3. Verify the profiling README is committed to the repo.

**Checkpoint:** You can open the Time Profiler on a cold Murmur launch and tell someone exactly what the three heaviest call stacks are and why they matter.

---

## Mastery gate — end of Phase 6

Without help, you should be able to answer and do these:

- [ ] Configure `AVAudioSession` for record + playback and explain what happens if you skip the interruption handler.
- [ ] Explain the difference between `BGAppRefreshTask` and `BGProcessingTask`. When would you use each?
- [ ] Describe what happens when `requiresOnDeviceRecognition = true` is set for a language that doesn't support on-device recognition.
- [ ] What is the per-session limit for on-device `SFSpeechRecognizer`, and how do you work around it for long recordings?
- [ ] Open Instruments, attach to a running app, identify a SwiftUI redraw storm (excessive body evaluations), and name the view and the dependency causing it.
- [ ] Read a Time Profiler flamegraph and identify the call stack responsible for a main-thread hang.
- [ ] State Murmur's launch time, peak memory during a 2-minute session, and hitch rate during list scroll — as actual numbers from your profiling run.
- [ ] Explain view identity in SwiftUI and why `AnyView` is a performance trap.
- [ ] Simulate a `BGProcessingTask` execution using the Xcode debugger console command.
- [ ] Confirm CI is green, MetricKit is integrated, and the profiling README is in the repo.

App 3 is on TestFlight. Instruments is no longer a mystery.

---

## Resources — Phase 6

Ordered by priority. Must-use items are marked.

### Primary references (must-use)

- 📘 **AVFoundation documentation** — https://developer.apple.com/documentation/avfoundation
  > Start with the AVAudioEngine, AVAudioRecorder, and AVAudioPlayer class references. Read the "Audio" section of the AVFoundation guide.

- 📘 **SFSpeechRecognizer documentation** — https://developer.apple.com/documentation/speech/sfspeechrecognizer
  > Read the class reference and the `SFSpeechAudioBufferRecognitionRequest` page carefully. The on-device flag and its limitations are documented here.

- 📘 **BackgroundTasks framework documentation** — https://developer.apple.com/documentation/backgroundtasks
  > Read the `BGTaskScheduler`, `BGProcessingTask`, and `BGAppRefreshTask` class references. The scheduling guide is short and worth reading in full.

- 📘 **MetricKit documentation** — https://developer.apple.com/documentation/metrickit
  > Read `MXMetricManager`, `MXMetricPayload`, and `MXDiagnosticPayload`. The diagnostic payload (hangs, CPU exceptions) is the most useful in production.

- 📘 **Instruments User Guide** — https://help.apple.com/instruments/mac/current/
  > Reference for navigating Instruments UI. You won't read it cover-to-cover; use it to understand specific columns and metrics when you encounter them.

### Videos (must-watch)

- 🎬 **Getting Started with Instruments** — WWDC19 — https://developer.apple.com/videos/play/wwdc2019/411/ (~40 min)
  > The canonical starting point for Instruments. Covers Time Profiler, signposts, and the mental model for performance analysis. Watch before Week 6.

- 🎬 **Analyze hangs with Instruments** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10248/ (~28 min)
  > Covers the Hangs instrument, main-thread hangs vs. blocked hangs, and practical fixes. Watch before Week 6.

- 🎬 **Demystify SwiftUI** — WWDC21 — https://developer.apple.com/videos/play/wwdc2021/10022/ (~39 min)
  > View identity, lifetime, and dependencies. The fundamental mental model for understanding why views re-evaluate. Watch before Week 2.

- 🎬 **Demystify SwiftUI Performance** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10160/ (~25 min)
  > Practical SwiftUI performance: dependency optimization, reducing body cost, `@Observable` vs legacy. Watch before Week 6.

- 🎬 **What's New in AVAudioEngine** — WWDC19 — https://developer.apple.com/videos/play/wwdc2019/510/ (~33 min)
  > Covers AVAudioEngine node graph, AVAudioSourceNode and AVAudioSinkNode, voice processing. Watch during Week 1.

- 🎬 **Advances in App Background Execution** — WWDC19 — https://developer.apple.com/videos/play/wwdc2019/707/ (~40 min)
  > The canonical session for BGTaskScheduler. Covers BGAppRefreshTask vs BGProcessingTask, scheduling philosophy, and the simulator debugging technique. Watch before Week 4.

### Videos (optional)

- 🎬 **What's new in MetricKit** — WWDC20 — https://developer.apple.com/videos/play/wwdc2020/10081/ (~17 min)
  > Covers scroll hitches, app exit reasons, and the diagnostic interface added in iOS 14. Watch if MetricKit concepts in Week 5 don't click after the docs.

- 🎬 **Eliminate animation hitches with XCTest** — WWDC20 — https://developer.apple.com/videos/play/wwdc2020/10077/ (~20 min)
  > How to write performance tests that catch animation hitches in CI. Useful for adding hitch measurement to the CI pipeline after Week 6.

### Books (optional, paid)

- 📗 **Advanced Swift** by objc.io — https://www.objc.io/books/advanced-swift/
  > If you bought this in Phase 0, the Collections and Performance chapters are directly relevant to the SwiftData fetch optimization work in Week 6.

- 📗 **Thinking in SwiftUI** by objc.io — https://www.objc.io/books/thinking-in-swiftui/
  > Short, focused. The chapter on view identity and the state lifetime section are directly applicable to the dependency issues you'll find in Instruments.

### Free alternatives

- 🔗 **Donny Wals — Background tasks deep dive** — https://www.donnywals.com/
  > Search "background tasks" on his blog. His practical walkthrough of BGTaskScheduler and the simulator debug trick is the clearest free treatment available.

- 🔗 **Swift by Sundell — AVFoundation articles** — https://www.swiftbysundell.com/
  > Search "AVFoundation" for short focused articles on audio recording and playback patterns.

- 🔗 **Apple Developer Forums — AVFoundation tag** — https://developer.apple.com/forums/tags/avfoundation
  > When AVAudioSession interruption handling or routing behavior is wrong in an edge case, the forums are more reliable than Stack Overflow.

### Tools / services

- 🛠️ **Instruments** — bundled with Xcode. Verify your version: `xcodebuild -version`. Use the version that matches your Xcode, not an older standalone install.
- 🛠️ **TestFlight** — https://testflight.apple.com/ — external testers install via this link.
- 🛠️ **App Store Connect** — https://appstoreconnect.apple.com/ — for managing builds, TestFlight groups, and privacy labels.

---

## If you get stuck

1. **AVAudioSession routing issues** (audio playing from earpiece instead of speaker, recording silently failing): re-read the `setCategory(_:options:)` documentation. The `options` parameter is where most routing bugs live.
2. **SFSpeechRecognizer returning empty results**: check `isAvailable` first. Then check whether `requiresOnDeviceRecognition` is causing a silent fallback for your locale. Log the `SFSpeechRecognitionResult` `isFinal` flag — you may be reading partial results.
3. **BGProcessingTask never fires in testing**: use the Xcode console `_simulateLaunchForTaskWithIdentifier` command. It does not fire in the Simulator reliably — test on device only.
4. **Instruments trace is overwhelming**: start with the Time Profiler, narrow the time selection to the interaction you care about (e.g., a single list scroll), and filter the call tree to "Hide System Libraries." That reduces noise by ~80%.
5. **SwiftUI body evaluation storm you can't trace in Instruments**: add `let _ = Self._printChanges()` as the first line of the `body` property in the suspect view. The console will print which dependency changed and triggered the re-evaluation. Remove before shipping.
6. **Apple Developer Forums** — https://developer.apple.com/forums/ — for framework-specific behavior questions.
7. **Ask Claude** — paste the Instruments flamegraph description or the compiler error with full context.

---

## When you're done

1. Murmur is on TestFlight with at least 5 external testers. Build number is incremented after the profiling fixes.
2. `PROFILING.md` is in the repo with before/after numbers for the top three hotspots.
3. CI is green: `xcodebuild test` runs Murmur's tests on every push.
4. You can check every box in the Mastery Gate section.
5. You know Murmur's launch time, hitch rate, and memory ceiling as actual numbers.

Move to Phase 7. Phase 7 adds Vision and CoreML to Murmur: OCR over imported screenshots and embedding-based semantic search across your transcripts. The SFSpeechRecognizer transcripts you built in Phase 6 become the training data for the Phase 7 semantic search index. The performance baseline you established in Phase 6 with Instruments is the ceiling you must not exceed when adding Phase 7's ML inference work.

Phase 7 is where Murmur starts becoming the bridge to the Mnemo capstone.
