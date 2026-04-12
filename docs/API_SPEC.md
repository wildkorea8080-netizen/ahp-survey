# API 명세

## 공개 API
GET  /api/survey/[token]     → {surveyTitle, roundNo, isOpen}
POST /api/survey/submit      → {respondentId, pdfUrl}
GET  /api/survey/pdf/[id]    → PDF 스트림

## 관리자 API (next-auth 세션 필요)
GET  /api/admin/responses?roundId=&crFilter=
POST /api/admin/adjust       {respondentId}
POST /api/admin/adjust/apply {respondentId, useAdjusted}
POST /api/admin/analyze      {roundId, crThreshold, includeAdjusted}
GET  /api/admin/results/[roundId]
POST /api/admin/pdf/report   {roundId}
GET  /api/admin/export/[roundId]  → XLSX

## 에러 형식 (통일)
{ error: string, code: string, statusCode: number }
