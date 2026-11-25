// 그리기 모듈(브라우저 전용). 외부 에셋 없이 코드로 픽셀 스프라이트를 prebake 하고,
// 상자는 캔버스 도형으로 그린다(배경은 background.js, 지면·발판 타일 데이터는 art/tiles.js). 라이선스 문제 0.
import { VIEW_W } from "./engine.js";
import { baked } from "./art/bake.js";
import { PAL_TILE, GROUND, PLAT, groundVariant } from "./art/tiles.js";
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

// 솔리드 1개를 (0,0) 기준 캔버스에 타일로 합성. 폭·높이는 16·8의 배수가 아니어도 된다.
// 흙 변형 해시는 월드 열(s.x 기준)로 고른다 → 세그먼트마다 무늬가 다르다.
const solidCache = new Map();
function composeTile(ctx, s) {
  const { w, h, kind } = s;
  const x = 0, y = 0;
  if (kind === "platform") {
    // 왼끝 8 + 중간(8px 반복, 마지막 조각은 자름) + 오른끝 8. 높이는 14 고정 스프라이트.
    const ph = Math.min(h, 14);
    ctx.drawImage(baked("plat.left", PLAT.left, PAL_TILE), 0, 0, 8, ph, x, y, 8, ph);
    const mid = baked("plat.mid", PLAT.mid, PAL_TILE);
    for (let cx = x + 8; cx < x + w - 8; cx += 8) {
      const cw = Math.min(8, x + w - 8 - cx);
      ctx.drawImage(mid, 0, 0, cw, ph, cx, y, cw, ph);
    }
    ctx.drawImage(baked("plat.right", PLAT.right, PAL_TILE), 0, 0, 8, ph, x + w - 8, y, 8, ph);
    return;
  }
  // ground: 윗줄 16행 + 몸통(h-16, 아래 조각은 자름). 왼·오른 끝 열 = 끝 타일(오른끝은 세그먼트 오른쪽 정렬),
  // 그 사이 안쪽 열은 왼쪽부터 16칸씩, 마지막 안쪽 열은 오른끝 타일 앞에서 자른다(spec §5.3).
  const top = baked("ground.top", GROUND.top, PAL_TILE);
  const fills = [baked("ground.fill0", GROUND.fill[0], PAL_TILE), baked("ground.fill1", GROUND.fill[1], PAL_TILE)];
  const th = Math.min(16, h);
  const bodyH = h - th;
  for (let cx = x + 16; cx < x + w - 16; cx += 16) {
    const cw = Math.min(16, x + w - 16 - cx);
    ctx.drawImage(top, 0, 0, cw, th, cx, y, cw, th);
    for (let r = 0; r < bodyH; r += 16) {
      const rh = Math.min(16, bodyH - r);
      const f = fills[groundVariant(Math.floor((s.x + cx) / 16), (r >> 4) + 1)];
      ctx.drawImage(f, 0, 0, cw, rh, cx, y + th + r, cw, rh);
    }
  }
  const endCol = (img, ex) => {
    ctx.drawImage(img, 0, 0, 16, th, ex, y, 16, th);
    for (let r = 0; r < bodyH; r += 8) {
      const rh = Math.min(8, bodyH - r);
      ctx.drawImage(img, 0, 8, 16, rh, ex, y + th + r, 16, rh); // 8~15행 옆면 띠 반복
    }
  };
  endCol(baked("ground.left", GROUND.left, PAL_TILE), x);
  endCol(baked("ground.right", GROUND.right, PAL_TILE), x + w - 16);
}

export const Sprites = {
  // 배경은 background.js(화풍 B 레이어)에 위임. reduced는 Game 생성자가 설정.
  drawBackground(ctx, cam, t, viewW = VIEW_W, progress = 0) {
    drawBg(ctx, cam, t, viewW, progress, this.reduced);
  },

  // 지면·발판 타일(js/art/tiles.js). 솔리드마다 첫 호출 때 한 장으로 합성해 캐시한다
  // (프레임당 drawImage 1회; 조각별로 그리면 ~950회/프레임, 1100폭 데스크톱 0.42ms).
  drawTile(ctx, s) {
    const key = `${s.kind}:${s.x},${s.y},${s.w},${s.h}`;
    let cv = solidCache.get(key);
    if (!cv) {
      cv = document.createElement("canvas");
      cv.width = s.w;
      cv.height = s.h;
      composeTile(cv.getContext("2d"), s);
      solidCache.set(key, cv);
    }
    ctx.drawImage(cv, s.x, s.y);
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
