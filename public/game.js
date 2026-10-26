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
const resurrectWheel = document.getElementById("resurrectWheel");
const resurrectSpinBtn = document.getElementById("resurrectSpinBtn");
const resurrectWheelMsg = document.getElementById("resurrectWheelMsg");
const resurrectNo = document.getElementById("resurrectNo");
const resurrectTitle = document.getElementById("resurrectTitle");
const resurrectHint = document.getElementById("resurrectHint");
const wheelCenterCap = document.getElementById("wheelCenterCap");
const wheelLegendWin = document.getElementById("wheelLegendWin");
const wheelLegendLose = document.getElementById("wheelLegendLose");
const doctorPicker = document.getElementById("doctorPicker");
const doctorTargetList = document.getElementById("doctorTargetList");
const doctorPickerClose = document.getElementById("doctorPickerClose");
const returnBanner = document.getElementById("returnBanner");
const returnBannerText = document.getElementById("returnBannerText");
const deathBanner = document.getElementById("deathBanner");
const deathBannerText = document.getElementById("deathBannerText");
const controlMobileHint = document.getElementById("controlMobileHint");
const lobbyMapPreview = document.getElementById("lobbyMapPreview");
const lobbyMapLabel = document.getElementById("lobbyMapLabel");
const mapVotePicker = document.getElementById("mapVotePicker");
const copyCodeBtn = document.getElementById("copyCodeBtn");
const lobbyMeta = document.getElementById("lobbyMeta");

const MAP_VOTE_ICONS = { croise: "✚", serpent: "〰️", anneaux: "◎" };
const playerCountBadge = document.getElementById("playerCountBadge");
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
let mySpecialRole = "nul";
let myDoctorPickDone = false;
let iHaveDoctorProtection = false;
let doctorPatientName = null;
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
  mySpecialRole = "nul";
  myDoctorPickDone = false;
  iHaveDoctorProtection = false;
  doctorPatientName = null;
  hideDoctorPicker();
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
  powerPicker.classList.toggle("powers-read-only", !isHost);
  if (enabled) {
    powerPickerHint.textContent = isHost
      ? "Choisis les pouvoirs — ils seront les mêmes pour tous les joueurs."
      : "Pouvoirs choisis par l’hôte pour toute la partie (lecture seule).";
  }
  if (!enabled) {
    powerCooldownInfo.classList.add("hidden");
    return;
  }
  if (cds) {
    const parts = POWER_ORDER.filter((id) => myPowers[id]).map((id) => {
      const def = POWER_CATALOG[id];
      return `${def.emoji} ${def.name}`;
    });
    const cdParts = POWER_ORDER.map((id) => {
      const def = POWER_CATALOG[id];
      return `${def.name.toLowerCase()} ${cds[id] ?? 20}s`;
    });
    if (!isHost) {
      powerCooldownInfo.textContent = parts.length
        ? `Actifs : ${parts.join(" · ")} — recharge ${cdParts.join(" · ")}`
        : `Recharge : ${cdParts.join(" · ")}`;
      powerCooldownInfo.classList.remove("hidden");
    } else {
      powerCooldownInfo.classList.add("hidden");
    }
  } else {
    powerCooldownInfo.classList.add("hidden");
  }
}

function drawLobbyMapPreview(preview) {
  if (!lobbyMapPreview || !preview?.maze?.length) return;
  const pctx = lobbyMapPreview.getContext("2d");
  if (!pctx) return;
  const { w, h, maze } = preview;
  const pad = 6;
  const cell = Math.max(2, Math.floor(Math.min((220 - pad * 2) / w, (132 - pad * 2) / h)));
  const drawW = w * cell;
  const drawH = h * cell;
  lobbyMapPreview.width = drawW + pad * 2;
  lobbyMapPreview.height = drawH + pad * 2;

  pctx.fillStyle = "#06080c";
  pctx.fillRect(0, 0, lobbyMapPreview.width, lobbyMapPreview.height);

  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const x = pad + tx * cell;
      const y = pad + ty * cell;
      const wall = maze[ty][tx] === 1;
      if (wall) {
        pctx.fillStyle = "#2d3a52";
        pctx.fillRect(x, y, cell, cell);
        pctx.fillStyle = "rgba(120, 160, 220, 0.35)";
        pctx.fillRect(x, y, cell, Math.max(1, Math.floor(cell / 3)));
      } else {
        pctx.fillStyle = "#1a2838";
        pctx.fillRect(x, y, cell, cell);
        pctx.fillStyle = "rgba(34, 211, 238, 0.25)";
        pctx.fillRect(x + cell * 0.35, y + cell * 0.35, cell * 0.3, cell * 0.3);
      }
    }
  }

  pctx.strokeStyle = "rgba(34, 211, 238, 0.35)";
  pctx.lineWidth = 1;
  pctx.strokeRect(pad + 0.5, pad + 0.5, drawW - 1, drawH - 1);
}

async function copyRoomCode() {
  if (!roomCode || !copyCodeBtn) return;
  const text = String(roomCode);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    copyCodeBtn.textContent = "Copié !";
    copyCodeBtn.classList.add("copied");
    setTimeout(() => {
      copyCodeBtn.textContent = "Copier";
      copyCodeBtn.classList.remove("copied");
    }, 1600);
    haptic("tap");
  } catch {
    copyCodeBtn.textContent = "Échec";
    setTimeout(() => {
      copyCodeBtn.textContent = "Copier";
    }, 1600);
  }
}

if (copyCodeBtn) {
  copyCodeBtn.addEventListener("click", () => {
    Sfx?.unlock();
    copyRoomCode();
  });
}

function myMapVoteId() {
  return lobbyData?.mapVotes?.[myId] || null;
}

function updateMapVoteUi() {
  if (!mapVotePicker) return;
  const options = lobbyData?.mapOptions || [];
  const counts = lobbyData?.mapVoteCounts || {};
  const mine = myMapVoteId();
  const playing = lobbyData?.status === "playing";
  let maxVotes = 0;
  for (const opt of options) {
    const n = counts[opt.id] || 0;
    if (n > maxVotes) maxVotes = n;
  }

  mapVotePicker.innerHTML = "";
  for (const opt of options) {
    const n = counts[opt.id] || 0;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "map-vote-btn";
    btn.dataset.mapId = opt.id;
    if (mine === opt.id) btn.classList.add("selected");
    if (maxVotes > 0 && n === maxVotes) btn.classList.add("leading");
    btn.disabled = playing;

    const icon = document.createElement("span");
    icon.className = "map-vote-icon";
    icon.textContent = MAP_VOTE_ICONS[opt.id] || "🗺️";
    btn.appendChild(icon);

    const name = document.createElement("span");
    name.className = "map-vote-name";
    name.textContent = opt.name;
    btn.appendChild(name);

    const count = document.createElement("span");
    count.className = "map-vote-count";
    count.textContent = n === 1 ? "1 vote" : `${n} votes`;
    btn.appendChild(count);

    btn.addEventListener("click", () => {
      if (playing || mine === opt.id) return;
      Sfx?.unlock();
      haptic("tap");
      socket.emit("voteMap", opt.id);
    });
    mapVotePicker.appendChild(btn);
  }

  if (lobbyMapLabel && lobbyData?.mapPreview) {
    const previewName =
      options.find((o) => o.id === lobbyData.mapPreview.id)?.name || lobbyData.mapPreview.id;
    lobbyMapLabel.textContent = playing
      ? `Carte : ${previewName}`
      : `Aperçu : ${previewName}${maxVotes > 0 ? " (en tête)" : ""}`;
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
  }
  if (data.settings?.roomPowers) {
    myPowers = powersFromServer(data.settings.roomPowers);
  } else if (me?.powers) {
    myPowers = powersFromServer(me.powers);
  }
  updateLobbyUi();
  updateMapVoteUi();
  updatePowerPickerUi();
  updatePowerLobbySection();
  drawLobbyMapPreview(data.mapPreview);
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
      if (!isHost || !powersEnabledInLobby()) return;
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

function applyWheelUiConfig(segments, oddsLabel) {
  wheelSegments = segments || 3;
  if (resurrectWheel) {
    resurrectWheel.classList.toggle("wheel-segments-3", wheelSegments === 3);
    if (wheelSegments !== 3) {
      resurrectWheel.style.removeProperty("background");
    }
  }
  if (wheelCenterCap) wheelCenterCap.textContent = oddsLabel || `1/${wheelSegments}`;
  if (wheelLegendWin) wheelLegendWin.textContent = "1 segment vert = revivre";
  if (wheelLegendLose) {
    const lose = Math.max(0, wheelSegments - 1);
    wheelLegendLose.textContent =
      lose === 1 ? "1 segment gris = rien" : `${lose} segments gris = rien`;
  }
}

function applyGameRoleFromServer(data) {
  if (!data) return;
  myRole = data.role;
  mySpecialRole = data.specialRole || "nul";
  myDoctorPickDone = Boolean(data.doctorPickDone);
  iHaveDoctorProtection = Boolean(data.doctorProtected);
  if (data.mapName !== undefined) setRoleHudDisplay(data.mapName || "");
  else setRoleHudDisplay();
}

function hideDoctorPicker() {
  if (doctorPicker) doctorPicker.classList.add("hidden");
}

function openDoctorPicker() {
  if (!doctorPicker || !doctorTargetList || !state?.players) return;
  doctorTargetList.innerHTML = "";
  const living = Object.values(state.players).filter(
    (p) => p.alive && p.id !== myId && !p.hidden
  );
  if (living.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Aucun joueur disponible.";
    li.className = "small-hint";
    doctorTargetList.appendChild(li);
  } else {
    for (const p of living) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "doctor-target-btn";
      const dot = document.createElement("span");
      dot.className = "player-dot";
      dot.style.background = p.appearanceColor || p.color;
      btn.appendChild(dot);
      const label = document.createElement("span");
      label.textContent = p.appearanceName || p.name || "Joueur";
      btn.appendChild(label);
      btn.addEventListener("click", () => {
        Sfx?.unlock();
        haptic("tap");
        socket.emit("doctorSelect", p.id);
        hideDoctorPicker();
      });
      li.appendChild(btn);
      doctorTargetList.appendChild(li);
    }
  }
  doctorPicker.classList.remove("hidden");
}

function onDoctorPowerClick() {
  if (mySpecialRole !== "medecin" || myDoctorPickDone) return;
  Sfx?.unlock();
  openDoctorPicker();
}

function buildPowerBar() {
  powerBar.innerHTML = "";
  if (state?.powerSettings && state.powerSettings.enabled === false) {
    if (mySpecialRole === "medecin" && !myDoctorPickDone) appendDoctorPowerBtn();
    return;
  }
  if (lobbyData?.settings?.powersEnabled === false) {
    if (mySpecialRole === "medecin" && !myDoctorPickDone) appendDoctorPowerBtn();
    return;
  }
  if (mySpecialRole === "medecin") appendDoctorPowerBtn();
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

function appendDoctorPowerBtn() {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "power-btn doctor-power-btn";
  btn.dataset.power = "doctor";
  if (myDoctorPickDone) {
    btn.classList.add("done");
    btn.disabled = true;
    btn.textContent = doctorPatientName
      ? `🩺 Patient : ${doctorPatientName}`
      : "🩺 Patient choisi";
  } else {
    btn.textContent = "🩺 Médecin";
    btn.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      onDoctorPowerClick();
    });
  }
  powerBar.appendChild(btn);
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
  const showRoleAction =
    mySpecialRole === "medecin" && me?.alive && !state?.gameOver;
  const show =
    phase === "playing" &&
    controlMode &&
    me?.alive &&
    !state?.gameOver &&
    (powersOn || showRoleAction);
  if (show && powerBar.children.length === 0) {
    buildPowerBar();
  }
  powerBar.classList.toggle("hidden", !show || powerBar.children.length === 0);
  if (!show || !me) return;
  for (const btn of powerBar.children) {
    const id = btn.dataset.power;
    if (id === "doctor") continue;
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

socket.on("gameStarted", (data) => {
  clearJoinPending();
  applyGameRoleFromServer(data);
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
let wheelSegments = 3;
function wheelSegmentDeg() {
  return 360 / wheelSegments;
}
let wheelRotationDeg = 0;
let wheelSpinning = false;
let returnBannerHideTimer = null;
let deathFlashUntil = 0;
let wasFrozen = false;
let timerWarned30 = false;
let timerWarned10 = false;
let killReadyWas = false;
let lastTimerBeepSec = -1;
let hudMapName = "";
const deathMarkers = [];
const DEATH_MARKER_MS = 20000;
let deathBannerHideTimer = null;

function resetDeathTracking() {
  for (const k of Object.keys(playerAlivePrev)) delete playerAlivePrev[k];
  deathBursts.length = 0;
  returnBursts.length = 0;
  deathMarkers.length = 0;
  deathFlashUntil = 0;
  hideResurrectPrompt();
  hideReturnBanner();
  hideDeathBanner();
  wasFrozen = false;
  timerWarned30 = false;
  timerWarned10 = false;
  killReadyWas = false;
  lastTimerBeepSec = -1;
}

function hideDeathBanner() {
  if (deathBannerHideTimer) {
    clearTimeout(deathBannerHideTimer);
    deathBannerHideTimer = null;
  }
  if (!deathBanner) return;
  deathBanner.classList.remove("visible");
  deathBanner.classList.add("hidden");
}

function showDeathBanner(victimName) {
  if (!deathBanner || !deathBannerText) return;
  const label = victimName ? `${victimName} est mort` : "Un joueur est mort";
  deathBannerText.textContent = `${label} — suis la flèche ☠`;
  deathBanner.classList.remove("hidden");
  deathBanner.classList.remove("visible");
  void deathBanner.offsetWidth;
  deathBanner.classList.add("visible");
  if (deathBannerHideTimer) clearTimeout(deathBannerHideTimer);
  deathBannerHideTimer = setTimeout(() => {
    deathBannerHideTimer = null;
    hideDeathBanner();
  }, 4500);
}

function addDeathMarker(playerId, x, y, name, color) {
  const now = performance.now();
  const idx = deathMarkers.findIndex((m) => m.playerId === playerId);
  const entry = { playerId, x, y, name, color, start: now };
  if (idx >= 0) deathMarkers[idx] = entry;
  else deathMarkers.push(entry);
}

function removeDeathMarker(playerId) {
  const idx = deathMarkers.findIndex((m) => m.playerId === playerId);
  if (idx >= 0) deathMarkers.splice(idx, 1);
}

function pruneDeathMarkers(now) {
  for (let i = deathMarkers.length - 1; i >= 0; i--) {
    if (now - deathMarkers[i].start > DEATH_MARKER_MS) deathMarkers.splice(i, 1);
  }
}

function worldToScreen(wx, wy) {
  return {
    x: canvas.width / 2 + (wx - camera.x),
    y: canvas.height / 2 + (wy - camera.y),
  };
}

function drawDeathCompassIndicators(animNow, me, iAmGhost) {
  if (!me?.alive || iAmGhost || !state?.map) return;
  pruneDeathMarkers(animNow);
  const { maze, tile } = state.map;
  const pad = 48;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  for (const m of deathMarkers) {
    const age = animNow - m.start;
    let alpha = 1;
    if (age < 400) alpha = age / 400;
    else if (age > DEATH_MARKER_MS - 2000) alpha = Math.max(0, (DEATH_MARKER_MS - age) / 2000);
    if (alpha <= 0.02) continue;

    const visible = corpseVisibleToViewer(m.x, m.y, me, maze, tile, false);
    const scr = worldToScreen(m.x, m.y);
    const onScreen =
      scr.x >= pad &&
      scr.x <= canvas.width - pad &&
      scr.y >= pad &&
      scr.y <= canvas.height - pad;
    if (visible && onScreen) continue;

    const dx = scr.x - cx;
    const dy = scr.y - cy;
    if (Math.abs(dx) < 3 && Math.abs(dy) < 3) continue;
    const hw = canvas.width / 2 - pad;
    const hh = canvas.height / 2 - pad;
    const t = Math.min(hw / Math.abs(dx), hh / Math.abs(dy));
    const ex = cx + dx * t;
    const ey = cy + dy * t;
    const angle = Math.atan2(dy, dx);
    const pulse = 0.85 + 0.15 * Math.sin(animNow / 180 + m.playerId.length);

    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha * pulse;
    ctx.fillStyle = m.color || "#ef4444";
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-9, 8);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-9, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = "#fecaca";
    ctx.font = "700 11px Space Grotesk, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lx = ex - Math.cos(angle) * 18;
    const ly = ey - Math.sin(angle) * 18;
    ctx.fillText("☠", lx, ly);
    ctx.restore();
  }
}

function setRoleHudDisplay(mapNameOverride) {
  if (mapNameOverride !== undefined) hudMapName = mapNameOverride || "";
  const me = state?.players?.[myId];
  roleHud.classList.remove(
    "role-innocent",
    "role-impostor",
    "role-ghost",
    "role-inspecteur",
    "role-medecin"
  );
  const mapBit = hudMapName ? ` · ${hudMapName}` : "";

  if (me && !me.alive) {
    roleHud.classList.add("role-ghost");
    let ghostLine = `Fantôme 👻${mapBit}`;
    if (iHaveDoctorProtection && resurrectOfferEndsAt > Date.now()) {
      ghostLine = `Médecin : 1/3 pour revivre${mapBit}`;
    } else if (iHaveDoctorProtection) {
      ghostLine = `Protégé par le médecin${mapBit}`;
    }
    roleHud.textContent = ghostLine;
    return;
  }
  if (myRole === "impostor") {
    roleHud.classList.add("role-impostor");
    roleHud.textContent = `Imposteur 🔪${mapBit}`;
  } else if (mySpecialRole === "inspecteur") {
    roleHud.classList.add("role-inspecteur");
    roleHud.textContent = `Inspecteur 🔍${mapBit}`;
  } else if (mySpecialRole === "medecin") {
    roleHud.classList.add("role-medecin");
    roleHud.textContent = `Médecin 🩺${mapBit}`;
  } else if (myRole === "innocent") {
    roleHud.classList.add("role-innocent");
    roleHud.textContent = `Innocent 🛡️${mapBit}`;
  } else {
    roleHud.textContent = "Rôle —";
  }
}

function processDeathTransitions(s) {
  if (!s?.players || phase !== "playing") return;
  const me = s.players[myId];
  for (const [id, p] of Object.entries(s.players)) {
    const prev = playerAlivePrev[id];
    if (prev === true && p.alive === false) {
      const cx = p.corpseX ?? p.x;
      const cy = p.corpseY ?? p.y;
      const victimName = p.name || "Joueur";
      deathBursts.push({
        x: cx,
        y: cy,
        color: id === myId ? p.color : p.appearanceColor || p.color,
        start: performance.now(),
        isMe: id === myId,
      });
      Sfx?.deathBurst();
      if (id === myId) {
        deathFlashUntil = performance.now() + 700;
        haptic("death");
        powerBar.classList.add("hidden");
        powerBar.innerHTML = "";
        if (deathBannerText) {
          deathBannerText.textContent = "Tu es mort — tu deviens fantôme 👻";
          deathBanner.classList.remove("hidden");
          deathBanner.classList.remove("visible");
          void deathBanner.offsetWidth;
          deathBanner.classList.add("visible");
          if (deathBannerHideTimer) clearTimeout(deathBannerHideTimer);
          deathBannerHideTimer = setTimeout(() => {
            deathBannerHideTimer = null;
            hideDeathBanner();
          }, 4500);
        }
      } else {
        if (me?.alive && mySpecialRole === "inspecteur") {
          addDeathMarker(id, cx, cy, victimName, p.color);
          showDeathBanner(victimName);
        }
        if (myRole === "impostor") {
          Sfx?.kill();
          haptic("kill");
        }
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

function resetWheelUi() {
  wheelSpinning = false;
  wheelRotationDeg = Math.random() * 360;
  if (resurrectWheel) {
    resurrectWheel.classList.remove("spinning");
    resurrectWheel.style.transform = `rotate(${wheelRotationDeg}deg)`;
  }
  if (resurrectSpinBtn) {
    resurrectSpinBtn.disabled = false;
    resurrectSpinBtn.textContent = "Tourner la roue";
  }
  if (resurrectWheelMsg) {
    resurrectWheelMsg.textContent = "";
    resurrectWheelMsg.classList.remove("win", "lose");
  }
}

function hideResurrectPrompt() {
  resurrectPrompt.classList.add("hidden");
  resurrectOfferEndsAt = 0;
  resetWheelUi();
  if (resurrectCountdownTimer) {
    clearInterval(resurrectCountdownTimer);
    resurrectCountdownTimer = null;
  }
}

function showResurrectPrompt(timeoutMs, options = {}) {
  Sfx?.unlock();
  Sfx?.resurrectOffer();
  haptic("offer");
  applyWheelUiConfig(options.segments || 3, options.oddsLabel || "1/3");
  if (resurrectTitle) {
    resurrectTitle.textContent =
      options.mode === "doctor"
        ? "Le médecin veut te sauver"
        : "Roue de la seconde chance";
  }
  if (resurrectHint) {
    resurrectHint.innerHTML =
      options.mode === "doctor"
        ? "<strong>1 chance sur 3</strong> de revivre — une seule tentative."
        : "<strong>Tourne la roue</strong> une fois.";
  }
  resetWheelUi();
  resurrectOfferEndsAt = Date.now() + timeoutMs;
  resurrectPrompt.classList.remove("hidden");
  setRoleHudDisplay();
  const tick = () => {
    const left = Math.max(0, resurrectOfferEndsAt - Date.now());
    const sec = Math.ceil(left / 1000);
    resurrectCountdown.textContent = left > 0 ? `Temps pour tourner : ${sec} s` : "Temps écoulé…";
  };
  tick();
  if (resurrectCountdownTimer) clearInterval(resurrectCountdownTimer);
  resurrectCountdownTimer = setInterval(tick, 250);
}

function wheelRotationForSegment(segmentIndex) {
  const extraSpins = 4 + Math.floor(Math.random() * 3);
  const segDeg = wheelSegmentDeg();
  const target =
    extraSpins * 360 + (wheelSegments - segmentIndex) * segDeg - segDeg / 2;
  return wheelRotationDeg + target;
}

function animateWheelToSegment(segmentIndex, onDone) {
  if (!resurrectWheel) {
    onDone?.();
    return;
  }
  const next = wheelRotationForSegment(segmentIndex);
  wheelRotationDeg = next % 360;
  resurrectWheel.classList.add("spinning");
  requestAnimationFrame(() => {
    resurrectWheel.style.transform = `rotate(${next}deg)`;
  });
  const onEnd = () => {
    resurrectWheel.classList.remove("spinning");
    resurrectWheel.removeEventListener("transitionend", onEnd);
    onDone?.();
  };
  resurrectWheel.addEventListener("transitionend", onEnd);
}

function requestWheelSpin() {
  if (wheelSpinning || !resurrectOfferEndsAt) return;
  if (Date.now() > resurrectOfferEndsAt + 400) {
    hideResurrectPrompt();
    return;
  }
  wheelSpinning = true;
  if (resurrectSpinBtn) {
    resurrectSpinBtn.disabled = true;
    resurrectSpinBtn.textContent = "La roue tourne…";
  }
  Sfx?.unlock();
  Sfx?.wheelSpin?.();
  socket.emit("resurrectChoice", true);
}

function sendResurrectDecline() {
  if (!resurrectOfferEndsAt || wheelSpinning) return;
  if (Date.now() > resurrectOfferEndsAt + 400) {
    hideResurrectPrompt();
    return;
  }
  Sfx?.unlock();
  hideResurrectPrompt();
  socket.emit("resurrectChoice", false);
}

if (resurrectSpinBtn) {
  resurrectSpinBtn.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    requestWheelSpin();
  });
}
resurrectNo.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  e.preventDefault();
  sendResurrectDecline();
});

if (doctorPickerClose) {
  doctorPickerClose.addEventListener("click", () => {
    Sfx?.unlock();
    hideDoctorPicker();
  });
}

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

socket.on("resurrectOffer", (payload) => {
  if (phase !== "playing") return;
  const timeoutMs = payload?.timeoutMs || 14000;
  showResurrectPrompt(timeoutMs, payload || {});
});

socket.on("doctorProtected", ({ message }) => {
  iHaveDoctorProtection = true;
  if (message && phase === "playing") {
    returnBannerText.textContent = message;
    returnBanner.classList.remove("hidden");
    returnBanner.classList.add("visible");
    setTimeout(() => hideReturnBanner(), 4200);
  }
  setRoleHudDisplay();
});

socket.on("doctorSelectResult", (data) => {
  if (!data?.ok) {
    if (data?.reason === "already_picked") myDoctorPickDone = true;
    return;
  }
  myDoctorPickDone = true;
  doctorPatientName = data.targetName || null;
  buildPowerBar();
});

socket.on("resurrectOfferClosed", () => {
  hideResurrectPrompt();
});

socket.on("resurrectResult", (data) => {
  if (data?.reason === "declined" || data?.reason === "expired") {
    hideResurrectPrompt();
    return;
  }
  if (data?.reason === "already_spun") {
    wheelSpinning = false;
    if (resurrectSpinBtn) resurrectSpinBtn.disabled = true;
    return;
  }
  if (typeof data?.won === "boolean") {
    const winSegment = data.won ? 0 : 1 + Math.floor(Math.random() * (wheelSegments - 1));
    animateWheelToSegment(winSegment, () => {
      wheelSpinning = false;
      if (resurrectWheelMsg) {
        if (data.won) {
          resurrectWheelMsg.textContent = "Gagné ! Tu reviens à la vie !";
          resurrectWheelMsg.classList.add("win");
          Sfx?.wheelWin?.();
          haptic("return");
          iHaveDoctorProtection = false;
          setTimeout(hideResurrectPrompt, 900);
        } else {
          resurrectWheelMsg.textContent = "Perdu… tu restes fantôme.";
          resurrectWheelMsg.classList.add("lose");
          Sfx?.wheelLose?.();
          haptic("defeat");
          iHaveDoctorProtection = false;
          setTimeout(hideResurrectPrompt, 1400);
        }
      } else {
        hideResurrectPrompt();
      }
    });
    return;
  }
  hideResurrectPrompt();
});

socket.on("playerResurrected", (data) => {
  if (data?.playerId) removeDeathMarker(data.playerId);
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
  const meState = s.players?.[myId];
  if (meState?.alive && phase === "playing" && powerBar.children.length === 0) {
    buildPowerBar();
  }
  if (meState && !meState.alive && powerBar.children.length > 0) {
    powerBar.innerHTML = "";
    powerBar.classList.add("hidden");
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
  if (playerCountBadge) {
    playerCountBadge.textContent = String(lobbyData.players.length);
  }
  if (lobbyMeta && lobbyData.settings) {
    const pwr = lobbyData.settings.powersEnabled !== false ? "Pouvoirs ON" : "Pouvoirs OFF";
    lobbyMeta.textContent = `${lobbyData.players.length} joueur(s) · ${lobbyData.settings.impostors} imposteur(s) · ${formatTime(lobbyData.settings.timerSec * 1000)} · ${pwr}`;
  }
  drawLobbyMapPreview(lobbyData.mapPreview);
  updateMapVoteUi();
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
    if (p.id === myId) li.classList.add("is-me");
    const dot = document.createElement("span");
    dot.className = "player-dot";
    dot.style.background = p.color;
    li.appendChild(dot);
    const label = document.createElement("span");
    label.className = "player-name";
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

function fullMapVisibility(map) {
  const { w, h } = map;
  const vis = [];
  for (let ty = 0; ty < h; ty++) {
    vis[ty] = [];
    for (let tx = 0; tx < w; tx++) vis[ty][tx] = true;
  }
  return vis;
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

function playerCorpsePos(p) {
  if (p.alive) return { x: p.x, y: p.y };
  return {
    x: p.corpseX != null ? p.corpseX : p.x,
    y: p.corpseY != null ? p.corpseY : p.y,
  };
}

function localPlayerIsGhost() {
  const me = state?.players?.[myId];
  return Boolean(me && !me.alive && phase === "playing" && !state?.gameOver);
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

function corridorOrientation(maze, tx, ty, mw, mh) {
  const up = ty > 0 && maze[ty - 1][tx] === 1;
  const down = ty < mh - 1 && maze[ty + 1][tx] === 1;
  const left = tx > 0 && maze[ty][tx - 1] === 1;
  const right = tx < mw - 1 && maze[ty][tx + 1] === 1;
  if (up && down) return "h";
  if (left && right) return "v";
  return null;
}

function drawMapBackground(map, t) {
  const calm = Comfort?.shouldReduceMotion?.();
  const W = map.w * map.tile;
  const H = map.h * map.tile;
  const pulse = calm ? 0.5 : 0.5 + 0.5 * Math.sin(t * 0.72);
  const g = ctx.createRadialGradient(W * 0.5, H * 0.5, 30, W * 0.5, H * 0.5, Math.max(W, H) * 0.72);
  g.addColorStop(0, `rgba(45, 70, 110, ${0.32 + pulse * 0.1})`);
  g.addColorStop(0.5, "rgba(18, 24, 38, 0.95)");
  g.addColorStop(1, "rgba(4, 6, 10, 1)");
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

function canSeePlayer(me, other, maze, tile, viewerIsGhost) {
  if (viewerIsGhost) {
    if (other.alive) return true;
    return false;
  }
  if (other.hidden && other.id !== myId) return false;
  const radius = myViewRadius(me);
  const maxWalls = myMaxWallSegments(me);
  if (!other.alive) return false;
  const d = Math.hypot(other.x - me.x, other.y - me.y);
  if (d > radius) return false;
  return hasLineOfSight(me.x, me.y, other.x, other.y, maze, tile, maxWalls);
}

function corpseVisibleToViewer(corpseX, corpseY, me, maze, tile, viewerIsGhost) {
  if (viewerIsGhost) return true;
  const radius = myViewRadius(me);
  const maxWalls = myMaxWallSegments(me);
  const d = Math.hypot(corpseX - me.x, corpseY - me.y);
  if (d > radius + tile) return false;
  return hasLineOfSight(me.x, me.y, corpseX, corpseY, maze, tile, maxWalls);
}

function drawTile(x, y, tile, isWall, visible, tx, ty, t, maze, mw, mh) {
  if (!visible) return;
  const tilePulse = 0.5 + 0.5 * Math.sin(t * 1.6 + tx * 0.55 + ty * 0.42);
  if (isWall) {
    const calm = Comfort?.shouldReduceMotion?.();
    const vibrate = calm ? 0 : Math.sin(t * 3.2 + tx * 1.1 + ty * 0.8) * 0.22;
    const wx = x + vibrate;
    const wy = y + vibrate * 0.6;
    const wallGrad = ctx.createLinearGradient(wx, wy, wx, wy + tile);
    const top = 48 + tilePulse * 12;
    wallGrad.addColorStop(0, `rgb(${top + 8}, ${top + 22}, ${top + 48})`);
    wallGrad.addColorStop(0.55, `rgb(${32 + tilePulse * 5}, ${40 + tilePulse * 4}, ${58 + tilePulse * 5})`);
    wallGrad.addColorStop(1, `rgb(${18 + tilePulse * 3}, ${22 + tilePulse * 2}, ${32 + tilePulse * 3})`);
    ctx.fillStyle = wallGrad;
    ctx.fillRect(wx, wy, tile, tile);
    ctx.strokeStyle = `rgba(90, 120, 165, ${0.5 + tilePulse * 0.15})`;
    ctx.strokeRect(wx + 0.5, wy + 0.5, tile - 1, tile - 1);
    const shimmer = 3 + Math.sin(t * 2.8 + tx + ty) * 2;
    ctx.fillStyle = `rgba(180, 220, 255, ${0.1 + tilePulse * 0.08})`;
    ctx.fillRect(wx + shimmer, wy + 2, tile - shimmer * 2, 4);
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(wx, wy + tile - 5, tile, 5);
  } else {
    const floorGrad = ctx.createLinearGradient(x, y, x + tile, y + tile);
    const lift = tilePulse * 6;
    floorGrad.addColorStop(0, `rgb(${42 + lift}, ${58 + lift}, ${78 + lift})`);
    floorGrad.addColorStop(1, `rgb(${28 + lift * 0.4}, ${36 + lift * 0.35}, ${50 + lift * 0.4})`);
    ctx.fillStyle = floorGrad;
    ctx.fillRect(x, y, tile, tile);
    const checker = (tx + ty) % 2 === 0;
    ctx.fillStyle = `rgba(255, 255, 255, ${checker ? 0.04 + tilePulse * 0.02 : 0.018})`;
    ctx.fillRect(x, y, tile, tile);
    if (maze && mw && mh) {
      const orient = corridorOrientation(maze, tx, ty, mw, mh);
      if (orient) {
        ctx.strokeStyle = `rgba(34, 211, 238, ${0.22 + tilePulse * 0.12})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const cx = x + tile / 2;
        const cy = y + tile / 2;
        if (orient === "h") {
          ctx.moveTo(x + 4, cy);
          ctx.lineTo(x + tile - 4, cy);
        } else {
          ctx.moveTo(cx, y + 4);
          ctx.lineTo(cx, y + tile - 4);
        }
        ctx.stroke();
      }
    }
    ctx.strokeStyle = `rgba(80, 130, 180, ${0.1 + tilePulse * 0.06})`;
    ctx.strokeRect(x + 1.5, y + 1.5, tile - 3, tile - 3);
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
      drawTile(
        tx * tile,
        ty * tile,
        tile,
        maze[ty][tx] === 1,
        vis[ty][tx],
        tx,
        ty,
        t,
        maze,
        w,
        h
      );
    }
  }
}

function drawFog(map, vis, t) {
  const { tile, w, h } = map;
  const fogPulse = 0.78 + 0.04 * Math.sin(t * 1.3);
  ctx.fillStyle = `rgba(2, 4, 10, ${fogPulse})`;
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

function drawCorpseBody(p, t) {
  const { x, y } = playerCorpsePos(p);
  const size = 26;
  const bob = Math.sin(t * 2.2) * 0.5;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(p.angle);
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(-size / 2 + 2, size / 2 - 2, size - 4, 6);
  ctx.fillStyle = playerDrawColor(p, false);
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.strokeRect(-size / 2, -size / 2, size, size);
  ctx.fillStyle = "#fff";
  ctx.font = "700 16px Space Grotesk, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("✕", 0, 1);
  ctx.restore();
  ctx.fillStyle = "rgba(148, 163, 184, 0.75)";
  ctx.font = "600 10px Space Grotesk, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(playerDrawName(p, false), x, y - 20);
}

function drawGhostCube(p, isMe, t) {
  const size = 24;
  const float = Math.sin(t * 3.5 + (p.id?.length || 0)) * 3;
  ctx.save();
  ctx.translate(p.x, p.y + float);
  ctx.rotate(p.angle);
  ctx.globalAlpha = isMe ? 0.72 : 0.55;
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, size);
  glow.addColorStop(0, "rgba(186, 230, 253, 0.35)");
  glow.addColorStop(1, "rgba(186, 230, 253, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(-size, -size, size * 2, size * 2);
  ctx.fillStyle = isMe ? "rgba(224, 242, 254, 0.55)" : "rgba(148, 163, 184, 0.4)";
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.strokeStyle = isMe ? "#e0f2fe" : "rgba(226, 232, 240, 0.65)";
  ctx.lineWidth = isMe ? 2.5 : 2;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(-size / 2, -size / 2, size, size);
  ctx.setLineDash([]);
  ctx.font = "700 14px Space Grotesk, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f8fafc";
  ctx.fillText("👻", 0, 1);
  ctx.restore();
  ctx.fillStyle = isMe ? "#bae6fd" : "rgba(186, 230, 253, 0.75)";
  ctx.font = "600 10px Space Grotesk, sans-serif";
  ctx.textAlign = "center";
  const label = isMe ? `${playerDrawName(p, true)} (fantôme)` : playerDrawName(p, false);
  ctx.fillText(label, p.x, p.y + float - 22);
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
  setRoleHudDisplay();
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
  const iAmGhost = localPlayerIsGhost();
  if (me) {
    camera.x = me.x;
    camera.y = me.y;
    visibility = iAmGhost
      ? fullMapVisibility(state.map)
      : computeVisibility(state.map, me.x, me.y, me);
  }

  const viewR = me ? myViewRadius(me) : VIEW_RADIUS;
  const wobble = iAmGhost ? { wx: 0, wy: 0, scale: 1 } : mapCameraWobble(t);

  ctx.save();
  ctx.translate(canvas.width / 2 + wobble.wx, canvas.height / 2 + wobble.wy);
  ctx.scale(wobble.scale, wobble.scale);
  ctx.translate(-camera.x, -camera.y);

  if (visibility) {
    drawMapBackground(state.map, t);
    drawMaze(state.map, visibility, t);
    drawMapAmbient(state.map, visibility, t);
    if (me && me.alive) drawPlayerGlow(me.x, me.y, viewR, t);
    if (iAmGhost && me) drawPlayerGlow(me.x, me.y, Math.max(viewR, 120), t);
  }

  const { maze, tile } = state.map;
  for (const p of Object.values(state.players)) {
    if (!p.portal) continue;
    const portalVisible =
      iAmGhost ||
      p.id === myId ||
      (me && hasLineOfSight(me.x, me.y, p.portal.x, p.portal.y, maze, tile));
    if (portalVisible) drawPortal(p.portal, t);
  }

  const corpses = [];
  const ghosts = [];
  const living = [];
  for (const p of Object.values(state.players)) {
    if (!p.alive) {
      corpses.push(p);
      ghosts.push(p);
    } else {
      living.push(p);
    }
  }

  const drawCorpseIfVisible = (p) => {
    const c = playerCorpsePos(p);
    if (!me) return;
    if (!corpseVisibleToViewer(c.x, c.y, me, maze, tile, iAmGhost)) return;
    drawCorpseBody(p, t);
  };

  for (const p of corpses.sort((a, b) => playerCorpsePos(a).y - playerCorpsePos(b).y)) {
    drawCorpseIfVisible(p);
  }

  drawDeathBursts(animNow);
  drawReturnBursts(animNow);

  for (const p of living.sort((a, b) => a.y - b.y)) {
    if (p.id === myId) {
      drawPlayerCube(p, true, false);
      continue;
    }
    const visible = me && canSeePlayer(me, p, maze, tile, iAmGhost);
    if (visible) drawPlayerCube(p, false, false);
  }

  if (iAmGhost) {
    for (const p of ghosts.sort((a, b) => a.y - b.y)) {
      drawGhostCube(p, p.id === myId, t);
    }
  }

  if (visibility && !iAmGhost) {
    drawFog(state.map, visibility, t);
  }

  ctx.restore();

  if (me?.alive && !iAmGhost) {
    drawDeathCompassIndicators(animNow, me, iAmGhost);
  }

  if (!iAmGhost) {
    drawScreenVignette(t);
  } else {
    ctx.fillStyle = "rgba(34, 211, 238, 0.04)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

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

  if (iAmGhost && resurrectPrompt.classList.contains("hidden")) {
    ctx.fillStyle = "rgba(186, 230, 253, 0.92)";
    ctx.font = "600 13px Space Grotesk";
    ctx.textAlign = "center";
    let ghostHint =
      "Fantôme — 3× plus rapide, traverse les murs, vue totale, pas de pouvoirs";
    if (iHaveDoctorProtection && resurrectOfferEndsAt > Date.now()) {
      ghostHint = "Le médecin t’a protégé — tourne la roue : 1 chance sur 3 de revivre";
    } else if (iHaveDoctorProtection) {
      ghostHint = "Tu étais protégé par le médecin";
    }
    ctx.fillText(ghostHint, canvas.width / 2, canvas.height - 36);
  }

  updateHud();
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
