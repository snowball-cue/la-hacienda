import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

// React Native 0.73+ (Hermes) includes a built-in URL — no polyfill needed.
// Importing react-native-url-polyfill/auto on top of Hermes' built-in URL
// causes a bridge type conflict on Android new-arch that manifests as
// "java.lang.String cannot be cast to java.lang.boolean".

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Simple AsyncStorage adapter that explicitly satisfies Supabase's SupportedStorage
const storage = {
  getItem:    (key: string) => AsyncStorage.getItem(key),
  setItem:    (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    storage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
})
