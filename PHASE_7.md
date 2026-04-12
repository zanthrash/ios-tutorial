# Phase 7 — Vision, Embeddings, CoreML, On-Device ML

**Duration:** 5 weeks · **Budget:** ~34 hours total · **Pace:** 5–8 hrs/week

## Translating to your own app

The skill in this phase is on-device ML inference — using the device's Neural Engine without a network call, without a server bill, and without user data leaving the phone. Vision handles anything image-shaped: OCR, document segmentation, and image similarity. NaturalLanguage handles anything text-shaped: word and sentence embeddings, similarity ranking, semantic search. CoreML is the substrate both frameworks sit on, and learning to convert and ship a custom model gives you access to the entire HuggingFace ecosystem, not just Apple's bundled models.

These skills are framework-agnostic in the sense that the pattern is always the same: feed input to a request or model, receive a feature vector or structured result, store it efficiently, query it at read time. Any app that handles photos — a recipe vault, a travel journal, a document scanner — can use VNRecognizeTextRequest to extract text or VNGenerateImageFeaturePrintRequest to find visually similar images. Any app that accumulates user-written text — notes, journals, bookmarks, reading lists — can use NLContextualEmbedding to build a semantic search layer on top of existing SwiftData storage. The technique costs nothing to run and works offline. It is not a speciality feature; it is a layer that should be in almost every content app you ship.

## What you'll have at the end

1. Murmur v1.1 on TestFlight — your Phase 6 audio app, extended with two new capabilities:
   - OCR over any screenshot or photo imported by the user, using `VNRecognizeTextRequest`
   - Semantic search across all transcripts and OCR'd images using `NLContextualEmbedding`
2. Embeddings stored as `Data` blobs in SwiftData alongside existing `@Model` objects.
3. A cosine-similarity linear scan that works correctly and is fast enough up to ~10k items.
4. A converted CoreML model (a small sentence-transformer) that you built yourself from Python, shipped in the app bundle, and run on a background actor.
5. A working mental model of the difference between image embeddings and text embeddings, and when each is the right tool.

## What you WILL NOT do in Phase 7

- Build a new app. Murmur is the codebase; you're adding features to it.
- Introduce a vector index (HNSW, FAISS, etc.). Linear scan is correct and fast at this scale. You will return to this question in Phase 8 if needed.
- Use server-side ML APIs (OpenAI embeddings, AWS Rekognition, etc.). Everything runs on device.
- Implement real-time OCR on camera frames. Live text recognition is a different problem; you're processing static imported images.
- Train models from scratch. You're a consumer of pretrained models, not a trainer.
- Touch the LLM layer. That's Phase 8.

---

## Week 1 — Vision: OCR and text extraction

**Goal:** By the end of this week, a user can import a photo or screenshot into Murmur and see the extracted text in a detail view.

**Theme:** `VNRecognizeTextRequest`, the Vision request lifecycle, and integrating a background Vision pipeline into an existing SwiftData app.

### Day 1 — Read the Vision framework overview (1–1.5 hrs)

Read Apple's Vision framework documentation landing page and the `VNRecognizeTextRequest` reference. Pay attention to:
- The request/handler pattern: `VNImageRequestHandler` takes an image; you attach one or more `VNRequest` subclasses; you call `perform(_:)`.
- The two recognition levels: `.fast` and `.accurate`. For imported photos, use `.accurate`.
- `recognitionLanguages`: set this explicitly; don't rely on defaults.
- `VNRecognizedText` and how to extract the `string` from a top-candidate observation.

Watch **"Extract document data using Vision"** (WWDC21) — this is the must-watch for this week.

### Day 2 — Add a `PhotosImporter` service to Murmur (1–1.5 hrs)

Add a new Swift source file `PhotosImporter.swift`. Define an `actor PhotosImporter` with a single entry point:

```swift
actor PhotosImporter {
    func recognizeText(in imageData: Data) async throws -> String
}
```

Actors are the right tool here: Vision's `VNImageRequestHandler` and `perform` are not concurrency-safe from multiple callers, and wrapping the call in an actor serializes it for free. Inside `recognizeText(in:)`:
1. Construct a `VNImageRequestHandler` from the `Data`.
2. Create a `VNRecognizeTextRequest` with `.accurate` recognition level.
3. Call `handler.perform([request])` — this blocks the actor's thread, which is correct.
4. Extract and join the top-candidate strings from `request.results`.
5. Return the concatenated string.

Write a unit test: construct a known image with text (a UIImage drawn with Core Graphics is fine), run `recognizeText(in:)`, and assert the result contains the expected string.

### Day 3 — SwiftData model changes (1 hr)

Add an `ImportedImage` SwiftData model:

```swift
@Model
final class ImportedImage {
    var importedAt: Date
    var imageData: Data
    var extractedText: String
    var embeddingData: Data?   // nil until Week 3
    var sourceFileName: String?
}
```

Add the relationship to your existing models as appropriate (an `ImportedImage` can stand alone or be linked to a memo). Run `swift build` — fix any migration issues SwiftData surfaces (add a `VersionedSchema` if needed; you already know how from Phase 6).

### Day 4–5 — Import UI and end-to-end wiring (2 hrs)

Add a `PhotosPicker` button to Murmur's main navigation. On selection:
1. Load the `Data` from the picked `PhotosPickerItem`.
2. Await `PhotosImporter.recognizeText(in:)` on a background task (`.task` modifier or `Task { ... }` from a button action).
3. Create and insert an `ImportedImage` into the ModelContext with the result.
4. Show a simple detail view with the image and the extracted text.

Handle the error states: image too small, no text found (empty string is valid), Vision failure. Show inline error messages — no alerts.

Run it on your phone. Import a screenshot of anything with readable text. Verify the extraction is accurate.

**Checkpoint:** An imported image shows extracted text in Murmur's UI, persisted across launches.

---

## Week 2 — Vision: image feature prints and similarity

**Goal:** Understand `VNGenerateImageFeaturePrintRequest`, know when it's the right tool vs. OCR, and add image-similarity scaffolding that you'll hook up to the search layer in Week 3.

**Theme:** Image embeddings vs. image classification — the most important distinction in this phase.

### Day 1 — The classification vs. embedding distinction (1 hr)

Read: `VNClassifyImageRequest` outputs label strings with confidence scores — it answers "what is this?" `VNGenerateImageFeaturePrintRequest` outputs a `VNFeaturePrintObservation` — a fixed-length float vector that represents *where this image sits in a semantic space*. You use it to answer "how similar are these two images?" by computing a distance between two feature prints.

These are different tasks. Do not use `VNClassifyImageRequest` when you want to find similar images. Classification labels are not comparable with cosine similarity in any meaningful way.

Watch **"Understanding Images in Vision Framework"** (WWDC19, session 222) — specifically the image similarity section.

### Day 2–3 — Extend `PhotosImporter` with feature prints (1.5 hrs)

Add a second method to your actor:

```swift
func featurePrint(for imageData: Data) async throws -> VNFeaturePrintObservation
```

Add an `imageFeaturePrintData: Data?` field to `ImportedImage`. After OCR on import, also compute the feature print and serialize it:
- `VNFeaturePrintObservation` can be archived with `NSKeyedArchiver`; store the resulting `Data` in `imageFeaturePrintData`.
- Deserialize with `NSKeyedUnarchiver` at query time.
- Provide a `computeDistance` helper: `observation1.computeDistance(to: observation2)` gives a `Float` distance. Lower is more similar.

### Day 4 — Write tests and document thresholds (1 hr)

Write a parameterized test that:
1. Generates feature prints for three images: two similar (same subject, different crop) and one dissimilar.
2. Asserts that the distance between the two similar images is smaller than the distance to the dissimilar one.

Document in a code comment what distance thresholds are reasonable for "similar" vs. "different" (experiment; typically < 0.3 is very similar on the default model). This comment will matter when you build the search UI in Week 3.

### Day 5 — Reflection: when to use what (0.5 hr)

Write a short inline comment block at the top of `PhotosImporter.swift` that records your understanding:
- Use `VNRecognizeTextRequest` when: you want to extract the text from an image (receipts, screenshots, documents).
- Use `VNGenerateImageFeaturePrintRequest` when: you want to find images that look like another image.
- Use `VNClassifyImageRequest` when: you want a human-readable label for "what's in this image" (not relevant to Murmur).
- Use `NLContextualEmbedding` when: you want semantic similarity across *text* content — this is what the search layer in Week 3 will use.

This distinction will come up in the mastery gate.

**Checkpoint:** Each imported image now has both extracted text and an image feature print stored in SwiftData.

---

## Week 3 — NaturalLanguage: NLContextualEmbedding and text embeddings

**Goal:** Generate sentence embeddings for all Murmur transcripts and OCR'd text using `NLContextualEmbedding`, store them in SwiftData, and implement cosine-similarity search.

**Theme:** `NLEmbedding` vs. `NLContextualEmbedding`, the embedding-as-Data storage pattern, and linear cosine scan.

### Day 1 — NLEmbedding vs. NLContextualEmbedding (1 hr)

Read the NaturalLanguage framework documentation for both APIs. The key difference:
- `NLEmbedding` (available since iOS 12) uses a static, smaller word/sentence embedding model. It works but produces lower-quality representations.
- `NLContextualEmbedding` (iOS 17+) uses a transformer-based model (BERT-style), runs on the Neural Engine, and produces significantly better contextual embeddings. Words are embedded in context, not in isolation.

Since Murmur targets iOS 17+ (Phase 6's starting point), use `NLContextualEmbedding` everywhere. Know that `NLEmbedding` exists for contrast and backward compatibility, but do not use it in new code.

Watch **"Explore Natural Language multilingual models"** (WWDC23, session 10042). This session explicitly covers `NLContextualEmbedding` and is required viewing for this week.

### Day 2 — `EmbeddingService` actor (1.5 hrs)

Create `EmbeddingService.swift`:

```swift
actor EmbeddingService {
    private var embedding: NLContextualEmbedding?

    func prepare() async throws {
        let model = NLContextualEmbedding(language: .english)!
        try await model.requestAssets()
        embedding = model
    }

    func embed(_ text: String) async throws -> [Float]
}
```

Inside `embed(_:)`:
1. Guard that `embedding` is non-nil; call `prepare()` if needed.
2. Call `embedding!.embeddingResult(for: text, language: .english)`.
3. Extract the sentence-level vector from the result. The embedding result gives you per-token vectors; average-pool them to get a single sentence vector (simple and effective at this scale).
4. Return `[Float]`.

Serialize a `[Float]` to `Data` with: `Data(bytes: vector, count: vector.count * MemoryLayout<Float>.stride)`. Store this in `embeddingData` on your `ImportedImage` and transcript models.

Note: `NLContextualEmbedding.requestAssets()` triggers a one-time model download (a few hundred MB). Call it once at app launch, guarded by `if NLContextualEmbedding(language: .english)?.hasAvailableAssets == false`. Show a brief "Downloading language model..." indicator — this only happens once.

### Day 3 — Backfill existing transcripts (1 hr)

Add a `BGProcessingTask` (you already have this machinery from Phase 6) that iterates all transcripts and `ImportedImage` records where `embeddingData == nil` and calls `EmbeddingService.embed(_:)`. Cap the batch size at 50 items per task invocation so you don't exceed the background execution window.

### Day 4–5 — Cosine similarity scan and search UI (2 hrs)

Implement the search:

```swift
func cosineSimilarity(_ a: [Float], _ b: [Float]) -> Float {
    let dot = zip(a, b).map(*).reduce(0, +)
    let normA = a.map { $0 * $0 }.reduce(0, +).squareRoot()
    let normB = b.map { $0 * $0 }.reduce(0, +).squareRoot()
    guard normA > 0, normB > 0 else { return 0 }
    return dot / (normA * normB)
}
```

For a search query:
1. Embed the query string with `EmbeddingService.embed(_:)`.
2. Load all items with non-nil `embeddingData` from SwiftData.
3. Deserialize each `Data` blob back to `[Float]`.
4. Compute cosine similarity against the query vector.
5. Return items sorted descending by similarity; take the top 10.

This is an O(n) scan. It is fine up to ~10,000 items; typical Murmur users will have far fewer. Do not introduce an index. The comment in your code should read: *"Linear scan. Acceptable up to ~10k items. Revisit if user library grows beyond that — consider approximate nearest-neighbor (Annoy, HNSW) at that point."*

Wire the search into Murmur's existing search bar. When the query is non-empty and no keyword results are found, fall back to semantic search and show results labeled "Semantic matches."

**Checkpoint:** Typing a phrase like "meeting about the budget" surfaces relevant transcripts even when none of them contain those exact words.

---

## Week 4 — CoreML: model conversion and custom inference

**Goal:** Convert a small sentence-transformer to CoreML using `coremltools`, ship it in the app bundle, and run inference on a background actor using `MLModel` and `MLTensor`.

**Theme:** The full model-to-device pipeline. CoreML model formats, background inference, and when to roll a custom model vs. using NLContextualEmbedding.

### Day 1 — CoreML fundamentals (1 hr)

Watch **"Improve Core ML integration with async prediction"** (WWDC23, session 10049). Then watch **"Tune your Core ML models"** (WWDC21, session 10038). These two together give you the CoreML mental model: how models are packaged (`.mlpackage`), how inference is dispatched to the Neural Engine, and how to use the async prediction API introduced in iOS 17.

Read the `MLModel`, `MLTensor`, and `MLShapedArray` documentation pages. `MLTensor` is the modern API (iOS 18+). `MLMultiArray` is the older spelling; you will encounter it in older samples — know the difference.

### Day 2 — Python environment and model conversion (1.5 hrs)

Install `coremltools` in a Python virtual environment:

```bash
python3 -m venv coreml-env
source coreml-env/bin/activate
pip install coremltools sentence-transformers
```

Convert a small sentence-transformer (`all-MiniLM-L6-v2` is 80 MB and fast):

```python
from sentence_transformers import SentenceTransformer
import coremltools as ct
import torch

model = SentenceTransformer('all-MiniLM-L6-v2')
# Trace and convert — see coremltools docs for NLP model conversion
```

This will take iteration — consult the coremltools documentation at https://apple.github.io/coremltools/ and the GitHub repo at https://github.com/apple/coremltools. You want an `.mlpackage` output with a fixed sequence-length input. Aim for Float16 precision to reduce bundle size.

Validate the output in Python before touching Swift:
```python
import coremltools as ct
mlmodel = ct.models.MLModel('MiniLM.mlpackage')
print(mlmodel.get_spec())
```

Drag the `.mlpackage` into Xcode and confirm it appears in the project navigator and generates a Swift class. Check the generated `MiniLM.swift` to understand its input/output signatures.

### Day 3–4 — Background actor for inference (2 hrs)

Create `MLInferenceService.swift`:

```swift
actor MLInferenceService {
    private lazy var model: MiniLM = {
        let config = MLModelConfiguration()
        config.computeUnits = .cpuAndNeuralEngine
        return try! MiniLM(configuration: config)
    }()

    func embed(_ tokens: MLMultiArray) async throws -> [Float] {
        let prediction = try await model.prediction(input: MiniLMInput(input_ids: tokens))
        // extract sentence_embedding output
    }
}
```

The `actor` keyword serializes model access for free — no locks, no DispatchQueue gymnastics. Mark `MLInferenceService` as `@globalActor` if you want to pin it to a specific executor, or leave it as an unstructured actor (fine for this use case).

Wire a "Use custom model" toggle in Murmur's settings. When on, route embedding calls through `MLInferenceService` instead of `EmbeddingService` (NLContextualEmbedding). Compare the results on a few queries — they will differ slightly because the models are different. Neither is definitively better; this is an exercise in understanding the plumbing, not replacing `NLContextualEmbedding` (which is better integrated and easier to maintain).

### Day 5 — Profile the inference pipeline (0.5 hr)

Open Instruments → Core ML template. Run a search query that triggers inference. Confirm:
- Inference is happening on the Neural Engine, not the CPU (look at the compute device column).
- The main thread is not blocked during inference.
- Memory usage is stable across repeated queries (no accumulating `MLMultiArray` objects).

Fix anything Instruments reveals before moving to Week 5.

**Checkpoint:** Custom CoreML model inference runs on a background actor, results appear in the UI, and Instruments shows no main-thread blocking.

---

## Week 5 — Integration, polish, and TestFlight

**Goal:** Murmur v1.1 ships to TestFlight. The two new features (OCR and semantic search) are polished, accessible, and documented.

### Day 1 — Accessibility audit of new surfaces (1 hr)

The image import flow and semantic search results are new surfaces. Run them through Accessibility Inspector. Checklist:
- `ImportedImage` detail view: extracted text is readable by VoiceOver; image has a meaningful `accessibilityLabel` (use the first line of OCR'd text as the label if no better option).
- Search results: semantic match results are distinguished from keyword results with an `accessibilityHint` or a labeled section header.
- Dynamic Type at AX5: the transcript text view wraps correctly; nothing overflows.
- The "Downloading language model..." indicator has a proper `accessibilityLabel`.

### Day 2 — Error handling and edge cases (1 hr)

Audit every async call in the new code for error propagation:
- What happens if `VNRecognizeTextRequest` returns zero observations? (Show "No text found" in the UI — do not crash or silently drop the record.)
- What happens if `NLContextualEmbedding` assets are unavailable? (Show keyword-only search; surface a non-blocking banner explaining semantic search is unavailable until the model downloads.)
- What happens if the CoreML model fails to load from the bundle? (Disable the "Use custom model" toggle and log the error.)

### Day 3 — Performance: search latency (1 hr)

Profile a search query against a library of 500+ items. Measure time from keypress to results visible. Target: < 200ms.

If the linear scan is slower than expected:
1. Check that `embeddingData` deserialization isn't happening on the main thread.
2. Check that the SwiftData fetch for embeddings uses a `#Predicate` to exclude records with nil `embeddingData`.
3. Consider caching deserialized `[Float]` vectors in memory during the app session (an `actor VectorCache` is the right shape).

Do not introduce an approximate nearest-neighbor index. If the scan is still slow after these optimizations, reduce the embedding dimension of the custom CoreML model, not the algorithm.

### Day 4 — Increment version, write release notes, submit to TestFlight (1 hr)

1. Bump the build number and version to `1.1.0`.
2. Update the privacy manifest: if `NLContextualEmbedding.requestAssets()` triggers a network call (it does, once), confirm it's covered under "App Functionality" in your privacy nutrition labels.
3. Write TestFlight release notes: two bullet points, one per new feature. Be specific: "Import any photo or screenshot — Murmur extracts and indexes the text automatically" and "Search now understands meaning, not just keywords."
4. Archive and upload to App Store Connect. Submit to your existing internal TestFlight group.

### Day 5 — Retrospective and Phase 8 bridge (0.5 hr)

Read the Phase 8 section of `LEARNING_PLAN.md`. Observe that Murmur v1.1 already does what Mnemo (the capstone) needs at a smaller scale: it embeds content, stores vectors, and retrieves by similarity. The capstone adds an LLM synthesis layer on top, a richer data model (multi-app ingestion), and App Intents integration. The hard ML plumbing is already done.

Write a short comment block in `EmbeddingService.swift` noting the bridge: *"Phase 8: replace average-pooled sentence embeddings here with a top-k retrieval step feeding into an on-device LLM synthesis actor."*

---

## Mastery gate — end of Phase 7

Without looking anything up, you should be able to answer or demonstrate all of these:

- [ ] Explain the difference between `VNClassifyImageRequest` and `VNGenerateImageFeaturePrintRequest`. When would you use each? (Classification outputs human-readable labels; feature prints output a similarity-comparable vector. Use feature prints when you want "find similar images", not "label this image".)
- [ ] Explain the difference between `NLEmbedding` and `NLContextualEmbedding`. Why is `NLContextualEmbedding` preferred on iOS 17+? (Transformer-based contextual model vs. static word embedding model; better quality, especially for sentence similarity.)
- [ ] Write an `actor` that wraps a `VNImageRequestHandler` and explain why `actor` is the right concurrency primitive here.
- [ ] Given a `[Float]` embedding stored as `Data`, write the deserialization code from memory.
- [ ] Explain why a linear cosine scan is acceptable at 10k items but not at 1M items. What would you use at 1M? (Approximate nearest-neighbor index — HNSW or Annoy — but only when you measure it hurts.)
- [ ] Take a trained model, convert it to CoreML with `coremltools`, ship it in an `.mlpackage`, load it with `MLModel`, and run inference on a background actor — without copy-pasting from samples.
- [ ] Open Instruments → Core ML template on a running Murmur inference call and identify which compute unit (CPU, GPU, Neural Engine) handled the prediction.
- [ ] Explain the one-time asset download for `NLContextualEmbedding` and how to handle the case where assets aren't available yet.

If you can't check all eight boxes, identify which one is shaky and write a 50-line self-contained Swift playground that exercises just that concept before moving on.

---

## Resources — Phase 7

Ordered by priority. Must-use items are marked.

### Primary references (must-use)

- 📘 **Vision framework documentation** — https://developer.apple.com/documentation/vision
  > Reference for `VNRecognizeTextRequest`, `VNGenerateImageFeaturePrintRequest`, `VNImageRequestHandler`, and `VNFeaturePrintObservation`. Keep this open during Weeks 1–2.

- 📘 **NaturalLanguage framework documentation** — https://developer.apple.com/documentation/naturallanguage
  > Reference for `NLContextualEmbedding`, `NLEmbedding`, and `NLContextualEmbeddingResult`. Week 3.

- 📘 **Core ML framework documentation** — https://developer.apple.com/documentation/coreml
  > Reference for `MLModel`, `MLTensor`, `MLShapedArray`, `MLModelConfiguration`, async prediction. Week 4.

- 📘 **coremltools API Reference** — https://apple.github.io/coremltools/
  > Python-side model conversion docs. The "Converting Models" and "NLP Conversion" sections are required reading for Week 4.

### Videos (must-watch)

- 🎬 **Extract document data using Vision** — WWDC21 — https://developer.apple.com/videos/play/wwdc2021/10041/ (~24 min) — Week 1
- 🎬 **Explore Natural Language multilingual models** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10042/ (~20 min) — Week 3. Explicit coverage of `NLContextualEmbedding`.
- 🎬 **Improve Core ML integration with async prediction** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10049/ (~20 min) — Week 4. The async prediction API and background inference patterns.
- 🎬 **Tune your Core ML models** — WWDC21 — https://developer.apple.com/videos/play/wwdc2021/10038/ (~30 min) — Week 4. ML Package format, `MLShapedArray`, typed execution.

### Videos (optional)

- 🎬 **Understanding Images in Vision Framework** — WWDC19 — https://developer.apple.com/videos/play/wwdc2019/222/ — Image similarity and feature prints, deeper than the docs.
- 🎬 **Advances in Natural Language Framework** — WWDC19 — https://developer.apple.com/videos/play/wwdc2019/232/ — The historical context for `NLEmbedding`; useful for understanding what `NLContextualEmbedding` replaced.
- 🎬 **Explore the machine learning development experience** — WWDC22 — https://developer.apple.com/videos/play/wwdc2022/10017/ — End-to-end CoreML development workflow including coremltools.
- 🎬 **Detect people, faces, and poses using Vision** — WWDC21 — https://developer.apple.com/videos/play/wwdc2021/10040/ — Broader Vision framework context; relevant if you want to understand the full request family.
- 🎬 **What's new in VisionKit** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10048/ — VisionKit (the higher-level live-text UI layer above Vision). Know it exists; you're not using it in Murmur but it's relevant to future apps.

### Books (optional, paid)

- 📗 **Machine Learning by Tutorials** by raywenderlich.com / Kodeco — https://www.kodeco.com/books/machine-learning-by-tutorials — Practical iOS ML with CoreML and Vision. Chapter-by-chapter exercises. Not required but fills in gaps if you want more structured coverage.
- 📗 **Advanced Swift** by objc.io — https://www.objc.io/books/advanced-swift/ — The actor and concurrency chapters are directly relevant to the background inference patterns in Week 4. If you bought this in Phase 0 or 5, re-read the concurrency chapter now.

### Free alternatives

- 🔗 **Swift by Sundell: Using CoreML** — https://www.swiftbysundell.com/ — Search "CoreML" — several short articles covering model loading, async inference, and common pitfalls.
- 🔗 **Donny Wals blog — Swift Concurrency** — https://www.donnywals.com/ — For any actor or structured concurrency questions that come up during the background inference work.
- 🔗 **Apple ML Research: on-device models** — https://machinelearning.apple.com/ — Useful background on what models Apple ships on-device (including the NLContextualEmbedding model family).

### Tools / services

- 🛠️ **coremltools Python package** — https://github.com/apple/coremltools — Install via `pip install coremltools`. Version 8.x is current as of 2025. The `ct.convert()` unified converter handles PyTorch, TensorFlow, and ONNX. Used in Week 4.
- 🛠️ **sentence-transformers Python package** — https://www.sbert.net/ — The source of `all-MiniLM-L6-v2`. Install via `pip install sentence-transformers`. Used in Week 4.
- 🛠️ **Instruments → Core ML template** — Built into Xcode. Required for the Week 4 profiling step. Run on device, not simulator.
- 🛠️ **Xcode Model Performance Report** — Xcode 15+: select your `.mlpackage` in the navigator → "Performance" tab. Shows predicted Neural Engine vs. CPU compute unit assignment before you run the app.
- 🛠️ **Netfox or Charles Proxy** — Verify that `NLContextualEmbedding.requestAssets()` is the only network call during model download, and that no embedding data leaves the device.

---

## If you get stuck

1. **Vision request returns zero results.** Check the image orientation — `VNImageRequestHandler` respects EXIF orientation. Pass the correct `CGImagePropertyOrientation` for the source image. A silently wrong orientation is the #1 source of Vision OCR failures.
2. **`NLContextualEmbedding` returns nil or throws.** The model assets may not have downloaded yet. Call `requestAssets()` and `await` it before calling `embeddingResult(for:)`. Check `hasAvailableAssets` first.
3. **coremltools conversion fails with a tracing error.** PyTorch models must be traced with `torch.jit.trace()` before passing to `ct.convert()`. Make sure you trace with a representative input, not a zero tensor — some models behave differently on all-zero inputs and the trace captures the wrong path.
4. **Actor isolation errors from the compiler.** If you're getting `Sendable` warnings or actor isolation errors around `VNRequest` or `MLModel`, confirm you're not capturing these outside the actor's isolation domain. All Vision and CoreML calls should be initiated from within the actor method, not from a `Task` that crosses into a different isolation context.
5. **Linear scan is slow.** Before reaching for a vector index, profile first. The scan itself on `[Float]` arrays is fast; the bottleneck is almost always SwiftData fetch + Data deserialization. Cache deserialized vectors in an in-memory `actor VectorCache` keyed by persistent model ID.
6. **Apple Developer Forums** — https://developer.apple.com/forums/ — Search for `NLContextualEmbedding` and `VNRecognizeTextRequest`; these are actively discussed with Apple engineers sometimes responding.
7. **Ask Claude** — paste the exact error, the code that produced it, and what you expected. Be specific about iOS version and Xcode version; ML APIs change fast between releases.

---

## When you're done

1. Murmur v1.1 is live on TestFlight and installs cleanly on your device.
2. You can import a screenshot and see accurate OCR'd text within two seconds.
3. A semantic search query surfaces relevant transcripts that don't contain the query words verbatim.
4. You can check every box in the Mastery Gate section.
5. The converted CoreML `.mlpackage` is committed to your repository and builds without errors in CI.

Move to Phase 8. The capstone — Mnemo — is the natural next step: Murmur with embeddings is already doing semantic retrieval at a small scale. Phase 8 adds an on-device LLM synthesis layer, multi-app data ingestion (pulling from your App 1 and App 2 models), and App Intents at scale so Siri can answer natural-language queries over your personal data. The ML infrastructure you built here is the foundation it runs on.
