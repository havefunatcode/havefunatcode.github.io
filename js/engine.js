// 게임 엔진: 루프, 입력 정규화, AABB 충돌, 중력/점프, 카메라.
// 핵심 물리는 순수 함수(stepPlayer/intersect)로 분리해 Node에서 단위테스트 가능.
// 브라우저 의존성(Game 클래스)은 sprites/audio를 생성자 주입으로 받는다 → 이 모듈은 import만으로 부작용 없음.

export const VIEW_W = 480;
export const VIEW_H = 270;
export const COIN_SIZE = 8; // 코인 스프라이트/히트박스 공유 크기(px)

// 물리 상수 (단위: px, 초)
export const PHYS = {
  GRAVITY: 1400,
  MOVE_SPEED: 132,
  JUMP_VEL: -430,
  MAX_FALL: 820,
  COYOTE: 0.08, // 발판에서 떨어진 직후 점프 허용 시간
};

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
  const ev = { jumped: false, landed: false, fell: false };
  const p = player;

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
    h: 16,
    vx: 0,
    vy: 0,
    grounded: false,
    coyote: 0,
    facing: 1,
    lastSafe: { x: level.start.x, y: level.start.y },
  };
}

// ───────────────────────────────────────────────────────────────
// 브라우저 전용 게임 컨트롤러 (sprites/audio 주입)
// ───────────────────────────────────────────────────────────────
export class Game {
  constructor({ ctx, level, sprites, audio, input, reduced = false, onCoin, onTreasure }) {
    this.ctx = ctx;
    this.level = level;
    this.sprites = sprites;
    this.audio = audio;
    this.input = input; // { left,right,jump } 불리언
    this.reduced = reduced; // prefers-reduced-motion
    this.sprites.reduced = reduced;
    this.onCoin = onCoin;
    this.onTreasure = onTreasure;

    this.state = "title"; // 'title' | 'play' | 'modal'
    this.player = makePlayer(level);
    this.cam = { x: 0 };
    this.coins = 0;
    this.totalCoins = level.coins.length;
    this.t = 0;
    this.prevJump = false;
    this.atChest = false;
    this.walkPhase = 0;
  }

  reset() {
    this.player = makePlayer(this.level);
    for (const c of this.level.coins) c.got = false;
    this.cam.x = 0;
    this.coins = 0;
    this.prevJump = false;
    this.atChest = false;
  }

  update(dt) {
    if (this.state !== "play") return;
    dt = Math.min(dt, 1 / 30);

    const jumpEdge = this.input.jump && !this.prevJump;
    this.prevJump = this.input.jump;

    // 보물상자 근접 시 점프키 = 열기
    this.atChest = intersect(this.player, this.level.chest);
    if (this.atChest && jumpEdge) {
      this.onTreasure?.();
      return;
    }

    const intent = {
      moveX: (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0),
      jump: jumpEdge,
    };

    const ev = stepPlayer(this.player, intent, this.level, dt);
    if (ev.jumped) this.audio.jump();
    if (ev.fell) this.audio.fall();

    // 코인 수집
    for (const c of this.level.coins) {
      if (!c.got && intersect(this.player, { x: c.x, y: c.y, w: COIN_SIZE, h: COIN_SIZE })) {
        c.got = true;
        this.coins++;
        this.audio.coin();
        this.onCoin?.(c.project);
      }
    }

    // 카메라
    this.cam.x = clamp(
      this.player.x + this.player.w / 2 - VIEW_W / 2,
      0,
      Math.max(0, this.level.worldWidth - VIEW_W)
    );

    // 걷기 애니메이션 위상
    if (intent.moveX !== 0 && this.player.grounded) this.walkPhase += dt * 10;
    else this.walkPhase = 0;

    this.t += dt;
  }

  render() {
    const ctx = this.ctx;
    const cam = this.cam;
    this.sprites.drawBackground(ctx, cam, this.t);

    ctx.save();
    ctx.translate(-Math.round(cam.x), 0);

    // 솔리드(지면/발판)
    for (const s of this.level.solids) this.sprites.drawTile(ctx, s);

    // 코인 (reduced-motion이면 진동 정지)
    for (const c of this.level.coins) {
      if (c.got) continue;
      const cy = this.reduced ? c.y : c.y + Math.sin(this.t * 4 + c.x) * 1.5;
      this.sprites.drawCoin(ctx, c.x, cy);
    }

    // 보물상자
    this.sprites.drawChest(ctx, this.level.chest, this.state === "modal", this.t);

    // 플레이어
    this.sprites.drawPlayer(ctx, this.player, this.walkPhase);

    ctx.restore();
    // HUD/힌트/안내 텍스트는 DOM(ui.js)에서 렌더 — 픽셀화 캔버스 텍스트 깨짐 방지
  }
}
