# tools/art-src 색인 · 최종 확인 기록

## 색인 (런타임에 쓰이지 않는 저작 보조 자료)
- `mockups/` : 화풍 A/B/C 비교 목업 (`2026-11-25-visual-style-abc.html`)
- `tiles/` : 지면·발판 타일 생성 스크립트(`gen-tiles.mjs`)와 초안. 설명은 `tiles/README.md`
- `props/` : 코인·상자 등 소품 생성 스크립트(`gen-props.mjs`). 설명은 `props/README.md`
- `player/` : 플레이어 스프라이트 저작 기록(`pixelbolt/` 채택, `codixel/` 비교 시안). 설명은 `player/README.md`
- `fx/` : pixelfx 이펙트 변형 노트(`fx/README.md`)
- `preview/` : 단계별(M1~M5) 육안 승인용 미리보기 (`preview/index.html`, `python3 -m http.server 8000`)

## 최종 확인 (Task 12, 2026-11-25, 브랜치 feature/pixel-art-overhaul)
측정: headless Chrome(CDP), `http://localhost:8000/`. 스크린샷 경로 접두: scratchpad `t12/`(임시 폴더, 레포 밖).
"사용자 육안 승인 대상"은 M5 게이트에서 사람이 직접 판단한다.

### 예산 (수용 기준 10)
- [x] `find js -name '*.js' -exec cat {} + | wc -c` = **263,152 B** − 기준선 30,999 = **232,153 B** ≤ 250,000 (여유 17,847 B). 다이어트 불필요.
- (CSS·HTML·md는 미포함)

### 파일·테스트 (수용 기준 9)
- [x] `for f in tests/*.test.mjs; do node "$f" || exit 1; done` 전부 PASS
- [x] `git ls-files | grep -Ei '\.(png|gif|jpe?g|webp|mp3|wav|ogg)$'` → **0줄**
- [x] 빌드·package.json 없음, 정적 서빙으로 동작(아래 기준 1-6)

### 수용 기준 1 — 선행 설계(2026-06-28) §12의 1~6
- [x] 1-1 이동·점프·상자 도달: 실제 `stepPlayer`(js/engine.js)+`LEVEL`을 Node에서 1/60s로 돌리는 단순 봇(오른쪽 홀드 + 구덩이 앞 점프 5회)이 낙사 0회, 17.6 s에 상자(x=2360)와 겹침. 키보드 이동은 브라우저에서 Arrow 입력으로 확인(x 40→158, 0.9 s). 브라우저 실시간 봇(naive, 구덩이 타이밍 없음)은 x=798(첫 구덩이 이후)에서 막혀 도달 못함 → 브라우저 end-to-end 도달은 **미확인**(물리 시뮬로 대체).
- [x] 1-2 상자 + Space → 모달 + PDF: 상자 위치에서 Space → `opening` → 1.15 s 후 `modal`, `.pdf-object` 존재, 링크 `portfolio.pdf`(download / 새 탭). 스크린샷 `chest-modal.png` — **사용자 육안 승인 대상**
- [x] 1-3 스킵 버튼: play 중 `#skip` 클릭 → 즉시 `modal`, 다운로드 링크 `portfolio.pdf`. 스크린샷 `skip-modal.png` — **사용자 육안 승인 대상**
- [x] 1-4 모바일: 390x844 모바일+터치 에뮬레이션에서 `body.touch`, `#touch` 표시, ▶ 버튼 0.7 s 이동 +92 px, ↑ 버튼으로 상자 열기 → 모달, `.pdf-mobile-card` 가 `target=_blank`·`portfolio.pdf`로 표시되고 인라인 object는 숨김. 스크린샷 `mobile-modal.png`. (실기기 PDF 열림은 미확인)
- [x] 1-5 Gatsby 보관 브랜치: `git branch -r` → `origin/archive/gatsby-blog`(및 `archive/gatsby-deploy`) 존재. 로컬 읽기 전용 확인만 했고 원격 조회·fetch는 하지 않음. — **사용자 육안 승인 대상**
- [x] 1-6 정적 서빙: python http.server로 빌드 없이 구동, 콘솔 에러 0.

### 수용 기준 2~8
- [ ] 2 화풍 B 규칙·DOM 오버레이 대비 AA — **사용자 육안 승인 대상**. `play-w1100-x0.png`, `play-w1100-x2300.png`, `chest-modal.png`. 대비 수치 측정은 Task 11 기록 참조(이번 작업에서 재측정하지 않음).
- [ ] 3 플레이어 식별(좌·우) — **사용자 육안 승인 대상**. 확대 스크린샷은 `player/` 시안 참고(이번 작업의 캡처는 1배율이라 16x24는 작게 보임).
- [x] 4 상태별 애니메이션·방향 전환 위치 불변: Task 8·9 단위 테스트(`draw rect identical for both facings` 등)가 전체 스위트에서 PASS. 브라우저 시각 확인은 아님.
- [x] 5 이펙트: `opening` 중 상자 이펙트 스크린샷 `chest-opening.png`. reduced에서는 `fx.spawn`이 즉시 return(js/fx.js:28), 상자는 연출 없이 즉시 모달(아래 reduced 항목). 코인·착지 이펙트 시각 확인은 미수행.
- [x] 6 모달 규칙: 0.6초 연출 후 모달(`opening` 상태 유지 250 ms 시점 확인, ~1.15 s에 modal), 스킵은 즉시. 재입력·한 번만 열림은 Task 9 테스트(`held jump does not skip opening`, `skip during opening fires once`, `reopen after close is instant`)로 PASS.
- [x] 7 폭 270·480·1100 배경 이음새: 아래 표의 9장을 캡처했고 콘솔 에러 0. 이음새 육안 판정은 — **사용자 육안 승인 대상**.
- [ ] 8 시간대 전환(저녁→오전): x=40(저녁: 보라/주황 하늘·해 낮음·별), x=1200(중간), x=2300(오전: 하늘색·해 높음·별 없음)을 폭 3종으로 캡처. — **사용자 육안 승인 대상**

| 폭 | x=40 | x=1200 | x=2300 | viewW |
|---|---|---|---|---|
| 270x270 | play-w270-x0.png | play-w270-x1200.png | play-w270-x2300.png | 270 |
| 480x270 | play-w480-x0.png | play-w480-x1200.png | play-w480-x2300.png | 480 |
| 1100x270 | play-w1100-x0.png | play-w1100-x1200.png | play-w1100-x2300.png | 1100 |

`viewW = min(1100, 270*aspect)`(js/main.js `resize()`)라서 가로 폭을 정확히 만들려면 높이 270 창을 썼다. 세로(aspect<1)는 viewW 최소 360으로 고정되므로 270 폭의 세로 창(270x480)에서는 viewW=360(레터박스)이며 270은 만들어지지 않는다. 일반 1100x620 창은 viewW=479.

### 공통 항목
- [x] 콘솔 에러 0: 모든 실행(270·480·1100x270, 1100x620, reduced, mobile, 상자·스킵 흐름)에서 `errors: []`. (1100x270 첫 실행에서 python http.server의 ERR_CONNECTION_RESET가 pixelfx 파일 4개에서 일시적으로 났고, 같은 조건 재실행은 에러 0 — 서버 일시 오류로 판단, 재현되지 않음.)
- [x] reduced-motion(`--reduced`): `g.reduced === true`, 상자 Space → 즉시 `modal`(opening 생략), 모달 PDF 링크 정상, 에러 0. 구름·idle 정지의 시각 확인은 미수행(코드 경로는 Task 5·8 테스트 범위).
- [x] 프레임 타이밍: 1100x270, 플레이 중 3 s rAF 181프레임, 평균 **16.67 ms**(60.0 fps), 최대 16.8 ms. (headless라 vsync 상한이 걸렸을 수 있음 — 실제 기기 성능이 아니라 "16.7 ms 이내" 확인용.)

### 발견 사항
- 270x270에서 HUD("프로젝트 0/7")와 상단 버튼(음소거·이력서 바로 보기)이 겹친다(`play-w270-x1200.png`). 힌트 박스도 두 줄로 줄바꿈. 이번 작업에서 수정하지 않음(DOM CSS는 Task 11 범위) → 컨트롤러 판단 필요.
