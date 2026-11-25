// The rocks, grit and dust are adapted from Sprite Fusion's open-source explosion
// (https://www.spritefusion.com/pixel-art-vfx/explosion), MIT License, Copyright (c) 2026 Hugo Duprez.
//
// Small variant of pixelfx fx/impacts/heavy-landing.js (https://github.com/patch-gg/pixelfx @ 5294518,
// MIT License, Copyright (c) 2026 Patch), as landing dust under a 16x24 player (havefunatcode.github.io).
// changes:
// - dust only: the dent, cracks, pebbles (Bits), grit, the thud flash and glow line, the lit band on the fast
//   ring's edge and the act (poses, hit-stop) are removed
// - radii and speeds about 1/3: ring radii 6+58 / 6+42 -> 2+16 / 2+12 px, ring puffs 140-190 / 70-110 ->
//   47-63 / 23-37 px/s, foot cloud about 1/3, puff sizes about 1/2 (so they stay more than a pixel)
// - 1.6 s -> 0.9 s (only the dust's own ~1 s remains); 20 / 18 / 12 puffs -> up to 8 / 6 / 6
// - strength follows the impactVy option (px/s, the player's landing speed): s = impactVy / 820 (max fall),
//   clamped to 0.3..1, scales ring radius, alpha and puff count. The game skips it below 200 px/s.
// - front layer only: drawBack removed, the rings' far halves are drawn in front too
// - palette: two close B tones (B.cloudSh, B.cloud in js/art/palette.js) so translucent overlaps stay near
//   the palette; the stone/mix colors and WHITE -> the brightest step (B.cloud); dustRing lit 0.35 -> 0
import { Particles, P, Rng, clamp, ease, TAU, hex } from "../../core/index.js";
import { dustRing } from "../impacts/_lib.js";

export const meta = {
  name: "Landing dust (small)",
  desc: "A small landing puff: two soft dust rings roll out along the floor, one after the other, and a low cloud at the feet rises a little and thins. Stronger landings throw it wider.",
  tags: ["impact", "landing", "ground", "dust", "small", "one-shot"],
  size: [40, 18],
  origin: [20, 13],
  duration: 0.9,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: ["#e2d6d0", "#fbf3ea"], seed: 14, impactVy: 520 },
};

export function create(o) {
  const [DUST, LIT] = o.palette.map(hex);
  const s = clamp((o.impactVy ?? 520) / 820, 0.3, 1), R = new Rng(o.seed), floor = () => 0;
  const dust = new Particles({ rng: R, ground: floor }), PH = R.range(0, TAU);
  const n = (k) => Math.max(2, Math.round(k * (0.4 + 0.6 * s)));
  const rad = 0.55 + 0.45 * s;
  // puffs riding each ring out along the floor
  const ring = (cnt, v0, v1, size, delay) => {
    for (let i = 0; i < cnt; i++) {
      const g = (i / cnt) * TAU + R.range(-0.1, 0.1), v = R.range(v0, v1) * rad;
      dust.spawn(P.DUST, Math.cos(g) * 1.5, Math.sin(g) * 0.3 - 0.5, Math.cos(g) * v, Math.sin(g) * v * 0.16 - R.range(1, 3), R.range(0.35, 0.6), R.chance(0.45) ? LIT : DUST, R.range(size[0], size[1]), delay + R.range(0, 0.03));
    }
  };
  ring(n(8), 47, 63, [1.1, 1.7], 0.01);
  ring(n(6), 23, 37, [1.6, 2.4], 0.1);
  // and a low cloud at the feet that rises a little and hangs
  for (let i = 0, c = n(6); i < c; i++) {
    const sg = R.sign(), up = i < c / 2;
    dust.spawn(P.DUST, sg * R.range(1, 4), -R.range(0.5, 1.5), sg * R.range(4, 12) * (up ? 0.6 : 1), -(up ? R.range(8, 20) : R.range(2, 5)), R.range(0.4, 0.65), R.chance(0.5) ? LIT : DUST, R.range(1.4, 2.2), R.range(0.02, 0.08));
  }

  let t = 0;
  // the two dust rings themselves: soft bands on the floor, the second slower, lumpier and later
  const rings = (p) => {
    for (const [t0, dur, r1, w, k0] of [[0.01, 0.4, 16, 1.5, 0.7], [0.1, 0.7, 12, 2, 0.75]]) {
      const g = (t - t0) / dur;
      if (g <= 0 || g >= 1) continue;
      const r = 2 + r1 * rad * ease.outCubic(g);
      dustRing(p, 0, 0, r, w * (1 + g * 0.5), k0 * (0.6 + 0.4 * s) * Math.pow(1 - g, 1.2) * Math.min(1, g / 0.06), DUST, { sy: 0.25, ph: PH + t0 * 10, brk: g * 0.8, lit: 0 });
    }
  };
  return {
    update(dt) {
      t += dt;
      dust.update(dt);
    },
    draw(p) {
      rings(p);
      dust.draw(p);
    },
  };
}
