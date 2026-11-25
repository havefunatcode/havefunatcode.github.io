// 이펙트(pixelfx 축소 변형 3종 + fx 레이어 어댑터 + Game 연결) 테스트. 실행: node tests/fx.test.mjs
import { createFrame, clearFrame, createFx, composite } from "../js/vendor/pixelfx/core/index.js";
import * as coinBurst from "../js/vendor/pixelfx/fx/custom/coin-burst-s.js";
import * as landDust from "../js/vendor/pixelfx/fx/custom/land-dust-s.js";
import * as chestGlint from "../js/vendor/pixelfx/fx/custom/chest-glint-s.js";
import { B } from "../js/art/palette.js";
import { createFxLayer } from "../js/fx.js";
import { Game, OPEN_SEC, makePlayer } from "../js/engine.js";

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

// ── 변형 3종: 크기 상한 ──
const VARIANTS = { coin: coinBurst, land: landDust, chest: chestGlint };
const MAX = { coin: [48, 48], land: [40, 20], chest: [48, 40] };
for (const [k, mod] of Object.entries(VARIANTS)) {
  const [w, h] = mod.meta.size;
  ok(w <= MAX[k][0] && h <= MAX[k][1], `${k} meta.size ${w}x${h} <= ${MAX[k].join("x")}`);
  ok(Array.isArray(mod.meta.origin) && mod.meta.origin.length === 2, `${k} has meta.origin`);
  ok(!mod.drawBack && !mod.create({ ...mod.meta.options }).drawBack, `${k} draws the front layer only (no drawBack)`);
}
ok(coinBurst.meta.duration <= 0.7, `coin duration <= 0.7s (${coinBurst.meta.duration})`);
ok(Math.abs(chestGlint.meta.duration - OPEN_SEC) < 1e-9, `chest duration = OPEN_SEC (${chestGlint.meta.duration})`);

// ── 팔레트: B 전체 색(배열 원소 포함) ──
const BCOLS = Object.values(B).flat();
const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const BRGB = BCOLS.map(rgbOf);
const TOL = 24; // 가산 광(light) 허용 오차, RGB 채널별
const nearB = (r, g, b) => BRGB.some(([R, G, Bb]) => Math.abs(r - R) <= TOL && Math.abs(g - G) <= TOL && Math.abs(b - Bb) <= TOL);
for (const [k, mod] of Object.entries(VARIANTS))
  ok(mod.meta.options.palette.every((c) => BCOLS.includes(c.toLowerCase())), `${k} default palette is B colours: ${mod.meta.options.palette}`);

// t 시점까지 1/60초씩 진행해 그 프레임을 투명 배경 RGBA로 합성
function renderAt(mod, times, opts = {}) {
  const [w, h] = mod.meta.size, [ox, oy] = mod.meta.origin;
  const fx = createFx(mod, { x: ox, y: oy, ...opts });
  const frame = createFrame(w, h, 0, 0), out = new Uint8ClampedArray(w * h * 4);
  const shots = [];
  let t = 0;
  for (const T of times) {
    while (t < T - 1e-9) {
      fx.update(1 / 60);
      t += 1 / 60;
    }
    clearFrame(frame);
    fx.draw(frame, "front");
    composite(frame, out, null);
    shots.push({ t: T, data: out.slice(), w, h });
  }
  return shots;
}
// "불투명 픽셀" = alpha >= 64(눈에 보이게 칠해진 픽셀). 착지 먼지는 전부 반투명이라 alpha 255만 세면 검사할 게 없다.
// 빛 버퍼 가장자리(alpha 1~9, 정수 양자화로 색상이 틀어짐)는 사실상 안 보이므로 alpha 가중 비율로 따로 본다.
const SOLID = 64;
function stats(data) {
  let drawn = 0, solid = 0, solidIn = 0, aSum = 0, aIn = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;
    drawn++;
    const n = nearB(data[i], data[i + 1], data[i + 2]);
    aSum += a;
    if (n) aIn += a;
    if (a >= SOLID) {
      solid++;
      if (n) solidIn++;
    }
  }
  return { drawn, solid, solidIn, aSum, aIn };
}
for (const [k, mod] of Object.entries(VARIANTS)) {
  const tot = { drawn: 0, solid: 0, solidIn: 0, aSum: 0, aIn: 0 };
  for (const s of renderAt(mod, [0.1, 0.3, 0.5])) {
    const st = stats(s.data);
    if (s.t === 0.1) ok(st.solid > 0, `${k} draws something at t=0.1`);
    for (const key of Object.keys(tot)) tot[key] += st[key];
  }
  const ratio = tot.solid ? tot.solidIn / tot.solid : 0;
  ok(ratio >= 0.95, `${k} opaque (alpha>=${SOLID}) pixels near B palette >= 95% (${(ratio * 100).toFixed(1)}% of ${tot.solid})`);
  const wr = tot.aSum ? tot.aIn / tot.aSum : 0;
  ok(wr >= 0.95, `${k} alpha-weighted pixels near B palette >= 95% (${(wr * 100).toFixed(1)}% of ${tot.drawn} drawn)`);
}
// 착지 먼지 세기 ∝ impactVy
{
  const weak = stats(renderAt(landDust, [0.2], { impactVy: 250 })[0].data).drawn;
  const strong = stats(renderAt(landDust, [0.2], { impactVy: 820 })[0].data).drawn;
  ok(strong > weak, `land dust stronger impact draws more (${weak} < ${strong})`);
}
// 일회성: 지속시간이 끝나면 비어 있다
for (const [k, mod] of Object.entries(VARIANTS)) {
  const s = renderAt(mod, [mod.meta.duration + 0.02])[0];
  ok(stats(s.data).drawn === 0, `${k} ends empty after its duration`);
}

// ── fx 레이어 어댑터 ──
// 브라우저 표면 스텁(Node에는 ImageData/document 없음) — draw 안에서만 쓰인다
let surfaces = 0;
globalThis.ImageData = class {
  constructor(w, h) {
    this.width = w;
    this.height = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }
};
globalThis.document = {
  createElement() {
    surfaces++;
    return { width: 0, height: 0, getContext: () => ({ putImageData() {} }) };
  },
};
function ctxStub(viewW) {
  const calls = [];
  return { calls, canvas: { width: viewW, height: 270 }, drawImage: (img, x, y) => calls.push([x, y, img.width, img.height]) };
}

{
  const L = createFxLayer({ reduced: true });
  L.spawn("coin", 0, 0);
  L.spawn("land", 0, 0, { impactVy: 600 });
  L.spawn("chest", 0, 0);
  ok(L.active() === 0, "reduced: spawn is a no-op (active() === 0)");
}
{
  const L = createFxLayer({ reduced: false });
  ok(L.active() === 0, "new layer has 0 active");
  const c = ctxStub(480);
  L.draw(c, { x: 0 });
  ok(c.calls.length === 0 && surfaces === 0, "0 active: draw composites nothing (no drawImage, no surface)");
  L.spawn("coin", 100, 100);
  L.spawn("land", 120, 200, { impactVy: 500 });
  L.spawn("chest", 300, 180);
  ok(L.active() === 3, `3 spawns -> active() === 3 (${L.active()})`);
  L.spawn("nope", 0, 0);
  ok(L.active() === 3, "unknown kind is ignored");
  for (let i = 0; i < 30; i++) L.update(1 / 30);
  ok(L.active() === 0, `all one-shots done after 1s (${L.active()})`);
}
// Review Focus 5: fx frames independent of viewW — 월드 좌표에 붙어 있고 화면 폭과 무관
{
  const L = createFxLayer({ reduced: false });
  L.spawn("coin", 500, 100);
  L.spawn("land", 520, 200, { impactVy: 700 });
  L.update(0.1);
  const before = L.active();
  const a = ctxStub(270), b = ctxStub(1100);
  let threw = null;
  try {
    L.draw(a, { x: 400 });
    L.draw(b, { x: 400 });
  } catch (e) {
    threw = e;
  }
  ok(!threw, `fx frames independent of viewW: draw at 270 and 1100 does not throw (${threw && threw.message})`);
  ok(L.active() === before, "fx frames independent of viewW: active() unchanged by draw");
  ok(a.calls.length === 2 && JSON.stringify(a.calls) === JSON.stringify(b.calls), `fx frames independent of viewW: same blits at 270 and 1100 ${JSON.stringify(a.calls)} vs ${JSON.stringify(b.calls)}`);
  const cw = coinBurst.meta.size, co = coinBurst.meta.origin;
  ok(a.calls[0][0] === 500 - co[0] - 400 && a.calls[0][1] === 100 - co[1] && a.calls[0][2] === cw[0] && a.calls[0][3] === cw[1], `coin frame is meta.size, blitted at world - origin - cam (${a.calls[0]})`);
  const c = ctxStub(1100);
  L.draw(c, { x: 450 });
  ok(c.calls[0][0] === a.calls[0][0] - 50, "camera moves 50px -> effect moves -50px on screen (anchored to the world)");
  const n = surfaces;
  L.draw(c, { x: 450 });
  ok(surfaces === n, "surfaces are reused across frames");
}

// ── Game 연결 ──
const level = {
  worldWidth: 1000,
  deathY: 300,
  start: { x: 110, y: 180 },
  solids: [{ x: 0, y: 200, w: 1000, h: 40 }],
  coins: [],
  chest: { x: 600, y: 164, w: 44, h: 36 },
};
const noop = () => {};
function spyFx() {
  const log = [];
  return { log, spawn: (k, x, y, o) => log.push(["spawn", k, x, y, o]), update: (dt) => log.push(["update", dt]), draw: () => log.push(["draw"]), active: () => 0 };
}
function make(opts = {}) {
  const input = { left: false, right: false, jump: false };
  const g = new Game({ ctx: {}, level, sprites: {}, audio: { jump: noop, fall: noop, coin: noop, treasure: noop }, input, ...opts });
  g.state = "play";
  g.player = makePlayer(level);
  return { g, input };
}
const spawns = (fx) => fx.log.filter((e) => e[0] === "spawn");

ok(typeof make().g.fx?.spawn === "function", "Game has a default fx layer");
// 코인 획득
{
  const fx = spyFx();
  const { g } = make({ fx });
  level.coins = [{ x: 112, y: 170, project: 0, got: false }];
  g.player.x = 110;
  g.player.y = 160;
  g.update(1 / 60);
  const s = spawns(fx);
  ok(s.length === 1 && s[0][1] === "coin" && s[0][2] === 116 && s[0][3] === 174, `coin collect -> spawn('coin', c.x+4, c.y+4) ${JSON.stringify(s)}`);
  level.coins = [];
}
// 착지: impactVy >= 200 이면 먼지, 미만이면 없음
{
  const fx = spyFx();
  const { g } = make({ fx });
  g.player.y = 200 - 20 - 4;
  g.player.vy = 600;
  g.player.grounded = false;
  g.update(1 / 60);
  const s = spawns(fx);
  const p = g.player;
  ok(s.length === 1 && s[0][1] === "land" && s[0][2] === p.x + p.w / 2 && s[0][3] === p.y + p.h && s[0][4].impactVy >= 600, `hard touchdown -> spawn('land', feet, {impactVy}) ${JSON.stringify(s)}`);
}
{
  const fx = spyFx();
  const { g } = make({ fx });
  g.player.y = 200 - 20 - 0.5;
  g.player.vy = 50;
  g.player.grounded = false;
  g.update(1 / 60);
  ok(g.player.grounded && spawns(fx).length === 0, "soft touchdown (impactVy < 200) -> no land fx");
}
// 상자 열림 진입 → chest fx, opening 동안 update 계속
{
  const fx = spyFx();
  const { g, input } = make({ fx });
  g.player.x = 610;
  g.player.y = 180;
  g.player.grounded = true;
  input.jump = true;
  g.update(1 / 60);
  const s = spawns(fx);
  ok(g.state === "opening" && s.length === 1 && s[0][1] === "chest" && s[0][2] === 622 && s[0][3] === 172, `opening entry -> spawn('chest', chest.x+22, chest.y+8) ${JSON.stringify(s)}`);
  const n = fx.log.filter((e) => e[0] === "update").length;
  g.update(1 / 60);
  ok(fx.log.filter((e) => e[0] === "update").length === n + 1, "fx.update runs during opening");
}
{
  const fx = spyFx();
  const { g, input } = make({ fx, reduced: true });
  g.player.x = 610;
  g.player.y = 180;
  g.player.grounded = true;
  input.jump = true;
  g.update(1 / 60);
  ok(spawns(fx).filter((e) => e[1] === "chest").length === 0, "reduced: no opening, no chest fx");
}
{
  const { g } = make({ reduced: true });
  level.coins = [{ x: 112, y: 170, project: 0, got: false }];
  g.player.x = 110;
  g.player.y = 160;
  g.update(1 / 60);
  ok(g.fx.active() === 0, "reduced Game: default fx layer stays empty");
  level.coins = [];
}
// 그리기 순서: 타일 다음 맨 앞에 fx.draw
{
  const calls = [];
  const rec = (n) => () => calls.push(n);
  const sprites = { drawBackground: rec("bg"), drawCoin: rec("coin"), drawChest: rec("chest"), drawPlayer: rec("player"), drawTile: rec("tile") };
  const fx = { spawn: noop, update: noop, active: () => 0, draw: rec("fx") };
  const g = new Game({ ctx: { save() {}, restore() {}, translate() {} }, level, sprites, audio: {}, input: {}, fx });
  g.render();
  ok(calls.filter((n) => n === "fx").length === 1 && calls.lastIndexOf("tile") < calls.indexOf("fx"), `render draws fx once, after the tiles: ${calls.join(",")}`);
}

console.log(`\n${fail === 0 ? "✅" : "❌"} fx tests: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
