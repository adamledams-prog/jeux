const MAP_W = 25;
const MAP_H = 15;
const MAP_SCALE = 1.4;
const TILE = Math.round(40 * MAP_SCALE);

function createWallMaze() {
  return Array.from({ length: MAP_H }, () => Array(MAP_W).fill(1));
}

function carveRect(maze, x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) maze[y][x] = 0;
    }
  }
}

function floorComponents(maze) {
  const seen = new Set();
  const comps = [];
  const key = (x, y) => `${x},${y}`;

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (maze[y][x] !== 0 || seen.has(key(x, y))) continue;
      const cells = [];
      const q = [[x, y]];
      seen.add(key(x, y));
      while (q.length) {
        const [cx, cy] = q.pop();
        cells.push([cx, cy]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
          if (maze[ny][nx] !== 0) continue;
          const k = key(nx, ny);
          if (seen.has(k)) continue;
          seen.add(k);
          q.push([nx, ny]);
        }
      }
      comps.push(cells);
    }
  }
  return comps.sort((a, b) => b.length - a.length);
}

function assertSingleComponent(maze, mapName) {
  const comps = floorComponents(maze);
  if (comps.length !== 1) {
    const sizes = comps.map((c) => c.length).join(", ");
    throw new Error(`Map "${mapName}" has ${comps.length} disconnected areas (sizes: ${sizes})`);
  }
}

/** Grille de couloirs 2× — tout relié par des « portes » verticales. */
function buildCroiseMaze() {
  const maze = createWallMaze();
  const horizBands = [[1, 2], [4, 5], [7, 8], [10, 11]];
  const wallRows = [3, 6, 9];
  const passages = [[1, 2], [5, 6], [11, 12], [17, 18], [22, 23]];

  for (const [y0, y1] of horizBands) {
    carveRect(maze, 1, y0, 23, y1);
  }
  for (const y of wallRows) {
    for (const [x0, x1] of passages) {
      carveRect(maze, x0, y, x1, y);
    }
  }
  return maze;
}

/** Couloir en S — une seule zone jouable. */
function buildSerpentMaze() {
  const maze = createWallMaze();
  carveRect(maze, 1, 1, 22, 2);
  carveRect(maze, 19, 1, 22, 5);
  carveRect(maze, 1, 4, 22, 5);
  carveRect(maze, 1, 4, 4, 8);
  carveRect(maze, 1, 7, 22, 8);
  carveRect(maze, 19, 7, 22, 11);
  carveRect(maze, 1, 10, 22, 11);
  carveRect(maze, 1, 1, 4, 11);
  return maze;
}

/** Deux anneaux reliés par un axe central (pas d’îlots). */
function buildAnneauxMaze() {
  const maze = createWallMaze();
  carveRect(maze, 2, 1, 22, 2);
  carveRect(maze, 2, 9, 22, 10);
  carveRect(maze, 2, 1, 3, 10);
  carveRect(maze, 21, 1, 22, 10);

  carveRect(maze, 7, 4, 17, 5);
  carveRect(maze, 7, 6, 17, 7);
  carveRect(maze, 7, 4, 8, 7);
  carveRect(maze, 16, 4, 17, 7);

  carveRect(maze, 11, 1, 12, 10);
  carveRect(maze, 2, 5, 22, 6);
  return maze;
}

const MAZE_CROISE = buildCroiseMaze();
const MAZE_SERPENT = buildSerpentMaze();
const MAZE_ANNEAUX = buildAnneauxMaze();

assertSingleComponent(MAZE_CROISE, "croise");
assertSingleComponent(MAZE_SERPENT, "serpent");
assertSingleComponent(MAZE_ANNEAUX, "anneaux");

const MAP_IDS = ["croise", "serpent", "anneaux"];

const MAP_CATALOG = {
  croise: { id: "croise", name: "Croisements", maze: MAZE_CROISE },
  serpent: { id: "serpent", name: "Serpent", maze: MAZE_SERPENT },
  anneaux: { id: "anneaux", name: "Anneaux", maze: MAZE_ANNEAUX },
};

function buildSpawnPoints(maze) {
  const main = new Set(floorComponents(maze)[0].map(([x, y]) => `${x},${y}`));
  const points = [];
  for (let ty = 1; ty < MAP_H - 1; ty++) {
    for (let tx = 1; tx < MAP_W - 1; tx++) {
      if (maze[ty][tx] === 0 && main.has(`${tx},${ty}`)) {
        points.push({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });
      }
    }
  }
  return points;
}

const MAP_SPAWNS = {};
for (const id of MAP_IDS) {
  MAP_SPAWNS[id] = buildSpawnPoints(MAP_CATALOG[id].maze);
}

module.exports = {
  MAP_W,
  MAP_H,
  MAP_SCALE,
  TILE,
  MAP_IDS,
  MAP_CATALOG,
  MAP_SPAWNS,
  buildSpawnPoints,
  floorComponents,
};
