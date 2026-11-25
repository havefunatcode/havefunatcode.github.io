# 이펙트 원본·출처 (Task 10, spec §5.7·§5.12)

## vendor: pixelfx

- 원본: https://github.com/patch-gg/pixelfx (MIT, © 2026 Patch · © 2026 Hugo Duprez, `NOTICE.md` 참고)
- 커밋: `5294518ce7c72e48b6100a744596e0acf57f2826` (2026-11-12, package.json 0.3.1)
- 클론 위치: `/tmp/art-tools/pixelfx` (레포 밖). 도구 파일은 레포에 넣지 않는다.
- 경로: 원본은 `src/core`·`src/fx` 아래에 있다. package.json `exports`가 `./core/*` → `./src/core/*`, `./fx/*` → `./src/fx/*`로
  공개하는 그 경로대로 `src/`만 빼고 `js/vendor/pixelfx/` 아래에 둔다. 이펙트가 `../../core/index.js`를 import하므로
  `fx/<카테고리>/` → `core/`의 상대 깊이는 원본과 같다.
- 복사한 것(바이트 그대로, 맨 위 주석 포함):
  - `LICENSE`, `NOTICE.md`
  - `src/core/*.js` 15개 → `core/` (127,412 B, `core/index.js`가 전부 재수출하므로 전부 로드)
  - `src/fx/pickups/{collect-burst,_lib}.js` → `fx/pickups/`
  - `src/fx/impacts/{heavy-landing,_lib}.js` → `fx/impacts/`
- 복사하지 않은 것: `src/fx/index.js`(244개 레지스트리), `gallery/`(폰트 `PatchPixel-Regular.woff2`는 MIT 아님), `docs/`, `tools/`, `skills/`.
- 원본 `collect-burst`·`heavy-landing`은 게임에서 import하지 않는다(변형의 출처 대조용, M4 미리보기에서 나란히 보여 줌).
- 스킬 SKILL.md §5의 Patch(patch.gg) 게시 권유·`@patchgg/cli` 설치는 따르지 않았다.

## 축소 변형 3종 (`js/vendor/pixelfx/fx/custom/`)

각 파일 맨 위에 원본 출처 주석을 그대로 두고, 그 아래 `changes:`에 원본 대비 변경점을 적었다.

| 파일 | 출처 | 크기·길이 | 요지 |
|---|---|---|---|
| `coin-burst-s.js` | `pickups/collect-burst` (112x108, 1.35초) | 44x44, 0.7초 | 반경·속도 약 1/2, 코인 중심 원점, 바닥 튕김 제거, B 금색 램프(`B.coin3`) |
| `land-dust-s.js` | `impacts/heavy-landing` (176x80, 1.6초) | 40x18, 0.9초 | 먼지만(dent·cracks·자갈·grit·섬광·act 제거), 반경·속도 1/3, 세기 ∝ `impactVy`, `B.cloudSh`·`B.cloud` |
| `chest-glint-s.js` | `pickups/_lib` `twinkle()` + `glint()`/core `sparkle()` 방식 | 48x40, 0.6초 | 열린 상자 금 위(y 9) 빛줄기·큰 반짝이 1개·작은 반짝이 5개·티끌 |

공통:
- front 레이어만(drawBack 없음).
- 하드코딩 WHITE → 그 팔레트의 최밝색(`B.coin3[0]` / `B.cloud`). `glint()`·`sparkle()`은 심장 픽셀이 WHITE로 고정이라
  호출하지 않고 같은 방식(십자 팔·끝 어둡게·팔 3부터 대각선·심장·자체 glow)을 변형 안에서 팔레트 색으로 다시 그렸다.
- `light`는 호출자 예약 옵션이라(`check`가 meta.options의 `light`를 거부) 각 변형의 `LIGHT` 상수(0.4 / 0.35)로 glow k를 낮췄다.
- 기본 팔레트는 `js/art/palette.js`의 `B` 값과 같은 hex(독립 실행·렌더용). `tests/fx.test.mjs`가 B에 속하는지 검사한다.

## 저작·검사 (레포 밖에서)

```sh
cd /tmp/art-tools/pixelfx
cp <repo>/js/vendor/pixelfx/fx/custom/*.js src/fx/custom/      # 클론 안에서 편집했다면 반대 방향
node tools/check.mjs custom                                    # 3 pass, 0 fail, 0 warnings
node tools/render.mjs custom --out <scratchpad>/records --zoom 6 --no-actor
node tools/render.mjs pickups/collect-burst impacts/heavy-landing --out <scratchpad>/records
```

렌더 결과(PNG·records/)는 레포 밖(scratchpad)에만 둔다.

## 런타임 (`js/fx.js`)

`createFxLayer({ reduced })` → `{ spawn(kind, x, y, opts), update(dt), draw(ctx, cam), active() }`.
이펙트마다 `meta.size` 크기 frame(월드 좌표 고정, `ox,oy` = 스폰 위치 − origin)을 만들고 종류별 풀에서 frame·ImageData·
오프스크린 캔버스를 재사용한다. 화면 위치는 draw 때 카메라를 빼서 정한다. 활성 0개면 합성하지 않고, reduced면 spawn이 no-op.
