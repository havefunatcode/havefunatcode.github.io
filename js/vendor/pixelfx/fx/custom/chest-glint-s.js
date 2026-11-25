// Built from pixelfx fx/pickups/_lib.js twinkle() and the recipe of its glint() and of core sparkle()
// (core/sim.js; sim.js is adapted from Sprite Fusion's open-source pixel art VFX,
// https://www.spritefusion.com/pixel-art-vfx, MIT License, Copyright (c) 2026 Hugo Duprez).
// pixelfx: https://github.com/patch-gg/pixelfx @ 5294518, MIT License, Copyright (c) 2026 Patch.
//
// A new small effect for havefunatcode.github.io: the glints over a treasure chest's gold as it opens (0.6 s),
// drawn over a 32x28 chest sprite. Origin = the top centre of the chest sprite; the gold sits at y 9..13.
// changes (from the helpers it is built on):
// - glint() and sparkle() draw a hard-coded WHITE heart, so they are not called; their recipe (cross arms,
//   dimmer tips, diagonals from arm 3, a heart pixel, its own glow) is redrawn here with the heart in the
//   palette's brightest step, and twinkle() is called with core = that step
// - palette: the B gold ramp (B.coin3 in js/art/palette.js, dark -> bright); WHITE -> B.coin3[0]
// - glow strength x0.35 (LIGHT below; `light` is a reserved caller option), so additive light stays near the palette
// - front layer only (no drawBack)
import { Rng, ease, smooth, clamp, hex } from "../../core/index.js";
import { twinkle } from "../pickups/_lib.js";

export const meta = {
  name: "Chest glint (small)",
  desc: "A chest opening on gold: a thin line of light along the gold, one star glint swelling and shrinking over it, smaller twinkles popping in turn above it, and a few motes rising.",
  tags: ["pickup", "chest", "treasure", "glint", "sparkle", "small", "one-shot"],
  size: [48, 40],
  origin: [24, 26],
  duration: 0.6,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: ["#c8963a", "#f0c860", "#fff2c0"], seed: 7 },
};

const LIGHT = 0.35; // every glow k is scaled by this
const GOLD_Y = 9; // the row of gold in the open chest, from the sprite's top

// sparkle()/glint() with the heart in a palette color: arms of n px in c, the outer 40 % in tip
function star(p, x, y, arm, c, tip, heart, k) {
  const n = Math.round(arm), X = Math.floor(x), Y = Math.floor(y);
  if (n < 1) return;
  for (let d = 1; d <= n; d++) {
    const cc = d > n * 0.6 ? tip : c;
    p.px(X + d, Y, cc), p.px(X - d, Y, cc), p.px(X, Y + d, cc), p.px(X, Y - d, cc);
  }
  if (n >= 3) p.px(X + 1, Y + 1, c), p.px(X - 1, Y - 1, c), p.px(X + 1, Y - 1, c), p.px(X - 1, Y + 1, c);
  p.px(X, Y, heart);
  p.glow(X + 0.5, Y + 0.5, 3 + n * 1.5, c, k);
}

export function create(o) {
  const [E, M, H] = o.palette.map(hex); // rim, body, highlight (dark -> bright)
  const R = new Rng(o.seed);
  // small twinkles popping one after another over the gold, left and right in turn
  const tw = Array.from({ length: 5 }, (_, i) => ({
    x: (i % 2 ? 1 : -1) * R.range(4, 12), y: GOLD_Y - R.range(3, 13), t0: 0.06 + i * 0.07 + R.range(0, 0.03), life: R.range(0.18, 0.24), s: i % 2 ? 3 : 2,
  }));
  const motes = Array.from({ length: 6 }, (_, i) => ({ x: R.range(-11, 11), vy: -R.range(22, 40), t0: 0.04 + R.range(0, 0.2), life: R.range(0.25, 0.32), w: R.range(0, 6), c: i % 2 ? H : M }));
  let t = 0;
  return {
    update(dt) {
      t += dt;
    },
    draw(p) {
      // light catching the gold: a thin line opening out from the middle, then dimming
      if (t < 0.3) {
        const L = 13 * ease.outCubic(clamp(t / 0.1)), k = 1 - smooth(0.12, 0.3, t);
        p.line(-L, GOLD_Y, L, GOLD_Y, (u) => (Math.abs(u - 0.5) < 0.25 ? H : M), k * 1.2);
        p.glow(0, GOLD_Y, 10 + L * 0.4, M, 0.3 * k * LIGHT);
      }
      // one star glint swelling and shrinking over the middle of the gold
      const u = (t - 0.05) / 0.4;
      if (u > 0 && u < 1) {
        const arm = 1 + 4 * Math.sin(Math.PI * u);
        star(p, 0, GOLD_Y - 6, arm, H, M, H, 0.3 * Math.sin(Math.PI * u) * LIGHT);
      }
      // twinkles in turn
      for (const q of tw) {
        const v = (t - q.t0) / q.life;
        if (v <= 0 || v >= 1) continue;
        const s = Math.round(q.s * Math.sin(Math.PI * v)) + 1;
        twinkle(p, q.x, q.y, s, M, H, H);
        p.glow(q.x + 0.5, q.y + 0.5, 2 + s, M, 0.18 * Math.sin(Math.PI * v) * LIGHT);
      }
      // motes rising off the gold, thinning out
      for (const m of motes) {
        const a = t - m.t0;
        if (a < 0 || a > m.life) continue;
        const k = 1 - a / m.life;
        p.dot(m.x + Math.sin(a * 12 + m.w) * 0.8, GOLD_Y - 1 + m.vy * a, k > 0.5 ? m.c : E, k * 1.6);
      }
    },
  };
}
