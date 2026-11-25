// DOM 오버레이 화풍 B 재테마 검사(spec §5.15, §6-2). 실행: node tests/css.test.mjs
// style.css를 텍스트로 읽어 :root 팔레트·WCAG 대비·금지 색·각진 모서리·블러 없는 그림자를 확인한다.
import { readFileSync } from "node:fs";
import { B } from "../js/art/palette.js";

let pass = 0,
  fail = 0;
function ok(cond, msg) {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.error("  ✗ FAIL:", msg);
  }
}

const root = new URL("../", import.meta.url);
const css = readFileSync(new URL("css/style.css", root), "utf8");
const html = readFileSync(new URL("index.html", root), "utf8");
const favicon = readFileSync(new URL("favicon.svg", root), "utf8");
const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");

// :root 변수 파싱
const rootBlock = (noComments.match(/:root\s*\{([^}]*)\}/) || [, ""])[1];
const vars = {};
for (const m of rootBlock.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim();

// WCAG 상대휘도·대비
const lin = (c) => {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const lum = (hex) => {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const isHex6 = (v) => /^#[0-9a-fA-F]{6}$/.test(v || "");

// 1) 필수 변수 존재 + 6자리 hex
const NAMES = ["--bg", "--panel", "--panel-edge", "--ink", "--ink-soft", "--accent", "--accent-edge", "--focus"];
for (const n of NAMES) ok(isHex6(vars[n]), `:root ${n} 가 #rrggbb (${vars[n]})`);

// 2) palette.js B 값과 짝(주석에 짝 이름 표기 + 값이 B 팔레트 안에 있음)
const bValues = new Set(
  Object.values(B)
    .flat()
    .map((v) => String(v).toLowerCase()),
);
for (const n of NAMES) {
  ok(bValues.has(String(vars[n]).toLowerCase()), `${n} (${vars[n]}) 는 palette.js B 값`);
  const line = (css.match(new RegExp(`${n}\\s*:[^\\n]*`)) || [""])[0];
  ok(/palette\.js\s+B\./.test(line), `${n} 줄에 palette.js 짝 주석`);
}

// 3) WCAG AA
if (NAMES.every((n) => isHex6(vars[n]))) {
  const c = (a, b) => contrast(vars[a], vars[b]);
  ok(c("--ink", "--panel") >= 4.5, `--ink/--panel ≥4.5 (${c("--ink", "--panel").toFixed(2)})`);
  ok(c("--ink", "--bg") >= 4.5, `--ink/--bg ≥4.5 (${c("--ink", "--bg").toFixed(2)})`);
  ok(c("--ink-soft", "--panel") >= 4.5, `--ink-soft/--panel ≥4.5 (${c("--ink-soft", "--panel").toFixed(2)})`);
  ok(c("--ink-soft", "--bg") >= 4.5, `--ink-soft/--bg ≥4.5 (${c("--ink-soft", "--bg").toFixed(2)})`);
  ok(c("--ink", "--accent") >= 4.5, `버튼 글자(--ink)/--accent ≥4.5 (${c("--ink", "--accent").toFixed(2)})`);
  // 포커스 링은 비텍스트 UI → 3:1(WCAG 1.4.11) 이상, 바탕과 패널 둘 다
  ok(c("--focus", "--panel") >= 3, `--focus/--panel ≥3 (${c("--focus", "--panel").toFixed(2)})`);
  ok(c("--focus", "--bg") >= 3, `--focus/--bg ≥3 (${c("--focus", "--bg").toFixed(2)})`);
}
// 주 버튼(.btn.primary)은 --accent 바탕에 --ink 글자
const primary = (noComments.match(/\.btn\.primary\s*\{([^}]*)\}/) || [, ""])[1];
ok(/background\s*:\s*var\(--accent\)/.test(primary), ".btn.primary 바탕 = var(--accent)");
ok(/(^|[^-])color\s*:\s*var\(--ink\)/.test(primary), ".btn.primary 글자 = var(--ink)");

// 4) 금지 색: 검정, 옛 남색·쨍한 금색, rgba(0,0,0,..)
for (const [re, label] of [
  [/#000000\b/i, "#000000"],
  [/#000\b/i, "#000"],
  [/\bblack\b/i, "black"],
  [/rgba?\(\s*0\s*,\s*0\s*,\s*0\b/, "rgba(0,0,0)"],
  [/#0a0f1c|#16203a|#1a2748|#ffd24a/i, "옛 남색/금색"],
]) {
  ok(!re.test(css), `style.css에 ${label} 0건`);
  ok(!re.test(favicon), `favicon.svg에 ${label} 0건`);
}
// 옛 변수는 남지 않는다(고아 남색 방지)
for (const old of ["--gold", "--card", "--line"]) ok(!css.includes(old), `옛 변수 ${old} 제거`);

// 5) 각진 모서리·블러 0 그림자·그라디언트/블러 필터 없음
const radii = [...noComments.matchAll(/border-radius\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
ok(radii.every((v) => v === "0"), `border-radius 는 전부 0 (${radii.filter((v) => v !== "0").join(", ")})`);
const splitTop = (s) => {
  const out = [];
  let depth = 0,
    cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim());
};
const shadows = [...noComments.matchAll(/box-shadow\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
ok(shadows.length > 0, "box-shadow 픽셀 테두리 사용");
for (const v of shadows) {
  if (v === "none") continue;
  for (const sh of splitTop(v)) {
    const lens = sh
      .replace(/var\([^)]*\)|rgba?\([^)]*\)|#[0-9a-fA-F]+|inset/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    ok(lens.length < 3 || parseFloat(lens[2]) === 0, `box-shadow 블러 0: "${sh}"`);
  }
}
ok(!/gradient\(/.test(noComments), "그라디언트 없음(평면 픽셀 색)");
ok(!/backdrop-filter|filter\s*:\s*blur|text-shadow/.test(noComments), "블러 필터·text-shadow 없음");

// 6) 포커스 링: --focus, 2px 이상, 버튼·링크 모두
const focusRules = [...noComments.matchAll(/([^{}]*:focus-visible[^{}]*)\{([^}]*)\}/g)];
const focusSel = focusRules.map((m) => m[1]).join(",");
const focusBody = focusRules.map((m) => m[2]).join(";");
for (const s of ["button", "a", ".btn", ".tbtn"]) ok(focusSel.includes(s), `:focus-visible 셀렉터에 ${s}`);
const ow = focusBody.match(/outline\s*:\s*(\d+)px\s+solid\s+var\(--focus\)/);
ok(ow && +ow[1] >= 2, `포커스 링 outline ≥2px solid var(--focus) (${ow && ow[0]})`);

// 7) Task 9 회귀: opening 상태에서도 HUD·힌트·터치가 보인다
ok(/body\[data-state="opening"\]\s*#hud/.test(css), 'HUD 셀렉터에 body[data-state="opening"]');
ok(/body\[data-state="opening"\]\s*#hint/.test(css), '힌트 셀렉터에 body[data-state="opening"]');
ok(/body\.touch\[data-state="opening"\]\s*#touch/.test(css), 'touch 셀렉터에 body.touch[data-state="opening"]');
ok(/body\.touch\[data-state="opening"\]\s*#hint/.test(css), '터치 힌트 숨김에 opening');

// 8) index.html theme-color = --bg, favicon = B 상자 색·각진 모서리
const tc = (html.match(/name="theme-color"\s+content="([^"]+)"/) || [])[1];
ok(tc && vars["--bg"] && tc.toLowerCase() === vars["--bg"].toLowerCase(), `theme-color(${tc}) = --bg(${vars["--bg"]})`);
const favColors = new Set([...favicon.matchAll(/fill="(#[0-9a-fA-F]{6})"/g)].map((m) => m[1].toLowerCase()));
const chestSet = new Set([...B.chest4, B.chestHi, ...B.coin3].map((c) => c.toLowerCase()));
ok(favColors.size >= 4, `favicon 색 ${favColors.size}개`);
ok([...favColors].every((c) => chestSet.has(c)), `favicon 색은 chest4·chestHi·coin3 안 (${[...favColors].join(" ")})`);
ok(B.chest4.every((c) => favColors.has(c.toLowerCase())), "favicon에 chest4 4색 모두");
ok(!/\brx=|\bry=/.test(favicon), "favicon 둥근 모서리(rx/ry) 없음");

console.log(`\n${fail === 0 ? "✅" : "❌"} css tests: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
