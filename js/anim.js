// 애니메이션 프레임 선택(순수 함수, DOM 없음). 시계는 Game.animT(모든 state에서 흐르는 그리기 시계).
export const COIN_FPS = 8;
export const COIN_FRAME_COUNT = 6;

// 코인 회전 프레임 0..5(8fps 순환). reduced-motion이면 정면(0) 고정(spec §5.4).
export function coinFrame(animT, reduced) {
  if (reduced) return 0;
  const f = Math.floor(animT * COIN_FPS) % COIN_FRAME_COUNT;
  return f < 0 ? f + COIN_FRAME_COUNT : f;
}
