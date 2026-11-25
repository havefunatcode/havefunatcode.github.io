// 애니메이션 순수 함수·그리기 시계 단위테스트. 실행: node tests/anim.test.mjs
import { coinFrame, nextAnim, playerDrawRect, IDLE_STEP, WALK_FPS, LAND_MS, LAND_VY } from "../js/anim.js";
import { Game } from "../js/engine.js";
import { LEVEL } from "../js/level.js";

let pass = 0,
  fail = 0;
function ok(cond, msg) {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.error("  ✗ FAIL:", msg);
  }
}

// 코인 회전: 6프레임 8fps, reduced면 정면 0 고정(spec §5.4)
ok(coinFrame(0, false) === 0, "coinFrame(0) = 0");
ok(coinFrame(0.125, false) === 1, "coinFrame(0.125) = 1 (8fps)");
ok(coinFrame(0.75, false) === 0, "coinFrame(0.75) = 0 (6-frame loop)");
ok(coinFrame(0.3, true) === 0, "coinFrame reduced = 0");
{
  const seen = new Set();
  for (let i = 0; i < 48; i++) seen.add(coinFrame(i / 8 + 0.01, false));
  ok(seen.size === 6 && [...seen].every((f) => Number.isInteger(f) && f >= 0 && f <= 5), `coinFrame covers 0..5: ${[...seen]}`);
}

// 그리기 시계: 모든 state에서 흐르고(update의 early return 앞), dt는 1/30으로 자른다. 물리 시계 t는 play에서만.
{
  const g = new Game({ ctx: {}, level: LEVEL, sprites: {}, audio: {}, input: {} });
  ok(g.animT === 0, "animT starts at 0");
  g.update(0.016);
  ok(Math.abs(g.animT - 0.016) < 1e-12 && g.t === 0, `title: animT advances, t does not (${g.animT}, ${g.t})`);
  g.update(1);
  ok(Math.abs(g.animT - (0.016 + 1 / 30)) < 1e-12, "animT step clamped to 1/30");
  g.state = "modal";
  const before = g.animT;
  g.update(0.02);
  ok(Math.abs(g.animT - before - 0.02) < 1e-12, "modal: animT advances");
}

// 배경 시간 = 그리기 시계(M2 게이트): 타이틀에서도 drawBackground가 흐르는 animT를 받는다 → 구름 표류·별 반짝임
{
  const ts = [];
  const sprites = { drawBackground: (ctx, cam, t) => ts.push(t), drawCoin() {}, drawChest() {}, drawPlayer() {}, drawTile() {} };
  const g = new Game({ ctx: { save() {}, restore() {}, translate() {} }, level: LEVEL, sprites, audio: {}, input: {} });
  g.update(0.02); g.render();
  g.update(0.02); g.render();
  ok(g.state === "title" && ts[0] > 0 && ts[1] > ts[0] && ts[1] === g.animT, `title: background time advances with animT (${ts})`);
}

// 상자 반짝임: reduced-motion에서도 같은 1Hz 점멸(M2 게이트 사용자 결정). 최소 document 스텁으로 실제 Sprites.drawChest를 그린다.
{
  const fakeCtx = () => ({ fillRect() {}, drawImage() {}, getImageData() {}, putImageData() {}, createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) });
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: fakeCtx }) };
  const { Sprites } = await import("../js/sprites.js");
  const { CHEST_GLINT } = await import("../js/art/props.js");
  const glintAt = (reduced, animT, st = { opened: false, near: true }) => {
    Sprites.reduced = reduced;
    const rects = [];
    const ctx = { drawImage() {}, fillRect: (x, y, w, h) => rects.push([x, y, w, h]) };
    const c = { x: 100, y: 194, w: 44, h: 36 };
    Sprites.drawChest(ctx, c, st, animT);
    return rects.some(([x, y, w, h]) => x === c.x + 6 + CHEST_GLINT.x && y === c.y + 8 + CHEST_GLINT.y && w === 1 && h === 1);
  };
  for (const reduced of [false, true]) {
    const on = [0, 0.1, 0.2, 1.1].map((t) => glintAt(reduced, t)), off = [0.3, 0.6, 0.9, 1.5].map((t) => glintAt(reduced, t));
    ok(on.every(Boolean) && !off.some(Boolean), `glint blinks 1Hz (reduced=${reduced}): on ${on} off ${off}`);
  }
  ok(!glintAt(false, 0.1, { opened: false, near: false }) && !glintAt(false, 0.1, { opened: true, near: true }), "no glint when far or opened");
  delete globalThis.document;
}

// 플레이어 상태기계(spec §5.2)
{
  ok(IDLE_STEP === 0.5 && WALK_FPS === 10 && LAND_MS === 80 && LAND_VY === 200, "anim constants");
  const R = { reduced: false }, RM = { reduced: true };
  const gp = (vy = 0) => ({ grounded: true, vy }), air = (vy) => ({ grounded: false, vy });
  const none = { touchdown: false, impactVy: 0 }, still = { moveX: 0, jump: false }, right = { moveX: 1, jump: false };
  // idle: 0.5초마다 frame 0<->1
  let a = nextAnim(null, gp(), none, still, 0.016, R);
  ok(a.state === "idle" && a.frame === 0, "null prev grounded still -> idle 0");
  let frames = [];
  for (let i = 0; i < 70; i++) { a = nextAnim(a, gp(), none, still, 0.016, R); frames.push(a.frame); }
  ok(a.state === "idle" && frames.includes(1) && frames.includes(0), "idle toggles 0/1");
  a = { state: "idle", frame: 0, timer: 0 };
  a = nextAnim(a, gp(), none, still, 0.49, R); ok(a.frame === 0, "idle 0.49s -> frame 0");
  a = nextAnim(a, gp(), none, still, 0.02, R); ok(a.frame === 1, "idle 0.51s -> frame 1");
  a = nextAnim(a, gp(), none, still, 0.5, R); ok(a.frame === 0, "idle 1.01s -> frame 0");
  // reduced: idle 고정 0
  a = { state: "idle", frame: 0, timer: 0 };
  a = nextAnim(a, gp(), none, still, 0.6, RM); ok(a.state === "idle" && a.frame === 0, "reduced idle frame fixed 0");
  // walk: 10fps 6프레임
  a = nextAnim({ state: "idle", frame: 1, timer: 0.3 }, gp(), none, right, 0.016, R);
  ok(a.state === "walk" && a.frame === 0 && a.timer === 0, "idle->walk resets timer/frame");
  const seen = [];
  for (let i = 0; i < 40; i++) { a = nextAnim(a, gp(), none, right, 0.05, R); seen.push(a.frame); }
  ok(new Set(seen).size === 6 && seen.every((f) => f >= 0 && f <= 5), `walk covers 0..5: ${[...new Set(seen)]}`);
  a = { state: "walk", frame: 0, timer: 0 };
  a = nextAnim(a, gp(), none, right, 0.1, R); ok(a.frame === 1, "walk 0.1s -> frame 1");
  a = nextAnim(a, gp(), none, right, 0.5, R); ok(a.frame === 0, "walk 0.6s -> frame 0 (loop)");
  const b = nextAnim({ state: "walk", frame: 3, timer: 0.35 }, gp(), none, right, 0.1, RM);
  const c = nextAnim({ state: "walk", frame: 3, timer: 0.35 }, gp(), none, right, 0.1, R);
  ok(b.state === c.state && b.frame === c.frame && b.timer === c.timer, "walk identical under reduced");
  a = nextAnim({ state: "walk", frame: 3, timer: 0.35 }, gp(), none, still, 0.016, R);
  ok(a.state === "idle" && a.frame === 0 && a.timer === 0, "walk stops -> idle (reset)");
  // 공중
  a = nextAnim({ state: "idle", frame: 0, timer: 0 }, air(-100), none, still, 0.016, R); ok(a.state === "jumpUp" && a.frame === 0, "vy<0 -> jumpUp");
  a = nextAnim(a, air(0), none, still, 0.016, R); ok(a.state === "fall" && a.frame === 0, "vy=0 airborne -> fall");
  a = nextAnim(a, air(300), none, right, 0.016, R); ok(a.state === "fall", "vy>0 -> fall");
  // land
  const td = { touchdown: true, impactVy: 250 };
  a = nextAnim({ state: "fall", frame: 0, timer: 0.2 }, gp(), td, still, 0.016, R);
  ok(a.state === "land" && a.frame === 0 && a.timer === 0, "touchdown impactVy>=200 -> land");
  let steps = 0;
  while (a.state === "land" && steps < 20) { a = nextAnim(a, gp(), none, still, 0.016, R); steps++; }
  ok(a.state === "idle" && steps === 5, `land lasts 80ms then idle (steps=${steps})`);
  a = nextAnim({ state: "fall", frame: 0, timer: 0 }, gp(), { touchdown: true, impactVy: LAND_VY }, right, 0.016, R);
  ok(a.state === "land", "impactVy === 200 -> land");
  for (let i = 0; i < 5; i++) a = nextAnim(a, gp(), none, right, 0.016, R);
  ok(a.state === "walk", "land ends -> walk when moving");
  a = nextAnim({ state: "land", frame: 0, timer: 0.02 }, gp(), none, right, 0.016, RM);
  ok(a.state === "land", "land kept under reduced");
  a = nextAnim({ state: "fall", frame: 0, timer: 0 }, gp(), { touchdown: true, impactVy: 199 }, still, 0.016, R);
  ok(a.state === "idle", "impactVy<200 -> no land (idle)");
  a = nextAnim({ state: "fall", frame: 0, timer: 0 }, gp(), { touchdown: true, impactVy: 100 }, right, 0.016, R);
  ok(a.state === "walk", "soft touchdown + moving -> walk");
  a = nextAnim({ state: "land", frame: 0, timer: 0.02 }, air(-300), none, still, 0.016, R);
  ok(a.state === "jumpUp", "jump during land -> jumpUp");
}

// 그리기 앵커: facing과 무관하게 같은 16px 열 범위(spec §5.2)
{
  const p = { x: 100.3, y: 50, w: 12, h: 20 };
  const r = playerDrawRect(p);
  ok(r.x === 98 && r.y === 46 && r.flipX === 114, `playerDrawRect ${JSON.stringify(r)}`);
  const cols = (facing) => {
    const q = { ...p, facing };
    const d = playerDrawRect(q);
    return facing > 0 ? [d.x, d.x + 16] : [d.flipX - 16, d.flipX];
  };
  const R = cols(1), L = cols(-1);
  ok(R[0] === 98 && R[1] === 114 && L[0] === 98 && L[1] === 114, `draw rect identical for both facings: ${R} vs ${L}`);
}

console.log(`\n${fail === 0 ? "✅" : "❌"} anim tests: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
