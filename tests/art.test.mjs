// 팔레트·스프라이트 검증 단위테스트. 실행: node tests/art.test.mjs
import { validateSprite } from "../js/art/check.js";
import { B, SKY_KEYS, skyAt } from "../js/art/palette.js";
import { PAL_TILE, GROUND, PLAT, groundVariant } from "../js/art/tiles.js";
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

ok(validateSprite(["ab","ba"], {a:"#000",b:null}, {w:2,h:2}).length === 0, "valid sprite");
ok(validateSprite(["ab","b"], {a:"#000",b:null}, {w:2,h:2}).some(e => /row 1/.test(e)), "row length error");
ok(validateSprite(["ax","ba"], {a:"#000",b:null}, {w:2,h:2}).some(e => /'x'/.test(e)), "unknown key error");
ok(validateSprite(["ab"], {a:"#000",b:null}, {w:2,h:2}).some(e => /height/.test(e)), "height error");
ok(SKY_KEYS.length === 3 && SKY_KEYS[1].t === 0.5, "3 keyframes");
ok(SKY_KEYS[1].sky.join() === "#9fb8d8,#b9c9dc,#d8d6d8,#efd8c8,#f6e2cc", "dawn sky = spec §5.1");
ok(skyAt(0).sunXr === 0.15 && skyAt(1).sunXr === 0.5 && skyAt(0).sunR === 30 && skyAt(1).sunR === 22, "sun path kept (spec §5.1)");
ok(skyAt(-1).sunY === skyAt(0).sunY && skyAt(2).sunY === skyAt(1).sunY, "clamped");
ok(skyAt(0).starA > 0.9 && skyAt(1).starA === 0, "stars only at evening");

// ── 지면·발판 타일(Task 3) ──
for (const k of ["top", "left", "right"]) {
  const e = validateSprite(GROUND[k] || [], PAL_TILE, { w: 16, h: 16 });
  ok(e.length === 0, `GROUND.${k} 16x16 valid: ${e.join("; ")}`);
}
ok(Array.isArray(GROUND.fill) && GROUND.fill.length === 2, "GROUND.fill has 2 variants");
for (const [i, f] of (GROUND.fill || []).entries()) {
  const e = validateSprite(f, PAL_TILE, { w: 16, h: 16 });
  ok(e.length === 0, `GROUND.fill[${i}] 16x16 valid: ${e.join("; ")}`);
}
for (const k of ["left", "mid", "right"]) {
  const e = validateSprite(PLAT[k] || [], PAL_TILE, { w: 8, h: 14 });
  ok(e.length === 0, `PLAT.${k} 8x14 valid: ${e.join("; ")}`);
}
const tileCols = new Set([B.grass, B.grassSh, B.dirt, B.dirtSh, B.dirtHi, B.plat, B.platHi, B.platSh, null]);
ok(Object.values(PAL_TILE).every((c) => tileCols.has(c)), "PAL_TILE uses only spec §5.1 tile colours");
let det = true, only01 = true;
const seen = new Set();
for (let tx = 0; tx < 10; tx++)
  for (let ty = 0; ty < 10; ty++) {
    const v = groundVariant(tx, ty);
    if (v !== groundVariant(tx, ty)) det = false;
    if (v !== 0 && v !== 1) only01 = false;
    seen.add(v);
  }
ok(det, "groundVariant deterministic");
ok(only01, "groundVariant returns only 0|1");
ok(seen.has(0) && seen.has(1), "groundVariant: both values appear in 100 cells");

// 그리기 순서(spec §5.2): 배경 → 코인 → 상자 → 플레이어 → 타일
{
  const calls = [];
  const rec = (n) => () => calls.push(n);
  const sprites = { drawBackground: rec("bg"), drawCoin: rec("coin"), drawChest: rec("chest"), drawPlayer: rec("player"), drawTile: rec("tile") };
  const ctx = { save() {}, restore() {}, translate() {} };
  const g = new Game({ ctx, level: LEVEL, sprites, audio: {}, input: {} });
  g.render();
  const first = (n) => calls.indexOf(n);
  const last = (n) => calls.lastIndexOf(n);
  ok(first("bg") === 0 && last("bg") < first("coin") && last("coin") < first("chest") && last("chest") < first("player") && last("player") < first("tile"),
    `render order bg→coin→chest→player→tile: ${[...new Set(calls)].join(",")}`);
  ok(calls.filter((n) => n === "tile").length === LEVEL.solids.length, "every solid drawn once");
}

console.log(`\n${fail === 0 ? "✅" : "❌"} art tests: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
