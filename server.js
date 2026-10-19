const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const PORT = process.env.PORT || 3000;
const TICK_MS = 50;
const MAP_W = 25;
const MAP_H = 15;
const TILE = 40;
const PLAYER_RADIUS = 14;
const PLAYER_SPEED = 180;
const KILL_RANGE = 52;
const KILL_COOLDOWN_MS = 25000;
const POWER_DURATION_MS = 4000;
const POWER_COOLDOWN_MS = 6000;
const SPEED_BOOST_MULT = 1.4;
const POWER_IDS = ["portal", "invisible", "speed"];

function defaultPowers() {
  return { portal: true, invisible: true, speed: true };
}

const TIMER_OPTIONS = [90, 120, 150, 180];
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

const MAZE = [
  "1111111111111111111111111",
  "1000000010001000000010001",
  "1011111010111011111010111",
  "1000000000000000000000001",
  "1010111111110111111110101",
  "1000100000000100000000101",
  "1110101111110101111110101",
  "1000101000000101000000101",
  "1011101011110101011110101",
  "1000001000000101000000101",
  "1011111011110101011110101",
  "1000000000000000000000101",
  "1011111111110111111110101",
  "1000000010001000000010001",
  "1111111111111111111111111",
].map((row) => row.split("").map(Number));

const SPAWN_POINTS = [];
for (let ty = 1; ty < MAP_H - 1; ty++) {
  for (let tx = 1; tx < MAP_W - 1; tx++) {
    if (MAZE[ty][tx] === 0) {
      SPAWN_POINTS.push({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });
    }
  }
}

function tileAt(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 1;
  return MAZE[ty][tx];
}

function circleOverlapsWall(cx, cy, r) {
  const minTx = Math.floor((cx - r) / TILE);
  const maxTx = Math.floor((cx + r) / TILE);
  const minTy = Math.floor((cy - r) / TILE);
  const maxTy = Math.floor((cy + r) / TILE);

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (tileAt(tx, ty) !== 1) continue;
      const rx = tx * TILE;
      const ry = ty * TILE;
      const closestX = Math.max(rx, Math.min(cx, rx + TILE));
      const closestY = Math.max(ry, Math.min(cy, ry + TILE));
      const dx = cx - closestX;
      const dy = cy - closestY;
      if (dx * dx + dy * dy < r * r) return true;
    }
  }
  return false;
}

function pushCircleOutOfWalls(cx, cy, r) {
  let x = cx;
  let y = cy;
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    const minTx = Math.floor((x - r) / TILE);
    const maxTx = Math.floor((x + r) / TILE);
    const minTy = Math.floor((y - r) / TILE);
    const maxTy = Math.floor((y + r) / TILE);

    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (tileAt(tx, ty) !== 1) continue;
        const rx = tx * TILE;
        const ry = ty * TILE;
        const closestX = Math.max(rx, Math.min(x, rx + TILE));
        const closestY = Math.max(ry, Math.min(y, ry + TILE));
        let dx = x - closestX;
        let dy = y - closestY;
        const distSq = dx * dx + dy * dy;
        if (distSq >= r * r) continue;

        if (distSq === 0) {
          const left = x - rx;
          const right = rx + TILE - x;
          const top = y - ry;
          const bottom = ry + TILE - y;
          const min = Math.min(left, right, top, bottom);
          if (min === left) dx = -1;
          else if (min === right) dx = 1;
          else if (min === top) dy = -1;
          else dy = 1;
          const len = Math.hypot(dx, dy) || 1;
          dx /= len;
          dy /= len;
          x += dx * (r + 0.5);
          y += dy * (r + 0.5);
        } else {
          const dist = Math.sqrt(distSq);
          const push = r - dist + 0.5;
          x += (dx / dist) * push;
          y += (dy / dist) * push;
        }
        moved = true;
      }
    }
    if (!moved) break;
  }
  return { x, y };
}

function moveCircle(x, y, dx, dy, r) {
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  const stepX = dx / steps;
  const stepY = dy / steps;

  for (let i = 0; i < steps; i++) {
    let nx = x + stepX;
    if (!circleOverlapsWall(nx, y, r)) x = nx;
    let ny = y + stepY;
    if (!circleOverlapsWall(x, ny, r)) y = ny;
    const fixed = pushCircleOutOfWalls(x, y, r);
    x = fixed.x;
    y = fixed.y;
  }
  return { x, y };
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function hasLineOfSight(x0, y0, x1, y1) {
  const steps = Math.max(2, Math.ceil(dist(x0, y0, x1, y1) / (TILE / 2)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    if (tileAt(tx, ty) === 1) return false;
  }
  return true;
}

function getSpawn() {
  const i = Math.floor(Math.random() * SPAWN_POINTS.length);
  return SPAWN_POINTS[i];
}

function defaultSettings() {
  return { impostors: 1, timerSec: 120 };
}

function pickFreeColor(room) {
  const used = new Set([...room.players.values()].map((p) => p.color));
  for (const color of COLOR_OPTIONS) {
    if (!used.has(color)) return color;
  }
  return COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)];
}

function lobbyPlayer(id, name, room) {
  return {
    id,
    name: (name || "Joueur").slice(0, 16),
    color: pickFreeColor(room),
    powers: defaultPowers(),
  };
}

function lobbyPayload(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    settings: room.settings,
    players: [...room.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      powers: p.powers || defaultPowers(),
    })),
  };
}

function normalizeRoomCode(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 0) return "";
  return digits.padStart(3, "0").slice(-3);
}

function initGameFields(p) {
  const spawn = getSpawn();
  p.x = spawn.x;
  p.y = spawn.y;
  p.angle = 0;
  p.vx = 0;
  p.vy = 0;
  p.alive = true;
  p.online = true;
  p.role = "innocent";
  p.lastKill = 0;
  p.portal = null;
  p.invisibleUntil = 0;
  p.speedUntil = 0;
  p.powerCooldownUntil = { invisible: 0, speed: 0 };
  if (!p.powers) p.powers = defaultPowers();
  const fixed = pushCircleOutOfWalls(p.x, p.y, PLAYER_RADIUS);
  p.x = fixed.x;
  p.y = fixed.y;
}

function isPlayerActive(p) {
  return p && p.online !== false;
}

function countAliveByRole(room, role) {
  let n = 0;
  for (const p of room.players.values()) {
    if (!isPlayerActive(p) || !p.alive || p.role !== role) continue;
    n++;
  }
  return n;
}

function countOnlinePlayers(room) {
  let n = 0;
  for (const p of room.players.values()) {
    if (isPlayerActive(p)) n++;
  }
  return n;
}

function purgeOfflinePlayers(room) {
  for (const [id, p] of room.players) {
    if (p.online === false) room.players.delete(id);
  }
}

function attachSocketToRoom(socket, room, player) {
  player.online = true;
  room.players.set(socket.id, player);
  socketRoom.set(socket.id, room.code);
  socket.join(room.code);
}

function ensureRoomSettings(room) {
  const impostors = Number(room.settings?.impostors);
  const timerSec = Number(room.settings?.timerSec);
  room.settings = {
    impostors: [1, 2, 3].includes(impostors) ? impostors : 1,
    timerSec: TIMER_OPTIONS.includes(timerSec) ? timerSec : 120,
  };
}

function assignRoles(room) {
  ensureRoomSettings(room);
  const ids = [...room.players.keys()];
  const maxImpostors = Math.min(room.settings.impostors, Math.max(0, ids.length - 1));
  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  for (const p of room.players.values()) {
    p.role = "innocent";
  }
  for (let i = 0; i < maxImpostors; i++) {
    const player = room.players.get(shuffled[i]);
    if (player) player.role = "impostor";
  }
}

function checkGameEnd(room) {
  if (room.gameOver) return;
  if (room.startedAt && Date.now() - room.startedAt < 3000) return;
  const innocents = countAliveByRole(room, "innocent");
  const impostors = countAliveByRole(room, "impostor");
  const now = Date.now();

  if (innocents === 0 && impostors > 0) {
    room.gameOver = true;
    room.winner = "impostors";
    room.endReason = "Tous les innocents ont été éliminés.";
    return;
  }

  if (impostors === 0 && innocents > 0) {
    room.gameOver = true;
    room.winner = "innocents";
    room.endReason = "Tous les imposteurs ont été éliminés.";
    return;
  }

  if (room.timerEndsAt && now >= room.timerEndsAt && innocents > 0) {
    room.gameOver = true;
    room.winner = "innocents";
    room.endReason = "Le temps est écoulé — des innocents sont encore en vie.";
  }
}

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();
const socketRoom = new Map();

function generateRoomCode() {
  for (let attempt = 0; attempt < 100; attempt++) {
    const code = String(Math.floor(100 + Math.random() * 900));
    if (!rooms.has(code)) return code;
  }
  return null;
}

function getRoomForSocket(socketId) {
  const code = socketRoom.get(socketId);
  if (!code) return null;
  return rooms.get(code) || null;
}

function publicPlayer(p, now = Date.now()) {
  return {
    id: p.id,
    name: p.name,
    x: p.x,
    y: p.y,
    angle: p.angle,
    alive: p.alive,
    color: p.color,
    hidden: p.invisibleUntil > now,
    speedActive: p.speedUntil > now,
    portal: p.portal ? { x: p.portal.x, y: p.portal.y } : null,
  };
}

function usePlayerPower(room, p, powerId) {
  if (!POWER_IDS.includes(powerId)) return;
  if (!p.powers?.[powerId] || !p.alive || p.online === false) return;
  const now = Date.now();

  if (powerId === "portal") {
    if (!p.portal) {
      p.portal = { x: p.x, y: p.y };
      return;
    }
    const dest = pushCircleOutOfWalls(p.portal.x, p.portal.y, PLAYER_RADIUS);
    p.x = dest.x;
    p.y = dest.y;
    p.vx = 0;
    p.vy = 0;
    return;
  }

  if (powerId === "invisible") {
    if (now < p.powerCooldownUntil.invisible) return;
    p.invisibleUntil = now + POWER_DURATION_MS;
    p.powerCooldownUntil.invisible = now + POWER_COOLDOWN_MS;
    return;
  }

  if (powerId === "speed") {
    if (now < p.powerCooldownUntil.speed) return;
    p.speedUntil = now + POWER_DURATION_MS;
    p.powerCooldownUntil.speed = now + POWER_COOLDOWN_MS;
  }
}

function broadcastLobby(room) {
  io.to(room.code).emit("lobby", lobbyPayload(room));
}

function broadcastState(room) {
  const now = Date.now();
  const players = {};
  for (const [id, p] of room.players) {
    if (room.status === "playing") players[id] = publicPlayer(p, now);
  }
  const timeLeftMs = room.timerEndsAt ? Math.max(0, room.timerEndsAt - now) : 0;

  io.to(room.code).emit("state", {
    status: room.status,
    players,
    map: { w: MAP_W, h: MAP_H, tile: TILE, maze: MAZE },
    timeLeftMs,
    gameOver: room.gameOver,
    winner: room.winner,
    endReason: room.endReason,
    innocentsAlive: countAliveByRole(room, "innocent"),
    t: now,
  });
}

function handleDisconnect(socket) {
  const code = socketRoom.get(socket.id);
  if (!code) return;
  const room = rooms.get(code);
  socket.leave(code);
  socketRoom.delete(socket.id);
  if (!room) return;

  if (room.status === "playing" && !room.gameOver) {
    const p = room.players.get(socket.id);
    if (p) {
      p.online = false;
      p.vx = 0;
      p.vy = 0;
      p.removeAt = Date.now() + 90000;
    }
    return;
  }

  removePlayerFromRoom(room, socket.id);
}

function removePlayerFromRoom(room, playerId) {
  room.players.delete(playerId);
  if (room.players.size === 0) {
    rooms.delete(room.code);
    return;
  }

  if (room.hostId === playerId) {
    room.hostId = room.players.keys().next().value;
  }
  broadcastLobby(room);
  if (room.status === "playing") {
    checkGameEnd(room);
    broadcastState(room);
  }
}

function leaveRoom(socket) {
  const code = socketRoom.get(socket.id);
  if (!code) return;
  const room = rooms.get(code);
  socket.leave(code);
  socketRoom.delete(socket.id);
  if (!room) return;
  removePlayerFromRoom(room, socket.id);
}

function tryRejoinPlayer(socket, room, name) {
  const trimmed = (name || "Joueur").slice(0, 16);
  for (const [playerId, p] of room.players) {
    if (p.name !== trimmed || p.online !== false) continue;
    room.players.delete(playerId);
    attachSocketToRoom(socket, room, p);
    socket.emit("joinedRoom", {
      id: socket.id,
      code: room.code,
      isHost: room.hostId === socket.id,
      lobby: lobbyPayload(room),
    });
    socket.emit("gameStarted", {
      role: p.role,
      timerSec: room.settings.timerSec,
    });
    broadcastState(room);
    return true;
  }
  return false;
}

function startRoomGame(room) {
  purgeOfflinePlayers(room);
  ensureRoomSettings(room);
  room.status = "playing";
  room.gameOver = false;
  room.winner = null;
  room.endReason = null;
  room.startedAt = Date.now();
  room.timerEndsAt = room.startedAt + room.settings.timerSec * 1000;

  for (const p of room.players.values()) {
    initGameFields(p);
  }
  assignRoles(room);

  for (const [id, p] of room.players) {
    const sock = io.sockets.sockets.get(id);
    if (sock) {
      sock.emit("gameStarted", {
        role: p.role,
        timerSec: room.settings.timerSec,
      });
    }
  }

  broadcastLobby(room);
  broadcastState(room);
}

function tryKill(room, killer) {
  if (room.gameOver || killer.role !== "impostor" || !killer.alive) return;
  const now = Date.now();
  if (now - killer.lastKill < KILL_COOLDOWN_MS) return;

  let target = null;
  let best = KILL_RANGE;
  for (const p of room.players.values()) {
    if (!isPlayerActive(p) || !p.alive || p.role !== "innocent" || p.id === killer.id) continue;
    const d = dist(killer.x, killer.y, p.x, p.y);
    if (d > KILL_RANGE) continue;
    if (!hasLineOfSight(killer.x, killer.y, p.x, p.y)) continue;
    if (p.invisibleUntil > now) continue;
    if (d < best) {
      best = d;
      target = p;
    }
  }

  if (!target) return;
  target.alive = false;
  killer.lastKill = now;
  checkGameEnd(room);
}

io.on("connection", (socket) => {
  socket.on("leaveRoom", () => {
    leaveRoom(socket);
    socket.emit("leftRoom");
  });

  socket.on("createRoom", (name) => {
    if (socketRoom.has(socket.id)) {
      leaveRoom(socket);
    }
    const code = generateRoomCode();
    if (!code) {
      socket.emit("errorMsg", { message: "Impossible de créer une salle. Réessaie." });
      return;
    }
    const room = {
      code,
      hostId: socket.id,
      status: "lobby",
      settings: defaultSettings(),
      players: new Map(),
      gameOver: false,
      winner: null,
      endReason: null,
      timerEndsAt: 0,
    };
    room.players.set(socket.id, lobbyPlayer(socket.id, name, room));
    rooms.set(code, room);
    socketRoom.set(socket.id, code);
    socket.join(code);
    socket.emit("joinedRoom", {
      id: socket.id,
      code,
      isHost: true,
      lobby: lobbyPayload(room),
    });
    broadcastLobby(room);
  });

  socket.on("joinRoom", ({ code, name }) => {
    if (socketRoom.has(socket.id)) {
      leaveRoom(socket);
    }
    const normalized = normalizeRoomCode(code);
    if (normalized.length !== 3) {
      socket.emit("errorMsg", { message: "Entre un code à 3 chiffres." });
      return;
    }
    const room = rooms.get(normalized);
    if (!room) {
      socket.emit("errorMsg", { message: "Code invalide. Vérifie les 3 chiffres." });
      return;
    }
    if (room.status !== "lobby") {
      if (tryRejoinPlayer(socket, room, name)) return;
      socket.emit("errorMsg", {
        message: "Partie en cours. Utilise le même pseudo pour revenir.",
      });
      return;
    }
    if (room.players.has(socket.id)) {
      socketRoom.set(socket.id, normalized);
      socket.join(normalized);
      socket.emit("joinedRoom", {
        id: socket.id,
        code: normalized,
        isHost: room.hostId === socket.id,
        lobby: lobbyPayload(room),
      });
      return;
    }
    room.players.set(socket.id, lobbyPlayer(socket.id, name, room));
    socketRoom.set(socket.id, normalized);
    socket.join(normalized);
    socket.emit("joinedRoom", {
      id: socket.id,
      code: normalized,
      isHost: room.hostId === socket.id,
      lobby: lobbyPayload(room),
    });
    broadcastLobby(room);
  });

  socket.on("updateSettings", (data) => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.hostId !== socket.id || room.status !== "lobby") return;
    const impostors = Number(data.impostors);
    const timerSec = Number(data.timerSec);
    if ([1, 2, 3].includes(impostors)) room.settings.impostors = impostors;
    if (TIMER_OPTIONS.includes(timerSec)) room.settings.timerSec = timerSec;
    broadcastLobby(room);
  });

  socket.on("setPowers", (powers) => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.status !== "lobby") return;
    const p = room.players.get(socket.id);
    if (!p) return;
    const next = defaultPowers();
    for (const id of POWER_IDS) {
      next[id] = Boolean(powers?.[id]);
    }
    if (!next.portal && !next.invisible && !next.speed) {
      socket.emit("errorMsg", { message: "Équipe au moins un pouvoir." });
      return;
    }
    p.powers = next;
    broadcastLobby(room);
  });

  socket.on("setColor", (color) => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.status !== "lobby") return;
    if (!COLOR_OPTIONS.includes(color)) return;
    const taken = [...room.players.values()].some((p) => p.id !== socket.id && p.color === color);
    if (taken) {
      socket.emit("errorMsg", { message: "Cette couleur est déjà prise." });
      return;
    }
    const p = room.players.get(socket.id);
    if (!p) return;
    p.color = color;
    broadcastLobby(room);
  });

  socket.on("startGame", () => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.hostId !== socket.id) return;
    if (room.status !== "lobby") return;
    purgeOfflinePlayers(room);
    const online = countOnlinePlayers(room);
    if (online < 2) {
      socket.emit("errorMsg", { message: "Il faut au moins 2 joueurs connectés pour commencer." });
      return;
    }
    if (room.settings.impostors >= online) {
      socket.emit("errorMsg", { message: "Trop d’imposteurs pour ce nombre de joueurs." });
      return;
    }
    startRoomGame(room);
  });

  socket.on("syncGame", () => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.status !== "playing") return;
    const p = room.players.get(socket.id);
    if (!p) return;
    socket.emit("gameStarted", {
      role: p.role,
      timerSec: room.settings.timerSec,
    });
    broadcastState(room);
  });

  socket.on("input", (data) => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.status !== "playing" || room.gameOver) return;
    const p = room.players.get(socket.id);
    if (!p || !p.alive || p.online === false) return;
    let vx = Number(data.vx) || 0;
    let vy = Number(data.vy) || 0;
    const vlen = Math.hypot(vx, vy);
    if (vlen > 1) {
      vx /= vlen;
      vy /= vlen;
    }
    p.vx = vx;
    p.vy = vy;
    if (typeof data.angle === "number") p.angle = data.angle;
    if (data.kill) tryKill(room, p);
  });

  socket.on("usePower", (powerId) => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.status !== "playing" || room.gameOver) return;
    const p = room.players.get(socket.id);
    if (!p) return;
    usePlayerPower(room, p, powerId);
  });

  socket.on("disconnect", () => {
    handleDisconnect(socket);
  });
});

function updatePlayers(room, dt) {
  for (const p of room.players.values()) {
    if (!isPlayerActive(p) || !p.alive) continue;
    const now = Date.now();
    let speed = PLAYER_SPEED;
    if (p.speedUntil > now) speed *= SPEED_BOOST_MULT;
    const dx = p.vx * speed * dt;
    const dy = p.vy * speed * dt;
    const moved = moveCircle(p.x, p.y, dx, dy, PLAYER_RADIUS);
    p.x = moved.x;
    p.y = moved.y;
  }
}

let last = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  for (const room of rooms.values()) {
    if (room.status !== "playing") continue;
    const now = Date.now();
    for (const [id, p] of room.players) {
      if (p.online === false && p.removeAt && now >= p.removeAt) {
        removePlayerFromRoom(room, id);
      }
    }
    updatePlayers(room, dt);
    checkGameEnd(room);
    broadcastState(room);
  }
}, TICK_MS);

server.listen(PORT, () => {
  console.log(`Labyrinthe multijoueur → http://localhost:${PORT}`);
});
