"use strict";

// 게임 보드 크기 (가로 10칸, 세로 20칸)
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const PREVIEW_BLOCK_SIZE = 20;
const PREVIEW_COLS = 4;
const BASE_DROP_INTERVAL_MS = 500;
const DROP_INTERVAL_DECREASE_PER_LEVEL = 35;
const MIN_DROP_INTERVAL_MS = 80;
const LEVEL_TARGET_BASE = 500;
const MAX_LEVEL = 20;

const SCORE_SINGLE = 100;
const SCORE_DOUBLE = 300;
const SCORE_TRIPLE = 500;
const SCORE_TETRIS = 800;
const SCORE_SOFT_DROP = 1;
const SCORE_HARD_DROP = 2;

const EMPTY_CELL_COLOR = "#0d1117";

const SRS_KICKS_JLSTZ = {
  "0-1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "1-0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "1-2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "2-1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "2-3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "3-2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "3-0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "0-3": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
};

const SRS_KICKS_I = {
  "0-1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "1-0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "1-2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  "2-1": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "2-3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "3-2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "3-0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "0-3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

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
const nextCanvas = document.getElementById("nextCanvas");
const nextCtx = nextCanvas ? nextCanvas.getContext("2d") : null;
const holdCanvas = document.getElementById("holdCanvas");
const holdCtx = holdCanvas ? holdCanvas.getContext("2d") : null;
const scoreElement = document.getElementById("score");
const levelElement = document.getElementById("level");
const levelTargetElement = document.getElementById("levelTarget");
const statusElement = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const boardArea = document.querySelector(".board-area");
const boardOverlay = document.getElementById("boardOverlay");
const levelFeedbackElement = document.getElementById("levelFeedback");

if (
  !canvas || !ctx || !nextCanvas || !nextCtx || !holdCanvas || !holdCtx ||
  !scoreElement || !levelElement || !levelTargetElement || !levelFeedbackElement ||
  !statusElement || !startBtn || !restartBtn || !boardArea
) {
  console.error("필수 DOM 요소를 찾을 수 없습니다. index.html 구조를 확인하세요.");
  throw new Error("Tetris: required DOM elements missing");
}

canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;
nextCanvas.width = PREVIEW_COLS * PREVIEW_BLOCK_SIZE;
nextCanvas.height = PREVIEW_COLS * PREVIEW_BLOCK_SIZE;
holdCanvas.width = PREVIEW_COLS * PREVIEW_BLOCK_SIZE;
holdCanvas.height = PREVIEW_COLS * PREVIEW_BLOCK_SIZE;

let board = createEmptyBoard();
let currentPiece = null;
let nextPieceType = null;
let holdPieceType = null;
let canHold = true;
let pieceBag = [];
let score = 0;
let level = 1;
let dropTimer = null;
let isPlaying = false;
let isPaused = false;
let isGameOver = false;
let levelFeedbackTimer = null;

function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function shuffleArray(items) {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function refillBag() {
  pieceBag = shuffleArray(PIECE_TYPES);
}

function drawFromBag() {
  if (pieceBag.length === 0) {
    refillBag();
  }
  return pieceBag.pop();
}

function getShapeForType(type, rotationIndex = 0) {
  let shape = TETROMINOES[type].shape.map((row) => [...row]);
  for (let i = 0; i < rotationIndex; i++) {
    shape = rotateMatrix(shape);
  }
  return shape;
}

function createPiece(type, rotationIndex = 0) {
  const shape = getShapeForType(type, rotationIndex);
  return {
    type,
    shape,
    color: TETROMINOES[type].color,
    rotationIndex,
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

function getSrsKicks(type, fromRotation, toRotation) {
  if (type === "O") {
    return [[0, 0]];
  }

  const key = `${fromRotation}-${toRotation}`;
  if (type === "I") {
    return SRS_KICKS_I[key] || [[0, 0]];
  }

  return SRS_KICKS_JLSTZ[key] || [[0, 0]];
}

function ensureNextPieceType() {
  if (!nextPieceType) {
    nextPieceType = drawFromBag();
  }
}

function spawnPiece() {
  ensureNextPieceType();
  currentPiece = createPiece(nextPieceType);
  nextPieceType = drawFromBag();
  canHold = true;

  if (collides(currentPiece)) {
    endGame();
    return false;
  }

  drawPreviews();
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
    return addLineScore(clearedCount);
  }

  return false;
}

function getCumulativeTargetForLevel(targetLevel) {
  return targetLevel * LEVEL_TARGET_BASE;
}

function getDropIntervalForLevel(currentLevel) {
  return Math.max(
    MIN_DROP_INTERVAL_MS,
    BASE_DROP_INTERVAL_MS - (currentLevel - 1) * DROP_INTERVAL_DECREASE_PER_LEVEL
  );
}

function addScore(points) {
  score += points;
  updateScoreDisplay();
  return checkLevelUp();
}

function checkLevelUp() {
  const previousLevel = level;

  while (level < MAX_LEVEL && score >= getCumulativeTargetForLevel(level)) {
    level++;
  }

  if (level > previousLevel) {
    showLevelFeedback(previousLevel, level);
  }

  updateLevelDisplay();
  return level > previousLevel;
}

function addLineScore(lineCount) {
  const lineScores = {
    1: SCORE_SINGLE,
    2: SCORE_DOUBLE,
    3: SCORE_TRIPLE,
    4: SCORE_TETRIS,
  };

  return addScore(lineScores[lineCount] || 0);
}

function addDropScore(points) {
  if (addScore(points) && isPlaying && !isPaused && !isGameOver) {
    startDropTimer();
  }
}

function canPlayerControl() {
  return currentPiece && isPlaying && !isPaused && !isGameOver;
}

function updateScoreDisplay() {
  scoreElement.textContent = String(score);
}

function updateLevelDisplay() {
  const nextTarget = getCumulativeTargetForLevel(level);
  levelElement.textContent = String(level);

  if (level >= MAX_LEVEL) {
    levelTargetElement.textContent = "최고 레벨 달성!";
    return;
  }

  levelTargetElement.textContent = `누적 ${score} / ${nextTarget}점`;
}

function showLevelFeedback(fromLevel, toLevel) {
  const message = toLevel - fromLevel > 1
    ? `레벨 ${fromLevel} → ${toLevel}!`
    : `레벨 ${toLevel} 달성!`;

  levelFeedbackElement.textContent = message;
  levelFeedbackElement.hidden = false;
  levelElement.classList.add("level-up-flash");

  if (levelFeedbackTimer !== null) {
    clearTimeout(levelFeedbackTimer);
  }

  levelFeedbackTimer = setTimeout(() => {
    levelFeedbackElement.hidden = true;
    levelFeedbackElement.textContent = "";
    levelElement.classList.remove("level-up-flash");
    levelFeedbackTimer = null;
  }, 2500);
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
  if (!canPlayerControl()) {
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
  if (!canPlayerControl()) {
    return false;
  }

  const fromRotation = currentPiece.rotationIndex;
  const toRotation = (fromRotation + 1) % 4;
  const rotatedShape = rotateMatrix(currentPiece.shape);
  const kicks = getSrsKicks(currentPiece.type, fromRotation, toRotation);

  for (const [kickX, kickY] of kicks) {
    if (!collides(currentPiece, kickX, -kickY, rotatedShape)) {
      currentPiece.x += kickX;
      currentPiece.y -= kickY;
      currentPiece.shape = rotatedShape;
      currentPiece.rotationIndex = toRotation;
      return true;
    }
  }

  return false;
}

function hardDrop() {
  if (!canPlayerControl()) {
    return false;
  }

  let droppedCells = 0;
  while (movePiece(0, 1)) {
    droppedCells++;
  }

  if (droppedCells > 0) {
    addDropScore(droppedCells * SCORE_HARD_DROP);
  }

  settlePiece();
  return true;
}

function holdCurrentPiece() {
  if (!canPlayerControl() || !canHold) {
    return false;
  }

  canHold = false;
  const currentType = currentPiece.type;

  if (holdPieceType === null) {
    holdPieceType = currentType;
    currentPiece = createPiece(nextPieceType);
    nextPieceType = drawFromBag();
  } else {
    const swapType = holdPieceType;
    holdPieceType = currentType;
    currentPiece = createPiece(swapType);
  }

  if (collides(currentPiece)) {
    endGame();
    return false;
  }

  drawPreviews();
  draw();
  return true;
}

function settlePiece() {
  lockPiece();
  const leveledUp = clearLines();

  if (!spawnPiece()) {
    return;
  }

  if (leveledUp && isPlaying && !isPaused && !isGameOver) {
    startDropTimer();
  }

  draw();
}

function handleAutoDrop() {
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
  dropTimer = setInterval(handleAutoDrop, getDropIntervalForLevel(level));
}

function stopDropTimer() {
  if (dropTimer !== null) {
    clearInterval(dropTimer);
    dropTimer = null;
  }
}

function drawCell(targetCtx, x, y, size, color, highlight = false) {
  targetCtx.fillStyle = color;
  targetCtx.fillRect(x, y, size, size);
  targetCtx.strokeStyle = highlight ? "#ffffff" : "#21262d";
  targetCtx.lineWidth = highlight ? 2 : 1;
  targetCtx.strokeRect(x, y, size, size);
}

function drawShapeOnCanvas(targetCtx, type, size, highlight = false) {
  targetCtx.clearRect(0, 0, targetCtx.canvas.width, targetCtx.canvas.height);

  if (!type) {
    return;
  }

  const shape = getShapeForType(type, 0);
  const offsetX = Math.floor((PREVIEW_COLS - shape[0].length) / 2);
  const offsetY = Math.floor((PREVIEW_COLS - shape.length) / 2);
  const color = TETROMINOES[type].color;

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) {
        continue;
      }

      drawCell(
        targetCtx,
        (offsetX + col) * size,
        (offsetY + row) * size,
        size,
        color,
        highlight
      );
    }
  }
}

function drawPreviews() {
  drawShapeOnCanvas(nextCtx, nextPieceType, PREVIEW_BLOCK_SIZE);
  drawShapeOnCanvas(holdCtx, holdPieceType, PREVIEW_BLOCK_SIZE);
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const color = board[row][col] === 0 ? EMPTY_CELL_COLOR : board[row][col];
      drawCell(ctx, col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, color);
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
      drawCell(ctx, x, y, BLOCK_SIZE, currentPiece.color, true);
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
  nextPieceType = null;
  holdPieceType = null;
  canHold = true;
  pieceBag = [];
  score = 0;
  level = 1;
  isPlaying = false;
  isPaused = false;
  isGameOver = false;
  if (levelFeedbackTimer !== null) {
    clearTimeout(levelFeedbackTimer);
    levelFeedbackTimer = null;
  }
  levelFeedbackElement.hidden = true;
  levelFeedbackElement.textContent = "";
  levelElement.classList.remove("level-up-flash");
  updateScoreDisplay();
  updateLevelDisplay();
  updateStatus("시작 버튼을 눌러 플레이하세요");
  showBoardOverlay("시작 버튼을 누르세요");
  boardArea.classList.remove("paused");
  updateButtonState();
  drawPreviews();
}

function startGame() {
  resetGameState();
  isPlaying = true;
  updateStatus("");
  showBoardOverlay("");
  updateButtonState();

  nextPieceType = drawFromBag();

  if (!spawnPiece()) {
    return;
  }

  startDropTimer();
  canvas.focus();
  draw();
}

function performPlayerAction(action) {
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
    case "drop":
      hardDrop();
      break;
    case "hold":
      holdCurrentPiece();
      break;
    default:
      break;
  }
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

  const keyActionMap = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowDown: "down",
    ArrowUp: "rotate",
    Space: "drop",
    KeyC: "hold",
    ShiftLeft: "hold",
    ShiftRight: "hold",
  };

  const action = keyActionMap[event.code];
  if (!action) {
    return;
  }

  event.preventDefault();
  performPlayerAction(action);
}

function handleTouchAction(action) {
  if (!isPlaying || isGameOver || isPaused) {
    return;
  }

  performPlayerAction(action);
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
