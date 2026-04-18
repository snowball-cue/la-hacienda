import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/useAppStore'
import { labels } from '@/lib/labels'
import { isBiometricAvailable, isBiometricEnabled, setBiometricEnabled } from '@/lib/biometrics'
import { Card } from '@/components/ui/Card'
import { Colors } from '@/constants/colors'

interface Store { id: string; name: string }

export default function SettingsScreen() {
  const user         = useAppStore(s => s.user)
  const lang         = useAppStore(s => s.lang)
  const activeStore  = useAppStore(s => s.activeStore)
  const setLang      = useAppStore(s => s.setLang)
  const setActiveStore = useAppStore(s => s.setActiveStore)
  const t = (l: { en: string; es: string }) => lang === 'es' ? l.es : l.en

  const [stores,      setStores]      = useState<Store[]>([])
  const [bioAvail,    setBioAvail]    = useState(false)
  const [bioEnabled,  setBioEnabledState] = useState(false)

  useEffect(() => {
    ;(async () => {
      const available = await isBiometricAvailable()
      const enabled   = await isBiometricEnabled()
      setBioAvail(available)
      setBioEnabledState(enabled)

      const { data } = await supabase
        .from('stores')
        .select('id, name')
        .order('name')
      setStores((data ?? []) as Store[])
    })()
  }, [])

  async function toggleBiometric(val: boolean) {
    await setBiometricEnabled(val)
    setBioEnabledState(val)
  }

  async function handleSignOut() {
    Alert.alert(t(labels.ui.signOut), t(labels.ui.signOutConfirm), [
      { text: t(labels.ui.cancel), style: 'cancel' },
      {
        text: t(labels.ui.signOut), style: 'destructive',
        onPress: async () => { await supabase.auth.signOut() },
      },
    ])
  }

  const initials = [user?.firstName?.charAt(0), user?.lastName?.charAt(0)]
    .filter(Boolean).join('').toUpperCase() || '?'

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>

      {/* Profile */}
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{user?.fullName ?? 'Unknown'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.roleWrap}>
            <Text style={[styles.roleText, { color: user?.role === 'owner' ? '#B45309' : Colors.blue }]}>
              {(user?.role ?? 'staff').toUpperCase()}
            </Text>
          </View>
        </View>
      </Card>

      {/* Store */}
      {stores.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t(labels.ui.activeStore)}</Text>
          <Card padding={0}>
            <TouchableOpacity
              style={styles.storeRow}
              onPress={() => setActiveStore(null)}
            >
              <Text style={styles.storeLabel}>{t(labels.ui.allStores)}</Text>
              {activeStore === null && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
            {stores.map((s, i) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.storeRow, styles.divider]}
                onPress={() => setActiveStore(s.id)}
              >
                <Text style={styles.storeLabel}>{s.name}</Text>
                {activeStore === s.id && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            ))}
          </Card>
        </View>
      )}

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t(labels.ui.preferences)}</Text>
        <Card padding={0}>
          <View style={styles.prefRow}>
            <Text style={styles.prefLabel}>{t(labels.ui.language)}</Text>
            <View style={styles.langToggle}>
              {(['en', 'es'] as const).map(l => (
                <TouchableOpacity
                  key={l}
                  style={[styles.langBtn, lang === l && styles.langActive]}
                  onPress={() => setLang(l)}
                >
                  <Text style={[styles.langText, lang === l && styles.langTextActive]}>
                    {l === 'en' ? 'English' : 'Español'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {bioAvail && (
            <View style={[styles.prefRow, styles.divider]}>
              <Text style={styles.prefLabel}>{t(labels.ui.biometricLogin)}</Text>
              <Switch
                value={bioEnabled}
                onValueChange={toggleBiometric}
                trackColor={{ false: Colors.border, true: Colors.terracotta }}
                thumbColor={Colors.white}
              />
            </View>
          )}
        </Card>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>{t(labels.ui.signOut)}</Text>
      </TouchableOpacity>

      <Text style={styles.version}>La Hacienda Inventory · v1.0.0</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: Colors.bgScreen },
  container:    { padding: 20, paddingBottom: 48 },
  profileCard:  { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  avatar:       { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.terracotta, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 20, fontWeight: '800', color: Colors.white },
  profileName:  { fontSize: 16, fontWeight: '700', color: Colors.stoneDark },
  profileEmail: { fontSize: 13, color: Colors.stone, marginTop: 2 },
  roleWrap:     { marginTop: 4 },
  roleText:     { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.stone, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  storeRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  storeLabel:   { fontSize: 15, color: Colors.stoneDark },
  check:        { fontSize: 16, color: Colors.terracotta, fontWeight: '700' },
  prefRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  prefLabel:    { fontSize: 15, color: Colors.stoneDark },
  langToggle:   { flexDirection: 'row', gap: 4 },
  langBtn:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.border },
  langActive:   { backgroundColor: Colors.terracotta },
  langText:     { fontSize: 13, fontWeight: '600', color: Colors.stone },
  langTextActive:{ color: Colors.white },
  divider:      { borderTopWidth: 1, borderTopColor: Colors.border },
  signOutBtn:   { marginTop: 8, backgroundColor: Colors.redLight, borderRadius: 10, padding: 14, alignItems: 'center' },
  signOutText:  { fontSize: 15, fontWeight: '700', color: Colors.red },
  version:      { textAlign: 'center', color: Colors.stoneLight, fontSize: 12, marginTop: 24 },
})
