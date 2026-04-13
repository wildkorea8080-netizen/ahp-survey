'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import AnalysisTab from '@/components/admin/AnalysisTab'
import { ITEMS4, ITEMS3 } from '@/lib/ahp/calculator'

export interface AnalysisResult {
  roundId: string
  validCount: number
  geoMeanMatrix: number[][]
  weights: number[]
  groupCr: number
  isValid: boolean
  score200: number[]
  score300: number[]
}

function AnalysisPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') === '3items' ? '3items' : '4items'

  // 각 탭 독립 결과 유지
  const [result4, setResult4] = useState<AnalysisResult | null>(null)
  const [result3, setResult3] = useState<AnalysisResult | null>(null)

  function switchTab(tab: '4items' | '3items') {
    router.push(`/admin/analysis?tab=${tab}`, { scroll: false })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[#1F497D]">집단 AHP 분석</h1>

      {/* 탭 헤더 */}
      <div className="flex gap-1 rounded-lg border bg-white p-1 w-fit">
        <button
          onClick={() => switchTab('4items')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === '4items'
              ? 'bg-[#1F497D] text-white'
              : 'text-[#5F5E5A] hover:bg-gray-100'
          }`}
        >
          4개 항목
          {result4 && (
            <span className={`ml-1.5 text-xs ${result4.isValid ? 'text-green-300' : 'text-red-300'}`}>
              ● CR {result4.groupCr.toFixed(3)}
            </span>
          )}
        </button>
        <button
          onClick={() => switchTab('3items')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === '3items'
              ? 'bg-[#1B5E20] text-white'
              : 'text-[#5F5E5A] hover:bg-gray-100'
          }`}
        >
          3개 항목
          {result3 && (
            <span className={`ml-1.5 text-xs ${result3.isValid ? 'text-green-300' : 'text-red-300'}`}>
              ● CR {result3.groupCr.toFixed(3)}
            </span>
          )}
        </button>
      </div>

      {/* 4개 항목 탭 */}
      <div className={activeTab === '4items' ? 'block' : 'hidden'}>
        <AnalysisTab
          mode="4items"
          items={ITEMS4}
          accentColor="#1F497D"
          lightColor="#E6F1FB"
          result={result4}
          onResult={setResult4}
        />
      </div>

      {/* 3개 항목 탭 */}
      <div className={activeTab === '3items' ? 'block' : 'hidden'}>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-[#854F0B]">
          ℹ 투자규모는 현행 배분 기준에 포함되지 않아 별도 분석합니다 (Q4·Q5·Q6 사용)
        </div>
        <AnalysisTab
          mode="3items"
          items={ITEMS3}
          accentColor="#1B5E20"
          lightColor="#EAF3DE"
          result={result3}
          onResult={setResult3}
        />
      </div>
    </div>
  )
}

export default function AnalysisPage() {
  return (
    <Suspense>
      <AnalysisPageInner />
    </Suspense>
  )
}
