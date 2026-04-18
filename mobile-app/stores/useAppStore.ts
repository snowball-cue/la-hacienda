import { create } from 'zustand'
import type { MobileUser } from '@/lib/auth'

interface AppState {
  user:        MobileUser | null
  authReady:   boolean
  lang:        'en' | 'es'
  activeStore: string | null

  setUser:        (user: MobileUser | null) => void
  setAuthReady:   (ready: boolean) => void
  setLang:        (lang: 'en' | 'es') => void
  setActiveStore: (storeId: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  user:        null,
  authReady:   false,
  lang:        'en',
  activeStore: null,

  setUser:        (user)        => set({ user }),
  setAuthReady:   (ready)       => set({ authReady: ready }),
  setLang:        (lang)        => set({ lang }),
  setActiveStore: (activeStore) => set({ activeStore }),
}))
