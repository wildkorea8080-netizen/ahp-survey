'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { AnalysisResult } from '@/app/(admin)/admin/analysis/page'
import type { ItemDef } from '@/lib/ahp/calculator'

interface Props {
  mode: '4items' | '3items'
  items: readonly ItemDef[]
  accentColor: string
  lightColor: string
  result: AnalysisResult | null
  onResult: (r: AnalysisResult) => void
}

const CR_OPTIONS = [0.05, 0.1, 0.15, 0.2]

// 현행 50점 배점 (참고용 — 4개 항목 기준, 3개는 해당 없으면 '-')
const CURRENT_50: Record<string, number> = {
  inv: 10, farm: 15, per: 15, imp: 10,
}

export default function AnalysisTab({
  mode, items, accentColor, lightColor, result, onResult,
}: Props) {
  const [crThreshold, setCrThreshold] = useState(0.1)
  const [includeAdjusted, setIncludeAdjusted] = useState(true)
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function downloadPDF() {
    if (!result) return
    setPdfLoading(true)
    try {
      const res = await fetch('/api/admin/pdf/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId: result.roundId, itemCount: mode === '4items' ? 4 : 3 }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setError(body.error ?? 'PDF 생성 실패')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ahp-report-${mode}-${result.roundId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('PDF 다운로드 중 오류가 발생했습니다')
    } finally {
      setPdfLoading(false)
    }
  }

  async function runAnalysis() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundToken: 'haenong-2026-r1',
          mode,
          crThreshold,
          includeAdjusted,
        }),
      })
      const body = await res.json() as AnalysisResult & { error?: string }
      if (!res.ok) { setError(body.error ?? '분석 실패'); return }
      onResult(body)
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const chartData = result
    ? items.map((item, i) => ({
        name: item.short,
        weight: Math.round(result.weights[i] * 10000) / 100,
        fill: item.bar,
      }))
    : []

  return (
    <div className="space-y-5 rounded-lg border bg-white p-5">
      {/* ① 분석 설정 */}
      <section className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#5F5E5A]">CR 임계값:</span>
          <div className="flex gap-1">
            {CR_OPTIONS.map((v) => (
              <button
                key={v}
                onClick={() => setCrThreshold(v)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  crThreshold === v
                    ? 'text-white'
                    : 'border text-[#5F5E5A] hover:bg-gray-100'
                }`}
                style={crThreshold === v ? { backgroundColor: accentColor } : {}}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeAdjusted}
            onChange={(e) => setIncludeAdjusted(e.target.checked)}
            className="rounded"
          />
          <span className="text-[#5F5E5A]">보정값 포함</span>
        </label>

        <Button
          onClick={runAnalysis}
          disabled={loading}
          className="text-white"
          style={{ backgroundColor: accentColor }}
        >
          {loading ? '분석 중...' : '▶ 분석 실행'}
        </Button>
      </section>

      {error && <p className="text-sm text-[#C62828]">{error}</p>}

      {result && (
        <>
          {/* ② 유효 응답자 수 */}
          <section
            className="rounded-lg px-4 py-3 text-sm"
            style={{ backgroundColor: lightColor }}
          >
            <span className="font-medium" style={{ color: accentColor }}>
              유효 응답자: {result.validCount}명
            </span>
            <span className="ml-2 text-[#5F5E5A]">(CR ≤ {crThreshold} 기준)</span>
          </section>

          {/* ③ 집단 쌍대비교 행렬 */}
          <section>
            <h3 className="mb-2 font-semibold" style={{ color: accentColor }}>
              집단 쌍대비교 행렬 (기하평균)
            </h3>
            <div className="overflow-auto">
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="w-24 px-2 py-1" />
                    {items.map((item) => (
                      <th key={item.key} className="px-2 py-1 text-center font-semibold" style={{ color: accentColor }}>
                        {item.short}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((rowItem, i) => (
                    <tr key={rowItem.key}>
                      <td className="px-2 py-1 font-semibold" style={{ color: accentColor }}>
                        {rowItem.short}
                      </td>
                      {result.geoMeanMatrix[i]?.map((val, j) => (
                        <td
                          key={j}
                          className={`px-2 py-1 text-center ${i === j ? 'font-bold' : ''}`}
                          style={i === j ? { backgroundColor: lightColor } : {}}
                        >
                          {val.toFixed(3)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ④ 가중치 결과 테이블 */}
          <section>
            <h3 className="mb-2 font-semibold" style={{ color: accentColor }}>
              항목별 가중치 결과
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: lightColor }}>
                  <th className="px-3 py-2 text-left" style={{ color: accentColor }}>순위</th>
                  <th className="px-3 py-2 text-left" style={{ color: accentColor }}>항목</th>
                  <th className="px-3 py-2 text-right" style={{ color: accentColor }}>가중치</th>
                  <th className="px-3 py-2 text-right" style={{ color: accentColor }}>200점</th>
                  <th className="px-3 py-2 text-right" style={{ color: accentColor }}>300점</th>
                  {mode === '4items' && (
                    <th className="px-3 py-2 text-right" style={{ color: accentColor }}>현행50점</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {[...items]
                  .map((item, i) => ({
                    item,
                    weight: result.weights[i],
                    score200: result.score200[i],
                    score300: result.score300[i],
                    idx: i,
                  }))
                  .sort((a, b) => b.weight - a.weight)
                  .map((row, rank) => (
                    <tr key={row.item.key} className={rank % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 font-bold" style={{ color: accentColor }}>
                        {rank + 1}위
                      </td>
                      <td className="px-3 py-2 font-medium" style={{ color: row.item.color }}>
                        {row.item.label}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {(row.weight * 100).toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 text-right">{row.score200.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{row.score300.toFixed(2)}</td>
                      {mode === '4items' && (
                        <td className="px-3 py-2 text-right text-[#5F5E5A]">
                          {CURRENT_50[row.item.key] ?? '—'}
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>

          {/* ⑤ 가로 막대 그래프 */}
          <section>
            <h3 className="mb-3 font-semibold" style={{ color: accentColor }}>
              가중치 분포
            </h3>
            <ResponsiveContainer width="100%" height={items.length * 56 + 40}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: 8, right: 40, top: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={72} />
                <Tooltip formatter={(v) => typeof v === 'number' ? `${v.toFixed(2)}%` : v} />
                <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* ⑥ 집단 CR */}
          <section className="flex items-center gap-4 rounded-lg border p-4">
            <div>
              <p className="text-xs text-[#5F5E5A]">집단 CR</p>
              <p className="text-2xl font-bold" style={{ color: accentColor }}>
                {result.groupCr.toFixed(4)}
              </p>
            </div>
            <Badge
              className="text-sm text-white"
              style={{ backgroundColor: result.isValid ? '#1B5E20' : '#C62828' }}
            >
              {result.isValid ? '✅ 허용 (≤ 0.1)' : '⚠ 초과 (> 0.1)'}
            </Badge>
          </section>

          {/* ⑦ 결과 해석 문장 */}
          <section className="rounded-lg border-l-4 bg-gray-50 px-4 py-3 text-sm text-[#5F5E5A]"
            style={{ borderLeftColor: accentColor }}>
            <p>
              {items.length}개 항목 분석 결과, 유효 응답자 {result.validCount}명의 집단 의사결정 일관성 비율(CR)은{' '}
              <strong>{result.groupCr.toFixed(4)}</strong>으로{' '}
              {result.isValid
                ? '허용 기준(0.1) 이내로 일관성이 확보되었습니다.'
                : '허용 기준(0.1)을 초과하여 집단 일관성 검토가 필요합니다.'}
            </p>
            <p className="mt-1">
              최고 가중치 항목:{' '}
              <strong style={{ color: accentColor }}>
                {items[[...result.weights].indexOf(Math.max(...result.weights))].label}
              </strong>
              {' '}({(Math.max(...result.weights) * 100).toFixed(2)}%)
            </p>
          </section>

          {/* ⑧ PDF 보고서 다운로드 */}
          <section>
            <Button
              variant="outline"
              className="border-2"
              style={{ borderColor: accentColor, color: accentColor }}
              disabled={pdfLoading}
              onClick={downloadPDF}
            >
              {pdfLoading ? '생성 중...' : '📄 PDF 보고서 다운로드'}
            </Button>
          </section>
        </>
      )}

      {!result && !loading && (
        <div className="py-12 text-center text-[#5F5E5A]">
          <p>분석 설정 후 [분석 실행] 버튼을 클릭하세요</p>
        </div>
      )}
    </div>
  )
}
