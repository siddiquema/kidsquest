# KidQuest roadmap

Pending work, in rough priority order. Built so far: shared storage (Firebase), a PIN for each person, the Star Board, synced timers with per-device audio reminders, alarms per device, the 🌱 Skills tab (Phase 1 of both planning briefs) and the 🎮 Play tab.

## 1. Configure section (parents only)

One place to change things that currently need a code change:

- **Chart activities**: rename, add, remove or reorder the behaviour chart rows.
- **Timer lengths**: meal (now 25 min) and TV (now 20 min).
- **Stars**: play stars per day (now 3), stars per skill activity (now 1) and the full-week bonus (now +2).
- **PIN resets**: reset any kid's or parent's PIN from one screen.
- **Emergency settings**: see below.

## 2. Emergency button

A big red **Press for emergency** button that kids can reach on their own screen.

1. **Press and hold** for about 2 seconds, so a bump doesn't set it off.
2. At the same moment:
   - an urgent **ntfy** push goes to both parents' phones (free ntfy Android app, subscribed to a private channel; the channel name is stored in Firebase, not in this public repo);
   - **every open KidQuest screen** (TV, phones) shows a full-screen red alert with a siren, through a shared alert record in Firebase.
3. The kid's screen then shows **📞 Call Dad**, **📞 Call Mum** and **📞 112** buttons (phone call links).
4. In Configure: switch each part on or off, set the phone numbers and the ntfy channel, and send a test alert.

This helps reach the parents quickly; it does not replace calling 112.

## 3. Skill Quest (age 8) — later phases

From the Skill Quest handover brief:

- **Word bank** for Hindi and Telugu words, with big running counts, and a **Friday quiz** of this week's words. Needs Telugu script fonts as well as Devanagari.
- **Weekly review** for parents: sessions done, minutes, words added, notes ("Enjoyed" / "Resisted" / "Change next week"), and plan history.
- **Tutor-day switch**: on tutor days the Telugu block shows "Tutor session".
- **Handwriting benchmark**: a Sunday photo of the same sentence, shown week 1 next to the latest.
- **Backup**: download all KidQuest data as a file.

## 4. Twins (age 5–6) — later phases

From the twins' Skills brief:

- **Reading path** for the early reader: 5 steps, a current-step pointer and a "feels easy, move on" button.
- **Sound cards**: big letter tiles that play sounds a parent records (no text-to-speech, which says letter names instead of sounds).
- **Weekend picture planner**: the kids drag picture cards into Sunday's order.
- **Show-and-tell recorder**, **World explorer** (weekly topic with voice-recorded facts), **Follow-up captain** (family promise list) and an **Art club gallery** (one photo per child per week).
- **Month-end targets**: a parent-only checklist per child.

## Known limits

- Alarms only ring on a device that has KidQuest open; a website can't wake a sleeping phone.
- "Together" activities live in each twin's plan, so changing one means editing both.
