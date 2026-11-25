// 배경 레이어(화풍 B, spec §5.6). 뒤→앞: 하늘 밴드+디더 / 별 / 해 / 구름 / 먼 산 / 먼 언덕 / 가까운 언덕 / 나무 줄.
// 능선은 순수 함수(ridgeY)라 Node에서 테스트한다. document는 그리기 함수 안에서만 쓴다(import 시 DOM 무접촉).
// 픽셀 선명도: 그라디언트·안티앨리어스 원 없음, 모든 좌표 정수.
import { VIEW_H } from "./engine.js";
import { B, skyAt } from "./art/palette.js";
import { bake } from "./art/bake.js";

// 능선 반복 주기(px). 최대 화면 폭 1100보다 길어야 두 장 이어 그리기로 이음새가 없다.
export const RIDGE_PERIOD = 1280;
export const PARALLAX = { cloud: 0.2, mtn: 0.1, far: 0.25, near: 0.45, tree: 0.6 };
const CLOUD_DRIFT = 6; // px/s (reduced-motion이면 0)

// ── 능선(순수) ───────────────────────────────────────────────
const TAU = Math.PI * 2;
const P = RIDGE_PERIOD;
// 주기 P 안에 k번 반복하는 파형만 쓴다(k 정수) → ridgeY(x) === ridgeY(x + P).
const sinK = (x, k, ph) => Math.sin((TAU * k * x) / P + ph);
const triK = (x, k, ph) => {
  const u = ((k * x) / P + ph) % 1;
  return 1 - Math.abs(2 * u - 1); // 0..1, u=0.5에서 봉우리
};
const RIDGES = {
  // 먼 산: 뾰족한 삼각파 두 겹 + 바위 잔결(작은 삼각파)
  mtn: (x) => 152 - 30 * triK(x, 5, 0.1) - 16 * triK(x, 13, 0.35) - 3 * triK(x, 47, 0.2),
  // 먼 언덕 / 가까운 언덕: 둥근 사인 합
  far: (x) => 180 - 11 * sinK(x, 4, 1.2) - 6 * sinK(x, 9, 0.4) - 2 * sinK(x, 23, 2.1),
  near: (x) => 205 - 7 * sinK(x, 6, 0.3) - 4 * sinK(x, 13, 2.0) - 1.5 * sinK(x, 29, 4.0),
};
const tables = {};
function table(layer) {
  let t = tables[layer];
  if (!t) {
    const f = RIDGES[layer];
    t = new Int16Array(P);
    for (let x = 0; x < P; x++) t[x] = Math.round(f(x));
    tables[layer] = t;
  }
  return t;
}
const mod = (a, n) => ((a % n) + n) % n;

// layer의 x열 능선 y(정수 픽셀 행). 주기 RIDGE_PERIOD.
export function ridgeY(layer, x) {
  return table(layer)[mod(Math.floor(x), P)];
}

// ── 굽기(첫 draw 때 한 번) ────────────────────────────────────
const canvas = (w, h) => {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  return cv;
};

// 좌상단 광원. slope(x) > 0 = 오른쪽으로 내려가는 면 = 그늘 쪽(±w열 평균이라 잔결에 흔들리지 않음).
function slope(t, x, w) {
  return (t[mod(x + w, P)] - t[mod(x - w, P)]) / (2 * w);
}
// 그늘 판정 함수를 레이어별로 만든다. 반환: (x열, 능선 아래 깊이 d) → 그늘 여부.
const SHADE = {
  // 산: 봉우리에서 오른쪽 아래로 기우는 면 경계(깊이 d마다 0.5열씩 왼쪽 열을 본다) → 각진 바위 면.
  mtn: facets,
  // 언덕: 능선을 따라가는 밝은 띠. 빛 받는 면(왼쪽)은 두껍고 그늘 면(오른쪽)은 얇다.
  far: litBand,
  near: litBand,
};
const MIN_FACET = 6; // 이보다 좁은 면은 이웃 면에 흡수(1px 머리카락 줄 방지)
function facets(t) {
  const side = new Uint8Array(P);
  for (let x = 0; x < P; x++) side[x] = slope(t, x, 6) > 0 ? 1 : 0;
  // 짧은 구간 제거: 주기 경계를 넘는 구간도 있으니 시작점을 값이 바뀌는 열로 잡는다.
  let s0 = 0;
  while (s0 < P && side[s0] === side[mod(s0 - 1, P)]) s0++;
  if (s0 < P) {
    for (let i = 0; i < P; ) {
      const a = mod(s0 + i, P), v = side[a];
      let n = 1;
      while (n < P - i && side[mod(a + n, P)] === v) n++;
      if (n < MIN_FACET) for (let k = 0; k < n; k++) side[mod(a + k, P)] = side[mod(a - 1, P)];
      i += n;
    }
  }
  return (x, d) => side[mod(x - (d >> 1), P)] === 1;
}
function litBand(t) {
  // 경계 y = (능선 + 띠 두께)를 ±6열 이동평균 → 계단이 고른 매끈한 경계.
  const raw = new Float32Array(P);
  for (let x = 0; x < P; x++) raw[x] = t[x] + Math.min(28, Math.max(3, 12 - 30 * slope(t, x, 10)));
  const edge = new Int16Array(P);
  for (let x = 0; x < P; x++) {
    let sum = 0;
    for (let k = -6; k <= 6; k++) sum += raw[mod(x + k, P)];
    edge[x] = Math.max(t[x] + 2, Math.round(sum / 13));
  }
  return (x, d) => t[x] + d >= edge[x];
}

// 레이어 하나 = 실루엣(out) + 그늘 마스크(sh). 둘 다 불투명/투명 2값이라 source-in 재채색이 정확하다.
// ImageData로 한 번에 굽는다(픽셀별 fillRect보다 수십 배 빠름).
function bakeRidge(layer) {
  const t = table(layer), shade = SHADE[layer](t);
  let top = VIEW_H;
  for (let x = 0; x < P; x++) top = Math.min(top, t[x]);
  const h = VIEW_H - top;
  const out = canvas(P, h), sh = canvas(P, h);
  const oc = out.getContext("2d"), sc = sh.getContext("2d");
  const od = oc.createImageData(P, h), sd = sc.createImageData(P, h);
  for (let x = 0; x < P; x++) {
    const r = t[x] - top;
    for (let y = r; y < h; y++) {
      const i = (y * P + x) * 4 + 3;
      od.data[i] = 255;
      if (shade(x, y - r)) sd.data[i] = 255;
    }
  }
  oc.putImageData(od, 0, 0);
  sc.putImageData(sd, 0, 0);
  return { top, w: P, h, out, oc, sh, sc, key: "" };
}

// 하늘 경계 디더(아래 밴드 색을 위로 4행: 1/4 → 1/2 → 1/2 → 3/4).
const DITHER_W = 1104; // 4의 배수, 최대 화면 폭 이상
const DITHER_ROWS = [(x) => x % 4 === 0, (x) => x % 2 === 0, (x) => x % 2 === 1, (x) => x % 4 !== 2];
function bakeDither() {
  const out = canvas(DITHER_W, DITHER_ROWS.length);
  const oc = out.getContext("2d");
  oc.fillStyle = "#000";
  DITHER_ROWS.forEach((on, y) => {
    for (let x = 0; x < DITHER_W; x++) if (on(x)) oc.fillRect(x, y, 1, 1);
  });
  return { out, oc, w: DITHER_W, h: DITHER_ROWS.length, key: "" };
}

let L = null;
function layers() {
  if (!L) {
    L = {
      mtn: bakeRidge("mtn"),
      far: bakeRidge("far"),
      near: bakeRidge("near"),
      dither: [0, 1, 2, 3].map(bakeDither), // 밴드 경계 4개, 각자 색 캐시
    };
  }
  return L;
}

// 마스크 재채색: 색이 바뀐 프레임에만 source-in으로 다시 칠한다.
function paint(m, base, shade) {
  const key = shade ? base + shade : base;
  if (m.key === key) return m.out;
  m.oc.globalCompositeOperation = "source-in";
  m.oc.fillStyle = base;
  m.oc.fillRect(0, 0, m.w, m.h);
  m.oc.globalCompositeOperation = "source-over";
  if (shade) {
    m.sc.globalCompositeOperation = "source-in";
    m.sc.fillStyle = shade;
    m.sc.fillRect(0, 0, m.w, m.h);
    m.sc.globalCompositeOperation = "source-over";
    m.oc.drawImage(m.sh, 0, 0);
  }
  m.key = key;
  return m.out;
}

// ── 하늘 ─────────────────────────────────────────────────────
const BAND_H = 26; // 5단 밴드 높이; 마지막 밴드는 바닥까지
function drawSky(ctx, s, viewW) {
  const n = s.sky.length;
  for (let i = 0; i < n; i++) {
    const y = i * BAND_H;
    ctx.fillStyle = s.sky[i];
    ctx.fillRect(0, y, viewW, i === n - 1 ? VIEW_H - y : BAND_H);
  }
  const d = layers().dither;
  for (let i = 0; i < n - 1; i++) {
    const strip = paint(d[i], s.sky[i + 1]);
    const y = (i + 1) * BAND_H - d[i].h;
    for (let x = 0; x < viewW; x += DITHER_W) ctx.drawImage(strip, x, y);
  }
}

// ── 별(화면 고정, 저녁에만) ───────────────────────────────────
const STARS = (() => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const a = [];
  for (let i = 0; i < 44; i++) a.push({ x: (rnd() * 1100) | 0, y: 6 + ((rnd() * 84) | 0), big: rnd() < 0.2, ph: rnd() * TAU });
  return a;
})();
function drawStars(ctx, s, viewW, tt, reduced) {
  if (s.starA < 0.02) return;
  ctx.fillStyle = "#fffbe8";
  for (const st of STARS) {
    if (st.x >= viewW) continue;
    const tw = reduced ? 1 : 0.55 + 0.45 * Math.sin(tt * 3 + st.ph);
    ctx.globalAlpha = s.starA * tw * 0.9;
    const sz = st.big ? 2 : 1;
    ctx.fillRect(st.x, st.y, sz, sz);
  }
  ctx.globalAlpha = 1;
}

// ── 해(행 단위 픽셀 원판 + 테두리) ─────────────────────────────
const rgbOf = (c) => (c[0] === "#" ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c.match(/\d+/g).map(Number));
// 테두리 = 해 색 × (B.sunEdge / B.sun) 채널비 → 새벽엔 spec 표의 #f8d8a8과 같고, 저녁·오전은 같은 비율로 따라간다.
const EDGE_RATIO = rgbOf(B.sunEdge).map((v, i) => v / rgbOf(B.sun)[i]);
const sunEdgeOf = (sun) => {
  const c = rgbOf(sun).map((v, i) => Math.round(v * EDGE_RATIO[i]));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};
function disc(ctx, cx, cy, r) {
  for (let dy = -r; dy <= r; dy++) {
    const hw = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.6));
    ctx.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
  }
}
function drawSun(ctx, s, viewW) {
  const cx = Math.round(viewW * s.sunXr), cy = Math.round(s.sunY), r = Math.round(s.sunR);
  ctx.fillStyle = sunEdgeOf(s.sun);
  disc(ctx, cx, cy, r);
  ctx.fillStyle = s.sun;
  disc(ctx, cx, cy, r - 3);
}

// ── 구름(임시 픽셀 구름 — Task 4에서 스프라이트 3종으로 교체) ───────
function cloudPx(k) {
  const blobs = [[0, 6, 10], [9, 2, 12], [22, 5, 10], [31, 8, 7]].map(([x, y, r]) => [x * k, y * k, Math.round(r * k)]);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y, r] of blobs) {
    x0 = Math.min(x0, Math.round(x) - r); y0 = Math.min(y0, Math.round(y) - r);
    x1 = Math.max(x1, Math.round(x) + r); y1 = Math.max(y1, Math.round(y) + r);
  }
  const g = Array.from({ length: y1 - y0 + 1 }, () => Array(x1 - x0 + 1).fill("."));
  for (const [bx, by, r] of blobs) {
    for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
      if (xx * xx + yy * yy > r * r + r * 0.6) continue;
      g[Math.round(by) + yy - y0][Math.round(bx) + xx - x0] = yy > r * 0.4 ? "s" : "c";
    }
  }
  return g.map((row) => row.join(""));
}
const CLOUD_KINDS = [1, 0.8, 0.65];
const CLOUD_PAL = { ".": null, c: B.cloud, s: B.cloudSh };
const cloudImgs = []; // 종류별 첫 사용 때 한 번 굽는다(픽셀 행 생성도 그때만)
const cloudImg = (k) => cloudImgs[k] || (cloudImgs[k] = bake(cloudPx(CLOUD_KINDS[k]), CLOUD_PAL));
// 주기 RIDGE_PERIOD 안의 배치(x, y, 종류)
const CLOUDS = [[30, 26, 0], [250, 54, 1], [470, 18, 2], [690, 66, 0], [930, 36, 1], [1130, 78, 2]];
function drawClouds(ctx, s, cam, viewW, tt) {
  if (s.cloudA < 0.02) return;
  const off = Math.round(cam.x * PARALLAX.cloud + tt * CLOUD_DRIFT);
  ctx.globalAlpha = s.cloudA;
  for (const [x, y, k] of CLOUDS) {
    const img = cloudImg(k);
    let sx = mod(x - off, P);
    if (sx >= viewW) sx -= P;
    if (sx + img.width > 0) ctx.drawImage(img, sx, y);
  }
  ctx.globalAlpha = 1;
}

// ── 실루엣 레이어 ─────────────────────────────────────────────
function drawRidge(ctx, name, base, shade, cam) {
  const m = layers()[name];
  const img = paint(m, base, shade);
  const ox = -mod(Math.round(cam.x * PARALLAX[name]), P);
  ctx.drawImage(img, ox, m.top);
  ctx.drawImage(img, ox + P, m.top); // P > viewW라 두 장이면 화면 전체를 덮는다
}

// ── 나무 줄(패럴랙스 0.6) — 자리만. TODO(Task 4): 나무 스프라이트 2~3종을 PARALLAX.tree로 이어 그린다. ──
function drawTreeRow(/* ctx, s, cam, viewW */) {}

export function drawBackground(ctx, cam, t, viewW, progress, reduced) {
  const s = skyAt(progress);
  const tt = reduced ? 0 : t;
  drawSky(ctx, s, viewW);
  drawStars(ctx, s, viewW, tt, reduced);
  drawSun(ctx, s, viewW);
  drawClouds(ctx, s, cam, viewW, tt);
  drawRidge(ctx, "mtn", s.mtn, s.mtnSh, cam);
  drawRidge(ctx, "far", s.far, s.farSh, cam);
  drawRidge(ctx, "near", s.near, s.nearSh, cam);
  drawTreeRow(ctx, s, cam, viewW);
}
