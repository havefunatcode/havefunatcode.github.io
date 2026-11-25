// codixel 방식 플레이어 초안 생성기 (Task 7 step 1, spec §5.1/§5.2).
// 도구 코드는 레포에 넣지 않는다 — codixel을 /tmp/art-tools/codixel 에 클론해 두고 경로로 불러온다.
//
//   node tools/art-src/player/codixel/codixel-player.cjs \
//     --pixel=/tmp/art-tools/codixel/core/pixel.js \
//     --ref=$HOME/Downloads/havefunatcode_profile.png \
//     --out=<scratch 폴더>            # PNG·JSON은 레포 밖에만 쓴다
//     [--final=tools/art-src/player/codixel/frames.mjs]   # 손질본과 rig 초안의 차이(픽셀 수) 출력
//
// 단계(codixel SKILL.md §2):
//   1. ref  : 프로필 배경 제거(removeBg) → trim → 머리 crop → 고정 팔레트로 quantize → mode resize(9~12px)
//             → ref.png 시트. 정면 흉상이라 3/4 측면 기본 포즈의 실루엣·색 배치 참고용으로만 쓴다.
//   2. base : 위 결과를 보며 16x24 3/4 우향 기본 포즈를 문자열로 찍음(BASE, 손작업).
//   3. rig  : BASE를 4배(64x96)로 키워 P.Rig 뼈(torso·head·arm·thighB/shinB·thighF/shinF)를 붙이고
//             owners.png(ownerMap+bones)로 소유 영역 확인. 작은 스프라이트를 직접 돌리면 깨지므로
//             SKILL.md 권고대로 큰 이미지에서 돌린 뒤 프레임마다 다시 픽셀화(resize mode:true).
//   4. pose : idle 2 · walk 6 · jumpUp · fall · land 포즈 → 16x24로 축소 → PAL_PLAYER로 quantize
//             → 맨 아래 신발 행이 23행에 오도록 접지 → 문자열. rig-frames.json + rig-sheet.png.
//   5. 손질 : 결과 문자열을 frames.mjs로 옮겨 손으로 다듬는다(README 참고).
"use strict";
const fs = require("fs");
const path = require("path");

const arg = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const P = require(arg.pixel || "/tmp/art-tools/codixel/core/pixel.js");
const OUT = arg.out;
if (!OUT) throw new Error("--out=<scratch dir> 필요 (레포 밖)");
fs.mkdirSync(OUT, { recursive: true });

const PAL = {
  o: "#2a2428", h: "#26232a", H: "#3e3a44", s: "#f0c4a2", S: "#d8a084", g: "#56525a", m: "#b07060",
  c: "#383e3e", d: "#4e5654", D: "#3c4444", l: "#a6aaa6", p: "#454a62", f: "#2e2a32",
};
const KEYS = Object.keys(PAL);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const PAL_RGB = KEYS.map((k) => hex(PAL[k]));
const LIGHT_CHECK = { check: [[200, 214, 230], [190, 204, 222]] }; // 머리색이 기본 체커와 같아서 밝은 체커

// ---------- 1. ref ----------
if (arg.ref) {
  const ref = P.load(arg.ref);
  const nobg = P.removeBg(ref, { tol: 60, erode: 1 });
  const head = P.trim(P.crop(nobg, 270, 100, 480, 600));
  const q = P.quantize(head, 0, { palette: PAL_RGB }).buf; // 큰 크기에서 먼저 팔레트로
  const items = [{ buf: P.resize(head, 192), label: "ref" }];
  for (const w of [9, 10, 11, 12]) items.push({ buf: P.resize(q, w, { mode: true }), label: "q" + w, scale: 14 });
  P.save(P.sheet(items, { cols: 5, ...LIGHT_CHECK }), path.join(OUT, "ref.png"));
}

// ---------- 2. base (손작업, 3/4 우향) ----------
// 0..3행 = 히트박스 위 머리카락, 4..23행 = 히트박스(열 2..13). 광원 좌상단.
const BASE = [
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
  "..occdDddlcldo..",
  "..odddDddldlDo..",
  "..odddDddldlDo..",
  "..odddDdddddDo..",
  "..oDddDssdddDo..",
  "..oDDDDsSDDDDo..",
  "...opppppppo....",
  "...opppopppo....",
  "...opppopppo....",
  "...opppopppo....",
  "...offfoffffo...",
  "...offfoffffo...",
];

const toBuf = (rows) => {
  const b = new P.Buf(16, 24);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (PAL[ch]) b.pset(x, y, hex(PAL[ch])); }));
  return b;
};
const toRows = (buf) => {
  const rows = [];
  for (let y = 0; y < buf.h; y++) {
    let r = "";
    for (let x = 0; x < buf.w; x++) {
      const c = buf.px[y * buf.w + x];
      if (!(c >>> 24)) { r += "."; continue; }
      r += KEYS[P.nearest(PAL_RGB, P.unpack(c))];
    }
    rows.push(r);
  }
  return rows;
};

// ---------- 3. rig (4배) ----------
const S = 4;
const big = toBuf(BASE).scaled(S);
const R = (x, y) => [x * S, y * S]; // 스프라이트 좌표 → 4배 좌표
const box = (x0, y0, x1, y1) => [R(x0, y0), R(x1, y0), R(x1, y1), R(x0, y1)];
const rig = new P.Rig(big)
  .bone("torso", null, ...R(8, 18.5), ...R(8, 11), 0)
  .bone("head", "torso", ...R(9, 11), ...R(9, 1), 1)
  .bone("arm", "torso", ...R(7.5, 12.5), ...R(7.5, 17.5), 2)
  .bone("thighB", null, ...R(5.5, 19), ...R(5.5, 21), -2)
  .bone("shinB", "thighB", ...R(5.5, 21), ...R(5.5, 23.5), -2)
  .bone("thighF", null, ...R(9.5, 19), ...R(9.5, 21), -1)
  .bone("shinF", "thighF", ...R(9.5, 21), ...R(10, 23.5), -1)
  .bind({
    joint: 2,
    paint: {
      head: box(0, 0, 16, 11),
      torso: box(0, 11, 16, 19),
      arm: box(6, 12, 9, 18),
      thighB: box(0, 19, 8, 21),
      shinB: box(0, 21, 8, 24),
      thighF: box(8, 19, 16, 21),
      shinF: box(8, 21, 16, 24),
    },
  });
{
  const own = P.ruler(rig.ownerMap(), 3, { step: 4 * S }); // 눈금 = 스프라이트 4px
  rig.drawBones(own, 0, 0, {}, { scale: 3 });
  P.save(P.sheet([own, rig.legend()]), path.join(OUT, "owners.png"));
}

// ---------- 4. pose ----------
const walk = (i) => {
  const ph = (i / 6) * Math.PI * 2, c = Math.cos(ph), s = Math.sin(ph);
  return {
    thighF: -0.5 * c, shinF: 0.9 * Math.max(0, -s),
    thighB: 0.5 * c, shinB: 0.9 * Math.max(0, s),
    arm: 0.45 * c,
  };
};
const POSES = {
  idle: [{}, { torso: { a: 0, dy: S } }],
  walk: [0, 1, 2, 3, 4, 5].map(walk),
  jumpUp: [{ thighF: -1.0, shinF: 1.3, thighB: -0.4, shinB: 1.0, arm: -2.3 }],
  fall: [{ thighF: -0.3, shinF: 0.2, thighB: 0.35, shinB: 0.1, arm: -1.6 }],
  land: [{ torso: { a: 0, dy: 2 * S }, thighF: -0.9, shinF: 1.3, thighB: -0.7, shinB: 1.2, arm: -0.5 }],
};

const ground = (rows) => {
  // 맨 아래 불투명 행이 23행에 오도록 아래로 민다(발 가운데 앵커 = 바닥).
  let last = rows.length - 1;
  while (last >= 0 && !/[^.]/.test(rows[last])) last--;
  const k = rows.length - 1 - last;
  return k > 0 ? [...Array(k).fill(".".repeat(16)), ...rows.slice(0, rows.length - k)] : rows;
};

const RIG = {};
const sheetItems = [];
for (const [state, poses] of Object.entries(POSES)) {
  RIG[state] = poses.map((pose, i) => {
    const b = new P.Buf(16 * S, 24 * S);
    rig.draw(b, 0, 0, pose);
    const small = P.resize(b, 16, 24, { mode: true });
    const q = P.quantize(small, 0, { palette: PAL_RGB }).buf;
    const rows = ground(toRows(q));
    sheetItems.push({ buf: toBuf(rows), label: state + i, scale: 8 });
    return rows;
  });
}
fs.writeFileSync(path.join(OUT, "rig-frames.json"), JSON.stringify(RIG, null, 1));
P.save(P.sheet(sheetItems, { cols: 6, ...LIGHT_CHECK }), path.join(OUT, "rig-sheet.png"));
console.log("rig frames ->", path.join(OUT, "rig-frames.json"));

// ---------- 5. 손질본과 비교 ----------
if (arg.final) {
  import(path.resolve(arg.final)).then(({ PLAYER_FRAMES }) => {
    for (const [state, fr] of Object.entries(PLAYER_FRAMES)) fr.forEach((rows, i) => {
      const r = RIG[state]?.[i];
      let n = 0;
      if (r) for (let y = 0; y < 24; y++) for (let x = 0; x < 16; x++) if (rows[y][x] !== r[y][x]) n++;
      console.log(`${state}[${i}] hand-changed px vs rig: ${r ? n : "n/a"}`);
    });
  });
}
