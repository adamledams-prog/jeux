const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { MAP_W, MAP_H, MAP_IDS, MAP_CATALOG, MAP_SPAWNS, TILE, MAP_SCALE } = require("./maps");

const PORT = process.env.PORT || 3000;
const TICK_MS = 50;
const PLAYER_RADIUS = Math.round(14 * MAP_SCALE);
const PLAYER_SPEED = 180;
const GHOST_SPEED_MULT = 3;
const KILL_RANGE = Math.round(70 * MAP_SCALE);
const MIN_SPAWN_DIST = TILE * 3.2;
const KILL_COOLDOWN_MS = 25000;
const POWER_DURATION_MS = 4000;
const POWER_COOLDOWN_MIN_SEC = 12;
const POWER_COOLDOWN_MAX_SEC = 100;
const SPEED_BOOST_MULT = 1.4;
const DASH_DISTANCE = Math.round(78 * MAP_SCALE);
const FREEZE_RADIUS = Math.round(112 * MAP_SCALE);
const FREEZE_DURATION_MS = 2000;
const POWER_USE_MIN_INTERVAL_MS = 150;
const DASH_MIN_MOVE_PX = 6;
const LOBBY_ROOM_MAX_AGE_MS = 45 * 60 * 1000;
const RESURRECT_OFFER_MS = 14000;
const DOCTOR_WHEEL_ODDS = 1 / 3;
const DOCTOR_WHEEL_SEGMENTS = 3;
const SABOTAGE_DURATION_MS = 8000;
const SABOTAGE_COOLDOWN_MS = 40000;
const VISIONNEUR_DURATION_MS = 8000;
const VISIONNEUR_ABILITY_COOLDOWN_MS = 5000;
const VISIONNEUR_TILE_RADIUS = 3;
const POWER_IDS = [
  "portal",
  "invisible",
  "speed",
  "vision",
  "dash",
  "disguise",
  "freeze",
];

function defaultPowerCooldownSec() {
  return {
    portal: 20,
    invisible: 20,
    speed: 20,
    vision: 20,
    dash: 20,
    disguise: 20,
    freeze: 20,
  };
}

function emptyPowerCooldowns() {
  const o = {};
  for (const id of POWER_IDS) o[id] = 0;
  return o;
}

function clampPowerCooldownSec(sec) {
  const n = Math.round(Number(sec));
  if (!Number.isFinite(n)) return 20;
  return Math.min(POWER_COOLDOWN_MAX_SEC, Math.max(POWER_COOLDOWN_MIN_SEC, n));
}

function defaultPowers() {
  const o = {};
  for (const id of POWER_IDS) o[id] = id === "portal" || id === "invisible" || id === "speed";
  return o;
}

function mergePowers(powers) {
  const base = defaultPowers();
  if (!powers || typeof powers !== "object") return base;
  for (const id of POWER_IDS) {
    if (powers[id] !== undefined) base[id] = Boolean(powers[id]);
  }
  return base;
}

function emptyPlayerPowers() {
  const o = {};
  for (const id of POWER_IDS) o[id] = false;
  return o;
}

function normalizePlayerPowers(powers) {
  const o = emptyPlayerPowers();
  if (!powers || typeof powers !== "object") return o;
  for (const id of POWER_IDS) {
    if (powers[id] !== undefined) o[id] = Boolean(powers[id]);
  }
  return o;
}

/** Chaque pouvoir actif du pool est attribué à un joueur aléatoire (l’hôte ne voit pas qui). */
function assignPowersFromPool(room) {
  ensureRoomSettings(room);
  const active = [...room.players.values()].filter((p) => p.online !== false);
  for (const p of room.players.values()) {
    p.powers = emptyPlayerPowers();
  }
  if (!room.settings.powersEnabled) return;
  const pool = POWER_IDS.filter((id) => room.settings.roomPowers[id]);
  if (pool.length === 0 || active.length === 0) return;
  for (const powerId of pool) {
    const target = active[Math.floor(Math.random() * active.length)];
    target.powers[powerId] = true;
  }
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

function tileAt(maze, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 1;
  return maze[ty][tx];
}

function getLobbyPreviewMapId(room) {
  const leading = getLeadingMapVote(room);
  if (leading) return leading;
  return MAP_IDS[0];
}

function getRoomMaze(room) {
  if (room.maze) return room.maze;
  return MAP_CATALOG[getLobbyPreviewMapId(room)].maze;
}

function tallyMapVotes(room) {
  const counts = {};
  for (const id of MAP_IDS) counts[id] = 0;
  const votes = room.mapVotes || {};
  for (const mapId of Object.values(votes)) {
    if (counts[mapId] !== undefined) counts[mapId]++;
  }
  return counts;
}

function getLeadingMapVote(room) {
  const counts = tallyMapVotes(room);
  let bestId = null;
  let bestCount = 0;
  const tied = [];
  for (const id of MAP_IDS) {
    const n = counts[id] || 0;
    if (n > bestCount) {
      bestCount = n;
      bestId = id;
      tied.length = 0;
      tied.push(id);
    } else if (n === bestCount && n > 0) {
      tied.push(id);
    }
  }
  if (bestCount === 0) return null;
  if (tied.length > 1) {
    return tied[Math.floor(Math.random() * tied.length)];
  }
  return bestId;
}

function resolveMapVote(room) {
  const leading = getLeadingMapVote(room);
  if (leading) return leading;
  return MAP_IDS[Math.floor(Math.random() * MAP_IDS.length)];
}

function circleOverlapsWall(maze, cx, cy, r) {
  const minTx = Math.floor((cx - r) / TILE);
  const maxTx = Math.floor((cx + r) / TILE);
  const minTy = Math.floor((cy - r) / TILE);
  const maxTy = Math.floor((cy + r) / TILE);

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (tileAt(maze, tx, ty) !== 1) continue;
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

function pushCircleOutOfWalls(maze, cx, cy, r) {
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
        if (tileAt(maze, tx, ty) !== 1) continue;
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

function moveGhost(x, y, dx, dy) {
  const margin = PLAYER_RADIUS;
  const maxX = MAP_W * TILE - margin;
  const maxY = MAP_H * TILE - margin;
  return {
    x: Math.min(maxX, Math.max(margin, x + dx)),
    y: Math.min(maxY, Math.max(margin, y + dy)),
  };
}

function moveCircle(maze, x, y, dx, dy, r) {
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  const stepX = dx / steps;
  const stepY = dy / steps;

  for (let i = 0; i < steps; i++) {
    let nx = x + stepX;
    if (!circleOverlapsWall(maze, nx, y, r)) x = nx;
    let ny = y + stepY;
    if (!circleOverlapsWall(maze, x, ny, r)) y = ny;
    const fixed = pushCircleOutOfWalls(maze, x, y, r);
    x = fixed.x;
    y = fixed.y;
  }
  return { x, y };
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function hasLineOfSight(maze, x0, y0, x1, y1) {
  return wallSegmentsOnLine(maze, x0, y0, x1, y1) === 0;
}

function hasKillLineOfSight(maze, x0, y0, x1, y1) {
  if (hasLineOfSight(maze, x0, y0, x1, y1)) return true;
  const r = PLAYER_RADIUS * 0.85;
  const offsets = [
    [r, 0],
    [-r, 0],
    [0, r],
    [0, -r],
  ];
  for (const [ox, oy] of offsets) {
    if (hasLineOfSight(maze, x0, y0, x1 + ox, y1 + oy)) return true;
  }
  return false;
}

function wallSegmentsOnLine(maze, x0, y0, x1, y1) {
  const steps = Math.max(2, Math.ceil(dist(x0, y0, x1, y1) / (TILE / 4)));
  let segments = 0;
  let insideWall = false;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    const wall = tileAt(maze, tx, ty) === 1;
    if (wall && !insideWall) {
      segments++;
      insideWall = true;
    } else if (!wall) {
      insideWall = false;
    }
  }
  return segments;
}

function tryDashFrom(room, p) {
  const maze = getRoomMaze(room);
  let dx = p.vx;
  let dy = p.vy;
  const vlen = Math.hypot(dx, dy);
  if (vlen < 0.12) {
    dx = Math.cos(p.angle || 0);
    dy = Math.sin(p.angle || 0);
  } else {
    dx /= vlen;
    dy /= vlen;
  }
  const moved = moveCircle(maze, p.x, p.y, dx * DASH_DISTANCE, dy * DASH_DISTANCE, PLAYER_RADIUS);
  p.x = moved.x;
  p.y = moved.y;
  p.vx = 0;
  p.vy = 0;
}

function spawnPointsForMap(mapId) {
  return MAP_SPAWNS[mapId] || MAP_SPAWNS[MAP_IDS[0]];
}

function getSpawn(mapId) {
  const pts = spawnPointsForMap(mapId);
  return pts[Math.floor(Math.random() * pts.length)];
}

function pickSpreadSpawns(mapId, playerCount) {
  const shuffled = [...spawnPointsForMap(mapId)].sort(() => Math.random() - 0.5);
  const picked = [];

  for (const pt of shuffled) {
    const farEnough = picked.every(
      (q) => dist(pt.x, pt.y, q.x, q.y) >= MIN_SPAWN_DIST
    );
    if (farEnough) picked.push(pt);
    if (picked.length >= playerCount) return picked;
  }

  for (const pt of shuffled) {
    if (picked.includes(pt)) continue;
    picked.push(pt);
    if (picked.length >= playerCount) break;
  }
  return picked;
}

function defaultRoleConfig() {
  return {
    useManualRoles: false,
    enabledSpecials: {
      inspecteur: true,
      medecin: true,
      visionneur: true,
      saboteur: true,
    },
    assignments: {},
  };
}

function defaultSettings() {
  return {
    impostors: 1,
    timerSec: 120,
    powersEnabled: true,
    powerCooldownSec: defaultPowerCooldownSec(),
    roomPowers: defaultPowers(),
    roleConfig: defaultRoleConfig(),
  };
}

const INNOCENT_SPECIAL_ROLE_IDS = ["inspecteur", "medecin", "visionneur"];
const IMPOSTOR_SPECIAL_ROLE_IDS = ["saboteur"];
const SPECIAL_ROLE_IDS = [...INNOCENT_SPECIAL_ROLE_IDS, ...IMPOSTOR_SPECIAL_ROLE_IDS];

function ensureRoleConfig(room) {
  ensureRoomSettings(room);
  const rc = room.settings.roleConfig;
  if (!rc || typeof rc !== "object") {
    room.settings.roleConfig = defaultRoleConfig();
    return;
  }
  if (typeof rc.useManualRoles !== "boolean") rc.useManualRoles = false;
  if (!rc.enabledSpecials || typeof rc.enabledSpecials !== "object") {
    rc.enabledSpecials = {
      inspecteur: true,
      medecin: true,
      visionneur: true,
      saboteur: true,
    };
  }
  for (const id of SPECIAL_ROLE_IDS) {
    if (rc.enabledSpecials[id] === undefined) rc.enabledSpecials[id] = true;
    else rc.enabledSpecials[id] = Boolean(rc.enabledSpecials[id]);
  }
  if (!rc.assignments || typeof rc.assignments !== "object") rc.assignments = {};
}

function defaultPlayerAssignment() {
  return { camp: "innocent", specialRole: "nul" };
}

function ensurePlayerRoleAssignment(room, playerId) {
  ensureRoleConfig(room);
  if (!room.settings.roleConfig.assignments[playerId]) {
    room.settings.roleConfig.assignments[playerId] = defaultPlayerAssignment();
  }
}

function pruneRoleAssignments(room) {
  ensureRoleConfig(room);
  const ids = new Set(room.players.keys());
  for (const id of Object.keys(room.settings.roleConfig.assignments)) {
    if (!ids.has(id)) delete room.settings.roleConfig.assignments[id];
  }
  for (const id of ids) ensurePlayerRoleAssignment(room, id);
}

function syncImpostorCountFromAssignments(room) {
  ensureRoleConfig(room);
  if (!room.settings.roleConfig.useManualRoles) return;
  let n = 0;
  for (const [id, p] of room.players) {
    if (p.online === false) continue;
    const a = room.settings.roleConfig.assignments[id];
    if (a?.camp === "impostor") n++;
  }
  if (n >= 1 && n <= 3) room.settings.impostors = n;
}

function lobbySettingsForViewer(room, viewerId) {
  ensureRoomSettings(room);
  ensureRoleConfig(room);
  const s = room.settings;
  const rc = s.roleConfig;
  const roleConfig = {
    useManualRoles: rc.useManualRoles,
    enabledSpecials: { ...rc.enabledSpecials },
  };
  if (viewerId === room.hostId) {
    roleConfig.assignments = { ...rc.assignments };
  }
  return {
    impostors: s.impostors,
    timerSec: s.timerSec,
    powersEnabled: s.powersEnabled,
    powerCooldownSec: { ...s.powerCooldownSec },
    roomPowers: mergePowers(s.roomPowers),
    roleConfig,
  };
}

function validateManualRoles(room) {
  ensureRoleConfig(room);
  pruneRoleAssignments(room);
  const onlineIds = [...room.players.keys()].filter(
    (id) => room.players.get(id)?.online !== false
  );
  let impostors = 0;
  let innocents = 0;
  let inspecteurs = 0;
  let medecins = 0;
  let visionneurs = 0;
  let saboteurs = 0;
  const en = room.settings.roleConfig.enabledSpecials;

  for (const id of onlineIds) {
    const a = room.settings.roleConfig.assignments[id] || defaultPlayerAssignment();
    if (a.camp === "impostor") {
      impostors++;
      if (a.specialRole === "saboteur") saboteurs++;
      else if (a.specialRole && a.specialRole !== "nul") {
        return { ok: false, message: "Rôle spécial imposteur invalide (Saboteur uniquement)." };
      }
    } else {
      innocents++;
      if (a.specialRole === "inspecteur") inspecteurs++;
      if (a.specialRole === "medecin") medecins++;
      if (a.specialRole === "visionneur") visionneurs++;
      if (
        a.specialRole &&
        a.specialRole !== "nul" &&
        !INNOCENT_SPECIAL_ROLE_IDS.includes(a.specialRole)
      ) {
        return { ok: false, message: "Rôle spécial innocent invalide." };
      }
    }
  }

  if (innocents < 1) {
    return { ok: false, message: "Il faut au moins un innocent." };
  }
  if (impostors < 1) {
    return { ok: false, message: "Il faut au moins un imposteur." };
  }
  if (impostors >= onlineIds.length) {
    return { ok: false, message: "Trop d’imposteurs pour ce nombre de joueurs." };
  }
  if (inspecteurs > 1) {
    return { ok: false, message: "Un seul inspecteur par partie." };
  }
  if (medecins > 1) {
    return { ok: false, message: "Un seul médecin par partie." };
  }
  if (inspecteurs > 0 && !en.inspecteur) {
    return { ok: false, message: "L’inspecteur n’est pas activé dans les rôles de la partie." };
  }
  if (medecins > 0 && !en.medecin) {
    return { ok: false, message: "Le médecin n’est pas activé dans les rôles de la partie." };
  }
  if (medecins > 0 && innocents < 3) {
    return {
      ok: false,
      message: "Le médecin nécessite au moins 3 innocents (4 joueurs avec 1 imposteur).",
    };
  }
  if (saboteurs > 1) {
    return { ok: false, message: "Un seul saboteur par partie." };
  }
  if (visionneurs > 1) {
    return { ok: false, message: "Un seul visionneur par partie." };
  }
  if (saboteurs > 0 && !en.saboteur) {
    return { ok: false, message: "Le saboteur n’est pas activé dans les rôles de la partie." };
  }
  if (visionneurs > 0 && !en.visionneur) {
    return { ok: false, message: "Le visionneur n’est pas activé dans les rôles de la partie." };
  }
  return { ok: true };
}

function pickFreeColor(room) {
  const used = new Set([...room.players.values()].map((p) => p.color));
  for (const color of COLOR_OPTIONS) {
    if (!used.has(color)) return color;
  }
  return COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)];
}

function uniqueNameInRoom(room, requested) {
  const base = (requested || "Joueur").slice(0, 16).trim() || "Joueur";
  const taken = new Set(
    [...room.players.values()]
      .filter((p) => p.online !== false)
      .map((p) => p.name)
  );
  if (!taken.has(base)) return base;
  for (let n = 2; n <= 99; n++) {
    const suffix = String(n);
    const candidate = `${base.slice(0, Math.max(1, 16 - suffix.length))}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `J${Math.floor(Math.random() * 8999) + 1000}`;
}

function lobbyPlayer(id, name, room) {
  ensureRoomSettings(room);
  ensurePlayerRoleAssignment(room, id);
  return {
    id,
    name: uniqueNameInRoom(room, name),
    color: pickFreeColor(room),
    powers: emptyPlayerPowers(),
  };
}

function lobbyPayload(room, viewerId) {
  ensureRoomSettings(room);
  pruneRoleAssignments(room);
  const previewId = getLobbyPreviewMapId(room);
  const previewMaze = MAP_CATALOG[previewId].maze;
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    settings: lobbySettingsForViewer(room, viewerId),
    mapOptions: MAP_IDS.map((id) => ({ id, name: MAP_CATALOG[id].name })),
    mapVoteCounts: tallyMapVotes(room),
    mapVotes: { ...(room.mapVotes || {}) },
    mapPreview: { w: MAP_W, h: MAP_H, maze: previewMaze, id: previewId },
    players: [...room.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
    })),
  };
}

function normalizeRoomCode(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 0) return "";
  return digits.padStart(3, "0").slice(-3);
}

function initGameFields(p, spawn, maze, mapId) {
  const point = spawn || getSpawn(mapId);
  p.x = point.x;
  p.y = point.y;
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
  p.visionUntil = 0;
  p.disguiseUntil = 0;
  p.disguiseName = null;
  p.disguiseColor = null;
  p.frozenUntil = 0;
  p.resurrectOfferUntil = 0;
  p.resurrectDeathX = 0;
  p.resurrectDeathY = 0;
  p.resurrectedThisRound = false;
  p.resurrectWheelUsed = false;
  p.resurrectWheelOdds = 0;
  p.specialRole = "nul";
  p.doctorTargetId = null;
  p.doctorProtected = false;
  p.doctorReviveUsed = false;
  p.corpseX = 0;
  p.corpseY = 0;
  p.powerCooldownUntil = emptyPowerCooldowns();
  p.sabotageCooldownUntil = 0;
  p.visionneurAbilityCooldownUntil = 0;
  p.powers = emptyPlayerPowers();
  const fixed = pushCircleOutOfWalls(maze, p.x, p.y, PLAYER_RADIUS);
  p.x = fixed.x;
  p.y = fixed.y;
}

function isPlayerActive(p) {
  return p && p.online !== false;
}

function countAliveByRole(room, role) {
  let n = 0;
  for (const p of room.players.values()) {
    if (!p.alive || p.role !== role) continue;
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
  delete player.removeAt;
  room.players.set(socket.id, player);
  socketRoom.set(socket.id, room.code);
  socket.join(room.code);
}

function clearCombatBuffs(p) {
  p.portal = null;
  p.invisibleUntil = 0;
  p.speedUntil = 0;
  p.visionUntil = 0;
  p.disguiseUntil = 0;
  p.disguiseName = null;
  p.disguiseColor = null;
  p.frozenUntil = 0;
  p.vx = 0;
  p.vy = 0;
}

function ensureRoomSettings(room) {
  const impostors = Number(room.settings?.impostors);
  const timerSec = Number(room.settings?.timerSec);
  const powersEnabled =
    room.settings?.powersEnabled === undefined ? true : Boolean(room.settings.powersEnabled);
  const cds = defaultPowerCooldownSec();
  const incoming = room.settings?.powerCooldownSec || {};
  for (const id of POWER_IDS) {
    cds[id] = clampPowerCooldownSec(incoming[id] ?? cds[id]);
  }
  const prevRoleConfig = room.settings?.roleConfig;
  room.settings = {
    impostors: [1, 2, 3].includes(impostors) ? impostors : 1,
    timerSec: TIMER_OPTIONS.includes(timerSec) ? timerSec : 120,
    powersEnabled,
    powerCooldownSec: cds,
    roomPowers: mergePowers(room.settings?.roomPowers),
    roleConfig: prevRoleConfig,
  };
  ensureRoleConfig(room);
}

function getPowerCooldownMs(room, powerId) {
  ensureRoomSettings(room);
  const sec = room.settings.powerCooldownSec[powerId];
  return clampPowerCooldownSec(sec) * 1000;
}

function applyManualRoles(room) {
  ensureRoleConfig(room);
  for (const p of room.players.values()) {
    if (p.online === false) continue;
    const a = room.settings.roleConfig.assignments[p.id] || defaultPlayerAssignment();
    p.role = a.camp === "impostor" ? "impostor" : "innocent";
    if (p.role === "impostor") {
      p.specialRole = a.specialRole === "saboteur" ? "saboteur" : "nul";
    } else {
      p.specialRole = INNOCENT_SPECIAL_ROLE_IDS.includes(a.specialRole) ? a.specialRole : "nul";
    }
    p.doctorTargetId = null;
    p.doctorProtected = false;
    p.doctorReviveUsed = false;
  }
}

function resetOfflinePlayerRoles(room) {
  for (const p of room.players.values()) {
    if (p.online === false) {
      p.role = "innocent";
      p.specialRole = "nul";
      p.doctorTargetId = null;
      p.doctorProtected = false;
    }
  }
}

function assignRoles(room) {
  ensureRoomSettings(room);
  ensureRoleConfig(room);
  resetOfflinePlayerRoles(room);
  if (room.settings.roleConfig.useManualRoles) {
    applyManualRoles(room);
    return;
  }
  const ids = [...room.players.keys()].filter(
    (id) => room.players.get(id)?.online !== false
  );
  const maxImpostors = Math.min(room.settings.impostors, Math.max(0, ids.length - 1));
  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  for (const p of room.players.values()) {
    p.role = "innocent";
    p.specialRole = "nul";
    p.doctorTargetId = null;
    p.doctorProtected = false;
    p.doctorReviveUsed = false;
  }
  for (let i = 0; i < maxImpostors; i++) {
    const player = room.players.get(shuffled[i]);
    if (player) player.role = "impostor";
  }
  assignSpecialRoles(room);
}

function assignSpecialRoles(room) {
  ensureRoleConfig(room);
  const en = room.settings.roleConfig.enabledSpecials;
  const innocents = [...room.players.values()]
    .filter((p) => p.role === "innocent" && p.online !== false)
    .sort(() => Math.random() - 0.5);
  const impostors = [...room.players.values()]
    .filter((p) => p.role === "impostor" && p.online !== false)
    .sort(() => Math.random() - 0.5);
  let idx = 0;
  if (en.inspecteur && innocents.length > idx) {
    innocents[idx].specialRole = "inspecteur";
    idx++;
  }
  if (en.medecin && innocents.length >= 3 && innocents.length > idx) {
    innocents[idx].specialRole = "medecin";
    idx++;
  }
  if (en.visionneur && innocents.length > idx) {
    innocents[idx].specialRole = "visionneur";
    idx++;
  }
  if (en.saboteur && impostors.length >= 1) {
    impostors[0].specialRole = "saboteur";
  }
}

function isSabotageActive(room, now = Date.now()) {
  return Boolean(room.sabotageUntil && room.sabotageUntil > now);
}

function clearGlobalEffects(room) {
  room.sabotageUntil = 0;
  room.visionneurBlurUntil = 0;
  room.visionneurExcludedId = null;
}

function trySabotage(room, p) {
  if (room.gameOver || p.role !== "impostor" || !p.alive || p.online === false) {
    return { ok: false, reason: "not_allowed" };
  }
  if (p.specialRole !== "saboteur") return { ok: false, reason: "not_saboteur" };
  const now = Date.now();
  if (p.frozenUntil > now) return { ok: false, reason: "frozen" };
  if (now < (p.sabotageCooldownUntil || 0)) return { ok: false, reason: "cooldown" };
  if (isSabotageActive(room, now)) return { ok: false, reason: "active" };
  room.sabotageUntil = now + SABOTAGE_DURATION_MS;
  p.sabotageCooldownUntil = now + SABOTAGE_COOLDOWN_MS;
  return { ok: true, until: room.sabotageUntil, cooldownMs: SABOTAGE_COOLDOWN_MS };
}

function tryVisionneurPulse(room, p) {
  if (room.gameOver || p.role !== "innocent" || !p.alive || p.online === false) {
    return { ok: false, reason: "not_allowed" };
  }
  if (p.specialRole !== "visionneur") return { ok: false, reason: "not_visionneur" };
  const now = Date.now();
  if (isSabotageActive(room, now)) return { ok: false, reason: "sabotage" };
  if (p.frozenUntil > now) return { ok: false, reason: "frozen" };
  if (now < (p.visionneurAbilityCooldownUntil || 0)) {
    return { ok: false, reason: "cooldown" };
  }
  if (room.visionneurBlurUntil && room.visionneurBlurUntil > now) {
    return { ok: false, reason: "active" };
  }
  room.visionneurBlurUntil = now + VISIONNEUR_DURATION_MS;
  room.visionneurExcludedId = p.id;
  p.visionneurAbilityCooldownUntil = now + VISIONNEUR_ABILITY_COOLDOWN_MS;
  return {
    ok: true,
    until: room.visionneurBlurUntil,
    cooldownMs: VISIONNEUR_ABILITY_COOLDOWN_MS,
    tileRadius: VISIONNEUR_TILE_RADIUS,
  };
}

function gameStartedPayload(room, p, rematch) {
  return {
    role: p.role,
    specialRole: p.specialRole || "nul",
    doctorPickDone: p.specialRole === "medecin" ? Boolean(p.doctorTargetId) : false,
    doctorProtected: p.role === "innocent" ? Boolean(p.doctorProtected) : false,
    timerSec: room.settings.timerSec,
    rematch: Boolean(rematch),
    mapId: room.playMapId,
    mapName: room.playMapId ? MAP_CATALOG[room.playMapId].name : undefined,
    powers: { ...p.powers },
    powersEnabled: room.settings.powersEnabled !== false,
  };
}

function hasActiveResurrectOffer(room) {
  const now = Date.now();
  for (const p of room.players.values()) {
    if (p.alive || p.role !== "innocent") continue;
    if (p.resurrectOfferUntil > now) return true;
  }
  return false;
}

function checkGameEnd(room) {
  if (room.gameOver) return;
  if (room.startedAt && Date.now() - room.startedAt < 3000) return;
  const innocents = countAliveByRole(room, "innocent");
  const impostors = countAliveByRole(room, "impostor");
  const now = Date.now();

  if (innocents === 0 && impostors > 0) {
    if (hasActiveResurrectOffer(room)) return;
    room.gameOver = true;
    room.winner = "impostors";
    room.endReason = "Tous les innocents ont été éliminés.";
    clearGlobalEffects(room);
    return;
  }

  if (impostors === 0 && innocents > 0) {
    room.gameOver = true;
    room.winner = "innocents";
    room.endReason = "Tous les imposteurs ont été éliminés.";
    clearGlobalEffects(room);
    return;
  }

  if (room.timerEndsAt && now >= room.timerEndsAt && innocents > 0) {
    room.gameOver = true;
    room.winner = "innocents";
    room.endReason = "Le temps est écoulé — des innocents sont encore en vie.";
    clearGlobalEffects(room);
  }
}

const ALLOWED_ORIGINS = [
  "https://jeux-tawny.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    if (hostname.endsWith(".vercel.app")) return true;
  } catch {
    return false;
  }
  return false;
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      cb(null, isAllowedOrigin(origin));
    },
    credentials: true,
  },
  pingInterval: 20000,
  pingTimeout: 25000,
});

app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();

app.get("/health", (_req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});
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

function expireTimedBuffs(p, now) {
  if (p.disguiseUntil > 0 && p.disguiseUntil <= now) {
    p.disguiseUntil = 0;
    p.disguiseName = null;
    p.disguiseColor = null;
  }
}

function powerCooldownLeftMs(p, powerId, now) {
  return Math.max(0, (p.powerCooldownUntil?.[powerId] || 0) - now);
}

function buildPowerCooldownMap(p, now) {
  const map = {};
  for (const id of POWER_IDS) {
    map[id] = powerCooldownLeftMs(p, id, now);
  }
  return map;
}

function publicPlayer(p, now = Date.now()) {
  expireTimedBuffs(p, now);
  const disguised = p.disguiseUntil > now && p.disguiseName && p.disguiseColor;
  return {
    id: p.id,
    name: p.name,
    x: p.x,
    y: p.y,
    angle: p.angle,
    alive: p.alive,
    color: p.color,
    appearanceName: disguised ? p.disguiseName : p.name,
    appearanceColor: disguised ? p.disguiseColor : p.color,
    disguised: Boolean(disguised),
    hidden: p.invisibleUntil > now,
    speedActive: p.speedUntil > now,
    visionActive: p.visionUntil > now,
    frozen: p.frozenUntil > now,
    portal: p.portal ? { x: p.portal.x, y: p.portal.y } : null,
    powerCooldownMs: buildPowerCooldownMap(p, now),
    corpseX: p.alive ? null : p.corpseX ?? p.x,
    corpseY: p.alive ? null : p.corpseY ?? p.y,
  };
}

function applyPowerCooldown(p, powerId, now, room) {
  const cooldownMs = getPowerCooldownMs(room, powerId);
  p.powerCooldownUntil[powerId] = now + cooldownMs;
  p.lastPowerAt = now;
}

function usePlayerPower(room, p, powerId) {
  if (typeof powerId !== "string" || !POWER_IDS.includes(powerId)) {
    return { ok: false, reason: "invalid" };
  }
  ensureRoomSettings(room);
  if (!room.settings.powersEnabled) return { ok: false, reason: "disabled" };
  if (!p.alive || p.online === false) return { ok: false, reason: "dead" };
  const now = Date.now();
  if (isSabotageActive(room, now)) return { ok: false, reason: "sabotage" };
  p.powers = normalizePlayerPowers(p.powers);
  if (!p.powers[powerId]) return { ok: false, reason: "not_equipped" };
  expireTimedBuffs(p, now);
  if (p.frozenUntil > now) return { ok: false, reason: "frozen" };
  if (!p.powerCooldownUntil) p.powerCooldownUntil = emptyPowerCooldowns();
  if (now < (p.powerCooldownUntil[powerId] || 0)) return { ok: false, reason: "cooldown" };
  if (now - (p.lastPowerAt || 0) < POWER_USE_MIN_INTERVAL_MS) {
    return { ok: false, reason: "spam" };
  }

  const maze = getRoomMaze(room);

  if (powerId === "portal") {
    if (!p.portal) {
      if (circleOverlapsWall(maze, p.x, p.y, PLAYER_RADIUS)) {
        return { ok: false, reason: "bad_place" };
      }
      p.portal = { x: p.x, y: p.y };
      applyPowerCooldown(p, powerId, now, room);
      return { ok: true, powerId, action: "place" };
    }
    const dest = pushCircleOutOfWalls(maze, p.portal.x, p.portal.y, PLAYER_RADIUS);
    p.x = dest.x;
    p.y = dest.y;
    p.vx = 0;
    p.vy = 0;
    p.portal = null;
    applyPowerCooldown(p, powerId, now, room);
    return { ok: true, powerId, action: "teleport" };
  }

  if (powerId === "invisible") {
    p.invisibleUntil = now + POWER_DURATION_MS;
    applyPowerCooldown(p, powerId, now, room);
    return { ok: true, powerId };
  }

  if (powerId === "speed") {
    p.speedUntil = now + POWER_DURATION_MS;
    applyPowerCooldown(p, powerId, now, room);
    return { ok: true, powerId };
  }

  if (powerId === "vision") {
    p.visionUntil = now + POWER_DURATION_MS;
    applyPowerCooldown(p, powerId, now, room);
    return { ok: true, powerId };
  }

  if (powerId === "dash") {
    const ox = p.x;
    const oy = p.y;
    tryDashFrom(room, p);
    const moved = dist(ox, oy, p.x, p.y);
    if (moved < DASH_MIN_MOVE_PX) {
      p.vx = 0;
      p.vy = 0;
      return { ok: false, reason: "no_move" };
    }
    applyPowerCooldown(p, powerId, now, room);
    return { ok: true, powerId };
  }

  if (powerId === "disguise") {
    const candidates = [...room.players.values()].filter(
      (o) => o.id !== p.id && o.alive
    );
    if (candidates.length === 0) return { ok: false, reason: "no_target" };
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    p.disguiseUntil = now + POWER_DURATION_MS;
    p.disguiseName = target.name;
    p.disguiseColor = target.color;
    applyPowerCooldown(p, powerId, now, room);
    return { ok: true, powerId };
  }

  if (powerId === "freeze") {
    let hit = 0;
    for (const other of room.players.values()) {
      if (other.id === p.id || !other.alive) continue;
      if (dist(p.x, p.y, other.x, other.y) > FREEZE_RADIUS) continue;
      other.frozenUntil = now + FREEZE_DURATION_MS;
      other.vx = 0;
      other.vy = 0;
      hit++;
    }
    applyPowerCooldown(p, powerId, now, room);
    return { ok: true, powerId, frozenCount: hit };
  }

  return { ok: false, reason: "invalid" };
}

function purgeStaleLobbyRooms() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (room.status !== "lobby") continue;
    const created = room.createdAt || 0;
    if (created && now - created > LOBBY_ROOM_MAX_AGE_MS) {
      rooms.delete(code);
      continue;
    }
    if (room.players.size === 0) rooms.delete(code);
  }
}

function broadcastLobby(room) {
  for (const [id] of room.players) {
    const sock = io.sockets.sockets.get(id);
    if (sock) sock.emit("lobby", lobbyPayload(room, id));
  }
}

function broadcastState(room) {
  ensureRoomSettings(room);
  const now = Date.now();
  const players = {};
  for (const [id, p] of room.players) {
    if (room.status === "playing") players[id] = publicPlayer(p, now);
  }
  const timeLeftMs = room.timerEndsAt ? Math.max(0, room.timerEndsAt - now) : 0;

  io.to(room.code).emit("state", {
    status: room.status,
    players,
    map: { w: MAP_W, h: MAP_H, tile: TILE, maze: getRoomMaze(room), mapId: room.playMapId || null },
    timeLeftMs,
    gameOver: room.gameOver,
    winner: room.winner,
    endReason: room.endReason,
    innocentsAlive: countAliveByRole(room, "innocent"),
    powerSettings: {
      enabled: room.settings.powersEnabled !== false,
      cooldownSec: room.settings.powerCooldownSec,
    },
    t: now,
    effects: {
      powersBlockedUntil: room.sabotageUntil || 0,
      visionBlurUntil: room.visionneurBlurUntil || 0,
      visionBlurExcludeId: room.visionneurExcludedId || null,
      visionBlurTileRadius: VISIONNEUR_TILE_RADIUS,
    },
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
    checkGameEnd(room);
    broadcastState(room);
    return;
  }

  removePlayerFromRoom(room, socket.id);
}

function removePlayerFromRoom(room, playerId) {
  room.players.delete(playerId);
  if (room.mapVotes) delete room.mapVotes[playerId];
  if (room.settings?.roleConfig?.assignments) {
    delete room.settings.roleConfig.assignments[playerId];
  }
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
  const offlineMatches = [...room.players.entries()].filter(
    ([, pl]) => pl.name === trimmed && pl.online === false
  );
  if (offlineMatches.length !== 1) return false;
  const [playerId, p] = offlineMatches[0];
  const wasHost = room.hostId === playerId;
  room.players.delete(playerId);
  attachSocketToRoom(socket, room, p);
  if (wasHost) room.hostId = socket.id;
  socket.emit("joinedRoom", {
    id: socket.id,
    code: room.code,
    isHost: room.hostId === socket.id,
    lobby: lobbyPayload(room, socket.id),
  });
  socket.emit("gameStarted", gameStartedPayload(room, p, false));
  broadcastState(room);
  return true;
}

function beginPlayingRound(room, rematch) {
  purgeOfflinePlayers(room);
  ensureRoomSettings(room);
  room.playMapId = resolveMapVote(room);
  room.maze = MAP_CATALOG[room.playMapId].maze;
  room.status = "playing";
  room.gameOver = false;
  room.winner = null;
  room.endReason = null;
  room.startedAt = Date.now();
  room.timerEndsAt = room.startedAt + room.settings.timerSec * 1000;
  clearGlobalEffects(room);

  const active = [...room.players.values()].filter((p) => p.online !== false);
  const spawns = pickSpreadSpawns(room.playMapId, active.length);
  let spawnIdx = 0;
  for (const p of room.players.values()) {
    if (p.online === false) continue;
    initGameFields(
      p,
      spawns[spawnIdx] || getSpawn(room.playMapId),
      room.maze,
      room.playMapId
    );
    spawnIdx++;
  }
  assignRoles(room);
  assignPowersFromPool(room);

  for (const [id, p] of room.players) {
    if (p.online === false) continue;
    const sock = io.sockets.sockets.get(id);
    if (sock) {
      sock.emit("gameStarted", gameStartedPayload(room, p, rematch));
    }
  }

  broadcastLobby(room);
  broadcastState(room);
}

function startRoomGame(room) {
  beginPlayingRound(room, false);
}

function clearResurrectOffer(p) {
  if (!p) return;
  p.resurrectOfferUntil = 0;
  p.resurrectWheelUsed = false;
}

function scheduleResurrectOfferExpiry(room, playerId) {
  setTimeout(() => {
    const r = rooms.get(room.code);
    if (!r || r.status !== "playing") return;
    const p = r.players.get(playerId);
    if (!p || p.alive) return;
    const now = Date.now();
    if (!p.resurrectOfferUntil || p.resurrectOfferUntil > now) return;
    clearResurrectOffer(p);
    const sock = io.sockets.sockets.get(playerId);
    if (sock) sock.emit("resurrectOfferClosed", { reason: "expired" });
    checkGameEnd(r);
    broadcastState(r);
  }, RESURRECT_OFFER_MS + 80);
}

function maybeOfferResurrect(room, victim) {
  if (!victim || victim.role !== "innocent" || victim.resurrectedThisRound) return;
  if (!victim.doctorProtected || victim.doctorReviveUsed) return;
  const now = Date.now();
  victim.resurrectWheelUsed = false;
  victim.resurrectWheelOdds = DOCTOR_WHEEL_ODDS;
  victim.resurrectDeathX = victim.corpseX ?? victim.x;
  victim.resurrectDeathY = victim.corpseY ?? victim.y;
  victim.resurrectOfferUntil = now + RESURRECT_OFFER_MS;
  const sock = io.sockets.sockets.get(victim.id);
  if (sock) {
    sock.emit("resurrectOffer", {
      timeoutMs: RESURRECT_OFFER_MS,
      mode: "doctor",
      segments: DOCTOR_WHEEL_SEGMENTS,
      oddsLabel: "1/3",
    });
  }
  scheduleResurrectOfferExpiry(room, victim.id);
}

function resurrectInnocent(room, p) {
  const deathX = p.resurrectDeathX || p.corpseX || p.x;
  const deathY = p.resurrectDeathY || p.corpseY || p.y;
  let x = deathX;
  let y = deathY;
  const maze = getRoomMaze(room);
  const mapId = room.playMapId || MAP_IDS[0];
  if (circleOverlapsWall(maze, x, y, PLAYER_RADIUS)) {
    const sp = getSpawn(mapId);
    x = sp.x;
    y = sp.y;
  }
  const fixed = pushCircleOutOfWalls(maze, x, y, PLAYER_RADIUS);
  p.x = fixed.x;
  p.y = fixed.y;
  p.alive = true;
  p.corpseX = 0;
  p.corpseY = 0;
  p.resurrectedThisRound = true;
  p.doctorReviveUsed = true;
  p.doctorProtected = false;
  clearResurrectOffer(p);
  clearCombatBuffs(p);
  if (room.gameOver) {
    room.gameOver = false;
    room.winner = null;
    room.endReason = null;
  }
  io.to(room.code).emit("playerResurrected", {
    playerId: p.id,
    name: p.name,
    x: p.x,
    y: p.y,
    color: p.color,
  });
  checkGameEnd(room);
  broadcastState(room);
}

function tryKill(room, killer, fromKillButton = false) {
  if (room.gameOver || killer.role !== "impostor" || !killer.alive) return false;
  const now = Date.now();
  if (killer.frozenUntil > now) return false;
  if (now - killer.lastKill < KILL_COOLDOWN_MS) return false;

  const maze = getRoomMaze(room);
  const range = fromKillButton ? KILL_RANGE + 10 : KILL_RANGE;
  let target = null;
  let best = range;
  for (const p of room.players.values()) {
    if (!p.alive || p.role !== "innocent" || p.id === killer.id) continue;
    const d = dist(killer.x, killer.y, p.x, p.y);
    if (d > range) continue;
    if (!hasKillLineOfSight(maze, killer.x, killer.y, p.x, p.y)) continue;
    if (p.invisibleUntil > now) continue;
    if (d < best) {
      best = d;
      target = p;
    }
  }

  if (!target) return false;
  target.corpseX = target.x;
  target.corpseY = target.y;
  target.alive = false;
  target.vx = 0;
  target.vy = 0;
  clearCombatBuffs(target);
  killer.lastKill = now;
  maybeOfferResurrect(room, target);
  checkGameEnd(room);
  return true;
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
      createdAt: Date.now(),
      mapVotes: {},
      playMapId: null,
      maze: null,
    };
    room.players.set(socket.id, lobbyPlayer(socket.id, name, room));
    rooms.set(code, room);
    socketRoom.set(socket.id, code);
    socket.join(code);
    socket.emit("joinedRoom", {
      id: socket.id,
      code,
      isHost: true,
      lobby: lobbyPayload(room, socket.id),
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
      socket.emit("errorMsg", {
        message:
          "Salle introuvable pour l’instant. Réessaie dans 2 secondes (même code).",
      });
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
        lobby: lobbyPayload(room, socket.id),
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
      lobby: lobbyPayload(room, socket.id),
    });
    broadcastLobby(room);
  });

  socket.on("updateSettings", (data) => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.hostId !== socket.id || room.status !== "lobby") return;
    ensureRoomSettings(room);
    const impostors = Number(data.impostors);
    const timerSec = Number(data.timerSec);
    if ([1, 2, 3].includes(impostors)) room.settings.impostors = impostors;
    if (TIMER_OPTIONS.includes(timerSec)) room.settings.timerSec = timerSec;
    if (typeof data.powersEnabled === "boolean") {
      room.settings.powersEnabled = data.powersEnabled;
    }
    if (data.powerCooldownSec && typeof data.powerCooldownSec === "object") {
      for (const id of POWER_IDS) {
        if (data.powerCooldownSec[id] != null) {
          room.settings.powerCooldownSec[id] = clampPowerCooldownSec(data.powerCooldownSec[id]);
        }
      }
    }
    broadcastLobby(room);
  });

  socket.on("setPowers", (powers) => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.status !== "lobby") return;
    if (room.hostId !== socket.id) {
      socket.emit("errorMsg", { message: "Seul l’hôte choisit les pouvoirs actifs pour la partie." });
      return;
    }
    ensureRoomSettings(room);
    if (!room.settings.powersEnabled) {
      socket.emit("errorMsg", { message: "Les pouvoirs sont désactivés pour cette partie." });
      return;
    }
    const next = mergePowers(powers);
    const anyOn = POWER_IDS.some((id) => next[id]);
    if (!anyOn) {
      socket.emit("errorMsg", { message: "Équipe au moins un pouvoir pour la partie." });
      return;
    }
    room.settings.roomPowers = next;
    broadcastLobby(room);
  });

  socket.on("setRoleConfig", (data) => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.hostId !== socket.id || room.status !== "lobby") return;
    ensureRoleConfig(room);
    if (typeof data?.useManualRoles === "boolean") {
      room.settings.roleConfig.useManualRoles = data.useManualRoles;
    }
    if (data?.enabledSpecials && typeof data.enabledSpecials === "object") {
      for (const id of SPECIAL_ROLE_IDS) {
        if (data.enabledSpecials[id] !== undefined) {
          room.settings.roleConfig.enabledSpecials[id] = Boolean(data.enabledSpecials[id]);
        }
      }
    }
    const en = room.settings.roleConfig.enabledSpecials;
    for (const a of Object.values(room.settings.roleConfig.assignments)) {
      if (!en.inspecteur && a.specialRole === "inspecteur") a.specialRole = "nul";
      if (!en.medecin && a.specialRole === "medecin") a.specialRole = "nul";
      if (!en.visionneur && a.specialRole === "visionneur") a.specialRole = "nul";
      if (!en.saboteur && a.specialRole === "saboteur") a.specialRole = "nul";
    }
    pruneRoleAssignments(room);
    syncImpostorCountFromAssignments(room);
    broadcastLobby(room);
  });

  socket.on("setPlayerRole", (data) => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.hostId !== socket.id || room.status !== "lobby") return;
    if (!room.settings.roleConfig.useManualRoles) {
      socket.emit("errorMsg", {
        message: "Active « Assigner les rôles manuellement » pour choisir chaque joueur.",
      });
      return;
    }
    const playerId = data?.playerId;
    if (!playerId || !room.players.has(playerId)) return;
    ensurePlayerRoleAssignment(room, playerId);
    const a = room.settings.roleConfig.assignments[playerId];
    if (data.camp === "impostor" || data.camp === "innocent") {
      a.camp = data.camp;
      if (a.camp === "impostor" && a.specialRole !== "saboteur") a.specialRole = "nul";
      if (a.camp === "innocent" && a.specialRole === "saboteur") a.specialRole = "nul";
    }
    if (data.specialRole === "nul") {
      a.specialRole = "nul";
    } else if (data.specialRole === "saboteur" && a.camp === "impostor") {
      a.specialRole = "saboteur";
    } else if (
      INNOCENT_SPECIAL_ROLE_IDS.includes(data.specialRole) &&
      a.camp !== "impostor"
    ) {
      a.specialRole = data.specialRole;
    }
    syncImpostorCountFromAssignments(room);
    broadcastLobby(room);
  });

  socket.on("voteMap", (mapId) => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.status !== "lobby") return;
    if (!MAP_IDS.includes(mapId)) {
      socket.emit("errorMsg", { message: "Carte invalide." });
      return;
    }
    if (!room.mapVotes) room.mapVotes = {};
    room.mapVotes[socket.id] = mapId;
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
    if (!room.settings.roleConfig.useManualRoles && room.settings.impostors >= online) {
      socket.emit("errorMsg", { message: "Trop d’imposteurs pour ce nombre de joueurs." });
      return;
    }
    if (room.settings.roleConfig.useManualRoles) {
      const check = validateManualRoles(room);
      if (!check.ok) {
        socket.emit("errorMsg", { message: check.message });
        return;
      }
    }
    startRoomGame(room);
  });

  socket.on("rematchGame", () => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.hostId !== socket.id) return;
    if (!room.gameOver) return;
    const online = countOnlinePlayers(room);
    if (online < 2) {
      socket.emit("errorMsg", { message: "Il faut au moins 2 joueurs pour relancer." });
      return;
    }
    if (!room.settings.roleConfig.useManualRoles && room.settings.impostors >= online) {
      socket.emit("errorMsg", { message: "Trop d’imposteurs pour ce nombre de joueurs." });
      return;
    }
    if (room.settings.roleConfig.useManualRoles) {
      const check = validateManualRoles(room);
      if (!check.ok) {
        socket.emit("errorMsg", { message: check.message });
        return;
      }
    }
    beginPlayingRound(room, true);
  });

  socket.on("syncGame", () => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.status !== "playing") return;
    const p = room.players.get(socket.id);
    if (!p) return;
    socket.emit("gameStarted", gameStartedPayload(room, p, false));
    broadcastState(room);
  });

  socket.on("doctorSelect", (targetId) => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.status !== "playing" || room.gameOver) return;
    if (isSabotageActive(room)) {
      socket.emit("doctorSelectResult", { ok: false, reason: "sabotage" });
      return;
    }
    const p = room.players.get(socket.id);
    if (!p || !p.alive || p.online === false || p.specialRole !== "medecin") {
      socket.emit("doctorSelectResult", { ok: false, reason: "not_medecin" });
      return;
    }
    if (p.doctorTargetId) {
      socket.emit("doctorSelectResult", { ok: false, reason: "already_picked" });
      return;
    }
    const target = room.players.get(targetId);
    if (
      !target ||
      !target.alive ||
      target.role !== "innocent" ||
      target.id === p.id ||
      target.online === false
    ) {
      socket.emit("doctorSelectResult", { ok: false, reason: "invalid_target" });
      return;
    }
    p.doctorTargetId = target.id;
    target.doctorProtected = true;
    socket.emit("doctorSelectResult", {
      ok: true,
      targetId: target.id,
      targetName: target.name,
    });
    const targetSock = io.sockets.sockets.get(target.id);
    if (targetSock) {
      targetSock.emit("doctorProtected", {
        message:
          "Le médecin t’a protégé — si tu meurs : 1 chance sur 3 de revivre (une fois).",
      });
    }
  });

  socket.on("input", (data) => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.status !== "playing" || room.gameOver) return;
    const p = room.players.get(socket.id);
    if (!p || p.online === false) return;
    let vx = Number(data.vx) || 0;
    let vy = Number(data.vy) || 0;
    const vlen = Math.hypot(vx, vy);
    if (vlen > 1) {
      vx /= vlen;
      vy /= vlen;
    }
    if (!p.alive) {
      p.vx = vx;
      p.vy = vy;
      if (typeof data.angle === "number" && Number.isFinite(data.angle)) {
        p.angle = data.angle;
      }
      return;
    }
    const now = Date.now();
    if (p.frozenUntil > now) {
      p.vx = 0;
      p.vy = 0;
      if (typeof data.angle === "number") p.angle = data.angle;
      return;
    }
    p.vx = vx;
    p.vy = vy;
    if (typeof data.angle === "number" && Number.isFinite(data.angle)) {
      p.angle = data.angle;
    }
    if (data.kill) tryKill(room, p, false);
  });

  socket.on("kill", () => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.status !== "playing" || room.gameOver) return;
    const p = room.players.get(socket.id);
    if (!p || !p.alive || p.online === false) return;
    if (tryKill(room, p, true)) broadcastState(room);
  });

  socket.on("resurrectChoice", (accept) => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.status !== "playing") return;
    const p = room.players.get(socket.id);
    if (!p || p.alive || p.role !== "innocent") return;
    const now = Date.now();
    if (!p.resurrectOfferUntil || p.resurrectOfferUntil < now) {
      socket.emit("resurrectResult", { ok: false, reason: "expired" });
      return;
    }
    if (accept === true) {
      if (p.resurrectWheelUsed) {
        socket.emit("resurrectResult", { ok: false, reason: "already_spun" });
        return;
      }
      p.resurrectWheelUsed = true;
      const odds = p.resurrectWheelOdds > 0 ? p.resurrectWheelOdds : DOCTOR_WHEEL_ODDS;
      const won = Math.random() < odds;
      if (won) {
        resurrectInnocent(room, p);
        socket.emit("resurrectResult", { ok: true, won: true });
        return;
      }
      p.doctorReviveUsed = true;
      p.doctorProtected = false;
      clearResurrectOffer(p);
      socket.emit("resurrectResult", { ok: false, won: false, reason: "unlucky" });
      checkGameEnd(room);
      broadcastState(room);
      return;
    }
    clearResurrectOffer(p);
    socket.emit("resurrectResult", { ok: false, reason: "declined" });
    checkGameEnd(room);
    broadcastState(room);
  });

  socket.on("sabotage", () => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.status !== "playing" || room.gameOver) {
      socket.emit("sabotageResult", { ok: false, reason: "no_game" });
      return;
    }
    const p = room.players.get(socket.id);
    if (!p) {
      socket.emit("sabotageResult", { ok: false, reason: "no_player" });
      return;
    }
    const result = trySabotage(room, p);
    socket.emit("sabotageResult", result);
    if (result.ok) broadcastState(room);
  });

  socket.on("visionneurPulse", () => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.status !== "playing" || room.gameOver) {
      socket.emit("visionneurResult", { ok: false, reason: "no_game" });
      return;
    }
    const p = room.players.get(socket.id);
    if (!p) {
      socket.emit("visionneurResult", { ok: false, reason: "no_player" });
      return;
    }
    const result = tryVisionneurPulse(room, p);
    socket.emit("visionneurResult", result);
    if (result.ok) broadcastState(room);
  });

  socket.on("usePower", (powerId) => {
    const room = getRoomForSocket(socket.id);
    if (!room || room.status !== "playing" || room.gameOver) {
      socket.emit("powerUsed", { powerId, ok: false, reason: "no_game" });
      return;
    }
    const p = room.players.get(socket.id);
    if (!p) {
      socket.emit("powerUsed", { powerId, ok: false, reason: "no_player" });
      return;
    }
    const result = usePlayerPower(room, p, powerId);
    socket.emit("powerUsed", { powerId, ...result });
    if (result.ok) broadcastState(room);
  });

  socket.on("disconnect", () => {
    handleDisconnect(socket);
  });
});

function updatePlayers(room, dt) {
  const now = Date.now();
  for (const p of room.players.values()) {
    expireTimedBuffs(p, now);
    if (!isPlayerActive(p)) continue;
    if (!p.alive) {
      const speed = PLAYER_SPEED * GHOST_SPEED_MULT;
      const dx = p.vx * speed * dt;
      const dy = p.vy * speed * dt;
      const moved = moveGhost(p.x, p.y, dx, dy);
      p.x = moved.x;
      p.y = moved.y;
      continue;
    }
    if (p.frozenUntil > now) {
      p.vx = 0;
      p.vy = 0;
      continue;
    }
    let speed = PLAYER_SPEED;
    if (p.speedUntil > now) speed *= SPEED_BOOST_MULT;
    const dx = p.vx * speed * dt;
    const dy = p.vy * speed * dt;
    const maze = getRoomMaze(room);
    const moved = moveCircle(maze, p.x, p.y, dx, dy, PLAYER_RADIUS);
    p.x = moved.x;
    p.y = moved.y;
  }
}

let last = Date.now();
setInterval(() => {
  purgeStaleLobbyRooms();
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

if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`Labyrinthe multijoueur → http://localhost:${PORT}`);
  });
}

module.exports = server;
