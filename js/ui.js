// DOM 오버레이: 타이틀/스킵/음소거/토스트/보물 모달/모바일 터치 컨트롤.
// 게임 로직은 모른다. 게임↔UI는 콜백으로만 통신.
import { PROFILE, HIGHLIGHTS, PROJECTS, SKILLS, LINKS } from "../data/portfolio.js";

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function initUI({ input, audio, onStart, onSkip, onClose }) {
  buildModal();

  // 타이틀
  $("btn-start").addEventListener("click", onStart);
  $("btn-skip-title").addEventListener("click", onSkip);
  $("skip").addEventListener("click", onSkip);

  // 모달 닫기
  $("modal-close").addEventListener("click", onClose);
  $("modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") onClose();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.dataset.state === "modal") onClose();
  });

  // 음소거
  const muteBtn = $("mute");
  const renderMute = () => {
    muteBtn.textContent = audio.enabled ? "🔊" : "🔇";
    muteBtn.setAttribute("aria-pressed", String(!audio.enabled));
    muteBtn.setAttribute("aria-label", audio.enabled ? "소리 끄기" : "소리 켜기");
  };
  renderMute();
  muteBtn.addEventListener("click", () => {
    audio.setEnabled(!audio.enabled);
    renderMute();
  });

  // 모바일 터치 컨트롤
  bindHold("t-left", "left", input);
  bindHold("t-right", "right", input);
  bindHold("t-jump", "jump", input);

  // 모달 포커스 트랩(Tab/Shift+Tab을 모달 내부로 순환)
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || document.body.dataset.state !== "modal") return;
    const f = $("modal").querySelectorAll(
      'button, a[href], [tabindex]:not([tabindex="-1"])'
    );
    if (!f.length) return;
    const first = f[0];
    const lastF = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      lastF.focus();
    } else if (!e.shiftKey && document.activeElement === lastF) {
      e.preventDefault();
      first.focus();
    }
  });

  return {
    // PDF 지연 로드: 모달을 처음 열 때만 <object>에 data 주입(초기 1.1MB 미로드)
    loadPdf() {
      const wrap = $("pdf-wrap");
      if (!wrap || getComputedStyle(wrap).display === "none") return;
      const obj = wrap.querySelector("object");
      if (obj && !obj.getAttribute("data") && obj.dataset.src) {
        obj.setAttribute("data", obj.dataset.src);
      }
    },
    toast(text) {
      const el = $("toast");
      el.textContent = text;
      el.classList.add("show");
      clearTimeout(el._t);
      el._t = setTimeout(() => el.classList.remove("show"), 1700);
    },
    setHud(coins, total) {
      $("hud-count").textContent = `${coins}/${total}`;
    },
    updateChestHint(atChest) {
      $("t-jump").textContent = atChest ? "열기" : "↑";
      $("chest-prompt").style.display = atChest ? "block" : "none";
    },
    focusModal() {
      $("modal-close").focus();
    },
  };
}

function bindHold(id, key, input) {
  const el = $(id);
  const on = (e) => {
    e.preventDefault();
    input[key] = true;
  };
  const off = (e) => {
    e.preventDefault();
    input[key] = false;
  };
  el.addEventListener("pointerdown", on);
  el.addEventListener("pointerup", off);
  el.addEventListener("pointerleave", off);
  el.addEventListener("pointercancel", off);
}

function buildModal() {
  const highlights = HIGHLIGHTS.map((h) => `<span class="chip">${esc(h)}</span>`).join("");
  const skills = SKILLS.map((s) => `<span class="skill">${esc(s)}</span>`).join("");
  const projects = PROJECTS.map(
    (p, i) => `
      <div class="proj">
        <div class="proj-head"><span class="proj-no">${i + 1}</span>
          <div><div class="proj-title">${esc(p.title)}</div>
          <div class="proj-meta">${esc(p.period)} · ${esc(p.role)}</div></div>
        </div>
        <div class="proj-impact">${esc(p.impact)}</div>
      </div>`
  ).join("");

  $("modal").innerHTML = `
    <div class="modal-card" role="document">
      <button id="modal-close" class="modal-close" aria-label="닫기">✕</button>
      <div class="treasure-burst">🎉 보물 획득!</div>
      <h1 class="m-name">${esc(PROFILE.name)} <span>· ${esc(PROFILE.title)}</span></h1>
      <p class="m-tagline">${esc(PROFILE.tagline)}</p>
      <p class="m-intro">${esc(PROFILE.intro)}</p>
      <div class="chips">${highlights}</div>

      <div class="m-actions">
        <a class="btn primary" href="${esc(LINKS.resumePdf)}" target="_blank" rel="noopener">📄 포트폴리오 새 탭에서 열기</a>
        <a class="btn" href="${esc(LINKS.resumePdf)}" download>⬇ PDF 다운로드</a>
        <a class="btn" href="${esc(LINKS.github)}" target="_blank" rel="noopener">GitHub</a>
        <a class="btn" href="mailto:${esc(LINKS.email)}">✉ 이메일</a>
      </div>

      <div id="pdf-wrap" class="pdf-wrap">
        <object data-src="${esc(LINKS.resumePdf)}#view=FitH" type="application/pdf" aria-label="포트폴리오 PDF">
          <p class="pdf-fallback">PDF를 인라인으로 표시할 수 없습니다. 위의 ‘새 탭에서 열기’ 버튼을 이용해주세요.</p>
        </object>
      </div>

      <h2 class="m-h2">주요 프로젝트</h2>
      <div class="projects">${projects}</div>

      <h2 class="m-h2">기술 스택</h2>
      <div class="skills">${skills}</div>
    </div>`;
}
