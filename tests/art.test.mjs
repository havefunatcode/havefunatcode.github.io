// 팔레트·스프라이트 검증 단위테스트. 실행: node tests/art.test.mjs
import { validateSprite } from "../js/art/check.js";
import { B, SKY_KEYS, skyAt } from "../js/art/palette.js";

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

ok(validateSprite(["ab","ba"], {a:"#000",b:null}, {w:2,h:2}).length === 0, "valid sprite");
ok(validateSprite(["ab","b"], {a:"#000",b:null}, {w:2,h:2}).some(e => /row 1/.test(e)), "row length error");
ok(validateSprite(["ax","ba"], {a:"#000",b:null}, {w:2,h:2}).some(e => /'x'/.test(e)), "unknown key error");
ok(validateSprite(["ab"], {a:"#000",b:null}, {w:2,h:2}).some(e => /height/.test(e)), "height error");
ok(SKY_KEYS.length === 3 && SKY_KEYS[1].t === 0.5, "3 keyframes");
ok(SKY_KEYS[1].sky.join() === "#9fb8d8,#b9c9dc,#d8d6d8,#efd8c8,#f6e2cc", "dawn sky = spec §5.1");
ok(skyAt(0).sunXr === 0.15 && skyAt(1).sunXr === 0.5 && skyAt(0).sunR === 30 && skyAt(1).sunR === 22, "sun path kept (spec §5.1)");
ok(skyAt(-1).sunY === skyAt(0).sunY && skyAt(2).sunY === skyAt(1).sunY, "clamped");
ok(skyAt(0).starA > 0.9 && skyAt(1).starA === 0, "stars only at evening");

console.log(`\n${fail === 0 ? "✅" : "❌"} art tests: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
