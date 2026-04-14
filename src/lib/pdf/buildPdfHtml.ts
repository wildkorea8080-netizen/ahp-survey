/**
 * 개별 확인서 HTML 템플릿
 * Puppeteer → PDF 렌더링용 (3페이지)
 */

import { PAIRS4, ITEMS4 } from '@/lib/ahp/calculator'

const ORG = process.env.NEXT_PUBLIC_ORG_NAME ?? '(사)해외농업자원개발협회'

export interface PdfData {
  respondentId: string
  name: string
  organization: string
  position: string
  category: string
  submittedAt: Date | null
  roundNo: number
  surveyTitle: string
  answers: { questionCode: string; rawValue: number }[]
  signatureDataUrl: string | null
  signedAt: Date | null
  submissionLog: {
    ipAddress: string
    userAgent: string
    submittedAt: Date
    dataHash: string
  } | null
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

function getMeaning(raw: number, aLabel: string, bLabel: string): string {
  if (raw === 0) return `"${aLabel}"와 "${bLabel}"은 동등하게 중요합니다`
  if (raw > 0) return `"${aLabel}"이 "${bLabel}"보다 ${raw}배 더 중요합니다`
  return `"${bLabel}"이 "${aLabel}"보다 ${Math.abs(raw)}배 더 중요합니다`
}

function buildScaleRow(raw: number, aLabel: string, bLabel: string): string {
  const leftVals  = [9, 8, 7, 6, 5, 4, 3, 2]
  const rightVals = [2, 3, 4, 5, 6, 7, 8, 9]

  const leftBtns = leftVals.map(v => {
    const sel = raw === v
    return `<div class="sbtn${sel ? ' sel-navy' : ''}">${v}</div>`
  }).join('')

  const centerSel = raw === 0
  const center = `<div class="sbtn sbtn-c${centerSel ? ' sel-gray' : ''}">1</div>`

  const rightBtns = rightVals.map(v => {
    const sel = raw === -v
    return `<div class="sbtn${sel ? ' sel-green' : ''}">${v}</div>`
  }).join('')

  const isLeft  = raw > 0
  const isRight = raw < 0
  const meaning = getMeaning(raw, aLabel, bLabel)
  const meaningClass = isLeft ? 'meaning-navy' : isRight ? 'meaning-green' : 'meaning-neutral'

  return `
    <div class="scale-row">
      <div class="item-lbl lbl-left${isLeft ? ' lbl-active-navy' : ''}">${esc(aLabel)}</div>
      <div class="sbtns">${leftBtns}${center}${rightBtns}</div>
      <div class="item-lbl lbl-right${isRight ? ' lbl-active-green' : ''}">${esc(bLabel)}</div>
    </div>
    <div class="meaning ${meaningClass}">${esc(meaning)}</div>
  `
}

function buildQuestions(answers: PdfData['answers']): string {
  return PAIRS4.map(pair => {
    const ans = answers.find(a => a.questionCode === pair.code)
    const raw = ans?.rawValue ?? 0
    const aLabel = ITEMS4[pair.a].label
    const bLabel = ITEMS4[pair.b].label
    return `
      <div class="qcard">
        <div class="qhead">
          <span class="qnum">${pair.code}</span>
          <span class="qtitle">
            <span class="qa">${esc(aLabel)}</span>
            <span class="qvs">vs</span>
            <span class="qb">${esc(bLabel)}</span>
          </span>
        </div>
        ${buildScaleRow(raw, aLabel, bLabel)}
      </div>
    `
  }).join('')
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Noto Sans KR', sans-serif;
    font-size: 10pt;
    color: #1a1a1a;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── 페이지 ── */
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 0;
    page-break-after: always;
    position: relative;
    overflow: hidden;
  }
  .page:last-child { page-break-after: auto; }

  .content {
    padding: 16mm 18mm 20mm;
  }

  /* ── 헤더 바 ── */
  .page-hdr {
    background: #1F497D;
    color: #fff;
    padding: 14px 18mm;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .page-hdr .org   { font-size: 8pt; opacity: 0.75; margin-bottom: 3px; }
  .page-hdr .ptitle { font-size: 13pt; font-weight: 700; }
  .page-hdr .psub   { font-size: 8.5pt; color: rgba(255,255,255,0.65); margin-top: 2px; }
  .page-hdr .pright { font-size: 9pt; opacity: 0.75; align-self: center; }

  /* ── 푸터 ── */
  .page-ftr {
    position: absolute;
    bottom: 10mm;
    left: 18mm;
    right: 18mm;
    border-top: 0.5pt solid #ccc;
    padding-top: 4px;
    display: flex;
    justify-content: space-between;
    font-size: 7.5pt;
    color: #999;
  }

  /* ════ PAGE 1: 표지 ════ */
  .cover-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 22mm;
  }
  .cover-title {
    font-size: 25pt;
    font-weight: 700;
    color: #1F497D;
    letter-spacing: 1px;
    text-align: center;
    margin-bottom: 8px;
  }
  .cover-subtitle {
    font-size: 10.5pt;
    color: #5F5E5A;
    text-align: center;
    margin-bottom: 28px;
  }
  .cover-divider {
    width: 100%;
    border: none;
    border-top: 1.5pt solid #1F497D;
    margin-bottom: 24px;
  }

  /* 응답자 정보 박스 */
  .resp-box {
    width: 100%;
    border: 1.5pt solid #1F497D;
    border-radius: 5px;
    overflow: hidden;
    margin-bottom: 14px;
  }
  .resp-box-hdr {
    background: #E6F1FB;
    padding: 9px 16px;
    font-size: 9.5pt;
    font-weight: 700;
    color: #1F497D;
    letter-spacing: 5px;
  }
  .resp-field {
    display: flex;
    align-items: center;
    padding: 7px 16px;
    border-top: 0.5pt solid #E6F1FB;
    font-size: 9.5pt;
  }
  .resp-field:first-child { border-top: none; }
  .rf-label {
    width: 88px;
    color: #5F5E5A;
    letter-spacing: 2px;
    flex-shrink: 0;
  }
  .rf-sep   { width: 14px; color: #5F5E5A; }
  .rf-val   { font-weight: 500; }

  .cover-dt {
    width: 100%;
    display: flex;
    align-items: center;
    padding: 8px 2px;
    font-size: 9.5pt;
  }
  .cover-bottom {
    margin-top: 36mm;
    text-align: center;
  }
  .cover-bottom .issuer      { font-size: 11pt; font-weight: 700; color: #1F497D; margin-bottom: 5px; }
  .cover-bottom .issuer-note { font-size: 8.5pt; color: #777; }

  /* ════ PAGE 2: 설문 응답 ════ */
  .qlist { display: flex; flex-direction: column; gap: 7px; }

  .qcard {
    border: 1pt solid #C8D8E8;
    border-radius: 4px;
    overflow: hidden;
  }
  .qhead {
    background: #E6F1FB;
    padding: 6px 12px;
    display: flex;
    align-items: center;
    gap: 9px;
    border-bottom: 0.5pt solid #C8D8E8;
  }
  .qnum {
    background: #1F497D;
    color: #fff;
    font-size: 7.5pt;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 3px;
    flex-shrink: 0;
  }
  .qtitle { font-size: 9pt; font-weight: 700; color: #1F497D; }
  .qa { color: #1F497D; }
  .qb { color: #1B5E20; }
  .qvs { color: #999; font-weight: 400; margin: 0 5px; font-size: 8pt; }

  /* 척도 버튼 행 */
  .scale-row {
    display: flex;
    align-items: center;
    padding: 7px 10px;
    gap: 5px;
    background: #fff;
  }
  .item-lbl {
    font-size: 8pt;
    font-weight: 600;
    flex-shrink: 0;
    min-width: 48px;
  }
  .lbl-left  { text-align: right; color: #1F497D; }
  .lbl-right { text-align: left;  color: #1B5E20; }
  .lbl-active-navy { color: #1F497D; }
  .lbl-active-green { color: #1B5E20; }

  .sbtns {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 1;
    justify-content: center;
  }
  .sbtn {
    width: 21px;
    height: 21px;
    border: 1pt solid #CCC;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 7.5pt;
    color: #999;
    flex-shrink: 0;
  }
  .sbtn-c {
    width: 25px;
    height: 25px;
    border: 1.5pt solid #888;
    font-size: 8.5pt;
    font-weight: 700;
    color: #555;
  }
  .sel-navy  { background: #1F497D !important; color: #fff !important; border-color: #1F497D !important; font-weight: 700; }
  .sel-green { background: #1B5E20 !important; color: #fff !important; border-color: #1B5E20 !important; font-weight: 700; }
  .sel-gray  { background: #5F5E5A !important; color: #fff !important; border-color: #5F5E5A !important; }

  .meaning {
    padding: 5px 12px 6px;
    font-size: 8.5pt;
    font-weight: 500;
    border-top: 0.5pt solid #EEF2F6;
  }
  .meaning-navy    { color: #1F497D; background: #F0F5FC; }
  .meaning-green   { color: #1B5E20; background: #EFF6EC; }
  .meaning-neutral { color: #5F5E5A; background: #F7F7F7; }

  /* 서명 영역 */
  .sig-section {
    margin-top: 14px;
    padding-top: 12px;
    border-top: 2pt solid #1F497D;
  }
  .sig-title {
    font-size: 10pt;
    font-weight: 700;
    color: #1F497D;
    letter-spacing: 4px;
    margin-bottom: 10px;
  }
  .sig-box {
    width: 210px;
    height: 80px;
    border: 1.5pt solid #1F497D;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    margin-bottom: 8px;
    background: #fff;
  }
  .sig-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .no-sig { color: #BBB; font-size: 9pt; letter-spacing: 3px; }
  .sig-meta { font-size: 8.5pt; color: #5F5E5A; line-height: 1.9; }
  .sig-meta strong { color: #1a1a1a; font-weight: 500; }

  /* ════ PAGE 3: 증빙 ════ */
  .ev-card { margin-bottom: 14px; border-radius: 4px; overflow: hidden; border: 1pt solid #1F497D; }
  .ev-card-hdr {
    background: #1F497D;
    color: #fff;
    padding: 8px 14px;
    font-size: 9.5pt;
    font-weight: 700;
  }
  .ev-card-body { background: #fff; }

  .log-table { width: 100%; border-collapse: collapse; }
  .log-table tr:nth-child(even) { background: #F5F8FC; }
  .log-table tr { border-bottom: 0.5pt solid #E3ECF5; }
  .log-table tr:last-child { border-bottom: none; }
  .lt-lbl {
    padding: 8px 14px;
    font-size: 8.5pt;
    color: #5F5E5A;
    width: 110px;
    vertical-align: top;
    font-weight: 500;
    white-space: nowrap;
  }
  .lt-val {
    padding: 8px 14px 8px 0;
    font-size: 8.5pt;
    word-break: break-all;
  }
  .lt-val.mono  { font-family: 'Courier New', monospace; font-size: 7.5pt; }
  .lt-val.small { font-size: 7pt; color: #555; }

  .hash-box {
    padding: 12px 14px;
    font-family: 'Courier New', monospace;
    font-size: 9pt;
    line-height: 1.85;
    background: #F5F8FC;
    border-top: 0.5pt solid #E3ECF5;
    word-break: break-all;
  }

  .notices { margin-top: 14px; }
  .notice-item {
    display: flex;
    gap: 7px;
    font-size: 8.5pt;
    color: #5F5E5A;
    line-height: 1.65;
    padding: 3px 0;
  }
  .notice-dot { color: #1F497D; font-weight: 700; flex-shrink: 0; }
`

export function buildPdfHtml(d: PdfData): string {
  const submittedStr = fmtDate(d.submittedAt)
  const signedStr    = fmtDate(d.signedAt)

  const sigHtml = d.signatureDataUrl
    ? `<img src="${d.signatureDataUrl}" alt="서명" />`
    : `<div class="no-sig">서  명  없  음</div>`

  const logHtml = d.submissionLog ? `
    <table class="log-table">
      <tr>
        <td class="lt-lbl">응답자 ID</td>
        <td class="lt-val mono">${esc(d.respondentId)}</td>
      </tr>
      <tr>
        <td class="lt-lbl">제출 일시</td>
        <td class="lt-val">${submittedStr}</td>
      </tr>
      <tr>
        <td class="lt-lbl">IP 주소</td>
        <td class="lt-val mono">${esc(d.submissionLog.ipAddress)}</td>
      </tr>
      <tr>
        <td class="lt-lbl">브라우저 / 기기</td>
        <td class="lt-val small">${esc(d.submissionLog.userAgent)}</td>
      </tr>
    </table>
  ` : `<p style="padding:12px 14px;font-size:8.5pt;color:#999;">제출 기록 없음</p>`

  const hash  = d.submissionLog?.dataHash ?? '—'
  const half  = Math.ceil(hash.length / 2)

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>${CSS}</style>
</head>
<body>

<!-- ══════════════ PAGE 1 : 표지 ══════════════ -->
<div class="page">
  <div class="page-hdr">
    <div>
      <div class="org">${esc(ORG)}</div>
      <div class="ptitle">${esc(d.surveyTitle)}</div>
      <div class="psub">제${d.roundNo}회차</div>
    </div>
  </div>

  <div class="content">
    <div class="cover-body">
      <div class="cover-title">AHP 전문가 설문 응답 확인서</div>
      <div class="cover-subtitle">해농공매 물량 배분 평가항목 가중치 산출</div>
      <hr class="cover-divider" />

      <div class="resp-box">
        <div class="resp-box-hdr">응  답  자  정  보</div>
        <div class="resp-field">
          <span class="rf-label">성      명</span>
          <span class="rf-sep">:</span>
          <span class="rf-val">${esc(d.name)}</span>
        </div>
        <div class="resp-field">
          <span class="rf-label">소  속  기  관</span>
          <span class="rf-sep">:</span>
          <span class="rf-val">${esc(d.organization)}</span>
        </div>
        <div class="resp-field">
          <span class="rf-label">직      위</span>
          <span class="rf-sep">:</span>
          <span class="rf-val">${esc(d.position)}</span>
        </div>
        <div class="resp-field">
          <span class="rf-label">전문가 구분</span>
          <span class="rf-sep">:</span>
          <span class="rf-val">${esc(d.category)}</span>
        </div>
      </div>

      <div class="cover-dt">
        <span class="rf-label" style="color:#5F5E5A;letter-spacing:0">제출 일시</span>
        <span class="rf-sep">:</span>
        <span class="rf-val">${submittedStr}</span>
      </div>

      <div class="cover-bottom">
        <div class="issuer">${esc(ORG)}</div>
        <div class="issuer-note">본 확인서는 AHP 전문가 설문 응답 원본의 공식 기록입니다.</div>
      </div>
    </div>
  </div>

  <div class="page-ftr">
    <span>${esc(ORG)}</span>
    <span>1 / 3</span>
  </div>
</div>

<!-- ══════════════ PAGE 2 : 설문 응답 원본 ══════════════ -->
<div class="page">
  <div class="page-hdr">
    <div><div class="ptitle">설문 응답 원본</div></div>
    <div class="pright">${esc(d.name)} 귀하</div>
  </div>

  <div class="content" style="padding-bottom:28mm">
    <div class="qlist">
      ${buildQuestions(d.answers)}
    </div>

    <div class="sig-section">
      <div class="sig-title">응  답  자  서  명</div>
      <div class="sig-box">${sigHtml}</div>
      <div class="sig-meta">
        <div>서 명 자 &nbsp;: &nbsp;<strong>${esc(d.name)}</strong></div>
        <div>서명 일시 : &nbsp;<strong>${signedStr}</strong></div>
      </div>
    </div>
  </div>

  <div class="page-ftr">
    <span>${esc(ORG)}</span>
    <span>2 / 3</span>
  </div>
</div>

<!-- ══════════════ PAGE 3 : 제출 증빙 ══════════════ -->
<div class="page">
  <div class="page-hdr">
    <div><div class="ptitle">제출 증빙</div></div>
  </div>

  <div class="content">

    <div class="ev-card">
      <div class="ev-card-hdr">제출 기록</div>
      <div class="ev-card-body">${logHtml}</div>
    </div>

    <div class="ev-card">
      <div class="ev-card-hdr">데이터 무결성 (SHA-256)</div>
      <div class="ev-card-body">
        <div class="hash-box">${hash.slice(0, half)}<br>${hash.slice(half)}</div>
      </div>
    </div>

    <div class="notices">
      <div class="notice-item"><span class="notice-dot">•</span><span>본 확인서는 응답자의 전자서명이 포함된 원본 기록입니다.</span></div>
      <div class="notice-item"><span class="notice-dot">•</span><span>제출된 응답 데이터는 SHA-256 해시로 무결성이 보장됩니다.</span></div>
      <div class="notice-item"><span class="notice-dot">•</span><span>가중치 및 CR 등 분석 결과는 이 문서에 포함되지 않습니다.</span></div>
      <div class="notice-item"><span class="notice-dot">•</span><span>본 자료는 해농공매 물량 배분 가중치 산출 목적으로만 사용됩니다.</span></div>
    </div>

  </div>

  <div class="page-ftr">
    <span>${esc(ORG)}</span>
    <span>3 / 3</span>
  </div>
</div>

</body>
</html>`
}
