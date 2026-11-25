// 그리기 모듈(브라우저 전용). 외부 에셋 없이 코드로 픽셀 스프라이트를 prebake 한다
// (배경은 background.js, 지면·발판 타일 데이터는 art/tiles.js, 코인·상자는 art/props.js). 라이선스 문제 0.
import { VIEW_W } from "./engine.js";
import { baked } from "./art/bake.js";
import { PAL_TILE, GROUND, PLAT, groundVariant } from "./art/tiles.js";
import { PAL_COIN, COIN_FRAMES, PAL_CHEST, CHEST_FRAMES, CHEST_GLINT } from "./art/props.js";
import { PAL_PLAYER, PLAYER_FRAMES } from "./art/player.js";
import { coinFrame, playerDrawRect } from "./anim.js";
import { drawBackground as drawBg } from "./background.js";

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

  // 코인 6프레임 회전(8fps, animT = Game 그리기 시계). reduced면 coinFrame이 정면 0 고정.
  drawCoin(ctx, x, y, animT = 0) {
    const f = coinFrame(animT, this.reduced);
    ctx.drawImage(baked(`coin${f}`, COIN_FRAMES[f], PAL_COIN), Math.round(x), Math.round(y));
  },

  // 플레이어 16x24(js/art/player.js). anim = Game.anim {state,frame}; null(타이틀, 첫 play update 전)이면 idle 0.
  // 좌·우향 모두 같은 16px 칸(playerDrawRect): 좌향은 칸 오른쪽 끝(flipX)에서 반전해 그린다(spec §5.2).
  drawPlayer(ctx, p, anim) {
    const state = anim ? anim.state : "idle";
    const i = anim ? anim.frame : 0;
    const frames = PLAYER_FRAMES[state] || PLAYER_FRAMES.idle;
    const img = baked(`player:${state}:${i}`, frames[i] || frames[0], PAL_PLAYER);
    const r = playerDrawRect(p);
    if (p.facing < 0) {
      ctx.save();
      ctx.translate(r.flipX, r.y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(img, r.x, r.y);
    }
  },

  // 상자 32x28을 히트박스 44x36 하단 중앙에(spec §5.5). 프레임 0 닫힘 / 1 열림1 / 2 열림2 / 3 열림+빛.
  // openT(열림 진행)는 Task 9 전까지 0 → 열림이면 바로 3(완전히 열림)을 그린다.
  // 닫힘 + near(atChest): 자물쇠판 1px 반짝임이 1초에 0.25초 켜진다(1Hz). reduced-motion에서도 같은 점멸
  // — 2026-11-25 M2 게이트 사용자 결정(spec §5.5 갱신, Global Constraint의 「상자 반짝임 정지」보다 우선).
  drawChest(ctx, c, { opened = false, openT = 1, near = false } = {}, animT = 0) {
    // 닫힘 → open1 → open2 → openGlow (openT 0..1을 3등분)
    const f = !opened ? 0 : openT < 1 / 3 ? 1 : openT < 2 / 3 ? 2 : 3;
    const dx = Math.round(c.x) + 6, dy = Math.round(c.y) + 8;
    ctx.drawImage(baked(`chest${f}`, CHEST_FRAMES[f], PAL_CHEST), dx, dy);
    if (!opened && near && animT % 1 < 0.25) {
      ctx.fillStyle = PAL_CHEST.g;
      ctx.fillRect(dx + CHEST_GLINT.x, dy + CHEST_GLINT.y, 1, 1);
    }
  },
};
