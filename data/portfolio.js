// 표시용 콘텐츠 데이터(단일 소스). 경력이 바뀌면 이 파일만 수정한다.
// 원천: 00_sources/career/감사로그 포함 이력서.md (최신)

export const PROFILE = {
  name: "이태호",
  title: "4년차 백엔드 개발자",
  tagline: "Billing · Audit Log 도메인 단독 설계 · 대용량 검색 안정화",
  intro:
    "AI 활용으로 기술 문제 해결과 비즈니스 임팩트를 만들어내는 것을 즐기는 4년 차 백엔드 개발자입니다. 12개 마이크로서비스로 구성된 차세대 SaaS의 백엔드 아키텍처를 설계하고, Billing·Audit Log 시스템을 설계했습니다.",
};

// 보물상자에서 강조할 핵심 성과(시선 끌기용). 상세는 PDF.
// 강조: Billing · Audit Log / 제외: 비로그인 공유링크 · 크롤링 자동화 · 대용량 응답 속도
export const HIGHLIGHTS = [
  "Billing 시스템 단독 설계 — PortOne PG·동시성/멱등성 제어",
  "Audit Log 시스템 단독 설계 — 엔터프라이즈 3곳 신규 계약",
  "검색 서버 재기동 3~4회/일 → 0회 (무장애 운영)",
  "12개 MSA 차세대 SaaS 백엔드 아키텍처 설계",
];

// 프로젝트(코인 7개와 1:1 매핑, 최신순) — Billing·Audit Log를 앞세움
export const PROJECTS = [
  {
    title: "워크스페이스 Audit Log 시스템 설계 및 개발",
    period: "2026.03 ~ 2026.04",
    role: "아키텍처 단독 설계 · 6개 도메인 적용",
    impact:
      "@Auditable AOP로 도메인-감사 코드 분리, SQS DLQ + 수동 redrive로 이벤트 누락 0건 보장. 보안 요건 미달로 보류됐던 엔터프라이즈 고객사 3곳과 신규 계약 체결.",
  },
  {
    title: "B2B SaaS Billing 시스템 설계 및 개발",
    period: "2025.12 ~ 2026.02",
    role: "결제 도메인 아키텍처 단독 설계",
    impact:
      "PortOne PG 연동, 비관적 락·웹훅 멱등성으로 중복 결제 방지, REQUIRES_NEW로 실패 이력 100% 보존. SQS 비동기 토큰 차감의 데드락 장애를 분석·해결.",
  },
  {
    title: "차세대 특허 검색 서비스 (MSA)",
    period: "2025.08 ~ 2025.12",
    role: "신규 SaaS 백엔드 아키텍처 설계 주도",
    impact:
      "회원/결제/검색/번역 등 12개 마이크로서비스로 분리, SQS 비동기 통신, Kubernetes + ArgoCD GitOps CD 구축. 초거대 SaaS 정부과제 심사 통과.",
  },
  {
    title: "암호화 시스템 구축",
    period: "2025.06 ~ 2025.07",
    role: "DB 레벨 자동 암복호화 설계",
    impact:
      "MyBatis Interceptor 하이브리드 암호화로 서비스 코드 무수정 전면 적용. ISO 27001/27017/27018/27701 4종 인증 획득 기여.",
  },
  {
    title: "Keystone 검색 서버 안정화",
    period: "2025.02 ~ 2025.04",
    role: "검색 서버 장애 진단 및 성능 개선",
    impact:
      "ES 2.x→8.x 마이그레이션·wildcard 제거로 하루 3~4회 재기동을 0회로(이후 무장애), Family 확장 속도 92% 개선(1분 18초→15초).",
  },
  {
    title: "비로그인 문헌 공유 시스템 구축",
    period: "2024.06 ~ 2024.12",
    role: "신규 피처 설계 및 개발",
    impact:
      "UUID 기반 영구 공유 링크 + 구독 연동 접근 제어 설계. 오픈 1개월 만에 50만 건 생성, 분기 OKR 'S' 등급 달성.",
  },
  {
    title: "대용량 문헌 상세보기 성능 개선",
    period: "2023.04 ~ 2023.06",
    role: "데이터 구조 최적화 및 성능 개선",
    impact:
      "데이터 가공·압축(평균 95% 축소) + ScyllaDB 적재로 1.5MB+ 요청의 Timeout 해결, 응답 속도 75% 단축.",
  },
];

export const SKILLS = [
  "Java", "Kotlin", "Python", "Spring Boot", "JPA", "MySQL",
  "Redis", "Elasticsearch", "Amazon SQS", "Kubernetes", "Docker", "AWS",
];

export const LINKS = {
  resumePdf: "portfolio.pdf",
  github: "https://github.com/havefunatcode",
  email: "dlxogh561@gmail.com",
};
