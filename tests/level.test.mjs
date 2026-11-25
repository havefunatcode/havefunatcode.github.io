// 레벨 정적 검사(발판 밑 여유·계단 높이·히트박스·시작 낙하 충격). 실행: node tests/level.test.mjs
import { LEVEL } from "../js/level.js";
import { makePlayer, stepPlayer } from "../js/engine.js";

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

const platforms = LEVEL.solids.filter((s) => s.kind === "platform");
ok(platforms.length > 0, "발판이 존재한다");

// 수평 겹침은 경계 포함(계단 이웃은 정확히 경계에서 맞닿는다: 528+56 = 596-12)
function overlapsBand(s, p) {
  return s.x <= p.x + p.w + 12 && s.x + s.w >= p.x - 12;
}

for (const p of platforms) {
  const below = LEVEL.solids.filter((s) => s !== p && overlapsBand(s, p));

  // 발판 밑 여유: 아래 솔리드(윗면 > p.y + p.h)와의 간격 ≥ 20 (히트박스 높이)
  for (const s of below) {
    if (s.y > p.y + p.h) {
      const gap = s.y - (p.y + p.h);
      ok(gap >= 20, `발판(${p.x},${p.y}) 밑 여유 ${gap} ≥ 20 (솔리드 ${s.x},${s.y})`);
    }
  }

  // 계단 높이: 바로 아래 솔리드(윗면 > p.y 중 가장 높은 것)와의 차 ≤ 44
  const under = below.filter((s) => s.y > p.y).sort((a, b) => a.y - b.y)[0];
  ok(!!under, `발판(${p.x},${p.y}) 아래 솔리드 존재`);
  if (under) {
    const h = under.y - p.y;
    ok(h <= 44, `발판(${p.x},${p.y}) 계단 높이 ${h} ≤ 44`);
  }
}

// 히트박스
ok(makePlayer(LEVEL).h === 20, "makePlayer(LEVEL).h === 20");

// 시작 낙하의 첫 touchdown 충격 < 200
{
  const p = makePlayer(LEVEL);
  let impact = null;
  for (let i = 0; i < 240 && impact === null; i++) {
    const ev = stepPlayer(p, { moveX: 0, jump: false }, LEVEL, 1 / 60);
    if (ev.touchdown) impact = ev.impactVy;
  }
  ok(impact !== null, "시작 낙하 중 touchdown 발생");
  ok(impact !== null && impact < 200, `시작 낙하 impactVy ${impact} < 200`);
}

console.log(`\n${fail === 0 ? "✅" : "❌"} level tests: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
