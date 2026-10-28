# Multi-family pilot — plan

**Status:** plan only, nothing built yet. Written 29 Oct 2026.

**Goal:** a second family (a colleague and her child) uses the same KidQuest app with their own private data, and our family keeps every feature exactly as it is today. This is a **time-boxed pilot for 2–5 families**, not a public product.

**Ground rules:** personal time and personal tools only; check TechM's outside-business policy before charging anyone; written parental consent before any other family's data goes in; every step is its own branch and PR.

## Where things stand today

- `js/store.js` has `const FAMILY_ID = 'home'`, and every read and write goes to `families/home/{collection}/{doc}`.
- Collections: `profiles`, `stars`, `charts`, `chartrows`, `timers`, `alarms`, `devices`, `plans`, `skilllog` (all watched in `startWatches`).
- `firestore.rules` lets in exactly two hard-coded UIDs, and only for `families/home/**`.
- Devices are signed in once by a parent (email and password, `deviceSignIn`). There is no sign-up and no sign-out.
- Onboarding (`showOnboarding` → `obFinish`) already runs when a family has no profiles, so a new, empty family gets a ready-made setup flow.
- Recorded name clips exist only for Rayan, Tasneem and Taneem (`audio/phrases/name-*.mp3`). Any other name falls back to the device voice, which already works.
- The 3 Prophet stories (`prophet-1…3`) and the `grade3` plan (Hindi, Telugu, "teach it to the twins") are written for our family.

---

## 1. Data layout

```
families/{familyId}                     { name, owner: uid, created, packs: ['prophet'], consent: {...}, pilotEnds }
families/{familyId}/members/{uid}       { role: 'owner'|'parent', joined, via: 'create'|'invite'|'migrated' }
families/{familyId}/profiles|stars|charts|chartrows|timers|alarms|devices|plans|skilllog/...   (unchanged)
users/{uid}                             { familyId }            ← lookup: which family this login belongs to
invites/{code}                          { familyId, by: uid, expires }
pilotCodes/{code}                       { used: false }         ← lets a new family be created (see 3)
```

**How a login finds its family:** after sign-in, the app reads `users/{uid}`. That gives `familyId`, which replaces the constant in `store.js` (`FAMILY_ID` becomes a `let`, set before `startWatches`). The membership record that the rules trust is `families/{familyId}/members/{uid}`; `users/{uid}` is only a pointer so the app knows where to look. A login with no `users` doc goes to "Create a family / Join with a code".

**Migrating our data — no data moves.** Our family keeps the id `home`. Firestore can't rename a path, and copying thousands of star records is where loss would happen, so we don't copy anything. Migration is only:

1. Back up first: a "Download all data" button (it's already on the roadmap as **Backup**) that writes every collection to a JSON file. Keep the file somewhere safe.
2. Add `families/home` (name, owner = Siddique's UID, `packs: ['prophet']`).
3. Add `families/home/members/{uid}` and `users/{uid}` for both existing UIDs.
4. Publish the transitional rules (section 2), which still let the two old UIDs in. Check every tab on every device.
5. Only after a week of normal use, publish the final rules without the hard-coded UIDs.

Local mode (`makeLocalStore`, no Firebase) is unaffected; it ignores the family id.

## 2. Firestore rules by membership

A sketch of the shape, not the final file (`isOwnerAfter`, `validInvite` and the pilot-code check get written and tested in PR 2/4):

```
function signedIn()       { return request.auth != null; }
function isMember(fid)    { return signedIn() && exists(/databases/$(database)/documents/families/$(fid)/members/$(request.auth.uid)); }
function isOwner(fid)     { return signedIn() && get(/databases/$(database)/documents/families/$(fid)).data.owner == request.auth.uid; }
// transitional only (PR 1 → PR 6): the two original logins
function legacyHome(fid)  { return fid == 'home' && signedIn() && request.auth.uid in ['QSMP…', 'VUY1…']; }

match /users/{uid} {
  allow read:   if signedIn() && request.auth.uid == uid;
  allow create: if signedIn() && request.auth.uid == uid
                && existsAfter(/databases/$(database)/documents/families/$(request.resource.data.familyId)/members/$(uid));
  allow delete: if signedIn() && request.auth.uid == uid;
}
match /families/{fid} {
  allow read:   if isMember(fid) || legacyHome(fid);
  allow create: if signedIn() && request.resource.data.owner == request.auth.uid
                && /* a valid, unused pilot code is consumed in the same batch */ ...;
  allow update: if isOwner(fid);
  allow delete: if isOwner(fid);

  match /members/{uid} {
    allow read:   if isMember(fid);
    allow create: if request.auth.uid == uid && (
                    (isOwnerAfter(fid) && request.resource.data.via == 'create') ||
                    (request.resource.data.via == 'invite' && validInvite(request.resource.data.code, fid)));
    allow delete: if isOwner(fid) || request.auth.uid == uid;
  }
  match /{col}/{doc=**} {
    allow read, write: if (isMember(fid) || legacyHome(fid)) && col != 'members';
  }
}
match /invites/{code}    { allow get: if signedIn(); allow create, delete: if isMember(request.resource.data.familyId) /* or resource.data */; }
match /pilotCodes/{code} { allow get: if signedIn(); allow update: if /* only used:false → true */ ...; }
```

Notes:
- `get` but never `list` on `invites` and `pilotCodes`, so codes can't be browsed; codes are 10+ random characters.
- Each data read costs one extra `exists()` lookup per request (not per document), so quotas barely change.
- The rules get a small test file run against the Firebase emulator (`tools/rules.test.js`, Node only for testing; the app itself stays build-free). Tests: our family can read and write `home`; family B can't read `home` and we can't read B; nobody can make themselves a member without an invite; a used pilot code can't be reused.

## 3. Sign-up, create a family, invite a second parent

**Create (new family):**
1. Device setup screen gets two links: **Sign in** (today's flow) and **New family**.
2. New family: parent email, password, family name, and a **pilot code** from Siddique. `createUserWithEmailAndPassword`, then one batch: `families/{newId}` (owner = me), `members/{me}` (`via:'create'`), `users/{me}`, mark the pilot code used.
3. The consent screen (section 5) must be accepted before the batch is written.
4. The app then starts as usual: no profiles yet → existing onboarding (kids, ages, PINs, parents).

The pilot code is what keeps this a 2–5 family pilot: without one, anyone who finds the URL could create accounts and families on our Firebase project.

**Invite a second parent:**
1. Edit family (parents only) → **Invite a parent** → creates `invites/{code}` valid for 7 days and shows the code plus a link (`…/?join=CODE`).
2. The other parent opens the link, creates their own email login, enters the code. One batch: `members/{me}` (`via:'invite'`, `code`), `users/{me}`, delete the invite.
3. Each parent has their own login (better than sharing one password); a family device can be signed in by either.

**Also needed: Sign out.** Today a device can never leave the family. Add "Sign out of this device" in Edit family; it also clears Firestore's offline cache (`clearIndexedDbPersistence`) so the next login on a shared device can't see the previous family's cached data.

## 4. Content per family

- **Story packs.** Each story gets an optional `pack` field (`prophet-1…3` → `pack:'prophet'`; Sindbad, Frog, Woodcutter stay general). The Stories tab shows general stories plus the packs listed in `families/{id}.packs`. `home` has `['prophet']`, so nothing changes for us. New families choose in onboarding ("Include stories about the Prophet ﷺ?"), and can change it in Edit family.
- **Plan templates by age.** Keep `grade3`, `reader` and `early` as they are (they're ours). Add general starters a new family can pick: **Age 4–5**, **Age 6–7**, **Age 8–10** (reading, writing, a numbers game, an own job), with no Hindi/Telugu or family references. Templates are only starting points; parents already edit everything.
- **Voice.** Recorded phrases (timers, meals, stories) work for every family. Other children's names use the device voice. We do **not** record name clips for other families: the `audio/` folder is public on GitHub Pages, so a recorded name would publish that child's name.
- **Quiz and Play tab** content is general and shared as is.

## 5. Consent and privacy

**Consent (DPDP Act 2023).** The Act counts everyone under 18 as a child and needs verifiable consent from a parent before a child's data is processed, and it bars tracking or behavioural monitoring of children and targeted ads. The DPDP Rules 2025 phase in over the coming months; the personal/domestic exemption may cover our own family but not someone else's. So for the pilot, act as if the Act fully applies.

- **Written consent before any data:** a one-page consent note (plain English) sent to the parent, signed or replied to by email, kept by Siddique. It says: what is stored, why, where (Google Firebase; check the Firestore region in the console and name it), who can see it (that family's parents, and Siddique as the project admin), that it's free and a pilot ending on a set date, and how to delete.
- **In-app record too:** the New family screen shows the same text with an "I'm the parent and I agree" checkbox; `families/{id}.consent = { by: uid, at, version }`.

**Minimal data.** What we store: parent email (Firebase Auth), children's **first name or nickname**, age (used only to suggest a plan; could be an age band), emoji, colour, hashed PINs, stars, charts, plans, skill check-ins, timers, alarms, device names. No photos, surnames, schools, birthdays, location or analytics. The onboarding hint says "first name or nickname". The roadmap's handwriting photos and art gallery stay **off** for pilot families.

**Deleting a family's data.**
- In the app: Edit family → **Delete our family** (owner only, type the family name to confirm). The app deletes every document in each collection, then `members`, `users` docs and the `families/{id}` doc, then the login itself (`user.delete()`). The other parent's login is removed when they next open the app, or by Siddique.
- **Download our data first** (same Backup button as in section 1).
- By request: the parent emails Siddique, who deletes the family in the Firebase console within 7 days and confirms in writing.
- When the pilot ends: families that don't continue are deleted within 30 days.

## 6. Steps (one PR each), effort and risks

| # | PR | What | Effort |
|---|---|---|---|
| 1 | Backup | "Download all data" as JSON (roadmap item). Take a backup. | 0.5 day |
| 2 | Family id from login | `families/home` + `members` + `users` docs for both UIDs; `FAMILY_ID` read from `users/{uid}` (falls back to `home`); transitional rules with `legacyHome`; rules tests | 1 day |
| 3 | Sign out | Sign out of this device, clears the offline cache | 0.5 day |
| 4 | New family | Pilot codes, New family screen with consent, create batch, existing onboarding | 1–1.5 days |
| 5 | Invite a parent | Invite codes, join link, join flow | 1 day |
| 6 | Content | Story packs, general age templates, pack choice in onboarding/Edit family | 1 day |
| 7 | Delete our family | Owner-only delete, plus privacy note page | 1 day |
| 8 | Lock down | Remove `legacyHome` from the rules after a week of normal use | 0.25 day |

**Total: about 6–7 days** of evenings/weekends, plus a week of waiting before step 8. Steps 1–3 change nothing visible for our family and can ship first; the colleague's family can start after step 4 (invite and delete must be in before the pilot's second week).

**Risks**
- **Locking our own family out** when the rules change. Mitigation: transitional rules keep the old UIDs; publish rules only after the member docs exist; keep the old rules text ready to paste back; test in the emulator first.
- **Data shown to the wrong family** on a shared device, through the offline cache. Mitigation: sign-out clears the cache; family id is never kept in localStorage alone.
- **Strangers creating families** on our Firebase project. Mitigation: pilot codes, single use, and Siddique can disable email sign-up in the console.
- **Free-tier limits** (Spark: 50k reads, 20k writes a day). Fine for 5 families; watch the usage page once a week.
- **Expectations:** a colleague's family will expect support and fixes, and alarms still only ring while KidQuest is open on that device. Say both up front in the consent note.
- **Work boundary:** colleague as user, built on personal time; no TechM devices, accounts or email; check TechM's outside-business policy before any money changes hands.
- **Admin access:** Siddique can see every family's data in the Firebase console. Disclose it; don't look without a support reason.

## Decisions for Siddique before building

1. **Go ahead with the pilot, and its size and end date?** Suggested: up to 3 families, ending 31 Mar 2027, then decide whether to continue, shrink or stop.
2. **Invite-only family creation with pilot codes, or open sign-up?** Recommended: pilot codes.
3. **Prophet stories for new families: off by default (they choose in onboarding) or on by default?** Recommended: they choose; `home` keeps them on. Same answer for the Hindi/Telugu template being visible to others.
4. **Free for the pilot, and who signs the consent note?** Recommended: free, consent from each family's parent by email, kept by you; check TechM's policy before any future charging.
