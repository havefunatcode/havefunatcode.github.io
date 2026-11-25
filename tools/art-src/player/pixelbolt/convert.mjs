// Pixelbolt 렌더 결과(frames/<이름>.png, 1배) → PAL_PLAYER 문자열 프레임.
// 의존성 없음: PNG(8bit RGBA/RGB/팔레트, 비인터레이스)를 zlib로 직접 푼다.
// 색은 PAL_PLAYER에서 RGB 거리가 가장 가까운 키로 양자화(알파 < 128 → ".").
// 사용: node convert.mjs <bundle/frames 폴더> > draft.json
//   출력: { "<pixelbolt 프레임 이름>": [24줄 문자열], ... }  (손질 전 초안)
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";

export const PAL_PLAYER = {
  o: "#2a2428", h: "#26232a", H: "#3e3a44", s: "#f0c4a2", S: "#d8a084", g: "#56525a",
  m: "#b07060", c: "#383e3e", d: "#4e5654", D: "#3c4444", l: "#a6aaa6", p: "#454a62", f: "#2e2a32",
};
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const KEYS = Object.entries(PAL_PLAYER).map(([k, v]) => [k, rgb(v)]);

function decodePng(buf) {
  let off = 8, w, h, ct, plte = null, trns = null; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString("ascii", off + 4, off + 8), data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; if (data[8] !== 8 || data[12]) throw new Error("8bit non-interlaced only"); }
    else if (type === "PLTE") plte = data; else if (type === "tRNS") trns = data; else if (type === "IDAT") idat.push(data);
    off += 12 + len;
  }
  const bpp = { 6: 4, 2: 3, 3: 1, 4: 2, 0: 1 }[ct], raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp;
  const out = Buffer.alloc(w * h * 4), prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      cur[i] = (line[i] + [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f]) & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, s = x * bpp;
      if (ct === 6) cur.copy(out, o, s, s + 4);
      else if (ct === 2) { cur.copy(out, o, s, s + 3); out[o + 3] = 255; }
      else if (ct === 3) { const i = cur[s]; plte.copy(out, o, i * 3, i * 3 + 3); out[o + 3] = trns && i < trns.length ? trns[i] : 255; }
      else if (ct === 4) { out[o] = out[o + 1] = out[o + 2] = cur[s]; out[o + 3] = cur[s + 1]; }
      else { out[o] = out[o + 1] = out[o + 2] = cur[s]; out[o + 3] = 255; }
    }
    cur.copy(prev);
  }
  return { w, h, px: out };
}

export function toStrings(file) {
  const { w, h, px } = decodePng(fs.readFileSync(file));
  const rows = [];
  for (let y = 0; y < h; y++) {
    let r = "";
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (px[o + 3] < 128) { r += "."; continue; }
      let best = ".", bd = Infinity;
      for (const [k, [R, G, B]] of KEYS) { const d = (px[o] - R) ** 2 + (px[o + 1] - G) ** 2 + (px[o + 2] - B) ** 2; if (d < bd) { bd = d; best = k; } }
      r += best;
    }
    rows.push(r);
  }
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  const out = {};
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".png")).sort()) out[f.replace(/\.png$/, "")] = toStrings(path.join(dir, f));
  process.stdout.write(JSON.stringify(out, null, 1) + "\n");
}
