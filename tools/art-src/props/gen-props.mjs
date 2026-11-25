// 소품 스프라이트 다듬기 스크립트(저작용, 사이트에서 로드하지 않음). spec §5.4~5.6, 화풍 B.
// 코인은 Pixelbolt `coin` 프리셋(24x24, 6프레임) 초안의 폭 진행(12/10/5/3/5/10)과 테 구조를
// 8x8(8/6/4/2/4/6)로 옮긴 수작업 문자열, 상자·구름·나무는 아래 규칙(사각형·원 합집합 + 좌상단 광원 음영)으로 만든다.
//
//   node tools/art-src/props/gen-props.mjs   → js/art/props.js의 COIN_FRAMES·CHEST_FRAMES·CLOUDS·TREES 문자열 출력
//
// 키: 코인 a 하이라이트 b 기본 c 테두리 / 상자 W 나무 H 나무밝음 w 나무그늘 M 금속 m 금속그늘 g 빛(코인 하이라이트색)
//     구름 c 구름 s 구름그늘 / 나무 t 줄기 L 잎 h 잎밝음 s 잎그늘 / . 투명

const grid = (w, h) => Array.from({ length: h }, () => Array(w).fill("."));
const rect = (g, x, y, w, h, ch) => {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (g[yy] && xx >= 0 && xx < g[0].length) g[yy][xx] = ch;
};
const px = (g, x, y, ch) => rect(g, x, y, 1, 1, ch);
const rows = (g) => g.map((r) => r.join(""));
// 투명한 바깥 행·열 잘라내기(구름·나무)
function crop(lines) {
  const on = (r) => /[^.]/.test(r);
  let y0 = 0, y1 = lines.length - 1;
  while (!on(lines[y0])) y0++;
  while (!on(lines[y1])) y1--;
  const body = lines.slice(y0, y1 + 1);
  let x0 = Infinity, x1 = -1;
  for (const r of body) { const a = r.search(/[^.]/), b = r.length - 1 - [...r].reverse().join("").search(/[^.]/); if (a >= 0) { x0 = Math.min(x0, a); x1 = Math.max(x1, b); } }
  return body.map((r) => r.slice(x0, x1 + 1));
}

// ── 코인 8x8 × 6 (수작업; 4·5 = 2·1, 초안과 같은 왕복 회전) ──
const C0 = ["..cccc..", ".cabbbc.", "cabbcbbc", "cabbcbbc", "cabbcbbc", "cbbbcbbc", ".cbbbbc.", "..cccc.."];
const C1 = ["..cccc..", ".cabbcc.", ".cabcbc.", ".cabcbc.", ".cabcbc.", ".cbbcbc.", ".cbbbcc.", "..cccc.."];
const C2 = ["...cc...", "..cabc..", "..cabc..", "..cabc..", "..cabc..", "..cbbc..", "..cbbc..", "...cc..."];
const C3 = ["...cc...", "...ac...", "...ac...", "...bc...", "...bc...", "...bc...", "...bc...", "...cc..."];
const COIN_FRAMES = [C0, C1, C2, C3, C2, C1];

// ── 상자 32x28 × 4 (닫힘 / 열림1 / 열림2 / 열림+빛). 하단 정렬, 몸통 15~27행 공통 ──
const STRAPS = [5, 24]; // 금속 띠 x(3칸: M M m)
function body(g) {
  rect(g, 1, 15, 30, 13, "W");
  rect(g, 1, 15, 1, 13, "w"); // 왼 외곽(최암색 = 나무그늘)
  rect(g, 29, 15, 2, 13, "w"); // 오른 그늘면 2칸
  rect(g, 1, 27, 30, 1, "w"); // 바닥
  rect(g, 2, 21, 27, 1, "w"); // 판자 이음
  // 판자 위·왼 1px 나무 밝음(좌상단 광원). 금속 띠가 위에 덮는다.
  rect(g, 2, 15, 27, 1, "H"); rect(g, 2, 16, 1, 5, "H");
  rect(g, 2, 22, 27, 1, "H"); rect(g, 2, 23, 1, 4, "H");
  for (const sx of STRAPS) {
    rect(g, sx, 15, 2, 12, "M");
    rect(g, sx + 2, 15, 1, 12, "m");
    rect(g, sx, 27, 3, 1, "m");
  }
}
// 닫힌 뚜껑(위로 dy 이동 가능). 둥근 윗면 + 아래 금속 테 + 자물쇠판.
function lid(g, dy, lock = true) {
  rect(g, 3, 6 + dy, 26, 1, "w");
  rect(g, 1, 7 + dy, 30, 6, "W");
  px(g, 1, 7 + dy, "."); px(g, 30, 7 + dy, ".");
  px(g, 2, 7 + dy, "w"); px(g, 29, 7 + dy, "w");
  rect(g, 1, 8 + dy, 1, 5, "w");
  rect(g, 29, 8 + dy, 2, 5, "w");
  rect(g, 3, 7 + dy, 26, 1, "H"); rect(g, 2, 8 + dy, 1, 5, "H"); // 뚜껑 위·왼 밝음
  rect(g, 1, 13 + dy, 30, 1, "M");
  rect(g, 1, 14 + dy, 30, 1, "m");
  for (const sx of STRAPS) {
    rect(g, sx, 6 + dy, 3, 1, "m");
    rect(g, sx, 7 + dy, 2, 6, "M");
    rect(g, sx + 2, 7 + dy, 1, 6, "m");
  }
  if (lock) {
    rect(g, 13, 11 + dy, 6, 8, "M");
    rect(g, 18, 11 + dy, 1, 8, "m");
    rect(g, 13, 18 + dy, 6, 1, "m");
    rect(g, 15, 15 + dy, 2, 2, "w"); // 열쇠 구멍
  }
}
const CHEST_GLINT = { x: 14, y: 12 }; // 닫힘 프레임 자물쇠판 좌상단(반짝임 1px)

function chestClosed() {
  const g = grid(32, 28);
  body(g);
  lid(g, 0);
  return rows(g);
}
function chestOpen1() {
  const g = grid(32, 28);
  body(g);
  rect(g, 1, 12, 30, 3, "w"); // 틈 사이 안쪽(어두움, 옆벽 포함)
  rect(g, 9, 13, 14, 1, "g"); // 새어 나오는 빛 한 줄
  rect(g, 14, 15, 4, 2, "M"); rect(g, 17, 15, 1, 2, "m"); // 몸통 걸쇠
  lid(g, -3);
  return rows(g);
}
function chestOpen2() {
  const g = grid(32, 28);
  body(g);
  // 뒤로 젖혀 짧아 보이는 뚜껑(앞면 4행 + 테 2행)
  rect(g, 3, 3, 26, 1, "w");
  rect(g, 1, 4, 30, 4, "W");
  px(g, 1, 4, "."); px(g, 30, 4, ".");
  px(g, 2, 4, "w"); px(g, 29, 4, "w");
  rect(g, 1, 5, 1, 3, "w");
  rect(g, 29, 5, 2, 3, "w");
  rect(g, 3, 4, 26, 1, "H"); rect(g, 2, 5, 1, 3, "H");
  rect(g, 1, 8, 30, 1, "M");
  rect(g, 1, 9, 30, 1, "m");
  for (const sx of STRAPS) { rect(g, sx, 3, 3, 1, "m"); rect(g, sx, 4, 2, 4, "M"); rect(g, sx + 2, 4, 1, 4, "m"); }
  rect(g, 13, 7, 6, 4, "M"); rect(g, 18, 7, 1, 4, "m"); rect(g, 13, 10, 6, 1, "m");
  // 안쪽: 뒷벽 + 빛
  rect(g, 1, 10, 30, 5, "w");
  rect(g, 13, 10, 6, 1, "m");
  rect(g, 6, 12, 20, 2, "g");
  rect(g, 4, 14, 24, 1, "M");
  rect(g, 14, 15, 4, 2, "M"); rect(g, 17, 15, 1, 2, "m");
  return rows(g);
}
function chestGlow() {
  const g = grid(32, 28);
  body(g);
  // 완전히 열려 세워진 뚜껑 안쪽면(0~10행)
  rect(g, 3, 0, 26, 1, "w");
  rect(g, 1, 1, 30, 9, "W");
  px(g, 1, 1, "."); px(g, 30, 1, ".");
  px(g, 2, 1, "w"); px(g, 29, 1, "w");
  rect(g, 1, 2, 1, 8, "w");
  rect(g, 29, 2, 2, 8, "w");
  rect(g, 2, 5, 27, 1, "w"); // 안쪽면 판자 이음
  rect(g, 3, 1, 26, 1, "H"); rect(g, 2, 2, 1, 3, "H"); // 판자 위·왼 밝음
  rect(g, 2, 6, 27, 1, "H"); rect(g, 2, 7, 1, 2, "H");
  for (const sx of STRAPS) { rect(g, sx, 0, 3, 1, "m"); rect(g, sx, 1, 2, 9, "M"); rect(g, sx + 2, 1, 1, 9, "m"); }
  rect(g, 1, 10, 30, 1, "m");
  // 안쪽: 보물 더미(금속색 코인) + 빛
  rect(g, 1, 11, 30, 4, "w"); // 옆벽
  rect(g, 2, 11, 27, 4, "g");
  for (const [x, y] of [[4, 13], [8, 12], [12, 13], [17, 12], [21, 13], [25, 12]]) {
    rect(g, x, y, 3, 1, "M"); px(g, x + 2, y, "m");
    rect(g, x - 1, y + 1, 5, 2 - (y - 12), "M"); px(g, x + 3, y + 1, "m");
  }
  rect(g, 2, 14, 27, 1, "m");
  // 빛이 비친 뚜껑 안쪽 아래 가장자리(빛줄기 점선은 1x에서 구멍처럼 보여 뺐다 — 빛 연출은 이펙트 몫)
  rect(g, 8, 9, 16, 1, "g");
  rect(g, 14, 15, 4, 2, "M"); rect(g, 17, 15, 1, 2, "m");
  return rows(g);
}
const CHEST_FRAMES = [chestClosed(), chestOpen1(), chestOpen2(), chestGlow()];

// ── 원 합집합 마스크 ──
function blobMask(blobs, cut) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y, r] of blobs) { x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); }
  if (cut !== undefined) y1 = Math.min(y1, cut);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const m = Array.from({ length: h }, () => Array(w).fill(false));
  for (const [bx, by, r] of blobs)
    for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
      if (xx * xx + yy * yy > r * r - r * 0.3) continue; // 끝 1~3px 돌기 없이 둥글게
      const Y = by + yy - y0, X = bx + xx - x0;
      if (Y >= 0 && Y < h) m[Y][X] = true;
    }
  return { m, w, h, at: (x, y) => y >= 0 && y < h && x >= 0 && x < w && m[y][x] };
}

// ── 구름 3종: 바닥 평평, 아래 2행 + 오른·아래 윤곽 = 구름그늘(좌상단 광원) ──
const CLOUD_BLOBS = [
  [[0, 6, 6], [9, 3, 8], [20, 2, 9], [31, 5, 7], [39, 8, 4]], // 큰 것
  [[0, 5, 4], [8, 2, 6], [17, 4, 5], [24, 6, 3]], // 중간
  [[0, 3, 3], [6, 1, 4], [12, 3, 3]], // 작은 것
];
function cloud(blobs) {
  const cut = Math.max(...blobs.map(([, y]) => y)) + 2;
  const { w, h, at } = blobMask(blobs, cut);
  const g = grid(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!at(x, y)) continue;
    g[y][x] = y >= h - 2 || !at(x + 1, y + 1) ? "s" : "c";
  }
  return rows(g);
}
const CLOUDS = CLOUD_BLOBS.map((b) => crop(cloud(b)));

// ── 나무 3종: 잎 덩어리(원 합집합) + 줄기. 좌상단 테 2px = 잎밝음, 오른·아래 테 + 밑 2행 = 잎그늘 ──
const TREE_DEFS = [
  // 둥근 활엽수 ~24x36 (M2 게이트: 지면 위로 더 보이게 키움)
  { w: 26, h: 38, blobs: [[13, 8, 8], [7, 15, 7], [19, 15, 7], [13, 19, 7]], trunk: [12, 3], tufts: [[9, 5], [4, 13], [14, 12], [10, 18]] },
  // 키 큰 포플러 ~12x40
  { w: 14, h: 42, blobs: [[7, 7, 5], [7, 14, 6], [7, 22, 6], [7, 29, 5]], trunk: [6, 2], tufts: [[5, 5], [3, 13], [4, 21]] },
  // 작은 나무 ~18x26
  { w: 20, h: 28, blobs: [[10, 7, 6], [5, 12, 5], [15, 12, 5], [10, 13, 5]], trunk: [9, 2], tufts: [[7, 4], [3, 10], [11, 9]] },
];
function tree({ w, h, blobs, trunk, tufts }) {
  const g = grid(w, h);
  const { at: a0, w: mw } = blobMask(blobs);
  // blobMask는 최소 x,y를 0으로 옮긴다 → 정의 좌표계로 되돌린다
  const ox = Math.min(...blobs.map(([x, , r]) => x - r)), oy = Math.min(...blobs.map(([, y, r]) => y - r));
  const at = (x, y) => a0(x - ox, y - oy);
  let bottom = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (at(x, y)) bottom = Math.max(bottom, y);
  // 줄기: 잎 밑 2행부터 바닥까지
  const [tx, tw] = trunk;
  rect(g, tx, bottom - 1, tw, h - bottom + 1, "t");
  let top = h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (at(x, y)) top = Math.min(top, y);
  const mid = (top + bottom) / 2, cx = w / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!at(x, y)) continue;
    let ch = "L";
    // 좌상단 테 1px, 윗절반 왼쪽은 윗면도 밝게
    if (!at(x - 1, y - 1) || (!at(x, y - 1) && x < cx) || (!at(x - 1, y) && y < mid)) ch = "h";
    // 오른·아래 테 = 잎그늘(같은 계열 최암색 외곽), 밑 2행도 그늘
    if (!at(x + 1, y + 1) || (!at(x + 1, y) && y >= top + 2) || y >= bottom - 1) ch = "s";
    g[y][x] = ch;
  }
  // 잎 결: 밝은 점 2칸(가로) — 덩어리 안쪽 리듬
  for (const [x, y] of tufts) if (g[y][x] === "L") { g[y][x] = "h"; if (g[y][x + 1] === "L") g[y][x + 1] = "h"; }
  // 줄기 위 잎 그림자 1행
  for (let x = tx; x < tx + tw; x++) if (g[bottom + 1] && g[bottom + 1][x] === "t") g[bottom + 1][x] = "s";
  void mw;
  return rows(g);
}
const TREES = TREE_DEFS.map((d) => crop(tree(d)));

const fmt = (name, frames) =>
  `export const ${name} = [\n${frames.map((f) => `  [\n${f.map((r) => `    "${r}",`).join("\n")}\n  ],`).join("\n")}\n];`;
console.log(fmt("COIN_FRAMES", COIN_FRAMES));
console.log(fmt("CHEST_FRAMES", CHEST_FRAMES));
console.log(`export const CHEST_GLINT = { x: ${CHEST_GLINT.x}, y: ${CHEST_GLINT.y} };`);
console.log(fmt("CLOUDS", CLOUDS));
console.log(fmt("TREES", TREES));
