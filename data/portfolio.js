// 표시용 콘텐츠 데이터. 경력이 바뀌면 이 파일만 수정하면 된다.
// 원천: ~/Documents/Resume/wert_intelligence_career_final.md + Notion 이력서

export const PROFILE = {
  name: "이태호",
  title: "4년차 서버 개발자",
  tagline: "대용량 데이터 처리 · 시스템 아키텍처 개선 · 서비스 안정화",
  intro:
    "기술로 비즈니스 목표 달성에 기여해 온 서버 개발자입니다. 복잡한 문제를 끝까지 파고들어 실질적인 성과로 만드는 데 강점이 있습니다.",
};

// 보물상자에서 보여줄 핵심 성과(시선 끌기용). 상세는 PDF.
export const HIGHLIGHTS = [
  "검색 서버 재기동 3~4회/일 → 0회",
  "대용량 응답 속도 75%↓ (Timeout 해결)",
  "비로그인 공유링크 50만건 · OKR S등급",
  "크롤링 자동화로 업무 95%↑ (3시간→10분)",
];

// 프로젝트 7선 — 코인 7개와 1:1 매핑(index 순서 = 최신순)
export const PROJECTS = [
  {
    title: "개인정보 암호화 시스템 구축",
    period: "2025.06 ~ 2025.07",
    role: "암호화 시스템 설계 및 구현",
    impact:
      "MyBatis Interceptor 기반 하이브리드 암호화로 서비스 로직 변경 없이 보안 강화, ISO(27001/27017/27701/27018) 인증 기반 마련.",
  },
  {
    title: "Keystone 검색 서버 안정화",
    period: "2025.02 ~ 2025.04",
    role: "검색 서버 장애 처리 및 성능 개선",
    impact:
      "하루 3~4회 재기동되던 검색 서버를 안정화해 재기동 0회 달성, Family 확장 속도 92% 개선(1.3분→15초).",
  },
  {
    title: "비로그인 문헌 공유 시스템 구축",
    period: "2024.06 ~ 2024.12",
    role: "신규 피처 설계 및 개발",
    impact:
      "오픈 1개월 만에 공유 링크 50만 건 생성으로 신규 고객 유치, OKR 'S' 등급 달성.",
  },
  {
    title: "대용량 문헌 상세보기 성능 개선",
    period: "2023.04 ~ 2023.06",
    role: "데이터 구조 최적화 및 성능 개선",
    impact:
      "데이터 가공·압축(평균 95% 축소)으로 1.5MB+ 요청 시 Timeout 해결, 응답 속도 75% 단축.",
  },
  {
    title: "회원 후처리 로직 리팩토링",
    period: "2023.03 ~ 2023.04",
    role: "레거시 코드 리팩토링 및 모듈화",
    impact:
      "Command Pattern 적용으로 흩어진 후처리 로직 통합, 코드 중복 40% 감소·신규 기능 개발 기간 단축.",
  },
  {
    title: "Monday.com 연동 및 어드민 기능 분리",
    period: "2022.09 ~ 2023.04",
    role: "시스템 아키텍처 개선",
    impact:
      "RabbitMQ 도입으로 어드민 기능을 핵심 서비스에서 비동기 분리, 장애 전파 방지·전체 안정성 향상.",
  },
  {
    title: "공고 데이터 수집 자동화",
    period: "2022.07 ~ 2022.09",
    role: "크롤러 개발 및 자동화 시스템 구축",
    impact:
      "20여 개 사이트 크롤링·수집 자동화로 3시간 수작업을 10분으로 단축, 업무 효율 95% 개선.",
  },
];

export const SKILLS = [
  "Java", "Kotlin", "Spring Boot", "MySQL", "Linux",
  "Nginx", "Docker", "Git", "RabbitMQ", "MyBatis", "JLPT N2",
];

export const LINKS = {
  resumePdf: "portfolio.pdf",
  github: "https://github.com/havefunatcode",
  email: "dlxogh561@gmail.com",
};
