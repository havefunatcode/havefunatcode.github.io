// 부트스트랩: 에셋(코드 생성)·입력·상태기계·게임 루프를 연결한다.
import { Game, VIEW_W, VIEW_H } from "./engine.js";
import { Sprites } from "./sprites.js";
import { Audio } from "./audio.js";
import { LEVEL } from "./level.js";
import { initUI } from "./ui.js";
import { PROJECTS } from "../data/portfolio.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = VIEW_W;
canvas.height = VIEW_H;
ctx.imageSmoothingEnabled = false;

const input = { left: false, right: false, jump: false };
const audio = new Audio();

let prevState = "title";
function setState(s) {
  game.state = s;
  document.body.dataset.state = s;
}

const game = new Game({
  ctx,
  level: LEVEL,
  sprites: Sprites,
  audio,
  input,
  onCoin: (i) => ui.toast(`프로젝트 ${i + 1}. ${PROJECTS[i].title}`),
  onTreasure: () => openTreasure(),
});

const ui = initUI({
  input,
  audio,
  onStart: () => {
    audio.unlock();
    game.reset();
    setState("play");
  },
  onSkip: () => {
    audio.unlock();
    openTreasure();
  },
  onClose: () => setState(prevState === "title" ? "title" : "play"),
});

function openTreasure() {
  // 모달 진입 전 현재 화면을 기억 → 닫을 때 그 화면으로 복귀
  // (보물상자 열기는 항상 play 중, 타이틀 스킵은 title, 플레이 중 스킵은 play)
  if (game.state !== "modal") prevState = game.state;
  audio.treasure();
  setState("modal");
  ui.focusModal();
}

// ── 키보드 입력 ──────────────────────────────────────────────
const KEYS_LEFT = ["ArrowLeft", "a", "A"];
const KEYS_RIGHT = ["ArrowRight", "d", "D"];
const KEYS_JUMP = ["ArrowUp", "w", "W", " ", "Spacebar"];

addEventListener("keydown", (e) => {
  if (KEYS_JUMP.includes(e.key)) e.preventDefault();
  if (document.body.dataset.state === "title" && (e.key === "Enter" || e.key === " ")) {
    ui_start();
    return;
  }
  if (KEYS_LEFT.includes(e.key)) input.left = true;
  if (KEYS_RIGHT.includes(e.key)) input.right = true;
  if (KEYS_JUMP.includes(e.key)) input.jump = true;
});
addEventListener("keyup", (e) => {
  if (KEYS_LEFT.includes(e.key)) input.left = false;
  if (KEYS_RIGHT.includes(e.key)) input.right = false;
  if (KEYS_JUMP.includes(e.key)) input.jump = false;
});
function ui_start() {
  audio.unlock();
  game.reset();
  setState("play");
}

// ── 반응형 캔버스(레터박스, 픽셀 유지) ──────────────────────────
function resize() {
  const scale = Math.max(1, Math.min(innerWidth / VIEW_W, innerHeight / VIEW_H));
  canvas.style.width = Math.floor(VIEW_W * scale) + "px";
  canvas.style.height = Math.floor(VIEW_H * scale) + "px";
}
addEventListener("resize", resize);
resize();

// 터치 디바이스면 터치 컨트롤 활성화
if (matchMedia("(pointer: coarse)").matches || "ontouchstart" in window) {
  document.body.classList.add("touch");
}

// ── 게임 루프 ────────────────────────────────────────────────
let last = performance.now();
function frame(now) {
  const dt = (now - last) / 1000;
  last = now;
  game.update(dt);
  game.render();
  ui.updateChestHint(game.atChest && game.state === "play");
  requestAnimationFrame(frame);
}
setState("title");
requestAnimationFrame(frame);

// 로컬 개발 환경에서만 디버그 훅 노출(프로덕션 도메인에는 노출 안 함)
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  window.__game = game;
  window.__setState = setState;
}
