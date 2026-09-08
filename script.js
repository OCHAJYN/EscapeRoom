// ---------- Game data (canonical) ----------

const UNITS_TOTAL = { Medical: 3, Power: 4, Transport: 2 };

const CARDS = [
  { id: "C1", district: "Centrum", message: "My father's oxygen machine stopped after a power cut near Dam Square.", aiLabel: "Power" },
  { id: "C2", district: "Centrum", message: "A sparking cable has fallen onto the road near Nieuwmarkt.", aiLabel: "Power" },
  { id: "C3", district: "Centrum", message: "The traffic lights at the busy crossing near Centraal Station have stopped working.", aiLabel: "Power" },
  { id: "C4", district: "Centrum", message: "An elderly resident near Waterlooplein is unresponsive and needs urgent help.", aiLabel: "Transport" },
  { id: "N1", district: "Noord", message: "I have no insulin left and cannot reach the clinic across the IJ.", aiLabel: "Transport" },
  { id: "N2", district: "Noord", message: "A fallen cable is sparking near the Buiksloterweg ferry terminal.", aiLabel: "Power" },
  { id: "N3", district: "Noord", message: "The free GVB ferry is not running. People cannot reach the evacuation centre.", aiLabel: "Transport" },
  { id: "N4", district: "Noord", message: "The free GVB ferry is not running. People cannot reach the evacuation centre.", aiLabel: "Transport" },
  { id: "Z1", district: "Zuidoost", message: "Several streetlights near Bijlmer ArenA have gone out after the storm.", aiLabel: "Power" },
  { id: "Z2", district: "Zuidoost", message: "A resident at the Gaasperplas care home has chest pains and needs an ambulance.", aiLabel: "Medical" },
  { id: "Z3", district: "Zuidoost", message: "Several streetlights near Bijlmer ArenA have gone out after the storm.", aiLabel: "Power" },
  { id: "Z4", district: "Zuidoost", message: "The tram to Amstel station is cancelled, but buses are still running.", aiLabel: "Transport" },
];

const HIDDEN_CARD = {
  id: "Z5",
  district: "Zuidoost",
  message: "The pumping station near Gaasperplas has lost power. Water is rising towards nearby homes.",
  aiLabel: "Power",
};

const ENVELOPE_CODE = "433";
const FINAL_CODE = "310012020";

const CORRECT_ALLOCATION = {
  Centrum: { Medical: 3, Power: 1, Transport: 0 },
  Noord: { Medical: 0, Power: 1, Transport: 2 },
  Zuidoost: { Medical: 0, Power: 2, Transport: 0 },
};

const DISTRICTS = ["Centrum", "Noord", "Zuidoost"];
const TYPES = ["Medical", "Power", "Transport"];

// ---------- Mutable state ----------

const state = {
  cards: CARDS.map((c) => ({ ...c, currentLabel: c.aiLabel, isDuplicate: false })),
  hiddenCardRevealed: false,
  hiddenCard: null,
  envelopeOpened: false,
  placed: {
    Centrum: { Medical: 0, Power: 0, Transport: 0 },
    Noord: { Medical: 0, Power: 0, Transport: 0 },
    Zuidoost: { Medical: 0, Power: 0, Transport: 0 },
  },
  selectedType: null,
  won: false,
};

function visibleCards() {
  return state.hiddenCardRevealed ? [...state.cards, state.hiddenCard] : state.cards;
}

function findCard(id) {
  const upper = id.toUpperCase();
  return visibleCards().find((c) => c.id === upper);
}

function placedTotal(type) {
  return DISTRICTS.reduce((sum, d) => sum + state.placed[d][type], 0);
}

function remaining(type) {
  return UNITS_TOTAL[type] - placedTotal(type);
}

// ---------- DOM refs ----------

const logEl = document.getElementById("log");
const inputEl = document.getElementById("terminal-input");
const trayEl = document.getElementById("tray");
const districtsEl = document.getElementById("districts");

// ---------- Terminal rendering ----------

function log(text, cls) {
  const div = document.createElement("div");
  div.className = "log-line" + (cls ? " " + cls : "");
  div.textContent = text;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function logBlock(lines, cls) {
  lines.forEach((line) => log(line, cls));
}

// ---------- Map rendering ----------

function renderTray() {
  TYPES.forEach((type) => {
    const rem = remaining(type);
    document.getElementById("tray-count-" + type).textContent = rem;
    const tokenEl = trayEl.querySelector('.tray-token[data-type="' + type + '"]');
    tokenEl.classList.toggle("empty", rem <= 0);
    tokenEl.classList.toggle("selected", state.selectedType === type);
  });
}

function renderDistricts() {
  DISTRICTS.forEach((district) => {
    const districtEl = districtsEl.querySelector('[data-district="' + district + '"]');
    TYPES.forEach((type) => {
      const count = state.placed[district][type];
      const slotEl = districtEl.querySelector('.slot[data-type="' + type + '"]');
      slotEl.querySelector(".slot-count").textContent = count;
      slotEl.classList.toggle("filled", count > 0);
    });
    districtEl.classList.toggle("solved", state.won);
  });
}

function renderAll() {
  renderTray();
  renderDistricts();
}

// ---------- Map interaction ----------

trayEl.addEventListener("click", (e) => {
  const tokenEl = e.target.closest(".tray-token");
  if (!tokenEl) return;
  const type = tokenEl.dataset.type;
  if (state.selectedType === type) {
    state.selectedType = null;
  } else {
    if (remaining(type) <= 0) return;
    state.selectedType = type;
  }
  renderTray();
});

districtsEl.addEventListener("click", (e) => {
  const slotEl = e.target.closest(".slot");
  if (!slotEl) return;
  const districtEl = e.target.closest(".district");
  const district = districtEl.dataset.district;
  const type = slotEl.dataset.type;

  if (state.selectedType === type && remaining(type) > 0) {
    state.placed[district][type]++;
  } else if (state.placed[district][type] > 0) {
    state.placed[district][type]--;
  }
  renderAll();
});

// ---------- Command implementations ----------

function cmdList() {
  const cards = visibleCards();
  log("ID    DISTRICT    LABEL        DUP  MESSAGE", "system");
  cards.forEach((c) => {
    const id = c.id.padEnd(6);
    const district = c.district.padEnd(12);
    const label = c.currentLabel.padEnd(13);
    const dup = (c.isDuplicate ? "yes" : "no").padEnd(5);
    log(id + district + label + dup + c.message);
  });
}

function cmdShow(args) {
  if (!args[0]) return log("Usage: show <card_id>", "error");
  const card = findCard(args[0]);
  if (!card) return log("No such card: " + args[0], "error");
  log("Card " + card.id + " — " + card.district);
  log('"' + card.message + '"');
  log("AI label: " + card.aiLabel + " | Current label: " + card.currentLabel + " | Duplicate: " + (card.isDuplicate ? "yes" : "no"));
}

function cmdRelabel(args) {
  const [id, rawLabel] = args;
  if (!id || !rawLabel) return log("Usage: relabel <card_id> <Medical|Power|Transport>", "error");
  const label = TYPES.find((t) => t.toLowerCase() === rawLabel.toLowerCase());
  if (!label) return log("Invalid label. Use Medical, Power, or Transport.", "error");
  const card = findCard(id);
  if (!card) return log("No such card: " + id, "error");
  card.currentLabel = label;
  log(card.id + " relabeled to " + label + ".", "success");
}

function cmdFlagDuplicate(args) {
  if (!args[0]) return log("Usage: flag-duplicate <card_id>", "error");
  const card = findCard(args[0]);
  if (!card) return log("No such card: " + args[0], "error");
  card.isDuplicate = true;
  log(card.id + " flagged as a duplicate report.", "success");
}

function cmdInventory() {
  TYPES.forEach((type) => {
    log(type + ": " + remaining(type) + " / " + UNITS_TOTAL[type] + " remaining");
  });
}

function cmdRules() {
  logBlock([
    "IMPACT RULES",
    "- Base rule: an actionable report needs 1 unit of the matching type. A mere inconvenience with a working alternative needs 0 units.",
    "- A medical report involving life-sustaining equipment or medication requires 2 medical units.",
    "- A power incident involving flooding risk requires 2 power crews.",
    "- A transport failure affecting access to an evacuation centre requires 2 transport teams.",
  ]);
}

function cmdOpenEnvelope(args) {
  if (state.envelopeOpened) return log("The envelope is already open.", "system");
  const code = args[0];
  if (!code) return log("Usage: open-envelope <code>", "error");
  if (code !== ENVELOPE_CODE) return log("Incorrect code.", "error");
  state.envelopeOpened = true;
  state.hiddenCardRevealed = true;
  state.hiddenCard = { ...HIDDEN_CARD, currentLabel: HIDDEN_CARD.aiLabel, isDuplicate: false };
  log("Envelope unlocked.", "success");
  log("Backup report " + state.hiddenCard.id + " recovered:");
  log('"' + state.hiddenCard.message + '"');
}

function cmdSubmitCode(args) {
  const code = args[0];
  if (!code) return log("Usage: submit-code <code>", "error");

  const labelsFixed =
    findCard("C1")?.currentLabel === "Medical" &&
    findCard("C4")?.currentLabel === "Medical" &&
    findCard("N1")?.currentLabel === "Medical";

  const duplicatesFlagged =
    findCard("N4")?.isDuplicate === true && findCard("Z3")?.isDuplicate === true;

  const allocationMatches = DISTRICTS.every((d) =>
    TYPES.every((t) => state.placed[d][t] === CORRECT_ALLOCATION[d][t])
  );

  const codeMatches = code === FINAL_CODE;

  if (labelsFixed && duplicatesFlagged && state.envelopeOpened && allocationMatches && codeMatches) {
    state.won = true;
    log("EMERGENCY-COMMAND EXIT UNLOCKED", "success");
    log("The response teams are deployed. Storm protocol complete.", "success");
    renderAll();
  } else {
    log("Incorrect. The city remains in chaos.", "error");
  }
}

function cmdHint() {
  log("Hint: compare each district's valid report count to the average across all three districts.", "system");
}

function cmdHelp() {
  logBlock([
    "COMMANDS",
    "list — show all known report cards",
    "show <id> — show one card's full detail",
    "relabel <id> <label> — change a card's classification",
    "flag-duplicate <id> — mark a card as a duplicate",
    "inventory — show remaining unplaced units",
    "rules — show the impact rules",
    "open-envelope <code> — attempt to unlock the backup report",
    "submit-code <code> — submit the final response code",
    "hint — get a soft nudge",
    "help — show this list",
  ]);
}

const COMMANDS = {
  list: cmdList,
  show: cmdShow,
  relabel: cmdRelabel,
  "flag-duplicate": cmdFlagDuplicate,
  inventory: cmdInventory,
  rules: cmdRules,
  "open-envelope": cmdOpenEnvelope,
  "submit-code": cmdSubmitCode,
  hint: cmdHint,
  help: cmdHelp,
};

function runCommand(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return;
  log(trimmed, "input");
  const [cmd, ...args] = trimmed.split(/\s+/);
  const handler = COMMANDS[cmd.toLowerCase()];
  if (!handler) {
    log("Unknown command: " + cmd + ". Type 'help' for a list of commands.", "error");
    return;
  }
  handler(args);
}

// ---------- Init ----------

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const value = inputEl.value;
    inputEl.value = "";
    runCommand(value);
  }
});

log("City AI dashboard online. Storm response protocol active.", "system");
log("Type 'help' to see available commands.", "system");
renderAll();
