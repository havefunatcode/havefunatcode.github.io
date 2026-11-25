// convert.mjs 결과(16x30 프레임) → 16x24 PLAYER_FRAMES 초안(frames.draft.mjs).
// 각 프레임을 "가장 아래 불투명 행 = 23행"이 되도록 내려 붙이고 위를 잘라 24행으로 만든다
// (게임이 몸 위치를 움직이므로 점프 템플릿의 상하 이동은 버리고 자세만 쓴다).
// 사용: node build-draft.mjs <bundle/frames 폴더> > frames.draft.mjs
import fs from "node:fs";
import path from "node:path";
import { toStrings, PAL_PLAYER } from "./convert.mjs";

const MAP = {
  idle: ["idle-inhale", "idle-exhale"],
  walk: ["walk-contact-a", "walk-down-a", "walk-passing-a", "walk-contact-b", "walk-down-b", "walk-passing-b"],
  jumpUp: ["jump-rise"],
  fall: ["jump-fall"],
  land: ["jump-land"],
};
const dir = process.argv[2];
function fit(rows) {
  let low = rows.length - 1;
  while (low > 0 && !/[^.]/.test(rows[low])) low--;
  const out = rows.slice(Math.max(0, low - 23), low + 1);
  while (out.length < 24) out.unshift(".".repeat(16));
  return out;
}
const frames = {};
for (const [k, names] of Object.entries(MAP)) frames[k] = names.map((n) => fit(toStrings(path.join(dir, n + ".png"))));
const fmt = (f) => "[\n" + f.map((r) => `      "${r}",`).join("\n") + "\n    ]";
let s = "// Pixelbolt 0.20.0 출력 → PAL_PLAYER 양자화 초안 (손질 전). build-draft.mjs가 생성.\n";
s += "export const PAL_PLAYER = " + JSON.stringify({ ".": null, ...PAL_PLAYER }) + ";\n";
s += "export const PLAYER_FRAMES = {\n" + Object.entries(frames).map(([k, fs]) => `  ${k}: [\n    ` + fs.map(fmt).join(",\n    ") + ",\n  ],").join("\n") + "\n};\n";
process.stdout.write(s);
