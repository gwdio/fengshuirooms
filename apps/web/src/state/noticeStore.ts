import { create } from 'zustand'

// One app-level message for problems the user must know about (e.g. a plan that couldn't be
// loaded, or saving failing). Not for routine feedback.
interface NoticeState {
  notice: string | null
  show: (notice: string) => void
  dismiss: () => void
}

export const useNoticeStore = create<NoticeState>()((set) => ({
  notice: null,
  show: (notice) => set({ notice }),
  dismiss: () => set({ notice: null }),
}))
