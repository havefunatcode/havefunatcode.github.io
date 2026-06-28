// 그리기 모듈(브라우저 전용). 외부 에셋 없이 코드로 픽셀 스프라이트를 prebake 하고,
// 지면/상자/배경/HUD는 캔버스 도형으로 그린다. 라이선스 문제 0.
import { VIEW_W, VIEW_H } from "./engine.js";

// ── 픽셀 스프라이트 정의 ───────────────────────────────────────
const PAL_PLAYER = {
  ".": null, H: "#2b2b3a", F: "#f4c8a0", E: "#14223a", m: "#b5654a",
  B: "#4a86c5", b: "#356199", P: "#33405a", S: "#20232e",
};
const PLAYER_PX = [
  "............",
  "...HHHHHH...",
  "..HHHHHHHH..",
  ".HHFFFFFFHH.",
  ".HFFFFFFFFH.",
  ".HFEFFFFEFH.",
  ".HFFFFFFFFH.",
  ".HFFFmmFFFH.",
  "..FFFFFFFF..",
  "..BBBBBBBB..",
  ".BBBBBBBBBB.",
  ".BbBBBBBBbB.",
  ".BBBBBBBBBB.",
  ".BBBBBBBBBB.",
  "..PPP..PPP..",
  "..SSS..SSS..",
];

const PAL_COIN = { ".": null, Y: "#ffd54a", O: "#d98e1f", W: "#fff6cf" };
const COIN_PX = [
  "..OOOO..",
  ".OYYYYO.",
  "OYYWWYYO",
  "OYWWYYYO",
  "OYYYYWYO",
  "OYYYYYYO",
  ".OYYYYO.",
  "..OOOO..",
];

function bake(px, pal) {
  const h = px.length;
  const w = px[0].length;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d");
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const col = pal[px[y][x]];
      if (col) {
        c.fillStyle = col;
        c.fillRect(x, y, 1, 1);
      }
    }
  }
  return cv;
}

const PLAYER = bake(PLAYER_PX, PAL_PLAYER);
const COIN = bake(COIN_PX, PAL_COIN);

// ── 시간대 연출: 진행도(0=저녁 → 1=오전)에 따라 하늘/해/언덕 보간 ──
const lerp = (a, b, f) => a + (b - a) * f;
const hex2rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixHex = (h1, h2, f) => {
  const a = hex2rgb(h1), b = hex2rgb(h2);
  return `rgb(${(lerp(a[0], b[0], f)) | 0},${(lerp(a[1], b[1], f)) | 0},${(lerp(a[2], b[2], f)) | 0})`;
};
// 키프레임: 저녁(0) → 새벽(0.5) → 오전(1). sunXr=화면폭 대비 해 X비율, sunY=해 높이(작을수록 위)
const SKY = [
  { t: 0.0, top: "#1c2549", bot: "#ff9e6d", sunXr: 0.15, sunY: 124, sun: "#ff7a3c", sunR: 30, far: "#5d7a73", near: "#496f63" },
  { t: 0.5, top: "#5566a8", bot: "#ffce9f", sunXr: 0.33, sunY: 86, sun: "#ffb157", sunR: 26, far: "#9ac8b3", near: "#74b094" },
  { t: 1.0, top: "#aee4ff", bot: "#eafaff", sunXr: 0.5, sunY: 50, sun: "#fff2b0", sunR: 22, far: "#c4ebd1", near: "#9ed9b1" },
];
function skyAt(p) {
  p = p < 0 ? 0 : p > 1 ? 1 : p;
  let i = 0;
  while (i < SKY.length - 2 && p > SKY[i + 1].t) i++;
  const a = SKY[i], b = SKY[i + 1];
  const f = (p - a.t) / ((b.t - a.t) || 1);
  return {
    top: mixHex(a.top, b.top, f),
    bot: mixHex(a.bot, b.bot, f),
    sun: mixHex(a.sun, b.sun, f),
    sunXr: lerp(a.sunXr, b.sunXr, f),
    sunY: lerp(a.sunY, b.sunY, f),
    sunR: lerp(a.sunR, b.sunR, f),
    far: mixHex(a.far, b.far, f),
    near: mixHex(a.near, b.near, f),
  };
}

export const Sprites = {
  drawBackground(ctx, cam, t, viewW = VIEW_W, progress = 0) {
    const s = skyAt(progress);
    const tt = this.reduced ? 0 : t;

    // 하늘 (시간대 보간)
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, s.top);
    g.addColorStop(1, s.bot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, viewW, VIEW_H);

    // 별 (저녁에만 보이고 진행할수록 사라짐)
    const starA = Math.max(0, 1 - progress * 2.4);
    if (starA > 0.02) {
      ctx.fillStyle = "#fffbe8";
      for (let i = 0; i < 14; i++) {
        const sx = ((i * 97 + 30) % Math.max(40, viewW - 20)) + 10;
        const sy = ((i * 41 + 16) % 118) + 12;
        const tw = this.reduced ? 1 : 0.55 + 0.45 * Math.sin(tt * 3 + i * 1.7);
        ctx.globalAlpha = starA * tw * 0.9;
        const sz = i % 3 ? 1 : 2;
        ctx.fillRect(sx, sy, sz, sz);
      }
      ctx.globalAlpha = 1;
    }

    // 해 + 글로우
    const sunX = viewW * s.sunXr;
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = s.sun;
    ctx.beginPath();
    ctx.arc(sunX, s.sunY, s.sunR * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = s.sun;
    ctx.beginPath();
    ctx.arc(sunX, s.sunY, s.sunR, 0, Math.PI * 2);
    ctx.fill();

    // 구름 (저녁엔 옅게 → 오전엔 또렷, reduced-motion이면 표류 정지)
    ctx.fillStyle = `rgba(255,255,255,${(0.5 + 0.4 * progress).toFixed(2)})`;
    const span = viewW + 140;
    const n = Math.ceil(viewW / 160) + 2;
    for (let i = 0; i < n; i++) {
      let cx = ((i * 160 - cam.x * 0.2 - tt * 6) % span + span) % span - 70;
      const cy = 36 + (i % 3) * 22;
      this._cloud(ctx, cx, cy);
    }

    // 먼 언덕 / 가까운 언덕 (시간대에 따라 톤 변화)
    this._band(ctx, cam.x * 0.25, 196, s.far, 40, viewW);
    this._band(ctx, cam.x * 0.45, 218, s.near, 34, viewW);
  },

  _cloud(ctx, x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.arc(x + 12, y + 2, 13, 0, Math.PI * 2);
    ctx.arc(x + 26, y, 10, 0, Math.PI * 2);
    ctx.fill();
  },

  _band(ctx, offset, baseY, color, r, viewW = VIEW_W) {
    ctx.fillStyle = color;
    ctx.fillRect(0, baseY, viewW, VIEW_H - baseY);
    const span = r * 2;
    let start = -((offset % span) + span) % span;
    for (let x = start; x < viewW + span; x += span) {
      ctx.beginPath();
      ctx.arc(x + r, baseY, r, Math.PI, 0);
      ctx.fill();
    }
  },

  drawTile(ctx, s) {
    const { x, y, w, h, kind } = s;
    if (kind === "platform") {
      ctx.fillStyle = "#8a5a2b";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#a9743c";
      ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = "#5e3a16";
      ctx.fillRect(x, y + h - 2, w, 2);
      return;
    }
    // ground
    ctx.fillStyle = "#7a5230";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#5bbf63";
    ctx.fillRect(x, y, w, 7);
    ctx.fillStyle = "#3f9e4a";
    ctx.fillRect(x, y + 7, w, 2);
    // 흙 텍스처
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (let i = x + 6; i < x + w; i += 22) {
      ctx.fillRect(i, y + 16, 3, 3);
      ctx.fillRect(i + 10, y + 30, 2, 2);
    }
  },

  drawCoin(ctx, x, y) {
    ctx.drawImage(COIN, Math.round(x), Math.round(y));
  },

  drawPlayer(ctx, p, walkPhase) {
    const bob = walkPhase > 0 ? -Math.abs(Math.sin(walkPhase)) : 0;
    ctx.save();
    if (p.facing < 0) {
      ctx.translate(Math.round(p.x + p.w), Math.round(p.y + bob));
      ctx.scale(-1, 1);
      ctx.drawImage(PLAYER, 0, 0);
    } else {
      ctx.drawImage(PLAYER, Math.round(p.x), Math.round(p.y + bob));
    }
    ctx.restore();
  },

  drawChest(ctx, c, open, t) {
    const { x, y, w, h } = c;
    // 본체
    ctx.fillStyle = "#7a4a22";
    ctx.fillRect(x, y + h * 0.42, w, h * 0.58);
    ctx.fillStyle = "#e8b23a";
    ctx.fillRect(x + w / 2 - 2, y + h * 0.42, 4, h * 0.58);

    if (!open) {
      ctx.fillStyle = "#8a5a2b";
      ctx.fillRect(x, y, w, h * 0.46);
      ctx.fillStyle = "#e8b23a";
      ctx.fillRect(x, y + h * 0.42 - 3, w, 4);
      ctx.fillStyle = "#ffd24a";
      ctx.fillRect(x + w / 2 - 4, y + h * 0.42 - 5, 8, 9);
      ctx.fillStyle = "#5e3a16";
      ctx.fillRect(x + w / 2 - 1, y + h * 0.42 - 1, 2, 3);
    } else {
      // 열린 뚜껑
      ctx.fillStyle = "#8a5a2b";
      ctx.fillRect(x - 1, y - h * 0.38, w + 2, h * 0.42);
      ctx.fillStyle = "#e8b23a";
      ctx.fillRect(x - 1, y - h * 0.38, w + 2, 3);
      // 빛 (reduced-motion이면 정적)
      ctx.save();
      ctx.globalAlpha = this.reduced ? 0.7 : 0.55 + 0.25 * Math.sin(t * 6);
      ctx.fillStyle = "#fff4c2";
      ctx.fillRect(x + 2, y, w - 4, h * 0.42);
      ctx.restore();
    }
    ctx.strokeStyle = "#3b2510";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  },
};
