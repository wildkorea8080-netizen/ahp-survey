'use client'

import { useState } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { tSurvey, tCommon } from '@/lib/i18n'
import { RESPONDENT_CATEGORIES } from '@/types'

const schema = z.object({
  name: z.string().min(1, '성명을 입력하세요').max(50),
  organization: z.string().min(1, '소속기관을 입력하세요').max(100),
  position: z.string().min(1, '직위를 입력하세요').max(50),
  category: z.enum(RESPONDENT_CATEGORIES as unknown as [string, ...string[]]),
})

type FormData = z.infer<typeof schema>

interface Props {
  onNext: (data: FormData) => void
}

export default function RespondentForm({ onNext }: Props) {
  const [form, setForm] = useState<Partial<FormData>>({})
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = schema.safeParse(form)
    if (!result.success) {
      const errs: typeof errors = {}
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FormData
        errs[field] = issue.message
      })
      setErrors(errs)
      return
    }
    onNext(result.data)
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#1F497D]">응답자 정보 입력</h2>
        <p className="mt-1 text-sm text-[#5F5E5A]">설문 제출 전 기본 정보를 입력해 주세요</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 성명 */}
        <div className="space-y-1">
          <Label htmlFor="name">성명 <span className="text-[#C62828]">*</span></Label>
          <Input
            id="name"
            placeholder="홍길동"
            value={form.name ?? ''}
            onChange={(e) => set('name', e.target.value)}
          />
          {errors.name && <p className="text-xs text-[#C62828]">{errors.name}</p>}
        </div>

        {/* 소속기관 */}
        <div className="space-y-1">
          <Label htmlFor="organization">소속기관 <span className="text-[#C62828]">*</span></Label>
          <Input
            id="organization"
            placeholder="○○부 또는 ○○대학교"
            value={form.organization ?? ''}
            onChange={(e) => set('organization', e.target.value)}
          />
          {errors.organization && <p className="text-xs text-[#C62828]">{errors.organization}</p>}
        </div>

        {/* 직위 */}
        <div className="space-y-1">
          <Label htmlFor="position">직위 <span className="text-[#C62828]">*</span></Label>
          <Input
            id="position"
            placeholder="과장, 교수, 대표이사 등"
            value={form.position ?? ''}
            onChange={(e) => set('position', e.target.value)}
          />
          {errors.position && <p className="text-xs text-[#C62828]">{errors.position}</p>}
        </div>

        {/* 전문가 구분 */}
        <div className="space-y-1">
          <Label>전문가 구분 <span className="text-[#C62828]">*</span></Label>
          <Select onValueChange={(v) => set('category', v as string)}>
            <SelectTrigger>
              <SelectValue placeholder="구분을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {RESPONDENT_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-xs text-[#C62828]">{errors.category}</p>}
        </div>

        <Button
          type="submit"
          className="w-full bg-[#1F497D] hover:bg-[#17375E] text-white"
        >
          {tCommon('action.submit')} →
        </Button>
      </form>
    </div>
  )
}
