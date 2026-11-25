// The pop (a white flash, a ring snapping out, star sparks with short trails) follows Sprite Fusion's
// open-source pickup (https://www.spritefusion.com/pixel-art-vfx/pickup), MIT License, Copyright (c) 2026 Hugo Duprez.
//
// Small variant of pixelfx fx/pickups/collect-burst.js (https://github.com/patch-gg/pixelfx @ 5294518,
// MIT License, Copyright (c) 2026 Patch), for an 8x8 coin next to a 16x24 player (havefunatcode.github.io).
// changes:
// - radii and speeds about 1/2: rings 3+23 / 2+16 px -> 2+10 / 1+7 px, twinkles 145-225 -> 66-104 px/s,
//   lights 36 / 14 px -> 16 / 7 px, glows about 1/2
// - 1.35 s -> 0.7 s: flash, cross, rings, twinkle and mote lives about 1/2; 14 -> 9 twinkles, 7 -> 4 motes
// - centred on the coin (origin = coin centre, CY 30 -> 0), no floor bounce (the coin floats)
// - palette: the B gold ramp (B.coin3 in js/art/palette.js, dark -> bright); every hard-coded WHITE -> the
//   ramp's brightest step (B.coin3[0])
// - twinkles drawn with pickups/_lib twinkle(core = brightest) + p.glow, not glint() (glint's heart is WHITE)
// - glow strength x0.4 (LIGHT below; `light` is a reserved caller option), so additive light stays near the palette
// - front layer only (no drawBack; the original had none either)
import { Lights, Rng, ease, TAU, hex } from "../../core/index.js";
import { twinkle } from "../pickups/_lib.js";

export const meta = {
  name: "Coin burst (small)",
  desc: "A small coin pickup pop: a gold flash and cross, a thin ring snapping out ahead of a softer one, a few twinkles thrown out on curving paths that brake and wink out.",
  tags: ["pickup", "collect", "coin", "burst", "sparkle", "small", "one-shot"],
  size: [44, 44],
  origin: [22, 22],
  duration: 0.7,
  loop: false,
  fps: 30,
  bg: "ground",
  options: { palette: ["#c8963a", "#f0c860", "#fff2c0"], seed: 3 },
};

const LIGHT = 0.4; // every glow k is scaled by this

export function create(o) {
  const [E, M, H] = o.palette.map(hex); // rim, body, highlight (dark -> bright)
  const R = new Rng(o.seed), lights = new Lights();
  lights.add(0, 0, 16, M, 0.5 * LIGHT, 0.16);
  lights.add(0, 0, 7, H, 0.4 * LIGHT, 0.04);
  const stars = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * TAU + R.range(-0.2, 0.2), sp = R.range(66, 104) * (i % 3 === 0 ? 1.1 : 0.88);
    return { x: 0, y: 0, a, sp, turn: (i % 2 ? 1 : -1) * R.range(2.5, 5), life: R.range(0.38, 0.56), age: 0, size: i % 3 === 0 ? 2.2 : R.range(1.2, 1.8), tr: [], c: i % 3 === 0 ? H : M, ph: R.range(0, TAU) };
  });
  const motes = Array.from({ length: 4 }, () => ({ x: R.range(-4, 4), y: R.range(-2, 3), vy: -R.range(8, 16), life: R.range(0.25, 0.42), d: R.range(0.03, 0.12), w: R.range(0, TAU) }));
  let t = 0;
  return {
    update(dt) {
      t += dt;
      for (const s of stars) {
        if (s.age > s.life) continue;
        s.age += dt;
        s.tr.unshift([s.x, s.y]);
        if (s.tr.length > 3) s.tr.pop();
        s.a += s.turn * dt * Math.max(0, 1 - s.age * 3);
        s.sp -= s.sp * 4.3 * dt;
        s.x += Math.cos(s.a) * s.sp * dt;
        s.y += Math.sin(s.a) * s.sp * dt + 6 * s.age * dt;
      }
      lights.update(dt);
    },
    draw(p) {
      // the flash: a bright disc and a cross of light, gone in a couple of frames
      if (t < 0.04) p.circle(0, 0, 2.5 * (1 - t / 0.04) + 1, H);
      if (t < 0.08) {
        const k = 1 - t / 0.08, L = 11 * ease.outCubic(Math.min(1, t / 0.015 + 0.4)) * k;
        for (const [dx, dy, l] of [[1, 0, 1], [-1, 0, 1], [0, 1, 0.6], [0, -1, 0.6]])
          p.line(0, 0, dx * L * l, dy * L * l, (u) => (u < 0.45 ? H : M), (u) => (u < 0.5 ? 1 : (1 - u) * 2) * (0.5 + k));
        p.glow(0, 0, 9 * k + 2, M, 0.35 * k * LIGHT);
      }
      // a thin ring snapping out fast, a softer ring following
      const u1 = t / 0.16;
      if (u1 < 1) {
        const r = 2 + 10 * ease.outExpo(u1);
        p.ring(0, 0, r, 1, u1 < 0.3 ? H : M, 1.3 - u1 * 1.2);
        p.glowRing(0, 0, r, 2, M, 0.2 * (1 - u1) * LIGHT);
      }
      const u2 = (t - 0.02) / 0.25;
      if (u2 > 0 && u2 < 1) {
        const r = 1 + 7 * ease.outCubic(u2);
        p.ring(0, 0, r, Math.max(1, 1.6 * (1 - u2)), M, 1 - u2);
      }
      // the twinkles, with short trails, flickering as they hang and wink out
      for (const s of stars) {
        if (s.age > s.life) continue;
        const k = 1 - s.age / s.life, tw = 0.65 + 0.35 * Math.sin(s.age * 40 + s.ph);
        s.tr.forEach(([x, y], i) => i > 0 && p.dot(x, y, i < 2 ? M : E, (1 - i / 3) * k * 1.4));
        if (k < 0.3 && Math.sin(s.age * 60 + s.ph) < 0) continue;
        const n = Math.round(s.size * tw * Math.min(1, k * 2.5));
        twinkle(p, Math.floor(s.x), Math.floor(s.y), n + 1, s.c, H, H);
        p.glow(Math.floor(s.x) + 0.5, Math.floor(s.y) + 0.5, 2 + n * 1.5, M, 0.25 * k * LIGHT);
      }
      // motes drifting up after
      for (const m of motes) {
        const a = t - m.d;
        if (a < 0 || a > m.life) continue;
        const k = 1 - a / m.life, x = m.x + Math.sin(a * 10 + m.w) * 1, y = m.y + m.vy * a;
        p.dot(x, y, k > 0.5 ? H : M, k * 1.5);
        p.glow(x + 0.5, y + 0.5, 2, M, 0.2 * k * LIGHT);
      }
      lights.draw(p);
    },
  };
}
