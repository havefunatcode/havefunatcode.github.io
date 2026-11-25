# 소품 스프라이트 원본 (Task 4, spec §5.4~5.6)

- 도구: Pixelbolt 0.20.0, `/tmp/art-tools/pixelbolt` (Task 3과 같은 설치). 레포에는 도구 파일을 넣지 않는다.
  sprite-gen `pixel-draw`는 npm에 없어서(404) 쓰지 않았다.
- **코인(초안 → 수작업)**: 내장 `coin` 프리셋(24x24, 6프레임 회전)을 초안으로 썼다.
  `npx pixelbolt compile --preset coin --out coin24.recipe.json` → `npx pixelbolt inspect coin24.recipe.json --grid`
  - 초안 구조: 몸통 폭 12/10/5/3/5/10, 테(0) · 기본(1) · 왼쪽 안 하이라이트 열(2) · 가운데 홈(3), 4·5 = 2·1 왕복.
  - `--size 8x8`로 바로 뽑으면 축소가 아니라 잘려서(42% 누락) 쓸 수 없다 → 폭 진행을 8/6/4/2/4/6으로 옮겨 손으로 다시 찍었다.
    색은 B 코인 3톤(a 하이라이트 · b 기본 · c 테두리 = 같은 계열 최암색, 검은 외곽선 없음).
- **상자·구름·나무(규칙 + 수작업 조정)**: `gen-props.mjs`. Pixelbolt에는 맞는 프리셋이 없어(상자는 등각 `iso-chest`뿐) spec §9 대체안(수작업)으로 만들었다.
  - 상자 32x28: 사각형 조합. 나무 W/w + 금속 띠 M/m(오른쪽 열 = 그늘), 오른 그늘면 2칸, 판자 이음 1행.
    닫힘 / 열림1(뚜껑 3px 들림, 틈에 빛 한 줄) / 열림2(젖혀진 뚜껑 + 빛) / 열림+빛(세운 뚜껑 안쪽면 + 보물 더미).
    빛 g = 코인 하이라이트색. 열림+빛의 뚜껑 위 빛줄기 점선은 1x에서 구멍처럼 보여 뺐다.
    근접 반짝임 1px = `CHEST_GLINT`(자물쇠판 좌상단).
  - 구름 3종: 원 합집합, 바닥 평평. 아래 2행과 오른·아래 윤곽 = 구름그늘(좌상단 광원).
  - 나무 3종(둥근 활엽수 · 포플러 · 작은 나무): 원 합집합 잎 + 2px 줄기.
    좌상단 테는 잎밝음, 오른·아래 테와 밑 2행은 잎그늘, 줄기 위 1행은 그림자.
    배경은 키 t/L/h/s를 skyAt의 trunk/leaf/leafHi/leafSh로 바꿔 칠한다.
- `node tools/art-src/props/gen-props.mjs` → `js/art/props.js`의 `COIN_FRAMES`부터 끝까지와 같은 문자열을 출력한다
  (`CHEST_GLINT` 위 주석 한 줄만 손으로 붙인 것).
