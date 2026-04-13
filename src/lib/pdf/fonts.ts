import { PDFDocument, PDFFont } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import fs from 'fs'
import path from 'path'

/**
 * pdf-lib에 fontkit을 등록하고 NanumGothic.ttf를 로드한다.
 * Node.js API Route 전용 (서버사이드만 사용)
 */
export async function loadKoreanFont(pdfDoc: PDFDocument): Promise<PDFFont> {
  pdfDoc.registerFontkit(fontkit)
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NanumGothic.ttf')
  const fontBytes = fs.readFileSync(fontPath)
  return pdfDoc.embedFont(fontBytes)
}
