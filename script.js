"use strict";

// 게임 보드 크기 (가로 10칸, 세로 20칸)
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const DROP_INTERVAL_MS = 500;

const SCORE_SINGLE = 100;
const SCORE_DOUBLE = 300;
const SCORE_TRIPLE = 500;
const SCORE_TETRIS = 800;
const SCORE_SOFT_DROP = 1;

const WALL_KICK_OFFSETS = [0, -1, 1, -2, 2];

const TETROMINOES = {
  I: { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: "#00f0f0" },
  O: { shape: [[1, 1], [1, 1]], color: "#f0f000" },
  T: { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: "#a000f0" },
  S: { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: "#00f000" },
  Z: { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: "#f00000" },
  J: { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: "#0000f0" },
  L: { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: "#f0a000" },
};

const PIECE_TYPES = Object.keys(TETROMINOES);

const canvas = document.getElementById("gameBoard");
const ctx = canvas ? canvas.getContext("2d") : null;
const scoreElement = document.getElementById("score");
const statusElement = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const boardArea = document.querySelector(".board-area");
const boardOverlay = document.getElementById("boardOverlay");

if (!canvas || !ctx || !scoreElement || !statusElement || !startBtn || !restartBtn || !boardArea) {
  console.error("필수 DOM 요소를 찾을 수 없습니다. index.html 구조를 확인하세요.");
  throw new Error("Tetris: required DOM elements missing");
}

canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

let board = createEmptyBoard();
let currentPiece = null;
let score = 0;
let dropTimer = null;
let isPlaying = false;
let isPaused = false;
let isGameOver = false;

function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPieceType() {
  return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}

function createPiece(type) {
  const { shape, color } = TETROMINOES[type];
  return {
    type,
    shape: shape.map((row) => [...row]),
    color,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 0,
  };
}

function collides(piece, offsetX = 0, offsetY = 0, shape = piece.shape) {
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) {
        continue;
      }

      const boardX = piece.x + col + offsetX;
      const boardY = piece.y + row + offsetY;

      if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
        return true;
      }

      if (boardY >= 0 && board[boardY][boardX]) {
        return true;
      }
    }
  }

  return false;
}

function rotateMatrix(matrix) {
  const size = matrix.length;
  const rotated = Array.from({ length: size }, () => Array(size).fill(0));

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      rotated[col][size - 1 - row] = matrix[row][col];
    }
  }

  return rotated;
}

function spawnPiece() {
  currentPiece = createPiece(randomPieceType());

  if (collides(currentPiece)) {
    endGame();
    return false;
  }

  return true;
}

function lockPiece() {
  for (let row = 0; row < currentPiece.shape.length; row++) {
    for (let col = 0; col < currentPiece.shape[row].length; col++) {
      if (!currentPiece.shape[row][col]) {
        continue;
      }

      const boardY = currentPiece.y + row;
      const boardX = currentPiece.x + col;

      if (boardY >= 0) {
        board[boardY][boardX] = currentPiece.color;
      }
    }
  }
}

function clearLines() {
  let clearedCount = 0;

  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row].every((cell) => cell !== 0)) {
      board.splice(row, 1);
      board.unshift(Array(COLS).fill(0));
      clearedCount++;
      row++;
    }
  }

  if (clearedCount > 0) {
    addLineScore(clearedCount);
  }
}

function addLineScore(lineCount) {
  const lineScores = {
    1: SCORE_SINGLE,
    2: SCORE_DOUBLE,
    3: SCORE_TRIPLE,
    4: SCORE_TETRIS,
  };

  score += lineScores[lineCount] || 0;
  updateScoreDisplay();
}

function addDropScore(points) {
  score += points;
  updateScoreDisplay();
}

function updateScoreDisplay() {
  scoreElement.textContent = String(score);
}

function updateStatus(message) {
  statusElement.textContent = message;
}

function showBoardOverlay(message) {
  if (!boardOverlay) {
    return;
  }

  if (message) {
    boardOverlay.textContent = message;
    boardOverlay.hidden = false;
  } else {
    boardOverlay.textContent = "";
    boardOverlay.hidden = true;
  }
}

function updateButtonState() {
  startBtn.disabled = isPlaying && !isGameOver;
  restartBtn.disabled = false;
}

function movePiece(dx, dy) {
  if (!currentPiece || !isPlaying || isPaused || isGameOver) {
    return false;
  }

  if (!collides(currentPiece, dx, dy)) {
    currentPiece.x += dx;
    currentPiece.y += dy;
    return true;
  }

  return false;
}

function rotatePiece() {
  if (!currentPiece || !isPlaying || isPaused || isGameOver) {
    return false;
  }

  const rotatedShape = rotateMatrix(currentPiece.shape);

  for (const offsetX of WALL_KICK_OFFSETS) {
    if (!collides(currentPiece, offsetX, 0, rotatedShape)) {
      currentPiece.x += offsetX;
      currentPiece.shape = rotatedShape;
      return true;
    }
  }

  return false;
}

function settlePiece() {
  lockPiece();
  clearLines();
  spawnPiece();
  draw();
}

function tick() {
  if (!isPlaying || isPaused || isGameOver) {
    return;
  }

  if (!movePiece(0, 1)) {
    settlePiece();
  } else {
    draw();
  }
}

function startDropTimer() {
  stopDropTimer();
  dropTimer = setInterval(tick, DROP_INTERVAL_MS);
}

function stopDropTimer() {
  if (dropTimer !== null) {
    clearInterval(dropTimer);
    dropTimer = null;
  }
}

function drawCell(x, y, color, highlight = false) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
  ctx.strokeStyle = highlight ? "#ffffff" : "#21262d";
  ctx.lineWidth = highlight ? 2 : 1;
  ctx.strokeRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const color = board[row][col] === 0 ? "#0d1117" : board[row][col];
      drawCell(col * BLOCK_SIZE, row * BLOCK_SIZE, color);
    }
  }
}

function drawPiece() {
  if (!currentPiece) {
    return;
  }

  for (let row = 0; row < currentPiece.shape.length; row++) {
    for (let col = 0; col < currentPiece.shape[row].length; col++) {
      if (!currentPiece.shape[row][col]) {
        continue;
      }

      const x = (currentPiece.x + col) * BLOCK_SIZE;
      const y = (currentPiece.y + row) * BLOCK_SIZE;
      drawCell(x, y, currentPiece.color, true);
    }
  }
}

function draw() {
  drawBoard();
  drawPiece();
}

function togglePause() {
  if (!isPlaying || isGameOver) {
    return;
  }

  isPaused = !isPaused;

  if (isPaused) {
    stopDropTimer();
    updateStatus("일시정지 — P로 재개");
    showBoardOverlay("일시정지");
    boardArea.classList.add("paused");
  } else {
    startDropTimer();
    updateStatus("");
    showBoardOverlay("");
    boardArea.classList.remove("paused");
  }

  draw();
}

function endGame() {
  isPlaying = false;
  isGameOver = true;
  isPaused = false;
  currentPiece = null;
  stopDropTimer();
  updateStatus("게임 오버 — 재시작 버튼을 누르세요");
  showBoardOverlay("게임 오버");
  boardArea.classList.remove("paused");
  updateButtonState();
  draw();
}

function resetGameState() {
  stopDropTimer();
  board = createEmptyBoard();
  currentPiece = null;
  score = 0;
  isPlaying = false;
  isPaused = false;
  isGameOver = false;
  updateScoreDisplay();
  updateStatus("시작 버튼을 눌러 플레이하세요");
  showBoardOverlay("시작 버튼을 누르세요");
  boardArea.classList.remove("paused");
  updateButtonState();
}

function startGame() {
  resetGameState();
  isPlaying = true;
  updateStatus("");
  showBoardOverlay("");
  updateButtonState();

  if (!spawnPiece()) {
    return;
  }

  startDropTimer();
  canvas.focus();
  draw();
}

function handleKeyDown(event) {
  if (event.code === "KeyP") {
    if (!isPlaying || isGameOver) {
      return;
    }
    event.preventDefault();
    togglePause();
    return;
  }

  if (!isPlaying || isGameOver || isPaused) {
    return;
  }

  switch (event.code) {
    case "ArrowLeft":
      event.preventDefault();
      if (movePiece(-1, 0)) {
        draw();
      }
      break;
    case "ArrowRight":
      event.preventDefault();
      if (movePiece(1, 0)) {
        draw();
      }
      break;
    case "ArrowDown":
      event.preventDefault();
      if (movePiece(0, 1)) {
        addDropScore(SCORE_SOFT_DROP);
        draw();
      } else {
        settlePiece();
      }
      break;
    case "ArrowUp":
    case "Space":
      event.preventDefault();
      if (rotatePiece()) {
        draw();
      }
      break;
    default:
      break;
  }
}

function handleTouchAction(action) {
  if (!isPlaying || isGameOver || isPaused) {
    return;
  }

  switch (action) {
    case "left":
      if (movePiece(-1, 0)) {
        draw();
      }
      break;
    case "right":
      if (movePiece(1, 0)) {
        draw();
      }
      break;
    case "down":
      if (movePiece(0, 1)) {
        addDropScore(SCORE_SOFT_DROP);
        draw();
      } else {
        settlePiece();
      }
      break;
    case "rotate":
      if (rotatePiece()) {
        draw();
      }
      break;
    default:
      break;
  }
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
document.addEventListener("keydown", handleKeyDown);

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => {
    handleTouchAction(button.dataset.action);
  });
});

resetGameState();
draw();
