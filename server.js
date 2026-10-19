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

function lobbyPlayer(id, name) {
  return {
    id,
    name: (name || "Joueur").slice(0, 16),
    color: COLOR_OPTIONS[0],
  };
}

function initGameFields(p) {
  const spawn = getSpawn();
  p.x = spawn.x;
  p.y = spawn.y;
  p.angle = 0;
  p.vx = 0;
  p.vy = 0;
  p.alive = true;
  p.role = "innocent";
  p.lastKill = 0;
  const fixed = pushCircleOutOfWalls(p.x, p.y, PLAYER_RADIUS);
  p.x = fixed.x;
  p.y = fixed.y;
}

function countAliveByRole(room, role) {
  let n = 0;
  for (const p of room.players.values()) {
    if (p.alive && p.role === role) n++;
  }
  return n;
}

function assignRoles(room) {
  const ids = [...room.players.keys()];
  const maxImpostors = Math.min(room.settings.impostors, Math.max(0, ids.length - 1));
  const shuffled = ids.sort(() => Math.random() - 0.5);
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

function publicPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    x: p.x,
    y: p.y,
    angle: p.angle,
    alive: p.alive,
    color: p.color,
  };
}

function broadcastLobby(room) {
  io.to(room.code).emit("lobby", {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    settings: room.settings,
    players: [...room.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
    })),
  });
}

function broadcastState(room) {
  const players = {};
  for (const [id, p] of room.players) {
    if (room.status === "playing") players[id] = publicPlayer(p);
  }
  const now = Date.now();
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

function leaveRoom(socket) {
  const code = socketRoom.get(socket.id);
  if (!code) return;
  const room = rooms.get(code);
  socket.leave(code);
  socketRoom.delete(socket.id);
  if (!room) return;

  room.players.delete(socket.id);
  if (room.players.size === 0) {
    rooms.delete(code);
    return;
  }

  if (room.hostId === socket.id) {
    room.hostId = room.players.keys().next().value;
  }
  broadcastLobby(room);
  if (room.status === "playing") {
    checkGameEnd(room);
    broadcastState(room);
  }
}

function startRoomGame(room) {
  room.status = "playing";
  room.gameOver = false;
  room.winner = null;
  room.endReason = null;
  room.timerEndsAt = Date.now() + room.settings.timerSec * 1000;

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
    if (!p.alive || p.role !== "innocent" || p.id === killer.id) continue;
    const d = dist(killer.x, killer.y, p.x, p.y);
    if (d > KILL_RANGE) continue;
    if (!hasLineOfSight(killer.x, killer.y, p.x, p.y)) continue;
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
  socket.on("createRoom", (name) => {
    if (socketRoom.has(socket.id)) return;
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
    room.players.set(socket.id, lobbyPlayer(socket.id, name));
    rooms.set(code, room);
    socketRoom.set(socket.id, code);
    socket.join(code);
    socket.emit("joinedRoom", { id: socket.id, code, isHost: true });
    broadcastLobby(room);
  });

  socket.on("joinRoom", ({ code, name }) => {
    if (socketRoom.has(socket.id)) return;
    const normalized = String(code || "").replace(/\D/g, "").slice(0, 3);
    const room = rooms.get(normalized);
    if (!room) {
      socket.emit("errorMsg", { message: "Code invalide. Vérifie les 3 chiffres." });
      return;
    }
    if (room.status !== "lobby") {
      socket.emit("errorMsg", { message: "La partie a déjà commencé." });
      return;
    }
    room.players.set(socket.id, lobbyPlayer(socket.id, name));
    socketRoom.set(socket.id, normalized);
    socket.join(normalized);
    socket.emit("joinedRoom", {
      id: socket.id,
      code: normalized,
      isHost: room.hostId === socket.id,
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
    if (room.players.size < 2) {
      socket.emit("errorMsg", { message: "Il faut au moins 2 joueurs pour commencer." });
      return;
    }
    if (room.settings.impostors >= room.players.size) {
      socket.emit("errorMsg", { message: "Trop d’imposteurs pour ce nombre de joueurs." });
      return;
    }
    startRoomGame(room);
  });

  socket.on("input", (data) => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.status !== "playing" || room.gameOver) return;
    const p = room.players.get(socket.id);
    if (!p || !p.alive) return;
    p.vx = data.vx ?? 0;
    p.vy = data.vy ?? 0;
    if (typeof data.angle === "number") p.angle = data.angle;
    if (data.kill) tryKill(room, p);
  });

  socket.on("disconnect", () => {
    leaveRoom(socket);
  });
});

function updatePlayers(room, dt) {
  for (const p of room.players.values()) {
    if (!p.alive) continue;
    const dx = p.vx * PLAYER_SPEED * dt;
    const dy = p.vy * PLAYER_SPEED * dt;
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
    updatePlayers(room, dt);
    checkGameEnd(room);
    broadcastState(room);
  }
}, TICK_MS);

server.listen(PORT, () => {
  console.log(`Labyrinthe multijoueur → http://localhost:${PORT}`);
});
