# 테트리스 개발 로그

프로젝트 진행·이슈·결정·긴급 사항을 단계별로 누적 기록합니다.  
`/dev-logger` Subagent로 항목을 추가합니다.

## 단계 코드

| 코드 | 단계 |
|------|------|
| S0 | 0교시 — 스캐폴딩 |
| S1 | 1교시 — 블록·낙하·충돌 |
| S2 | 2교시 — 회전·라인 삭제 |
| S3 | 3교시 — 점수·게임 오버·재시작 |
| S4 | 4교시 — 렌더링·UI |
| S5 | 5교시 — 리팩토링·코드 품질 |
| S6 | 6교시 — 문서 갱신 |
| S7 | 7교시 — QA |
| S8 | 8교시 — 배포 |
| S0-APPLY | 0단계 — 리뷰 반영 |
| EMERGENCY | 긴급 점검 — Critical 회귀 |

---

## 기록

### 2026-06-16 — [S0] 0교시 — 스캐폴딩

| 구분 | 내용 | 관련 파일/명령 |
|------|------|----------------|
| 진행 | 스캐폴딩 구현 완료 (HTML/CSS/JS, 빈 보드·버튼) | index.html, style.css, script.js |
| 리뷰 | /code-reviewer: 파일 역할 분리 양호, 게임 상태·루프는 S1에서 구현 | /code-reviewer |
| 리뷰 | 0단계: 상수·상태·함수 섹션 구조로 script.js 재구성 | S0-APPLY, script.js |

### 2026-06-16 — [S1] 1교시 — 블록·낙하·충돌

| 구분 | 내용 | 관련 파일/명령 |
|------|------|----------------|
| 진행 | 테트로미노 7종, spawn/collides/move/lock, 자동 낙하, 좌우·아래 입력 | script.js |
| 리뷰 | 충돌·이동·고정·타이머 중복 방지 확인 | /game-logic-reviewer |
| 리뷰 | 0단계: stopDropTimer 후 startDropTimer 패턴 적용 | S0-APPLY |

### 2026-06-16 — [S2] 2교시 — 회전·라인 삭제

| 구분 | 내용 | 관련 파일/명령 |
|------|------|----------------|
| 진행 | rotateMatrix, rotatePiece 롤백, clearLines, 회전 키 | script.js |
| 리뷰 | 회전 충돌 시 shape 미적용, 라인 삭제 splice/unshift | /game-logic-reviewer |
| 리뷰 | 0단계: settlePiece lock-clear-spawn 순서 고정 | S0-APPLY |

### 2026-06-16 — [S3] 3교시 — 점수·게임 오버·재시작

| 구분 | 내용 | 관련 파일/명령 |
|------|------|----------------|
| 진행 | 1~4줄 점수, 소프트 드롭 점수, 게임 오버, 일시정지, 시작/재시작 | script.js |
| 결정 | 점수 규칙 100/300/500/800, 소프트 드롭 +1칸 | script.js |
| 리뷰 | spawn 충돌 시 endGame, resetGameState로 타이머·점수 초기화 | /game-logic-reviewer |

### 2026-06-16 — [S4] 4교시 — 렌더링·UI

| 구분 | 내용 | 관련 파일/명령 |
|------|------|----------------|
| 진행 | 블록별 색상, status 메시지, aria-live | index.html, style.css |
| 리뷰 | 조작 안내와 keydown 바인딩 일치 | /ui-ux-reviewer |
| 리뷰 | 0단계: status-message 스타일 추가 | S0-APPLY |

### 2026-06-16 — [S5] 5교시 — 리팩토링·코드 품질

| 구분 | 내용 | 관련 파일/명령 |
|------|------|----------------|
| 진행 | drawCell 분리, 미사용 hardDrop 제거 | script.js |
| 리뷰 | 로직·렌더링 분리, 전역 상태 명시 | /code-reviewer |

### 2026-06-16 — [S6] 6교시 — 문서 갱신

| 구분 | 내용 | 관련 파일/명령 |
|------|------|----------------|
| 진행 | README 실행·조작·기능 목록 갱신 | README.md, /readme-updater |

### 2026-06-16 — [S7] 7교시 — QA

| 구분 | 내용 | 관련 파일/명령 |
|------|------|----------------|
| 진행 | TC 시나리오 정의, 수동 테스트 대기 | /qa-tester |

### 2026-06-16 — [S8] 8교시 — 배포

| 구분 | 내용 | 관련 파일/명령 |
|------|------|----------------|
| 진행 | release-manager 점검 완료, Pages 배포는 push 후 | /release-manager |

### 2026-06-16 — [S0-APPLY] 0단계 — 리뷰 반영

| 구분 | 내용 | 관련 파일/명령 |
|------|------|----------------|
| 리뷰 | 일시정지 시 stopDropTimer, 재개 시 startDropTimer 적용 | script.js, /game-logic-reviewer |

### 2026-06-16 — [S0-APPLY] 전체 Subagent 리뷰 반영

| 구분 | 내용 | 관련 파일/명령 |
|------|------|----------------|
| 리뷰 | 8개 Subagent 병렬 리뷰 (code-reviewer, game-logic-reviewer, ui-ux-reviewer, qa-tester, release-manager, emergency-checker, bugbot, security-review) | 전체 |
| 진행 | 소프트 드롭 착지 시 즉시 settlePiece, 벽 킥(±1,±2) 추가 | script.js |
| 진행 | DOM null 가드, canvas 크기 JS 단일 소스, use strict | script.js |
| 진행 | 보드 오버레이(시작/일시정지/게임오버), 일시정지 시 brightness | index.html, style.css, script.js |
| 진행 | 접근성: focus-visible, score aria-live, canvas tabindex | index.html, style.css |
| 진행 | 반응형 캔버스 max-width, 모바일 터치 조작 버튼 | index.html, style.css, script.js |
| 진행 | 시작 버튼 플레이 중 비활성화, 활성 블록 하이라이트 | script.js, style.css |
| 리뷰 | Critical(P0) 없음, 보안 이슈 없음 | /emergency-checker, /security-review |
| 리뷰 | 배포 전 push·Pages URL·수동 QA 필요 | /release-manager |

### 2026-06-16 — [S5] SRS·하드드롭·홀드·다음 블록

| 구분 | 내용 | 관련 파일/명령 |
|------|------|----------------|
| 진행 | SRS 벽 킥 테이블(I / JLSTZ) 및 rotationIndex 추적 | script.js |
| 진행 | 하드 드롭(Space, +2점/칸), 홀드(C/Shift), 7-bag 랜덤 | script.js |
| 진행 | 다음·홀드 미리보기 캔버스 패널 추가 | index.html, style.css, script.js |
| 진행 | 조작법·기능 목록·Pages URL README 갱신 | README.md |
| 진행 | Subagent 리뷰 개선사항 commit push 완료 | git |
