# Claude Code Prompt — "The City Pulse" Escape Room Prototype

Copy everything below into Claude Code as the initial task.

---

## Goal

Build a working single-page web app prototype for an escape-room puzzle called **"The City Pulse"**. Players audit AI-classified emergency reports, fix data-quality errors, and allocate emergency response units on a city map. Entering the correct allocation as a 9-digit code wins the room.

Build this as a **single-page app** (plain HTML/CSS/JS is fine — no build tooling needed, keep it simple and runnable by opening `index.html`). Two panels side by side:

- **Left: Map panel** — three districts (Centrum, Noord, Zuidoost) shown as distinct zones. Each district has three drop slots: Medical, Power, Transport. Players place unit tokens onto district slots (drag-and-drop, or click-to-select-then-click-to-place — pick whichever is simpler to implement well).
- **Right: Terminal panel** — a command-line-style interface. Supports commands to list report cards, view a card's detail, relabel a card, flag a card as a duplicate, view current unit inventory, view rules/hints, and submit the final code. Output is appended like a terminal log.

---

## Game Data (canonical — use exactly this)

### Available units
- Medical units: 3
- Power repair teams: 4
- Transport teams: 2

### The 12 report cards

| Card | District | Message | AI label |
|---|---|---|---|
| C1 | Centrum | "My father's oxygen machine stopped after a power cut near Dam Square." | Power |
| C2 | Centrum | "A sparking cable has fallen onto the road near Nieuwmarkt." | Power |
| C3 | Centrum | "The traffic lights at the busy crossing near Centraal Station have stopped working." | Power |
| C4 | Centrum | "An elderly resident near Waterlooplein is unresponsive and needs urgent help." | Transport |
| N1 | Noord | "I have no insulin left and cannot reach the clinic across the IJ." | Transport |
| N2 | Noord | "A fallen cable is sparking near the Buiksloterweg ferry terminal." | Power |
| N3 | Noord | "The free GVB ferry is not running. People cannot reach the evacuation centre." | Transport |
| N4 | Noord | "The free GVB ferry is not running. People cannot reach the evacuation centre." | Transport |
| Z1 | Zuidoost | "Several streetlights near Bijlmer ArenA have gone out after the storm." | Power |
| Z2 | Zuidoost | "A resident at the Gaasperplas care home has chest pains and needs an ambulance." | Medical |
| Z3 | Zuidoost | "Several streetlights near Bijlmer ArenA have gone out after the storm." | Power |
| Z4 | Zuidoost | "The tram to Amstel station is cancelled, but buses are still running." | Transport |

### Data-quality flaws players must find

**3 wrong AI labels** (players use a `relabel` command to fix these):
- C1: Power → should be **Medical** (oxygen machine is the life-threatening issue)
- C4: Transport → should be **Medical** (unresponsive resident needs urgent help)
- N1: Transport → should be **Medical** (running out of insulin is medical; transport is just the barrier)

**2 duplicate pairs** (players use a `flag-duplicate` command; the duplicate does not count toward valid reports):
- N3 and N4 are identical → remove N4
- Z1 and Z3 are identical → remove Z3

**Missing/hidden report** (unlocked only after players notice Zuidoost is underrepresented and correctly enter the envelope code — see below):
- Zuidoost backup report: "The pumping station near Gaasperplas has lost power. Water is rising towards nearby homes." → this is a **Power** problem requiring 2 Power teams (flood risk).

### Backup envelope

- After deduplication, valid report counts are: Centrum 4, Noord 3, Zuidoost 3.
- The envelope lock code is **433** (the valid report counts in district order: Centrum, Noord, Zuidoost).
- Entering `open-envelope 433` in the terminal reveals the hidden Zuidoost pumping-station report above.
- Wrong codes should give a generic "incorrect" response, not a hint.

### Impact rules (general principles, not a per-report lookup table)

Base rule: any report that describes an actionable problem needs **1 unit** of the matching type. A report that only describes an inconvenience with a working alternative already in place needs **0 units**.

Escalation rules — these override the base rule and require **2 units** instead of 1:
- A **medical** report involving life-sustaining equipment or medication requires 2 medical units.
- A **power** incident involving flooding risk requires 2 power crews.
- A **transport** failure affecting access to an evacuation centre requires 2 transport teams.

Show exactly these three bullets (plus the 1-unit base rule) via the `rules` command — don't expose a per-card answer table to the player.

**Important design note — read before implementing validation:** applying these principles strictly to every actionable card produces *more* demand than the city has units for. For example, in Centrum alone, C2 (sparking cable) and C3 (traffic lights) are each independent 1-Power incidents, i.e. 2 Power needed — plus Noord's N2 (1 Power) and the hidden Zuidoost flood report (2 Power) — totals 5 Power against only 4 available. This is intentional: it's the same "too few teams for every verified need" scarcity tension described in the ethical-tension section of the original draft, and it means players can't mechanically compute the one correct allocation purely from the rules — some 1-unit needs simply won't get met.

Because of that, **the terminal must validate the final allocation against the fixed answer key below, not by re-deriving it from the rules.** The rules exist so players can understand *why* certain reports are worth prioritizing (e.g. why flood risk or evacuation access outranks a traffic light), not as a formula the app applies automatically. If you want the rules to be fully mechanically sufficient instead (so the app could theoretically verify any allocation that satisfies them, not just this one fixed answer), that's a bigger design change — flag it back to me rather than silently altering the answer key.

### Correct final allocation

| District | Medical | Power | Transport |
|---|---|---|---|
| Centrum | 3 | 1 | 0 |
| Noord | 0 | 1 | 2 |
| Zuidoost | 0 | 2 | 0 |

This uses all 3 Medical, all 4 Power, all 2 Transport units — no leftovers, no shortfalls.

### Final code

Format: `Medical–Power–Transport` per district, concatenated Centrum → Noord → Zuidoost.

Correct code: **310012020**

Players submit it via a `submit-code 310012020` terminal command (or equivalent), checked against both (a) the digit string and (b) the actual tokens placed on the map — the map state and the typed code should agree, i.e. don't let players win by just typing the code without placing tokens correctly, and don't let token placement alone win without the terminal confirming it. Validate both.

---

## Terminal commands to support (minimum set)

- `list` — show all 12 cards with ID, district, message, current label
- `show <card_id>` — show one card's full detail
- `relabel <card_id> <new_label>` — change a card's label (Medical/Power/Transport)
- `flag-duplicate <card_id>` — mark a card as a duplicate (excludes it from valid counts)
- `inventory` — show remaining unplaced units by type
- `rules` — show the impact rules table
- `open-envelope <code>` — attempt to unlock the Zuidoost backup report
- `submit-code <code>` — check the final code against both the typed digits and current map token state
- `hint` — optional, give a soft nudge (e.g. "Check Zuidoost's report count against the other districts")
- `help` — list all commands

## Map/token requirements

- 3 districts, each with 3 labeled slots (Medical/Power/Transport).
- A token tray showing remaining unplaced units (3 Medical, 4 Power, 2 Transport at start).
- Players can place a token into a slot and remove/move it back to the tray.
- Prevent placing more tokens of a type than are available in total.
- Visually reflect current placement clearly (e.g. numbers or stacked icons per slot).

## Win condition

Win screen/state triggers only when:
1. All three mislabeled cards have been corrected via `relabel`.
2. Both duplicate cards have been flagged via `flag-duplicate`.
3. The envelope has been opened with the correct code (`433`).
4. The map token placement exactly matches the correct allocation table above.
5. The typed final code matches `310012020`.

On win, show a clear success message in the terminal (e.g. "EMERGENCY-COMMAND EXIT UNLOCKED") and visually indicate success on the map.

---

## Scope for this first pass

Build the **full loop end-to-end** — cards, terminal commands, map + tokens, and code validation — but keep the implementation as simple as possible (plain HTML/CSS/JS, no framework, no backend, no persistence needed beyond in-memory state). Don't add difficulty variants, sound, animations, or additional districts/categories yet — that comes later. Prioritize a working, testable full loop over polish.
