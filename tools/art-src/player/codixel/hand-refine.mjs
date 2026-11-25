// 손질 단계(Task 7 step 1). codixel-player.cjs의 P.Rig 초안(rig-frames.json)에서
// 위치(발 벌림·무릎 높이·손 위치·몸 내려감 픽셀)만 가져오고, 16px에서 회전으로 번진 다리·팔은
// 손으로 찍은 조각으로 다시 그린다. 결과를 frames.mjs 형식으로 stdout에 낸다.
//   node tools/art-src/player/codixel/hand-refine.mjs > tools/art-src/player/codixel/frames.mjs
// (frames.mjs는 이 출력이 시작점이고, 이후 손으로 고친 곳은 README에 적는다.)

// 머리(0..10행) + 후드 깃(11행) — codixel-player.cjs BASE와 같음
const HEAD = [
  "........oooo....",
  ".....ooHHhhhho..",
  "...ooHhhhhhhhho.",
  "..ohHhhhhhhhhhho",
  "..ohhhhsshhhhhho",
  "..ohhhssssshhhho",
  "..ohhgsggssgssS.",
  "..ohhSgsogsogssS",
  "...ohSsggssgssS.",
  "...ohSssssssmsS.",
  "...ooSSsssssSS..",
  "...occccSSScco..",
];

// 팔을 뺀 몸통(12..17행). 팔은 아래 ARM 조각을 덧칠.
const TORSO = [
  "..occddddlcldo..",
  "..oddddddldlDo..",
  "..oddddddldlDo..",
  "..odddddddddDo..",
  "..oDddddddddDo..",
  "..oDDDDDDDDDDo..",
];

// 팔: 어깨(6,12)에서 손까지의 뒷면 그늘 선 D + 손 2x2. 좌표는 [x, y] (y = 스프라이트 행).
// rig arm 각도 0.45·cos(φ) → 손 열: 뒤2 3, 뒤1 5, 가운데 7, 앞1 8, 앞2 10
const ARM = {
  back2: { line: [[6, 12], [5, 13], [4, 14], [3, 15]], hand: [3, 16] },
  back1: { line: [[6, 12], [6, 13], [5, 14], [5, 15]], hand: [5, 16] },
  mid: { line: [[6, 12], [6, 13], [6, 14], [6, 15], [6, 16]], hand: [7, 16] },
  fwd1: { line: [[6, 12], [6, 13], [7, 14], [7, 15]], hand: [8, 16] },
  fwd2: { line: [[6, 12], [7, 13], [8, 14], [9, 15]], hand: [10, 15] },
  // 공중: 앞으로 뻗음(jumpUp) / 뒤로 들어 올림(fall)
  reach: { line: [[7, 12], [8, 13], [9, 13], [10, 13]], hand: [11, 12] },
  up: { line: [[5, 12], [4, 12], [3, 12]], hand: [1, 11], out: [[2, 12], [2, 11], [1, 13], [2, 13], [0, 11], [0, 12], [1, 10], [2, 10]] },
};

// 다리(엉덩이 행부터 23행까지). 6행 = 몸 기본 높이, 5행 = 1px 내려감, 4행 = 2px 내려감.
const LEGS = {
  stand: [
    "...opppppppo....",
    "...opppopppo....",
    "...opppopppo....",
    "...opppopppo....",
    "...offfoffffo...",
    "...offfoffffo...",
  ],
  stand5: [
    "...opppppppo....",
    "...opppopppo....",
    "...opppopppo....",
    "...offfoffffo...",
    "...offfoffffo...",
  ],
  // walk: 접촉(앞발 뒤꿈치·뒷발 앞꿈치) — 1px 내려감
  contact: [
    "..oppppppppo....",
    "..opppoopppo....",
    ".opppo..opppo...",
    ".fffo....offff..",
    ".fff......ffff..",
  ],
  // 디딤발 몸 아래, 반대 발은 뒤로 들림
  lift: [
    "..oppppppppo....",
    "..opppoopppo....",
    "..oppooopppo....",
    "..ffo..opppo....",
    ".......offffo...",
    ".......offffo...",
  ],
  // 들린 발이 무릎을 앞으로 내밀며 지나감, 디딤발은 뒤로
  pass: [
    "...oppppppppo...",
    "...oppppppppo...",
    "...opppoppppo...",
    "...opppoooppo...",
    "..offffo..fff...",
    "..offffo........",
  ],
  // jumpUp: 웅크림 — 1px 내려감, 앞 무릎 올림
  tuck: [
    "...opppppppppo..",
    "...opppooppppo..",
    "...opppo..oppo..",
    "..offffo..offfo.",
    "..offfo...offfo.",
  ],
  // fall: 다리 쭉 + 발끝 아래
  dangle: [
    "...opppppppo....",
    "...opppopppo....",
    "...opppoopppo...",
    "..opppo..opppo..",
    "..offo....offo..",
    "..offo....offo..",
  ],
  // land: 2px 찌그러짐, 무릎 벌림
  squash: [
    "..oppppppppppo..",
    "..opppo..opppo..",
    ".offffo..offffo.",
    ".offffo..offffo.",
  ],
};

const set = (rows, x, y, ch) => {
  if (y < 0 || y >= rows.length || x < 0 || x > 15) return;
  rows[y] = rows[y].slice(0, x) + ch + rows[y].slice(x + 1);
};

function upper(armName) {
  const rows = [...HEAD, ...TORSO];
  const a = ARM[armName];
  for (const [x, y] of a.out || []) set(rows, x, y, "o");
  for (const [x, y] of a.line) set(rows, x, y, "D");
  const [hx, hy] = a.hand;
  set(rows, hx, hy, "s"); set(rows, hx + 1, hy, "s");
  set(rows, hx, hy + 1, "s"); set(rows, hx + 1, hy + 1, "S");
  return rows; // 18행 (0..17)
}

function frame(armName, legsName) {
  const up = upper(armName), legs = LEGS[legsName];
  const drop = 24 - 18 - legs.length; // 다리가 짧으면 윗몸이 그만큼 내려감
  const blank = ".".repeat(16);
  return [...Array(drop).fill(blank), ...up, ...legs].slice(0, 24);
}

const PLAYER_FRAMES = {
  idle: [frame("mid", "stand"), frame("mid", "stand5")],
  walk: [
    frame("back2", "contact"),
    frame("back1", "lift"),
    frame("fwd1", "pass"),
    frame("fwd2", "contact"),
    frame("fwd1", "lift"),
    frame("back1", "pass"),
  ],
  jumpUp: [frame("reach", "tuck")],
  fall: [frame("up", "dangle")],
  land: [frame("fwd1", "squash")],
};

const q = (s) => JSON.stringify(s);
let out = `// 플레이어 스프라이트 16x24 — codixel 후보 (Task 7 step 1). README.md 참고.
// 우향 3/4 측면. 좌향은 그릴 때 좌우 반전. 23행 = 발바닥(앵커).
export const PAL_PLAYER = {
  ".": null,
  o: "#2a2428", // 외곽(selective outline — darkest tone, never #000)
  h: "#26232a", H: "#3e3a44", // 머리 / 머리 밝음
  s: "#f0c4a2", S: "#d8a084", // 피부 / 피부 그늘
  g: "#56525a", // 안경(동그란 짙은 회색 테)
  m: "#b07060", // 입
  c: "#383e3e", // 후드 깃
  d: "#4e5654", D: "#3c4444", // 후드티 / 후드티 그늘
  l: "#a6aaa6", // 후드 끈(밝은 회색, 2줄)
  p: "#454a62", // 진청 바지
  f: "#2e2a32", // 신발
};

export const PLAYER_FRAMES = {
`;
for (const [k, fs] of Object.entries(PLAYER_FRAMES)) {
  out += `  ${k}: [\n`;
  for (const f of fs) out += `    [\n${f.map((r) => `      ${q(r)},`).join("\n")}\n    ],\n`;
  out += `  ],\n`;
}
out += `};\n`;
process.stdout.write(out);
