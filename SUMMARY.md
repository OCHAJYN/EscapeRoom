# The City Pulse — Build Summary

Prototype built from the spec in `city-pulse-claude-code-prompt.md`. Plain HTML/CSS/JS, no build tooling — open `index.html` in a browser to play.

## Files

- `index.html` — page shell: map panel (left) + terminal panel (right)
- `style.css` — dark city-map / terminal styling for both panels
- `script.js` — all game data, state, and logic

## What it does

- 12 report cards (Centrum/Noord/Zuidoost) with AI labels, 3 of them wrong (C1, C4, N1 should be Medical).
- Two duplicate pairs (N3/N4, Z1/Z3) to flag.
- A locked envelope (code `433` = valid report counts per district) that reveals a 13th hidden Zuidoost report.
- Terminal commands: `list`, `show`, `relabel`, `flag-duplicate`, `inventory`, `rules`, `open-envelope`, `submit-code`, `hint`, `help`.
- Click-to-select / click-to-place token allocation on the map (3 Medical, 4 Power, 2 Transport).
- `submit-code` only wins (`EMERGENCY-COMMAND EXIT UNLOCKED`) when all five conditions hold: labels fixed, duplicates flagged, envelope opened, map allocation exactly matches the answer key, and the typed code (`310012020`) matches.

## Bug found and fixed during testing

Original click logic let a token type get "stuck selected": once its tray count hit 0 while still selected, clicking the tray icon and clicking any slot both became no-ops — a near-guaranteed soft-lock, since the winning allocation uses every unit of every type. Reworked the logic so:
- Clicking the tray icon of the currently selected type always deselects (no longer blocked once remaining hits 0).
- Clicking a slot only adds when its type is selected *and* capacity remains; otherwise it always removes a token if one is placed there — regardless of what's currently selected.

## Verification

No local browser-automation tooling existed in the repo, so a throwaway test harness was set up outside the repo (scratch dir, not committed): headless Chrome launched via CDP, driven with `playwright-core` (no browser download needed — connected to the already-installed Chrome). Confirmed:
- All 10 terminal commands behave as specified, including generic rejection on wrong envelope/submit codes.
- Full win path: fix labels → flag duplicates → open envelope → allocate correct tokens → submit code → win triggers, and only at that point.
- The soft-lock scenario (all 8 units placed, one type still selected) no longer blocks removing/moving tokens.
- No console errors during the run.
