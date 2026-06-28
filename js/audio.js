// Web Audio로 레트로 SFX를 합성한다(오디오 파일 0개). 기본 음소거 토글 + localStorage 기억.
export class Audio {
  constructor() {
    this.ctx = null;
    // 기본값: 소리 켜짐(첫 사용자 입력 전엔 무음). 사용자가 끈 적 있으면 기억.
    // 스토리지가 차단된 환경(샌드박스 iframe/사생활 모드)에서도 안전하게 폴백.
    let stored = null;
    try {
      stored = localStorage.getItem("sfx");
    } catch (_) {}
    this.enabled = stored !== "off";
  }

  // 사용자 제스처(시작 클릭)에서 호출 → AudioContext 생성/재개
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  setEnabled(on) {
    this.enabled = on;
    try {
      localStorage.setItem("sfx", on ? "on" : "off");
    } catch (_) {}
  }

  _beep(freq, dur, type = "square", vol = 0.15, slideTo = null) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  }

  jump() {
    this._beep(330, 0.14, "square", 0.12, 620);
  }

  coin() {
    this._beep(880, 0.06, "square", 0.12);
    this._beep(1320, 0.1, "square", 0.1, 1500);
  }

  fall() {
    this._beep(400, 0.25, "sawtooth", 0.12, 90);
  }

  treasure() {
    // 상승 아르페지오
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => setTimeout(() => this._beep(f, 0.16, "square", 0.13), i * 90));
  }
}
