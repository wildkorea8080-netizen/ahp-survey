import { PDFPage, PDFFont, rgb, RGB } from 'pdf-lib'

// A4 크기 (pt)
export const A4 = { width: 595.28, height: 841.89 }

// 브랜드 색상
export const COLORS = {
  navy:      rgb(0.122, 0.286, 0.490),   // #1F497D
  navyLight: rgb(0.902, 0.945, 0.984),   // #E6F1FB
  green:     rgb(0.106, 0.369, 0.125),   // #1B5E20
  greenLight:rgb(0.918, 0.953, 0.871),   // #EAF3DE
  amber:     rgb(0.522, 0.310, 0.043),   // #854F0B
  red:       rgb(0.776, 0.157, 0.157),   // #C62828
  gray:      rgb(0.373, 0.369, 0.353),   // #5F5E5A
  black:     rgb(0.1,   0.1,   0.1),
  white:     rgb(1,     1,     1),
  bgLight:   rgb(0.97,  0.97,  0.97),
}

/** 줄바꿈 포함 텍스트 그리기 */
export function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB = COLORS.black
) {
  page.drawText(text, { x, y, size, font, color })
}

/** 가로선 그리기 */
export function drawHLine(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  thickness = 0.5,
  color: RGB = COLORS.gray
) {
  page.drawLine({
    start: { x, y },
    end: { x: x + width, y },
    thickness,
    color,
  })
}

/** 채워진 사각형 */
export function drawRect(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  color: RGB
) {
  page.drawRectangle({ x, y, width, height, color })
}

/** 테두리 사각형 */
export function drawBorderRect(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  borderColor: RGB,
  borderWidth = 0.5
) {
  page.drawRectangle({
    x, y, width, height,
    borderColor,
    borderWidth,
    color: rgb(1, 1, 1),
  })
}

/** 페이지 번호 + 발행 기관 푸터 */
export function drawFooter(
  page: PDFPage,
  font: PDFFont,
  pageNum: number,
  totalPages: number,
  orgName: string
) {
  drawHLine(page, 50, 45, A4.width - 100, 0.5, COLORS.gray)
  drawText(page, orgName, 50, 30, font, 7, COLORS.gray)
  const pageText = `${pageNum} / ${totalPages}`
  const tw = font.widthOfTextAtSize(pageText, 7)
  drawText(page, pageText, A4.width - 50 - tw, 30, font, 7, COLORS.gray)
}

/** 섹션 헤더 바 */
export function drawSectionHeader(
  page: PDFPage,
  font: PDFFont,
  text: string,
  y: number,
  color: RGB,
  x = 50,
  width = A4.width - 100
) {
  drawRect(page, x, y, width, 18, color)
  drawText(page, text, x + 8, y + 4, font, 10, COLORS.white)
  return y - 24
}

/** long text를 maxWidth 기준으로 자르기 */
export function truncate(text: string, font: PDFFont, size: number, maxWidth: number): string {
  let t = text
  while (font.widthOfTextAtSize(t, size) > maxWidth && t.length > 0) {
    t = t.slice(0, -1)
  }
  return t === text ? text : t + '…'
}
