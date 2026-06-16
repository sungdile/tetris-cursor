"use strict";

// --- 상수: 보드·낙하·레벨 ---
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
const LEVEL_FEEDBACK_DURATION_MS = 2500;

// --- 상수: 점수 ---
const SCORE_SINGLE = 100;
const SCORE_DOUBLE = 300;
const SCORE_TRIPLE = 500;
const SCORE_TETRIS = 800;
const SCORE_SOFT_DROP = 1;
const SCORE_HARD_DROP = 2;

const LINE_SCORES = {
  1: SCORE_SINGLE,
  2: SCORE_DOUBLE,
  3: SCORE_TRIPLE,
  4: SCORE_TETRIS,
};

const EMPTY_CELL_COLOR = "#0d1117";

// --- 상수: SRS 벽 킥 ---
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

const KEY_ACTION_MAP = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowDown: "down",
  ArrowUp: "rotate",
  Space: "drop",
  KeyC: "hold",
  ShiftLeft: "hold",
  ShiftRight: "hold",
};

// --- DOM 참조 ---
const canvas = document.getElementById("gameBoard");
const ctx = canvas ? canvas.getContext("2d") : null;
const nextCanvas = document.getElementById("nextCanvas");
const nextCtx = nextCanvas ? nextCanvas.getContext("2d") : null;
const holdCanvas = document.getElementById("holdCanvas");
const holdCtx = holdCanvas ? holdCanvas.getContext("2d") : null;
const scoreElement = document.getElementById("score");
const levelElement = document.getElementById("level");
const levelTargetElement = document.getElementById("levelTarget");
const levelFeedbackElement = document.getElementById("levelFeedback");
const statusElement = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const boardArea = document.querySelector(".board-area");
const boardOverlay = document.getElementById("boardOverlay");

function assertRequiredDomElements() {
  const required = [
    canvas, ctx, nextCanvas, nextCtx, holdCanvas, holdCtx,
    scoreElement, levelElement, levelTargetElement, levelFeedbackElement,
    statusElement, startBtn, restartBtn, boardArea,
  ];

  if (required.some((element) => !element)) {
    console.error("필수 DOM 요소를 찾을 수 없습니다. index.html 구조를 확인하세요.");
    throw new Error("Tetris: required DOM elements missing");
  }
}

function initializeCanvasSizes() {
  canvas.width = COLS * BLOCK_SIZE;
  canvas.height = ROWS * BLOCK_SIZE;
  nextCanvas.width = PREVIEW_COLS * PREVIEW_BLOCK_SIZE;
  nextCanvas.height = PREVIEW_COLS * PREVIEW_BLOCK_SIZE;
  holdCanvas.width = PREVIEW_COLS * PREVIEW_BLOCK_SIZE;
  holdCanvas.height = PREVIEW_COLS * PREVIEW_BLOCK_SIZE;
}

assertRequiredDomElements();
initializeCanvasSizes();

// --- 게임 상태 ---
let board = createEmptyBoard();
let currentPiece = null;
let nextPieceType = null;
let holdPieceType = null;
let canHold = true;
let sevenBagQueue = [];
let score = 0;
let level = 1;
let dropTimer = null;
let isPlaying = false;
let isPaused = false;
let isGameOver = false;
let levelFeedbackTimer = null;

// --- 보드 ---
function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function forEachOccupiedCell(shape, originX, originY, callback) {
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) {
        continue;
      }

      callback(originX + col, originY + row);
    }
  }
}

function clearLines() {
  let clearedLineCount = 0;

  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row].every((cell) => cell !== 0)) {
      board.splice(row, 1);
      board.unshift(Array(COLS).fill(0));
      clearedLineCount++;
      row++;
    }
  }

  if (clearedLineCount > 0) {
    return addLineScore(clearedLineCount);
  }

  return false;
}

function lockPiece() {
  forEachOccupiedCell(currentPiece.shape, currentPiece.x, currentPiece.y, (boardX, boardY) => {
    if (boardY >= 0) {
      board[boardY][boardX] = currentPiece.color;
    }
  });
}

// --- 7-bag 랜덤 ---
function shuffleArray(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function refillSevenBag() {
  sevenBagQueue = shuffleArray(PIECE_TYPES);
}

function drawFromBag() {
  if (sevenBagQueue.length === 0) {
    refillSevenBag();
  }
  return sevenBagQueue.pop();
}

// --- 피스 생성·충돌·회전 ---
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

function getShapeForType(pieceType, rotationIndex = 0) {
  let shape = TETROMINOES[pieceType].shape.map((row) => [...row]);
  for (let i = 0; i < rotationIndex; i++) {
    shape = rotateMatrix(shape);
  }
  return shape;
}

function createPiece(pieceType, rotationIndex = 0) {
  const shape = getShapeForType(pieceType, rotationIndex);
  return {
    type: pieceType,
    shape,
    color: TETROMINOES[pieceType].color,
    rotationIndex,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 0,
  };
}

function collides(piece, offsetX = 0, offsetY = 0, shape = piece.shape) {
  let hasCollision = false;

  forEachOccupiedCell(shape, piece.x + offsetX, piece.y + offsetY, (boardX, boardY) => {
    if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
      hasCollision = true;
      return;
    }

    if (boardY >= 0 && board[boardY][boardX]) {
      hasCollision = true;
    }
  });

  return hasCollision;
}

function getSrsKicks(pieceType, fromRotation, toRotation) {
  if (pieceType === "O") {
    return [[0, 0]];
  }

  const kickKey = `${fromRotation}-${toRotation}`;
  if (pieceType === "I") {
    return SRS_KICKS_I[kickKey] || [[0, 0]];
  }

  return SRS_KICKS_JLSTZ[kickKey] || [[0, 0]];
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

// --- 점수·레벨 ---
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
  return addScore(LINE_SCORES[lineCount] || 0);
}

function addDropScore(points) {
  if (addScore(points)) {
    restartDropTimerAfterLevelUp();
  }
}

function restartDropTimerAfterLevelUp() {
  if (isGameSessionActive()) {
    startDropTimer();
  }
}

// --- 게임 상태 판별 ---
function isGameSessionActive() {
  return isPlaying && !isPaused && !isGameOver;
}

function canPlayerControl() {
  return currentPiece && isGameSessionActive();
}

// --- UI 갱신 ---
function updateScoreDisplay() {
  scoreElement.textContent = String(score);
}

function updateLevelDisplay() {
  const nextTargetScore = getCumulativeTargetForLevel(level);
  levelElement.textContent = String(level);

  if (level >= MAX_LEVEL) {
    levelTargetElement.textContent = "최고 레벨 달성!";
    return;
  }

  levelTargetElement.textContent = `누적 ${score} / ${nextTargetScore}점`;
}

function clearLevelFeedback() {
  if (levelFeedbackTimer !== null) {
    clearTimeout(levelFeedbackTimer);
    levelFeedbackTimer = null;
  }

  levelFeedbackElement.hidden = true;
  levelFeedbackElement.textContent = "";
  levelElement.classList.remove("level-up-flash");
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
    clearLevelFeedback();
  }, LEVEL_FEEDBACK_DURATION_MS);
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

// --- 플레이어 입력·피스 조작 ---
function movePiece(deltaX, deltaY) {
  if (!canPlayerControl()) {
    return false;
  }

  if (!collides(currentPiece, deltaX, deltaY)) {
    currentPiece.x += deltaX;
    currentPiece.y += deltaY;
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
  const wallKicks = getSrsKicks(currentPiece.type, fromRotation, toRotation);

  for (const [kickX, kickY] of wallKicks) {
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

  let dropDistance = 0;
  while (movePiece(0, 1)) {
    dropDistance++;
  }

  if (dropDistance > 0) {
    addDropScore(dropDistance * SCORE_HARD_DROP);
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
    const swappedType = holdPieceType;
    holdPieceType = currentType;
    currentPiece = createPiece(swappedType);
  }

  if (collides(currentPiece)) {
    endGame();
    return false;
  }

  drawPreviews();
  draw();
  return true;
}

function tryActionAndRedraw(actionFn) {
  if (actionFn()) {
    draw();
  }
}

function settlePiece() {
  lockPiece();
  const didLevelUp = clearLines();

  if (!spawnPiece()) {
    return;
  }

  if (didLevelUp) {
    restartDropTimerAfterLevelUp();
  }

  draw();
}

// --- 자동 낙하·타이머 ---
function handleAutoDrop() {
  if (!isGameSessionActive()) {
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

// --- 렌더링 ---
function drawCell(targetCtx, x, y, cellSize, color, highlight = false) {
  targetCtx.fillStyle = color;
  targetCtx.fillRect(x, y, cellSize, cellSize);
  targetCtx.strokeStyle = highlight ? "#ffffff" : "#21262d";
  targetCtx.lineWidth = highlight ? 2 : 1;
  targetCtx.strokeRect(x, y, cellSize, cellSize);
}

function drawShapeOnCanvas(targetCtx, pieceType, cellSize, highlight = false) {
  targetCtx.clearRect(0, 0, targetCtx.canvas.width, targetCtx.canvas.height);

  if (!pieceType) {
    return;
  }

  const shape = getShapeForType(pieceType, 0);
  const offsetX = Math.floor((PREVIEW_COLS - shape[0].length) / 2);
  const offsetY = Math.floor((PREVIEW_COLS - shape.length) / 2);
  const color = TETROMINOES[pieceType].color;

  forEachOccupiedCell(shape, offsetX, offsetY, (cellX, cellY) => {
    drawCell(
      targetCtx,
      cellX * cellSize,
      cellY * cellSize,
      cellSize,
      color,
      highlight
    );
  });
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

  forEachOccupiedCell(currentPiece.shape, currentPiece.x, currentPiece.y, (boardX, boardY) => {
    drawCell(
      ctx,
      boardX * BLOCK_SIZE,
      boardY * BLOCK_SIZE,
      BLOCK_SIZE,
      currentPiece.color,
      true
    );
  });
}

function draw() {
  drawBoard();
  drawPiece();
}

// --- 게임 흐름 ---
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
  sevenBagQueue = [];
  score = 0;
  level = 1;
  isPlaying = false;
  isPaused = false;
  isGameOver = false;
  clearLevelFeedback();
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
      tryActionAndRedraw(() => movePiece(-1, 0));
      break;
    case "right":
      tryActionAndRedraw(() => movePiece(1, 0));
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
      tryActionAndRedraw(rotatePiece);
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

  if (!isGameSessionActive()) {
    return;
  }

  const action = KEY_ACTION_MAP[event.code];
  if (!action) {
    return;
  }

  event.preventDefault();
  performPlayerAction(action);
}

function handleTouchAction(action) {
  if (!isGameSessionActive()) {
    return;
  }

  performPlayerAction(action);
}

// --- 이벤트 등록·초기화 ---
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
