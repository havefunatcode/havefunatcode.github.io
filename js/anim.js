// 애니메이션 프레임 선택(순수 함수, DOM 없음). 시계는 Game.animT(모든 state에서 흐르는 그리기 시계).
export const COIN_FPS = 8;
export const COIN_FRAME_COUNT = 6;

// 코인 회전 프레임 0..5(8fps 순환). reduced-motion이면 정면(0) 고정(spec §5.4).
export function coinFrame(animT, reduced) {
  if (reduced) return 0;
  const f = Math.floor(animT * COIN_FPS) % COIN_FRAME_COUNT;
  return f < 0 ? f + COIN_FRAME_COUNT : f;
}

// ---- 플레이어 애니메이션 상태기계(spec §5.2) ----
export const IDLE_STEP = 0.5; // idle 숨쉬기: 0.5초마다 frame 0↔1
export const WALK_FPS = 10;
export const WALK_FRAME_COUNT = 6;
export const LAND_MS = 80;
export const LAND_VY = 200; // 이 속도 이상으로 착지해야 land 상태

// prev: {state,frame,timer}|null → 다음 {state,frame,timer}. 순수 함수.
// ev: stepPlayer 이벤트({touchdown, impactVy}), intent: {moveX}. 상태가 바뀌면 timer/frame 리셋.
export function nextAnim(prev, p, ev, intent, dt, opts) {
  const reduced = !!(opts && opts.reduced);
  let state;
  if (!p.grounded) {
    state = p.vy < 0 ? "jumpUp" : "fall";
  } else if (ev && ev.touchdown && ev.impactVy >= LAND_VY) {
    state = "land";
  } else if (prev && prev.state === "land" && prev.timer + dt < LAND_MS / 1000 - 1e-9) {
    state = "land";
  } else {
    state = intent.moveX !== 0 ? "walk" : "idle";
  }
  const changed = !prev || prev.state !== state || (state === "land" && ev && ev.touchdown);
  const timer = changed ? 0 : prev.timer + dt;
  let frame = 0;
  if (state === "idle") frame = reduced ? 0 : Math.floor(timer / IDLE_STEP + 1e-9) % 2;
  else if (state === "walk") frame = Math.floor(timer * WALK_FPS + 1e-9) % WALK_FRAME_COUNT;
  return { state, frame, timer };
}

// 스프라이트 16x24를 히트박스(12x20) 하단 중앙에 고정. 좌향은 translate(flipX)+scale(-1,1)로 같은 열 범위를 그린다.
export function playerDrawRect(p) {
  const x = Math.round(p.x + p.w / 2) - 8;
  const y = Math.round(p.y + p.h) - 24;
  return { x, y, flipX: x + 16 };
}
