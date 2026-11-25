// 애니메이션 순수 함수·그리기 시계 단위테스트. 실행: node tests/anim.test.mjs
import { coinFrame } from "../js/anim.js";
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

console.log(`\n${fail === 0 ? "✅" : "❌"} anim tests: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
