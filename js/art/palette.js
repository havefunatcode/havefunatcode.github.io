// 화풍 B 팔레트·시간대 키프레임(데이터 + 순수 함수, DOM 없음). 기준: spec §5.1.
export const B = {
  sky5: ["#9fb8d8", "#b9c9dc", "#d8d6d8", "#efd8c8", "#f6e2cc"],
  sun: "#fff1d0", sunEdge: "#f8d8a8",
  cloud: "#fbf3ea", cloudSh: "#e2d6d0",
  mtn: "#a9a6c4", mtnSh: "#8e8aae",
  far: "#a8c3b0", farSh: "#8daa98",
  near: "#7fa68c", nearSh: "#668d74",
  trunk: "#8a6448", leaf: "#6f9a6a", leafHi: "#94bd84", leafSh: "#557a56",
  grass: "#8fbf6a", grassSh: "#6c9a4f",
  dirt: "#9c7458", dirtSh: "#7d5a44", dirtHi: "#b48a6a",
  plat: "#b08458", platHi: "#caa074", platSh: "#7e5a3c",
  coin3: ["#fff2c0", "#f0c860", "#c8963a"], // 하이라이트 / 기본 / 테두리
  chest4: ["#9c6a44", "#6e4a30", "#f0c860", "#c8963a"], // 나무 / 나무 그늘 / 금속 / 금속 그늘
  chestHi: "#bb8a5e", // 상자 나무 밝음(판자 위·왼 1px, 좌상단 광원) — M2 게이트에서 추가
};

// 키프레임: 저녁(0) → 새벽(0.5, spec §5.1 표) → 오전(1).
// 저녁·오전 색은 M1 게이트 승인 대상 — 조정은 이 배열에서만 한다.
export const SKY_KEYS = [
  {
    t: 0,
    sky: ["#4a4f86", "#6e5f93", "#a1688f", "#d68a7c", "#efb08a"],
    sun: "#ffc58a", sunXr: 0.15, sunY: 124, sunR: 30, starA: 1, cloudA: 0.5,
    mtn: "#6f6a96", mtnSh: "#585580",
    far: "#6f8a8a", farSh: "#5a7377",
    near: "#5c8274", nearSh: "#496a60",
    leaf: "#4f7a5a", leafHi: "#6f9a6c", leafSh: "#3d5f48", trunk: "#6a4c3c",
  },
  {
    t: 0.5,
    sky: B.sky5,
    sun: B.sun, sunXr: 0.33, sunY: 86, sunR: 26, starA: 0.4, cloudA: 0.7,
    mtn: B.mtn, mtnSh: B.mtnSh,
    far: B.far, farSh: B.farSh,
    near: B.near, nearSh: B.nearSh,
    leaf: B.leaf, leafHi: B.leafHi, leafSh: B.leafSh, trunk: B.trunk,
  },
  {
    t: 1,
    sky: ["#8cc0ea", "#a8d2ee", "#c4e0ee", "#dceaea", "#ebf1e4"],
    sun: "#fffbe0", sunXr: 0.5, sunY: 50, sunR: 22, starA: 0, cloudA: 0.9,
    mtn: "#b4b6d6", mtnSh: "#9a9cc0",
    far: "#b4d4bc", farSh: "#98bda4",
    near: "#86b898", nearSh: "#6ea683",
    leaf: "#78aa6e", leafHi: "#a0cc8c", leafSh: "#5c8a5c", trunk: "#91694c",
  },
];

const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// a*(1-f)+b*f: f=0/1에서 키프레임 값과 정확히 일치(부동소수 오차 없음).
const mix = (a, b, f) => a * (1 - f) + b * f;
const mixHex = (h1, h2, f) => {
  const a = rgb(h1), b = rgb(h2);
  return `rgb(${Math.round(mix(a[0], b[0], f))},${Math.round(mix(a[1], b[1], f))},${Math.round(mix(a[2], b[2], f))})`;
};
const mixVal = (a, b, f) => {
  if (Array.isArray(a)) return a.map((v, i) => mixVal(v, b[i], f));
  return typeof a === "number" ? mix(a, b, f) : mixHex(a, b, f);
};

export function skyAt(p) {
  p = p < 0 ? 0 : p > 1 ? 1 : p;
  let i = 0;
  while (i < SKY_KEYS.length - 2 && p > SKY_KEYS[i + 1].t) i++;
  const a = SKY_KEYS[i], b = SKY_KEYS[i + 1];
  const f = (p - a.t) / (b.t - a.t);
  const out = {};
  for (const k of Object.keys(a)) if (k !== "t") out[k] = mixVal(a[k], b[k], f);
  return out;
}
