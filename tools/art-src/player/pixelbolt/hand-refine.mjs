// 손질 단계: Pixelbolt 레시피(player.poses.json)의 머리·몸통 그리드는 그대로 쓰고,
// 툴 초안(frames.draft.mjs)의 다리·팔 자세를 참고해 다리·팔·발을 프레임마다 손으로 다시 찍는다.
// 출력 = frames.mjs (Task 8이 그대로 복사하는 형식).  사용: node hand-refine.mjs > frames.mjs
// 안경 변형 비교(미리보기용): node hand-refine.mjs --variants > glasses-variants.mjs
import fs from "node:fs";
const recipe = JSON.parse(fs.readFileSync(new URL("./player.poses.json", import.meta.url), "utf8"));
const HEAD_RECIPE = recipe.parts.head.rows; // 14x13, 캔버스 x=2 (레시피 원본 — 안경은 아래에서 덮어씀)

// ── 안경 수정 ───────────────────────────────────────────────────────────────
// 레시피 원본 안경은 먼 렌즈가 대각선으로 흩어져(g·o가 지그재그) 한쪽 눈이 깨져 보였다.
// 머리 그리드의 눈 줄(7~10행, 머리 좌표 14칸)만 통째로 바꿔 끼운다. 머리는 모든 프레임에 같은 그리드로 찍히므로
// (idle1·walk down +1행, land +2행 포함) 여기 한 곳만 고치면 11프레임 전부 바뀐다.
// 열 표기: 머리 좌표 x = 캔버스 열 - 2. 가까운 렌즈 = 왼쪽(귀 쪽), 먼 렌즈 = 오른쪽(3/4 측면이라 1px 좁음).
export const GLASSES = {
  // 두 렌즈 모두 4x4 동그란 테(모서리 비움), 7~10행. 테 안 2x2 = 피부 + 눈동자 1px(윗줄 오른쪽 → 우향 시선).
  // 브리지는 윗줄 10열 1px(양쪽 테 어깨와 대각선으로 이어져 아치처럼 보임), 안경다리는 5열 1px(귀 쪽 S 열 위).
  // 6행(앞머리 아래 이마)을 비워 둬 테가 머리카락에 붙지 않는다. 프로필의 큰 동그란 안경에 가장 가깝다.
  round44: { label: "round44 — 4x4 원형 두 개 (이마 비움, 아치 브리지)", rows: {
    7: ".ohgsggsgsggso", //  안경다리 5열 · 가까운 테 윗변 7·8열 · 브리지 10열 · 먼 테 윗변 12·13열
    8: ".ohSgsogsgsogo", //  눈동자 o: 가까운 8열 · 먼 13열(먼 테 오른쪽 벽이 얼굴 외곽에 닿음)
    9: "..oSgssgsgssgo", //  테 아래 안쪽 = 피부
    10: "...Ssggsssggo.", // 아랫변
  } },
  // round44와 같은 틀, 먼 렌즈만 3x4(11~13열)로 1px 좁혀 3/4 측면 느낌 + 얼굴 가장자리에 피부 1px.
  // 대신 먼 테 안쪽이 1px뿐이라 눈동자 줄(8행)이 g·o·g로 붙어 먼 눈이 막대처럼 보인다.
  round43: { label: "round43 — 가까운 4x4 + 먼 렌즈 3x4", rows: {
    7: ".ohgsggsgsgsso",
    8: ".ohSgsogsgogso",
    9: "..oSgssgsgsgso",
    10: "...Ssggsssgso.",
  } },
  // 3x3 고리 두 개, 눈동자 정중앙(컨트롤러 제안형), 7~9행. 가장 작지만 테 안에 피부가 없어
  // 눈동자(o)가 테(g)와 한 덩어리 — 3배·1배에서 선글라스처럼 보인다. 비교용.
  ring3: { label: "ring3 — 3x3 고리 두 개 (비교용)", rows: {
    7: ".ohSggggsgggso",
    8: ".ohSsgogggogso",
    9: "..oSsgggsgggso",
  } },
};
export const GLASSES_VARIANT = "round44"; // ← frames.mjs에 들어가는 안. 다른 안은 이름만 바꾸면 된다.
export const headWith = (name) => {
  if (name === "recipe") return HEAD_RECIPE;
  const v = GLASSES[name];
  if (!v) throw new Error(`unknown glasses variant ${name}`);
  return HEAD_RECIPE.map((r, y) => {
    const o = v.rows[y];
    if (o !== undefined && o.length !== r.length) throw new Error(`${name} row ${y}: width ${o.length}`);
    return o ?? r;
  });
};
const TORSO = recipe.parts.torso.rows; // 11x6, 캔버스 x=3

const blank = () => Array.from({ length: 24 }, () => Array(16).fill("."));
function stamp(c, grid, x0, y0) {
  grid.forEach((row, y) => [...row].forEach((ch, x) => {
    const X = x0 + x, Y = y0 + y;
    if (ch !== "." && X >= 0 && X < 16 && Y >= 0 && Y < 24) c[Y][X] = ch;
  }));
}
// 팔·다리 그리드: 16칸 폭 전체 행, '.'은 투명. y0 = 시작 행.
const LEGS = {
  stand: [19, [
    ".....oppppppo...",
    ".....oppooppo...",
    ".....oppooppo...",
    ".....offfoffff..",
    ".....fffffffff..",
  ]],
  contactA: [19, [
    ".....oppppppo...",
    "....oppoooppo...",
    "...oppo...oppo..",
    "...offo...offfo.",
    "...fff....fffff.",
  ]],
  downA: [20, [
    "....opppppppo...",
    "...oppo..oppo...",
    "...offfo.offfo..",
    "...ffff..fffff..",
  ]],
  passA: [19, [
    ".....oppppppo...",
    ".....oppoppo....",
    "....offoopppo...",
    "....fff.offfo...",
    "........fffff...",
  ]],
  contactB: [19, [
    ".....oppppppo...",
    "....oppoooppo...",
    "...oppo...oppo..",
    "...offo...offfo.",
    "...fff....fffff.",
  ]],
  downB: [20, [
    "....opppppppo...",
    "...oppo..oppo...",
    "...offfo.offfo..",
    "...ffff..fffff..",
  ]],
  passB: [19, [
    ".....oppppppo...",
    "......oppoppo...",
    ".....oppoooffo..",
    ".....offfo.ffo..",
    ".....fffff......",
  ]],
  tuck: [19, [
    ".....opppppppo..",
    ".....oppooopppo.",
    ".....oppo..oppo.",
    "....offo...offfo",
    "....fff.........",
  ]],
  reach: [19, [
    ".....oppppppo...",
    ".....oppooppo...",
    ".....oppooppo...",
    "....offo..offo..",
    "....fff...fff...",
  ]],
  squash: [20, [
    "...oppppppppo...",
    "..oppoo..ooppo..",
    "..offfo...offfo.",
    "..fffff...fffff.",
  ]],
};
// 팔: [x, y, 행들] — 몸통 위에 덮어 그린다(가까운 팔은 나중에).
const ARM = {
  down: [4, 14, ["odD", "odD", "odD", ".sS"]],
  fwd: [5, 14, ["ddD..", ".odD.", "..odD", "...sS"]],
  back: [2, 14, ["..odD", ".odD.", "odD..", "Ss..."]],
  up: [8, 11, ["....sS", "...odD", "..odD.", ".odD..", "odD..."]],
  out: [1, 12, ["Ss...", "odD..", ".odDD", "..odD"]],
};
const FAR = { // 먼 팔: 몸통 뒤에서 손만/소매만 보인다
  none: null,
  fwd: [13, 15, ["oD", "DS", "S."]],
  back: [2, 15, ["o.", "S."]],
  up: [13, 11, [".S", "oD", "D."]],
};
function frame({ hy = 0, ty = 13, legs = "stand", arm = "down", far = "none", tdy = 0 }, HEAD) {
  const c = blank();
  const fa = FAR[far];
  if (fa) stamp(c, fa[2], fa[0], fa[1] + tdy);
  const [ly, lg] = LEGS[legs];
  stamp(c, lg, 0, ly);
  stamp(c, TORSO, 3, ty);
  stamp(c, HEAD, 2, hy);
  const a = ARM[arm];
  stamp(c, a[2], a[0], a[1] + tdy);
  return c.map((r) => r.join(""));
}

export const buildFrames = (HEAD) => ({
  idle: [
    frame({}, HEAD),
    frame({ hy: 1 }, HEAD),
  ],
  walk: [
    frame({ legs: "contactA", arm: "back", far: "fwd" }, HEAD),
    frame({ hy: 1, ty: 14, tdy: 1, legs: "downA", arm: "back", far: "fwd" }, HEAD),
    frame({ legs: "passA", arm: "down" }, HEAD),
    frame({ legs: "contactB", arm: "fwd", far: "back" }, HEAD),
    frame({ hy: 1, ty: 14, tdy: 1, legs: "downB", arm: "fwd", far: "back" }, HEAD),
    frame({ legs: "passB", arm: "down" }, HEAD),
  ],
  jumpUp: [frame({ legs: "tuck", arm: "up", far: "back" }, HEAD)],
  fall: [frame({ legs: "reach", arm: "out", far: "up" }, HEAD)],
  land: [frame({ hy: 2, ty: 15, tdy: 1, legs: "squash", arm: "down" }, HEAD)],
});
export const FRAMES = buildFrames(headWith(GLASSES_VARIANT));

const PAL = `export const PAL_PLAYER = {
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
};`;
const fmtSet = (frames, ind = "") => Object.entries(frames).map(([k, fs]) =>
  `${ind}  ${k}: [\n${ind}    ` + fs.map((f) => "[\n" + f.map((r) => `${ind}      "${r}",`).join("\n") + `\n${ind}    ]`).join(`,\n${ind}    `) + `,\n${ind}  ],`).join("\n");
if (import.meta.url === `file://${process.argv[1]}` && process.argv.includes("--variants")) {
  // 미리보기 전용(안경 변형 비교): node hand-refine.mjs --variants > glasses-variants.mjs
  let s = "// 안경 변형 비교용 — hand-refine.mjs --variants 생성물. 게임은 frames.mjs만 쓴다.\n";
  s += `export const GLASSES_PICK = "${GLASSES_VARIANT}";\nexport const GLASSES_VARIANTS = {\n`;
  const all = [["recipe", "원래(수정 전) — 레시피 그대로"], ...Object.entries(GLASSES).map(([k, v]) => [k, v.label])];
  s += all.map(([k, label]) => `  ${k}: {\n    label: ${JSON.stringify(label)},\n    frames: {\n` +
    fmtSet(buildFrames(headWith(k)), "    ") + "\n    },\n  },").join("\n");
  s += "\n};\n";
  process.stdout.write(s);
} else if (import.meta.url === `file://${process.argv[1]}`) {
  const fmt = (f) => "[\n" + f.map((r) => `      "${r}",`).join("\n") + "\n    ]";
  let s = "// 플레이어 16x24 — Pixelbolt 0.20.0 poses 레시피 + 손질 (tools/art-src/player/pixelbolt/README.md)\n";
  s += "// 우향 3/4 측면. 좌향은 그리기 때 좌우 반전. 히트박스 12x20 = 열 2..13, 행 4..23.\n";
  s += PAL + "\n\nexport const PLAYER_FRAMES = {\n";
  s += Object.entries(FRAMES).map(([k, fs]) => `  ${k}: [\n    ` + fs.map(fmt).join(",\n    ") + ",\n  ],").join("\n");
  s += "\n};\n";
  process.stdout.write(s);
}
