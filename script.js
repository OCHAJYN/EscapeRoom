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

const CORRECT_ALLOCATION = {
  Centrum: { Medical: 3, Power: 1, Transport: 0 },
  Noord: { Medical: 0, Power: 1, Transport: 2 },
  Zuidoost: { Medical: 0, Power: 2, Transport: 0 },
};

const DISTRICTS = ["Centrum", "Noord", "Zuidoost"];
const TYPES = ["Medical", "Power", "Transport"];

const HINT_TEXT = "Hint: compare each district's valid report count to the average across all three districts.";

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

function districtCode(district) {
  const p = state.placed[district];
  return "" + p.Medical + p.Power + p.Transport;
}

function computeDerivedCode() {
  return DISTRICTS.map(districtCode).join("");
}

// Single source of truth for win-readiness, shared by the checklist display
// and the actual submit check — a fully-checked list is always winnable,
// since the code is derived directly from `placed`, not typed separately.
function computeWinConditions() {
  return {
    labels:
      findCard("C1")?.currentLabel === "Medical" &&
      findCard("C4")?.currentLabel === "Medical" &&
      findCard("N1")?.currentLabel === "Medical",
    duplicates: findCard("N4")?.isDuplicate === true && findCard("Z3")?.isDuplicate === true,
    envelope: state.envelopeOpened,
    allocation: DISTRICTS.every((d) => TYPES.every((t) => state.placed[d][t] === CORRECT_ALLOCATION[d][t])),
  };
}

// ---------- DOM refs ----------

const logEl = document.getElementById("log");
const trayEl = document.getElementById("tray");
const districtsEl = document.getElementById("districts");
const reportsPanelEl = document.getElementById("reports-panel");
const reportsTbodyEl = document.getElementById("reports-tbody");
const codeBreakdownEl = document.getElementById("code-breakdown");
const codeValueEl = document.getElementById("code-value");
const submitCodeBtn = document.getElementById("submit-code-btn");
const envelopeWidgetEl = document.getElementById("envelope-widget");
const envelopeInputEl = document.getElementById("envelope-code-input");
const envelopeUnlockBtn = document.getElementById("envelope-unlock-btn");
const envelopeStatusEl = document.getElementById("envelope-status");
const hintBtn = document.getElementById("hint-btn");
const checklistEl = document.getElementById("checklist");
const submitStatusEl = document.getElementById("submit-status");

// ---------- Activity Log rendering ----------

let currentBlock = null;
let currentBlockOutcome = "neutral";

function appendLine(container, text, cls) {
  const div = document.createElement("div");
  div.className = "log-line" + (cls ? " " + cls : "");
  div.textContent = text;
  container.appendChild(div);
}

function log(text, cls) {
  appendLine(currentBlock || logEl, text, cls);
  if (cls === "error") currentBlockOutcome = "error";
  else if (cls === "success" && currentBlockOutcome !== "error") currentBlockOutcome = "success";
  logEl.scrollTop = logEl.scrollHeight;
}

// Groups every log() call made inside fn into one visually-bordered block,
// colored by the most severe outcome logged (error > success > neutral).
function runAction(fn) {
  currentBlock = document.createElement("div");
  currentBlock.className = "log-block";
  logEl.appendChild(currentBlock);
  currentBlockOutcome = "neutral";

  fn();

  currentBlock.classList.add("outcome-" + currentBlockOutcome);
  currentBlock = null;
  logEl.scrollTop = logEl.scrollHeight;
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

function renderCodeReadout() {
  codeBreakdownEl.textContent =
    "Centrum " + districtCode("Centrum") +
    " · Noord " + districtCode("Noord") +
    " · Zuidoost " + districtCode("Zuidoost");
  codeValueEl.textContent = computeDerivedCode();
}

function renderChecklist() {
  const conditions = computeWinConditions();
  let doneCount = 0;
  checklistEl.querySelectorAll(".checklist-item").forEach((itemEl) => {
    const key = itemEl.dataset.key;
    const done = !!conditions[key];
    if (done) doneCount++;
    itemEl.classList.toggle("done", done);
    itemEl.querySelector(".check-icon").textContent = done ? "✓" : "○";
  });

  if (state.won) {
    submitStatusEl.textContent = "";
  } else if (doneCount === 4) {
    submitStatusEl.textContent = "All requirements met — ready to submit.";
    submitStatusEl.className = "submit-status ready";
  } else {
    submitStatusEl.textContent = doneCount + " of 4 requirements met.";
    submitStatusEl.className = "submit-status";
  }

  return conditions;
}

function renderAll() {
  renderTray();
  renderDistricts();
  renderCodeReadout();
  renderChecklist();
}

// ---------- Reports table rendering ----------

function renderReportsTable() {
  reportsTbodyEl.innerHTML = "";
  visibleCards().forEach((card) => {
    const tr = document.createElement("tr");
    tr.dataset.cardId = card.id;
    if (card.currentLabel !== card.aiLabel) tr.classList.add("relabeled");
    if (card.isDuplicate) tr.classList.add("duplicate");

    const tdId = document.createElement("td");
    tdId.textContent = card.id;

    const tdDistrict = document.createElement("td");
    tdDistrict.textContent = card.district;

    const tdMsg = document.createElement("td");
    tdMsg.className = "msg-cell";
    tdMsg.textContent = card.message;

    const tdAi = document.createElement("td");
    tdAi.innerHTML = '<span class="label-badge ' + card.aiLabel + '">' + card.aiLabel + "</span>";

    const tdCurrent = document.createElement("td");
    tdCurrent.className = "current-label-cell";
    const chipsWrap = document.createElement("div");
    chipsWrap.className = "label-chips";
    TYPES.forEach((type) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "label-chip " + type + (card.currentLabel === type ? " active" : "");
      chip.dataset.action = "relabel";
      chip.dataset.label = type;
      chip.textContent = type;
      chipsWrap.appendChild(chip);
    });
    tdCurrent.appendChild(chipsWrap);

    const tdDup = document.createElement("td");
    const dupBtn = document.createElement("button");
    dupBtn.type = "button";
    dupBtn.className = "dup-toggle" + (card.isDuplicate ? " flagged" : "");
    dupBtn.dataset.action = "toggle-duplicate";
    dupBtn.textContent = card.isDuplicate ? "Duplicate — undo" : "Flag duplicate";
    tdDup.appendChild(dupBtn);

    tr.append(tdId, tdDistrict, tdMsg, tdAi, tdCurrent, tdDup);
    reportsTbodyEl.appendChild(tr);
  });
}

function flashReportsPanel() {
  reportsPanelEl.scrollIntoView({ behavior: "smooth", block: "center" });
  reportsPanelEl.classList.add("flash");
  setTimeout(() => reportsPanelEl.classList.remove("flash"), 900);
}

function flashRow(id) {
  const row = reportsTbodyEl.querySelector('tr[data-card-id="' + id.toUpperCase() + '"]');
  if (!row) return;
  row.classList.add("flash-row");
  setTimeout(() => row.classList.remove("flash-row"), 900);
}

// ---------- Actions ----------

function setCardLabel(id, label) {
  const card = findCard(id);
  if (!card || card.currentLabel === label) return;
  card.currentLabel = label;
  runAction(() => log(card.id + " relabeled to " + label + ".", "success"));
  renderReportsTable();
  flashRow(card.id);
  renderChecklist();
}

function toggleDuplicate(id) {
  const card = findCard(id);
  if (!card) return;
  card.isDuplicate = !card.isDuplicate;
  runAction(() => {
    log(
      card.id + (card.isDuplicate ? " flagged as a duplicate report." : " duplicate flag removed."),
      "success"
    );
  });
  renderReportsTable();
  flashRow(card.id);
  renderChecklist();
}

function unlockEnvelope() {
  if (state.envelopeOpened) return;
  const code = envelopeInputEl.value.trim();
  if (code !== ENVELOPE_CODE) {
    envelopeStatusEl.textContent = "Incorrect code.";
    envelopeStatusEl.className = "envelope-status error";
    runAction(() => log("Envelope code " + (code || "(empty)") + " rejected.", "error"));
    return;
  }
  state.envelopeOpened = true;
  state.hiddenCardRevealed = true;
  state.hiddenCard = { ...HIDDEN_CARD, currentLabel: HIDDEN_CARD.aiLabel, isDuplicate: false };

  envelopeStatusEl.textContent = "Unlocked ✓";
  envelopeStatusEl.className = "envelope-status success";
  envelopeInputEl.disabled = true;
  envelopeUnlockBtn.disabled = true;
  envelopeWidgetEl.classList.add("unlocked");

  runAction(() => {
    log("Envelope unlocked.", "success");
    log("Backup report " + state.hiddenCard.id + " recovered:");
    log('"' + state.hiddenCard.message + '"');
  });
  renderReportsTable();
  flashReportsPanel();
  renderChecklist();
}

function showHint() {
  runAction(() => log(HINT_TEXT, "system"));
}

const CHECKLIST_LABELS = {
  labels: "misclassified reports corrected",
  duplicates: "duplicate reports flagged",
  envelope: "backup envelope unlocked",
  allocation: "response teams allocated correctly",
};

function submitCode() {
  const code = computeDerivedCode();
  const conditions = computeWinConditions();
  const missing = Object.keys(conditions).filter((k) => !conditions[k]);

  runAction(() => {
    log("submit-code " + code);
    if (missing.length === 0) {
      state.won = true;
      log("EMERGENCY-COMMAND EXIT UNLOCKED", "success");
      log("The response teams are deployed. Storm protocol complete.", "success");
      renderAll();
    } else {
      log(
        "Not ready yet — still missing: " + missing.map((k) => CHECKLIST_LABELS[k]).join(", ") + ".",
        "error"
      );
    }
  });
}

// ---------- Interaction wiring ----------

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

submitCodeBtn.addEventListener("click", submitCode);

reportsTbodyEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const row = btn.closest("tr");
  const cardId = row.dataset.cardId;
  if (btn.dataset.action === "relabel") {
    setCardLabel(cardId, btn.dataset.label);
  } else if (btn.dataset.action === "toggle-duplicate") {
    toggleDuplicate(cardId);
  }
});

envelopeUnlockBtn.addEventListener("click", unlockEnvelope);
envelopeInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") unlockEnvelope();
});

hintBtn.addEventListener("click", showHint);

// ---------- Init ----------

appendLine(logEl, "City AI dashboard online. Storm response protocol active.", "system");
renderReportsTable();
renderAll();
