import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/auth'
import { useAppStore } from '@/stores/useAppStore'

export function useCurrentUser() {
  const { setUser, setAuthReady } = useAppStore()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await getProfile(session.user.id, session.user.email ?? '')
        setUser({ ...profile, email: session.user.email ?? '' })
      }
      setAuthReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const profile = await getProfile(session.user.id, session.user.email ?? '')
          setUser({ ...profile, email: session.user.email ?? '' })
        } else {
          setUser(null)
        }
        setAuthReady(true)
      }
    )

    return () => subscription.unsubscribe()
  }, [setUser, setAuthReady])

  return useAppStore(s => s.user)
}
