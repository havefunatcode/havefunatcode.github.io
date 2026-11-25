# 지면·발판 타일 원본 (Task 3, spec §5.3)

- 도구: Pixelbolt 0.20.0, `/tmp/art-tools/pixelbolt`에 설치(`npm install pixelbolt@0.20.0 --ignore-scripts`). 레포에는 도구 파일을 넣지 않는다.
  sprite-gen `pixel-draw`는 npm에 없어서(404) 쓰지 않았다.
- 초안: `ground-draft.autotile.json`(내장 `ground` 프리셋을 B 팔레트로 바꾸고 검은 외곽선을 뺀 것)
  `npx pixelbolt autotile ground-draft.autotile.json --out ground.recipe.json --preview map.png`
  → 16-tile cardinal 세트. mask 14(윗줄)·6/12(윗모서리)·7/13(옆면)·15(내부 a/b)를 `inspect --grid`로 읽어 구조를 잡았다.
- 다듬기: `gen-tiles.mjs`. 초안 구조를 규칙으로 옮기고 아래를 바꿨다.
  - 0행 여백을 없앴다(충돌 윗면 y=230 = 타일 0행).
  - 잔디 아래 경계를 들쭉날쭉하게 하고 잔디 밑에 그림자 한 줄을 넣었다.
  - 조약돌은 좌상단 광원으로 그렸다.
  - 끝 타일은 8~15행을 8px 주기 옆면 띠로 만들었다.
  - 발판 3조각(8x14)은 수작업이다.
  - `node gen-tiles.mjs`로 `js/art/tiles.js`의 `GROUND`·`PLAT` 문자열을 출력한다(현재 파일과 일치).
  - `--recipe`는 확인용 Pixelbolt 레시피를 출력한다.
- 끝 열 그리기: 윗줄은 끝 타일 16행을 전부 쓰고, 몸통은 8~15행 띠를 8px씩 반복한다(`js/sprites.js` `composeTile`).
