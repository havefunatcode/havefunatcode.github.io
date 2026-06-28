// 스테이지 데이터(순수 데이터 + 좌표). 렌더/입력은 모른다.
// 좌표계: 내부 해상도 480x270 기준의 월드 픽셀. 지면 윗면 y=230.

const GROUND_Y = 230;
const GROUND_H = 70; // 화면(270) 아래까지 내려 구덩이 벽이 보이게
const WORLD_W = 2600;

// 지면 세그먼트 사이의 구덩이로 점프 구간을 만든다.
const ground = [
  { x: 0, w: 360 },
  { x: 430, w: 300 },
  { x: 800, w: 260 },
  { x: 1140, w: 320 },
  { x: 1540, w: 300 },
  { x: 1920, w: WORLD_W - 1920 }, // 최종 지면(보물상자)
].map((g) => ({ x: g.x, y: GROUND_Y, w: g.w, h: GROUND_H, kind: "ground" }));

// 떠 있는 발판(코인 경로/대체 루트)
const platforms = [
  { x: 372, y: 178, w: 64, h: 14 },
  { x: 560, y: 158, w: 64, h: 14 },
  { x: 900, y: 172, w: 60, h: 14 },
  { x: 1180, y: 150, w: 60, h: 14 },
  { x: 1300, y: 116, w: 60, h: 14 },
  { x: 1640, y: 164, w: 64, h: 14 },
  { x: 2040, y: 160, w: 64, h: 14 },
].map((p) => ({ ...p, kind: "platform" }));

const solids = [...ground, ...platforms];

// 코인 7개 = 프로젝트 index 0..6
const coins = [
  { x: 400, y: 150, project: 0 },
  { x: 588, y: 130, project: 1 },
  { x: 928, y: 200, project: 2 },
  { x: 1206, y: 122, project: 3 },
  { x: 1326, y: 88, project: 4 },
  { x: 1668, y: 136, project: 5 },
  { x: 2300, y: 202, project: 6 },
].map((c) => ({ ...c, got: false }));

// 보물상자: 최종 지면 위
const chest = { x: 2400, y: 230 - 36, w: 44, h: 36 };

export const LEVEL = {
  worldWidth: WORLD_W,
  groundY: GROUND_Y,
  deathY: 300,
  start: { x: 40, y: 200 },
  solids,
  coins,
  chest,
};
