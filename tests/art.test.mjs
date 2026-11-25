// 팔레트·스프라이트 검증 단위테스트. 실행: node tests/art.test.mjs
import { validateSprite } from "../js/art/check.js";
import { B, SKY_KEYS, skyAt } from "../js/art/palette.js";
import { PAL_TILE, GROUND, PLAT, groundVariant } from "../js/art/tiles.js";
import { COIN_FRAMES, CHEST_FRAMES, CHEST_GLINT, CLOUDS, TREES, PAL_COIN, PAL_CHEST, PAL_CLOUD, PAL_TREE } from "../js/art/props.js";
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

// ── 소품: 코인·상자·구름·나무(Task 4) ──
const sizeOf = (px) => ({ w: (px && px[0] && px[0].length) || 0, h: (px && px.length) || 0 });
ok(Array.isArray(COIN_FRAMES) && COIN_FRAMES.length === 6, "COIN_FRAMES has 6 frames");
for (const [i, f] of (COIN_FRAMES || []).entries()) {
  const e = validateSprite(f, PAL_COIN, { w: 8, h: 8 });
  ok(e.length === 0, `COIN_FRAMES[${i}] 8x8 valid: ${e.join("; ")}`);
}
ok(Array.isArray(CHEST_FRAMES) && CHEST_FRAMES.length === 4, "CHEST_FRAMES has 4 frames (closed, open1, open2, openGlow)");
for (const [i, f] of (CHEST_FRAMES || []).entries()) {
  const e = validateSprite(f, PAL_CHEST, { w: 32, h: 28 });
  ok(e.length === 0, `CHEST_FRAMES[${i}] 32x28 valid: ${e.join("; ")}`);
}
ok(CHEST_GLINT && CHEST_GLINT.x >= 0 && CHEST_GLINT.x < 32 && CHEST_GLINT.y >= 0 && CHEST_GLINT.y < 28 &&
  CHEST_FRAMES[0][CHEST_GLINT.y][CHEST_GLINT.x] !== ".", "chest glint sits on an opaque pixel of the closed frame");
ok(Array.isArray(CLOUDS) && CLOUDS.length === 3, "CLOUDS has 3 kinds");
for (const [i, c] of (CLOUDS || []).entries()) {
  const sz = sizeOf(c);
  const e = validateSprite(c, PAL_CLOUD, sz);
  ok(e.length === 0 && sz.w >= 16 && sz.w <= 64 && sz.h >= 6 && sz.h <= 24, `CLOUDS[${i}] ${sz.w}x${sz.h} valid: ${e.join("; ")}`);
}
ok(Array.isArray(TREES) && TREES.length >= 2 && TREES.length <= 3, "TREES has 2~3 kinds");
for (const [i, t] of (TREES || []).entries()) {
  const sz = sizeOf(t);
  const e = validateSprite(t, PAL_TREE, sz);
  ok(e.length === 0 && sz.w >= 8 && sz.w <= 32 && sz.h >= 12 && sz.h <= 40, `TREES[${i}] ${sz.w}x${sz.h} valid: ${e.join("; ")}`);
}
const palIs = (pal, cols) => pal && Object.values(pal).every((c) => cols.includes(c));
ok(palIs(PAL_COIN, [...B.coin3, null]), "PAL_COIN uses only spec coin colours");
ok(palIs(PAL_CHEST, [...B.chest4, B.coin3[0], null]), "PAL_CHEST uses only spec chest colours (+ coin highlight for glow)");
ok(palIs(PAL_CLOUD, [B.cloud, B.cloudSh, null]), "PAL_CLOUD uses only spec cloud colours");
ok(palIs(PAL_TREE, [B.trunk, B.leaf, B.leafHi, B.leafSh, null]), "PAL_TREE uses only spec tree colours");
ok(PAL_TREE && ["t", "L", "h", "s"].every((k) => k in PAL_TREE), "PAL_TREE keys t/L/h/s (time-of-day recolour map)");

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
