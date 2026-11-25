# 플레이어 스프라이트 — Pixelbolt 후보 (Task 7 Step 2, spec §5.1·§5.2)

- 도구: **Pixelbolt 0.20.0** (`DISABLE_TELEMETRY=1 npx -y pixelbolt@0.20.0 …`, cwd `/tmp/art-tools/pixelbolt`, Task 3·4와 같은 설치).
  레포에는 도구 파일을 넣지 않았다. 스킬 전역 설치(`~/.claude/skills`)는 하지 않았고, 패키지 안 `skills/`·`docs/`를 직접 읽었다.
- 참고 이미지: `~/Downloads/havefunatcode_profile.png` (눈으로만 참고, 레포에 복사하지 않음). 렌더 PNG도 레포에 넣지 않았다.

## 파일

| 파일 | 내용 | 만든 쪽 |
|---|---|---|
| `player.poses.json` | `pixelforge-poses` 레시피(예제 `hero.poses.json` 구조). 16x30 캔버스, 팔레트 = PAL_PLAYER 그대로 | 손으로 씀 |
| `convert.mjs` | 렌더된 `frames/<이름>.png`(1배) → PAL_PLAYER 최근접 색 양자화 → 문자열. 의존성 없는 PNG 디코더 | 손으로 씀 |
| `build-draft.mjs` | 변환 결과를 16x24로 맞춤(가장 아래 불투명 행 = 23행) → `frames.draft.mjs` | 손으로 씀 |
| `frames.draft.mjs` | **툴 출력 그대로**(손질 전) — 비교용 | 툴 생성 |
| `hand-refine.mjs` | 손질 단계. 레시피의 머리·몸통 그리드를 읽어 쓰고, 다리·팔·발은 프레임별로 손으로 찍음 → `frames.mjs` | 손으로 씀 |
| `glasses-variants.mjs` | 안경 변형 비교용(미리보기 「안경 변형」 섹션만 씀). `hand-refine.mjs --variants` 생성물 | 생성 |
| `frames.mjs` | **최종 결과** (`PAL_PLAYER`, `PLAYER_FRAMES` = idle 2 · walk 6 · jumpUp 1 · fall 1 · land 1) | 생성 + 손질 |

## 재현

```sh
cd /tmp/art-tools/pixelbolt
P=<repo>/tools/art-src/player/pixelbolt
DISABLE_TELEMETRY=1 npx -y pixelbolt@0.20.0 compile $P/player.poses.json --out out/player.pixel.json --metadata out/player.meta.json --force
DISABLE_TELEMETRY=1 npx -y pixelbolt@0.20.0 render out/player.pixel.json --out out/bundle --look
node $P/build-draft.mjs out/bundle/frames > $P/frames.draft.mjs   # 툴 초안
node $P/hand-refine.mjs > $P/frames.mjs                            # 손질본
node $P/hand-refine.mjs --variants > $P/glasses-variants.mjs       # 안경 변형 비교(미리보기용)
```

컴파일 경고 0개. `render`는 16개 프레임(stand, idle 2, walk 6, jump 7)을 만든다.

## 레시피 구성 (툴이 한 일)

- 그리드 파트: `head`(14x13 — 머리·안경·얼굴), `torso`(11x6 — 후드 깃·끈 2줄·밑단), `hand`, `farHand`, `boot`, `farBoot`.
- 본 파트(툴이 각도에 맞춰 그리고 램프로 음영): 허벅지·정강이(바지 램프 `o→p`), 윗팔·아랫팔(후드 램프 `D→d`, 먼 팔은 한 단계 어둡게). `hips`는 매스.
- 리그 + 모션 템플릿: `idle`(2프레임), `walk`(6프레임, stride 5 · lift 1 · bob 1), `jump`(7프레임 중 rise/fall/land 사용).
  `light: 225`(좌상단 광원).
- 캔버스는 16x30으로 컴파일해 템플릿이 위아래로 잘리지 않게 하고, `build-draft.mjs`가 발을 23행에 맞춰 16x24로 자른다
  (게임이 몸 위치를 움직이므로 점프 템플릿의 상하 이동은 버리고 자세만 씀).

## 손질 (손으로 한 일)

툴 초안(`frames.draft.mjs`)에서 그대로 못 쓴 부분과 고친 내용:

1. **머리 그리드는 처음부터 손으로 그림**(툴은 그리드를 그대로 찍기만 함). 외곽 `o`와 머리 `h`가 거의 같은 색이라
   턱 뒤 외곽선이 머리카락처럼(단발처럼) 보여서, 턱·목 뒤 테두리는 피부 그늘 `S`로 바꿨다(셀렉티브 아웃라인).
   안경 다리 사이 브리지를 렌즈 윗줄에 둬서 두 렌즈가 한 줄 띠로 붙어 보이지 않게 했다.
   → 이 안경은 이후 「안경 수정」에서 `round44`로 교체했다(레시피 원본은 그대로, 교체는 `hand-refine.mjs`에서).
2. **idle**: 템플릿의 숨쉬기가 머리와 몸통 사이에 1행 틈을 만들었다(`breath: 0`이어도 동일) → 손으로
   idle0 = 기본, idle1 = 머리만 1px 아래(목이 깃에 묻힘)로 바꿨다.
3. **walk**: 툴 다리 자세(contact → down → passing ×2)를 참고했지만, 본 굵기 2의 둥근 캡이 발 밑에 외곽 픽셀을 흘리고
   신발 안에 `o`가 섞여서 다리 5행(19..23)을 프레임마다 다시 찍었다. bob은 down 프레임만 1px. 팔은 다리와 반대로
   흔들리게(가까운 팔 뒤/앞, 먼 팔은 몸통 뒤에서 손·소매만) 다시 찍었다.
4. **jumpUp / fall / land**: 템플릿 결과가 서 있는 자세와 거의 같아 손으로 새로 잡았다.
   jumpUp = 앞 무릎 접어 올림 + 팔 앞위로, fall = 다리 쭉 + 팔 살짝 벌려 올림, land = 머리 2px·몸통 2px 내리고 무릎 벌림.
5. 모든 프레임 23행에 신발 `f`. `#000` 없음, `o`보다 어두운 외곽 없음.

요약하면 **툴이 한 몫**: 파트 분해·리그 구조, walk 6프레임의 다리 자세 타이밍과 팔 흔들기 방향, 본 음영 초안, 양자화 파이프라인.
**손이 한 몫**: 머리·몸통 그림 전체, 모든 프레임의 다리·팔 픽셀, idle·jump·fall·land 자세.

## 안경 수정 (사용자 피드백: 「안경을 표현하느라 눈 한쪽이 깨진 것 같은 느낌」)

레시피 머리 그리드의 안경은 먼 렌즈(캔버스 11~14열)가 `g`·`o`가 대각선으로 흩어진 지그재그라 고리로도 눈으로도
안 읽혔고, 가까운 렌즈도 8행 6·7열 `gg`가 테와 붙어 모양이 불규칙했다. `player.poses.json`(툴 입력)은 그대로 두고
`hand-refine.mjs`가 머리 그리드의 눈 줄만 통째로 바꿔 끼운다(`GLASSES` · `headWith()`). 머리는 모든 프레임에 같은
그리드로 찍히므로 idle1·walk1·walk4(+1행)·land(+2행)까지 11프레임 전부 같은 수정이 같은 높이 차로 들어간다.
머리카락·얼굴 외곽·입·몸통·팔다리·팔레트는 그대로다.

| 이름 | 모양 | 판단 |
|---|---|---|
| **`round44`** (채택, `GLASSES_VARIANT`) | 두 렌즈 모두 4x4 동그란 테(모서리 비움), 7~10행. 테 안 2x2 = 피부 + 눈동자 1px(윗줄 오른쪽 = 우향 시선). 브리지 1px는 윗줄 10열(양쪽 테 어깨와 대각선으로 이어져 아치), 안경다리 1px는 5열(귀 쪽) | 프로필의 큰 동그란 안경과 가장 가깝다. 테 안에 피부가 보여 3배에서도 「안경 + 눈」으로 읽히고, 1배에서도 두 눈이 띠 하나로 붙지 않는다. 6행(이마)을 비워 테가 앞머리에 붙지 않음 |
| `round43` | round44와 같은 틀, 먼 렌즈만 3x4(11~13열)로 1px 좁힘 + 얼굴 가장자리 피부 1px | 3/4 측면 느낌은 낫지만 먼 테 안쪽이 1px라 눈동자 줄이 `gog` 막대로 붙어 먼 눈이 덜 읽힌다 |
| `ring3` | 3x3 고리 두 개, 눈동자 정중앙, 7~9행 | 테 안에 피부가 없어 눈동자(`o`)와 테(`g`)가 한 덩어리 → 선글라스처럼 보인다. 비교용 |

- 다른 안으로 바꾸기: `hand-refine.mjs`의 `GLASSES_VARIANT`를 바꾸고 `node hand-refine.mjs > frames.mjs`.
  미리보기 비교도 갱신하려면 `node hand-refine.mjs --variants > glasses-variants.mjs`(원래 레시피 안경 `recipe` 포함).
- 미리보기: `tools/art-src/preview/?tab=player` 맨 아래 「안경 변형」 — 이름별 ×8(우/좌) · ×3(idle0·walk1·land·좌향) · 1x/×2 장면.
- 시선: 눈동자를 테 안 윗줄에 둬 아래를 보는 느낌을 피했다. 먼 눈동자(13열)는 먼 테 오른쪽 벽·얼굴 외곽과 붙지만
  3/4 측면의 가장자리 눈처럼 읽혀서 그대로 뒀다.
- 렌즈를 7~10행으로 한 줄 내려서 테 아랫변(10행)과 입(11행) 사이 여백이 없다. 확대하면 얼굴이 꽉 차 보인다(프로필도 안경이 큰 편).

## 검증

```sh
node --input-type=module -e "import {validateSprite} from './js/art/check.js'; import {PAL_PLAYER, PLAYER_FRAMES} from './tools/art-src/player/pixelbolt/frames.mjs'; for (const [k,fs] of Object.entries(PLAYER_FRAMES)) fs.forEach((f,i)=>{const e=validateSprite(f,PAL_PLAYER,{w:16,h:24}); if(e.length) console.log(k,i,e); if(!f[23].includes('f')) console.log(k,i,'no shoe in row 23')}); console.log('ok')"
```
→ `ok` (오류 없음). 8배 확대·좌우 방향 렌더는 세션 임시 폴더에서 눈으로 확인했다(레포에 PNG 없음).
