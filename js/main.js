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

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const input = { left: false, right: false, jump: false };
const audio = new Audio();

let prevState = "title";
let lastFocus = null; // 모달 열기 직전 포커스(닫을 때 복원)

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
  reduced,
  onCoin: (i) => ui.toast(`프로젝트 ${i + 1}. ${PROJECTS[i].title}`),
  onTreasure: () => openTreasure(),
});

const ui = initUI({
  input,
  audio,
  onStart: startGame,
  onSkip: () => {
    audio.unlock();
    openTreasure();
  },
  onClose: closeModal,
});

function startGame() {
  audio.unlock();
  game.reset();
  setState("play");
}

function openTreasure() {
  // 모달 진입 전 현재 화면/포커스를 기억 → 닫을 때 복귀
  if (game.state !== "modal") {
    prevState = game.state;
    lastFocus = document.activeElement;
  }
  audio.treasure();
  setState("modal");
  ui.loadPdf(); // 지연 로드: 모달을 처음 열 때만 PDF를 주입
  ui.focusModal();
}

function closeModal() {
  setState(prevState === "title" ? "title" : "play");
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

// ── 키보드 입력 ──────────────────────────────────────────────
const KEYS_LEFT = ["ArrowLeft", "a", "A"];
const KEYS_RIGHT = ["ArrowRight", "d", "D"];
const KEYS_JUMP = ["ArrowUp", "w", "W", " ", "Spacebar"];
const isInteractive = (el) =>
  el && ["BUTTON", "A", "INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);

addEventListener("keydown", (e) => {
  const st = document.body.dataset.state;
  // 타이틀에서 Enter/Space로 시작 (단, 버튼/링크에 포커스가 있으면 그쪽에 양보)
  if (st === "title" && (e.key === "Enter" || e.key === " ") && !isInteractive(document.activeElement)) {
    e.preventDefault();
    startGame();
    return;
  }
  // 플레이 중 점프키의 페이지 스크롤만 차단(모달/폼 포커스는 건드리지 않음)
  if (st === "play" && KEYS_JUMP.includes(e.key) && !isInteractive(document.activeElement)) {
    e.preventDefault();
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

// 창 포커스 상실/탭 전환 시 키 고착 방지(누른 채 Alt-Tab 등)
function clearInput() {
  input.left = input.right = input.jump = false;
  game.prevJump = false;
}
addEventListener("blur", clearInput);
addEventListener("pagehide", clearInput);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearInput();
});

// ── 반응형 캔버스(레터박스, 픽셀 유지) ──────────────────────────
function resize() {
  // 가로/세로 모두에 맞춰 축소 허용(1배 미만 허용) → 세로 모바일에서도 전체 폭이 들어옴
  const scale = Math.min(innerWidth / VIEW_W, innerHeight / VIEW_H);
  canvas.style.width = Math.floor(VIEW_W * scale) + "px";
  canvas.style.height = Math.floor(VIEW_H * scale) + "px";
}
addEventListener("resize", resize);
addEventListener("orientationchange", resize);
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
