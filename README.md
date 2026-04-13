# AHP 전문가 설문 시스템

(사)해외농업자원개발협회 해농공매 물량 배분 AHP 전문가 설문·분석·PDF 증빙 SaaS

## 기능 개요

- **응답자 설문**: 토큰 기반 공개 URL, 6개 쌍대비교 문항, 전자서명, 제출 확인
- **관리자 대시보드**: 응답 현황, CR 검증, 자동 보정, 4개·3개 항목 독립 분석
- **PDF 생성**: 응답자 개별 확인서(3p) + 집단 분석 보고서(7p), 한국어 NanumGothic
- **Excel 내보내기**: 응답자 목록·가중치·개별 응답값 4개 시트
- **데이터 무결성**: SHA-256 해시로 제출 원본 위변조 감지

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 App Router + TypeScript strict |
| 데이터베이스 | PostgreSQL (Supabase) + Prisma ORM v6 |
| 인증 | next-auth v5 (Credentials, JWT) |
| UI | Tailwind CSS + shadcn/ui + Recharts |
| PDF | pdf-lib + @pdf-lib/fontkit + NanumGothic.ttf |
| Excel | xlsx (SheetJS) |
| 테스트 | Jest + ts-jest (67개) |

## 로컬 개발 환경 설정

### 1. 저장소 복제 및 패키지 설치

```bash
git clone <repository-url>
cd ahp
npm install
```

### 2. 환경변수 설정

`.env.local` 파일을 생성하고 아래 항목을 채웁니다.

```env
# Supabase PostgreSQL (연결 풀러 포트 6543)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase 직접 연결 (마이그레이션용, 포트 5432)
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"

# next-auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# 관리자 계정
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="your-password"

# 공개 설정
NEXT_PUBLIC_ORG_NAME="(사)해외농업자원개발협회"
NEXT_PUBLIC_SURVEY_TOKEN="haenong-2026-r1"
```

Prisma CLI용 `.env` 파일도 생성합니다 (DB URL만 포함).

```env
DATABASE_URL="..."
DIRECT_URL="..."
```

### 3. DB 마이그레이션 및 시드

```bash
npx prisma migrate deploy
npx prisma db seed
```

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인합니다.

## 테스트

```bash
npm test           # 전체 실행 (67개)
npm run test:watch # 감시 모드
```

테스트 범위: AHP 수학 엔진 (calculator.ts), CR 보정 알고리즘 (adjuster.ts), 데이터 무결성 해시 (integrity.ts)

## 주요 URL

| 경로 | 설명 |
|------|------|
| `/survey/haenong-2026-r1` | 응답자 설문 (공개) |
| `/admin` | 관리자 대시보드 |
| `/admin/responses` | 응답자 목록 + PDF·XLSX 내보내기 |
| `/admin/analysis` | 집단 AHP 분석 (4개·3개 항목) |
| `/login` | 관리자 로그인 |

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/survey/[token]` | 설문 정보 조회 |
| POST | `/api/survey/submit` | 설문 제출 |
| GET | `/api/survey/pdf/[respondentId]` | 개별 확인서 PDF |
| GET | `/api/admin/responses` | 응답자 목록 |
| POST | `/api/admin/adjust` | CR 보정 시뮬레이션 |
| POST | `/api/admin/adjust/apply` | 보정 적용/취소 |
| POST | `/api/admin/analyze` | 집단 분석 실행 |
| GET | `/api/admin/results/[roundId]` | 분석 결과 조회 |
| POST | `/api/admin/pdf/report` | 보고서 PDF |
| GET | `/api/admin/export/[roundId]` | XLSX 내보내기 |

## Vercel 배포

1. GitHub 저장소 연결
2. Environment Variables에 `.env.local` 내용 입력
3. Build Command: `npx prisma generate && next build`
4. `public/fonts/NanumGothic.ttf` 파일이 저장소에 포함되어야 PDF 생성 가능

## 디렉터리 구조

```
src/
├── app/
│   ├── (survey)/survey/[token]/   # 응답자 설문
│   ├── (admin)/admin/             # 관리자 UI
│   └── api/                       # API 라우트
├── lib/
│   ├── ahp/calculator.ts          # AHP 수학 엔진 (유일한 계산 위치)
│   ├── ahp/adjuster.ts            # CR 보정 알고리즘
│   ├── pdf/                       # PDF 생성
│   ├── excel/                     # XLSX 생성
│   └── hash/integrity.ts          # SHA-256 무결성
├── services/                      # 비즈니스 로직 레이어
├── components/
│   ├── survey/                    # 설문 UI
│   └── admin/                     # 관리자 UI
├── locales/ko/                    # i18n 리소스 (3단계 대비)
└── types/index.ts
```

## 절대 원칙 (CLAUDE.md)

1. 원본 Answer 데이터 절대 수정 금지
2. CR 보정값은 CRAdjustment 테이블에만 저장
3. 응답자 PDF에 분석 결과(가중치/CR) 포함 금지
4. AHP 수학 계산은 `src/lib/ahp/calculator.ts` 하나에서만 수행
