import { PDFDocument, PDFFont } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import fs from 'fs'
import path from 'path'

/**
 * pdf-lib에 fontkit을 등록하고 NanumGothic woff2를 로드한다.
 * @fontsource/nanum-gothic 패키지의 한국어 전체 서브셋 파일 사용
 */
export async function loadKoreanFont(pdfDoc: PDFDocument): Promise<PDFFont> {
  pdfDoc.registerFontkit(fontkit)
  const fontPath = path.join(
    process.cwd(),
    'node_modules',
    '@fontsource',
    'nanum-gothic',
    'files',
    'nanum-gothic-korean-400-normal.woff2',
  )
  const fontBytes = fs.readFileSync(fontPath)
  return pdfDoc.embedFont(fontBytes)
}
