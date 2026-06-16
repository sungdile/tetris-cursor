// 게임 보드 크기 (가로 10칸, 세로 20칸)
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

const canvas = document.getElementById("gameBoard");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

// 빈 보드 데이터 (0 = 빈 칸)
const board = createEmptyBoard();

function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * BLOCK_SIZE;
      const y = row * BLOCK_SIZE;

      if (board[row][col] === 0) {
        ctx.fillStyle = "#0d1117";
      } else {
        ctx.fillStyle = "#58a6ff";
      }

      ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
      ctx.strokeStyle = "#21262d";
      ctx.strokeRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
    }
  }
}

function resetGame() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      board[row][col] = 0;
    }
  }

  scoreElement.textContent = "0";
  drawBoard();
}

startBtn.addEventListener("click", () => {
  // TODO: 게임 시작 로직 추가 예정
  drawBoard();
});

restartBtn.addEventListener("click", () => {
  resetGame();
});

// 페이지 로드 시 빈 보드 표시
resetGame();
