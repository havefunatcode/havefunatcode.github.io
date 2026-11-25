# 픽셀 아트 전면 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **실행 환경**: 이 레포(`~/Workspace/havefunatcode/havefunatcode.github.io`)를 작업 폴더로 연 세션에서 실행한다(커밋 단계가 있다). 브랜치 `feature/pixel-art-overhaul`. **push·배포는 Task 12의 사용자 확인 전까지 금지.**

**Goal:** 캔버스·DOM 전 요소를 화풍 B(아늑한 인디)로 다시 그리고, 프로필 기반 16x24 플레이어 애니메이션·pixelfx 이펙트 3종·보물상자 열림 시퀀스를 넣는다.

**Architecture:** 스프라이트는 문자열 픽셀맵 데이터 모듈(`js/art/*`, Node import 가능)과 지연 굽기(`bake.js`)로 분리하고, 배경은 코드 실루엣 + 시간대 팔레트 보간, 애니메이션·상자 시퀀스는 Node 테스트 가능한 순수 로직(`anim.js`, `Game.update`)에 둔다. 런타임 외부 코드는 pixelfx(vendor, MIT) 하나.

**Tech Stack:** Vanilla JS ES modules, Canvas 2D, Node 단위테스트(자체 `ok()` 러너), pixelfx(vendor 복사). 저작 보조: codixel·Pixelbolt·sprite-gen(레포 밖 임시 폴더).

**Spec:** `docs/superpowers/specs/2026-11-25-pixel-art-overhaul-design.md` (§ 번호는 이 문서 기준)

## Global Constraints

- 빌드 없음·`package.json` 없음·npm/CDN 없음. 모든 import는 확장자 있는 상대경로(`./x.js`).
- 외부 이미지·오디오 파일 0개(커밋 금지: PNG·GIF·프로필 원본). 예외 없음.
- `js/art/*.js` 데이터·검증 모듈은 import 시 `document`·`window`를 건드리지 않는다(Node 테스트).
- 화풍 B: 검은 외곽선 금지(같은 계열 최암색), 오브젝트당 3~4톤, 하늘은 밴드+디더(그라디언트 금지). 기준 색은 spec §5.1·§5.2 표 그대로.
- 플레이어 스프라이트 16x24, 히트박스 12x20. 코인 8x8(6프레임 8fps), 상자 히트박스 44x36·스프라이트 32x28, 지면 타일 16x16, 발판 높이 14.
- `prefers-reduced-motion`: idle 숨쉬기·코인 회전·구름 표류·이펙트 전부 정지, `opening` 생략. walk·land는 유지. 상자 반짝임은 reduced에서도 1Hz 이하 점멸(2026-11-25 M2 게이트 사용자 결정, spec §5.5).
- 가로 폭 270~1100 전 구간 지원(`resize()`는 수정 금지).
- 추가 JS 비압축 합계 250,000B 이하(측정: `js/` 전체 − 기준선 30,999B).
- pixelfx: `src/fx/index.js`·`gallery/`·폰트·`docs/`·`tools/`·`skills/` 복사 금지. 모든 파일 맨 위 출처 주석 보존. 스킬의 Patch 게시·`@patchgg/cli` 설치 거절.
- 저작 도구는 `/tmp/art-tools/` 아래에서만 설치·클론. `~/.claude/skills` 전역 설치 금지. 레포에 도구 파일 추가 금지.
- 테스트 실행: `for f in tests/*.test.mjs; do node "$f" || exit 1; done` (기존 `engine.test.mjs` 10건 포함 전부 통과가 매 커밋 조건).
- 각 단계(M1~M5) 끝 **사용자 육안 승인 게이트**: `tools/art-src/preview/` 미리보기를 로컬 서버(`python3 -m http.server 8000`)로 띄워 보여주고 승인 전 다음 단계 금지.

## Review Focus

1. **점프 키를 누른 채 상자에 도착** → opening이 즉시 건너뛰어지지 않고 0.6초 연출 후 모달 1회(새 엣지에만 반응). → Task 9 테스트 `held jump does not skip opening`.
2. **opening 중 스킵 버튼 → 모달 닫기 → 다시 상자 앞 점프** → 모달이 정확히 한 번씩 열리고, 닫은 뒤 상태는 play, 상자는 열린 채, 재점프는 즉시 모달. → Task 9 `skip during opening fires once` · `reopen after close is instant`.
3. **방향 전환 연타** → 캐릭터가 좌우 어느 쪽을 봐도 같은 16px 칸에 그려져 튀지 않는다. → Task 8 `draw rect identical for both facings`.
4. **탭 전환 등으로 거대한 dt** → opening이 한 프레임에 끝나거나 onTreasure가 두 번 불리지 않는다. → Task 9 `huge dt clamps opening`.
5. **이펙트 재생 중 창 크기 변경(270↔1100)** → 이펙트가 월드 좌표에 붙어 있고 예외가 나지 않는다(이펙트 frame은 화면 폭과 무관). → Task 10 `fx frames independent of viewW`.

---

## File Structure

| 파일 | 책임 | 상태 |
|---|---|---|
| `js/art/palette.js` | B 팔레트 상수, 시간대 키프레임 `SKY_KEYS`, `skyAt(p)` | Create |
| `js/art/check.js` | `validateSprite(px, pal, size) → string[]` | Create |
| `js/art/bake.js` | `bake(px, pal)`, `baked(key, px, pal)` 지연 캐시 | Create (sprites.js에서 이동) |
| `js/art/tiles.js` | 지면 5종·발판 3조각 문자열 | Create |
| `js/art/props.js` | 코인 6·상자 4·구름 3·나무 2~3 문자열 | Create |
| `js/art/player.js` | 플레이어 프레임 + `PAL_PLAYER` | Create |
| `js/background.js` | 실루엣 함수·마스크 굽기·채색·별·해·패럴랙스 | Create |
| `js/anim.js` | `nextAnim`, `playerDrawRect`, `coinFrame` (순수) | Create |
| `js/fx.js` | pixelfx 어댑터 `createFxLayer` | Create |
| `js/vendor/pixelfx/**` | LICENSE·NOTICE·core 15·fx 원본 2·_lib 2·custom 3 | Create |
| `js/sprites.js` | 그리기 파사드(인자 확장) | Modify |
| `js/engine.js` | h20·touchdown·opening·animT·그리기 순서·fx 연결 | Modify |
| `js/main.js` | onOpening·setState·Enter·audio 시점·prevState 정규화 | Modify |
| `css/style.css` | `opening` 셀렉터, B 재테마 | Modify |
| `index.html`, `favicon.svg` | theme-color·favicon B | Modify |
| `assets/CREDITS.md` | 고지 갱신 | Modify |
| `js/level.js` | 주석(정점 144) | Modify |
| `tests/{art,anim,level,game,fx,css}.test.mjs` | 신규 테스트 | Create |
| `tools/art-src/preview/index.html` | 승인 게이트 미리보기 | Create |
| `tools/art-src/{player,props,tiles,fx}/` | 저작 원본(codixel 스크립트·Pixelbolt 레시피·변환 메모) | Create |

---

## M1 — 팔레트·배경

### Task 1: 팔레트·스프라이트 검증·지연 굽기

**Files:** Create `js/art/palette.js`, `js/art/check.js`, `js/art/bake.js`, `tests/art.test.mjs` · Modify `js/sprites.js:1-61` (bake 이동, 최상위 bake 제거)

**Interfaces:**
- Produces: `palette.js` → `export const B` (spec §5.1 표의 이름 있는 색 객체: `sky5, sun, sunEdge, cloud, cloudSh, mtn, mtnSh, far, farSh, near, nearSh, trunk, leaf, leafHi, leafSh, grass, grassSh, dirt, dirtSh, dirtHi, plat, platHi, platSh, coin3, chest4`), `export const SKY_KEYS` (길이 3, `{t, sky:[5 hex], sun, sunXr, sunY, sunR, starA, cloudA, mtn, mtnSh, far, farSh, near, nearSh, leaf, leafHi, leafSh, trunk}`), `export function skyAt(p) → 같은 필드의 보간 결과(hex는 'rgb(r,g,b)')`.
- Produces: `check.js` → `validateSprite(px: string[], pal: Record<string,string|null>, size: {w,h}) → string[]` (빈 배열 = 통과).
- Produces: `bake.js` → `bake(px, pal) → HTMLCanvasElement`, `baked(key: string, px, pal) → HTMLCanvasElement`(첫 호출 때 굽고 캐시).

- [ ] **Step 1: 실패 테스트 작성** `tests/art.test.mjs` (기존 러너의 `ok()` 패턴 복사)
```js
import { validateSprite } from "../js/art/check.js";
import { B, SKY_KEYS, skyAt } from "../js/art/palette.js";
ok(validateSprite(["ab","ba"], {a:"#000",b:null}, {w:2,h:2}).length === 0, "valid sprite");
ok(validateSprite(["ab","b"], {a:"#000",b:null}, {w:2,h:2}).some(e => /row 1/.test(e)), "row length error");
ok(validateSprite(["ax","ba"], {a:"#000",b:null}, {w:2,h:2}).some(e => /'x'/.test(e)), "unknown key error");
ok(validateSprite(["ab"], {a:"#000",b:null}, {w:2,h:2}).some(e => /height/.test(e)), "height error");
ok(SKY_KEYS.length === 3 && SKY_KEYS[1].t === 0.5, "3 keyframes");
ok(SKY_KEYS[1].sky.join() === "#9fb8d8,#b9c9dc,#d8d6d8,#efd8c8,#f6e2cc", "dawn sky = spec §5.1");
ok(skyAt(0).sunXr === 0.15 && skyAt(1).sunXr === 0.5 && skyAt(0).sunR === 30 && skyAt(1).sunR === 22, "sun path kept (spec §5.1)");
ok(skyAt(-1).sunY === skyAt(0).sunY && skyAt(2).sunY === skyAt(1).sunY, "clamped");
ok(skyAt(0).starA > 0.9 && skyAt(1).starA === 0, "stars only at evening");
```
- [ ] **Step 2:** `node tests/art.test.mjs` → FAIL (모듈 없음)
- [ ] **Step 3:** 세 모듈 구현. 저녁(0)·오전(1) 값은 B 채도 규칙으로 정하고(spec §8 빌더 재량) 해 경로 `sunXr 0.15/0.33/0.5`, `sunY 124/86/50`, `sunR 30/26/22`, `starA 1/0.4/0`, `cloudA 0.5/0.7/0.9`는 현행 `sprites.js:71-75·107·136`에서 가져온다. `sprites.js`는 `baked()`를 그리기 시점에 호출하도록 바꾸고 모듈 최상위 `bake(...)` 호출(현 60-61행)을 없앤다.
- [ ] **Step 4:** 전체 테스트 실행 → PASS(engine 10 + art)
- [ ] **Step 5:** 브라우저 확인 — `python3 -m http.server 8000` 후 `http://localhost:8000/` 타이틀→시작이 기존과 동일하게 동작, 콘솔 에러 0
- [ ] **Step 6:** 커밋 `refactor(art): 팔레트·스프라이트 검증·지연 굽기 모듈 분리`

### Task 2: 배경 레이어 + M1 게이트

**Files:** Create `js/background.js`, `tools/art-src/preview/index.html`, `tests/bg.test.mjs` · Modify `js/sprites.js:94-168` (`drawBackground`가 background.js에 위임)

**Interfaces:**
- Consumes: `SKY_KEYS`, `skyAt` (Task 1)
- Produces: `background.js` → `export const RIDGE_PERIOD` (>1100), `export function ridgeY(layer: 'mtn'|'far'|'near', x: number) → number` (순수, 주기 `RIDGE_PERIOD`), `export function drawBackground(ctx, cam, t, viewW, progress, reduced)`.

- [ ] **Step 1:** 실패 테스트 `tests/bg.test.mjs`
```js
import { ridgeY, RIDGE_PERIOD } from "../js/background.js";
ok(RIDGE_PERIOD > 1100, "period longer than max view width");
for (const L of ["mtn","far","near"]) for (const x of [0, 137, 999])
  ok(ridgeY(L, x) === ridgeY(L, x + RIDGE_PERIOD), `${L} periodic at ${x}`);
ok(ridgeY("mtn", 10) < ridgeY("far", 10) && ridgeY("far", 10) < ridgeY("near", 10), "layer order back→front higher→lower");
ok(Number.isInteger(ridgeY("near", 42.7)), "integer pixel rows");
```
(background.js는 `document`를 그리기 함수 안에서만 쓴다 → Node import 가능)
- [ ] **Step 2:** FAIL 확인
- [ ] **Step 3:** 구현. 레이어 순서·패럴랙스 계수는 spec §5.6(구름 0.2+6px/s, 먼 산 0.1, 먼 언덕 0.25, 가까운 언덕 0.45, 나무 줄 0.6 — 나무 스프라이트는 Task 4 전까지 자리만). 하늘 5밴드+경계 디더, 별(`starA`), 해(`sunXr·sunY·sunR`). 실루엣은 레이어별 `RIDGE_PERIOD` 폭 마스크 캔버스를 첫 호출 때 한 번 굽고 프레임마다 `skyAt` 색으로 채색해 두 장 이어 그린다.
- [ ] **Step 4:** PASS 확인
- [ ] **Step 5:** `tools/art-src/preview/index.html` — 쿼리 `?w=270|480|1100&p=0|0.5|1`로 배경만 그리는 페이지(모듈 import). 9조합 그리드.
- [ ] **Step 6:** 브라우저 성능 확인: 1100 폭 플레이 중 DevTools Performance 5초 → 평균 프레임 ≤16.7ms, 시작 시 마스크 굽기 ≤50ms(`performance.now()` 로그 임시)
- [ ] **Step 7:** 커밋 `feat(bg): 화풍 B 배경 레이어·시간대 3키프레임`
- [ ] **Step 8: M1 게이트** — 미리보기 9조합을 사용자에게 보여주고 저녁·오전 팔레트 승인. 반려 시 `SKY_KEYS` 값만 수정해 반복.

## M2 — 타일·소품

### Task 3: 지면·발판 타일 + 그리기 순서

**Files:** Create `js/art/tiles.js`, `tools/art-src/tiles/` · Modify `js/sprites.js:170-194` (`drawTile`), `js/engine.js:200-229` (`render` 순서), `tests/art.test.mjs`

**Interfaces:**
- Produces: `tiles.js` → `PAL_TILE`, `GROUND = { top, left, right, fill: [a, b] }`(각 16x16), `PLAT = { left, mid, right }`(각 폭 8·높이 14 — 56·60 폭은 mid 반복 + 자름), `export function groundVariant(tx: number, ty: number) → 0|1`(순수 해시).
- Produces: `render` 순서 = 배경 → 코인 → 상자 → 플레이어 → 타일 → 앞 이펙트(spec §5.2).

- [ ] **Step 1:** 테스트 추가: 모든 타일 `validateSprite` 통과(크기 위와 같음), `groundVariant`가 같은 입력에 같은 값·0/1만, 100칸 중 두 값 모두 등장.
- [ ] **Step 2:** FAIL 확인
- [ ] **Step 3:** 저작: `/tmp/art-tools/`에서 sprite-gen `pixel-draw --kind tile --size 16` 또는 Pixelbolt 레시피로 초안 → B 팔레트로 다듬어 문자열화. 원본 레시피/스크립트는 `tools/art-src/tiles/`에 커밋. `drawTile`은 세그먼트 폭을 16칸으로 돌고 오른끝 타일을 세그먼트 오른쪽에 정렬(spec §5.3).
- [ ] **Step 4:** PASS + 브라우저: 6개 구덩이 경계에 끝 타일, 발판 56·60 폭 이음새 없음
- [ ] **Step 5:** 커밋 `feat(art): 지면·발판 타일, 플레이어 뒤 타일 그리기 순서`

### Task 4: 코인·상자·구름·나무 + 그리기 시계 + M2 게이트

**Files:** Create `js/art/props.js`, `tools/art-src/props/` · Modify `js/sprites.js` (`drawCoin`, `drawChest`), `js/background.js`(구름·나무 스프라이트 사용), `js/engine.js` (`animT`), `js/anim.js`(Create — `coinFrame`만 먼저), `tests/art.test.mjs`, `tests/anim.test.mjs`(Create)

**Interfaces:**
- Produces: `props.js` → `COIN_FRAMES`(6×8x8), `CHEST_FRAMES`(4×32x28: closed, open1, open2, openGlow), `CLOUDS`(3), `TREES`(2~3), 각 `PAL_*`.
- Produces: `anim.js` → `coinFrame(animT: number, reduced: boolean) → 0..5` (8fps, reduced면 0).
- Produces: `Game.animT`(매 `update` 호출마다 모든 state에서 `+= min(dt, 1/30)`), `sprites.drawCoin(ctx, x, y, animT)`, `sprites.drawChest(ctx, c, { opened, openT, near }, animT)` — `openT`는 Task 9 전까지 0.

- [ ] **Step 1:** 테스트: props 전부 `validateSprite` 통과(크기 위), `coinFrame(0,false)===0`, `coinFrame(0.125,false)===1`, `coinFrame(0.75,false)===0`(6프레임 순환), `coinFrame(0.3,true)===0`.
- [ ] **Step 2:** FAIL 확인
- [ ] **Step 3:** 저작(Task 3과 같은 방식) + 구현. 상자 스프라이트는 `drawX = x + 6, drawY = y + 8`. `near`(=`atChest`)이고 닫힘이면 1px 반짝임 점멸(reduced 정지). `Game.update`의 `state !== "play"` early return보다 **앞에서** `animT`를 증가.
- [ ] **Step 4:** PASS + 브라우저: 타이틀 화면에서도 코인 회전, reduced-motion(DevTools Rendering 에뮬레이션)에서 정지
- [ ] **Step 5:** 커밋 `feat(art): 코인·상자·구름·나무 스프라이트와 그리기 시계`
- [ ] **Step 6: M2 게이트** — 미리보기에 소품 시트(8배 확대)·실제 장면 3폭을 추가해 사용자 승인.

## M3 — 플레이어

### Task 5: 히트박스 20·touchdown·레벨 정적 검사

**Files:** Modify `js/engine.js:34-115`, `js/level.js:5`, `tests/engine.test.mjs` · Create `tests/level.test.mjs`

**Interfaces:**
- Produces: `makePlayer(level).h === 20`; `stepPlayer` 반환 `{ jumped, landed, fell, touchdown: boolean, impactVy: number }` (`impactVy`는 touchdown일 때만 의미, 아니면 0).

- [ ] **Step 1:** 실패 테스트 — engine: `touchdown`이 착지 스텝 1회만 true(그 뒤 서 있는 60스텝 동안 false), 그 스텝의 `impactVy > 0`, 서 있는 동안 `landed`는 계속 true(호환). level: `LEVEL` import 후 모든 발판 p에 대해 수평 `[p.x − 12, p.x + p.w + 12]`와 겹치는 아래 솔리드 s(윗면 > p.y + p.h)와의 여유 `s.y − (p.y + p.h) ≥ 20`; 계단 높이(바로 아래 솔리드 윗면 − p.y) ≤ 44; `makePlayer(LEVEL).h === 20`; 시작 낙하 첫 touchdown의 `impactVy < 200`.
- [ ] **Step 2:** FAIL 확인
- [ ] **Step 3:** 구현 — 이전 착지 여부는 `engine.js:42` 점프 처리 **전에** 저장, `impactVy`는 Y 해소에서 `p.vy = 0`(현 75행) **전에** 저장. `level.js:5` 주석 「≈148」→「≈144(h20)」.
- [ ] **Step 4:** PASS(기존 10건 포함)
- [ ] **Step 5:** 커밋 `feat(engine): 히트박스 12x20, touchdown/impactVy 이벤트`

### Task 6: 애니메이션 상태기계

**Files:** Modify `js/anim.js`, `tests/anim.test.mjs`

**Interfaces:**
- Produces: `nextAnim(prev: {state,frame,timer}|null, p: player, ev: stepEvent, intent: {moveX,jump}, dt: number, opts: {reduced: boolean}) → {state: 'idle'|'walk'|'jumpUp'|'fall'|'land', frame: number, timer: number}`.
- Produces: `playerDrawRect(p) → {x, y, flipX}` — `x = round(p.x + p.w/2) − 8`, `y = round(p.y + p.h) − 24`, `flipX = x + 16`(좌향 translate 기준).

- [ ] **Step 1:** 실패 테스트 — spec §5.2 표 전 경로: 지면+정지→idle(0.5초마다 frame 0↔1), 지면+이동→walk(10fps, 6프레임 순환, 정지하면 idle), 공중 vy<0→jumpUp, 공중 vy≥0→fall, `touchdown && impactVy≥200`→land 후 80ms 뒤 idle/walk, `impactVy<200`→land 없음, `{reduced:true}`면 idle frame 고정 0, walk·land는 동일. `playerDrawRect`: `p={x:100.3,y:50,w:12,h:20}` → `x===98, y===46, flipX===114`; **draw rect identical for both facings**(facing ±1에서 실제 칠해지는 열 범위 `[98,114)` 동일).
- [ ] **Step 2:** FAIL 확인
- [ ] **Step 3:** 구현(순수 함수, 상수: `IDLE_STEP=0.5`, `WALK_FPS=10`, `LAND_MS=80`, `LAND_VY=200`)
- [ ] **Step 4:** PASS
- [ ] **Step 5:** 커밋 `feat(anim): 플레이어 애니메이션 상태기계와 그리기 앵커`

### Task 7: 플레이어 저작 — codixel vs Pixelbolt 비교

**Files:** Create `tools/art-src/player/` (codixel 스크립트, Pixelbolt 레시피, `README.md`에 사용 도구·버전·변환 방법), preview 페이지에 비교 탭

- [ ] **Step 1:** `/tmp/art-tools/`에 codixel 클론(전역 설치 금지) → 프로필 `~/Downloads/havefunatcode_profile.png`를 참고로 16x24 3/4 측면 기본 포즈 → `P.Rig`로 idle 2·walk 6·jumpUp·fall·land. 팔레트는 spec §5.2 값으로 고정.
- [ ] **Step 2:** 같은 사양으로 Pixelbolt(`npx -y pixelbolt@<고정버전>`, `--project` 범위) `poses` 레시피 1벌.
- [ ] **Step 3:** 두 세트를 문자열로 변환해 preview 비교 탭(8배 확대·좌우 방향·애니메이션 재생·장면 합성)에 표시.
- [ ] **Step 4: M3 게이트 ①** — 사용자가 한 세트 선택(또는 섞기 지시). 반려 시 수작업 수정 반복. 좌향 반전 반려 시 좌향 프레임 추가(spec §5.2).
- [ ] **Step 5:** 커밋 `chore(art-src): 플레이어 저작 원본`

### Task 8: 플레이어 반영

**Files:** Create `js/art/player.js` · Modify `js/sprites.js:5-27,200-211`, `js/engine.js` (`this.anim`), `tests/art.test.mjs`

**Interfaces:**
- Consumes: `nextAnim`, `playerDrawRect` (Task 6), `baked` (Task 1)
- Produces: `player.js` → `PAL_PLAYER`(spec §5.2 값), `PLAYER_FRAMES = { idle: [2], walk: [6], jumpUp: [1], fall: [1], land: [1] }`(각 16x24 문자열 배열); `sprites.drawPlayer(ctx, p, anim)`.

- [ ] **Step 1:** 테스트: 모든 프레임 `validateSprite(…, {w:16,h:24})` 통과, 프레임 수 = 2/6/1/1/1, 모든 프레임 맨 아래 행(23)에 신발 픽셀 존재(발 정렬), `PAL_PLAYER`에 검정 `#000000` 없음.
- [ ] **Step 2:** FAIL 확인
- [ ] **Step 3:** Task 7 선택본을 옮기고 `drawPlayer`를 `playerDrawRect` 기반으로(우향 `drawImage(frame, x, y)`, 좌향 `translate(flipX, y); scale(-1,1); drawImage(frame,0,0)`). `Game.update`에서 `this.anim = nextAnim(this.anim, …, {reduced:this.reduced})`, `reset()`에서 `this.anim = null`. 기존 `walkPhase`·sin bob 제거.
- [ ] **Step 4:** PASS + 브라우저: 걷기·점프·낙하·착지, x=880 발판 밑에서 머리카락이 발판 뒤로
- [ ] **Step 5:** 커밋 `feat(player): 프로필 기반 16x24 플레이어 애니메이션`
- [ ] **Step 6: M3 게이트 ②** — 실제 플레이 화면 승인.

## M4 — 이펙트·상자 시퀀스

### Task 9: opening 상태

**Files:** Modify `js/engine.js:120-198`, `js/main.js:17-68,77-92,158`, `css/style.css:93,94,213`, `js/sprites.js` (`drawChest` openT) · Create `tests/game.test.mjs`

**Interfaces:**
- Produces: `new Game({ …, onOpening })`; `Game.state ∈ 'title'|'play'|'opening'|'modal'`; `Game.chestOpened: boolean`; `Game.openTimer: number`; `Game.cancelOpening()`(스킵용); 상수 `OPEN_SEC = 0.6`.

- [ ] **Step 1:** 실패 테스트 `tests/game.test.mjs` — `Game`에 stub(`ctx`·`sprites`·`audio` 빈 함수, `input` 객체, `onOpening`·`onTreasure` 카운터) 주입, 플레이어를 상자 위에 둔 레벨 픽스처:
  - `opens after 0.6s`: 점프 엣지 → `onOpening` 1회·state 'opening', dt=1/60로 35스텝 동안 `onTreasure` 0, 37스텝째까지 정확히 1.
  - `re-press skips`: opening 중 jump false→true → 그 스텝에 `onTreasure` 1.
  - `held jump does not skip opening`: 진입 후 jump 계속 true → 0.6초 시점에 1회만.
  - `huge dt clamps opening`: `update(5)` 1회 → `onTreasure` 0(클램프 1/30).
  - `skip during opening fires once`: opening 중 `cancelOpening()` 후 30스텝 → `onTreasure` 추가 호출 0.
  - `reopen after close is instant`: chestOpened=true, state='play', 상자 앞 점프 엣지 → `onOpening` 0, `onTreasure` 1(같은 스텝).
  - `reduced skips opening`: `reduced:true` → 점프 엣지 즉시 `onTreasure` 1, `onOpening` 0.
  - `reset clears`: `reset()` 후 `chestOpened===false`.
- [ ] **Step 2:** FAIL 확인
- [ ] **Step 3:** 구현 — `update`: dt 클램프 → `animT` 증가 → `state==='opening'`이면 `openTimer += dt`, 새 점프 엣지 또는 `openTimer ≥ OPEN_SEC`이면 `onTreasure()` 1회 후 return; `play`가 아니면 return. 상자 근접 점프 엣지: `reduced || chestOpened`면 즉시 `onTreasure`, 아니면 `chestOpened=true; openTimer=0; state='opening'; onOpening()`. `main.js`: `onOpening: () => { audio.treasure(); setState('opening'); }`, `openTreasure()`는 `prevState==='opening'`이면 `'play'`로 정규화하고 opening에서 왔으면 `audio.treasure()` 생략, 스킵 경로는 `game.cancelOpening()` 먼저. keydown에 `st==='opening' && (Enter|Space)` → `openTreasure()`. `__setState` 주석·`engine.js:132` 상태 목록 갱신. CSS 93·94·213행 셀렉터에 `opening` 추가. `drawChest` 열림 판정을 `chestOpened` + `openT`(프레임 진행)로.
- [ ] **Step 4:** PASS + 브라우저: 데스크톱 Space·Enter·스킵 / 모바일 에뮬레이션 터치 점프로 재입력
- [ ] **Step 5:** 커밋 `feat(chest): 0.6초 상자 열림 시퀀스`

### Task 10: pixelfx vendor·어댑터·축소 변형 3종 + M4 게이트

**Files:** Create `js/vendor/pixelfx/{LICENSE,NOTICE.md,core/*.js(15),fx/pickups/{collect-burst,_lib}.js,fx/impacts/{heavy-landing,_lib}.js,fx/custom/{coin-burst-s,land-dust-s,chest-glint-s}.js}`, `js/fx.js`, `tools/art-src/fx/README.md`, `tests/fx.test.mjs` · Modify `js/engine.js`(스폰 연결·render 앞 이펙트)

**Interfaces:**
- Consumes: `touchdown`/`impactVy`(Task 5), `onOpening` 진입 지점(Task 9), `B` 팔레트(Task 1)
- Produces: `fx.js` → `createFxLayer({ reduced }) → { spawn(kind: 'coin'|'land'|'chest', x: number, y: number, opts?: {impactVy?: number}), update(dt), draw(ctx, cam), active(): number }`. reduced면 `spawn`은 no-op.

- [ ] **Step 1:** vendor 복사 — `patch-gg/pixelfx`를 `/tmp/art-tools/pixelfx`에 클론, 커밋 SHA를 `tools/art-src/fx/README.md`에 기록. 위 목록만 원본 경로 깊이 그대로 복사(Global Constraints 금지 목록 확인).
- [ ] **Step 2:** 변형 저작 — pixelfx 스킬 도구(`/tmp/art-tools/pixelfx` 안에서 `render`·`check`)로 spec §5.7 표대로: `coin-burst-s`(collect-burst 반경·속도 ½, ≤0.7초, B 금색 램프), `land-dust-s`(heavy-landing 먼지만: dent·cracks·자갈·섬광 제거, 반경·속도 ⅓, 세기 ∝ impactVy), `chest-glint-s`(`pickups/_lib`의 glint·twinkle + core sparkle, 0.6초). 전부 front 레이어만(drawBack 없음), 하드코딩 WHITE→B 최밝색, `light` 낮춤. 헤더에 원본 출처 주석 + 변경점.
- [ ] **Step 3:** 실패 테스트 `tests/fx.test.mjs` — custom 3종 import(Node 가능): `meta.size` 상한 coin ≤48x48·land ≤40x20·chest ≤48x40; 각 변형을 `createFrame(meta.size…)`+`composite` 로 t=0.1·0.3·0.5 렌더해 불투명 픽셀 중 B 팔레트(Task 1 `B` 전체 색 ± 가산 광 허용 오차 RGB 각 ≤24) 비율 ≥95%; `createFxLayer({reduced:true}).spawn('coin',0,0)` 후 `active()===0`; **fx frames independent of viewW**: spawn 후 `draw`를 viewW 270·1100 캔버스 stub로 각각 호출해 예외 없음·`active()` 불변.
- [ ] **Step 4:** FAIL 확인 → `fx.js` 구현(이펙트별 `meta.size` 작은 frame·ImageData 재사용, 활성 0이면 합성 생략, 매 프레임 `frame.ox/oy`에 카메라 반영) → PASS
- [ ] **Step 5:** 연결 — 코인 획득(`engine.js` 수집 루프) → `spawn('coin', c.x+4, c.y+4)`; `ev.touchdown && ev.impactVy ≥ 200` → `spawn('land', p.x+p.w/2, p.y+p.h, {impactVy})`; opening 진입 → `spawn('chest', chest.x+22, chest.y+8)`. `render` 끝(타일 뒤)에 `fx.draw`.
- [ ] **Step 6:** 브라우저: 세 이펙트 크기가 16x24 옆에서 과하지 않음, reduced 에뮬레이션에서 전부 없음
- [ ] **Step 7:** 커밋 `feat(fx): pixelfx 축소 변형 3종(코인·착지·상자)`
- [ ] **Step 8: M4 게이트** — 원본 vs 변형 나란히 + 실제 플레이 승인.

## M5 — DOM 재테마·마무리

### Task 11: DOM·favicon 재테마

**Files:** Modify `css/style.css` (`:root` 1-6행 및 2-5·15·31·39-40·61-62·73·76·82·88·110-118·129·150·164·176·190·220·239·251·269·278·304·310·322행의 색·모서리·그림자), `index.html:6`(`theme-color`), `favicon.svg` · Create `tests/css.test.mjs`

**Interfaces:**
- Produces: `:root` 변수 `--bg, --panel, --panel-edge, --ink, --ink-soft, --accent, --accent-edge, --focus`(B 팔레트 값, 주석에 `palette.js` 짝 이름).

- [ ] **Step 1:** 실패 테스트 `tests/css.test.mjs` — `style.css`를 텍스트로 읽어 `:root` 변수 파싱, WCAG 대비(상대휘도 공식) `--ink`/`--panel` ≥4.5, `--ink`/`--bg` ≥4.5, 버튼 글자/`--accent` ≥4.5; 파일 전체에서 `#000`·`#000000`·`black` 0건; `body[data-state="opening"]`가 HUD·touch 셀렉터에 존재(Task 9 회귀 방지).
- [ ] **Step 2:** FAIL 확인
- [ ] **Step 3:** 재테마 — spec §5.15: 크림·나무색 바탕, 같은 계열 진한 테두리, 둥근 모서리·블러 그림자 → 각진 모서리(`border-radius: 0`) + `box-shadow`의 오프셋 0 블러 0 픽셀 테두리. 포커스 링 `--focus` 2px 이상. 마크업·문구 변경 없음. favicon은 B 상자 색, `theme-color`는 `--bg`.
- [ ] **Step 4:** PASS + 브라우저: 타이틀·HUD·토스트·상자 안내·스킵·터치·모달(데스크톱·모바일 에뮬레이션), 키보드 포커스 이동
- [ ] **Step 5:** 커밋 `feat(ui): DOM 오버레이 화풍 B 재테마`

### Task 12: CREDITS·예산·최종 확인·배포

**Files:** Modify `assets/CREDITS.md`

- [ ] **Step 1:** CREDITS 갱신(spec §5.12 다섯 항목 그대로: 문구 정정, 「라이선스 의무 없음」 삭제, 경로 갱신, pixelfx 저작권 3줄, 저작 보조 도구 한 줄).
- [ ] **Step 2:** 예산 측정 — `find js -name '*.js' -exec cat {} + | wc -c` − 30,999 ≤ 250,000. 초과 시 spec §5.13 core 다이어트(act·rig·chain·scene 재수출 제거, 이펙트 import 확인, 헤더 기록) 후 재측정.
- [ ] **Step 3:** 전체 테스트 PASS, 외부 파일 검사 `git ls-files | grep -Ei '\.(png|gif|jpe?g|webp|mp3|wav|ogg)$'` → 0줄
- [ ] **Step 4:** 수용 기준 1~10을 chrome-devtools로 확인(270·480·1100 폭, reduced-motion 에뮬레이션, 모바일 에뮬레이션, 콘솔 에러 0, 60fps) — 결과를 `tools/art-src/README.md` 체크리스트에 기록
- [ ] **Step 5:** 커밋 `docs: CREDITS 갱신·최종 확인 기록`
- [ ] **Step 6: M5 게이트 + 배포 확인** — 사용자에게 최종 화면 승인과 **배포 승인**을 따로 받는다. 승인 후에만: `main`에 병합 → `git push origin main` → `git push origin main:deploy` → `curl -s "https://havefunatcode.github.io/?cb=$(date +%s)"`로 새 `js/art/` 참조 확인(push 성공을 배포 완료로 보고하지 않는다).
