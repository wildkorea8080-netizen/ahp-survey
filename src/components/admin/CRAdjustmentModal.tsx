'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ResponseRow } from './ResponseTable'

interface AdjustResult {
  originalCr: number
  adjustedCr: number
  success: boolean
  changedQuestions: string[]
  originalAnswers: { questionCode: string; rawValue: number }[]
  adjustedAnswers: { questionCode: string; rawValue: number }[]
}

interface Props {
  respondent: ResponseRow
  onClose: () => void
  onComplete: () => void
}

const PAIR_LABELS: Record<string, string> = {
  Q1: '투자규모 vs 영농규모',
  Q2: '투자규모 vs 영농기간',
  Q3: '투자규모 vs 반입기여도',
  Q4: '영농규모 vs 영농기간',
  Q5: '영농규모 vs 반입기여도',
  Q6: '영농기간 vs 반입기여도',
}

export default function CRAdjustmentModal({ respondent, onClose, onComplete }: Props) {
  const [result, setResult] = useState<AdjustResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentCr = respondent.result?.adjustment?.useAdjusted
    ? (respondent.result.adjustment.adjustedCr ?? respondent.result?.cr)
    : respondent.result?.cr

  async function runAdjustment() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respondentId: respondent.id }),
      })
      const body = await res.json() as AdjustResult & { error?: string }
      if (!res.ok) { setError(body.error ?? '보정 실패'); return }
      setResult(body)
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  async function applyChoice(useAdjusted: boolean) {
    setApplying(true)
    try {
      const res = await fetch('/api/admin/adjust/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respondentId: respondent.id, useAdjusted }),
      })
      if (res.ok) onComplete()
      else setError('적용 중 오류가 발생했습니다')
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setApplying(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#1F497D]">
            CR 보정 — {respondent.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* 현재 CR */}
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            <span className="text-[#5F5E5A]">현재 4개 항목 CR:</span>
            <Badge
              className="text-white"
              style={{ backgroundColor: (currentCr ?? 1) <= 0.1 ? '#1B5E20' : '#C62828' }}
            >
              {currentCr?.toFixed(4) ?? '—'}
            </Badge>
            <span className="text-xs text-[#5F5E5A]">(임계값: 0.1)</span>
          </div>

          {/* 보정 실행 버튼 */}
          {!result && (
            <Button
              onClick={runAdjustment}
              disabled={loading}
              className="w-full text-white"
              style={{ backgroundColor: '#854F0B' }}
            >
              {loading ? '보정 시뮬레이션 중...' : '🔧 보정 실행'}
            </Button>
          )}

          {/* 보정 결과 */}
          {result && (
            <div className="space-y-4">
              {/* CR 비교 */}
              <div className="flex items-center justify-around rounded-lg border p-4">
                <div className="text-center">
                  <p className="text-xs text-[#5F5E5A]">원본 CR</p>
                  <p className="text-xl font-bold text-[#C62828]">
                    {result.originalCr.toFixed(4)}
                  </p>
                </div>
                <span className="text-2xl">→</span>
                <div className="text-center">
                  <p className="text-xs text-[#5F5E5A]">보정 CR</p>
                  <p
                    className="text-xl font-bold"
                    style={{ color: result.adjustedCr <= 0.1 ? '#1B5E20' : '#C62828' }}
                  >
                    {result.adjustedCr.toFixed(4)}
                  </p>
                  {result.success && (
                    <p className="text-xs text-[#1B5E20]">✅ 허용 범위 달성</p>
                  )}
                </div>
              </div>

              {/* 문항별 비교 테이블 */}
              <div>
                <h4 className="mb-2 font-semibold text-[#1F497D]">문항별 변경 내역</h4>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#E6F1FB]">
                      <th className="px-3 py-2 text-left text-[#1F497D]">문항</th>
                      <th className="px-3 py-2 text-left text-[#1F497D]">비교 항목</th>
                      <th className="px-3 py-2 text-center text-[#1F497D]">원본값</th>
                      <th className="px-3 py-2 text-center text-[#1F497D]">보정값</th>
                      <th className="px-3 py-2 text-center text-[#1F497D]">변경</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.originalAnswers.map((orig) => {
                      const adj = result.adjustedAnswers.find(
                        (a) => a.questionCode === orig.questionCode
                      )
                      const changed = adj && adj.rawValue !== orig.rawValue
                      return (
                        <tr
                          key={orig.questionCode}
                          className={changed ? 'bg-amber-50' : ''}
                        >
                          <td className="px-3 py-1.5 font-medium">{orig.questionCode}</td>
                          <td className="px-3 py-1.5 text-[#5F5E5A]">
                            {PAIR_LABELS[orig.questionCode]}
                          </td>
                          <td className="px-3 py-1.5 text-center">{orig.rawValue}</td>
                          <td className="px-3 py-1.5 text-center font-medium">
                            {adj?.rawValue ?? orig.rawValue}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            {changed ? (
                              <span className="text-[#854F0B] font-bold">●</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* 선택 버튼 */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => applyChoice(false)}
                  disabled={applying}
                  className="flex-1 border-[#5F5E5A] text-[#5F5E5A]"
                >
                  원본 사용
                </Button>
                <Button
                  onClick={() => applyChoice(true)}
                  disabled={applying || !result.success}
                  className="flex-1 text-white"
                  style={{ backgroundColor: result.success ? '#1B5E20' : '#9ca3af' }}
                >
                  보정값 사용
                </Button>
              </div>
              {!result.success && (
                <p className="text-center text-xs text-[#C62828]">
                  10회 이내에 CR ≤ 0.1 달성 불가 — 원본 사용을 권장합니다
                </p>
              )}
            </div>
          )}

          {error && <p className="text-center text-xs text-[#C62828]">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
