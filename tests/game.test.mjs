// Game 상자 열림(opening) 상태 테스트. 실행: node tests/game.test.mjs
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

const level = {
  worldWidth: 1000,
  deathY: 300,
  start: { x: 110, y: 180 },
  solids: [{ x: 0, y: 200, w: 1000, h: 40 }],
  coins: [],
  chest: { x: 100, y: 164, w: 44, h: 36 },
};
const noop = () => {};
function make(opts = {}) {
  const input = { left: false, right: false, jump: false };
  const c = { opening: 0, treasure: 0 };
  const g = new Game({
    ctx: {},
    level,
    sprites: {},
    audio: { jump: noop, fall: noop, coin: noop, treasure: noop },
    input,
    onOpening: () => c.opening++,
    onTreasure: () => c.treasure++,
    ...opts,
  });
  g.state = "play";
  g.player = makePlayer(level);
  g.player.grounded = true;
  return { g, input, c };
}
const run = (g, n, dt = 1 / 60) => { for (let i = 0; i < n; i++) g.update(dt); };

ok(OPEN_SEC === 0.6, "OPEN_SEC === 0.6");

// opens after 0.6s
{
  const { g, input, c } = make();
  input.jump = true;
  g.update(1 / 60);
  ok(c.opening === 1 && g.state === "opening" && g.chestOpened === true, "jump edge at chest -> onOpening once, state opening");
  ok(c.treasure === 0, "no onTreasure on entry");
  input.jump = false;
  run(g, 35);
  ok(c.treasure === 0, `35 steps -> 0 onTreasure (got ${c.treasure})`);
  run(g, 2);
  ok(c.treasure === 1, `by step 37 exactly 1 (got ${c.treasure})`);
  run(g, 60);
  ok(c.treasure === 1, "never fires again");
}
// re-press skips
{
  const { g, input, c } = make();
  input.jump = true; g.update(1 / 60);
  input.jump = false; run(g, 3);
  ok(c.treasure === 0, "released, no skip");
  input.jump = true; g.update(1 / 60);
  ok(c.treasure === 1, "re-press during opening fires onTreasure in that step");
  run(g, 60);
  ok(c.treasure === 1, "re-press fires once");
}
// held jump does not skip
{
  const { g, input, c } = make();
  input.jump = true; g.update(1 / 60);
  run(g, 35);
  ok(c.treasure === 0, "held jump: not skipped early");
  run(g, 5);
  ok(c.treasure === 1, `held jump: exactly 1 at 0.6s (got ${c.treasure})`);
}
// huge dt clamps
{
  const { g, input, c } = make();
  input.jump = true; g.update(1 / 60); input.jump = false;
  g.update(5);
  ok(c.treasure === 0, "update(5) during opening does not finish it");
  ok(g.openTimer <= 1 / 30 + 1e-9, "openTimer advanced by clamped dt");
}
// skip during opening fires once
{
  const { g, input, c } = make();
  input.jump = true; g.update(1 / 60); input.jump = false;
  run(g, 5);
  g.cancelOpening();
  run(g, 30);
  ok(c.treasure === 0, `cancelOpening then 30 steps -> 0 extra onTreasure (got ${c.treasure})`);
  input.jump = true; g.update(1 / 60);
  ok(c.treasure === 0, "jump edge after cancel does not fire from stale opening");
}
// reopen after close is instant
{
  const { g, input, c } = make();
  g.chestOpened = true;
  input.jump = true; g.update(1 / 60);
  ok(c.opening === 0 && c.treasure === 1 && g.state === "play", "reopen: onTreasure same step, no opening");
}
// reduced skips opening
{
  const { g, input, c } = make({ reduced: true });
  input.jump = true; g.update(1 / 60);
  ok(c.treasure === 1 && c.opening === 0 && g.state === "play", "reduced: immediate onTreasure, no onOpening");
}
// reset clears
{
  const { g, input } = make();
  input.jump = true; g.update(1 / 60);
  g.reset();
  ok(g.chestOpened === false && g.openTimer === 0, "reset clears chestOpened/openTimer");
}

console.log(`game.test: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
