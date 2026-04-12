# DB 스키마 명세

## 2단계 확장 고려 설계
- tenantId 필드 준비 (2단계 멀티테넌트 대비)
- locale 필드 준비 (3단계 다국어 대비)
- 결제 관련 테이블 스텁 포함

## 테이블 관계
Survey(1) → SurveyRound(N) → Respondent(N) → Answer(6)
                                             → Signature(1)
                                             → SubmissionLog(1)
                                             → IndividualResult(1) → CRAdjustment(1)
SurveyRound(1) → GroupResult(1)

## 핵심 필드

### Survey
id, title, description, locale(default:'ko')
ownerId(nullable, 2단계용), isPublic(default:false)
createdAt

### SurveyRound
id, surveyId, roundNo, token(unique)
status: OPEN|CLOSED
targetCount(default:16)
createdAt

### Respondent
id, roundId
name, organization, position
category: '정부기관'|'공공기관'|'학계전문가'|'법·제도전문가'|'회계전문가'|'협회내부'|'진출기업'
isLocked(제출후 true), submittedAt

### Answer (6행 고정, 불변)
id, respondentId, questionCode(Q1~Q6)
itemA, itemB (항목명)
rawValue(원본, 불변), matrixValue(변환값, 불변)

### IndividualResult
id, respondentId(unique)
weights: Json, lambdaMax, ci, cr
isValid(CR≤0.1)

### CRAdjustment
id, resultId(unique)
originalAnswers: Json (원본 복사, 절대 불변)
adjustedAnswers: Json (보정값)
adjustedWeights: Json
adjustedCr: Float
useAdjusted: Boolean
changedQuestions: Json

### GroupResult
id, roundId(unique)
validCount, geoMeanMatrix: Json
weights4: Json, weights3: Json
groupCr4, groupCr3
calculatedAt

### Signature
id, respondentId(unique)
imageData: Text(base64)
signedAt

### SubmissionLog
id, respondentId(unique)
ipAddress, userAgent
submittedAt, dataHash(SHA256)

## 2단계 스텁 (지금은 빈 모델로만 생성)
User, Subscription, Payment (필드 없이 생성만)
