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

console.log(`\n${fail === 0 ? "✅" : "❌"} anim tests: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
