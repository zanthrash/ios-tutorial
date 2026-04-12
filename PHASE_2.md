# Phase 2 — Craft: HIG, Accessibility, Motion, Haptics

**Duration:** 4 weeks · **Budget:** ~28 hours total · **Pace:** 5–8 hrs/week

## Translating to your own app

Phase 2 is not Shelf-specific. The skill being taught is craft fluency: the ability to take any screen you've already built and make it feel like it belongs on an iPhone rather than merely running on one. That means internalizing HIG as a reflex (before reaching for a custom component, asking "does iOS already do this?"), adding motion that communicates state rather than decorates it, plumbing haptic feedback at the moments that matter, and treating accessibility as part of the build loop rather than a final checklist.

If you built a film log instead of Shelf, the equivalent milestone is your film detail view — the screen that shows the poster, title, and your notes. Rebuild its navigation transition as a hero transition from the list, fire a haptic when you toggle "watched," and walk through it eyes-closed with VoiceOver. The domain is irrelevant. The discipline is identical.

---

## What you'll have at the end

1. Shelf's detail view rebuilt with a hero matched-geometry transition from the list — a symbol-for-symbol match between the card in the list and the full detail screen.
2. Contextual `SensoryFeedback` haptics wired to meaningful state changes: marking progress, toggling a tag, completing an entry.
3. A custom pull-to-dismiss gesture on the detail sheet, following HIG's interactive dismissal convention.
4. A full accessibility audit: Xcode Accessibility Inspector reports zero issues; VoiceOver walks the app cleanly in a logical reading order; Dynamic Type at AX5 does not break any layout.
5. A short screen recording (60–90 seconds) showing the hero transition, haptic moments, and VoiceOver navigation working together.
6. The instinct — not just the knowledge — that every new screen gets its a11y markup and Dynamic Type check at the time it's built.

---

## What you WILL NOT do in Phase 2

- Re-build Shelf's data model or navigation structure. Those are Phase 1 artifacts. Work on top of the MVP.
- Add networking, sync, or a share extension. That is Phase 3.
- Reach for `UIImpactFeedbackGenerator`. The SwiftUI-native `SensoryFeedback` API covers everything you need on iOS 17+.
- Use `GeometryReader` as a first resort for layout. If you find yourself fighting layout with `GeometryReader`, step back — there is almost always a cleaner path.
- Treat this phase as a reason to rewrite Phase 1 code that works fine. Targeted additions only.
- Watch every WWDC animation video. The required list is short; depth comes from building, not watching.

---

## Week 1 — HIG fluency, SF Symbols, materials, color

**Goal:** Internalize HIG as a lookup reflex. Apply SF Symbols animation, adaptive color, and materials to Shelf's existing screens.

### Day 1 — Read the HIG (1.5 hrs)

Read these sections of the Human Interface Guidelines at https://developer.apple.com/design/human-interface-guidelines/ in order. Do not skim.

1. **Foundations → Design principles** (Aesthetic integrity, Consistency, Direct manipulation, Feedback, Metaphors, User control).
2. **Foundations → Color** — adaptive colors, system color palette, semantic naming.
3. **Foundations → Typography** — Dynamic Type scales, text styles, why you never hardcode a font size.
4. **Foundations → SF Symbols** — symbol rendering modes (monochrome, hierarchical, palette, multicolor), variable value, when NOT to use a symbol.
5. **Foundations → Materials** — vibrancy, `.ultraThinMaterial`, layering semantics.

For each section, pause and ask: does Shelf currently violate any of these? Write down the violations. That list is your Week 1 build queue.

### Day 2 — Fix color and typography in Shelf (1.5–2 hrs)

Audit Shelf for hardcoded colors and fixed font sizes. Replace every `Color(hex:)` or `.font(.system(size: 14))` with semantic equivalents:

- Use `.foreground` / `.secondary` / `.tertiary` label colors from the system palette.
- Replace any custom font-size calls with SwiftUI text styles: `.font(.headline)`, `.font(.body)`, `.font(.caption)`.
- Verify in the simulator: Settings → Accessibility → Display & Text Size → Larger Text. Bump to AX3. Nothing should truncate or overflow that can't scroll.

### Day 3 — SF Symbols: animation and variants (1–1.5 hrs)

- Open the SF Symbols app (install from https://developer.apple.com/sf-symbols/ if not already present). Browse the animations panel for each symbol Shelf uses. Note which animations are contextually appropriate.
- Add `.symbolEffect(.bounce)` on any tap-confirmation symbol (e.g., a bookmark being saved).
- Use `.symbolVariant(.fill)` vs the outline variant to communicate selection state on your tag chips.
- Apply `.symbolEffect(.variableColor.iterative)` to any progress or loading indicator.
- Do not add animation for its own sake. Each effect must correspond to a state change the user performed.

### Day 4 — Materials and Z-depth (1 hr)

- Add a navigation bar or floating header in Shelf that uses `.ultraThinMaterial` as a background — confirm the underlying content scrolls under it correctly and vibrancy reads cleanly on both light and dark mode.
- Switch the app theme in the simulator to dark mode. Every screen should be legible without a single `if colorScheme == .dark` branch — if you have any, replace them with adaptive semantic colors.

### Day 5 — Watch and review (1 hr)

Watch: **"What's new in SwiftUI" (WWDC23, Session 10148)** — focus on the animation and visual effects sections. Note every API you haven't used yet. Do not chase them all — just know they exist.

---

## Week 2 — Motion: transitions, matchedGeometryEffect, PhaseAnimator, KeyframeAnimator

**Goal:** Build the hero transition from Shelf's list into the detail view. Add purposeful micro-animations. Every animation must be justifiable against HIG.

### Day 1 — Read HIG motion guidelines + spring anatomy (1.5 hrs)

1. Read **HIG → Foundations → Motion** in full. The key points: motion is purposeful, interruptible, respectful of Reduce Motion. Memorize: "decorative animation adds noise, not signal."
2. Watch: **"Animate with springs" (WWDC23, Session 10158)** (~25 min). Understand why `.spring(duration:bounce:)` is your default choice and when you'd reach for a custom spring.
3. Watch: **"Explore SwiftUI animation" (WWDC23, Session 10156)** (~30 min). The `Animatable`, `CustomAnimation`, and `Transaction` mental models are foundational — you will reference this session repeatedly.

### Day 2 — matchedGeometryEffect: hero transition (2 hrs)

Build the hero transition between Shelf's list row and detail view.

The pattern:

```swift
@Namespace private var heroNamespace

// In list row:
ShelfCardView(entry: entry)
    .matchedGeometryEffect(id: entry.id, in: heroNamespace)

// In detail view:
DetailHeaderView(entry: entry)
    .matchedGeometryEffect(id: entry.id, in: heroNamespace)
```

Key points:
- The `@Namespace` must be defined at the level that contains both source and destination views (typically the parent list view or a navigation container).
- Match the specific subviews that should animate across (cover image, title), not the entire card.
- Verify the transition is interruptible: tap into a detail and immediately back-swipe. If it hitches, your `matchedGeometryEffect` scope is too broad.

### Day 3 — Reduce Motion: always implement (1 hr)

Every animation you add must have a Reduce Motion fallback. SwiftUI provides the environment value:

```swift
@Environment(\.accessibilityReduceMotion) var reduceMotion
```

The pattern:

```swift
withAnimation(reduceMotion ? .none : .spring(duration: 0.4, bounce: 0.2)) {
    isDetailPresented = true
}
```

Wrap this in a helper extension on `Animation?` so you're not repeating the conditional everywhere. Test by enabling Settings → Accessibility → Motion → Reduce Motion on the simulator. The app must still be fully functional — just without positional animation.

### Day 4 — PhaseAnimator and KeyframeAnimator (1.5–2 hrs)

These are for multi-step or precisely timed animations — not for the hero transition, but for richer micro-interactions.

Add one `PhaseAnimator` to Shelf: a reading-progress indicator that pulses through three phases (idle → in-progress → complete) as the user advances their progress.

```swift
PhaseAnimator([Phase.idle, .active, .complete], trigger: progressValue) { phase in
    ProgressRingView(phase: phase)
} animation: { phase in
    switch phase {
    case .idle: return .easeIn(duration: 0.2)
    case .active: return .spring(duration: 0.5, bounce: 0.3)
    case .complete: return .bouncy
    }
}
```

Add one `KeyframeAnimator` to a secondary element: e.g., a completion checkmark that scales up, overshoots, and settles.

Watch: **"What's new in SF Symbols 6" (WWDC24, Session 10188)** (~20 min) for the new Wiggle, Rotate, and Breathe animation presets — apply one of them to a relevant symbol in Shelf.

### Day 5 — Animation audit (1 hr)

Walk through every screen in Shelf. For each animation:
- Can you state why it exists (what state change it communicates)?
- Does it have a Reduce Motion fallback?
- Is it interruptible?
- Does it complete in under 400ms (most should be under 300ms)?

Remove any animation that fails the first question.

---

## Week 3 — Haptics with SensoryFeedback

**Goal:** Wire contextual haptic feedback to every meaningful state change in Shelf. Not decoration — confirmation.

### Day 1 — SensoryFeedback: the API (1 hr)

`SensoryFeedback` is a SwiftUI-native value type introduced in iOS 17. Do not use `UIImpactFeedbackGenerator` — it requires dropping to UIKit and bypasses SwiftUI's render cycle coordination.

The API:

```swift
.sensoryFeedback(.success, trigger: savedSuccessfully)
.sensoryFeedback(.impact(weight: .medium), trigger: tagToggled)
.sensoryFeedback(.selection, trigger: progressStep)
```

Read the HIG section **Feedback → Haptics**. The key principle: each haptic type maps to a semantic meaning. `.success` is for completions. `.error` is for failures. `.selection` is for incremental changes. `.impact` is for physical metaphors (something landing, snapping into place). Mixing them arbitrarily degrades trust.

### Day 2 — Map haptics to Shelf's state changes (1.5 hrs)

Audit every user action in Shelf that changes state:

| Action | Haptic type | Why |
|---|---|---|
| Save new entry | `.success` | Completion |
| Delete entry | `.warning` | Destructive |
| Toggle tag on/off | `.selection` | Incremental |
| Advance reading progress | `.impact(weight: .light)` | Physical metaphor |
| Mark entry complete | `.success` | Completion |
| Pull-to-dismiss (snap point) | `.impact(weight: .medium)` | Gesture anchor |

Add each one with `sensoryFeedback` on the relevant view. Test on a physical device — the simulator does not produce haptics.

### Day 3 — Custom pull-to-dismiss gesture (2 hrs)

The detail sheet should be dismissible via a downward drag, matching iOS's native sheet behavior. Build this using `DragGesture` and a `@State` offset:

```swift
@State private var dragOffset: CGSize = .zero

var body: some View {
    content
        .offset(y: max(0, dragOffset.height))
        .gesture(
            DragGesture()
                .onChanged { value in
                    if value.translation.height > 0 {
                        dragOffset = value.translation
                    }
                }
                .onEnded { value in
                    if value.translation.height > 120 || value.predictedEndTranslation.height > 200 {
                        withAnimation(.spring(duration: 0.3)) {
                            isPresented = false
                        }
                    } else {
                        withAnimation(.spring(duration: 0.4, bounce: 0.3)) {
                            dragOffset = .zero
                        }
                    }
                }
        )
        .sensoryFeedback(.impact(weight: .medium), trigger: isAtSnapPoint)
}
```

The `.sensoryFeedback` should fire at the snap threshold (when the dismiss will commit), not at dismissal completion. That distinction is what makes it feel physical.

### Day 4 — Test haptics on device (1 hr)

Haptic verification must happen on a physical iPhone. Connect your device, run Shelf, and walk through every action in your haptic map from Day 2. For each:

- Does the haptic fire at the right moment (action committed, not initiated)?
- Is the weight appropriate to the action's significance?
- Does it fire more than once per user action? (It should not.)

Adjust timing and weight as needed.

### Day 5 — Watch and refine (1 hr)

Watch: **"Enhance your UI animations and transitions" (WWDC24, Session 10145)** (~25 min). Focus on the zoom transition and velocity-preserving gesture handoff patterns. Apply any relevant techniques to the pull-to-dismiss gesture you built this week.

---

## Week 4 — Accessibility audit: VoiceOver, Dynamic Type, Reduce Motion, Contrast

**Goal:** Shelf passes a full accessibility audit. VoiceOver navigation is logical. Dynamic Type at AX5 does not break any layout. Accessibility Inspector reports zero issues.

### Day 1 — Accessibility Inspector + first audit pass (1.5 hrs)

Open Xcode → Xcode menu → Open Developer Tool → Accessibility Inspector.

Point it at the simulator running Shelf. Run an automated audit (the wand icon). Fix every issue it reports — do not skip any. Common findings:
- Missing `accessibilityLabel` on icon-only buttons.
- `accessibilityValue` missing on progress indicators (the Inspector cannot describe them without it).
- Interactive elements too small (minimum 44×44 pt touch target).

After the automated audit, switch to the Inspection tab and manually focus on every interactive element. Every button, link, and control must have a label that is useful read in isolation ("Add entry" not "Button") and a role that matches its behavior.

### Day 2 — VoiceOver walkthrough (1.5 hrs)

Enable VoiceOver on your physical device: Settings → Accessibility → VoiceOver → On. (Triple-click the side button to toggle — configure this shortcut before you start.)

Navigate Shelf end-to-end using only swipe-right (next element), swipe-left (previous element), and double-tap (activate). You should be able to:

- Create a new entry without seeing the screen.
- Navigate the list and open a detail view.
- Toggle a tag.
- Advance reading progress.
- Dismiss the detail.

For each screen, fix:
- Elements in the wrong reading order: use `.accessibilityElement(children: .combine)` to group related elements, and `.accessibility(sortPriority:)` to reorder when layout order and reading order differ.
- Missing hints on non-obvious controls: `.accessibilityHint("Double-tap to mark as read")`.
- Dynamic content changes that VoiceOver doesn't announce: use `AccessibilityNotification.Announcement` for important state changes (entry saved, tag added).

### Day 3 — Dynamic Type at AX5 (1.5 hrs)

In the simulator: Settings → Accessibility → Display & Text Size → Larger Text → slide all the way to AX5 (the largest setting).

Walk through every screen. Fix:
- Text that truncates without a disclosure path (use `fixedSize(horizontal: false, vertical: true)` instead of `.lineLimit(1)` where truncation is unacceptable).
- Layouts that break because two side-by-side elements no longer fit: use `.dynamicTypeSize(.accessibility1 ... .accessibility5)` guards and provide a vertical stacking alternative.
- Icon-plus-label combinations that overflow: consider `.labelStyle(.iconOnly)` at large sizes with a full label still available to VoiceOver.
- Do not hardcode any height or width that was "sized for" a specific Dynamic Type size.

### Day 4 — Reduce Motion + Increase Contrast + Voice Control (1 hr)

**Reduce Motion** (Settings → Accessibility → Motion → Reduce Motion): verify every screen still functions. All positional animations should either be disabled or replaced with a cross-fade. No UI should be unreachable.

**Increase Contrast** (Settings → Accessibility → Display & Text Size → Increase Contrast): verify text remains readable. If you used `.secondary` and `.tertiary` semantic colors throughout, this is mostly automatic. Custom colors need explicit audit.

**Voice Control** (Settings → Accessibility → Voice Control): tap "Show Names" overlay. Every interactive element must show a visible, unique label. If two buttons show "Button" in the overlay, they lack accessibility labels — fix them.

### Day 5 — Final audit and recording (1 hr)

Run the Accessibility Inspector automated audit one more time. Zero issues.

Record a 60–90 second screen capture from your physical device demonstrating:
1. The hero transition from the list into a detail view (with and without Reduce Motion enabled).
2. Two haptic moments (save an entry, mark progress).
3. A VoiceOver walkthrough of the detail screen — just 4–6 elements, enough to show logical reading order and accurate labels.

Commit everything. You are done with Phase 2.

---

## Mastery gate — end of Phase 2

Without looking anything up, you can answer and demonstrate each of these:

- [ ] You can explain the difference between `.accessibilityLabel`, `.accessibilityValue`, and `.accessibilityHint` and give a concrete example of when each is required.
- [ ] You can write a `matchedGeometryEffect` hero transition from scratch, including the correct `@Namespace` placement, without a tutorial.
- [ ] You can implement `SensoryFeedback` for three semantically distinct actions in Shelf and justify why each haptic weight was chosen.
- [ ] You can navigate Shelf from the list to a detail view and back using only VoiceOver — no visual reference.
- [ ] `@Environment(\.accessibilityReduceMotion)` is wired to every animation in Shelf. You can demonstrate the app with Reduce Motion on and off; both states are fully functional.
- [ ] Xcode Accessibility Inspector automated audit shows zero issues on every screen.
- [ ] Dynamic Type at AX5: every screen is still legible and usable. No layout is broken.
- [ ] You can describe one HIG motion principle and cite which animation in Shelf was changed or removed because it violated that principle.
- [ ] You can explain why `SensoryFeedback` is preferred over `UIImpactFeedbackGenerator` in SwiftUI-native code.
- [ ] `PhaseAnimator` and `KeyframeAnimator` are both used in Shelf for distinct purposes. You can state what each one does and why each was the right tool.

If you can't hit 9/10 of these, spend a fifth week revisiting the specific weeks above before moving to Phase 3.

---

## Resources — Phase 2

Ordered by priority. Must-use items are marked. Do not consume resources beyond the must-use list unless you are blocked — the milestone is the output, not the viewing.

### Primary references (must-use)

- 📘 **Human Interface Guidelines** — https://developer.apple.com/design/human-interface-guidelines/
  > Read: Foundations → Design Principles, Color, Typography, SF Symbols, Materials, Motion. Read: Inputs → Haptics. This is the authoritative source for every "should I do this?" question.

- 📘 **SF Symbols app** — https://developer.apple.com/sf-symbols/
  > Install SF Symbols 6. Use the animations panel to preview every effect before writing code.

- 📘 **SwiftUI `SensoryFeedback` documentation** — https://developer.apple.com/documentation/swiftui/view/sensoryfeedback(_:trigger:)
  > Read the full API reference and the available feedback type list before writing a single `.sensoryFeedback` call.

- 📘 **Xcode Accessibility Inspector** — Launch from Xcode → Open Developer Tool → Accessibility Inspector. Run the automated audit on every screen before marking a week complete.

### Videos (must-watch in Phase 2)

- 🎬 **Animate with springs** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10158/ (~25 min)
  > The definitive explanation of spring-based animation. Watch in Week 2.

- 🎬 **Explore SwiftUI animation** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10156/ (~30 min)
  > Animatable, Transaction, CustomAnimation. The mental model for everything else.

- 🎬 **Animate symbols in your app** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10258/ (~20 min)
  > The `symbolEffect` API. Watch in Week 1.

- 🎬 **What's new in SF Symbols 6** — WWDC24 — https://developer.apple.com/videos/play/wwdc2024/10188/ (~20 min)
  > Wiggle, Rotate, Breathe, Magic Replace. Watch in Week 2.

- 🎬 **Build accessible apps with SwiftUI and UIKit** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10036/ (~25 min)
  > Accessibility toggle trait, notifications, content shape. Watch in Week 4.

- 🎬 **Catch up on accessibility in SwiftUI** — WWDC24 — https://developer.apple.com/videos/play/wwdc2024/10073/ (~20 min)
  > Current state of SwiftUI a11y. Covers conditional accessibility modifiers. Watch in Week 4.

- 🎬 **Enhance your UI animations and transitions** — WWDC24 — https://developer.apple.com/videos/play/wwdc2024/10145/ (~25 min)
  > Zoom transitions, gesture-driven spring animations. Watch in Week 3.

### Videos (optional)

- 🎬 **What's new in SwiftUI** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10148/
  > Good overview of PhaseAnimator, KeyframeAnimator, and scroll effects introduced in iOS 17.

- 🎬 **Create custom visual effects with SwiftUI** — WWDC24 — https://developer.apple.com/videos/play/wwdc2024/10151/
  > Mesh gradients, TextRenderer, scroll transitions, Metal shaders. Not required for Phase 2 milestone but rewarding if you want to go deeper.

- 🎬 **What's new in SF Symbols 5** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10197/
  > Context for the SF Symbols 6 session; covers the animation taxonomy introduced in iOS 17.

- 🎬 **Create animated symbols** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10257/
  > For creating custom symbols with animation layers. Only relevant if Shelf uses custom symbols.

- 🎬 **Design with SwiftUI** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10115/
  > Apple Maps team on using SwiftUI as a design tool. Reinforces HIG fluency.

### Books (optional, paid)

- 📗 **Thinking in SwiftUI** by objc.io — https://www.objc.io/books/thinking-in-swiftui/ (~$39)
  > The layout and animation chapters are directly relevant to Phase 2. Not required, but the best written treatment of SwiftUI's visual model. If you buy one book for Phase 2, this is it.

### Free alternatives / supplementary reading

- 🔗 **Swift by Sundell** — https://www.swiftbysundell.com/ — Search "matchedGeometryEffect" and "accessibility" for short targeted articles. Quality has been consistent since the site's revival.
- 🔗 **Apple Developer Forums — Accessibility** — https://developer.apple.com/forums/tags/accessibility — When VoiceOver behavior is surprising, this is more reliable than Stack Overflow. Filter by iOS and SwiftUI.
- 🔗 **Hacking with Swift — 100 Days of SwiftUI (Animations section)** — https://www.hackingwithswift.com/100/swiftui — Days 44–46 cover animations and gestures. Free. Good for a second explanation when the WWDC sessions don't click.

### Tools

- 🛠️ **SF Symbols 6 app** — https://developer.apple.com/sf-symbols/ — Required. Use the animations panel every time you pick a symbol.
- 🛠️ **Accessibility Inspector** — Xcode → Open Developer Tool → Accessibility Inspector. Run after every week.
- 🛠️ **Simulator** — Use Accessibility shortcut buttons in Hardware menu: Toggle Increase Contrast, Toggle Reduce Motion. Faster than navigating Settings each time.
- 🛠️ **Physical iPhone** — Haptics only work on device. VoiceOver is much more revealing on device than simulator. Keep it connected or nearby throughout this phase.

---

## If you get stuck

1. **matchedGeometryEffect not animating:** confirm the `@Namespace` instance is shared between both views — passing it via binding or environment if they're in separate view structs. Also confirm both sides use the same `id` value and neither is inside a `ZStack` that remakes identity on transition.
2. **VoiceOver reading order is wrong:** do not try to fix it by reordering views in the layout unless that also improves visual layout. Instead, use `.accessibility(sortPriority:)` or `.accessibilityElement(children: .contain)` to control grouping.
3. **Dynamic Type breaks a layout:** the usual cause is a `HStack` that assumes both children fit side-by-side. Wrap in a `ViewThatFits` with a `VStack` fallback, or use `.dynamicTypeSize(...)` to switch layout strategy at a threshold.
4. **Haptic fires multiple times:** your `trigger` value is changing more than once per user action. Bind to a `Bool` that you explicitly reset, not to a continuously updating value.
5. **Animation hitch during hero transition:** use Instruments → Animation Hitches template to identify frames that miss their deadline. The most common cause is too many views matched with `matchedGeometryEffect` or expensive work in `body` during the transition frame.
6. **Apple Developer Forums** — https://developer.apple.com/forums/ — More reliable than Stack Overflow for SwiftUI-specific a11y and animation questions.
7. **Ask Claude** — Paste the exact view hierarchy, state setup, and error. Phase 2 issues are usually about semantics (which API to use, how to share namespace) rather than syntax.

---

## When you're done

1. Xcode Accessibility Inspector shows zero issues on every screen in Shelf.
2. The screen recording is in your project repo — a concrete, inspectable artifact of Phase 2.
3. You have walked through Shelf eyes-closed using VoiceOver, including creating an entry and marking progress.
4. Every animation has a Reduce Motion fallback. You tested it.
5. Commit everything and push. Tag the commit `phase-2-complete`.

Move to Phase 3. That phase takes Shelf to the App Store: URLSession, deeper SwiftData, a share extension so Shelf appears in the iOS share sheet from Safari, and the full App Store submission process — bundle IDs, privacy manifest, screenshots, and surviving Apple review.
