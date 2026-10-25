const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const screenHome = document.getElementById("screenHome");
const screenLobby = document.getElementById("screenLobby");
const screenControls = document.getElementById("screenControls");
const pickDesktop = document.getElementById("pickDesktop");
const pickMobile = document.getElementById("pickMobile");
const joystickZone = document.getElementById("joystickZone");
const joystickBase = document.getElementById("joystickBase");
const joystickKnob = document.getElementById("joystickKnob");
const endCard = document.querySelector(".end-card");
const hudTop = document.getElementById("hudTop");
const endScreen = document.getElementById("endScreen");
const endTitle = document.getElementById("endTitle");
const endMessage = document.getElementById("endMessage");
const endHomeBtn = document.getElementById("endHomeBtn");
const nameInput = document.getElementById("name");
const roomCodeInput = document.getElementById("roomCode");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const startBtn = document.getElementById("startBtn");
const leaveLobbyBtn = document.getElementById("leaveLobbyBtn");
const homeError = document.getElementById("homeError");
const lobbyError = document.getElementById("lobbyError");
const lobbyCodeEl = document.getElementById("lobbyCode");
const playerList = document.getElementById("playerList");
const lobbyStatus = document.getElementById("lobbyStatus");
const colorPicker = document.getElementById("colorPicker");
const hostSettings = document.getElementById("hostSettings");
const impostorSelect = document.getElementById("impostorSelect");
const timerSelect = document.getElementById("timerSelect");
const powersEnabledCheck = document.getElementById("powersEnabled");
const powerHostSettings = document.getElementById("powerHostSettings");
const powerPickerSection = document.getElementById("powerPickerSection");
const powerPickerHint = document.getElementById("powerPickerHint");
const powerDisabledMsg = document.getElementById("powerDisabledMsg");
const powerCooldownInfo = document.getElementById("powerCooldownInfo");
const roomHud = document.getElementById("roomHud");
const roleHud = document.getElementById("roleHud");
const timerHud = document.getElementById("timerHud");
const aliveHud = document.getElementById("aliveHud");
const killBtn = document.getElementById("killBtn");
const powerPicker = document.getElementById("powerPicker");
const powerBar = document.getElementById("powerBar");

const COLOR_OPTIONS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

const VIEW_RADIUS = 340;
const VIEW_RADIUS_BOOST = 130;
const VISION_EXTRA_WALLS = 1;
const KILL_RANGE = 52;

const POWER_CATALOG = {
  portal: {
    emoji: "🌀",
    name: "Portail",
    hint: "1er clic : pose — 2e : téléporte",
  },
  invisible: {
    emoji: "👻",
    name: "Invisibilité",
    hint: "Invisible 4 secondes",
  },
  speed: {
    emoji: "⚡",
    name: "Rapidité",
    hint: "Vitesse x1.4 pendant 4s",
  },
  vision: {
    emoji: "👁️",
    name: "Vision",
    hint: "Plus loin + voir à travers 1 mur (4s)",
  },
  dash: {
    emoji: "💨",
    name: "Dash",
    hint: "Saut court devant toi (sans traverser les murs)",
  },
  disguise: {
    emoji: "🎭",
    name: "Déguisement",
    hint: "Couleur et pseudo d’un autre joueur (4s)",
  },
  freeze: {
    emoji: "🧊",
    name: "Gel",
    hint: "Gèle les joueurs proches 2s (pas toi)",
  },
};

const POWER_ORDER = [
  "portal",
  "invisible",
  "speed",
  "vision",
  "dash",
  "disguise",
  "freeze",
];

function isOnlineHosted() {
  const h = window.location.hostname;
  return h !== "localhost" && h !== "127.0.0.1";
}

const JOIN_WAIT_MS = isOnlineHosted() ? 25000 : 8000;

const socket = io({
  reconnection: isOnlineHosted(),
  reconnectionAttempts: 15,
  reconnectionDelay: 1500,
  timeout: 25000,
});

function connectionHelpMessage() {
  if (isOnlineHosted()) {
    return "Connexion impossible pour l’instant. Sur Vercel le serveur peut mettre 10–20 s à démarrer : recharge la page puis réessaie.";
  }
  return "Pas de connexion au serveur. Lance npm start puis réessaie.";
}

function joinTimeoutMessage() {
  if (isOnlineHosted()) {
    return "Pas de réponse (serveur en ligne lent ou en veille). Recharge https://jeux-tawny.vercel.app et réessaie.";
  }
  return "Le serveur ne répond pas. Vérifie qu’il est lancé (npm start).";
}
let joinPending = null;
let myId = null;
let isHost = false;
let roomCode = null;
let myRole = null;
let myColor = COLOR_OPTIONS[0];
let phase = "home";
let state = null;
let lobbyData = null;
let keys = {};
let mouse = { x: 0, y: 0 };
let killPressed = false;
let camera = { x: 0, y: 0 };
let visibility = null;
let controlMode = null;
let myPowers = {
  portal: true,
  invisible: true,
  speed: true,
  vision: false,
  dash: false,
  disguise: false,
  freeze: false,
};
const joystick = { active: false, vx: 0, vy: 0, pointerId: null };
const JOY_RADIUS = 48;

function getName() {
  return nameInput.value.trim() || "Joueur";
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}

function hideErrors() {
  homeError.classList.add("hidden");
  lobbyError.classList.add("hidden");
}

function setHomeButtonsDisabled(disabled) {
  createBtn.disabled = disabled;
  joinBtn.disabled = disabled;
}

function clearJoinPending() {
  if (joinPending) {
    clearTimeout(joinPending);
    joinPending = null;
  }
  setHomeButtonsDisabled(false);
}

function resetSession() {
  clearJoinPending();
  myId = socket.id;
  isHost = false;
  roomCode = null;
  myRole = null;
  myColor = COLOR_OPTIONS[0];
  state = null;
  lobbyData = null;
  controlMode = null;
  killPressed = false;
  endScreen.classList.add("hidden");
  endCard.classList.remove("victory", "defeat");
}

function powersEnabledInLobby() {
  return lobbyData?.settings?.powersEnabled !== false;
}

function powersFromServer(powers) {
  const next = {};
  for (const id of POWER_ORDER) {
    next[id] = Boolean(powers?.[id]);
  }
  return next;
}

function syncHostPowerSettingsUi() {
  const s = lobbyData?.settings;
  if (!s) return;
  const enabled = s.powersEnabled !== false;
  powersEnabledCheck.checked = enabled;
  powerHostSettings.classList.toggle("disabled", !enabled);
  const cds = s.powerCooldownSec || {};
  for (const id of POWER_ORDER) {
    const el = document.getElementById(`cooldown${id.charAt(0).toUpperCase() + id.slice(1)}`);
    if (el) el.value = String(cds[id] ?? 20);
  }
}

function updatePowerLobbySection() {
  const enabled = powersEnabledInLobby();
  const cds = lobbyData?.settings?.powerCooldownSec;
  powerPickerSection.classList.toggle("disabled", !enabled);
  powerPickerHint.classList.toggle("hidden", !enabled);
  powerDisabledMsg.classList.toggle("hidden", enabled);
  if (!enabled) {
    powerCooldownInfo.classList.add("hidden");
    return;
  }
  if (!isHost && cds) {
    const parts = POWER_ORDER.map((id) => {
      const def = POWER_CATALOG[id];
      return `${def.name.toLowerCase()} ${cds[id] ?? 20}s`;
    });
    powerCooldownInfo.textContent = `Recharge : ${parts.join(" · ")}`;
    powerCooldownInfo.classList.remove("hidden");
  } else {
    powerCooldownInfo.classList.add("hidden");
  }
}

function applyLobbyData(data) {
  if (!data) return;
  lobbyData = data;
  isHost = data.hostId === myId;
  if (data.settings) {
    impostorSelect.value = String(data.settings.impostors);
    timerSelect.value = String(data.settings.timerSec);
    if (isHost) syncHostPowerSettingsUi();
  }
  const me = data.players.find((p) => p.id === myId);
  if (me) {
    myColor = me.color;
    if (me.powers) {
      myPowers = powersFromServer(me.powers);
    }
  }
  updateLobbyUi();
  updatePowerPickerUi();
  updatePowerLobbySection();
}

function showHome() {
  phase = "home";
  screenHome.classList.remove("hidden");
  screenLobby.classList.add("hidden");
  overlay.classList.remove("hidden");
  hudTop.classList.add("hidden");
  endScreen.classList.add("hidden");
  killBtn.classList.add("hidden");
  powerBar.classList.add("hidden");
  joystickZone.classList.add("hidden");
  screenControls.classList.add("hidden");
  controlMode = null;
  clearJoinPending();
}

function leaveToHome() {
  socket.emit("leaveRoom");
  resetSession();
  showHome();
}

function showLobby() {
  phase = "lobby";
  screenHome.classList.add("hidden");
  screenLobby.classList.remove("hidden");
  overlay.classList.remove("hidden");
  hudTop.classList.add("hidden");
  endScreen.classList.add("hidden");
  killBtn.classList.add("hidden");
  powerBar.classList.add("hidden");
  joystickZone.classList.add("hidden");
  screenControls.classList.add("hidden");
}

function showControlPicker() {
  phase = "controlPick";
  screenHome.classList.add("hidden");
  screenLobby.classList.add("hidden");
  screenControls.classList.remove("hidden");
  overlay.classList.remove("hidden");
  hudTop.classList.add("hidden");
  killBtn.classList.add("hidden");
  powerBar.classList.add("hidden");
  joystickZone.classList.add("hidden");
}

function beginWithControlMode(mode) {
  controlMode = mode;
  screenControls.classList.add("hidden");
  overlay.classList.add("hidden");
  joystickZone.classList.toggle("hidden", mode !== "mobile");
  if (mode === "mobile") resetJoystick();
  endScreen.classList.add("hidden");
  buildPowerBar();
  showGame();
  if (state?.gameOver) updateEndScreen(state);
}

function showGame() {
  phase = "playing";
  hudTop.classList.remove("hidden");
  endScreen.classList.add("hidden");
  canvas.focus();
}

function formatTime(ms) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function buildColorPicker() {
  colorPicker.innerHTML = "";
  for (const color of COLOR_OPTIONS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "color-swatch";
    btn.style.background = color;
    btn.dataset.color = color;
    btn.addEventListener("click", () => {
      socket.emit("setColor", color);
    });
    colorPicker.appendChild(btn);
  }
}
buildColorPicker();

function updatePowerPickerUi() {
  document.querySelectorAll(".power-toggle").forEach((btn) => {
    const id = btn.dataset.power;
    btn.classList.toggle("equipped", Boolean(myPowers[id]));
  });
}

function buildPowerPicker() {
  powerPicker.innerHTML = "";
  for (const id of POWER_ORDER) {
    const def = POWER_CATALOG[id];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "power-toggle equipped";
    btn.dataset.power = id;
    btn.innerHTML = `
      <span class="power-emoji">${def.emoji}</span>
      <span class="power-meta">
        <strong>${def.name}</strong>
        <span>${def.hint}</span>
      </span>`;
    btn.addEventListener("click", () => {
      if (!powersEnabledInLobby()) return;
      const next = { ...myPowers, [id]: !myPowers[id] };
      const count = POWER_ORDER.filter((k) => next[k]).length;
      if (count === 0) return;
      myPowers = next;
      updatePowerPickerUi();
      socket.emit("setPowers", myPowers);
    });
    powerPicker.appendChild(btn);
  }
}
buildPowerPicker();

function buildPowerBar() {
  powerBar.innerHTML = "";
  if (state?.powerSettings && state.powerSettings.enabled === false) return;
  if (lobbyData?.settings?.powersEnabled === false) return;
  for (const id of POWER_ORDER) {
    if (!myPowers[id]) continue;
    const def = POWER_CATALOG[id];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "power-btn";
    btn.dataset.power = id;
    btn.textContent = `${def.emoji} ${def.name}`;
    btn.addEventListener("click", () => {
      const me = state?.players?.[myId];
      if (phase !== "playing" || state?.gameOver || !me?.alive || me.frozen) return;
      socket.emit("usePower", id);
    });
    powerBar.appendChild(btn);
  }
}

function updatePowerBarUi(me) {
  const powersOn = state?.powerSettings?.enabled !== false;
  const show =
    powersOn && phase === "playing" && controlMode && me?.alive && !state?.gameOver;
  powerBar.classList.toggle("hidden", !show || powerBar.children.length === 0);
  if (!show) return;
  for (const btn of powerBar.children) {
    const id = btn.dataset.power;
    if (id === "portal") {
      const hasPortal = Boolean(me.portal);
      btn.classList.toggle("portal-ready", hasPortal);
      btn.textContent = hasPortal ? "🌀 Téléporter" : "🌀 Poser portail";
    }
  }
}

pickDesktop.addEventListener("click", () => beginWithControlMode("desktop"));
pickMobile.addEventListener("click", () => beginWithControlMode("mobile"));

function resetJoystick() {
  joystick.active = false;
  joystick.vx = 0;
  joystick.vy = 0;
  joystick.pointerId = null;
  joystickKnob.style.transform = "translate(0px, 0px)";
}

function joystickCenter() {
  const r = joystickBase.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function updateJoystickFromPointer(clientX, clientY) {
  const c = joystickCenter();
  let dx = clientX - c.x;
  let dy = clientY - c.y;
  const dist = Math.hypot(dx, dy);
  if (dist > JOY_RADIUS) {
    dx = (dx / dist) * JOY_RADIUS;
    dy = (dy / dist) * JOY_RADIUS;
  }
  joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  const len = Math.hypot(dx, dy);
  if (len < 6) {
    joystick.vx = 0;
    joystick.vy = 0;
  } else {
    joystick.vx = dx / JOY_RADIUS;
    joystick.vy = dy / JOY_RADIUS;
  }
}

joystickBase.addEventListener("pointerdown", (e) => {
  if (controlMode !== "mobile") return;
  joystick.active = true;
  joystick.pointerId = e.pointerId;
  joystickBase.setPointerCapture(e.pointerId);
  updateJoystickFromPointer(e.clientX, e.clientY);
  e.preventDefault();
});

joystickBase.addEventListener("pointermove", (e) => {
  if (!joystick.active || e.pointerId !== joystick.pointerId) return;
  updateJoystickFromPointer(e.clientX, e.clientY);
  e.preventDefault();
});

function endJoystick(e) {
  if (e.pointerId !== joystick.pointerId) return;
  resetJoystick();
}

joystickBase.addEventListener("pointerup", endJoystick);
joystickBase.addEventListener("pointercancel", endJoystick);

killBtn.addEventListener("click", () => {
  if (!killBtn.classList.contains("ready")) return;
  killPressed = true;
  if (myId && phase === "playing") {
    socket.emit("input", getInput());
  }
});

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

roomCodeInput.addEventListener("input", () => {
  roomCodeInput.value = roomCodeInput.value.replace(/\D/g, "").slice(0, 3);
});

function beginJoinAttempt() {
  clearJoinPending();
  setHomeButtonsDisabled(true);
  joinPending = setTimeout(() => {
    joinPending = null;
    setHomeButtonsDisabled(false);
    if (phase === "home") {
      showError(homeError, joinTimeoutMessage());
    }
  }, JOIN_WAIT_MS);
}

createBtn.addEventListener("click", () => {
  hideErrors();
  if (!socket.connected) {
    showError(homeError, connectionHelpMessage());
    return;
  }
  beginJoinAttempt();
  socket.emit("createRoom", getName());
});

joinBtn.addEventListener("click", () => {
  hideErrors();
  if (!socket.connected) {
    showError(homeError, connectionHelpMessage());
    return;
  }
  const code = roomCodeInput.value.trim();
  if (code.length < 1) {
    showError(homeError, "Entre le code à 3 chiffres.");
    return;
  }
  beginJoinAttempt();
  socket.emit("joinRoom", { code, name: getName() });
});

leaveLobbyBtn.addEventListener("click", () => {
  leaveToHome();
});

endHomeBtn.addEventListener("click", () => {
  leaveToHome();
});

startBtn.addEventListener("click", () => {
  lobbyError.classList.add("hidden");
  socket.emit("startGame");
});

function clampCooldownInput(input) {
  let v = Math.round(Number(input.value));
  if (!Number.isFinite(v)) v = 20;
  v = Math.min(100, Math.max(12, v));
  input.value = String(v);
  return v;
}

function emitSettings() {
  if (!isHost) return;
  socket.emit("updateSettings", {
    impostors: Number(impostorSelect.value),
    timerSec: Number(timerSelect.value),
    powersEnabled: powersEnabledCheck.checked,
    powerCooldownSec: POWER_ORDER.reduce((acc, id) => {
      const el = document.getElementById(`cooldown${id.charAt(0).toUpperCase() + id.slice(1)}`);
      if (el) acc[id] = clampCooldownInput(el);
      return acc;
    }, {}),
  });
}

impostorSelect.addEventListener("change", emitSettings);
timerSelect.addEventListener("change", emitSettings);
powersEnabledCheck.addEventListener("change", () => {
  powerHostSettings.classList.toggle("disabled", !powersEnabledCheck.checked);
  emitSettings();
});
for (const id of POWER_ORDER) {
  const input = document.getElementById(`cooldown${id.charAt(0).toUpperCase() + id.slice(1)}`);
  if (!input) continue;
  input.addEventListener("change", emitSettings);
  input.addEventListener("blur", emitSettings);
}

socket.on("errorMsg", ({ message }) => {
  clearJoinPending();
  if (phase === "home") showError(homeError, message);
  else showError(lobbyError, message);
});

socket.on("joinedRoom", ({ id, code, isHost: host, lobby }) => {
  clearJoinPending();
  myId = id;
  roomCode = code;
  isHost = host;
  state = null;
  myRole = null;
  controlMode = null;
  endScreen.classList.add("hidden");
  lobbyCodeEl.textContent = code;
  roomHud.textContent = `Salle ${code}`;
  roomCodeInput.value = code;
  showLobby();
  applyLobbyData(lobby);
});

socket.on("leftRoom", () => {
  resetSession();
  showHome();
});

socket.on("lobby", (data) => {
  applyLobbyData(data);
  if (data.status === "playing" && (phase === "lobby" || phase === "controlPick") && !myRole) {
    socket.emit("syncGame");
  }
});

socket.on("gameStarted", ({ role }) => {
  clearJoinPending();
  myRole = role;
  state = null;
  controlMode = null;
  roleHud.textContent = role === "impostor" ? "Rôle : Imposteur" : "Rôle : Innocent";
  endScreen.classList.add("hidden");
  endCard.classList.remove("victory", "defeat");
  if (phase === "playing" && controlMode) return;
  showControlPicker();
});

socket.on("disconnect", () => {
  clearJoinPending();
  if (phase !== "home") {
    showError(homeError, "Connexion perdue. Recharge la page pour rejouer.");
    resetSession();
    showHome();
  }
});

function updateEndScreen(s) {
  if (!s.gameOver || phase !== "playing" || !controlMode) return;
  endScreen.classList.remove("hidden");
  joystickZone.classList.add("hidden");
  killBtn.classList.add("hidden");
  powerBar.classList.add("hidden");
  endCard.classList.remove("victory", "defeat");

  const innocentWin = s.winner === "innocents";
  const impostorWin = s.winner === "impostors";
  const iWon =
    (innocentWin && myRole === "innocent") || (impostorWin && myRole === "impostor");
  const iLost =
    (impostorWin && myRole === "innocent") || (innocentWin && myRole === "impostor");

  if (iLost) {
    endTitle.textContent = "Défaite";
    endCard.classList.add("defeat");
  } else if (iWon) {
    endTitle.textContent = "Victoire !";
    endCard.classList.add("victory");
  } else if (impostorWin) {
    endTitle.textContent = "Victoire des imposteurs";
  } else {
    endTitle.textContent = "Victoire des innocents !";
  }
  endMessage.textContent = s.endReason || "";
}

socket.on("state", (s) => {
  if (phase === "home" || phase === "lobby") return;
  if (phase === "controlPick") {
    state = s;
    return;
  }
  state = s;
  updateEndScreen(s);
});

function updateLobbyUi() {
  if (!lobbyData) {
    playerList.innerHTML = "";
    lobbyStatus.textContent = "Chargement du lobby…";
    return;
  }
  lobbyCodeEl.textContent = lobbyData.code;
  hostSettings.classList.toggle("hidden", !isHost);

  document.querySelectorAll(".color-swatch").forEach((btn) => {
    const c = btn.dataset.color;
    const taken = lobbyData.players.some((p) => p.color === c && p.id !== myId);
    const mine = c === myColor;
    btn.classList.toggle("selected", mine);
    btn.classList.toggle("taken", taken);
    btn.disabled = taken;
  });

  playerList.innerHTML = "";
  for (const p of lobbyData.players) {
    const li = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = "player-dot";
    dot.style.background = p.color;
    dot.style.borderRadius = "3px";
    li.appendChild(dot);
    const label = document.createElement("span");
    label.textContent = p.name;
    if (p.id === myId) label.textContent += " (toi)";
    li.appendChild(label);
    if (p.id === lobbyData.hostId) {
      const badge = document.createElement("span");
      badge.className = "host-badge";
      badge.textContent = "Hôte";
      li.appendChild(badge);
    }
    playerList.appendChild(li);
  }

  if (lobbyData.status === "playing") {
    startBtn.classList.add("hidden");
    leaveLobbyBtn.classList.add("hidden");
    lobbyStatus.textContent = "La partie commence… choisis Ordinateur ou Téléphone.";
    return;
  }
  leaveLobbyBtn.classList.remove("hidden");

  if (isHost) {
    startBtn.classList.remove("hidden");
    lobbyStatus.textContent =
      lobbyData.players.length < 2
        ? "Attends un autre joueur (minimum 2)."
        : `${lobbyData.players.length} joueurs — ${lobbyData.settings.impostors} imposteur(s), ${formatTime(lobbyData.settings.timerSec * 1000)}`;
  } else {
    startBtn.classList.add("hidden");
    lobbyStatus.textContent = "En attente que l’hôte démarre la partie…";
  }
}

window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "KeyE") killPressed = true;
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
  if (e.code === "KeyE") killPressed = false;
});

canvas.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

function getInput() {
  let vx = 0;
  let vy = 0;

  if (controlMode === "desktop") {
    if (keys["ArrowUp"]) vy -= 1;
    if (keys["ArrowDown"]) vy += 1;
    if (keys["ArrowLeft"]) vx -= 1;
    if (keys["ArrowRight"]) vx += 1;
  } else if (controlMode === "mobile") {
    vx = joystick.vx;
    vy = joystick.vy;
  } else {
    if (keys["KeyW"] || keys["KeyZ"] || keys["ArrowUp"]) vy -= 1;
    if (keys["KeyS"] || keys["ArrowDown"]) vy += 1;
    if (keys["KeyA"] || keys["KeyQ"] || keys["ArrowLeft"]) vx -= 1;
    if (keys["KeyD"] || keys["ArrowRight"]) vx += 1;
  }

  const len = Math.hypot(vx, vy);
  if (len > 0 && controlMode !== "mobile") {
    vx /= len;
    vy /= len;
  }

  const me = state?.players?.[myId];
  let angle = me?.angle ?? 0;
  if (len > 0.05) {
    angle = Math.atan2(vy, vx);
  } else if (me && controlMode === "desktop") {
    const wx = me.x - camera.x + canvas.width / 2;
    const wy = me.y - camera.y + canvas.height / 2;
    angle = Math.atan2(mouse.y - wy, mouse.x - wx);
  }

  const canKill =
    killPressed &&
    myRole === "impostor" &&
    me?.alive &&
    !me?.frozen &&
    !state?.gameOver;
  return { vx, vy, angle, kill: canKill };
}

setInterval(() => {
  if (!myId || phase !== "playing" || !controlMode || state?.gameOver) return;
  const input = getInput();
  socket.emit("input", input);
  if (input.kill) killPressed = false;
}, 1000 / 30);

function tileBlocksSight(maze, tx, ty) {
  if (ty < 0 || tx < 0 || ty >= maze.length || tx >= maze[0].length) return true;
  return maze[ty][tx] === 1;
}

function wallSegmentsOnLine(x0, y0, x1, y1, maze, tile) {
  const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (tile / 4)));
  let segments = 0;
  let insideWall = false;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const tx = Math.floor(x / tile);
    const ty = Math.floor(y / tile);
    const wall = tileBlocksSight(maze, tx, ty);
    if (wall && !insideWall) {
      segments++;
      insideWall = true;
    } else if (!wall) {
      insideWall = false;
    }
  }
  return segments;
}

function hasLineOfSight(x0, y0, x1, y1, maze, tile, maxWallSegments = 0) {
  return wallSegmentsOnLine(x0, y0, x1, y1, maze, tile) <= maxWallSegments;
}

function myViewRadius(me) {
  if (me?.visionActive) return VIEW_RADIUS + VIEW_RADIUS_BOOST;
  return VIEW_RADIUS;
}

function myMaxWallSegments(me) {
  return me?.visionActive ? VISION_EXTRA_WALLS : 0;
}

function computeVisibility(map, px, py, me) {
  const { maze, tile, w, h } = map;
  const radius = myViewRadius(me);
  const maxWalls = myMaxWallSegments(me);
  const vis = [];
  for (let ty = 0; ty < h; ty++) {
    vis[ty] = [];
    for (let tx = 0; tx < w; tx++) {
      const cx = tx * tile + tile / 2;
      const cy = ty * tile + tile / 2;
      const inRange = Math.hypot(cx - px, cy - py) <= radius + tile;
      vis[ty][tx] =
        inRange && hasLineOfSight(px, py, cx, cy, maze, tile, maxWalls);
    }
  }
  return vis;
}

function canSeePlayer(me, other, maze, tile) {
  if (other.hidden && other.id !== myId) return false;
  const radius = myViewRadius(me);
  const maxWalls = myMaxWallSegments(me);
  if (!other.alive) {
    return hasLineOfSight(me.x, me.y, other.x, other.y, maze, tile, maxWalls);
  }
  const d = Math.hypot(other.x - me.x, other.y - me.y);
  if (d > radius) return false;
  return hasLineOfSight(me.x, me.y, other.x, other.y, maze, tile, maxWalls);
}

function drawTile(x, y, tile, isWall, visible, tx, ty) {
  if (!visible) return;
  if (isWall) {
    const wallGrad = ctx.createLinearGradient(x, y, x, y + tile);
    wallGrad.addColorStop(0, "#3d4f6a");
    wallGrad.addColorStop(1, "#243044");
    ctx.fillStyle = wallGrad;
    ctx.fillRect(x, y, tile, tile);
    ctx.strokeStyle = "#5a6f8f";
    ctx.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);
    ctx.fillStyle = "rgba(160, 190, 230, 0.12)";
    ctx.fillRect(x + 3, y + 3, tile - 6, 5);
  } else {
    const floorGrad = ctx.createLinearGradient(x, y, x + tile, y + tile);
    floorGrad.addColorStop(0, "#3a4a62");
    floorGrad.addColorStop(1, "#2a3548");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(x, y, tile, tile);
    if ((tx + ty) % 2 === 0) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
      ctx.fillRect(x, y, tile, tile);
    }
    ctx.fillStyle = "rgba(140, 180, 255, 0.1)";
    ctx.fillRect(x + 4, y + 4, tile - 8, tile / 2 - 2);
    ctx.strokeStyle = "rgba(100, 140, 200, 0.15)";
    ctx.strokeRect(x + 1, y + 1, tile - 2, tile - 2);
  }
}

function drawPlayerGlow(px, py, radius) {
  const glow = ctx.createRadialGradient(px, py, 8, px, py, radius * 0.85);
  glow.addColorStop(0, "rgba(120, 170, 255, 0.22)");
  glow.addColorStop(0.45, "rgba(80, 120, 200, 0.08)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
}

function drawMaze(map, vis) {
  const { maze, tile, w, h } = map;
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      drawTile(tx * tile, ty * tile, tile, maze[ty][tx] === 1, vis[ty][tx], tx, ty);
    }
  }
}

function drawFog(map, vis) {
  const { tile, w, h } = map;
  ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      if (!vis[ty][tx]) {
        ctx.fillRect(tx * tile, ty * tile, tile, tile);
      }
    }
  }
}

function drawPortal(portal) {
  if (!portal) return;
  ctx.save();
  ctx.translate(portal.x, portal.y);
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(34, 211, 238, 0.25)";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function playerDrawColor(p, isMe) {
  if (isMe) return p.color || "#ef4444";
  return p.appearanceColor || p.color || "#ef4444";
}

function playerDrawName(p, isMe) {
  if (isMe) return p.name || "Joueur";
  return p.appearanceName || p.name || "Joueur";
}

function drawPlayerCube(p, isMe, dead) {
  const size = 26;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);

  if (dead) {
    ctx.globalAlpha = 0.45;
  } else if (p.hidden && isMe) {
    ctx.globalAlpha = 0.35;
  } else if (p.frozen) {
    ctx.globalAlpha = 0.88;
  }

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(-size / 2 + 2, size / 2 - 2, size - 4, 6);

  ctx.fillStyle = playerDrawColor(p, isMe);
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.strokeStyle = isMe ? "#ffffff" : "rgba(255,255,255,0.55)";
  ctx.lineWidth = isMe ? 3 : 2;
  ctx.strokeRect(-size / 2, -size / 2, size, size);

  ctx.fillStyle = "#1f2937";
  ctx.fillRect(size / 2 - 2, -4, 10, 8);

  ctx.restore();

  if (!dead) {
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 11px Space Grotesk, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(playerDrawName(p, isMe), p.x, p.y - 22);
    if (p.frozen) {
      ctx.fillStyle = "#7dd3fc";
      ctx.font = "600 9px Space Grotesk, sans-serif";
      ctx.fillText("GELÉ", p.x, p.y + 28);
    }
  }
}

function canKillNearby(me) {
  if (!me?.alive || me.frozen || !state?.map) return false;
  const { maze, tile } = state.map;
  for (const p of Object.values(state.players)) {
    if (!p.alive || p.id === myId || p.hidden) continue;
    if (Math.hypot(p.x - me.x, p.y - me.y) > KILL_RANGE) continue;
    if (hasLineOfSight(me.x, me.y, p.x, p.y, maze, tile)) return true;
  }
  return false;
}

function updateKillButton(me) {
  const show =
    phase === "playing" &&
    myRole === "impostor" &&
    me?.alive &&
    !state?.gameOver;
  killBtn.classList.toggle("hidden", !show);
  if (!show) return;
  const ready = canKillNearby(me);
  killBtn.classList.toggle("ready", ready);
  killBtn.disabled = !ready;
  killBtn.textContent = ready ? "Tuer" : "Tuer (trop loin)";
}

function updateHud() {
  if (phase !== "playing" || !state || !myId) return;
  timerHud.textContent = `Temps ${formatTime(state.timeLeftMs || 0)}`;
  aliveHud.textContent = `Innocents vivants : ${state.innocentsAlive ?? "—"}`;
  updateKillButton(state.players[myId]);
  updatePowerBarUi(state.players[myId]);
}

function render() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (phase !== "playing" || !state?.map) {
    requestAnimationFrame(render);
    return;
  }

  const me = state.players[myId];
  if (me) {
    camera.x = me.x;
    camera.y = me.y;
    visibility = computeVisibility(state.map, me.x, me.y, me);
  }

  const viewR = me ? myViewRadius(me) : VIEW_RADIUS;

  ctx.save();
  ctx.translate(canvas.width / 2 - camera.x, canvas.height / 2 - camera.y);

  if (visibility) {
    drawMaze(state.map, visibility);
    if (me) drawPlayerGlow(me.x, me.y, viewR);
  }

  for (const p of Object.values(state.players)) {
    if (!p.portal) continue;
    const portalVisible =
      p.id === myId ||
      (me && hasLineOfSight(me.x, me.y, p.portal.x, p.portal.y, state.map.maze, state.map.tile));
    if (portalVisible) drawPortal(p.portal);
  }

  const sorted = Object.values(state.players).sort((a, b) => a.y - b.y);
  for (const p of sorted) {
    if (p.id === myId) {
      drawPlayerCube(p, true, !p.alive);
      continue;
    }
    const visible = me && canSeePlayer(me, p, state.map.maze, state.map.tile);
    if (visible) drawPlayerCube(p, false, !p.alive);
  }

  if (visibility) {
    drawFog(state.map, visibility);
  }

  ctx.restore();

  if (me && me.frozen && me.alive) {
    ctx.fillStyle = "rgba(125, 211, 252, 0.12)";
    ctx.font = "600 14px Space Grotesk";
    ctx.textAlign = "center";
    ctx.fillText("Tu es gelé !", canvas.width / 2, canvas.height - 48);
  }

  if (me && !me.alive) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "700 26px Space Grotesk";
    ctx.textAlign = "center";
    ctx.fillText("Tu es mort — tu observes…", canvas.width / 2, canvas.height / 2);
  }

  updateHud();
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
