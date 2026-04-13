'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { PAIRS4, ITEMS4 } from '@/lib/ahp/calculator'
import { tSurvey } from '@/lib/i18n'

interface Props {
  answers: { questionCode: string; rawValue: number }[]
  onSubmit: (signatureDataUrl: string) => void
  isSubmitting?: boolean
}

export default function SignatureStep({ answers, onSubmit, isSubmitting = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const [hasSigned, setHasSigned] = useState(false)
  const [agreed, setAgreed] = useState(false)

  // Canvas 초기화
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1F497D'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  // 네이티브 touch 이벤트로 스크롤 차단 (passive: false 필수)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function preventScroll(e: TouchEvent) {
      if (isDrawingRef.current) e.preventDefault()
    }

    canvas.addEventListener('touchmove', preventScroll, { passive: false })
    return () => canvas.removeEventListener('touchmove', preventScroll)
  }, [])

  function getPos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    isDrawingRef.current = true
    setHasSigned(true)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function endDraw() {
    isDrawingRef.current = false
  }

  function clearSignature() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSigned(false)
  }

  function handleSubmit() {
    const canvas = canvasRef.current
    if (!canvas) return
    onSubmit(canvas.toDataURL('image/png'))
  }

  function formatRaw(raw: number, pairIndex: number): string {
    const pair = PAIRS4[pairIndex]
    const itemA = ITEMS4[pair.a].label
    const itemB = ITEMS4[pair.b].label
    if (raw === 0) return '동등 (1)'
    if (raw > 0) return `${itemA} ${raw}배 중요`
    return `${itemB} ${Math.abs(raw)}배 중요`
  }

  const canSubmit = hasSigned && agreed && !isSubmitting

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-lg bg-[#E6F1FB] p-4 text-center">
        <h3 className="font-bold text-[#1F497D]">최종 확인 및 서명</h3>
        <p className="mt-1 text-sm text-[#5F5E5A]">응답 내용을 확인하고 서명 후 제출해 주세요</p>
      </div>

      {/* 응답 내역 */}
      <div>
        <h4 className="mb-2 font-semibold text-[#1F497D]">📋 응답 내역</h4>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#E6F1FB]">
                <th className="px-3 py-2 text-center text-[#1F497D] w-12">문항</th>
                <th className="px-3 py-2 text-left text-[#1F497D]">비교 항목</th>
                <th className="px-3 py-2 text-left text-[#1F497D]">응답</th>
              </tr>
            </thead>
            <tbody>
              {PAIRS4.map((pair, idx) => {
                const answer = answers.find((a) => a.questionCode === pair.code)
                const itemA = ITEMS4[pair.a].label
                const itemB = ITEMS4[pair.b].label
                return (
                  <tr key={pair.code} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 text-center font-medium text-[#5F5E5A]">{pair.code}</td>
                    <td className="px-3 py-2 text-[#5F5E5A]">
                      <span className="font-medium text-[#1F497D]">{itemA}</span>
                      <span className="mx-1 text-gray-400">vs</span>
                      <span className="font-medium text-[#1B5E20]">{itemB}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-[#5F5E5A]">
                      {answer !== undefined
                        ? formatRaw(answer.rawValue, idx)
                        : <span className="text-[#C62828]">미응답</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 서명 영역 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-semibold text-[#1F497D]">✍️ 서명</h4>
          <button onClick={clearSignature} className="text-xs text-[#5F5E5A] underline">
            서명 지우기
          </button>
        </div>
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white overflow-hidden">
          <canvas
            ref={canvasRef}
            width={600}
            height={180}
            className="w-full cursor-crosshair touch-none select-none"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </div>
        <p className={`mt-1 text-center text-xs ${hasSigned ? 'text-[#1B5E20]' : 'text-[#5F5E5A]'}`}>
          {hasSigned ? '✓ 서명 완료' : '위 영역에 서명해 주세요'}
        </p>
      </div>

      {/* 동의 체크박스 — 전체 영역 터치 가능 */}
      <button
        type="button"
        onClick={() => setAgreed((v) => !v)}
        className={`flex w-full items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors ${
          agreed ? 'border-[#1B5E20] bg-[#EAF3DE]' : 'border-gray-200 bg-white'
        }`}
      >
        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
          agreed ? 'border-[#1B5E20] bg-[#1B5E20]' : 'border-gray-400 bg-white'
        }`}>
          {agreed && (
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <span className="text-sm leading-relaxed text-[#5F5E5A]">
          {tSurvey('signature.agree')}
        </span>
      </button>

      {/* 상태 안내 */}
      {(!hasSigned || !agreed) && (
        <p className="text-center text-xs text-[#C62828]">
          {!hasSigned ? '서명을 해주세요' : '동의 체크박스를 눌러주세요'}
        </p>
      )}

      {/* 제출 버튼 */}
      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full py-6 text-base font-bold text-white transition-all"
        style={{ backgroundColor: canSubmit ? '#1B5E20' : '#9ca3af' }}
      >
        {isSubmitting ? '제출 중...' : '설문 제출하기'}
      </Button>
    </div>
  )
}
