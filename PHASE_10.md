# Phase 10 — Launch: App Store Polish, Analytics, Crash Loop

**Duration:** 4 weeks · **Budget:** ~26 hours total · **Pace:** 5–8 hrs/week

## Translating to your own app

The work in this phase has almost nothing to do with Mnemo specifically. The mechanics — external TestFlight, crash monitoring, store asset production, submission, review, and point-release cycles — are the same for any iOS app. Whether you're shipping a privacy-focused AI memory tool or a barcode scanner, the path is identical: recruit real testers, watch the crash dashboard, fix what breaks, then repeat the loop.

What this phase actually teaches is the production mindset: shipping is not a moment, it's a posture. The polished version of any app is the result of at least three full "dogfood → feedback → fix → re-ship" cycles with people who didn't write the code. That rhythm — not any particular framework — is the skill that carries forward.

## What you'll have at the end

1. Mnemo v1.0 live on the App Store with a real listing, real screenshots, and an App Preview video.
2. Crash monitoring via Sentry with a crash-free rate >99.5% at launch, with a live dashboard you can share.
3. Privacy-respecting analytics via TelemetryDeck reporting aggregate usage signals — no PII, GDPR-compliant.
4. A public single-page marketing site (GitHub Pages) with a support URL and privacy policy.
5. Three full beta cycles completed with ≥50 external testers, with documented feedback and response.
6. Three point-releases shipped post-launch in response to real user reviews.
7. The entire curriculum complete: Shelf on the App Store, Anchor on TestFlight, Murmur on TestFlight, Mnemo on the App Store.

## What you WILL NOT do in Phase 10

- Build new features. If you're tempted to add a feature, file it as a v1.1 issue and keep moving.
- Integrate Firebase Analytics, Amplitude, or any analytics SDK that contradicts Mnemo's privacy story.
- Wait for a "perfect" build before starting external testing. Imperfect builds with real testers beat perfect builds with zero testers.
- Skip the five ADA-winner post-mortems. This is required before you submit, not optional reading.
- Use UIKit from scratch for any store asset work — Simulator screenshots and `xcodebuild` are sufficient.

---

## Week 1 — External testing + crash monitoring setup

Goal: by end of week, Mnemo is in external TestFlight with ≥50 testers invited and Sentry is reporting live crash data from your Mnemo beta from Phase 9, now syncing across devices with E2EE.

### Day 1 — Integrate Sentry (1.5–2 hrs)

Sentry gives richer stack traces, faster reporting, and better filtering than Apple's native crash reports. Use it.

1. Add the Sentry SDK via Swift Package Manager:
   - In Xcode: File → Add Package Dependencies
   - URL: `https://github.com/getsentry/sentry-cocoa`
   - Version: current stable release

2. Initialize in your `App` init or `AppDelegate`, **before any other setup**:
   ```swift
   import Sentry

   SentrySDK.start { options in
       options.dsn = "YOUR_DSN_HERE"
       options.environment = isDebug ? "debug" : "production"
       // Privacy: Mnemo handles personal data — disable PII collection entirely
       options.sendDefaultPii = false
       options.attachScreenshot = false
       options.attachViewHierarchy = false
       // Perf tracing — sample lightly in production
       options.tracesSampleRate = 0.1
       options.profilesSampleRate = 0.05
   }
   ```

3. **Privacy review**: `sendDefaultPii = false` suppresses device identifiers, usernames, and IP addresses. Verify in the Sentry dashboard that incoming events contain no user-identifiable fields. Since Mnemo is a privacy-sensitive app, this configuration is non-negotiable — document it in your threat model README from Phase 9.

4. Add a deliberate test crash to verify the pipeline, confirm it shows in Sentry, then remove it. Commit.

5. Reference: https://docs.sentry.io/platforms/apple/guides/ios/

### Day 2 — Integrate TelemetryDeck (1–1.5 hrs)

TelemetryDeck is GDPR-compliant, collects no PII, and is designed for privacy-first apps. Do not use Firebase Analytics or Amplitude — their data collection model conflicts with Mnemo's positioning.

1. Add via SPM: `https://github.com/TelemetryDeck/SwiftSDK`

2. Initialize:
   ```swift
   import TelemetryDeck

   TelemetryDeck.initialize(config: .init(appID: "YOUR_APP_ID"))
   ```

3. Instrument three or four aggregate signals only — no user-level identifiers:
   - App launched
   - Query submitted (not the query text)
   - Memory ingested (not the content)
   - Onboarding completed

4. Reference: https://telemetrydeck.com/docs/

### Day 3 — External TestFlight setup (1–1.5 hrs)

1. In App Store Connect → TestFlight → External Groups, create a "Beta Testers" group.
2. Add the current build. Write a focused beta release note — one paragraph, plain language: what you want testers to test, what you already know is broken.
3. Submit for Beta App Review. This usually takes 1–2 business days on first submission.
4. While it's in review, prepare your tester list:
   - Personal network: 10–15 people who will actually use a semantic memory app
   - Public beta: post to any relevant communities (iOS developer Slack, privacy-tech forums, your social channels)
   - Target: ≥50 accepted invitations before Week 3 starts
5. TestFlight reference: https://developer.apple.com/testflight/

### Day 4–5 — First dogfood cycle (1–2 hrs)

Use the TestFlight build yourself as your primary device build this week. Do not make code changes. File every friction point as a GitHub issue tagged `beta-1`. Prioritize by user impact, not by what interests you most technically.

---

## Week 2 — Store presence: screenshots, preview video, keywords, localization

Goal: by end of week, all required App Store assets are complete and uploaded to App Store Connect. This week has no code commits — it is production work.

### Day 1 — Screenshots (2 hrs)

Apple requires screenshots for the largest supported device sizes. You need:
- 6.9" (iPhone 16 Pro Max Simulator)
- 6.5" (iPhone 14 Plus or 15 Plus Simulator)
- 5.5" (iPhone 8 Plus Simulator, if you support iOS 16)
- 12.9" iPad Pro (if you support iPad)

Workflow:
1. Launch the Simulator for each required size.
2. Set the Simulator appearance to match your intended screenshots (Light mode for some, Dark mode for others — plan a consistent set).
3. Stage the app with representative real data. Screenshots with placeholder text fail review and communicate nothing to users.
4. Take screenshots: in Simulator, Cmd+S saves to Desktop.
5. For automation on future releases, evaluate fastlane `snapshot`: https://docs.fastlane.tools/ — not required for v1.0, but worth knowing.

Aim for 5–8 screenshots per device. Each should show a distinct part of the app with a short caption overlay. Do not use marketing copy that makes claims you can't demonstrate in the screenshot.

### Day 2 — App Preview video (1.5–2 hrs)

The App Preview is 15–30 seconds of actual app functionality, not a marketing montage.

1. Capture from Simulator: open QuickTime Player → New Movie Recording → change source to the Simulator. Record the most compelling user flow: open app → type a natural-language question → watch the retrieval and answer stream in.
2. Alternatively, capture from device via `xcrun simctl io booted recordVideo preview.mov`.
3. Export at Simulator's native resolution. No letterboxing.
4. The video must start with the app already open (not the home screen). It must not contain the Lock Screen, Home Screen, or other apps.
5. Upload in App Store Connect → App Store → App Previews and Screenshots.

### Day 3 — Keywords, description, metadata (1.5 hrs)

Keywords:
- 100-character limit, comma-separated, no spaces after commas.
- No brand names (including "iPhone"), no words already in your app name or subtitle.
- Think from the user's search query, not your feature list: "private AI memory", "on-device search", "offline journal", "encrypted notes".
- Research competing apps in the App Store search bar before writing your list.

App description:
- First three lines are shown without "more" — make them count.
- Lead with what the app does and why it's different (on-device, private), not with features.
- Keep total length under 400 words. Reviewers and users alike skim.

Subtitle (30 characters): sharp, noun-phrase description. "Private memory, on your device."

### Day 4 — Privacy labels + localization basics (1 hr)

Privacy labels:
- In App Store Connect → App Privacy, declare every data type your app collects.
- Mnemo: if Sentry is configured with `sendDefaultPii = false` and TelemetryDeck is your analytics, your honest declaration is minimal — crash data (not linked to identity), aggregate analytics (not linked to identity).
- Review the App Store Review Guidelines before submitting: https://developer.apple.com/app-store/review/guidelines/
- A mismatch between your declared privacy labels and your actual SDK behavior is a common rejection reason. Audit your Podfile/SPM dependencies.

Localization:
- For v1.0, one locale is sufficient. Submit in English.
- Future versions: add locales based on where installs actually come from post-launch. Don't localize upfront based on guesses.

### Day 5 — ADA post-mortem research (1–1.5 hrs)

Before you submit anything, read at least five Apple Design Award winner post-mortems or developer stories. Hold your submission to that standard.

Apple Design Awards: https://developer.apple.com/design/awards/

Search for developer interviews, conference talks, or blog posts from ADA winners about their submission process, what reviewers noticed, and what they would do differently. The goal is to internalize what "craft" looks like to the people making the decision.

---

## Week 3 — Beta cycles + polish loop

Goal: complete beta cycles 2 and 3, resolve the top user-reported issues, hit crash-free rate >99.5% before submitting to the App Store.

### The polish loop — run this every day this week

1. Open TestFlight feedback: App Store Connect → TestFlight → [your group] → Feedback. Read every screenshot and comment.
2. Open Sentry: review new crashes since last build. For each, determine: is this a code path only certain users hit? Does it correlate with a specific iOS version or device?
3. File issues. Tag them `beta-2` or `beta-3`. Prioritize by: (a) crash, (b) data loss, (c) user-facing error, (d) friction, (e) missing polish. Do not fix category (e) while category (a) issues are open.
4. Fix, build, archive in Xcode, upload to App Store Connect, submit the new build for TestFlight.
5. Write a targeted beta release note for each new build — testers who reported a bug should know it's fixed.

### Beta cycle 2 (Days 1–3)

Focus: address the issues filed in beta-1. Tighten the onboarding flow based on where testers dropped off. Re-run your Sentry crash dashboard — your target before Week 4 is zero crashes per 1,000 sessions.

Archive and upload beta 2 build. Notify testers.

### Beta cycle 3 (Days 4–5)

Focus: polish loop only. No new features. No architectural changes. If beta 2 is clean, this cycle is about the details: loading states, empty states, error messages, VoiceOver, Dynamic Type at AX5. Run Xcode Accessibility Inspector one more time.

Archive and upload beta 3 build. Notify testers.

**Checkpoint:** by end of Week 3, you have ≥50 external testers who have installed at least one beta, crash-free rate from Sentry is >99.5%, and your App Store Connect listing is fully complete with all assets uploaded.

---

## Week 4 — Submission, review, launch, point releases

Goal: submit Mnemo for App Store review. Respond to review feedback quickly. Launch. Ship three point-releases post-launch.

### Day 1 — Final pre-submission checklist (1 hr)

Before hitting Submit:
- [ ] All required screenshots uploaded for all required device sizes.
- [ ] App Preview video uploaded and accepted.
- [ ] App description, subtitle, and keywords filled in.
- [ ] Privacy labels match your actual SDK usage — verify in Instruments Network profiler that no unexpected hosts are contacted.
- [ ] Support URL live and resolving (a GitHub Pages page is fine).
- [ ] Privacy policy URL live and resolving.
- [ ] Age rating set correctly.
- [ ] Price and availability configured (free, freemium, or paid with StoreKit 2 — see below).
- [ ] Build is using the App Store provisioning profile, not development or Ad Hoc.
- [ ] Sentry DSN is the production project, not a test project.

### Day 2 — Submit for review (30 min)

In App Store Connect → App Store → [your version] → Submit for Review. Answer the export compliance questions honestly (Mnemo uses encryption — answer "yes" to the encryption question; your CryptoKit/CloudKit usage qualifies as standard encryption and is exempt from export requirements under EAR, but you must still declare it).

Apple review typically takes 1–3 business days. During review:
- Do not make new submissions — they'll be queued and may delay the current review.
- Monitor your developer email for any metadata rejection or binary rejection notice.

If you receive a rejection, read the rejection notice fully. Most first-submission rejections are metadata issues (privacy label mismatch, missing support URL, app description claim that can't be demonstrated), not binary issues. Respond in the Resolution Center, fix only the stated issue, and resubmit.

### Days 3–4 — Launch day operations (1–1.5 hrs)

When the app is approved:
1. Set the release to Manual Release (you chose this at submission time, not automatic). Review the listing one more time before releasing.
2. Release. The listing goes live within minutes.
3. Announce via whatever channels you have — the GitHub Pages marketing site is sufficient. A single social post is sufficient.
4. Monitor Sentry for the first 24 hours. Post-launch traffic is different from beta traffic — expect different code paths to be exercised.
5. Monitor App Store Connect → Reviews. Respond to every review in the first week, even one-liners — it signals to prospective users that the developer is present.

### Day 5 and ongoing — Point releases (1 hr each)

The mastery gate requires three point-releases shipped in response to user feedback. Do not plan these in advance — file them from actual reviews and Sentry data.

Point-release workflow:
1. Identify the highest-impact issue from reviews/Sentry since last release.
2. Fix only that issue. Resist the urge to bundle multiple fixes.
3. Archive, upload, submit. Point releases typically review faster than v1.0.
4. Write release notes that reference the specific user complaint: "Fixed a crash on launch when iCloud sync was disabled" is better than "Bug fixes and performance improvements."

### If you're monetizing: StoreKit 2 (optional)

If Mnemo has a paid tier or subscription, implement in Week 4 pre-submission:

```swift
// Fetch products
let products = try await Product.products(for: ["com.yourname.mnemo.pro"])

// Check current entitlement
let entitlement = await Transaction.currentEntitlement(for: "com.yourname.mnemo.pro")

// Purchase
let result = try await product.purchase()
```

- Use `StoreView` or `SubscriptionStoreView` from StoreKit for SwiftUI if you want the system-standard paywall UI.
- Test thoroughly in Xcode's StoreKit testing environment before submitting — sandbox purchases do not charge real money.
- For a privacy app, consider whether a one-time purchase is more aligned with the value proposition than a subscription. Recurring revenue is tempting; a privacy-sensitive user base often distrusts subscription pricing.

Reference: **Meet StoreKit 2** — WWDC21 — https://developer.apple.com/videos/play/wwdc2021/10114/

---

## Mastery gate — end of Phase 10 (and the whole curriculum)

This is the final gate. It covers both Phase 10 and a retrospective on the full curriculum.

**Phase 10 specifics:**

- [ ] Mnemo v1.0 is live on the App Store — you can share the URL.
- [ ] Sentry crash dashboard shows crash-free rate >99.5% over the last 1,000 sessions.
- [ ] ≥50 external testers completed at least one beta cycle (check App Store Connect tester install count).
- [ ] Three beta cycles completed with distinct release notes for each.
- [ ] TelemetryDeck is reporting aggregate signals — no PII, confirmed via the TelemetryDeck dashboard.
- [ ] Marketing site is live (GitHub Pages, single page, support URL, privacy policy).
- [ ] Three point-releases shipped post-launch, each in direct response to a user review or Sentry crash.
- [ ] You have read ≥5 ADA-winner post-mortems or developer stories before submitting.

**Full curriculum retrospective:**

- [ ] Shelf (App 1) is live on the App Store.
- [ ] Anchor (App 2) is on TestFlight with widget and Shortcut.
- [ ] Murmur (App 3) is on TestFlight with profiled performance numbers.
- [ ] Mnemo (capstone) is live on the App Store.
- [ ] Crash-free rate >99.5% across all shipped apps.
- [ ] Three point-releases shipped to Mnemo in response to user feedback.
- [ ] You can point any iOS engineer at your three apps and be proud of the craft.

---

## Resources — Phase 10

Ordered by priority. Must-use items marked.

### Primary references (must-use)

- 📘 **Sentry Apple SDK documentation** — https://docs.sentry.io/platforms/apple/guides/ios/
  > Setup, configuration options, privacy settings, and filtering. Read the iOS guide, not the generic Apple guide.

- 📘 **TelemetryDeck Quick Start** — https://telemetrydeck.com/docs/
  > SPM integration, signal naming conventions, privacy model.

- 📘 **App Store Review Guidelines** — https://developer.apple.com/app-store/review/guidelines/
  > Read sections 1 (Safety), 2 (Performance), 4 (Design), and 5 (Legal) in full before submitting. Section 5.1 (Privacy) is the most common source of first-submission rejections.

- 📘 **TestFlight reference** — https://developer.apple.com/testflight/
  > External testing limits, feedback collection, beta review requirements.

- 📘 **Apple Design Awards** — https://developer.apple.com/design/awards/
  > Browse winners by year; find developer post-mortems and talks for the five you read this phase.

### Videos (must-watch)

- 🎬 **Meet StoreKit 2** — WWDC21 — https://developer.apple.com/videos/play/wwdc2021/10114/ (~22 min)
  > The foundational StoreKit 2 overview. Watch before writing any purchase code, even if you've seen StoreKit before.

- 🎬 **Meet StoreKit for SwiftUI** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10013/ (~22 min)
  > `StoreView`, `ProductView`, `SubscriptionStoreView` — the SwiftUI-native paywall APIs. Watch if you're adding a paid tier.

### Videos (optional)

- 🎬 **What's new in StoreKit testing** — WWDC22 — https://developer.apple.com/videos/play/wwdc2022/10039/ (~26 min)
  > StoreKit testing in Xcode, sandbox improvements. Useful if your in-app purchase flows are non-trivial.

### Books / guides (optional)

- 📗 **fastlane documentation** — https://docs.fastlane.tools/
  > `snapshot` for automated screenshots, `deliver` for App Store metadata management. Not required for v1.0, but worth learning before your second app release.

- 📗 **App Store Connect User Guide** — https://appstoreconnect.apple.com/
  > App Store Connect's own interface is the reference — explore the TestFlight and App Analytics tabs directly.

### Free alternatives

- 🔗 **Hacking with Swift — TestFlight guide** — https://www.hackingwithswift.com/articles/230/how-to-distribute-an-ios-app-over-the-internet
  > Step-by-step walkthrough for anyone who hasn't been through an App Store submission before.

- 🔗 **Swift by Sundell — App Store tips** — https://www.swiftbysundell.com/
  > Search "App Store" — several practical articles on submission, metadata, and review.

### Tools / services

- 🛠️ **Sentry** — https://sentry.io/ — Free tier covers early-stage apps. Create a separate project for Mnemo production vs beta.
- 🛠️ **TelemetryDeck** — https://telemetrydeck.com — Free tier for early-stage apps; privacy-first by design.
- 🛠️ **fastlane** — https://docs.fastlane.tools/ — `snapshot` automates Simulator screenshots across device sizes. Install via `brew install fastlane`.
- 🛠️ **App Store Connect** — https://appstoreconnect.apple.com/ — Where all metadata, builds, TestFlight management, and sales data live.
- 🛠️ **GitHub Pages** — https://pages.github.com/ — One-page marketing site and privacy policy host. Adequate for v1.0.

---

## If you get stuck

1. **Review rejection**: read the full rejection message in App Store Connect → Resolution Center. Apple usually names the specific guideline section. Fix only what's called out.
2. **Sentry crash you can't reproduce**: filter by device + OS version in the Sentry issue detail. Crashes that only appear on specific hardware (e.g., older devices with less RAM) often trace to memory pressure in the on-device LLM. Lower the quantized model size or add a RAM check.
3. **TestFlight external review stuck**: external beta review is a real review — it can reject for the same reasons as App Store review. Check your beta release notes for marketing language that makes unverifiable claims.
4. **StoreKit sandbox not working**: ensure you have a sandbox tester account configured in App Store Connect, signed into the device in Settings → App Store (not Settings → Apple Account). Sandbox and production use different Apple ID flows.
5. **TelemetryDeck signals not appearing**: TelemetryDeck signals may take a few minutes to appear; the SDK batches sends. Check with a debug build first — the SDK has a `testMode` flag that logs to console.
6. **Apple Developer Forums** — https://developer.apple.com/forums/ — App Store submission questions get answered here by Apple engineers and DTS staff.

---

## When you're done (and you're done with the curriculum)

1. Mnemo is live. You have real users, a crash dashboard you check weekly, and three point-releases behind you.
2. Push the final commit and tag it: `git tag v1.0.0 && git push --tags`.
3. That's twelve months of work. Ship something else.
