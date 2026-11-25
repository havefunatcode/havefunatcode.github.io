// 게임 엔진: 루프, 입력 정규화, AABB 충돌, 중력/점프, 카메라.
// 핵심 물리는 순수 함수(stepPlayer/intersect)로 분리해 Node에서 단위테스트 가능.
// 브라우저 의존성(Game 클래스)은 sprites/audio를 생성자 주입으로 받는다 → 이 모듈은 import만으로 부작용 없음.

import { nextAnim } from "./anim.js";
import { createFxLayer } from "./fx.js";

export const VIEW_W = 480;
export const VIEW_H = 270;
export const COIN_SIZE = 8; // 코인 스프라이트/히트박스 공유 크기(px)
export const OPEN_SEC = 0.6; // 상자 열림 시퀀스 길이(초)
export const LAND_FX_MIN_VY = 200; // 이 착지 속도(px/s) 미만이면 착지 먼지 생략(리스폰 직후 작은 touchdown 등, spec §5.7)

// 물리 상수 (단위: px, 초)
export const PHYS = {
  GRAVITY: 1400,
  MOVE_SPEED: 132,
  JUMP_VEL: -430,
  MAX_FALL: 820,
  COYOTE: 0.08, // 발판에서 떨어진 직후 점프 허용 시간
};

// opening 중 Enter/Space 스킵 판정. OS 자동반복(repeat) keydown은 제외 — 누른 채 있으면 0.6초 전에 모달이 열리는 것 방지
export function isOpeningSkip(e, state, interactiveFocus) {
  return state === "opening" && !e.repeat && (e.key === "Enter" || e.key === " ") && !interactiveFocus;
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// AABB 교차 (a,b는 {x,y,w,h})
export function intersect(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// 순수 물리 1스텝. player를 직접 갱신하고 이벤트를 반환한다.
// intent: { moveX: -1|0|1, jump: boolean(엣지) }
export function stepPlayer(player, intent, level, dt) {
  const ev = { jumped: false, landed: false, fell: false, touchdown: false, impactVy: 0 };
  const p = player;
  const wasGrounded = p.grounded; // 점프 처리 전 착지 여부(touchdown 판정용)

  // 수평 속도
  p.vx = intent.moveX * PHYS.MOVE_SPEED;

  // 점프 (지면 또는 코요테 타임)
  const canJump = p.grounded || p.coyote > 0;
  if (intent.jump && canJump) {
    p.vy = PHYS.JUMP_VEL;
    p.grounded = false;
    p.coyote = 0;
    ev.jumped = true;
  }

  // 중력
  p.vy = Math.min(p.vy + PHYS.GRAVITY * dt, PHYS.MAX_FALL);

  // X 이동 + 해소
  p.x += p.vx * dt;
  for (const s of level.solids) {
    if (intersect(p, s)) {
      if (p.vx > 0) p.x = s.x - p.w;
      else if (p.vx < 0) p.x = s.x + s.w;
      p.vx = 0;
    }
  }

  // Y 이동 + 해소
  p.grounded = false;
  p.y += p.vy * dt;
  for (const s of level.solids) {
    if (intersect(p, s)) {
      if (p.vy > 0) {
        p.y = s.y - p.h;
        p.grounded = true;
        ev.landed = true;
        if (!wasGrounded) {
          ev.touchdown = true;
          ev.impactVy = p.vy; // vy = 0 이전의 착지 속도
        }
      } else if (p.vy < 0) {
        p.y = s.y + s.h;
      }
      p.vy = 0;
    }
  }

  // 코요테 타임 / 안전 위치 기록
  if (p.grounded) {
    p.coyote = PHYS.COYOTE;
    p.lastSafe = { x: p.x, y: p.y };
  } else {
    p.coyote = Math.max(0, p.coyote - dt);
  }

  if (intent.moveX !== 0) p.facing = intent.moveX > 0 ? 1 : -1;

  // 낙사 → 직전 안전 발판에서 리스폰
  if (p.y > level.deathY) {
    ev.fell = true;
    p.x = p.lastSafe.x;
    p.y = p.lastSafe.y;
    p.vx = 0;
    p.vy = 0;
    p.grounded = false;
  }

  return ev;
}

export function makePlayer(level) {
  return {
    x: level.start.x,
    y: level.start.y,
    w: 12,
    h: 20,
    vx: 0,
    vy: 0,
    grounded: false,
    coyote: 0,
    facing: 1,
    lastSafe: { x: level.start.x, y: level.start.y },
  };
}

// ───────────────────────────────────────────────────────────────
// 브라우저 전용 게임 컨트롤러 (sprites/audio/fx 주입)
// ───────────────────────────────────────────────────────────────
export class Game {
  constructor({ ctx, level, sprites, audio, input, reduced = false, fx, onCoin, onTreasure, onOpening }) {
    this.ctx = ctx;
    this.level = level;
    this.sprites = sprites;
    this.audio = audio;
    this.input = input; // { left,right,jump } 불리언
    this.reduced = reduced; // prefers-reduced-motion
    this.sprites.reduced = reduced;
    this.onCoin = onCoin;
    this.onTreasure = onTreasure;
    this.onOpening = onOpening;
    this.fx = fx ?? createFxLayer({ reduced }); // 앞 이펙트 레이어(reduced면 spawn이 no-op)

    this.state = "title"; // 'title' | 'play' | 'opening' | 'modal'
    this.player = makePlayer(level);
    this.cam = { x: 0 };
    this.viewW = VIEW_W; // 화면 비율에 따라 main에서 동적 갱신(세로 VIEW_H는 고정)
    this.coins = 0;
    this.totalCoins = level.coins.length;
    this.t = 0; // 물리·게임 시계(play에서만 흐름)
    this.animT = 0; // 그리기 시계(모든 state에서 흐름 — 타이틀·모달 뒤에서도 코인 회전, spec §5.4)
    this.prevJump = false;
    this.atChest = false;
    this.anim = null; // 플레이어 애니메이션 상태(anim.js nextAnim), 타이틀·reset 직후엔 null
    this.chestOpened = false; // 한 번 열면 true(모달을 닫아도 열린 채 유지, reset에서만 해제)
    this.openTimer = 0; // opening 경과 시간(초)
    this.openFired = true; // opening 종료(onTreasure 발사/취소) 후 true → 중복 발사 방지
  }

  reset() {
    this.player = makePlayer(this.level);
    for (const c of this.level.coins) c.got = false;
    this.cam.x = 0;
    this.coins = 0;
    this.prevJump = false;
    this.atChest = false;
    this.anim = null;
    this.chestOpened = false;
    this.openTimer = 0;
    this.openFired = true;
  }

  // 스킵 버튼 등 외부에서 opening을 끊을 때: 이 시퀀스에서 onTreasure가 더는 나가지 않게 한다.
  // state 전환은 호출자(main.js)가 맡는다.
  cancelOpening() {
    if (this.state === "opening") this.openFired = true;
  }

  update(dt) {
    dt = Math.min(dt, 1 / 30); // 탭 전환 등 거대 dt 방지(opening이 한 프레임에 끝나지 않게)
    this.animT += dt;
    // 이펙트는 play와 opening(0.6초 연출 중에도 계속)에서만 흐른다
    if (this.state === "play" || this.state === "opening") this.fx.update(dt);

    // opening 중에도 점프 엣지를 계속 추적 → 누른 채 도착해도 새 엣지가 아니면 스킵되지 않음
    const jumpEdge = this.input.jump && !this.prevJump;
    if (this.state === "opening") {
      this.prevJump = this.input.jump;
      if (this.openFired) return;
      this.openTimer += dt;
      // 플레이어는 제자리 idle(이동 입력 무시)
      this.player.vx = 0;
      this.anim = nextAnim(this.anim, this.player, null, { moveX: 0, jump: false }, dt, { reduced: this.reduced });
      if (jumpEdge || this.openTimer >= OPEN_SEC) {
        this.openFired = true;
        this.onTreasure?.();
      }
      return;
    }
    if (this.state !== "play") return;
    this.prevJump = this.input.jump;

    // 보물상자 근접 시 점프키 = 열기
    this.atChest = intersect(this.player, this.level.chest);
    if (this.atChest && jumpEdge) {
      if (this.reduced || this.chestOpened) {
        this.chestOpened = true;
        this.onTreasure?.(); // 이미 열렸거나 reduced-motion: 연출 없이 즉시 모달
      } else {
        this.chestOpened = true;
        this.openTimer = 0;
        this.openFired = false;
        this.state = "opening";
        const ch = this.level.chest;
        this.fx.spawn("chest", ch.x + 22, ch.y + 8); // 상자 스프라이트(32x28) 윗변 가운데
        this.onOpening?.();
      }
      return;
    }

    const intent = {
      moveX: (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0),
      jump: jumpEdge,
    };

    const ev = stepPlayer(this.player, intent, this.level, dt);
    this.anim = nextAnim(this.anim, this.player, ev, intent, dt, { reduced: this.reduced });
    if (ev.jumped) this.audio.jump();
    if (ev.touchdown && ev.impactVy >= LAND_FX_MIN_VY) {
      const p = this.player;
      this.fx.spawn("land", p.x + p.w / 2, p.y + p.h, { impactVy: ev.impactVy });
    }
    if (ev.fell) this.audio.fall();

    // 코인 수집
    for (const c of this.level.coins) {
      if (!c.got && intersect(this.player, { x: c.x, y: c.y, w: COIN_SIZE, h: COIN_SIZE })) {
        c.got = true;
        this.coins++;
        this.audio.coin();
        this.fx.spawn("coin", c.x + COIN_SIZE / 2, c.y + COIN_SIZE / 2);
        this.onCoin?.(c.project);
      }
    }

    // 카메라 (동적 가로 폭 기준)
    this.cam.x = clamp(
      this.player.x + this.player.w / 2 - this.viewW / 2,
      0,
      Math.max(0, this.level.worldWidth - this.viewW)
    );

    this.t += dt;
  }

  render() {
    const ctx = this.ctx;
    const cam = this.cam;
    // 진행도(0=시작/저녁 → 1=보물상자/오전): 카메라가 얼마나 전진했는지
    const denom = Math.max(1, this.level.worldWidth - this.viewW);
    const progress = clamp(cam.x / denom, 0, 1);
    // 배경 시간 = 그리기 시계 animT → 타이틀에서도 구름 표류·별 반짝임(reduced면 background.js가 정지)
    this.sprites.drawBackground(ctx, cam, this.animT, this.viewW, progress);

    ctx.save();
    ctx.translate(-Math.round(cam.x), 0);

    // 코인 (그리기 시계 animT로 회전·흔들림 — reduced-motion이면 둘 다 정지)
    for (const c of this.level.coins) {
      if (c.got) continue;
      const cy = this.reduced ? c.y : c.y + Math.sin(this.animT * 4 + c.x) * 1.5;
      this.sprites.drawCoin(ctx, c.x, cy, this.animT);
    }

    // 보물상자: 한 번 열리면 chestOpened 유지, opening 동안 openT 0→1로 프레임 진행
    const openT = this.state === "opening" ? clamp(this.openTimer / OPEN_SEC, 0, 1) : 1;
    this.sprites.drawChest(ctx, this.level.chest, { opened: this.chestOpened, openT, near: this.atChest }, this.animT);

    // 플레이어
    this.sprites.drawPlayer(ctx, this.player, this.anim);

    // 솔리드(지면/발판) — 플레이어 다음: 히트박스 밖 머리카락이 발판 뒤로 들어가 보이게(spec §5.2)
    for (const s of this.level.solids) this.sprites.drawTile(ctx, s);

    ctx.restore();

    // 앞 이펙트(spec §5.2 순서: 배경 → 코인·상자 → 플레이어 → 타일 → 앞 이펙트). 카메라는 fx.draw가 직접 반영
    this.fx.draw(ctx, cam);
    // HUD/힌트/안내 텍스트는 DOM(ui.js)에서 렌더 — 픽셀화 캔버스 텍스트 깨짐 방지
  }
}
