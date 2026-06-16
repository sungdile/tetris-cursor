`emergency-checker` Subagent를 호출해 긴급 점검을 수행해줘.

- **발생 단계**: (예: S2 — 회전·라인 삭제)
- **증상**: (무엇이, 어떻게 깨졌는지)
- **재현 조건**: (알고 있다면)

Critical이면 0단계 회귀 절차와 재호출할 Subagent를 안내하고, `/dev-logger`에 남길 EMERGENCY 로그 초안도 함께 작성해줘.
