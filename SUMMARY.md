# The City Pulse — Build Summary

Prototype built from the spec in `city-pulse-claude-code-prompt.md`. Plain HTML/CSS/JS, no build tooling — open `index.html` in a browser to play.

## Files

- `index.html` — page shell: briefing banner, live reports table with envelope widget, map panel + field manual (left column), read-only activity log (right column)
- `style.css` — dark city-map / terminal styling for all panels
- `script.js` — all game data, state, and logic

## What it does

- 12 report cards (Centrum/Noord/Zuidoost) with AI labels, 3 of them wrong (C1, C4, N1 should be Medical).
- Two duplicate pairs (N3/N4, Z1/Z3) to flag.
- A locked envelope (code `433` = valid report counts per district) that reveals a 13th hidden Zuidoost report.
- Everything is click-driven: label chips to relabel a card, a toggle button to flag/unflag a duplicate, an envelope code box, click-to-select/click-to-place tokens on the map (3 Medical, 4 Power, 2 Transport), and a "Submit This Code" button. The Activity Log is read-only — it just narrates what your clicks did.
- Submitting only wins (`EMERGENCY-COMMAND EXIT UNLOCKED`) when all five conditions hold: labels fixed, duplicates flagged, envelope opened, map allocation exactly matches the answer key, and the map-derived code (`310012020`) matches.

## UX pass (after first playtest)

Playtest feedback: the objective wasn't stated anywhere, key rules only existed as terminal output that scrolled away, the terminal became a wall of hard-to-parse text, report cards were manually padded text instead of a real table, and there was no way to confirm what code a given map layout actually produced. Addressed with:
- A persistent **Objective** banner under the header.
- A **Field Manual** panel (always visible) with the impact rules and a command cheat-sheet, so `rules`/`help` are no longer the only source.
- A live **Emergency Reports** `<table>` (ID/District/Message/AI Label/Current Label/Duplicate) that updates on every `relabel`/`flag-duplicate`/`open-envelope`, with relabeled rows outlined and duplicate rows dimmed/struck-through. `list` now just points at it and flashes it instead of dumping 12+ text lines into the terminal.
- Each terminal command's input + output is now wrapped in its own `.cmd-block` with a colored left border (green/red/teal by outcome), so consecutive commands are visually separated instead of running together.
- A **derived code readout** under the map (`Centrum 310 · Noord 012 · Zuidoost 020 → 310012020`) that live-updates from the current token placement, plus a **"Submit This Code"** button that submits it directly — closing the loop between "I placed tokens" and "here's what to type," without revealing whether it's actually correct.

## Second UX pass (after second playtest)

Three more pieces of feedback:
1. **"11 reports but only ~10 tokens — 2 mislabeled + 1 unallocated?"** Checked the real math: supply is 9 tokens total (3+4+2), and if every one of the 11 valid reports got its full rule-based need, demand would be 13 (5 Medical, 6 Power, 2 Transport). So it's not 1 unallocated report, it's **3** — one of C2/C3 (Power), Z1 (Power), and N1 (the insulin case — correctly escalates to 2 Medical but Centrum's C1+C4 already use all 3). That's the deliberate "too few teams for every verified need" tension from the original brief, so the fix was to add an explicit Field Manual bullet explaining it's expected, not a bug — no data/answer-key changes.
2. **Flagging a duplicate was one-way, no undo.** Fixed as part of #3 below — the duplicate flag is now a toggle button.
3. **Terminal felt redundant/in the way.** Replaced typed commands entirely with click controls: label chips per report row (relabel), a toggle button per row (flag/unflag duplicate, now reversible), a small code-input widget for the backup envelope, and a "Get a Hint" button. The terminal is now a read-only **Activity Log** — no input line, no typed commands — that just narrates what each click did, grouped into the same colored blocks as before.

## Third UX pass (after third playtest)

Three more issues:
1. **"No way of telling if I've done anything right."** Added a live **progress checklist** (4 items: misclassified reports corrected, duplicates flagged, envelope unlocked, teams allocated correctly) above the code readout, plus an "N of 4 requirements met" status line. Items check off in real time as the corresponding condition becomes true — binary per category, no partial counts or per-card hints, so it gives real affirmative feedback without leaking which specific card/allocation is right.
2. **"The backup envelope is impossible to understand — why is it there, why unlock it?"** Added an explainer paragraph next to the widget: it's a recovered backup log, the code is each district's valid (deduplicated) report count in order, and an unusually low count is the tell for where it's needed — without naming which district that turns out to be.
3. **"Correct code but something else missing gives the same error message."** `submitCode()` now shares one `computeWinConditions()` function with the checklist and reports exactly which categories are still unmet (e.g. "still missing: response teams allocated correctly") instead of a flat "chaos" message. This is safe to do because a fully-checked list is mathematically guaranteed to submit the correct code (it's derived from the same map state), so there's no remaining failure mode the message could leak beyond what the checklist already shows.

## Bug found and fixed during testing

Original click logic let a token type get "stuck selected": once its tray count hit 0 while still selected, clicking the tray icon and clicking any slot both became no-ops — a near-guaranteed soft-lock, since the winning allocation uses every unit of every type. Reworked the logic so:
- Clicking the tray icon of the currently selected type always deselects (no longer blocked once remaining hits 0).
- Clicking a slot only adds when its type is selected *and* capacity remains; otherwise it always removes a token if one is placed there — regardless of what's currently selected.

## Verification

No local browser-automation tooling existed in the repo, so a throwaway test harness was set up outside the repo (scratch dir, not committed): headless Chrome launched via CDP, driven with `playwright-core` (no browser download needed — connected to the already-installed Chrome). Confirmed across three rounds:
- Every click interaction (label chips, duplicate toggle including undo, envelope widget with wrong/right code, hint button, map tokens, submit button) works and matches the answer key logic.
- Full win path end-to-end using only clicks, and only when all five win conditions are actually met.
- The soft-lock scenario (all 8 units placed, one type still selected) no longer blocks removing/moving tokens.
- No `#terminal-input` remains in the DOM; the Activity Log only ever receives entries from click actions.
- No console errors during any run.
