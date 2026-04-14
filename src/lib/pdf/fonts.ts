import { PDFDocument, PDFFont } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

// 서버리스 인스턴스 내 캐시 (콜드스타트 당 1회 fetch)
let cachedFont: Uint8Array | null = null

// jsDelivr CDN → Google Fonts 저장소의 완전한 NanumGothic TTF
const FONT_CDN =
  'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/nanumgothic/NanumGothic-Regular.ttf'

export async function loadKoreanFont(pdfDoc: PDFDocument): Promise<PDFFont> {
  pdfDoc.registerFontkit(fontkit)

  if (!cachedFont) {
    const res = await fetch(FONT_CDN)
    if (!res.ok) throw new Error(`폰트 로드 실패: HTTP ${res.status}`)
    cachedFont = new Uint8Array(await res.arrayBuffer())
  }

  return pdfDoc.embedFont(cachedFont)
}
