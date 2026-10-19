const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const screenHome = document.getElementById("screenHome");
const screenLobby = document.getElementById("screenLobby");
const hudTop = document.getElementById("hudTop");
const endScreen = document.getElementById("endScreen");
const endTitle = document.getElementById("endTitle");
const endMessage = document.getElementById("endMessage");
const nameInput = document.getElementById("name");
const roomCodeInput = document.getElementById("roomCode");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const startBtn = document.getElementById("startBtn");
const homeError = document.getElementById("homeError");
const lobbyError = document.getElementById("lobbyError");
const lobbyCodeEl = document.getElementById("lobbyCode");
const playerList = document.getElementById("playerList");
const lobbyStatus = document.getElementById("lobbyStatus");
const colorPicker = document.getElementById("colorPicker");
const hostSettings = document.getElementById("hostSettings");
const impostorSelect = document.getElementById("impostorSelect");
const timerSelect = document.getElementById("timerSelect");
const roomHud = document.getElementById("roomHud");
const roleHud = document.getElementById("roleHud");
const timerHud = document.getElementById("timerHud");
const aliveHud = document.getElementById("aliveHud");
const killBtn = document.getElementById("killBtn");

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
const KILL_RANGE = 52;

const socket = io();
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

function showHome() {
  phase = "home";
  screenHome.classList.remove("hidden");
  screenLobby.classList.add("hidden");
  overlay.classList.remove("hidden");
  hudTop.classList.add("hidden");
  endScreen.classList.add("hidden");
  killBtn.classList.add("hidden");
}

function showLobby() {
  phase = "lobby";
  screenHome.classList.add("hidden");
  screenLobby.classList.remove("hidden");
  overlay.classList.remove("hidden");
  hudTop.classList.add("hidden");
  endScreen.classList.add("hidden");
  killBtn.classList.add("hidden");
}

function showGame() {
  phase = "playing";
  overlay.classList.add("hidden");
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

createBtn.addEventListener("click", () => {
  hideErrors();
  socket.emit("createRoom", getName());
});

joinBtn.addEventListener("click", () => {
  hideErrors();
  const code = roomCodeInput.value.trim();
  if (code.length !== 3) {
    showError(homeError, "Entre un code à 3 chiffres.");
    return;
  }
  socket.emit("joinRoom", { code, name: getName() });
});

startBtn.addEventListener("click", () => {
  lobbyError.classList.add("hidden");
  socket.emit("startGame");
});

function emitSettings() {
  if (!isHost) return;
  socket.emit("updateSettings", {
    impostors: Number(impostorSelect.value),
    timerSec: Number(timerSelect.value),
  });
}

impostorSelect.addEventListener("change", emitSettings);
timerSelect.addEventListener("change", emitSettings);

socket.on("errorMsg", ({ message }) => {
  if (phase === "home") showError(homeError, message);
  else showError(lobbyError, message);
});

socket.on("joinedRoom", ({ id, code, isHost: host }) => {
  myId = id;
  roomCode = code;
  isHost = host;
  lobbyCodeEl.textContent = code;
  roomHud.textContent = `Salle ${code}`;
  showLobby();
  updateLobbyUi();
});

socket.on("lobby", (data) => {
  lobbyData = data;
  isHost = data.hostId === myId;
  if (data.settings) {
    impostorSelect.value = String(data.settings.impostors);
    timerSelect.value = String(data.settings.timerSec);
  }
  const me = data.players.find((p) => p.id === myId);
  if (me) myColor = me.color;
  updateLobbyUi();
});

socket.on("gameStarted", ({ role }) => {
  myRole = role;
  roleHud.textContent = role === "impostor" ? "Rôle : Imposteur" : "Rôle : Innocent";
  showGame();
});

socket.on("state", (s) => {
  state = s;
  if (s.gameOver) {
    endScreen.classList.remove("hidden");
    if (s.winner === "innocents") {
      endTitle.textContent = "Victoire des innocents !";
    } else {
      endTitle.textContent = "Victoire des imposteurs !";
    }
    endMessage.textContent = s.endReason || "";
  }
});

function updateLobbyUi() {
  if (!lobbyData) return;
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
    lobbyStatus.textContent = "La partie commence…";
    return;
  }

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
  if (keys["KeyW"] || keys["KeyZ"] || keys["ArrowUp"]) vy -= 1;
  if (keys["KeyS"] || keys["ArrowDown"]) vy += 1;
  if (keys["KeyA"] || keys["KeyQ"] || keys["ArrowLeft"]) vx -= 1;
  if (keys["KeyD"] || keys["ArrowRight"]) vx += 1;
  const len = Math.hypot(vx, vy);
  if (len > 0) {
    vx /= len;
    vy /= len;
  }

  const me = state?.players?.[myId];
  let angle = me?.angle ?? 0;
  if (me) {
    const wx = me.x - camera.x + canvas.width / 2;
    const wy = me.y - camera.y + canvas.height / 2;
    angle = Math.atan2(mouse.y - wy, mouse.x - wx);
  }

  return { vx, vy, angle, kill: killPressed };
}

setInterval(() => {
  if (!myId || phase !== "playing" || state?.gameOver) return;
  const input = getInput();
  socket.emit("input", input);
  if (input.kill) killPressed = false;
}, 1000 / 30);

function tileBlocksSight(maze, tx, ty) {
  if (ty < 0 || tx < 0 || ty >= maze.length || tx >= maze[0].length) return true;
  return maze[ty][tx] === 1;
}

function hasLineOfSight(x0, y0, x1, y1, maze, tile) {
  const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (tile / 2)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const tx = Math.floor(x / tile);
    const ty = Math.floor(y / tile);
    if (tileBlocksSight(maze, tx, ty)) return false;
  }
  return true;
}

function computeVisibility(map, px, py) {
  const { maze, tile, w, h } = map;
  const vis = [];
  for (let ty = 0; ty < h; ty++) {
    vis[ty] = [];
    for (let tx = 0; tx < w; tx++) {
      const cx = tx * tile + tile / 2;
      const cy = ty * tile + tile / 2;
      const inRange = Math.hypot(cx - px, cy - py) <= VIEW_RADIUS + tile;
      vis[ty][tx] =
        inRange && hasLineOfSight(px, py, cx, cy, maze, tile);
    }
  }
  return vis;
}

function canSeePlayer(me, other, maze, tile) {
  if (!other.alive) {
    return hasLineOfSight(me.x, me.y, other.x, other.y, maze, tile);
  }
  const d = Math.hypot(other.x - me.x, other.y - me.y);
  if (d > VIEW_RADIUS) return false;
  return hasLineOfSight(me.x, me.y, other.x, other.y, maze, tile);
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

function drawPlayerGlow(px, py) {
  const glow = ctx.createRadialGradient(px, py, 8, px, py, VIEW_RADIUS * 0.85);
  glow.addColorStop(0, "rgba(120, 170, 255, 0.22)");
  glow.addColorStop(0.45, "rgba(80, 120, 200, 0.08)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(px - VIEW_RADIUS, py - VIEW_RADIUS, VIEW_RADIUS * 2, VIEW_RADIUS * 2);
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

function drawPlayerCube(p, isMe, dead) {
  const size = 26;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);

  if (dead) {
    ctx.globalAlpha = 0.45;
  }

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(-size / 2 + 2, size / 2 - 2, size - 4, 6);

  ctx.fillStyle = p.color || "#ef4444";
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
    ctx.fillText(p.name, p.x, p.y - 22);
  }
}

function canKillNearby(me) {
  if (!me?.alive || !state?.map) return false;
  const { maze, tile } = state.map;
  for (const p of Object.values(state.players)) {
    if (!p.alive || p.id === myId) continue;
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
    visibility = computeVisibility(state.map, me.x, me.y);
  }

  ctx.save();
  ctx.translate(canvas.width / 2 - camera.x, canvas.height / 2 - camera.y);

  if (visibility) {
    drawMaze(state.map, visibility);
    if (me) drawPlayerGlow(me.x, me.y);
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
