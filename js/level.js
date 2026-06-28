// 스테이지 데이터(순수 데이터 + 좌표). 렌더/입력은 모른다.
// 좌표계: 내부 해상도 480x270 기준 월드 픽셀. 지면 윗면 y=230.
//
// 도달성 설계 규칙(점프 최대 높이 ≈66px, 점프 수평거리 ≈81px 기준):
//  - 발판은 지면(230)보다 ≤44px 위에만 둔다 → 지면에서 점프로 항상 착지 가능.
//  - 코인은 발판 윗면 바로 위(≈10px)에 둔다 → 발판에 착지하면 자동 획득.
//  - 구덩이 폭은 50px로 고정 → 여유 있게 건널 수 있음.

import { COIN_SIZE } from "./engine.js";

const GROUND_Y = 230;
const GROUND_H = 70;
const WORLD_W = 2740;

// 지면 세그먼트(사이 50px 구덩이)
const ground = [
  { x: 0, w: 380 },
  { x: 430, w: 390 }, // 380..430 구덩이
  { x: 870, w: 410 }, // 820..870 구덩이
  { x: 1330, w: 410 }, // 1280..1330 구덩이
  { x: 1790, w: 460 }, // 1740..1790 구덩이
  { x: 2300, w: WORLD_W - 2300 }, // 2250..2300 구덩이, 최종 지면(보물상자)
].map((g) => ({ x: g.x, y: GROUND_Y, w: g.w, h: GROUND_H, kind: "ground" }));

// 코인을 얹는 발판(지면 위 ≤44px, 폭 64). 각 발판 위에 코인 1개.
const PLAT_W = 64;
const platDefs = [
  { x: 250, y: 192, project: 0 },
  { x: 600, y: 188, project: 1 },
  { x: 980, y: 192, project: 2 },
  { x: 1450, y: 188, project: 3 },
  { x: 1900, y: 192, project: 4 },
  { x: 2120, y: 188, project: 5 },
  { x: 2470, y: 196, project: 6 }, // 보물상자 직전
];

const platforms = platDefs.map((p) => ({
  x: p.x,
  y: p.y,
  w: PLAT_W,
  h: 14,
  kind: "platform",
}));

const solids = [...ground, ...platforms];

// 코인 = 각 발판 윗면 바로 위(착지하면 획득). 발판 가로 중앙 정렬.
const coins = platDefs.map((p) => ({
  x: p.x + PLAT_W / 2 - COIN_SIZE / 2,
  y: p.y - 11,
  project: p.project,
  got: false,
}));

// 보물상자: 최종 지면 위
const CHEST_H = 36;
const chest = { x: 2560, y: GROUND_Y - CHEST_H, w: 44, h: CHEST_H };

export const LEVEL = {
  worldWidth: WORLD_W,
  groundY: GROUND_Y,
  deathY: 300,
  start: { x: 40, y: 200 },
  solids,
  coins,
  chest,
};
