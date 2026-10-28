# KidQuest recording scripts (Speechello)

Record each line below as its own MP3, using the **exact file name** in the left column.
Put the files here:

- Phrases → `H:\Project\Kidsquest\audio\phrases\`
- Stories → `H:\Project\Kidsquest\audio\stories\`

**Quick way:** `python tools/make_audio.py --voice <voice name>` makes every file below in one go with a Microsoft neural voice (listen first in `audio\samples\index.html`). It skips files that already exist, so Speechello recordings are kept; add `--force` to remake, `--only stories` or `--match meal-` to limit it.

Once the files exist, the app will play them. Any file that is missing still falls back to the device voice, so you can record in batches.

## Speechello settings (keep them the same for every file)

- **Same voice for everything.** Pick one warm, friendly voice. A British or Indian English voice suits the kids well.
- **Speed:** normal (1.0). The app's Slow / Normal / Fast buttons change the speed when playing.
- **Export:** MP3, mono, 64–96 kbps is plenty and keeps files small for the phones and TV.
- **No music, no long silence** at the start or end. Trim it if Speechello adds any.
- Type the text **exactly as written** (punctuation sets the pauses and tone).

## How the phrases fit together

Most announcements are said to one child. The app plays the child's **name clip first**, then the phrase.
For example, `name-rayan.mp3` + `meal-left-5.mp3` gives "Rayan, … 5 minutes left to finish your food."
So the name clips are short, friendly call-outs, and the phrases don't contain names.

Lines marked *(stays device voice)* change every time (activity titles, quiz questions, help steps typed by parents), so they can't be recorded. They keep using the device voice.

---

## 1. Names (3 files)

| File | Say |
|---|---|
| name-rayan.mp3 | Rayan! |
| name-tasneem.mp3 | Tasneem! |
| name-taneem.mp3 | Taneem! |

If you rename a child or add one later in Edit family, record `name-<their name in lower case>.mp3`.

## 2. Meal timer (21 files)

The parent can set the meal time between 10 and 60 minutes, so every 5-minute mark is needed.

| File | Say |
|---|---|
| meal-left-60.mp3 | 60 minutes left to finish your food. |
| meal-left-55.mp3 | 55 minutes left to finish your food. |
| meal-left-50.mp3 | 50 minutes left to finish your food. |
| meal-left-45.mp3 | 45 minutes left to finish your food. |
| meal-left-40.mp3 | 40 minutes left to finish your food. |
| meal-left-35.mp3 | 35 minutes left to finish your food. |
| meal-left-30.mp3 | 30 minutes left to finish your food. |
| meal-left-25.mp3 | 25 minutes left to finish your food. |
| meal-left-20.mp3 | 20 minutes left to finish your food. |
| meal-left-15.mp3 | 15 minutes left to finish your food. |
| meal-left-10.mp3 | 10 minutes left to finish your food. |
| meal-left-5.mp3 | 5 minutes left to finish your food. |
| meal-left-4.mp3 | 4 minutes left to finish your food. |
| meal-left-3.mp3 | 3 minutes left to finish your food. |
| meal-left-2.mp3 | 2 minutes left to finish your food. |
| meal-left-1.mp3 | 1 minute left to finish your food. |
| meal-30s.mp3 | 30 seconds left! |
| meal-up.mp3 | Time is up! Meal time is finished. |
| meal-gold.mp3 | Gold star! You finished your food in good time. |
| meal-silver.mp3 | Silver star! You finished before the timer ran out. |
| meal-late.mp3 | Well done for finishing. Try to beat the timer next time! |

## 3. Homework and TV timers (5 files)

| File | Say |
|---|---|
| hw-10.mp3 | 10 minutes of homework time left. |
| hw-5.mp3 | 5 minutes left. Finish the question you're on. |
| hw-done.mp3 | Homework time is done. Great focus! Time for a short break. |
| tv-10.mp3 | 10 minutes of TV time left. |
| tv-up.mp3 | Time is up! Please turn off the TV, or pass the remote. |

## 4. Wake up, stars and bonus (7 files)

| File | Say |
|---|---|
| wake-up.mp3 | Wake up! Good morning! Time to start your wonderful day! |
| chart-gold.mp3 | Gold star! |
| bonus-1.mp3 | One bonus star! Great job! |
| bonus-2.mp3 | Two bonus stars! Great job! |
| bonus-5.mp3 | Five bonus stars! Great job! |
| bonus-10.mp3 | Ten bonus stars! Great job! |
| timer-audio-on.mp3 | Timer reminders are on for this device. |

## 5. Skills tab (5 files)

| File | Say |
|---|---|
| skill-1min.mp3 | One minute left. |
| skill-up.mp3 | Time's up! Tap Done when you've finished. |
| skill-done.mp3 | Great job! Ask Mum or Dad to check it. |
| skill-approved.mp3 | Well done! One more star! |
| skill-full-week.mp3 | Amazing! Every weekday done. Two bonus stars! |

*(stays device voice)* "Reading time! 20 minutes.", "Next: Spelling, 10 minutes…" and the 🔊 help steps, because parents can change the activity names and steps.

## 6. Play tab: shared lines (9 files)

| File | Say |
|---|---|
| play-star.mp3 | Great playing! You earned a star! |
| play-done.mp3 | Great playing! |
| praise-1.mp3 | Yes! Well done! |
| praise-2.mp3 | Correct! |
| praise-3.mp3 | Brilliant! |
| praise-4.mp3 | You got it! |
| praise-5.mp3 | Super! |
| quiz-try.mp3 | Good try! The right answer is in green. |
| quiz-try-pic.mp3 | Good try! Look at the green answer. |

*(stays device voice)* the quiz questions themselves (there are hundreds).

## 7. Memory and What moved? games (9 files)

| File | Say |
|---|---|
| memory-start.mp3 | Find the matching pairs! |
| match-1.mp3 | A match! |
| match-2.mp3 | Yes, a pair! |
| match-3.mp3 | Well done! |
| memory-all.mp3 | You found them all! |
| moved-start.mp3 | Look carefully at the pictures! |
| moved-close.mp3 | Close your eyes! |
| moved-ask.mp3 | Which one moved? Tap it! |
| moved-try.mp3 | Good try! This one moved. |

## 8. Counting game (28 files)

| File | Say |
|---|---|
| count-apples.mp3 | How many apples? |
| count-stars.mp3 | How many stars? |
| count-fish.mp3 | How many fish? |
| count-cars.mp3 | How many cars? |
| count-balloons.mp3 | How many balloons? |
| count-chicks.mp3 | How many chicks? |
| count-flowers.mp3 | How many flowers? |
| count-cookies.mp3 | How many cookies? |
| count-yes-1.mp3 | Yes! One! |
| count-yes-2.mp3 | Yes! Two! |
| count-yes-3.mp3 | Yes! Three! |
| count-yes-4.mp3 | Yes! Four! |
| count-yes-5.mp3 | Yes! Five! |
| count-yes-6.mp3 | Yes! Six! |
| count-yes-7.mp3 | Yes! Seven! |
| count-yes-8.mp3 | Yes! Eight! |
| count-yes-9.mp3 | Yes! Nine! |
| count-yes-10.mp3 | Yes! Ten! |
| count-try-1.mp3 | Good try! There is one. |
| count-try-2.mp3 | Good try! There are two. |
| count-try-3.mp3 | Good try! There are three. |
| count-try-4.mp3 | Good try! There are four. |
| count-try-5.mp3 | Good try! There are five. |
| count-try-6.mp3 | Good try! There are six. |
| count-try-7.mp3 | Good try! There are seven. |
| count-try-8.mp3 | Good try! There are eight. |
| count-try-9.mp3 | Good try! There are nine. |
| count-try-10.mp3 | Good try! There are ten. |

## 9. Odd one out game (11 files)

| File | Say |
|---|---|
| odd-start.mp3 | Which one is different? |
| odd-yes-fruit.mp3 | Yes! The others are all fruit. |
| odd-yes-animals.mp3 | Yes! The others are all animals. |
| odd-yes-vehicles.mp3 | Yes! The others are all vehicles. |
| odd-yes-clothes.mp3 | Yes! The others are all clothes. |
| odd-yes-balls.mp3 | Yes! The others are all sports balls. |
| odd-try-fruit.mp3 | Good try! The others are all fruit. |
| odd-try-animals.mp3 | Good try! The others are all animals. |
| odd-try-vehicles.mp3 | Good try! The others are all vehicles. |
| odd-try-clothes.mp3 | Good try! The others are all clothes. |
| odd-try-balls.mp3 | Good try! The others are all sports balls. |

---

## 10. Stories (6 files)

The full text for each story is in `audio\scripts\stories\`, ready to paste into Speechello.
"ﷺ" is already written out as "peace be upon him". Each sentence is on its own line.

| File | Script |
|---|---|
| sindbad.mp3 | scripts\stories\sindbad.txt |
| frog.mp3 | scripts\stories\frog.txt |
| woodcutter.mp3 | scripts\stories\woodcutter.txt |
| prophet-1.mp3 | scripts\stories\prophet-1.txt |
| prophet-2.mp3 | scripts\stories\prophet-2.txt |
| prophet-3.mp3 | scripts\stories\prophet-3.txt |

If Speechello limits how much text one project can hold, record a story in parts and join them into one MP3 (Speechello's own merge, or a free tool such as Audacity), keeping the single file name above.

## Suggested order

1. **Stories** (the biggest win: the longest listening).
2. **Names, meal, homework and TV timers** (heard every day).
3. **Wake up, stars, Skills.**
4. **Play games** (the most files, the shortest lines).

Total: 3 names + 95 phrases + 6 stories.
