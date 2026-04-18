import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity, Alert,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { isBiometricAvailable, isBiometricEnabled, setBiometricEnabled, authenticateWithBiometrics } from '@/lib/biometrics'
import { Button } from '@/components/ui/Button'
import { Colors } from '@/constants/colors'

export default function LoginScreen() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [bioAvail, setBioAvail] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const available = await isBiometricAvailable()
        const enabled   = await isBiometricEnabled()
        setBioAvail(available && enabled)
      } catch {
        setBioAvail(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (bioAvail) tryBiometric()
  }, [bioAvail])

  async function tryBiometric() {
    const ok = await authenticateWithBiometrics()
    if (!ok) return
    // Session is already in AsyncStorage — supabase auto-restores it
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      // No stored session — fall back to password
      setBioAvail(false)
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Email and password are required.')
      return
    }
    setLoading(true)
    setError(null)

    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    setLoading(false)

    if (err) {
      setError(err.message)
      return
    }

    // Offer biometric enrollment on first successful login
    const available = await isBiometricAvailable()
    const enrolled  = await isBiometricEnabled()
    if (available && !enrolled) {
      Alert.alert(
        'Enable Biometric Login?',
        'Use Face ID or fingerprint to log in faster next time.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Enable',  onPress: () => setBiometricEnabled(true) },
        ],
      )
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Logo / Brand */}
        <View style={styles.brand}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>LH</Text>
          </View>
          <Text style={styles.appName}>La Hacienda</Text>
          <Text style={styles.tagline}>Inventory & Operations</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={Colors.stoneLight}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.stoneLight}
              secureTextEntry
              textContentType="password"
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />
          </View>

          <Button
            label={loading ? 'Signing in…' : 'Sign In'}
            onPress={handleLogin}
            loading={loading}
            fullWidth
            style={{ marginTop: 8 }}
          />

          {bioAvail && (
            <TouchableOpacity style={styles.bioBtn} onPress={tryBiometric}>
              <Text style={styles.bioText}>Use Biometric Login</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: Colors.bgScreen },
  container:   { flexGrow: 1, justifyContent: 'center', padding: 28 },
  brand:       { alignItems: 'center', marginBottom: 40 },
  logoCircle:  { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.terracotta, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoText:    { fontSize: 26, fontWeight: '800', color: Colors.white },
  appName:     { fontSize: 26, fontWeight: '800', color: Colors.stoneDark },
  tagline:     { fontSize: 13, color: Colors.stone, marginTop: 4 },
  form:        { gap: 14 },
  errorBox:    { backgroundColor: Colors.redLight, borderRadius: 8, padding: 12 },
  errorText:   { color: Colors.red, fontSize: 13 },
  field:       { gap: 6 },
  label:       { fontSize: 13, fontWeight: '600', color: Colors.stoneDark },
  input:       { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.stoneDark },
  bioBtn:      { alignItems: 'center', marginTop: 12, paddingVertical: 8 },
  bioText:     { fontSize: 14, color: Colors.terracotta, fontWeight: '600' },
})
