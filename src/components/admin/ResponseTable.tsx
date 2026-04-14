'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import CRAdjustmentModal from './CRAdjustmentModal'
import DetailModal from './DetailModal'

export interface ResponseRow {
  id: string
  name: string
  organization: string
  category: string
  submittedAt: Date | null
  result: {
    id: string
    cr: number
    isValid: boolean
    weights: Record<string, unknown>
    adjustment: {
      adjustedCr: number
      useAdjusted: boolean
      changedQuestions: string[]
    } | null
  } | null
}

interface Props {
  rows: ResponseRow[]
  onRefresh: () => void
}

export default function ResponseTable({ rows, onRefresh }: Props) {
  const [adjustTarget, setAdjustTarget] = useState<ResponseRow | null>(null)
  const [detailTarget, setDetailTarget] = useState<ResponseRow | null>(null)
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null)

  async function downloadIndividualPDF(respondentId: string, name: string) {
    setPdfLoadingId(respondentId)
    try {
      const res = await fetch(`/api/survey/pdf/${respondentId}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        alert(`PDF 생성 실패: ${json.error ?? res.statusText}`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `확인서-${name}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(`PDF 다운로드 오류: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setPdfLoadingId(null)
    }
  }

  function getCRDisplay(row: ResponseRow) {
    if (!row.result) return { cr4: null, isValid: false, adjusted: false }
    const adj = row.result.adjustment
    const cr4 = adj?.useAdjusted ? adj.adjustedCr : row.result.cr
    const isValid = cr4 <= 0.1
    const adjusted = !!(adj?.useAdjusted)
    return { cr4, isValid, adjusted }
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[#E6F1FB] text-left">
              <th className="px-4 py-3 text-[#1F497D]">성명</th>
              <th className="px-4 py-3 text-[#1F497D]">소속</th>
              <th className="px-4 py-3 text-[#1F497D]">구분</th>
              <th className="px-4 py-3 text-[#1F497D]">제출시간</th>
              <th className="px-4 py-3 text-center text-[#1F497D]">4개CR</th>
              <th className="px-4 py-3 text-center text-[#1F497D]">판정</th>
              <th className="px-4 py-3 text-center text-[#1F497D]">확인서</th>
              <th className="px-4 py-3 text-center text-[#1F497D]">액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#5F5E5A]">
                  응답이 없습니다.
                </td>
              </tr>
            )}
            {rows.map((row, idx) => {
              const { cr4, isValid, adjusted } = getCRDisplay(row)
              return (
                <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-[#5F5E5A]">{row.organization}</td>
                  <td className="px-4 py-3 text-xs text-[#5F5E5A]">{row.category}</td>
                  <td className="px-4 py-3 text-xs text-[#5F5E5A]">
                    {row.submittedAt
                      ? new Date(row.submittedAt).toLocaleString('ko-KR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {cr4 !== null ? (
                      <CRBadge cr={cr4} isValid={isValid} adjusted={adjusted} />
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {cr4 !== null ? (
                      <span className={`text-xs font-medium ${isValid ? 'text-[#1B5E20]' : 'text-[#C62828]'}`}>
                        {adjusted ? '🔧 보정됨' : isValid ? '✅ 허용' : '⚠ 초과'}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs border-[#1F497D] text-[#1F497D]"
                      disabled={pdfLoadingId === row.id}
                      onClick={() => downloadIndividualPDF(row.id, row.name)}
                    >
                      {pdfLoadingId === row.id ? '...' : '📄'}
                    </Button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => setDetailTarget(row)}
                      >
                        상세
                      </Button>
                      {row.result && !isValid && (
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs text-white"
                          style={{ backgroundColor: '#854F0B' }}
                          onClick={() => setAdjustTarget(row)}
                        >
                          보정
                        </Button>
                      )}
                      {row.result?.adjustment?.useAdjusted && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs border-[#854F0B] text-[#854F0B]"
                          onClick={() => setAdjustTarget(row)}
                        >
                          🔧
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 모달 */}
      {adjustTarget && (
        <CRAdjustmentModal
          respondent={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onComplete={() => { setAdjustTarget(null); onRefresh() }}
        />
      )}
      {detailTarget && (
        <DetailModal
          respondent={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </>
  )
}

function CRBadge({ cr, isValid, adjusted }: { cr: number; isValid: boolean; adjusted: boolean }) {
  const bg = adjusted ? '#854F0B' : isValid ? '#1B5E20' : '#C62828'
  return (
    <Badge className="text-xs text-white" style={{ backgroundColor: bg }}>
      {cr.toFixed(3)}
    </Badge>
  )
}
