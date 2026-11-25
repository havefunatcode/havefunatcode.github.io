// 배경 능선 함수 단위테스트. 실행: node tests/bg.test.mjs
import { ridgeY, RIDGE_PERIOD, cloudOffset } from "../js/background.js";

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

ok(RIDGE_PERIOD > 1100, "period longer than max view width");
for (const L of ["mtn", "far", "near"]) for (const x of [0, 137, 999])
  ok(ridgeY(L, x) === ridgeY(L, x + RIDGE_PERIOD), `${L} periodic at ${x}`);
ok(ridgeY("mtn", 10) < ridgeY("far", 10) && ridgeY("far", 10) < ridgeY("near", 10), "layer order back→front higher→lower");
ok(Number.isInteger(ridgeY("near", 42.7)), "integer pixel rows");

// 구름 오프셋: 패럴랙스 0.2 + 표류 6px/s(시계 tt 기준 — 타이틀에서도 animT로 흐른다)
ok(cloudOffset(0, 0) === 0 && cloudOffset(100, 0) === 20, "cloud parallax 0.2");
ok(cloudOffset(0, 1) === 6 && cloudOffset(0, 2.5) === 15, "cloud drift 6px/s");

console.log(`\n${fail === 0 ? "✅" : "❌"} bg tests: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
