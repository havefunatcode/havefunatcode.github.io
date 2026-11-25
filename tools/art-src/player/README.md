# 플레이어 저작 원본 (Task 7)

16x24 플레이어 프레임(idle 2 · walk 6 · jumpUp · fall · land)을 두 도구로 각각 저작해 비교했다.

- `codixel/` — codixel(mankidev/codixel @604a9dc) `P.Rig` 기반 + 팔다리 수작업. **미채택**(비교용 보존)
- `pixelbolt/` — Pixelbolt 0.20.0 `poses` 레시피 + 수작업 다듬기. **채택**(2026-11-25 M3 게이트, 사용자 선택)
  - 안경: 사용자 피드백(「눈 한쪽이 깨진 느낌」) 후 `round44` 변형으로 교체 — `pixelbolt/README.md` 「안경 수정」
  - 좌향은 우향 좌우 반전(spec §5.2), 바지 1톤 유지(사용자 별도 지시 없음 → 기본값)
- 채택본은 `pixelbolt/frames.mjs` → `js/art/player.js`로 옮긴다(Task 8). 재생성: `cd pixelbolt && node hand-refine.mjs > frames.mjs`
- 도구는 `/tmp/art-tools/`에서만 실행했다. 이 폴더에는 텍스트 원본만 있다(PNG·도구 코드 없음).
- 비교 화면: `tools/art-src/preview/?tab=player`
