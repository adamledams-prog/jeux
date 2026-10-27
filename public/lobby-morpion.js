const LobbyMorpion = (() => {
  const HUMAN = 1;
  const AI = 2;
  const WIN_LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  let board = Array(9).fill(0);
  let gameOver = false;
  let boardEl = null;
  let statusEl = null;
  let resetBtn = null;
  let aiThinking = false;

  function winner(b) {
    for (const [a, c, d] of WIN_LINES) {
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    }
    return b.every((c) => c !== 0) ? -1 : 0;
  }

  function minimax(b, player) {
    const w = winner(b);
    if (w === HUMAN) return { score: -10, index: null };
    if (w === AI) return { score: 10, index: null };
    if (w === -1) return { score: 0, index: null };

    const moves = [];
    for (let i = 0; i < 9; i++) {
      if (b[i] !== 0) continue;
      const next = b.slice();
      next[i] = player;
      const res = minimax(next, player === AI ? HUMAN : AI);
      moves.push({ index: i, score: res.score });
    }

    if (player === AI) {
      let best = moves[0];
      for (const m of moves) {
        if (m.score > best.score) best = m;
      }
      const tied = moves.filter((m) => m.score === best.score);
      return tied[Math.floor(Math.random() * tied.length)];
    }

    let best = moves[0];
    for (const m of moves) {
      if (m.score < best.score) best = m;
    }
    return best;
  }

  function cellLabel(cell) {
    if (cell === HUMAN) return "×";
    if (cell === AI) return "○";
    return "";
  }

  function render() {
    if (!boardEl) return;
    const cells = boardEl.querySelectorAll(".morpion-cell");
    cells.forEach((btn, i) => {
      const v = board[i];
      btn.textContent = cellLabel(v);
      btn.classList.toggle("taken", v !== 0);
      btn.classList.toggle("human", v === HUMAN);
      btn.classList.toggle("ai", v === AI);
      btn.disabled = gameOver || aiThinking || v !== 0;
      btn.setAttribute("aria-label", v ? `Case ${i + 1}, ${cellLabel(v)}` : `Case ${i + 1}, vide`);
    });
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function finishMessage(w) {
    if (w === HUMAN) return "Victoire ! L’IA rejoue ?";
    if (w === AI) return "L’IA gagne — Rejouer ?";
    return "Match nul — Rejouer ?";
  }

  function endIfNeeded() {
    const w = winner(board);
    if (!w) return false;
    gameOver = true;
    boardEl?.classList.add("morpion-ended");
    setStatus(finishMessage(w));
    return true;
  }

  function aiTurn() {
    if (gameOver || winner(board)) return;
    aiThinking = true;
    render();
    setStatus("L’IA réfléchit…");
    window.setTimeout(() => {
      const move = minimax(board, AI);
      if (move?.index != null && board[move.index] === 0) {
        board[move.index] = AI;
      }
      aiThinking = false;
      render();
      if (!endIfNeeded()) {
        setStatus("À toi — place une croix");
      }
    }, 320);
  }

  function onCellClick(index) {
    if (gameOver || aiThinking || board[index] !== 0) return;
    board[index] = HUMAN;
    render();
    if (endIfNeeded()) return;
    aiTurn();
  }

  function resetGame() {
    board = Array(9).fill(0);
    gameOver = false;
    aiThinking = false;
    boardEl?.classList.remove("morpion-ended");
    setStatus("À toi — tu commences (×)");
    render();
  }

  function buildBoard() {
    if (!boardEl) return;
    boardEl.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "morpion-cell";
      btn.dataset.index = String(i);
      btn.addEventListener("click", () => onCellClick(i));
      boardEl.appendChild(btn);
    }
  }

  function init() {
    boardEl = document.getElementById("morpionBoard");
    statusEl = document.getElementById("morpionStatus");
    resetBtn = document.getElementById("morpionReset");
    if (!boardEl) return;
    buildBoard();
    resetBtn?.addEventListener("click", () => {
      Sfx?.unlock?.();
      resetGame();
    });
    resetGame();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return { reset: resetGame };
})();
