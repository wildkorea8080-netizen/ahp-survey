# AHP SaaS — 프로젝트 마스터 문서

## 시스템 목적
AHP(계층분석법) 기반 온라인 설문·분석·PDF 증빙 SaaS
현재: 1단계(내부 운영용) → 향후 2단계(유료 서비스) → 3단계(글로벌)

## 3단계 로드맵 (설계 시 항상 고려)
1단계: 단일 조직 운영 (해농공매 AHP 설문)
2단계: 회원가입·결제·다수 사용자 대시보드
3단계: i18n 다국어 (한국어·영어 우선, 일어·중국어 확장)

## 절대 원칙
1. 원본 Answer 데이터 절대 수정 금지
2. CR 보정값은 CRAdjustment 테이블에만 저장
3. 응답자 PDF에 분석 결과(가중치/CR) 포함 금지
4. AHP 수학 계산은 src/lib/ahp/calculator.ts 하나에서만 수행
5. 모든 텍스트는 i18n 리소스로 분리 (2단계 대비)
6. 모든 비즈니스 로직은 서비스 레이어에 분리 (src/services/)
7. TypeScript strict mode 유지
8. 환경변수로 기능 플래그 제어 (NEXT_PUBLIC_FEATURE_*)

## 기술 스택
- Next.js 14 App Router + TypeScript
- PostgreSQL + Prisma ORM
- Tailwind CSS + shadcn/ui
- Recharts (차트)
- pdf-lib + fontkit (PDF 한글)
- next-auth v5 (1단계: 관리자 전용)
- zod (입력 검증)
- next-i18next (3단계 대비 구조만 준비)

## 디렉터리 구조
src/
├── app/
│   ├── (survey)/survey/[token]/    # 응답자 설문 (공개)
│   ├── (admin)/admin/              # 관리자 (인증)
│   └── api/
│       ├── survey/
│       └── admin/
├── lib/
│   ├── ahp/calculator.ts           # AHP 수학 엔진
│   ├── ahp/adjuster.ts             # CR 보정
│   ├── pdf/                        # PDF 생성
│   └── hash/integrity.ts
├── services/                       # 비즈니스 로직 레이어
│   ├── survey.service.ts
│   ├── analysis.service.ts
│   └── pdf.service.ts
├── components/
│   ├── survey/
│   └── admin/
├── locales/                        # i18n 리소스 (3단계 대비)
│   ├── ko/
│   │   ├── common.json
│   │   ├── survey.json
│   │   └── pdf.json
│   └── en/
│       ├── common.json
│       ├── survey.json
│       └── pdf.json
└── types/index.ts

## 세부 명세
- AHP 수학: docs/AHP_SPEC.md
- DB 구조: docs/DB_SCHEMA.md
- API 명세: docs/API_SPEC.md
- UI 규칙: docs/UI_SPEC.md
- 진행 상황: docs/PROGRESS.md
- 확장 계획: docs/ROADMAP.md
