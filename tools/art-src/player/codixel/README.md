# 플레이어 스프라이트 — codixel 후보 (Task 7 step 1, spec §5.1·§5.2)

결과: `frames.mjs` — `PAL_PLAYER`(spec §5.2 고정 팔레트) + `PLAYER_FRAMES`
(idle 2 · walk 6 · jumpUp 1 · fall 1 · land 1, 각 16x24 문자열 24행). 우향 3/4 측면, 좌향은 그릴 때 좌우 반전.

## 도구

- **codixel** `https://github.com/mankidev/codixel` @ `604a9dcbcc4e386bc48188b5f7f49099f5d04db7`
  - `/tmp/art-tools/codixel`에 클론만 했다. 스킬 설치(전역 `~/.claude/skills`)는 하지 않고 `SKILL.md`를 직접 읽었다.
  - `core/pixel.js`는 끝에서 `module.exports = P`를 하므로 Node에서 `require`로 바로 쓴다(헤드리스 Chrome·shim 불필요).
  - 레포에는 도구 코드·PNG를 넣지 않는다. 스크립트는 `--pixel=`로 도구 경로를, `--out=`으로 레포 밖 출력 폴더를 받는다.
- 프로필 `~/Downloads/havefunatcode_profile.png`는 **참고로만** 읽었다(레포에 복사하지 않음).

## 재현

```sh
# 1~4단계: ref.png · owners.png · rig-sheet.png · rig-frames.json 을 레포 밖 폴더에 쓴다
node tools/art-src/player/codixel/codixel-player.cjs \
  --pixel=/tmp/art-tools/codixel/core/pixel.js \
  --ref=$HOME/Downloads/havefunatcode_profile.png --out=<scratch>/cx
# 5단계: 손질본 생성
node tools/art-src/player/codixel/hand-refine.mjs > tools/art-src/player/codixel/frames.mjs
# rig 초안 대비 손으로 바꾼 픽셀 수
node tools/art-src/player/codixel/codixel-player.cjs --out=<scratch>/cx --final=tools/art-src/player/codixel/frames.mjs
```

## 단계 — 도구가 한 것 / 손으로 한 것

SKILL.md §2(참고 이미지 → 픽셀화 → 뼈 → 애니메이션)와 small-character 규칙(64px 미만은 큰 이미지에서
뼈를 돌리고 프레임마다 다시 픽셀화, 작은 디테일은 큰 크기에서 먼저 quantize 후 `mode` 축소)을 따랐다.

| 단계 | 도구(codixel `P.*`) | 손 |
|---|---|---|
| 1. 참고 픽셀화 | `P.load` → `P.removeBg({tol:60, erode:1})` → `P.crop`(머리) → `P.quantize({palette: PAL_PLAYER})` → `P.resize(w 9~12, {mode:true})` | crop 범위 지정 |
| 2. 기본 포즈 16x24 | — | 정면 흉상이라 3/4 측면·하반신은 그대로 쓸 수 없음. 1단계 결과(머리 실루엣: 가르마 쪽이 낮고 오른쪽 볼륨, 안경은 12px에서 회색 얼룩으로 사라짐)를 보며 `BASE`를 직접 찍음 |
| 3. 뼈 | `P.Rig` 7뼈(torso·head·arm·thighB·shinB·thighF·shinF)를 **4배(64x96)로 키운 BASE**에 붙임, `bind({paint})`, `ownerMap`+`legend`+`ruler`로 소유 영역 확인 | 관절 좌표·paint 상자 지정 |
| 4. 포즈 | `rig.draw` → `P.resize(16,24,{mode:true})` → `P.quantize(PAL_PLAYER)` → 23행 접지 | 포즈 각도: walk는 φ=i/6·2π에서 허벅지 ∓0.5·cosφ, 정강이 0.9·max(0,±sinφ), 팔 0.45·cosφ |
| 5. 손질 | `P.edgeCheck`로 점검(nub·strip·hole) | `hand-refine.mjs` 아래 내용 |

`codixel-player.cjs --final` 결과(rig 초안 대비 손으로 바꾼 픽셀 / 384):
idle 0·0 · walk 152·41·36·175·40·36 · jumpUp 166 · fall 56 · land 52.

### 손질 내용 (`hand-refine.mjs`)

- **머리·얼굴**: rig 초안을 그대로 쓴다(머리 뼈는 회전 안 함). BASE 단계에서 안경 5안을 비교해
  가운데 줄이 막대처럼 보이지 않는 안(두 렌즈가 각각 고리 + 눈동자, 귀 쪽 다리 1px)을 골랐다.
  얼굴 앞선·턱은 `o` 대신 `S`(피부 최암색)로 셀렉티브 외곽선(spec §5.1). 코끝 1px 돌출은 일부러 남김(edgeCheck nub 1개).
- **다리**: 3px 다리를 16px에서 돌리면 번지고 구멍이 생겨서(rig-sheet) rig가 준 발 위치·벌림·무릎 높이만 가져와
  조각(`LEGS`: stand · contact · lift · pass · tuck · dangle · squash)을 손으로 다시 찍었다.
  walk 순서 = contact(1px 내려감) → lift → pass → contact → lift → pass.
- **팔**: 몸통과 같은 색이라 회전 결과가 회색 덩어리가 됨 → 어깨(6,12)에서 손까지의 뒷면 그늘선 `D` + 손 2x2로
  다시 그림(`ARM`: back2 · back1 · mid · fwd1 · fwd2 · reach · up). walk 팔 = back2 · back1 · fwd1 · fwd2 · fwd1 · back1(다리 반대).
- **몸 높이**: idle1·contact·tuck = 윗몸 1px 내림, land = 2px 내림(다리 행 수를 줄여서). 모든 프레임 23행에 `f`.
- **edgeCheck**: 손질 뒤 모든 프레임 strip 0 · hole 0 · nub 1(코끝).

## 알려진 한계 (비교할 때 볼 것)

- 바지가 한 톤(`p`)뿐이라 앞·뒤 다리를 색으로 못 가른다 → walk 다리 모양은 3프레임 주기로 같고, 팔 위치가 6프레임을 구분한다.
- 좌향은 반전이라 가르마·볼륨 방향이 반대가 된다(spec §5.2에서 허용, M3 게이트 확인 대상).
- 그림이 히트박스(열 2..13) 밖으로 나가는 곳(그림만, 충돌 무관): 앞머리·코 14~15열(전 프레임),
  contact 뒷발과 land 발 1열, fall의 들린 팔 0~1열.
