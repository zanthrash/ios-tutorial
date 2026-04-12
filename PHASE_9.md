# Phase 9 — CloudKit + E2EE Sync

**Duration:** 4 weeks · **Budget:** ~26 hours total · **Pace:** 5–8 hrs/week

## Translating to your own app

The skill you're building here is not "Mnemo sync" — it's a general pattern: encrypt locally with CryptoKit, store only ciphertext in CloudKit's private database, and let iCloud Keychain carry the key across devices. Any app that handles personal data — journals, health notes, financial records, private messages — can use this exact architecture. The CloudKit records look the same whether your plaintext is a memory, a diary entry, or a medical measurement. The key management pattern is identical.

What's concept-agnostic: the `ChaChaPoly.seal` / `ChaChaPoly.open` cycle, storing a `SymmetricKey` in iCloud Keychain with `kSecAttrSynchronizable`, writing sealed-box bytes to a `CKRecord` as `Data`, and using `CKServerChangeToken` to sync deltas rather than re-fetching everything on every launch. Learn this on Mnemo and you can apply it to any privacy-sensitive app in an afternoon.

---

## What you'll have at the end

1. Mnemo running on your iPhone and iPad, in sync via CloudKit — no manual export, no AirDrop, nothing user-initiated.
2. CloudKit Dashboard shows only opaque binary blobs where record fields live. No readable text anywhere.
3. Key management that survives a full app delete-and-reinstall on a second device: keys come back from iCloud Keychain, records decrypt correctly.
4. A one-page threat-model README committed to your repo explaining what the design protects against and what it does not.
5. A network capture (Charles Proxy or Apple's built-in packet trace) showing only ciphertext crossing the wire.

---

## What you WILL NOT do in Phase 9

- Use `NSPersistentCloudKitContainer`. That syncs Core Data, not arbitrary encrypted payloads. You need raw CloudKit APIs so you control what goes in the record.
- Store keys in CloudKit records. Keys go in iCloud Keychain only — the whole point is that CloudKit never sees plaintext or keys.
- Enable CloudKit sync before E2EE is working end-to-end. Once plaintext enters CloudKit it is in iCloud backups and potentially in Apple's infrastructure. There is no undo.
- Roll your own cryptographic primitives. CryptoKit's `ChaChaPoly` and `HKDF` are the correct answer. Do not implement AES manually, do not invent your own key derivation.
- Sync until you can verify decryption on the second device. Complete the round trip in a unit test first.

---

## Week 1 — Crypto layer: encrypt locally, verify before CloudKit

**Theme:** Get CryptoKit working end-to-end in isolation. Touch no networking this week.

**Goal:** By end of Week 1, Mnemo encrypts a memory record to a sealed box, stores the box bytes in SwiftData, decrypts it back, and a unit test proves the round trip with no regressions.

### Day 1 — Read CryptoKit docs and plan the key hierarchy (1–1.5 hrs)

1. Read the CryptoKit documentation overview: https://developer.apple.com/documentation/cryptokit
   Focus on: `SymmetricKey`, `ChaChaPoly.SealedBox`, `HKDF`.
2. Read "Protecting keys with the Secure Enclave": https://developer.apple.com/documentation/security/certificate_key_and_trust_services/keys/protecting_keys_with_the_secure_enclave
3. Decide on your key hierarchy. Recommended:
   - One **root symmetric key** (`SymmetricKey(size: .bits256)`) generated on first launch.
   - Stored in iCloud Keychain (`kSecAttrSynchronizable = true`).
   - All Mnemo record fields encrypted with this key via `ChaChaPoly.seal`.
   - Optional subkeys derived via `HKDF<SHA256>.deriveKey` if you want per-record-type isolation.
4. Write a short comment block in a new `CryptoService.swift` file documenting this hierarchy before writing any code.

### Day 2 — Build `CryptoService` (1.5–2 hrs)

Implement a `CryptoService` actor (not a struct — it holds the key reference):

```swift
actor CryptoService {
    private let key: SymmetricKey

    init(key: SymmetricKey) { self.key = key }

    func seal(_ data: Data) throws -> Data {
        let box = try ChaChaPoly.seal(data, using: key)
        return box.combined   // nonce + ciphertext + tag, all in one blob
    }

    func open(_ combined: Data) throws -> Data {
        let box = try ChaChaPoly.SealedBox(combined: combined)
        return try ChaChaPoly.open(box, using: key)
    }
}
```

Write at least three `swift-testing` tests:
- Round-trip: `seal` then `open` returns original plaintext.
- Tamper detection: mutating one byte of the sealed blob causes `open` to throw.
- Key mismatch: opening with a different key throws.

All tests must pass. Commit: `"Phase 9: CryptoService round-trip with tests"`.

### Day 3 — Wire CryptoService into Mnemo's save path (1.5–2 hrs)

Identify every place Mnemo writes user content to SwiftData. For each:

1. Before writing to `@Model`, pass the plaintext through `CryptoService.seal`.
2. Store the resulting `Data` blob in a new `encryptedPayload: Data` property on your model.
3. On read, pass through `CryptoService.open` before displaying.

Keep a clear separation: `@Model` holds ciphertext only. Your view layer never touches ciphertext — it asks a service layer to decrypt and only then renders.

If Mnemo's models have fields like `title: String` and `body: String`, replace them with `encryptedPayload: Data` that encodes a `Codable` struct containing both fields. One sealed blob per record is simpler than encrypting field-by-field.

### Day 4–5 — Key generation and temporary storage (1–1.5 hrs)

For now, generate the key on first launch and store it in the iOS Keychain (local, not yet iCloud-synced — you'll add `kSecAttrSynchronizable` in Week 2):

```swift
func generateOrLoadKey() throws -> SymmetricKey {
    let query: [CFString: Any] = [
        kSecClass: kSecClassGenericPassword,
        kSecAttrService: "com.yourapp.mnemo",
        kSecAttrAccount: "masterKey",
        kSecReturnData: true
    ]
    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    if status == errSecSuccess, let data = result as? Data {
        return SymmetricKey(data: data)
    }
    let newKey = SymmetricKey(size: .bits256)
    let addQuery: [CFString: Any] = [
        kSecClass: kSecClassGenericPassword,
        kSecAttrService: "com.yourapp.mnemo",
        kSecAttrAccount: "masterKey",
        kSecValueData: newKey.withUnsafeBytes { Data($0) }
    ]
    SecItemAdd(addQuery as CFDictionary, nil)
    return newKey
}
```

**Checkpoint:** Mnemo encrypts and decrypts correctly on device. SwiftData stores only blobs. The app functions normally — memories are still visible, search still works.

---

## Week 2 — iCloud Keychain: key sync without CloudKit

**Theme:** Get the key onto your iPad before touching CloudKit at all.

**Goal:** Delete Mnemo from both devices. Reinstall on iPhone. Key appears in iCloud Keychain. Install on iPad. Key is present. This is the whole key-sync story — CloudKit never participates.

### Day 1 — Add iCloud Keychain attributes (1 hr)

Modify the Keychain write query from Week 1:

```swift
kSecAttrSynchronizable: kCFBooleanTrue,
kSecAttrAccessible: kSecAttrAccessibleAfterFirstUnlock
```

`kSecAttrAccessibleAfterFirstUnlock` allows background CloudKit operations to access the key after device unlock, which you'll need in Week 3.

Read query must also include `kSecAttrSynchronizable: kCFBooleanTrue` — without it, the lookup will miss the synchronized item.

Enable the **iCloud Keychain** capability in Xcode: Signing & Capabilities → add iCloud → check "Key-value storage" if not already present. Keychain sharing also requires an entitlement: add the **Keychain Sharing** capability and add your app's keychain access group.

### Day 2–3 — Two-device key verification (2 hrs)

1. Build and run Mnemo on iPhone. Create three memories. Confirm they display correctly (decryption works).
2. Open the Keychain Access app on your Mac (or use `security` CLI) and verify the key is present in iCloud Keychain — or verify indirectly by waiting a few minutes and installing on iPad.
3. Install Mnemo on iPad (same Apple ID). On first launch, `generateOrLoadKey` should find the existing key rather than generating a new one.
4. Write a test memory on iPad. Confirm it encrypts with the same key (it will — key lookup finds the iCloud-synced item).

At this point your key is shared across devices. No CloudKit involved yet. This is by design.

### Day 4 — Write a KeychainService abstraction (1–1.5 hrs)

Extract all Keychain calls into a `KeychainService` with a clean Swift interface:

```swift
struct KeychainService {
    func loadKey(account: String) throws -> SymmetricKey?
    func saveKey(_ key: SymmetricKey, account: String) throws
    func deleteKey(account: String) throws
}
```

This makes it injectable for testing and keeps Keychain boilerplate out of your view models.

Write tests using a fake/in-memory `KeychainService` conformance. Confirm `CryptoService` tests still pass with the injected key.

**Checkpoint:** Key survives delete-and-reinstall across two devices. You can explain exactly what iCloud Keychain does and does not protect. Mnemo is fully functional on both devices — with no sync yet. That's fine. Sync is Week 3.

---

## Week 3 — CloudKit private database: encrypted sync

**Theme:** Write sealed blobs to CloudKit, read them back, delta-sync with `CKServerChangeToken`.

**Goal:** Create a memory on iPhone. It appears on iPad within 30 seconds. CloudKit Dashboard shows only binary data.

### Day 1 — CloudKit setup (1–1.5 hrs)

1. In Xcode, add the **CloudKit** capability: Signing & Capabilities → iCloud → enable CloudKit → add a container (e.g., `iCloud.com.yourname.mnemo`).
2. Also enable **Push Notifications** capability — CloudKit uses silent pushes for change notifications.
3. Open CloudKit Dashboard: https://console.developer.apple.com → CloudKit → your container.
4. In the Development environment, create a record type: `MnemoRecord`. Add two fields:
   - `encryptedPayload` (Bytes)
   - `modifiedAt` (Date/Time)
5. No plaintext fields. That's the whole design.

### Day 2 — Write encrypted records to CloudKit (2 hrs)

Build a `CloudSyncService` actor:

```swift
actor CloudSyncService {
    private let db = CKContainer.default().privateCloudDatabase
    private let cryptoService: CryptoService

    func push(_ record: MnemoLocalRecord) async throws {
        let plaintext = try JSONEncoder().encode(record.payload)
        let sealed = try await cryptoService.seal(plaintext)
        let ck = CKRecord(recordType: "MnemoRecord",
                          recordID: CKRecord.ID(recordName: record.id.uuidString))
        ck["encryptedPayload"] = sealed as CKRecordValue
        ck["modifiedAt"] = Date() as CKRecordValue
        try await db.save(ck)
    }
}
```

Test by calling `push` from a debug button in Mnemo. Immediately open CloudKit Dashboard. Confirm:
- The record exists.
- The `encryptedPayload` field is a binary blob with no readable text.
- There is no `title`, no `body`, no `text` field anywhere.

Screenshot the Dashboard. Commit it to the repo as evidence.

### Day 3 — Fetch and delta-sync with `CKServerChangeToken` (2 hrs)

Do not re-fetch all records on every sync. Use `CKFetchRecordZoneChangesOperation` with a stored `CKServerChangeToken`:

```swift
func pull() async throws -> [MnemoLocalRecord] {
    let token = loadChangeToken()   // from UserDefaults or SwiftData
    let config = CKFetchRecordZoneChangesOperation.ZoneConfiguration(
        previousServerChangeToken: token
    )
    let op = CKFetchRecordZoneChangesOperation(
        recordZoneIDs: [CKRecordZone.default().zoneID],
        configurationsByRecordZoneID: [CKRecordZone.default().zoneID: config]
    )
    var records: [MnemoLocalRecord] = []
    op.recordWasChangedBlock = { _, result in
        if case .success(let ck) = result,
           let blob = ck["encryptedPayload"] as? Data {
            // decrypt and decode
        }
    }
    op.recordZoneChangeTokensUpdatedBlock = { _, newToken, _ in
        self.saveChangeToken(newToken)
    }
    // ... add to db.add(op)
    return records
}
```

Persist the `CKServerChangeToken` (encode it with `NSKeyedArchiver`). On subsequent pulls, only changed records come down.

### Day 4 — `CKSubscription` for push-triggered sync (1–1.5 hrs)

Register a `CKDatabaseSubscription` so the device wakes when another device writes:

```swift
func subscribeToChanges() async throws {
    let sub = CKDatabaseSubscription(subscriptionID: "all-changes")
    let info = CKSubscription.NotificationInfo()
    info.shouldSendContentAvailable = true   // silent push
    sub.notificationInfo = info
    try await db.save(sub)
}
```

In `AppDelegate` (or `UNUserNotificationCenterDelegate`), handle the silent push by calling your `pull()` function. This is why you needed `kSecAttrAccessibleAfterFirstUnlock` in Week 2 — the pull happens in the background before the user unlocks.

**Checkpoint:** Create a memory on iPhone. Within ~30 seconds it appears on iPad. CloudKit Dashboard shows only blobs. Delta sync works (second pull fetches nothing if nothing changed). Verify with the Charles Proxy or Proxyman network trace — only ciphertext on the wire.

---

## Week 4 — Privacy manifest, threat model, and polish

**Theme:** Harden the submission artifact, write the threat model, verify the mastery gate in full.

**Goal:** A complete, honest threat model README. A passing Privacy Nutrition Label. Both devices in clean sync on a fresh install.

### Day 1 — New-device restore flow (1.5 hrs)

Simulate the worst case: user gets a new iPhone, downloads Mnemo fresh.

1. Delete Mnemo from one device.
2. Install fresh — no existing data.
3. The key should load from iCloud Keychain (because the user is signed into the same iCloud account). Existing CloudKit records should decrypt correctly after the first pull.
4. Test this. Fix any ordering bugs (e.g., key load must complete before the first `pull()` is attempted).

Add a clear error state for the case where iCloud Keychain is unavailable (iCloud signed out, no network on first launch). Show a message like "Sign into iCloud to access your encrypted memories." Do not silently generate a new key — that would orphan all existing records.

### Day 2 — Privacy manifest and required-reason APIs (1.5 hrs)

Read the Privacy Manifest documentation: https://developer.apple.com/documentation/bundleresources/privacy_manifest_files

In Xcode, open your app target's `PrivacyInfo.xcprivacy` file (create it if missing: File → New → File → App Privacy).

For Mnemo, audit which "required-reason APIs" you're calling. Common ones:
- `UserDefaults` (for `CKServerChangeToken` storage) — reason: `CA92.1` (app functionality)
- `FileTimestamp` — if you access file modification dates
- `SystemBootTime` — unlikely but check

Update `NSPrivacyCollectedDataTypes`: Mnemo collects no data that leaves the device in plaintext. The CloudKit sync is private database + encrypted. Document this accurately — "we do not collect data" is the correct answer here, but the manifest must still be present and complete.

### Day 3 — Threat model README (1.5–2 hrs)

Write `docs/THREAT_MODEL.md` in your repo. One page. Cover:

**What this design protects against:**
- Apple employees and CloudKit infrastructure operators cannot read your memories (they see only ciphertext).
- A CloudKit data breach exposes only blobs.
- Accidental CloudKit misconfiguration (e.g., public read) exposes only blobs.

**What this design does NOT protect against:**
- Compromise of the user's iCloud account (attacker can read iCloud Keychain, therefore has the key).
- Physical device access when unlocked (attacker can call `CryptoService.open` as the app would).
- A malicious app update that you ship (you control the binary).
- Device compromise at the OS level (jailbreak, etc.).

**Key storage threat surface:** iCloud Keychain is Apple-managed, synced via end-to-end encryption (Apple's own E2EE layer on top of your E2EE layer). The key is as safe as the user's iCloud password and recovery key.

This document is part of your mastery gate. If you can write it clearly, you understand the design.

### Day 4 — Full mastery gate run and CI update (1 hr)

1. Run the full mastery gate checklist below.
2. Update your GitHub Actions CI to run the new CloudKit-related tests (mock the `CKDatabase` calls with a protocol so tests don't require a real CloudKit container).
3. Run Instruments → Time Profiler on a sync cycle. Confirm sync does not block the main thread. Fix any hangs.
4. Tag the commit: `git tag v0.9.0-beta`.

---

## Mastery gate — end of Phase 9

- [ ] Two physical devices (iPhone and iPad, same iCloud account) show the same memories, in sync, with no manual action.
- [ ] CloudKit Dashboard (https://console.developer.apple.com) shows only binary blobs in every record field. No readable text anywhere.
- [ ] A network capture (Charles Proxy, Proxyman, or Apple's own `rvictl` + Wireshark) shows only ciphertext crossing the wire. No JSON with plaintext fields.
- [ ] Delete Mnemo from one device. Reinstall. All memories return. Key reloads from iCloud Keychain. No new key generated.
- [ ] `swift test` passes, including `CryptoService` tamper-detection test and key-mismatch test.
- [ ] CI is green.
- [ ] `docs/THREAT_MODEL.md` exists and correctly identifies the threat boundary.
- [ ] You can explain the full architecture — key generation, iCloud Keychain sync, CloudKit sealed-blob storage, delta sync — in one paragraph, without notes, to a non-engineer. (Test this: explain it to someone. If they don't follow, you don't understand it well enough yet.)

---

## Resources — Phase 9

Ordered by priority. Must-use items marked.

### Primary references (must-use)

- 📘 **CloudKit documentation** — https://developer.apple.com/documentation/cloudkit
  > Start with `CKContainer`, `CKDatabase`, `CKRecord`, `CKFetchRecordZoneChangesOperation`, `CKDatabaseSubscription`. Read each API page for the methods you're calling — don't wing the parameters.

- 📘 **CryptoKit documentation** — https://developer.apple.com/documentation/cryptokit
  > `ChaChaPoly`, `SymmetricKey`, `HKDF`, `AES.GCM`. Read the top-level overview plus the specific type pages you use.

- 📘 **Keychain Services documentation** — https://developer.apple.com/documentation/security/keychain_services
  > Focus on `SecItemAdd`, `SecItemCopyMatching`, `kSecAttrSynchronizable`, `kSecAttrAccessible`. The attribute dictionary API is verbose — read the reference carefully.

- 📘 **Protecting keys with the Secure Enclave** — https://developer.apple.com/documentation/security/certificate_key_and_trust_services/keys/protecting_keys_with_the_secure_enclave
  > Reference for `SecureEnclave.P256.KeyAgreement.PrivateKey` if you extend to multi-key scenarios.

- 📘 **Privacy manifest files** — https://developer.apple.com/documentation/bundleresources/privacy_manifest_files
  > Required reading before Day 2 of Week 4. Required-reason API list is in the sidebar.

- 📘 **CloudKit "Encrypting User Data"** — https://developer.apple.com/documentation/cloudkit/encrypting_user_data
  > Apple's own guidance on encrypted CloudKit values. Skim it — their approach uses `encryptedValues` on `CKRecord`, which is a CloudKit-side feature that is separate from your client-side CryptoKit approach. Understand the difference: their feature encrypts at rest in Apple's infra; yours encrypts before the data ever leaves the device. You want yours.

### Videos (must-watch)

- 🎬 **"Cryptography and Your Apps"** — WWDC19 — https://developer.apple.com/videos/play/wwdc2019/709/ (~35 min)
  > The foundational CryptoKit introduction. Covers `SymmetricKey`, `ChaChaPoly`, Secure Enclave key agreement, and the philosophy of using high-level APIs. Watch before writing a line of crypto code.

- 🎬 **"Meet CloudKit Console"** — WWDC21 — https://developer.apple.com/videos/play/wwdc2021/10117/ (~15 min)
  > How to use CloudKit Dashboard to verify your records. Essential for the mastery gate — you need to know how to look at your records and confirm there's no plaintext.

- 🎬 **"What's new in privacy"** — WWDC23 — https://developer.apple.com/videos/play/wwdc2023/10053/ (~30 min)
  > Covers privacy manifests, required-reason APIs, and Advanced Data Protection for CloudKit. Directly relevant to Week 4.

### Videos (optional)

- 🎬 **"Build apps that share data through CloudKit and Core Data"** — WWDC21 — https://developer.apple.com/videos/play/wwdc2021/10015/ (~30 min)
  > Covers CloudKit sharing and the `encryptedValues` CKRecord API. Watch if you want to understand how Apple's own encryption layer works — and why it's not sufficient for your threat model (it doesn't encrypt before leaving the device).

- 🎬 **"What's new in privacy"** — WWDC22 — https://developer.apple.com/videos/play/wwdc2022/10096/ (~25 min)
  > Earlier privacy session covering similar ground. Optional if you've watched the WWDC23 version.

- 🎬 **"What's new in privacy"** — WWDC24 — https://developer.apple.com/videos/play/wwdc2024/10123/ (~20 min)
  > Most recent privacy session. Good for understanding current Apple expectations at review time.

### Books / guides (optional)

- 📗 **"Practical Cryptography for Developers"** (free online) — https://cryptobook.nakov.com/
  > Not Swift-specific. Read the chapters on symmetric encryption and key derivation if you want the conceptual foundation behind what CryptoKit is doing. Not required — CryptoKit hides the math — but useful for writing a credible threat model.

- 📗 **Donny Wals blog — CloudKit and Swift** — https://www.donnywals.com/
  > Search "CloudKit" on the site. Donny has written several accurate, current articles on CloudKit sync patterns. Good second source when Apple's own docs are unclear.

### Free alternatives

- 🔗 **Apple Developer Forums — CloudKit tag** — https://developer.apple.com/forums/tags/cloudkit
  > Better signal than Stack Overflow for CloudKit questions. Many Apple engineers answer here. Search before posting.

- 🔗 **Swift Forums** — https://forums.swift.org/
  > For CryptoKit and Swift Concurrency questions. Tag threads with `cryptokit` or `swift-concurrency`.

### Tools / services

- 🛠️ **CloudKit Dashboard** — https://console.developer.apple.com
  > You'll use this daily in Week 3 to verify record contents. The mastery gate requires a screenshot from here.

- 🛠️ **Proxyman** — https://proxyman.io/ (free tier available)
  > macOS/iOS HTTP proxy for inspecting network traffic. Use to verify no plaintext leaves the device. The iOS helper app installs a certificate to capture HTTPS traffic. Run a sync cycle and confirm all CloudKit traffic shows only binary payloads.

- 🛠️ **Charles Proxy** — https://www.charlesproxy.com/ (30-day free trial)
  > Alternative to Proxyman. Either works for the network capture portion of the mastery gate.

- 🛠️ **Keychain-Dumper / Keychain Viewer (debug only)** — Not a real tool; use Xcode's debugger and `security` CLI instead.
  > To inspect iCloud Keychain items during development: `security find-generic-password -s "com.yourapp.mnemo" -w` in Terminal on your Mac. Confirms the key is present and synchronized.

---

## If you get stuck

In rough order of what to try:

1. **CloudKit errors are often entitlements problems.** If you get `CKError.notAuthenticated` or `CKError.serverRejectedRequest` on device, check your container identifier matches the one in the Developer Portal. Check the iCloud capability is correctly configured for both the app target and the extension if you have one.

2. **iCloud Keychain items not syncing?** Confirm the device is signed into iCloud, iCloud Keychain is enabled in Settings → [your name] → iCloud → Passwords & Keychain, and that your app's keychain access group entitlement matches the `kSecAttrService` value you're using.

3. **Decryption failing on second device?** The most common cause is that the key on device 2 is not the same key used to encrypt on device 1. Log the first 8 bytes of the key (in hex) on both devices and compare. If they differ, `kSecAttrSynchronizable` is not set correctly on either the write or read query.

4. **`CKServerChangeToken` confusion?** If you're seeing duplicate records or missed changes, you're not persisting the token correctly. The token must be saved in the `recordZoneChangeTokensUpdatedBlock` callback, not after the operation finishes. Read the `CKFetchRecordZoneChangesOperation` documentation carefully — the callback order matters.

5. **Apple Developer Forums** — https://developer.apple.com/forums/tags/cloudkit — search before posting; most CloudKit questions have been answered.

6. **Ask Claude** — paste the specific error code, the relevant code block, and what you expected. CloudKit error codes are documented at https://developer.apple.com/documentation/cloudkit/ckerror — look up the specific code before asking.

Avoid Stack Overflow for CloudKit questions. Most answers are from the `NSPersistentCloudKitContainer` era and will not apply to raw `CKDatabase` usage.

---

## When you're done

1. Both devices sync. Dashboard shows only blobs. Network capture shows only ciphertext.
2. `docs/THREAT_MODEL.md` is committed.
3. CI is green. `swift test` passes including crypto tests.
4. Tag: `git tag v0.9.0-beta && git push origin v0.9.0-beta`.
5. Move to Phase 10.

Phase 10 is the launch phase: App Store Connect polish, 50+ external TestFlight testers, crash reporting via Sentry, analytics via TelemetryDeck, and Mnemo v1.0 live on the App Store. The hard engineering is done. Phase 10 is about getting real users onto it and keeping it stable under real-world conditions.

Do not linger. The mastery gate is the standard, not perfection. If sync works and the threat model is honest, you're done.
