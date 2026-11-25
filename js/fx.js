// 이펙트 레이어: pixelfx 축소 변형 3종(코인·착지·상자)을 월드 좌표에 띄우고 맨 앞에 합성한다(spec §5.7).
// import만으로는 DOM을 건드리지 않는다(Node 테스트) — ImageData·캔버스는 draw 안에서 처음 필요할 때 만든다.
//
// 성능: 화면 크기 프레임 대신 이펙트마다 meta.size 크기의 작은 frame을 쓰고, frame·ImageData·오프스크린 캔버스는
// 종류별 풀에서 재사용한다. 활성 이펙트가 0개면 draw는 아무것도 합성하지 않는다.
// 좌표: frame은 월드 좌표에 고정(ox,oy = 스폰 위치 − meta.origin), 화면 위치는 매 프레임 카메라를 빼서 정한다
// → 화면 폭(270~1100)이 바뀌어도 이펙트는 월드에 붙어 있고 frame 크기는 그대로다.
import { createFrame, clearFrame, createFx, composite } from "./vendor/pixelfx/core/index.js";
import * as coinBurst from "./vendor/pixelfx/fx/custom/coin-burst-s.js";
import * as landDust from "./vendor/pixelfx/fx/custom/land-dust-s.js";
import * as chestGlint from "./vendor/pixelfx/fx/custom/chest-glint-s.js";

const KINDS = { coin: coinBurst, land: landDust, chest: chestGlint };

// frame + 합성 버퍼(ImageData) + 오프스크린 캔버스 한 벌. 표면은 첫 draw 때 만든다(DOM).
function makeSlot(mod) {
  const [w, h] = mod.meta.size;
  return { frame: createFrame(w, h, 0, 0), img: null, cv: null, cx: null };
}

export function createFxLayer({ reduced = false } = {}) {
  const live = []; // { fx, slot, kind }
  const pool = { coin: [], land: [], chest: [] };

  return {
    // kind: 'coin' | 'land' | 'chest', (x, y) 월드 좌표. opts.impactVy는 land 세기.
    spawn(kind, x, y, opts = {}) {
      if (reduced) return; // prefers-reduced-motion: 이펙트 전부 끔
      const mod = KINDS[kind];
      if (!mod) return;
      const slot = pool[kind].pop() ?? makeSlot(mod);
      const X = Math.round(x), Y = Math.round(y);
      slot.frame.ox = X - mod.meta.origin[0];
      slot.frame.oy = Y - mod.meta.origin[1];
      const o = { x: X, y: Y };
      if (kind === "land" && opts.impactVy != null) o.impactVy = opts.impactVy;
      live.push({ fx: createFx(mod, o), slot, kind });
    },

    update(dt) {
      for (let i = live.length - 1; i >= 0; i--) {
        const e = live[i];
        e.fx.update(dt);
        if (e.fx.done()) {
          pool[e.kind].push(e.slot);
          live.splice(i, 1);
        }
      }
    },

    // 화면 좌표계 ctx(카메라 이동 전)에 그린다. cam.x만 쓴다(세로 카메라 없음).
    draw(ctx, cam) {
      if (live.length === 0) return;
      const camX = Math.round(cam.x);
      const viewW = ctx.canvas ? ctx.canvas.width : Infinity;
      for (const { fx, slot } of live) {
        const f = slot.frame;
        const sx = f.ox - camX;
        if (sx + f.w <= 0 || sx >= viewW) continue; // 화면 밖이면 합성 생략
        if (!slot.img) {
          slot.img = new ImageData(f.w, f.h);
          slot.cv = document.createElement("canvas");
          slot.cv.width = f.w;
          slot.cv.height = f.h;
          slot.cx = slot.cv.getContext("2d");
        }
        clearFrame(f);
        fx.draw(f, "front");
        composite(f, slot.img.data, null);
        slot.cx.putImageData(slot.img, 0, 0);
        ctx.drawImage(slot.cv, sx, f.oy);
      }
    },

    active() {
      return live.length;
    },
  };
}
