// 표시용 콘텐츠 데이터(단일 소스). 경력이 바뀌면 이 파일만 수정한다.
// 원천(정본): llm-wiki 04_reports/커리어/이력서-포트폴리오/이태호_이력서.md
// ⚠️ 00_sources/ 는 2026-06 구버전이다. 절대 그쪽을 소스로 삼지 말 것

export const PROFILE = {
  name: "이태호",
  title: "5년차 백엔드 개발자",
  tagline: "Billing · 번역 · Audit Log 도메인 설계 전담 · 레거시 현대화 · 오픈소스 기여",
  intro:
    "레거시 전환·결제·검색에서 '같은 동작'의 기준을 먼저 정하고 검증해 온 5년 차 백엔드 개발자입니다. 입사 때부터 미뤄지던 레거시 모놀리스 현대화를 약 6주 만에 끝냈습니다. 전환 범위·서비스 경계·합격 기준은 직접 정하고, 전환 전 동작을 사본으로 떠 두고 대조하는 일은 Claude Code로 매번 돌렸습니다. 12개 마이크로서비스로 구성된 차세대 SaaS에서 Billing, 번역, Audit Log 도메인의 설계·개발을 전담하고 있습니다.",
};

// 보물상자에서 강조할 핵심 성과(시선 끌기용). 상세는 PDF.
// ⚠️ 공개 문서 원칙: 회사 운영 수치(건수·사용자·고객사 수)는 정확값으로 쓰지 않는다 — 개괄 규모만
export const HIGHLIGHTS = [
  "레거시 모놀리스 Spring Boot 1.5 → 3.5 / JDK 21 전환 — 약 6주, 동등성 검증 127/127",
  "Billing 설계·개발 전담 — PG 동시성·멱등성 제어, 운영 데드락 근본 해결",
  "Billing 동작 보존 리팩터링 — 특성 테스트로 고정, 500줄 넘는 클래스 10 → 0",
  "검색 서버 재기동 3~4회/일 → 0회",
  "오픈소스 머지 기여 — Apache Druid · LINE Armeria · OpenFeign 외",
];

// 프로젝트(코인 7개와 1:1 매핑). 이력서 정본 10개 중 상위 7개, 정본 순서 그대로 — 암호화(2025)·공유 링크(2024)·상세보기(2023)는 PDF에만
export const PROJECTS = [
  {
    title: "레거시 특허 검색 모놀리스 현대화",
    period: "2026.08 ~ 2026.09",
    role: "전환 범위·서비스 경계·합격 기준·배포 순서 설계, 전환 실행 (AI 코딩 에이전트 협업)",
    impact:
      "Spring Boot 1.5 → 2.7 → 3.5 / JDK 21 단계 전환. 전환 전 동작을 API 응답 스냅샷·골든 파일로 추출해 대조(개발 환경 기준선 127/127 일치), 업그레이드 불가 문서 생성 스택을 전용 서비스로 분리, JVM 내장 Python 런타임을 Kotlin으로 포팅(골든 37/37), 소형 서비스 3개 흡수. 사본 비교 밖에서 나온 회귀 3건은 사후 복구 후 검증 체크리스트에 추가.",
  },
  {
    title: "B2B SaaS Billing 시스템 설계 및 개발",
    period: "2025.12 ~ 2026.02 · 운영·고도화 2026.04 ~ 2026.10",
    role: "결제 도메인 설계·개발 전담",
    impact:
      "PortOne PG 연동, 비관적 락·웹훅 멱등성으로 중복 결제 방지, AFTER_ROLLBACK + REQUIRES_NEW로 실패 이력을 별도 트랜잭션에 보존. SQS 비동기 토큰 차감의 데드락을 락 획득 순서 일원화로 해결하고, 7개월 넘게 운영하며 차감 기록 전량이 사용량과 금액 일치. 운영 중에는 시트 동시 삭제 경쟁(REPEATABLE READ 스냅샷)을 실DB 테스트로 재현해 READ_COMMITTED로 수정하고, 토큰 지급 누락 경로를 찾아 고침.",
  },
  {
    title: "Billing 동작 보존 리팩터링",
    period: "2026.10",
    role: "범위·동작 보존 기준·완료 판정 결정 (AI 코딩 에이전트로 구현·대조)",
    impact:
      "특성 테스트 약 750개(쿼리·락은 실DB)와 환불 금액 골든 CSV로 현재 동작을 먼저 고정한 뒤 거대 클래스를 단계별로 분해. 로그 호출 412곳을 전수 대조해 달라진 12곳 원복, 잠재 버그는 고치지 않고 별도 티켓으로 분리. 500줄 넘는 클래스 10개 → 0개, 구·신 서버 약 2.4만 건 조회 비교 차이 0.",
  },
  {
    title: "특허 문헌 번역 서비스 (DeepL API 연동)",
    period: "2025.09 ~ 2026.08",
    role: "번역 도메인 설계·개발 전담",
    impact:
      "언어 자동 감지 후 요청 크기 상한(128KiB)에 맞춰 청킹, 순차 호출을 Kotlin Coroutines 비동기 병렬 + 순서 보존 조합으로 전환. 청크 경계의 HTML·청구항 훼손을 보정하고, DeepL 키 풀 + Redisson 분산 rate limiter로 다중 파드 호출을 제어.",
  },
  {
    title: "워크스페이스 Audit Log 시스템 설계 및 개발",
    period: "2026.03 ~ 2026.04",
    role: "설계·개발 전담 · 6개 도메인 적용 가이드·코드 리뷰",
    impact:
      "@Auditable AOP로 도메인-감사 코드 분리, 트랜잭셔널 아웃박스 발행 + SQS DLQ·수동 redrive로 적재 실패 격리·복구(적재 실패 케이스를 시뮬레이션해 격리·복구 경로 검증). 보안 요건 미달로 보류됐던 엔터프라이즈 고객사들과의 신규 계약 체결에 기여.",
  },
  {
    title: "Keystone 검색 서버 안정화",
    period: "2025.02 ~ 2025.04",
    role: "검색 서버 장애 진단 및 성능 개선",
    impact:
      "ES 2.x→8.x 마이그레이션·wildcard 제거로 하루 3~4회 재기동을 0회로, Family 확장 속도 약 81% 단축(1분 18초→15초).",
  },
  {
    title: "차세대 특허 검색 서비스 (MSA)",
    period: "2025.08 ~ 2025.12",
    role: "아키텍처 설계 참여 · 결제·구독, 번역, 감사 로그 도메인 설계·구현",
    impact:
      "12개 마이크로서비스 MSA 설계 참여, 서비스 공통 SQS 모듈·GitHub Actions CI/CD·Redis 세션/인증 토큰 구현, Kubernetes 전환 설계 참여 · ArgoCD GitOps CD 전환 협업. 초거대 SaaS 정부과제 심사 통과.",
  },
];

export const SKILLS = [
  "Java", "Kotlin", "Spring Boot 3.5", "JPA", "MySQL",
  "Redis", "Elasticsearch", "Amazon SQS", "Resilience4j", "Kubernetes", "Docker", "AWS", "Claude Code",
];

export const LINKS = {
  resumePdf: "portfolio.pdf",
  github: "https://github.com/havefunatcode",
  email: "dlxogh561@gmail.com",
};
