'use client'

import { useState, useEffect, useCallback } from 'react'
import ResponseTable, { type ResponseRow } from '@/components/admin/ResponseTable'

export default function ResponsesPage() {
  const [rows, setRows] = useState<ResponseRow[]>([])
  const [roundId, setRoundId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [xlsxLoading, setXlsxLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/responses?roundToken=haenong-2026-r1')
      const body = await res.json() as { roundId: string; respondents: ResponseRow[] }
      setRoundId(body.roundId ?? '')
      setRows(body.respondents ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function downloadXlsx() {
    if (!roundId) return
    setXlsxLoading(true)
    try {
      const res = await fetch(`/api/admin/export/${roundId}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ahp-export-${roundId}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setXlsxLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#1F497D]">응답자 목록</h1>
        <div className="flex gap-2">
          <button
            onClick={downloadXlsx}
            disabled={xlsxLoading || !roundId}
            className="rounded-lg border border-[#1B5E20] px-3 py-1.5 text-sm text-[#1B5E20] hover:bg-green-50 disabled:opacity-50"
          >
            {xlsxLoading ? '내보내는 중...' : '📥 XLSX 내보내기'}
          </button>
          <button
            onClick={fetchData}
            className="rounded-lg border px-3 py-1.5 text-sm text-[#5F5E5A] hover:bg-gray-100"
          >
            새로고침
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-[#5F5E5A]">불러오는 중...</div>
      ) : (
        <>
          <p className="text-sm text-[#5F5E5A]">총 {rows.length}명 응답 완료</p>
          <ResponseTable rows={rows} onRefresh={fetchData} />
        </>
      )}
    </div>
  )
}
