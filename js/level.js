// 스테이지 데이터(순수 데이터 + 좌표). 렌더/입력은 모른다.
// 좌표계: 내부 해상도 480x270 기준 월드 픽셀. 지면 윗면 y=230.
//
// 도달성/난이도 설계(점프 최대 높이 ≈66px, 수평거리 ≈81px):
//  - 코인은 지면 점프 정점(≈148)보다 높이 두어 "발판을 밟고 올라가야" 닿게 한다.
//  - 단, 각 발판은 바로 아래(지면 또는 더 낮은 발판)에서 ≤44px 위 + 수평 간격 ≤56px →
//    한 칸씩 점프로 올라갈 수 있게 보장(계단식).
//  - 구덩이 폭 50px(여유 있게 건넘). 일부 코인은 구덩이 위 디딤 발판으로 배치.

import { COIN_SIZE } from "./engine.js";

const GROUND_Y = 230;
const GROUND_H = 70;
const WORLD_W = 2420;

// 지면 세그먼트(사이 50px 구덩이)
const ground = [
  { x: 0, w: 340 }, // pit 340..390
  { x: 390, w: 370 }, // pit 760..810
  { x: 810, w: 370 }, // pit 1180..1230
  { x: 1230, w: 420 }, // pit 1650..1700
  { x: 1700, w: 420 }, // pit 2120..2170
  { x: 2170, w: WORLD_W - 2170 }, // 최종 지면(보물상자)
].map((g) => ({ x: g.x, y: GROUND_Y, w: g.w, h: GROUND_H, kind: "ground" }));

// 발판 정의. coin: 프로젝트 index(있으면 그 발판 위에 코인). 없으면 디딤(계단) 발판.
// 각 발판은 바로 아래 솔리드에서 ≤44px 위 + 수평 간격 ≤56px → 한 칸씩 올라갈 수 있음.
const platDefs = [
  // 0) 도입: 낮은 한 번 점프
  { x: 230, y: 192, w: 60, coin: 0 },

  // 1) 3단 계단 climb → 높은 코인
  { x: 460, y: 192, w: 56 },
  { x: 528, y: 156, w: 56 },
  { x: 596, y: 120, w: 56, coin: 1 },

  // 2) 2단 계단
  { x: 880, y: 194, w: 56 },
  { x: 948, y: 158, w: 56, coin: 2 },

  // 3) 구덩이(1180..1230) 위 디딤 발판 — 건너뛰며 획득
  { x: 1190, y: 186, w: 60, coin: 3 },

  // 4) 3단 계단 climb → 높은 코인
  { x: 1320, y: 192, w: 56 },
  { x: 1388, y: 156, w: 56 },
  { x: 1456, y: 120, w: 56, coin: 4 },

  // 5) 중간 높이 한 번 점프
  { x: 1820, y: 186, w: 60, coin: 5 },

  // 6) 보물상자 직전 발판 (6→7 거리 단축)
  { x: 2240, y: 190, w: 60, coin: 6 },
];

const platforms = platDefs.map((p) => ({ x: p.x, y: p.y, w: p.w, h: 14, kind: "platform" }));
const solids = [...ground, ...platforms];

// 코인 = coin 필드가 있는 발판 윗면 바로 위(착지하면 획득). 발판 가로 중앙 정렬.
const coins = platDefs
  .filter((p) => p.coin !== undefined)
  .map((p) => ({
    x: p.x + p.w / 2 - COIN_SIZE / 2,
    y: p.y - 11,
    project: p.coin,
    got: false,
  }))
  .sort((a, b) => a.project - b.project);

// 보물상자: 최종 지면 위
const CHEST_H = 36;
const chest = { x: 2360, y: GROUND_Y - CHEST_H, w: 44, h: CHEST_H };

export const LEVEL = {
  worldWidth: WORLD_W,
  groundY: GROUND_Y,
  deathY: 300,
  start: { x: 40, y: 200 },
  solids,
  coins,
  chest,
};
