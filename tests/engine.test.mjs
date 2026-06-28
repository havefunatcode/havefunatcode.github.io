// 순수 물리/충돌 단위테스트. 실행: node tests/engine.test.mjs
import { intersect, stepPlayer, makePlayer, PHYS } from "../js/engine.js";

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

// 간단한 평지 레벨
const flat = {
  worldWidth: 1000,
  deathY: 300,
  start: { x: 50, y: 100 },
  solids: [{ x: 0, y: 200, w: 1000, h: 40 }],
  coins: [],
  chest: { x: 900, y: 168, w: 40, h: 32 },
};

// 1) AABB 교차
ok(intersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }), "겹치면 true");
ok(!intersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 10, h: 10 }), "떨어지면 false");

// 2) 중력으로 낙하 후 지면 착지
{
  const p = makePlayer(flat);
  p.y = 100;
  for (let i = 0; i < 120; i++) stepPlayer(p, { moveX: 0, jump: false }, flat, 1 / 60);
  ok(p.grounded, "지면 착지 → grounded");
  ok(Math.abs(p.y + p.h - 200) < 0.5, `발이 지면 윗면(200)에 정렬 (y=${p.y.toFixed(1)})`);
}

// 3) 지면에서 점프하면 위로 솟는다
{
  const p = makePlayer(flat);
  p.y = 200 - p.h;
  p.grounded = true;
  const ev = stepPlayer(p, { moveX: 0, jump: true }, flat, 1 / 60);
  ok(ev.jumped, "점프 이벤트 발생");
  ok(p.vy < 0, "점프 직후 상향 속도(vy<0)");
}

// 4) 공중에서는 점프 불가(코요테 만료 후)
{
  const p = makePlayer(flat);
  p.y = 50;
  p.grounded = false;
  p.coyote = 0;
  const ev = stepPlayer(p, { moveX: 0, jump: true }, flat, 1 / 60);
  ok(!ev.jumped, "공중 점프 불가");
}

// 5) 벽에 막히면 x가 멈춘다
{
  const wall = {
    ...flat,
    solids: [
      { x: 0, y: 200, w: 1000, h: 40 },
      { x: 120, y: 0, w: 20, h: 240 },
    ],
  };
  const p = makePlayer(wall);
  p.x = 100;
  p.y = 200 - p.h;
  p.grounded = true;
  for (let i = 0; i < 60; i++) stepPlayer(p, { moveX: 1, jump: false }, wall, 1 / 60);
  ok(p.x + p.w <= 120.01, `벽(120)에서 정지 (x+w=${(p.x + p.w).toFixed(1)})`);
}

// 6) 구덩이에 빠지면 직전 안전 위치로 리스폰
{
  const pit = {
    ...flat,
    solids: [{ x: 0, y: 200, w: 100, h: 40 }], // 100 이후는 구덩이
  };
  const p = makePlayer(pit);
  p.x = 90;
  p.y = 200 - p.h;
  p.grounded = true;
  stepPlayer(p, { moveX: 0, jump: false }, pit, 1 / 60); // 안전 위치 기록
  const safe = { ...p.lastSafe };
  p.x = 130; // 구덩이 위로 이동
  let fell = false;
  for (let i = 0; i < 200; i++) {
    const ev = stepPlayer(p, { moveX: 0, jump: false }, pit, 1 / 60);
    if (ev.fell) {
      fell = true;
      break;
    }
  }
  ok(fell, "구덩이 낙하 감지");
  ok(Math.abs(p.x - safe.x) < 0.5 && Math.abs(p.y - safe.y) < 0.5, "직전 안전 위치로 리스폰");
}

console.log(`\n${fail === 0 ? "✅" : "❌"} engine tests: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
