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
const endRematchBtn = document.getElementById("endRematchBtn");
const endRematchWait = document.getElementById("endRematchWait");
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
const resurrectPrompt = document.getElementById("resurrectPrompt");
const resurrectCountdown = document.getElementById("resurrectCountdown");
const resurrectYes = document.getElementById("resurrectYes");
const resurrectNo = document.getElementById("resurrectNo");
const returnBanner = document.getElementById("returnBanner");
const returnBannerText = document.getElementById("returnBannerText");
const controlMobileHint = document.getElementById("controlMobileHint");
const comfortFab = document.getElementById("comfortFab");
const comfortSheet = document.getElementById("comfortSheet");
const comfortSheetClose = document.getElementById("comfortSheetClose");
const homeVolume = document.getElementById("homeVolume");
const homeVolumeVal = document.getElementById("homeVolumeVal");
const homeMute = document.getElementById("homeMute");
const homeVibrate = document.getElementById("homeVibrate");
const homeCalmMotion = document.getElementById("homeCalmMotion");
const sheetVolume = document.getElementById("sheetVolume");
const sheetVolumeVal = document.getElementById("sheetVolumeVal");
const sheetMute = document.getElementById("sheetMute");
const sheetVibrate = document.getElementById("sheetVibrate");
const sheetCalmMotion = document.getElementById("sheetCalmMotion");

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
const KILL_RANGE = 70;
const PLAYER_RADIUS = 14;

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

const JOIN_WAIT_MS = isOnlineHosted() ? 35000 : 10000;

const RENDER_SOCKET_FALLBACK = "https://jeux-iug4.onrender.com";

function socketServerUrl() {
  const u = window.__SOCKET_URL__;
  if (typeof u === "string" && u.length > 0) return u;
  if (isOnlineHosted()) return RENDER_SOCKET_FALLBACK;
  return undefined;
}

const socket = io(socketServerUrl(), {
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 30000,
  transports: isOnlineHosted() ? ["polling", "websocket"] : ["websocket", "polling"],
});

function connectionHelpMessage() {
  if (isOnlineHosted() && !socketServerUrl()) {
    return "Le serveur multijoueur n’est pas configuré (SOCKET_SERVER_URL sur Vercel). Demande à l’hôte du projet de le configurer.";
  }
  if (isOnlineHosted()) {
    return "Connexion impossible. Attends quelques secondes et réessaie, ou recharge la page.";
  }
  return "Pas de connexion au serveur. Lance npm start puis réessaie.";
}

function joinTimeoutMessage() {
  if (isOnlineHosted()) {
    return "Pas de réponse du serveur. Réessaie une fois — la connexion peut prendre un peu de temps.";
  }
  return "Le serveur ne répond pas. Vérifie qu’il est lancé (npm start).";
}

let joinPending = null;
let joinRetryTimer = null;
let joinRetryCount = 0;
let pendingAction = null;
let lastJoinPayload = null;
let disconnectGrace = null;
let powerClickLock = false;
let powerToastUntil = 0;

const POWER_FAIL_MSG = {
  cooldown: "Pouvoir en recharge.",
  frozen: "Tu es gelé.",
  not_equipped: "Pouvoir non équipé.",
  disabled: "Pouvoirs désactivés.",
  no_target: "Personne à copier pour le déguisement.",
  no_move: "Dash bloqué (mur ou pas de place).",
  bad_place: "Impossible de poser le portail ici.",
  spam: "Trop vite — attends un instant.",
};

function clearJoinRetry() {
  if (joinRetryTimer) {
    clearTimeout(joinRetryTimer);
    joinRetryTimer = null;
  }
  joinRetryCount = 0;
  pendingAction = null;
}

function waitForSocket(maxMs) {
  return new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve();
      return;
    }
    const start = Date.now();
    const onConnect = () => {
      cleanup();
      resolve();
    };
    const onConnectError = () => {
      if (!socket.active) socket.connect();
    };
    const poll = setInterval(() => {
      if (socket.connected) {
        cleanup();
        resolve();
      } else if (Date.now() - start > maxMs) {
        cleanup();
        reject(new Error("timeout"));
      } else if (!socket.active) {
        socket.connect();
      }
    }, 400);

    function cleanup() {
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      clearInterval(poll);
    }

    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.connect();
  });
}

async function runLobbyAction(action, kind, joinPayload) {
  hideErrors();
  clearJoinRetry();
  pendingAction = kind;
  lastJoinPayload = joinPayload || null;
  setHomeButtonsDisabled(true);
  if (isOnlineHosted()) {
    homeError.textContent = "Connexion au serveur multijoueur…";
    homeError.classList.remove("hidden");
  }
  try {
    await waitForSocket(isOnlineHosted() ? 32000 : 12000);
    homeError.classList.add("hidden");
    beginJoinAttempt();
    action();
  } catch {
    setHomeButtonsDisabled(false);
    pendingAction = null;
    showError(homeError, connectionHelpMessage());
  }
}

function scheduleJoinRetry(message) {
  if (!isOnlineHosted() || !pendingAction || joinRetryCount >= 8) return false;
  const retryable =
    message.includes("Code invalide") ||
    message.includes("introuvable") ||
    message.includes("Impossible de créer") ||
    message.includes("Réessaie") ||
    message.includes("Synchronisation");
  if (!retryable) return false;

  joinRetryCount += 1;
  clearJoinPending();
  setHomeButtonsDisabled(true);
  showError(
    homeError,
    `Synchronisation… nouvelle tentative (${joinRetryCount}/8). Garde le même code.`
  );
  joinRetryTimer = setTimeout(() => {
    joinRetryTimer = null;
    beginJoinAttempt();
    if (pendingAction === "create") {
      socket.emit("createRoom", getName());
    } else if (pendingAction === "join" && lastJoinPayload) {
      socket.emit("joinRoom", lastJoinPayload);
    }
  }, 1500 + joinRetryCount * 600);
  return true;
}
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
let killHoldUntil = 0;
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
let lastKillEmitAt = 0;

function syncMobileControlsClass() {
  const on =
    controlMode === "mobile" && phase === "playing" && !state?.gameOver;
  document.body.classList.toggle("mobile-controls", on);
  document.body.classList.toggle("game-active", phase === "playing" && Boolean(controlMode));
}

function haptic(kind) {
  Comfort?.vibratePattern?.(kind);
}

function updateComfortFabVisibility() {
  comfortFab.classList.toggle("hidden", phase === "home");
}

function syncComfortUi() {
  if (typeof Comfort === "undefined") return;
  const s = Comfort.get();
  const volLabel = `${s.volume}%`;
  homeVolume.value = String(s.volume);
  homeVolumeVal.textContent = volLabel;
  sheetVolume.value = String(s.volume);
  sheetVolumeVal.textContent = volLabel;
  homeMute.checked = s.muted;
  sheetMute.checked = s.muted;
  homeVibrate.checked = s.vibrate;
  sheetVibrate.checked = s.vibrate;
  homeCalmMotion.checked = s.calmMotion;
  sheetCalmMotion.checked = s.calmMotion;
}

function openComfortSheet() {
  syncComfortUi();
  comfortSheet.classList.remove("hidden");
  Sfx?.unlock();
  haptic("tap");
}

function closeComfortSheet() {
  comfortSheet.classList.add("hidden");
}

function bindComfortSettings() {
  Comfort.load();
  syncComfortUi();

  const onVolume = (v) => Comfort.setVolume(v);
  homeVolume.addEventListener("input", () => {
    onVolume(Number(homeVolume.value));
    syncComfortUi();
  });
  sheetVolume.addEventListener("input", () => {
    onVolume(Number(sheetVolume.value));
    syncComfortUi();
  });

  const onMute = (checked) => Comfort.setMuted(checked);
  homeMute.addEventListener("change", () => {
    onMute(homeMute.checked);
    syncComfortUi();
  });
  sheetMute.addEventListener("change", () => {
    onMute(sheetMute.checked);
    syncComfortUi();
  });

  const onVibrate = (checked) => Comfort.setVibrate(checked);
  homeVibrate.addEventListener("change", () => {
    onVibrate(homeVibrate.checked);
    if (homeVibrate.checked) haptic("tap");
    syncComfortUi();
  });
  sheetVibrate.addEventListener("change", () => {
    onVibrate(sheetVibrate.checked);
    if (sheetVibrate.checked) haptic("tap");
    syncComfortUi();
  });

  const onCalm = (checked) => Comfort.setCalmMotion(checked);
  homeCalmMotion.addEventListener("change", () => {
    onCalm(homeCalmMotion.checked);
    syncComfortUi();
  });
  sheetCalmMotion.addEventListener("change", () => {
    onCalm(sheetCalmMotion.checked);
    syncComfortUi();
  });

  comfortFab.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    openComfortSheet();
  });
  comfortSheetClose.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    closeComfortSheet();
  });
  comfortSheet.addEventListener("pointerdown", (e) => {
    if (e.target === comfortSheet) closeComfortSheet();
  });
}

bindComfortSettings();

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
  if (!joinRetryTimer) {
    setHomeButtonsDisabled(false);
  }
}

function resetSession() {
  clearJoinPending();
  clearJoinRetry();
  resetDeathTracking();
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
  syncMobileControlsClass();
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
  hideResurrectPrompt();
  syncMobileControlsClass();
  updateComfortFabVisibility();
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
  updateComfortFabVisibility();
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
  const touch = Comfort?.isCoarseTouch?.();
  controlMobileHint.classList.toggle("hidden", !touch);
  pickMobile.classList.toggle("control-card-recommended", Boolean(touch));
  pickDesktop.classList.toggle("control-card-recommended", !touch);
  updateComfortFabVisibility();
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
  syncMobileControlsClass();
  if (state?.gameOver) updateEndScreen(state);
}

function showGame() {
  phase = "playing";
  hudTop.classList.remove("hidden");
  endScreen.classList.add("hidden");
  syncMobileControlsClass();
  updateComfortFabVisibility();
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

function emitUsePower(id) {
  const me = state?.players?.[myId];
  if (phase !== "playing" || state?.gameOver || !me?.alive || me.frozen || powerClickLock) {
    return;
  }
  const cd = me.powerCooldownMs?.[id] || 0;
  if (cd > 0) return;
  Sfx?.unlock();
  powerClickLock = true;
  socket.emit("usePower", id);
  setTimeout(() => {
    powerClickLock = false;
  }, 120);
}

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
    btn.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      emitUsePower(id);
      e.preventDefault();
      e.stopPropagation();
    });
    powerBar.appendChild(btn);
  }
}

function powerBtnLabel(id, me) {
  const def = POWER_CATALOG[id];
  const cdMs = me?.powerCooldownMs?.[id] || 0;
  const cdSec = Math.ceil(cdMs / 1000);
  if (cdSec > 0) return `${def.emoji} ${cdSec}s`;
  if (id === "portal") {
    return me.portal ? "🌀 Téléporter" : "🌀 Poser portail";
  }
  return `${def.emoji} ${def.name}`;
}

function updatePowerBarUi(me) {
  const powersOn = state?.powerSettings?.enabled !== false;
  const show =
    powersOn && phase === "playing" && controlMode && me?.alive && !state?.gameOver;
  if (show && powerBar.children.length === 0) {
    buildPowerBar();
  }
  powerBar.classList.toggle("hidden", !show || powerBar.children.length === 0);
  if (!show || !me) return;
  for (const btn of powerBar.children) {
    const id = btn.dataset.power;
    const cdMs = me.powerCooldownMs?.[id] || 0;
    const onCooldown = cdMs > 0;
    btn.disabled = onCooldown || me.frozen || powerClickLock;
    btn.classList.toggle("on-cooldown", onCooldown);
    btn.classList.toggle("portal-ready", id === "portal" && Boolean(me.portal));
    btn.textContent = powerBtnLabel(id, me);
  }
}

function pickControlMode(mode) {
  Sfx?.unlock();
  haptic("tap");
  beginWithControlMode(mode);
}

pickDesktop.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  e.preventDefault();
  pickControlMode("desktop");
});
pickMobile.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  e.preventDefault();
  pickControlMode("mobile");
});

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

function onJoystickPointerDown(e) {
  if (controlMode !== "mobile") return;
  joystick.active = true;
  joystick.pointerId = e.pointerId;
  joystickZone.setPointerCapture(e.pointerId);
  updateJoystickFromPointer(e.clientX, e.clientY);
  e.preventDefault();
}

joystickZone.addEventListener("pointerdown", onJoystickPointerDown);

joystickZone.addEventListener("pointermove", (e) => {
  if (!joystick.active || e.pointerId !== joystick.pointerId) return;
  updateJoystickFromPointer(e.clientX, e.clientY);
  e.preventDefault();
});

function endJoystick(e) {
  if (e.pointerId !== joystick.pointerId) return;
  resetJoystick();
}

joystickZone.addEventListener("pointerup", endJoystick);
joystickZone.addEventListener("pointercancel", endJoystick);

function requestKill() {
  if (myRole !== "impostor" || phase !== "playing" || state?.gameOver) return;
  const me = state?.players?.[myId];
  if (!me?.alive || me.frozen) return;
  if (!canKillNearby(me)) return;
  const now = Date.now();
  if (now - lastKillEmitAt < 450) return;
  lastKillEmitAt = now;
  Sfx?.unlock();
  haptic("kill");
  socket.emit("kill");
}

killBtn.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  if (!killBtn.classList.contains("ready")) return;
  requestKill();
  e.preventDefault();
  e.stopPropagation();
});

function resize() {
  const vv = window.visualViewport;
  const w = vv ? Math.round(vv.width) : window.innerWidth;
  const h = vv ? Math.round(vv.height) : window.innerHeight;
  canvas.width = w;
  canvas.height = h;
}
window.addEventListener("resize", resize);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", resize);
}
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
  runLobbyAction(() => socket.emit("createRoom", getName()), "create");
});

joinBtn.addEventListener("click", () => {
  const code = roomCodeInput.value.trim();
  if (code.length < 1) {
    showError(homeError, "Entre le code à 3 chiffres.");
    return;
  }
  const payload = { code, name: getName() };
  runLobbyAction(() => socket.emit("joinRoom", payload), "join", payload);
});

leaveLobbyBtn.addEventListener("click", () => {
  leaveToHome();
});

endHomeBtn.addEventListener("click", () => {
  leaveToHome();
});

endRematchBtn.addEventListener("click", () => {
  Sfx?.unlock();
  Sfx?.rematch();
  haptic("tap");
  socket.emit("rematchGame");
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
  if (phase === "home" && scheduleJoinRetry(message)) return;
  clearJoinPending();
  clearJoinRetry();
  if (phase === "home") showError(homeError, message);
  else showError(lobbyError, message);
});

socket.on("joinedRoom", ({ id, code, isHost: host, lobby }) => {
  clearJoinPending();
  clearJoinRetry();
  Sfx?.join();
  haptic("join");
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
  if (lobbyData && data.players.length > lobbyData.players.length) {
    Sfx?.lobbyPlayer();
    haptic("tap");
  }
  applyLobbyData(data);
  if (data.status === "playing" && (phase === "lobby" || phase === "controlPick") && !myRole) {
    socket.emit("syncGame");
  }
});

socket.on("gameStarted", ({ role, rematch }) => {
  clearJoinPending();
  myRole = role;
  roleHud.textContent = role === "impostor" ? "Rôle : Imposteur" : "Rôle : Innocent";
  endScreen.classList.add("hidden");
  endCard.classList.remove("victory", "defeat");
  endRematchBtn.classList.add("hidden");
  endRematchWait.classList.add("hidden");

  if (rematch && controlMode) {
    state = null;
    killPressed = false;
    killHoldUntil = 0;
    resetDeathTracking();
    Sfx?.startGame();
    haptic("start");
    buildPowerBar();
    showGame();
    joystickZone.classList.toggle("hidden", controlMode !== "mobile");
    syncMobileControlsClass();
    return;
  }

  state = null;
  controlMode = null;
  Sfx?.startGame();
  haptic("start");
  if (phase === "playing" && controlMode) return;
  showControlPicker();
});

function tryResumeSession() {
  const name = getName();
  if (phase === "lobby" && roomCode) {
    socket.emit("joinRoom", { code: roomCode, name });
    return;
  }
  if ((phase === "playing" || phase === "controlPick") && roomCode) {
    socket.emit("joinRoom", { code: roomCode, name });
    socket.emit("syncGame");
  }
}

socket.on("connect", () => {
  if (disconnectGrace) {
    clearTimeout(disconnectGrace);
    disconnectGrace = null;
  }
  if (phase !== "home" && roomCode) {
    tryResumeSession();
  }
});

let lastAliveCount = null;
const deathBursts = [];
const returnBursts = [];
const playerAlivePrev = {};
const DEATH_ANIM_MS = 1200;
const RETURN_ANIM_MS = 1600;
let resurrectCountdownTimer = null;
let resurrectOfferEndsAt = 0;
let returnBannerHideTimer = null;
let deathFlashUntil = 0;
let wasFrozen = false;
let timerWarned30 = false;
let timerWarned10 = false;
let killReadyWas = false;
let lastTimerBeepSec = -1;

function resetDeathTracking() {
  for (const k of Object.keys(playerAlivePrev)) delete playerAlivePrev[k];
  deathBursts.length = 0;
  returnBursts.length = 0;
  deathFlashUntil = 0;
  hideResurrectPrompt();
  hideReturnBanner();
  wasFrozen = false;
  timerWarned30 = false;
  timerWarned10 = false;
  killReadyWas = false;
  lastTimerBeepSec = -1;
}

function processDeathTransitions(s) {
  if (!s?.players || phase !== "playing") return;
  for (const [id, p] of Object.entries(s.players)) {
    const prev = playerAlivePrev[id];
    if (prev === true && p.alive === false) {
      deathBursts.push({
        x: p.x,
        y: p.y,
        color: id === myId ? p.color : p.appearanceColor || p.color,
        start: performance.now(),
        isMe: id === myId,
      });
      Sfx?.deathBurst();
      if (id === myId) {
        deathFlashUntil = performance.now() + 700;
        haptic("death");
      } else if (myRole === "impostor") {
        Sfx?.kill();
        haptic("kill");
      }
    }
    playerAlivePrev[id] = p.alive;
  }
}

function hideReturnBanner() {
  if (returnBannerHideTimer) {
    clearTimeout(returnBannerHideTimer);
    returnBannerHideTimer = null;
  }
  returnBanner.classList.remove("visible");
  returnBanner.classList.add("hidden");
}

function showReturnBanner() {
  returnBannerText.textContent = "Un joueur est de retour";
  returnBanner.classList.remove("hidden");
  returnBanner.classList.remove("visible");
  void returnBanner.offsetWidth;
  returnBanner.classList.add("visible");
  if (returnBannerHideTimer) clearTimeout(returnBannerHideTimer);
  returnBannerHideTimer = setTimeout(() => {
    returnBannerHideTimer = null;
    hideReturnBanner();
  }, 3200);
}

function playResurrectFx(data) {
  if (!data) return;
  returnBursts.push({
    x: data.x,
    y: data.y,
    color: data.color || "#4ade80",
    start: performance.now(),
    isMe: data.playerId === myId,
  });
  showReturnBanner();
  Sfx?.playerReturn();
  haptic("return");
  if (data.playerId === myId) {
    deathFlashUntil = 0;
    playerAlivePrev[myId] = true;
    endScreen.classList.add("hidden");
    joystickZone.classList.toggle("hidden", controlMode !== "mobile");
    syncMobileControlsClass();
  }
}

function hideResurrectPrompt() {
  resurrectPrompt.classList.add("hidden");
  resurrectOfferEndsAt = 0;
  if (resurrectCountdownTimer) {
    clearInterval(resurrectCountdownTimer);
    resurrectCountdownTimer = null;
  }
}

function showResurrectPrompt(timeoutMs) {
  Sfx?.unlock();
  Sfx?.resurrectOffer();
  haptic("offer");
  resurrectOfferEndsAt = Date.now() + timeoutMs;
  resurrectPrompt.classList.remove("hidden");
  const tick = () => {
    const left = Math.max(0, resurrectOfferEndsAt - Date.now());
    const sec = Math.ceil(left / 1000);
    resurrectCountdown.textContent = left > 0 ? `Temps pour choisir : ${sec} s` : "Temps écoulé…";
  };
  tick();
  if (resurrectCountdownTimer) clearInterval(resurrectCountdownTimer);
  resurrectCountdownTimer = setInterval(tick, 250);
}

function sendResurrectChoice(accept) {
  if (!resurrectOfferEndsAt || Date.now() > resurrectOfferEndsAt + 400) {
    hideResurrectPrompt();
    return;
  }
  Sfx?.unlock();
  hideResurrectPrompt();
  socket.emit("resurrectChoice", accept === true);
}

resurrectYes.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  e.preventDefault();
  sendResurrectChoice(true);
});
resurrectNo.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  e.preventDefault();
  sendResurrectChoice(false);
});

function drawReturnBursts(now) {
  for (let i = returnBursts.length - 1; i >= 0; i--) {
    const b = returnBursts[i];
    const t = (now - b.start) / RETURN_ANIM_MS;
    if (t >= 1) {
      returnBursts.splice(i, 1);
      continue;
    }
    const ease = 1 - (1 - t) ** 3;
    const ringR = 8 + ease * 64;
    const alpha = 1 - t * 0.85;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.strokeStyle = b.isMe ? "#86efac" : "#4ade80";
    ctx.lineWidth = 5 - t * 2.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, ringR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 220, 0.75)";
    ctx.font = `700 ${Math.round(16 + ease * 22)}px Space Grotesk, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✦", b.x, b.y - ease * 28);

    for (let n = 0; n < 12; n++) {
      const ang = (n / 12) * Math.PI * 2 + t * 5;
      const dist = ringR * (0.2 + t * 0.75);
      const px = b.x + Math.cos(ang) * dist;
      const py = b.y + Math.sin(ang) * dist - t * 18;
      const s = 4 + (1 - t) * 4;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(px, py, s, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawDeathBursts(now) {
  for (let i = deathBursts.length - 1; i >= 0; i--) {
    const b = deathBursts[i];
    const t = (now - b.start) / DEATH_ANIM_MS;
    if (t >= 1) {
      deathBursts.splice(i, 1);
      continue;
    }
    const ease = 1 - (1 - t) ** 2;
    const ringR = 10 + ease * 52;
    const alpha = 1 - t * 0.92;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.strokeStyle = b.isMe ? "#ff6b6b" : "#ef4444";
    ctx.lineWidth = 4 - t * 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, ringR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 220, 220, 0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, ringR * 0.55, 0, Math.PI * 2);
    ctx.stroke();

    for (let n = 0; n < 10; n++) {
      const ang = (n / 10) * Math.PI * 2 + t * 4;
      const dist = ringR * (0.35 + t * 0.5);
      const px = b.x + Math.cos(ang) * dist;
      const py = b.y + Math.sin(ang) * dist;
      const s = 5 * (1 - t * 0.6);
      ctx.fillStyle = b.color;
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
    }

    ctx.fillStyle = "#fff";
    ctx.font = `700 ${Math.round(18 + ease * 14)}px Space Grotesk, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✕", b.x, b.y - ease * 6);

    ctx.restore();
  }
}

socket.on("powerUsed", ({ powerId, ok, reason, action }) => {
  powerClickLock = false;
  if (ok) {
    switch (powerId) {
      case "portal":
        if (action === "teleport") Sfx?.portalTeleport();
        else Sfx?.portalPlace();
        break;
      case "dash":
        Sfx?.dash();
        break;
      case "invisible":
        Sfx?.invisible();
        break;
      case "speed":
        Sfx?.speed();
        break;
      case "disguise":
        Sfx?.disguise();
        break;
      case "vision":
        Sfx?.vision();
        break;
      case "freeze":
        Sfx?.freeze();
        break;
      default:
        Sfx?.power();
    }
    haptic("power");
    return;
  }
  Sfx?.powerFail();
  haptic("powerFail");
  const msg = POWER_FAIL_MSG[reason] || "Pouvoir impossible pour l’instant.";
  powerToastUntil = Date.now() + 2200;
  if (phase === "playing") {
    timerHud.dataset.powerHint = msg;
  }
});

socket.on("disconnect", () => {
  clearJoinPending();
  if (phase === "home") return;
  if (disconnectGrace) clearTimeout(disconnectGrace);
  disconnectGrace = setTimeout(() => {
    disconnectGrace = null;
    if (socket.connected) return;
    showError(homeError, "Connexion perdue. Recharge la page pour rejouer.");
    resetSession();
    showHome();
  }, 18000);
});

socket.on("resurrectOffer", ({ timeoutMs }) => {
  if (phase !== "playing") return;
  showResurrectPrompt(timeoutMs || 14000);
});

socket.on("resurrectOfferClosed", () => {
  hideResurrectPrompt();
});

socket.on("resurrectResult", () => {
  hideResurrectPrompt();
});

socket.on("playerResurrected", (data) => {
  playResurrectFx(data);
});

function updateEndScreen(s) {
  if (phase !== "playing" || !controlMode) return;
  if (!s.gameOver) {
    endScreen.classList.add("hidden");
    return;
  }
  hideResurrectPrompt();
  endScreen.classList.remove("hidden");
  joystickZone.classList.add("hidden");
  killBtn.classList.add("hidden");
  powerBar.classList.add("hidden");
  syncMobileControlsClass();
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
  endRematchBtn.classList.toggle("hidden", !isHost);
  endRematchWait.classList.toggle("hidden", isHost);
  if (iLost) {
    Sfx?.defeat();
    haptic("defeat");
  } else if (iWon) {
    Sfx?.victory();
    haptic("victory");
  }
}

socket.on("state", (s) => {
  if (phase === "home" || phase === "lobby") return;
  if (phase === "controlPick") {
    state = s;
    return;
  }
  state = s;
  processDeathTransitions(s);
  if (s.players?.[myId] && phase === "playing" && powerBar.children.length === 0) {
    buildPowerBar();
  }
  if (phase === "playing") {
    lastAliveCount = s.innocentsAlive ?? null;
  }
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
  if (e.code === "KeyE") requestKill();
  Sfx?.unlock();
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

  return { vx, vy, angle, kill: false };
}

setInterval(() => {
  if (!myId || phase !== "playing" || !controlMode || state?.gameOver) return;
  const input = getInput();
  socket.emit("input", input);
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

function hasKillLineOfSight(x0, y0, x1, y1, maze, tile) {
  if (hasLineOfSight(x0, y0, x1, y1, maze, tile)) return true;
  const r = PLAYER_RADIUS * 0.85;
  const offsets = [
    [r, 0],
    [-r, 0],
    [0, r],
    [0, -r],
  ];
  for (const [ox, oy] of offsets) {
    if (hasLineOfSight(x0, y0, x1 + ox, y1 + oy, maze, tile)) return true;
  }
  return false;
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

const mapAmbientDots = [];
let mapAmbientReady = false;

function ensureMapAmbient(map) {
  if (mapAmbientReady || !map) return;
  mapAmbientReady = true;
  const mw = map.w * map.tile;
  const mh = map.h * map.tile;
  for (let i = 0; i < 72; i++) {
    mapAmbientDots.push({
      x: Math.random() * mw,
      y: Math.random() * mh,
      phase: Math.random() * Math.PI * 2,
      speed: 0.45 + Math.random() * 1.1,
      size: 0.8 + Math.random() * 2.2,
    });
  }
}

function mapAnimTime(now) {
  return now * 0.001;
}

function mapCameraWobble(t) {
  if (Comfort?.shouldReduceMotion?.()) {
    return { wx: 0, wy: 0, scale: 1 };
  }
  const breathe = Math.sin(t * 1.15) * 1.35;
  const wx = Math.sin(t * 2.05) * 0.95 + Math.sin(t * 5.3 + 0.4) * 0.28 + breathe * 0.15;
  const wy = Math.cos(t * 1.75) * 0.9 + Math.sin(t * 4.1) * 0.22;
  const scale = 1 + Math.sin(t * 0.85) * 0.0045;
  return { wx, wy, scale };
}

function drawMapBackground(map, t) {
  const calm = Comfort?.shouldReduceMotion?.();
  const W = map.w * map.tile;
  const H = map.h * map.tile;
  const pulse = calm ? 0.5 : 0.5 + 0.5 * Math.sin(t * 0.72);
  const g = ctx.createRadialGradient(W * 0.5, H * 0.5, 30, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
  g.addColorStop(0, `rgba(52, 78, 118, ${0.28 + pulse * 0.1})`);
  g.addColorStop(0.55, "rgba(22, 30, 46, 0.92)");
  g.addColorStop(1, "rgba(8, 10, 16, 1)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  if (calm) return;

  ctx.strokeStyle = `rgba(100, 160, 255, ${0.04 + pulse * 0.03})`;
  ctx.lineWidth = 1;
  const wave = Math.sin(t * 1.4) * 8;
  for (let y = -wave; y < H + 40; y += 28) {
    ctx.beginPath();
    for (let x = 0; x <= W; x += 12) {
      const dy = Math.sin(x * 0.04 + t * 1.8 + y * 0.02) * 3;
      if (x === 0) ctx.moveTo(x, y + dy);
      else ctx.lineTo(x, y + dy);
    }
    ctx.stroke();
  }
}

function drawMapAmbient(map, vis, t) {
  if (Comfort?.shouldReduceMotion?.()) return;
  const { maze, tile, w, h } = map;
  for (const dot of mapAmbientDots) {
    const tx = Math.floor(dot.x / tile);
    const ty = Math.floor(dot.y / tile);
    if (ty < 0 || tx < 0 || ty >= h || tx >= w) continue;
    if (maze[ty][tx] === 1 || !vis[ty][tx]) continue;
    const driftX = Math.sin(t * dot.speed + dot.phase) * 7;
    const driftY = Math.cos(t * dot.speed * 0.85 + dot.phase * 1.3) * 6;
    const alpha = 0.1 + 0.14 * (0.5 + 0.5 * Math.sin(t * 2.4 + dot.phase));
    ctx.fillStyle = `rgba(140, 210, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(dot.x + driftX, dot.y + driftY, dot.size, 0, Math.PI * 2);
    ctx.fill();
  }
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

function drawTile(x, y, tile, isWall, visible, tx, ty, t) {
  if (!visible) return;
  const tilePulse = 0.5 + 0.5 * Math.sin(t * 1.6 + tx * 0.55 + ty * 0.42);
  if (isWall) {
    const calm = Comfort?.shouldReduceMotion?.();
    const vibrate = calm ? 0 : Math.sin(t * 3.2 + tx * 1.1 + ty * 0.8) * 0.35;
    const wx = x + vibrate;
    const wy = y + vibrate * 0.6;
    const wallGrad = ctx.createLinearGradient(wx, wy, wx, wy + tile);
    const top = 58 + tilePulse * 10;
    wallGrad.addColorStop(0, `rgb(${top + 4}, ${top + 18}, ${top + 42})`);
    wallGrad.addColorStop(1, `rgb(${36 + tilePulse * 6}, ${46 + tilePulse * 4}, ${64 + tilePulse * 5})`);
    ctx.fillStyle = wallGrad;
    ctx.fillRect(wx, wy, tile, tile);
    ctx.strokeStyle = `rgba(110, 145, 190, ${0.45 + tilePulse * 0.2})`;
    ctx.strokeRect(wx + 0.5, wy + 0.5, tile - 1, tile - 1);
    const shimmer = 3 + Math.sin(t * 2.8 + tx + ty) * 2;
    ctx.fillStyle = `rgba(180, 220, 255, ${0.08 + tilePulse * 0.1})`;
    ctx.fillRect(wx + shimmer, wy + 3, tile - shimmer * 2, 5);
    ctx.fillStyle = `rgba(255, 120, 140, ${0.03 + tilePulse * 0.04})`;
    ctx.fillRect(wx + tile - 6, wy + tile - 8, 4, 4);
  } else {
    const floorGrad = ctx.createLinearGradient(x, y, x + tile, y + tile);
    const lift = tilePulse * 8;
    floorGrad.addColorStop(0, `rgb(${56 + lift}, ${72 + lift}, ${94 + lift})`);
    floorGrad.addColorStop(1, `rgb(${40 + lift * 0.5}, ${50 + lift * 0.4}, ${68 + lift * 0.5})`);
    ctx.fillStyle = floorGrad;
    ctx.fillRect(x, y, tile, tile);
    const checker = (tx + ty) % 2 === 0;
    ctx.fillStyle = `rgba(255, 255, 255, ${checker ? 0.035 + tilePulse * 0.03 : 0.015})`;
    ctx.fillRect(x, y, tile, tile);
    const glossY = 4 + Math.sin(t * 2.2 + tx * 0.7) * 2;
    ctx.fillStyle = `rgba(160, 210, 255, ${0.07 + tilePulse * 0.08})`;
    ctx.fillRect(x + 4, y + glossY, tile - 8, tile / 2 - 2);
    ctx.strokeStyle = `rgba(120, 170, 230, ${0.12 + tilePulse * 0.1})`;
    ctx.strokeRect(x + 1, y + 1, tile - 2, tile - 2);
  }
}

function drawPlayerGlow(px, py, radius, t) {
  const pulse = 0.92 + 0.08 * Math.sin(t * 2.1);
  const r = radius * pulse;
  const glow = ctx.createRadialGradient(px, py, 8, px, py, r * 0.88);
  const core = 0.2 + 0.06 * Math.sin(t * 3);
  glow.addColorStop(0, `rgba(120, 180, 255, ${core})`);
  glow.addColorStop(0.45, "rgba(80, 120, 200, 0.08)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(px - r, py - r, r * 2, r * 2);
}

function drawMaze(map, vis, t) {
  const { maze, tile, w, h } = map;
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      drawTile(tx * tile, ty * tile, tile, maze[ty][tx] === 1, vis[ty][tx], tx, ty, t);
    }
  }
}

function drawFog(map, vis, t) {
  const { tile, w, h } = map;
  const fogPulse = 0.76 + 0.04 * Math.sin(t * 1.3);
  ctx.fillStyle = `rgba(0, 0, 0, ${fogPulse})`;
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      if (!vis[ty][tx]) {
        ctx.fillRect(tx * tile, ty * tile, tile, tile);
      }
    }
  }
  ctx.fillStyle = `rgba(30, 50, 90, ${0.04 + 0.03 * Math.sin(t * 2)})`;
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      if (vis[ty][tx]) continue;
      const edge =
        (tx > 0 && vis[ty][tx - 1]) ||
        (tx < w - 1 && vis[ty][tx + 1]) ||
        (ty > 0 && vis[ty - 1][tx]) ||
        (ty < h - 1 && vis[ty + 1][tx]);
      if (edge) {
        ctx.fillRect(tx * tile, ty * tile, tile, tile);
      }
    }
  }
}

function drawPortal(portal, t) {
  if (!portal) return;
  ctx.save();
  ctx.translate(portal.x, portal.y);
  const spin = t * 2.4;
  const pulse = 14 + Math.sin(t * 4) * 3;
  ctx.rotate(spin);
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = 12 + Math.sin(t * 5) * 6;
  ctx.beginPath();
  ctx.arc(0, 0, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.rotate(-spin * 2);
  ctx.strokeStyle = "rgba(165, 243, 252, 0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, pulse * 0.65, 0, Math.PI * 1.35);
  ctx.stroke();
  ctx.fillStyle = `rgba(34, 211, 238, ${0.2 + 0.08 * Math.sin(t * 6)})`;
  ctx.beginPath();
  ctx.arc(0, 0, pulse * 0.5, 0, Math.PI * 2);
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
    ctx.globalAlpha = 0.38;
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
    if (hasKillLineOfSight(me.x, me.y, p.x, p.y, maze, tile)) return true;
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
  if (ready && !killReadyWas) {
    Sfx?.killReady();
    haptic("killReady");
  }
  killReadyWas = ready;
}

function updateHud() {
  if (phase !== "playing" || !state || !myId) return;
  const hint = timerHud.dataset.powerHint;
  if (hint && Date.now() < powerToastUntil) {
    timerHud.textContent = hint;
  } else {
    delete timerHud.dataset.powerHint;
    timerHud.textContent = `Temps ${formatTime(state.timeLeftMs || 0)}`;
  }
  aliveHud.textContent = `Innocents vivants : ${state.innocentsAlive ?? "—"}`;
  const me = state.players[myId];
  if (me?.frozen && !wasFrozen) {
    Sfx?.frozenHit();
    haptic("frozen");
  }
  wasFrozen = Boolean(me?.frozen);

  const ms = state.timeLeftMs ?? 0;
  if (ms > 0 && ms <= 30000 && !timerWarned30) {
    timerWarned30 = true;
    Sfx?.timerWarn30();
    haptic("timerWarn");
  }
  if (ms > 0 && ms <= 10000 && !timerWarned10) {
    timerWarned10 = true;
    Sfx?.timerWarn10();
    haptic("timerUrgent");
  }
  if (ms > 0 && ms <= 5000 && Math.ceil(ms / 1000) <= 5) {
    const sec = Math.ceil(ms / 1000);
    if (sec <= 3 && sec !== lastTimerBeepSec) {
      lastTimerBeepSec = sec;
      Sfx?.timerFinal();
      haptic("timerFinal");
    }
  } else if (ms > 5000) {
    lastTimerBeepSec = -1;
  }

  updateKillButton(me);
  updatePowerBarUi(me);
}

function drawScreenVignette(t) {
  const pulse = Comfort?.shouldReduceMotion?.() ? 0.5 : 0.5 + 0.5 * Math.sin(t * 0.9);
  const g = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    canvas.height * 0.2,
    canvas.width / 2,
    canvas.height / 2,
    Math.max(canvas.width, canvas.height) * 0.72
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0, 0, 0, ${0.22 + pulse * 0.05})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function render() {
  const animNow = performance.now();
  const t = mapAnimTime(animNow);

  ctx.fillStyle = "#05070c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (phase !== "playing" || !state?.map) {
    requestAnimationFrame(render);
    return;
  }

  ensureMapAmbient(state.map);

  const me = state.players[myId];
  if (me) {
    camera.x = me.x;
    camera.y = me.y;
    visibility = computeVisibility(state.map, me.x, me.y, me);
  }

  const viewR = me ? myViewRadius(me) : VIEW_RADIUS;
  const wobble = mapCameraWobble(t);

  ctx.save();
  ctx.translate(canvas.width / 2 + wobble.wx, canvas.height / 2 + wobble.wy);
  ctx.scale(wobble.scale, wobble.scale);
  ctx.translate(-camera.x, -camera.y);

  if (visibility) {
    drawMapBackground(state.map, t);
    drawMaze(state.map, visibility, t);
    drawMapAmbient(state.map, visibility, t);
    if (me) drawPlayerGlow(me.x, me.y, viewR, t);
  }

  for (const p of Object.values(state.players)) {
    if (!p.portal) continue;
    const portalVisible =
      p.id === myId ||
      (me && hasLineOfSight(me.x, me.y, p.portal.x, p.portal.y, state.map.maze, state.map.tile));
    if (portalVisible) drawPortal(p.portal, t);
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

  drawDeathBursts(animNow);
  drawReturnBursts(animNow);

  if (visibility) {
    drawFog(state.map, visibility, t);
  }

  ctx.restore();

  drawScreenVignette(t);

  const flashNow = animNow;
  if (flashNow < deathFlashUntil) {
    const u = 1 - (deathFlashUntil - flashNow) / 700;
    ctx.fillStyle = `rgba(220, 38, 38, ${0.45 * (1 - u)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (me && me.frozen && me.alive) {
    ctx.fillStyle = "rgba(125, 211, 252, 0.12)";
    ctx.font = "600 14px Space Grotesk";
    ctx.textAlign = "center";
    ctx.fillText("Tu es gelé !", canvas.width / 2, canvas.height - 48);
  }

  if (me && !me.alive && resurrectPrompt.classList.contains("hidden")) {
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
