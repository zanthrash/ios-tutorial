# Phase 0 — Tooling & Swift Fundamentals

**Duration:** 3 weeks · **Budget:** ~20 hours total · **Pace:** 5–8 hrs/week

## What you'll have at the end

1. A fully working Mac development environment (Xcode, CLI tools, simulator, device).
2. A signed "Hello World" SwiftUI app running on your physical iPhone.
3. A real command-line Swift package (`swift-cli`) that you wrote yourself — an inverted-index search engine over `.txt` files — with `swift-testing` tests passing, concurrent ingestion via `TaskGroup`.
4. A working mental model of Swift's type system, optionals, protocols, generics, and Swift Concurrency (`async`/`await`, `Task`, actors, `Sendable`).

## What you WILL NOT do in Phase 0

- Open SwiftUI (beyond the one-time "does my phone work" Hello World).
- Build a GUI app.
- Touch CoreML, Vision, SwiftData, or any domain framework.
- Read SwiftUI-specific tutorials.

That's Phase 1. Stay disciplined — this phase is about the **language** and the **tooling**, nothing else.

---

## Prerequisites checklist

Confirm before starting. If any are missing, resolve them first.

- [ ] Apple Silicon Mac (M1 or later) running current macOS.
- [ ] ~30 GB free disk space (Xcode is large).
- [ ] A recent iPhone (for device testing starting Week 1).
- [ ] A Lightning or USB-C cable for the phone.
- [ ] An Apple ID. (Apple Developer Program enrollment is NOT required until Phase 3 — you can side-load with a free Apple ID in the meantime, but since you already have the paid account, just use that.)
- [ ] A GitHub account (you'll commit everything from Day 1).
- [ ] Homebrew installed (https://brew.sh/). Run `brew --version` to confirm.

---

## Week 1 — Environment setup + first Swift code

Goal: by end of week, a Hello World SwiftUI app runs on your physical iPhone, and you've written your first Swift code in a Swift Package.

### Day 1 — Install the toolchain (1–2 hrs)

1. **Install Xcode.** Open the Mac App Store and install Xcode. This is 8–15 GB and takes a while — kick it off first and let it download while you continue.
2. While Xcode downloads, install CLI helpers via Homebrew:
   ```
   brew install gh git
   ```
3. Once Xcode is installed, launch it once and accept the license. Then, in Terminal:
   ```
   sudo xcode-select --install
   sudo xcodebuild -license accept
   xcode-select -p
   ```
   Confirm `xcode-select -p` prints something like `/Applications/Xcode.app/Contents/Developer`.
4. Install the **SF Symbols app** from https://developer.apple.com/sf-symbols/ — you'll use this constantly starting in Phase 1.
5. Authenticate GitHub CLI:
   ```
   gh auth login
   ```
6. Sign into Xcode with your Apple ID: Xcode menu → Settings → Accounts → "+". Add your Apple Developer account.

### Day 2 — Hello World on simulator AND device (1–2 hrs)

The goal here is to walk through code signing and device provisioning **once**, so it's not mysterious later.

1. In Xcode, `File → New → Project` → iOS tab → **App** template.
2. Product Name: `HelloiOS`. Interface: **SwiftUI**. Language: **Swift**. Uncheck tests (we'll do tests in the CLI project). Click Next, save it anywhere temporary.
3. Run on the Simulator (Cmd+R). You should see the default Xcode template.
4. Connect your iPhone via cable. Unlock it. On the phone, you may need to tap "Trust This Computer."
5. In Xcode's top toolbar, click the destination dropdown (says "iPhone 15 Simulator" or similar) and pick your physical phone.
6. Open the project's root in the Xcode navigator. Click the project → TARGETS → General tab → Signing & Capabilities. Set **Team** to your Apple Developer account. Bundle Identifier can stay at the auto-generated one (change it later if you want — use reverse-DNS format like `com.yourname.HelloiOS`).
7. Hit Cmd+R. The first device build will take longer. If you get a provisioning error, click "Try Again" in Xcode — it will register the device automatically.
8. The app may fail to launch on the phone the first time with a "Untrusted Developer" error. On the phone: Settings → General → VPN & Device Management → tap your developer profile → Trust.
9. Hit Cmd+R again. It runs. **Take a screenshot. Celebrate briefly.**

You now know how to ship code to a physical phone. This de-risks every future phase.

### Day 3 — Initialize the Phase 0 project (1 hr)

1. Create a GitHub repo for your iOS learning:
   ```
   cd ~/work/ios-tutorial
   gh repo create ios-tutorial --private --source=. --remote=origin
   ```
2. Create a Swift Package for the CLI tool:
   ```
   mkdir -p swift-cli && cd swift-cli
   swift package init --type executable --name Indexer
   ```
3. Open it in Xcode:
   ```
   xed .
   ```
   (`xed` is the Xcode CLI opener — much faster than double-clicking the Package.swift.)
4. Build and run:
   ```
   swift run
   ```
   You should see `Hello, world!`. That's the default `main.swift` or `Main.swift` content.
5. Commit.
   ```
   git add . && git commit -m "Phase 0: initialize swift-cli package"
   git push
   ```

### Day 4–7 — Read TSPL chapters 1–5 (3–4 hrs)

Read **The Swift Programming Language** book ("TSPL") — Apple's canonical language reference. It is short, dense, and free:

https://docs.swift.org/swift-book/documentation/the-swift-programming-language/

Read these chapters **in order** this week:

1. **A Swift Tour** — skim quickly; it's a whirlwind overview.
2. **The Basics** — read carefully; pay attention to optionals and their unwrap forms (`if let`, `guard let`, `??`, `!`).
3. **Basic Operators** — skim; most of this is familiar from other languages.
4. **Strings and Characters** — read carefully; Swift's string model is different from JS/Python.
5. **Collection Types** — read carefully; `Array`, `Dictionary`, `Set` all have value semantics, which will surprise you.

As you read, open the "Indexer" package you created and write 3–5 small `main()` experiments — e.g., build a small `[String: [Int]]` dictionary and iterate over it, write a function that takes an optional, try a `guard let` in a function. Delete when you're done — this is scratch work, not the milestone.

**Checkpoint:** by end of Week 1, you should be able to explain, without googling, what `?` and `!` mean on a type, the difference between `let` and `var`, and why `Array` is a value type.

---

## Week 2 — Types, protocols, generics, error handling

Goal: internalize the parts of Swift that feel *most* different from TS/Go/Python — value semantics, protocol-oriented design, generics with constraints, error handling via `throws`.

### Reading — TSPL chapters (3–4 hrs across the week)

Continue from where you left off:

6. **Control Flow** — skim; most is familiar. Pay attention to `switch` pattern matching and `guard`.
7. **Functions** — read carefully; argument labels and default values are non-obvious.
8. **Closures** — read carefully; closure capture semantics matter for the CLI milestone.
9. **Enumerations** — **read very carefully**. Swift enums are the single biggest "aha" moment for most converts from TS/Go. Associated values, raw values, recursive enums — all of it.
10. **Structures and Classes** — read carefully; understand value vs reference types.
11. **Properties** — read; `lazy`, computed properties, property observers.
12. **Methods** — skim.
13. **Inheritance** — skim (you won't use classes much in SwiftUI-era code).
14. **Protocols** — **read very carefully**. This is Swift's primary abstraction mechanism.
15. **Generics** — read carefully; generics with protocol constraints are everywhere.
16. **Error Handling** — read; understand `throws`, `try`, `do`/`catch`, and how it differs from exceptions.

That's a lot — if you run out of time, the MUST-READ chapters are **Enumerations, Structures and Classes, Protocols, Generics, Error Handling**. The others you can skim and return to as reference.

### Build the Indexer MVP (2–4 hrs)

Start building the CLI milestone. By end of Week 2 the **synchronous** version should work:

**Spec:**
- CLI invocation: `swift run Indexer ./path/to/folder "query terms"`
- Reads all `.txt` files in the given folder (non-recursive is fine; recursive is a bonus).
- Tokenizes each file (split on whitespace + punctuation, lowercase).
- Builds an **inverted index**: a `[String: Set<URL>]` mapping each token to the set of files containing it.
- Answers a query: intersect the per-token URL sets, print matching file paths.
- Use structs and protocols appropriately (e.g., a `Tokenizer` protocol, a `Document` struct).

Don't worry about concurrency yet — write the synchronous version first. Use `FileManager` to enumerate the folder, `String(contentsOf:)` to read files.

Commit often: `git commit -m "Phase 0: synchronous Indexer builds and queries"`.

**Checkpoint:** by end of Week 2, `swift run Indexer ./some-folder "swift concurrency"` returns the correct files from a folder of 20+ text documents.

---

## Week 3 — Swift Concurrency, `swift-testing`, and polish

Goal: parallelize the Indexer with `TaskGroup`, cover it with tests using `swift-testing`, and understand `Sendable` + actors well enough to pass the mastery gate.

### Reading — TSPL concurrency + advanced topics (2 hrs)

17. **Concurrency** chapter in TSPL — read twice. `async`, `await`, `Task`, structured concurrency, `async let`, `TaskGroup`. This is *the* mental model for iOS development.
18. **Strict Concurrency in Swift 6** section — read; understand what `Sendable` means and why the compiler complains about data races.
19. Skim **Memory Safety** and **Access Control** chapters.

### Watch — Two WWDC sessions (1.5 hrs)

- **Meet async/await in Swift** (WWDC21, ~31 min) — https://developer.apple.com/videos/play/wwdc2021/10132/
- **Meet Swift Testing** (WWDC24, ~26 min) — https://developer.apple.com/videos/play/wwdc2024/10179/

Do NOT watch every concurrency video yet — that's a rabbit hole. These two are enough for Phase 0.

### Upgrade the Indexer to concurrent ingestion (2–3 hrs)

Modify the Indexer so that file reading and tokenization run **concurrently** across files using a `TaskGroup`. The index build itself needs to serialize access to the shared `[String: Set<URL>]` — do this by wrapping the index in an `actor`:

```
actor InvertedIndex {
    private var storage: [String: Set<URL>] = [:]
    func add(token: String, file: URL) { ... }
    func query(_ terms: [String]) -> Set<URL> { ... }
}
```

Use `withTaskGroup` to spawn one `Task` per file. Each task reads + tokenizes its file and calls `await index.add(...)` for each token.

**Enable Swift 6 strict concurrency mode** in `Package.swift`:

```
.executableTarget(
    name: "Indexer",
    swiftSettings: [.enableExperimentalFeature("StrictConcurrency")]
)
```

Fix every warning the compiler gives you — these are real concurrency bugs. If you can't figure one out, ask Claude or search Donny Wals's blog (see resources below).

### Write tests using `swift-testing` (1–2 hrs)

In your `Package.swift`, add `swift-testing` as a dependency (it's bundled with recent Xcode but the standalone package works too):

```
// Package.swift
dependencies: [
    .package(url: "https://github.com/apple/swift-testing", from: "0.10.0")
],
targets: [
    .testTarget(
        name: "IndexerTests",
        dependencies: [
            "Indexer",
            .product(name: "Testing", package: "swift-testing")
        ]
    )
]
```

Write at least 5 tests:

1. Tokenizer splits a simple sentence correctly.
2. Tokenizer lowercases tokens.
3. Index with one document returns that document for a matching query.
4. Index with multiple documents returns only the intersection for a multi-term query.
5. A **parameterized test** (using `@Test(arguments:)`) that verifies tokenization over a handful of edge cases (empty strings, punctuation, unicode).

Run:

```
swift test
```

All tests should pass. Commit and push.

---

## Mastery gate — end of Phase 0

Without looking anything up, you should be able to answer these aloud:

- [ ] When would you use `struct` vs `class` vs `actor`? Give a concrete example of each.
- [ ] What does `Sendable` mean? Why does the compiler care?
- [ ] Write the signature of a generic function that takes any `Collection` whose elements conform to `Hashable`, and returns a dictionary counting occurrences.
- [ ] What's the difference between `async let` and `TaskGroup`? When would you pick one over the other?
- [ ] What does `if let x = optional` desugar to? What about `guard let`?
- [ ] How do `throws` and `try` differ from exceptions in JS/Python?
- [ ] Demonstrate a race condition that `actor` prevents, using a two-sentence explanation.

If you can't hit 6/7 of these, spend another week re-reading the corresponding TSPL chapters and rewriting small examples. There is no shame in spending 4 weeks on Phase 0; there is real cost in rushing through it.

You should also be able to:

- [ ] Scaffold a new Swift Package from the CLI in under 2 minutes.
- [ ] Run tests via `swift test` with green output.
- [ ] Compile with Swift 6 strict concurrency and zero warnings.
- [ ] Push to GitHub from the command line without needing to look up commands.

---

## Resources — Phase 0

Ordered by priority. You don't need all of them; the **must-use** items are marked.

### Primary references (must-use)

- 📘 **The Swift Programming Language** (TSPL) — free, canonical — https://docs.swift.org/swift-book/
  > Read chapters 1–17 in Weeks 1–3 as prescribed above.

- 📘 **Swift Package Manager documentation** — https://www.swift.org/documentation/package-manager/
  > Reference for `Package.swift` syntax; you won't read this cover-to-cover.

- 📘 **Swift Testing documentation** — https://developer.apple.com/documentation/testing
  > Reference for `@Test`, `@Suite`, `#expect`, parameterized tests.

- 📘 **Apple: Swift Concurrency (Updating an App to Use Strict Concurrency)** — https://developer.apple.com/documentation/swift/updating-an-app-to-use-strict-concurrency
  > Short, practical, focused.

### Videos (must-watch in Phase 0)

- 🎬 **Meet async/await in Swift** — WWDC21 — https://developer.apple.com/videos/play/wwdc2021/10132/ (~31 min)
- 🎬 **Meet Swift Testing** — WWDC24 — https://developer.apple.com/videos/play/wwdc2024/10179/ (~26 min)

### Videos (optional, helpful if you have time)

- 🎬 **Explore structured concurrency in Swift** — WWDC21 — https://developer.apple.com/videos/play/wwdc2021/10134/
- 🎬 **Protect mutable state with Swift actors** — WWDC21 — https://developer.apple.com/videos/play/wwdc2021/10133/
- 🎬 **Migrate your app to Swift 6** — WWDC24 — https://developer.apple.com/videos/play/wwdc2024/10169/
- 🎬 **Go further with Swift Testing** — WWDC24 — https://developer.apple.com/videos/play/wwdc2024/10195/

All WWDC video URLs follow the pattern `developer.apple.com/videos/play/wwdc{YEAR}/{ID}/`. The full catalog is browsable at https://developer.apple.com/videos/ — search by title if a link ever breaks.

### Books (optional, paid)

- 📗 **Advanced Swift** by objc.io — https://www.objc.io/books/advanced-swift/ (~$49 ebook, ~$59 print)
  > Read chapters 1–5 in Phase 0 if you buy it; the remainder is for Phase 5. The most careful treatment of Swift's type system and collections you can buy. **Highly recommended but not required for Phase 0.**

- 📗 **Practical Swift Concurrency** by Donny Wals — https://donnywals.com/books/practical-swift-concurrency/ (~$40)
  > Short, correct, practical. You'll want this by Phase 3 at the latest; optional for Phase 0 but useful if TSPL's concurrency chapter doesn't click.

### Free alternatives / supplementary reading

- 🔗 **Hacking with Swift — Swift language reference (free)** — https://www.hackingwithswift.com/read/0/overview — Paul Hudson's free side. Good for alternative explanations when TSPL doesn't click.
- 🔗 **Swift by Sundell** — https://www.swiftbysundell.com/ — John Sundell's blog. Excellent short articles on specific language features. Search for specific topics when you get stuck.
- 🔗 **Donny Wals blog** — https://www.donnywals.com/ — Especially strong on concurrency and `Sendable`.

### Tools (install in Week 1)

- 🛠️ **Xcode** — Mac App Store (free).
- 🛠️ **Homebrew** — https://brew.sh/
- 🛠️ **gh CLI** — https://cli.github.com/ (install via `brew install gh`).
- 🛠️ **SF Symbols app** — https://developer.apple.com/sf-symbols/
- 🛠️ **Apple Developer portal** — https://developer.apple.com/account/ (confirm your paid membership is active).

### Apple Developer & App Store references (bookmark for later)

You won't need these in Phase 0 but bookmark them now:

- 🔗 App Store Connect — https://appstoreconnect.apple.com/
- 🔗 Apple Developer Downloads — https://developer.apple.com/download/
- 🔗 Human Interface Guidelines — https://developer.apple.com/design/human-interface-guidelines/ (Phase 2 reading)
- 🔗 Apple Developer Forums — https://developer.apple.com/forums/
- 🔗 Swift Forums — https://forums.swift.org/

---

## If you get stuck

In rough order of what to try:

1. **Re-read the TSPL chapter** for the concept you're stuck on. It's usually there.
2. **Write a smaller experiment** — reduce the problem to 10 lines in `main.swift` that reproduces the issue.
3. **Read the compiler error slowly.** Swift's errors are verbose but usually accurate.
4. **Swift by Sundell search** — https://www.swiftbysundell.com/ — tends to have a short article on most language-level questions.
5. **Apple Developer Forums** — https://developer.apple.com/forums/ — better signal than Stack Overflow for iOS.
6. **Swift Forums** for language-level questions — https://forums.swift.org/
7. **Ask Claude** — describe what you tried, paste the error, say what you expected.

Avoid **Stack Overflow as a primary source** for iOS — a lot of answers are UIKit-era or Swift 3 and will actively mislead you. Only trust answers dated 2023+ and prefer Apple official docs when both exist.

---

## When you're done

1. Your `swift-cli/Indexer` package builds and tests green under Swift 6 strict concurrency.
2. You've pushed everything to GitHub.
3. You can check every box in the Mastery Gate section.
4. Move to Phase 1. Don't linger here for polish — the Indexer is a throwaway exercise, not a product.

Phase 1 is where SwiftUI and your first real app begin.
