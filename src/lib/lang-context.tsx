'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Lang = 'en' | 'es'

interface LangCtx {
  lang:   Lang
  toggle: () => void
}

const LangContext = createContext<LangCtx>({ lang: 'en', toggle: () => {} })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lh-lang')
      if (stored === 'en' || stored === 'es') setLang(stored)
    } catch {}
  }, [])

  function toggle() {
    setLang(prev => {
      const next = prev === 'en' ? 'es' : 'en'
      try { localStorage.setItem('lh-lang', next) } catch {}
      return next
    })
  }

  return <LangContext.Provider value={{ lang, toggle }}>{children}</LangContext.Provider>
}

export function useLang(): LangCtx {
  return useContext(LangContext)
}
