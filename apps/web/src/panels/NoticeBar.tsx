import { useNoticeStore } from '../state/noticeStore.ts'

export function NoticeBar() {
  const notice = useNoticeStore((s) => s.notice)
  const dismiss = useNoticeStore((s) => s.dismiss)
  if (!notice) return null
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900"
    >
      <span>{notice}</span>
      <button type="button" onClick={dismiss} className="shrink-0 underline">
        Dismiss
      </button>
    </div>
  )
}
