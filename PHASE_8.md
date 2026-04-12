# Phase 8 — Capstone Alpha: On-Device LLM, App Intents, Spotlight

**Duration:** 5 weeks · **Budget:** ~34 hours total · **Pace:** 5–8 hrs/week

## Translating to your own app

This phase is built around **Mnemo**, which ingests from Shelf (App 1), Anchor (App 2), and Murmur (App 3 with embeddings from Phase 7). If you built different apps, the capstone concept changes but the underlying skill does not. The pattern is: **on-device RAG (retrieval-augmented generation) over personal data**. You have a corpus of the user's own content, you embed it, you retrieve the most relevant chunks in response to a query, you inject those chunks into an LLM prompt, and the LLM synthesizes a grounded answer citing its sources.

What changes per domain is only the ingestion layer. If your Phase 1–3 app is a recipe vault, Mnemo becomes a cooking-memory assistant: *"What did I make last Thanksgiving that used miso?"* If App 3 is a book-highlights tracker instead of a voice memo app, the corpus is your own annotations. The retrieval and LLM inference code is identical regardless. Build the ingestion layer as a protocol so you can swap sources cleanly; the rest of the system is source-agnostic.

---

## What you'll have at the end

1. **Mnemo alpha** — a private semantic memory app running fully on-device. No data leaves the phone, ever.
2. An on-device LLM (Phi-3-mini or Llama-3.2-1B, 4-bit quantized) running via MLX Swift or llama.cpp, streaming tokens into a SwiftUI view with cancellation support.
3. A RAG pipeline: embedding-based top-k retrieval from SwiftData, followed by LLM answer synthesis that cites retrieved source memories by ID.
4. **App Intents** integration: Siri can accept a natural-language Mnemo query and return a synthesized answer.
5. **CoreSpotlight** indexing: system Spotlight search surfaces individual memories.
6. Verified zero network traffic under Charles Proxy or Little Snitch.
7. <3s answer latency and <1GB peak memory on an iPhone 13 (not just your Mac).

## What you WILL NOT do in Phase 8

- Ship to the App Store. This is an internal alpha — TestFlight only, for yourself.
- Use a cloud LLM API. Every inference call runs on-device. If you catch yourself reaching for an OpenAI key, stop.
- Use a 7B+ parameter model. They thermal-throttle on a 3-year-old iPhone. That is a bug report, not a feature.
- Build a custom vector index. The naive linear cosine-similarity scan from Phase 7 is still fine at <10k memories. Optimize only after you have a latency trace proving you need it.
- Add CloudKit sync. That is Phase 9.

---

## Week 1 — Project scaffold, model selection, and first inference

**Theme:** Get a quantized LLM running on your physical iPhone before writing any app UI.

### Day 1 — Create the Mnemo Xcode project (1–1.5 hrs)

1. Create a new iOS App project: `File → New → Project → iOS → App`. Name it `Mnemo`. SwiftUI, Swift, SwiftData.
2. Set up your GitHub repo. Commit the empty shell immediately.
3. Enable Swift 6 strict concurrency in Build Settings: set `SWIFT_STRICT_CONCURRENCY = complete`. Fix any warnings the template generates before adding a single line of your own code.
4. Add a `Sources/MnemoCore` Swift package target inside the project (or as a local package) — this is where inference, retrieval, and ingestion logic will live, separate from the SwiftUI layer.

### Day 2 — Choose your inference library and add it (1–1.5 hrs)

You have two viable options. Pick one, don't agonize:

**Option A — MLX Swift** (recommended if your target is iPhone 15+)
```
// Package.swift dependency
.package(url: "https://github.com/ml-explore/mlx-swift", from: "0.18.0")
```
Add `MLX`, `MLXNN`, and `MLXLMCommon` as dependencies to `MnemoCore`. The `mlx-swift-examples` repo (https://github.com/ml-explore/mlx-swift-examples) has a working `LLMBasic` target — read it before writing your own wrapper.

**Option B — llama.cpp via Swift package** (broader device support, works on iPhone 13)
The repo is at https://github.com/ggml-org/llama.cpp. A Swift package manifest exists in the repo. Add it as a dependency. Note: the Swift bindings are less polished than MLX; expect to write a thin C-interop wrapper.

Whichever you pick, add it today. Resolve the dependency graph. Build successfully on your device (not just the simulator) before writing inference code.

### Day 3 — Download and bundle a quantized model (1 hr)

Safe model choices:
- **Llama-3.2-1B-Instruct** (4-bit GGUF, ~700MB) — https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct
- **Phi-3-mini-4k-instruct** (4-bit quantized, ~2GB) — https://huggingface.co/microsoft/Phi-3-mini-4k-instruct

Start with Llama-3.2-1B. It fits comfortably on an iPhone 13 alongside the app's heap. Phi-3-mini is the stretch goal if you need more reasoning quality and your target device has >3GB headroom.

Do **not** bundle the model file inside the app bundle — it will blow past App Store binary size limits. Instead: download to `Application Support` on first launch, verify the SHA-256 hash before loading, and guard the download behind a "Set up Mnemo" onboarding screen.

### Day 4–5 — Write a bare inference wrapper and stream tokens to the console (2–3 hrs)

Write an `actor LLMEngine` that:
- Loads the model file from disk once, lazily, and holds it in memory.
- Exposes `func stream(prompt: String) -> AsyncStream<String>` — each element is a decoded token string.
- Exposes `func cancel()` — stops generation mid-stream.

Do not touch SwiftUI yet. Write a test that:
1. Instantiates `LLMEngine`.
2. Streams 20 tokens from a fixed prompt.
3. Asserts the output is non-empty and that `cancel()` terminates the stream cleanly.

Run this test on your physical iPhone using `xcodebuild test -destination 'platform=iOS,name=YourPhone'`. Watch your memory and CPU in Xcode's debug gauges. If peak memory exceeds 800MB at this point, switch to the smaller model before going further.

**Checkpoint:** streaming tokens appearing in the Xcode console from an actor, on device, Swift 6 concurrency clean.

---

## Week 2 — Ingestion pipeline and retrieval

**Theme:** Bring Shelf, Anchor, and Murmur data into Mnemo; build top-k retrieval.

### Day 1–2 — Define the Memory schema and ingestion protocol (2–3 hrs)

Define a SwiftData model:

```swift
@Model
final class Memory {
    var id: UUID
    var content: String          // the raw text chunk
    var source: MemorySource     // .shelf, .anchor, .murmur
    var sourceID: String         // original record ID in the source app
    var createdAt: Date
    var embedding: Data          // float32 array, serialized
}

enum MemorySource: String, Codable {
    case shelf, anchor, murmur
}
```

Define a protocol:

```swift
protocol MemoryIngester: Sendable {
    func ingest(into context: ModelContext) async throws
}
```

Implement `ShelfIngester`, `AnchorIngester`, and `MurmurIngester`. Each reads from its respective app's SwiftData store using a shared App Group container (you set this up in Phase 3/4 — if you skipped it, add the App Group entitlement now to all four apps and re-export).

### Day 3 — Embed ingested content (1.5–2 hrs)

Reuse `NLContextualEmbedding` from Phase 7. The ingestion pipeline should:
1. Chunk long content into ≤512-token segments.
2. Embed each chunk.
3. Store the embedding as a `Data` blob in `Memory.embedding`.

Run ingestion in a `ModelActor`-isolated context so it does not block the main actor. Expose a `BGProcessingTask` hook so ingestion can run in the background when the phone is on charge (register the task identifier in `Info.plist` as you did in Phase 6).

### Day 4–5 — Implement top-k retrieval (1.5–2 hrs)

Write a `MemoryRetriever` that:
1. Embeds the user's query using the same `NLContextualEmbedding`.
2. Fetches all `Memory` records from SwiftData.
3. Computes cosine similarity between the query embedding and each stored embedding.
4. Returns the top-k (default k=8) `Memory` objects sorted by score.

```swift
func cosineSimilarity(_ a: [Float], _ b: [Float]) -> Float {
    let dot = zip(a, b).map(*).reduce(0, +)
    let magA = sqrt(a.map { $0 * $0 }.reduce(0, +))
    let magB = sqrt(b.map { $0 * $0 }.reduce(0, +))
    guard magA > 0, magB > 0 else { return 0 }
    return dot / (magA * magB)
}
```

Write a unit test: seed 50 synthetic memories with known embeddings, query for one, assert the top result is correct.

**Checkpoint:** given a text query, you can retrieve the 8 most relevant memories from SwiftData in under 100ms on device.

---

## Week 3 — RAG pipeline and SwiftUI query interface

**Theme:** Wire retrieval into the LLM, build the chat UI, prevent citation hallucination.

### Day 1 — Build the RAG prompt builder (1.5 hrs)

Write a `PromptBuilder` that constructs the LLM's context window:

```swift
struct PromptBuilder {
    func build(query: String, memories: [Memory]) -> String {
        let memoryBlock = memories.enumerated().map { i, m in
            "[SOURCE:\(m.id.uuidString.prefix(8))] \(m.content)"
        }.joined(separator: "\n\n")

        return """
        You are a private memory assistant. Answer the user's question \
        using ONLY the sources below. For each claim, cite the source ID \
        in brackets, e.g. [SOURCE:abc12345]. If the sources do not contain \
        a relevant answer, say so directly. Do not invent information.

        SOURCES:
        \(memoryBlock)

        QUESTION: \(query)

        ANSWER:
        """
    }
}
```

The citation constraint is non-negotiable. The LLM must only cite IDs that were in the injected context. After generation, parse the response and strip any `[SOURCE:X]` reference where X does not match a memory ID from the retrieved set. Hallucinated citations are a correctness bug, not a cosmetic one.

### Day 2 — ChatViewModel with streaming (1.5 hrs)

```swift
@Observable
@MainActor
final class ChatViewModel {
    var query = ""
    var response = ""
    var isGenerating = false
    var citedMemories: [Memory] = []

    private var currentTask: Task<Void, Never>?
    private let engine: LLMEngine
    private let retriever: MemoryRetriever
    private let builder: PromptBuilder

    func submit() {
        guard !query.isEmpty, !isGenerating else { return }
        let q = query
        query = ""
        response = ""
        citedMemories = []
        isGenerating = true

        currentTask = Task {
            let memories = await retriever.topK(query: q)
            let prompt = builder.build(query: q, memories: memories)
            for await token in engine.stream(prompt: prompt) {
                response += token
            }
            citedMemories = parseCitations(from: response, candidates: memories)
            isGenerating = false
        }
    }

    func cancel() {
        currentTask?.cancel()
        engine.cancel()
        isGenerating = false
    }
}
```

### Day 3–4 — SwiftUI query UI (2–3 hrs)

Build a two-panel layout:
- **Top:** a `ScrollView` showing the streamed response. Use `Text(response)` with `.animation(.default, value: response)` — do not reach for a custom typewriter animation; streaming itself provides the effect.
- **Bottom:** a `TextField` + send button + cancel button (visible only while `isGenerating`).
- **Below the response:** a `DisclosureGroup("Sources (\(citedMemories.count))")` listing cited memories with their source app name, a snippet, and a timestamp.

Accessibility: the response text view must have `.accessibilityLabel` set to "Answer: \(response)" so VoiceOver reads the full answer when generation is complete (not token by token — use an `onChange` modifier that fires only when `isGenerating` transitions to `false`). Cited sources must have individual labels.

### Day 5 — End-to-end smoke test (1 hr)

Ask five real questions about your own data. Verify:
- Answers cite real memories that you recognize.
- No `[SOURCE:X]` reference points to a memory not retrieved.
- Cancellation stops streaming within one token interval.
- Memory stays below 900MB throughout (check Xcode memory gauge).

**Checkpoint:** Mnemo answers natural-language questions about your own content, with grounded citations, running entirely on-device.

---

## Week 4 — App Intents and Siri integration

**Theme:** Expose the Mnemo query as an App Intent so Siri can invoke it.

### Day 1–2 — Define the MnemoQueryIntent (2 hrs)

```swift
import AppIntents

struct MnemoQueryIntent: AppIntent {
    static var title: LocalizedStringResource = "Ask Mnemo"
    static var description = IntentDescription(
        "Ask a natural-language question about your personal memories."
    )
    static var openAppWhenRun = false

    @Parameter(title: "Question")
    var question: String

    func perform() async throws -> some ReturnsValue<String> & ProvidesDialog {
        let retriever = MemoryRetriever.shared
        let engine = LLMEngine.shared
        let builder = PromptBuilder()

        let memories = await retriever.topK(query: question)
        let prompt = builder.build(query: question, memories: memories)

        var fullResponse = ""
        for await token in engine.stream(prompt: prompt) {
            fullResponse += token
        }

        let answer = stripHallucinatedCitations(fullResponse, candidates: memories)
        return .result(value: answer, dialog: "\(answer)")
    }
}
```

Register the intent in your app's `AppShortcutsProvider`:

```swift
struct MnemoShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: MnemoQueryIntent(),
            phrases: [
                "Ask Mnemo \(\.$question)",
                "Search my memories for \(\.$question)",
            ],
            shortTitle: "Ask Mnemo",
            systemImageName: "brain"
        )
    }
}
```

### Day 3 — Test the intent end-to-end with Siri (1 hr)

1. Build and run on device.
2. Say: *"Hey Siri, ask Mnemo what I read about Swift concurrency."*
3. Siri should invoke `MnemoQueryIntent`, wait for the response, and read it back.
4. If Siri cannot find the shortcut: Settings → Siri & Search → scroll to Mnemo → confirm shortcuts are enabled.

Note on latency: Siri has a response timeout. If your model takes >8s on-device, Siri will time out before inference completes. If this happens, switch to the 1B model or reduce max tokens. The <3s target from the milestone spec is specifically designed to stay inside Siri's window.

### Day 4 — App Intents parameter refinement (1 hr)

Add a `@Parameter` for result count so the user can ask for more or fewer results. Add a `suggestedValues` provider that returns recent query history (store the last 20 queries in UserDefaults). This makes Siri Suggestions smarter over time.

### Day 5 — Shortcuts app integration (1 hr)

Open the Shortcuts app on your phone. Confirm `MnemoQueryIntent` appears under Mnemo. Build a personal shortcut: "Ask Mnemo" → feeds a prompted text field into the intent → shows the result in a notification. Automate it: trigger via Back Tap (Settings → Accessibility → Touch → Back Tap → Double Tap → your Shortcut).

**Checkpoint:** Siri invokes `MnemoQueryIntent`, gets a grounded answer from the on-device LLM, and reads it back aloud — fully offline (enable Airplane Mode to verify).

---

## Week 5 — CoreSpotlight, network-zero verification, and milestone lock

**Theme:** Index memories in Spotlight, verify privacy guarantees, and hit the milestone spec.

### Day 1–2 — CoreSpotlight indexing (2–3 hrs)

Index each `Memory` in Spotlight when it is ingested:

```swift
import CoreSpotlight

func indexMemory(_ memory: Memory) {
    let attributeSet = CSSearchableItemAttributeSet(contentType: .text)
    attributeSet.title = memory.source.displayName
    attributeSet.contentDescription = String(memory.content.prefix(200))
    attributeSet.keywords = [memory.source.rawValue]
    attributeSet.contentCreationDate = memory.createdAt

    let item = CSSearchableItem(
        uniqueIdentifier: memory.id.uuidString,
        domainIdentifier: "com.yourname.mnemo.memories",
        attributeSet: attributeSet
    )

    CSSearchableIndex.default().indexSearchableItems([item]) { error in
        if let error { print("Spotlight index error:", error) }
    }
}
```

Handle deep-link continuation in your app's `onContinueUserActivity` modifier so tapping a Spotlight result opens the full memory in Mnemo.

De-index a `Memory` when it is deleted: call `CSSearchableIndex.default().deleteSearchableItems(withIdentifiers:)`.

Test: after ingestion, lock your phone, swipe down for Spotlight search, type a word that appears in one of your memories. Mnemo should appear in results within a few seconds of indexing.

### Day 3 — Network-zero verification (1–1.5 hrs)

This is non-negotiable for a privacy-first app.

**With Charles Proxy:**
1. Install Charles on your Mac (https://www.charlesproxy.com).
2. Set your iPhone's Wi-Fi proxy to your Mac's IP on port 8888.
3. Install Charles's SSL certificate on the phone (Charles menu → Help → SSL Proxying → Install Charles Root Certificate on iOS).
4. Launch Mnemo, run five queries, trigger ingestion, tap Spotlight results.
5. Charles should show zero requests originating from Mnemo's process.

**With Little Snitch (Mac only, for testing on Simulator):**
- Useful for verifying the embedding model and LLM runtime don't phone home during initialization.

Document your findings in a one-paragraph comment in your project README — this is your privacy guarantee and should be stated plainly.

### Day 4 — Latency and memory profiling (1.5–2 hrs)

Open Instruments on your physical iPhone 13 (or the oldest device you can access):

1. **Time Profiler:** run a full query cycle (embed query → retrieve → LLM stream → render). Identify the slowest segment. If retrieval dominates, check your embedding deserialization. If LLM dominates, verify you're running on the Neural Engine (check `MLComputeUnits` or the llama.cpp equivalent).
2. **Allocations:** watch peak memory across a 5-query session. Must stay below 1GB.
3. **Hangs:** confirm no main-thread hangs during inference (all inference should be on a background actor).

Record before-and-after numbers if you make any optimization. Gut-feel perf work without numbers does not count.

### Day 5 — Milestone validation (1 hr)

Run through the complete milestone checklist:

- [ ] Put the phone in Airplane Mode.
- [ ] Ask five natural-language questions. All return grounded answers with real citations.
- [ ] Latency for each answer is under 3 seconds on your physical device (not Simulator, not Mac).
- [ ] Peak memory stays under 1GB throughout.
- [ ] Say "Hey Siri, ask Mnemo [question]" — Siri returns a grounded answer offline.
- [ ] Search Spotlight for a word in your memories — Mnemo results appear.
- [ ] Open Charles and confirm zero outbound requests from Mnemo during all of the above.
- [ ] Swift 6 strict concurrency: zero warnings in the build log.
- [ ] CI is green (GitHub Actions running `xcodebuild test`).

If any box is unchecked, fix it before declaring Phase 8 done. This is the alpha gate.

---

## Mastery gate — end of Phase 8

Without looking anything up, you should be able to answer these aloud:

- [ ] What is RAG? Walk through the Mnemo pipeline step by step, from user query to rendered answer.
- [ ] Why must you verify retrieved source IDs before rendering citations? What category of failure does this prevent?
- [ ] What is the difference between `MLX Swift` and `llama.cpp`? Under what device constraints would you pick each?
- [ ] Why does model size matter more on iPhone 13 than on an M-series Mac?
- [ ] What are the three components of an `AppIntent`? How does `AppShortcutsProvider` expose an intent to Siri without the user having to add a Shortcut manually?
- [ ] How does CoreSpotlight handle de-indexing? What happens to stale Spotlight entries if you don't explicitly delete them?
- [ ] How would you verify, with certainty, that your app makes zero network requests?

You should also be able to:

- [ ] Open Mnemo in Airplane Mode and run a complete query cycle with no degradation.
- [ ] Show Charles Proxy with a blank request log while Mnemo runs.
- [ ] Invoke Mnemo via Siri, end to end, offline.

---

## Resources — Phase 8

Ordered by priority. Must-use items are marked.

### Primary references (must-use)

- 📘 **App Intents documentation** — https://developer.apple.com/documentation/appintents
  > Reference for `AppIntent`, `AppShortcutsProvider`, `AppShortcut`, parameter types, and `IntentDescription`. Read the "Accelerating app interactions with App Intents" article before Week 4.

- 📘 **CoreSpotlight documentation** — https://developer.apple.com/documentation/corespotlight
  > Reference for `CSSearchableItem`, `CSSearchableItemAttributeSet`, `CSSearchableIndex`. Read the "Showcase app data in Spotlight" guide (linked from the docs) before Day 1 of Week 5.

- 📘 **MLX Swift — ml-explore/mlx-swift** — https://github.com/ml-explore/mlx-swift
  > The canonical Swift API for MLX. Read the README and the `mlx-swift-examples` companion repo before Week 1 Day 2.

- 📘 **mlx-swift-examples** — https://github.com/ml-explore/mlx-swift-examples
  > Working iOS LLM chat example (`MLXChatExample`). Read `LLMBasic` first — it's the minimal inference loop.

- 📘 **llama.cpp — ggml-org/llama.cpp** — https://github.com/ggml-org/llama.cpp
  > Use if targeting iPhone 13 or older. Read the Swift package section of the README.

- 📘 **Phi-3-mini-4k-instruct model card** — https://huggingface.co/microsoft/Phi-3-mini-4k-instruct
  > Download the 4-bit GGUF variant. Read the chat format section — the prompt template is required for correct output.

- 📘 **Llama-3.2-1B-Instruct model card** — https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct
  > The safer starting choice. Requires accepting Meta's license before download.

### Videos (must-watch)

- 🎬 **Dive into App Intents** — WWDC22 — https://developer.apple.com/videos/play/wwdc2022/10032/ (~36 min)
  > The foundational session. Covers intents, entities, queries, and user interactions. Watch before Week 4.

- 🎬 **Bring your app's core features to users with App Intents** — WWDC24 — https://developer.apple.com/videos/play/wwdc2024/10210/ (~20 min)
  > 2024 update: Controls, Spotlight, Siri, Apple Intelligence integration. Watch alongside WWDC22/10032.

- 🎬 **Bring your machine learning and AI models to Apple silicon** — WWDC24 — https://developer.apple.com/videos/play/wwdc2024/10159/ (~30 min)
  > Model compression (quantization, palettization), stateful models, Transformer optimizations for on-device inference. Watch before Week 1 Day 3.

- 🎬 **Showcase app data in Spotlight** — WWDC21 — https://developer.apple.com/videos/play/wwdc2021/10098/ (~14 min)
  > Short and practical. `CSSearchableItem`, domain identifiers, deep-link continuation. Watch before Week 5 Day 1.

- 🎬 **Improve Core ML integration with async prediction** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10049/ (~20 min)
  > Async prediction API, concurrent inference, memory management. Directly applicable to background inference with `ModelActor`.

### Videos (optional)

- 🎬 **Explore enhancements to App Intents** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10103/ (~30 min)
  > Widget configuration, dynamic options, parameter dependencies, progress reporting. Useful if you want to add a configurable Mnemo widget.

- 🎬 **Design App Intents for system experiences** — WWDC24 — https://developer.apple.com/videos/play/wwdc2024/10176/ (~10 min)
  > Design-side guidance on which app actions should become intents and when to navigate into the app. Quick watch.

- 🎬 **Analyze Heap Memory** — WWDC24 — https://developer.apple.com/videos/play/wwdc2024/10173/ (~30 min)
  > Heap analysis with Instruments, tracking transient and persistent memory growth, leak detection. Directly applicable to Week 5 profiling.

### Books / guides (optional)

- 📗 **Point-Free: Modern SwiftUI** — https://www.pointfree.co/collections/swiftui
  > If your `ChatViewModel` grows complex, the observation and dependency patterns from these episodes help. Not required for the milestone.

- 📗 **Donny Wals blog — App Intents deep dives** — https://www.donnywals.com/
  > Search "App Intents" on the blog. Practical short articles that fill in gaps the WWDC sessions skip.

### Free alternatives

- 🔗 **Swift by Sundell** — https://www.swiftbysundell.com/ — Search for "App Intents" and "concurrency actors" for supplementary articles.
- 🔗 **Apple Developer Forums** — https://developer.apple.com/forums/ — The App Intents and Core ML sub-forums are active. Prefer these over Stack Overflow for framework-specific questions.
- 🔗 **Swift Forums** — https://forums.swift.org/ — For Swift 6 concurrency edge cases you'll encounter when making `LLMEngine` `Sendable`.

### Tools / libraries

- 🛠️ **Charles Proxy** — https://www.charlesproxy.com — HTTP/HTTPS proxy for network verification. Free trial sufficient for Phase 8.
- 🛠️ **Little Snitch** — https://obdev.at/products/littlesnitch/index.html — macOS network monitor. Useful for verifying Simulator builds during development.
- 🛠️ **Instruments** (bundled with Xcode) — Time Profiler, Allocations, and Hangs templates. Open them via Xcode → Product → Profile (Cmd+I).
- 🛠️ **Hugging Face Hub CLI** — `pip install huggingface_hub` then `huggingface-cli download` — faster model downloads than the browser, resumes interrupted downloads.
- 🛠️ **llama.cpp quantization tools** — in the llama.cpp repo (`convert_hf_to_gguf.py`, `llama-quantize`) — if you need to quantize a model yourself rather than downloading a pre-quantized GGUF.

---

## If you get stuck

In rough order of what to try:

1. **Model won't load on device:** check the quantization format matches what your inference library expects (GGUF for llama.cpp, MLX safetensors format for MLX Swift). They are not interchangeable.
2. **Peak memory too high:** switch to the 1B model. Do not try to optimize the 3.8B model onto an iPhone 13 — it is the wrong tool for that constraint.
3. **Siri times out:** reduce `maxTokens` in your generation config. Siri has a hard timeout around 8–10 seconds. Target answers of ≤150 tokens for reliable Siri invocation.
4. **Citations are hallucinated:** re-read your `PromptBuilder`. The system prompt must explicitly say "only cite IDs from the SOURCES block below." Then verify your post-processing strips uncorroborated citations even when the prompt instruction fails.
5. **CoreSpotlight results don't appear:** check your `domainIdentifier` is consistent between indexing and deletion calls. Check that your app has the `com.apple.developer.CoreSpotlight.appsearch` entitlement (added automatically when you use CoreSpotlight APIs in most configurations, but verify in your entitlements file).
6. **App Intents shortcut not visible to Siri:** confirm `AppShortcutsProvider` is registered at app launch via `MnemoShortcuts.updateAppShortcutParameters()`. This call is required any time your shortcut phrases change.
7. **Swift 6 concurrency errors in inference layer:** the `LLMEngine` actor isolates mutation, but token callbacks often cross actor boundaries. Use `nonisolated` on pure helper functions and `@Sendable` closures on Task boundaries. Donny Wals's blog has the clearest treatment of these patterns.
8. **Baseline: Apple Developer Forums** for App Intents and CoreSpotlight questions. Stack Overflow answers on these APIs are mostly outdated.

---

## When you're done

1. Every box in the Mastery Gate section is checked.
2. Charles Proxy shows zero outbound requests from Mnemo during a full session.
3. Siri → Mnemo → grounded answer, end to end, offline.
4. Instruments shows <3s answer latency and <1GB peak memory on your physical device.
5. CI is green on every commit.
6. Push a TestFlight internal build (yourself only at this stage — the UX is still alpha).

Move to Phase 9: **CloudKit + E2EE sync**. Mnemo becomes multi-device. Memories sync across your iPhone and iPad through CloudKit, but CloudKit stores only ciphertext — keys live in the Secure Enclave and iCloud Keychain. The privacy guarantees you verified in Phase 8 extend to the sync layer.

Do not linger here polishing the UI. The on-device LLM and RAG pipeline are working; that is the Phase 8 win. Phase 10 is where Mnemo gets App Store polish.
