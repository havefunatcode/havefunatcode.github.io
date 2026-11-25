// 지면·발판 타일 다듬기 스크립트(저작용, 사이트에서 로드하지 않음).
// Pixelbolt 초안(ground-draft.autotile.json → 16-tile cardinal 세트)의 구조
// (잔디 4~5단 + 그늘 2단, 왼면 dirtSh+dirtHi, 오른면 dirtSh 2칸, 흙 얼룩)를 규칙으로 옮기고
// 화풍 B 규칙(검은 외곽선 없음·좌상단 광원·충돌 윗면 = 타일 0행)에 맞게 다듬는다.
//
//   node tools/art-src/tiles/gen-tiles.mjs            → js/art/tiles.js에 붙일 문자열 출력
//   node tools/art-src/tiles/gen-tiles.mjs --recipe   → 확인용 Pixelbolt 레시피(JSON) 출력
//     (/tmp/art-tools/pixelbolt 에서 `npx pixelbolt inspect <file> --out sheet.png --scale 8`)
//
// 키: G 잔디 g 잔디그늘 D 흙 d 흙그늘 h 흙밝음 / P 발판 H 발판밝음 p 발판그늘 / . 투명

const W = 16;
const blank = (ch) => Array.from({ length: W }, () => Array(W).fill(ch));
const put = (t, x, y, ch) => { if (y >= 0 && y < t.length && x >= 0 && x < t[0].length) t[y][x] = ch; };
// 조약돌(좌상단 광원): 위·왼쪽 밝음, 아래·오른쪽 그늘
const pebble = (t, x, y) => {
  put(t, x + 1, y, "h");
  put(t, x, y + 1, "h"); put(t, x + 1, y + 1, "D"); put(t, x + 2, y + 1, "d");
  put(t, x + 1, y + 2, "d");
};

// 잔디 깊이(열마다): 0..depth-2 = G, depth-1 = g(잔디 최암색 = 외곽), depth = d(잔디 밑 그림자)
// → 잔디 아래 경계가 들쭉날쭉. 윗면(0행)은 평평하게 둔다(충돌선 y=230과 일치).
const TOP_DEPTH = [6, 7, 7, 6, 5, 6, 7, 8, 7, 6, 5, 6, 7, 7, 6, 5];
const grass = (t, depth) => {
  for (let x = 0; x < W; x++) {
    const dp = depth[x];
    for (let y = 0; y < dp - 1; y++) t[y][x] = "G";
    t[dp - 1][x] = "g";
    t[dp][x] = "d";
  }
  // 잎결(짧은 세로 그늘 점)
  for (const [x, y] of [[2, 2], [9, 1], [13, 3]]) if (y < depth[x] - 2) t[y][x] = "g";
};

function top() {
  const t = blank("D");
  grass(t, TOP_DEPTH);
  pebble(t, 10, 11);
  put(t, 3, 12, "d"); put(t, 5, 14, "h");
  return t;
}

// 끝 타일: 0~7행 = 윗모서리(잔디가 둥글게 꺾임), 8~15행 = 옆면 띠(8행 주기로 세로 반복).
// 몸통 열에서는 8~15행만 잘라 8px 띠로 반복해 그린다(js/sprites.js drawTile).
const END_DEPTH = [5, 6, 6, 5, 4, 5, 6, 6, 5, 5, 4, 5, 6, 6, 5, 5]; // 끝 타일은 ≤6 → 7행부터 흙
function end(side) {
  const t = blank("D");
  grass(t, END_DEPTH);
  const o = side === "left" ? 0 : W - 1; // 바깥 열
  const i = side === "left" ? 1 : W - 2; // 안쪽 열
  // 잔디 모서리: 0행 바깥 칸 비움(둥글게), 바깥 열은 잔디 최암색
  t[0][o] = ".";
  for (let y = 1; y < END_DEPTH[o]; y++) t[y][o] = "g";
  // 흙 옆면: 바깥 열 dirtSh, 안쪽 열 = 왼면 dirtHi(빛) / 오른면 dirtSh(그늘)
  for (let y = END_DEPTH[o]; y < W; y++) t[y][o] = "d";
  for (let y = END_DEPTH[i] + 1; y < W; y++) t[y][i] = side === "left" ? "h" : "d";
  // 8~15행 안쪽은 맨흙(8px 반복이 눈에 띄지 않게 얼룩 없음)
  return t;
}

function fill(v) {
  const t = blank("D");
  if (v === 0) {
    pebble(t, 4, 5);
    put(t, 11, 2, "d"); put(t, 12, 11, "h"); put(t, 2, 12, "d"); put(t, 9, 13, "d"); put(t, 13, 6, "d");
  } else {
    pebble(t, 10, 9);
    put(t, 3, 3, "d"); put(t, 4, 3, "d"); put(t, 6, 12, "h"); put(t, 13, 3, "d"); put(t, 2, 8, "h");
  }
  return t;
}

// 발판 3조각(8x14): 판자 2장(0~5행 / 7~12행), 0·6·13행 = platSh 이음/외곽, 1·7행 = platHi.
const PLAT = {
  left: [
    ".ppppppp",
    "pHHHHHHH",
    "pHPPPPPP",
    "pHPpPPPP",
    "pHPPPPPP",
    "pHPPPPPP",
    "pppppppp",
    "pHHHHHHH",
    "pHPPPPPP",
    "pHPpPPPP",
    "pHPPPPPP",
    "pHPPPPPP",
    "pPPPPPPP",
    ".ppppppp",
  ],
  // 가로 8px 주기로 이어 붙여도 이음새가 없어야 한다(0열과 7열이 맞물림).
  mid: [
    "pppppppp",
    "HHHHHHHH",
    "PPPPPPPP",
    "PPPppPPP",
    "PPPPPPPP",
    "PPPPPPPP",
    "pppppppp",
    "HHHHHHHH",
    "PPPPPPPP",
    "PPPPPPPP",
    "PPPPPPPP",
    "PPPPPPPP",
    "PPPPPPPP",
    "pppppppp",
  ],
  right: [
    "ppppppp.",
    "HHHHHHHp",
    "PPPPPPpp",
    "PPPPpPpp",
    "PPPPPPpp",
    "PPPPPPpp",
    "pppppppp",
    "HHHHHHHp",
    "PPPPPPpp",
    "PPPPpPpp",
    "PPPPPPpp",
    "PPPPPPpp",
    "PPPPPPpp",
    "ppppppp.",
  ],
};

const rows = (t) => t.map((r) => r.join(""));
const GROUND = { top: rows(top()), left: rows(end("left")), right: rows(end("right")), fill: [rows(fill(0)), rows(fill(1))] };

if (process.argv.includes("--recipe")) {
  const pal = {
    G: "#8fbf6a", g: "#6c9a4f", D: "#9c7458", d: "#7d5a44", h: "#b48a6a",
    P: "#b08458", H: "#caa074", p: "#7e5a3c",
  };
  const frames = [
    ["top", GROUND.top], ["left", GROUND.left], ["right", GROUND.right],
    ["fillA", GROUND.fill[0]], ["fillB", GROUND.fill[1]],
    ["platLeft", PLAT.left], ["platMid", PLAT.mid], ["platRight", PLAT.right],
  ].map(([name, r]) => ({ name, ops: [{ op: "grid", x: 0, y: 0, rows: r }] }));
  console.log(JSON.stringify({ version: 1, name: "tilesB", width: 16, height: 16, palette: pal, frames, animations: {} }, null, 1));
} else {
  const js = (r) => "[\n" + r.map((s) => `    "${s}",`).join("\n") + "\n  ]";
  console.log(`export const GROUND = {\n  top: ${js(GROUND.top)},\n  left: ${js(GROUND.left)},\n  right: ${js(GROUND.right)},\n  fill: [${js(GROUND.fill[0])}, ${js(GROUND.fill[1])}],\n};`);
  console.log(`export const PLAT = {\n  left: ${js(PLAT.left)},\n  mid: ${js(PLAT.mid)},\n  right: ${js(PLAT.right)},\n};`);
}
