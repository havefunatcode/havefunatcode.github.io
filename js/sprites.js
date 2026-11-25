// 그리기 모듈(브라우저 전용). 외부 에셋 없이 코드로 픽셀 스프라이트를 prebake 하고,
// 지면/상자는 캔버스 도형으로 그린다(배경은 background.js). 라이선스 문제 0.
import { VIEW_W } from "./engine.js";
import { baked } from "./art/bake.js";
import { drawBackground as drawBg } from "./background.js";

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

export const Sprites = {
  // 배경은 background.js(화풍 B 레이어)에 위임. reduced는 Game 생성자가 설정.
  drawBackground(ctx, cam, t, viewW = VIEW_W, progress = 0) {
    drawBg(ctx, cam, t, viewW, progress, this.reduced);
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
    ctx.drawImage(baked("coin", COIN_PX, PAL_COIN), Math.round(x), Math.round(y));
  },

  drawPlayer(ctx, p, walkPhase) {
    const bob = walkPhase > 0 ? -Math.abs(Math.sin(walkPhase)) : 0;
    ctx.save();
    if (p.facing < 0) {
      ctx.translate(Math.round(p.x + p.w), Math.round(p.y + bob));
      ctx.scale(-1, 1);
      ctx.drawImage(baked("player", PLAYER_PX, PAL_PLAYER), 0, 0);
    } else {
      ctx.drawImage(baked("player", PLAYER_PX, PAL_PLAYER), Math.round(p.x), Math.round(p.y + bob));
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
