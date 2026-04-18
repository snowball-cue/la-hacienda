import { useState } from 'react'
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/useAppStore'
import { enqueue } from '@/lib/offline-queue'
import { manualReasons, labels } from '@/lib/labels'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/ui/Toast'
import { Colors } from '@/constants/colors'

export default function AdjustScreen() {
  const { productId, productName } = useLocalSearchParams<{ productId: string; productName: string }>()
  const router = useRouter()
  const user   = useAppStore(s => s.user)
  const lang   = useAppStore(s => s.lang)
  const t = (l: { en: string; es: string }) => lang === 'es' ? l.es : l.en

  const [direction, setDirection] = useState<'add' | 'remove'>('add')
  const [qty,       setQty]       = useState('1')
  const [reason,    setReason]    = useState(manualReasons[0])
  const [note,      setNote]      = useState('')
  const [loading,   setLoading]   = useState(false)
  const [toast,     setToast]     = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function handleSubmit() {
    const quantity = parseInt(qty, 10)
    if (!quantity || quantity <= 0) { setError('Enter a quantity greater than 0.'); return }

    setLoading(true)
    setError(null)

    const changeQty = direction === 'add' ? quantity : -quantity
    const payload = {
      product_id:   productId,
      change_qty:   changeQty,
      reason,
      note:         note.trim() || null,
      performed_by: user?.id ?? null,
    }

    const { error: err } = await supabase.from('stock_ledger').insert(payload)

    if (err) {
      await enqueue('adjust_stock', payload)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }

    setToast(true)
    setLoading(false)
    setTimeout(() => router.back(), 1600)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <Text style={styles.productName} numberOfLines={2}>{productName}</Text>
        <Text style={styles.subtitle}>{t(labels.ui.adjustTitle)}</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Direction toggle */}
        <View style={styles.field}>
          <Text style={styles.label}>{t(labels.ui.direction)}</Text>
          <View style={styles.toggle}>
            {(['add', 'remove'] as const).map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.toggleBtn, direction === d && (d === 'add' ? styles.toggleAdd : styles.toggleRemove)]}
                onPress={() => setDirection(d)}
              >
                <Text style={[styles.toggleText, direction === d && styles.toggleTextActive]}>
                  {d === 'add' ? t(labels.ui.addStock) : t(labels.ui.removeStock)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quantity */}
        <View style={styles.field}>
          <Text style={styles.label}>{t(labels.ui.quantity)} *</Text>
          <View style={styles.qtyRow}>
            <Button label="−" onPress={() => setQty(q => String(Math.max(1, parseInt(q, 10) - 1)))} variant="secondary" style={styles.qtyBtn} />
            <TextInput
              style={styles.qtyInput}
              value={qty}
              onChangeText={setQty}
              keyboardType="number-pad"
              textAlign="center"
            />
            <Button label="+" onPress={() => setQty(q => String((parseInt(q, 10) || 0) + 1))} variant="secondary" style={styles.qtyBtn} />
          </View>
        </View>

        {/* Reason */}
        <View style={styles.field}>
          <Text style={styles.label}>{t(labels.ui.reason)}</Text>
          <View style={styles.reasons}>
            {manualReasons.map(r => {
              const lbl = labels.reasons[r]
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.reasonChip, reason === r && styles.reasonActive]}
                  onPress={() => setReason(r)}
                >
                  <Text style={[styles.reasonText, reason === r && styles.reasonTextActive]}>
                    {lang === 'es' ? lbl.es : lbl.en}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Note */}
        <View style={styles.field}>
          <Text style={styles.label}>{t(labels.ui.noteOptional)}</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Damaged on delivery"
            placeholderTextColor={Colors.stoneLight}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <Button label={t(labels.ui.saveAdjustment)} onPress={handleSubmit} loading={loading} fullWidth style={{ marginTop: 8 }} />
        <Button label={t(labels.ui.cancel)} onPress={() => router.back()} variant="ghost" fullWidth style={{ marginTop: 8 }} />
      </ScrollView>

      <Toast
        message={direction === 'add' ? t(labels.ui.stockAdded) : t(labels.ui.stockRemoved)}
        type="success"
        visible={toast}
        onHide={() => setToast(false)}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: Colors.bgScreen },
  container:       { padding: 24, paddingBottom: 48 },
  productName:     { fontSize: 20, fontWeight: '800', color: Colors.stoneDark },
  subtitle:        { fontSize: 13, color: Colors.stone, marginTop: 4, marginBottom: 24 },
  errorBox:        { backgroundColor: Colors.redLight, borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText:       { color: Colors.red, fontSize: 13 },
  field:           { marginBottom: 20 },
  label:           { fontSize: 13, fontWeight: '600', color: Colors.stoneDark, marginBottom: 8 },
  toggle:          { flexDirection: 'row', gap: 10 },
  toggleBtn:       { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.white },
  toggleAdd:       { backgroundColor: Colors.greenLight, borderColor: Colors.green },
  toggleRemove:    { backgroundColor: Colors.redLight, borderColor: Colors.red },
  toggleText:      { fontSize: 15, fontWeight: '600', color: Colors.stone },
  toggleTextActive:{ color: Colors.stoneDark },
  qtyRow:          { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn:          { width: 48, paddingHorizontal: 0 },
  qtyInput:        { flex: 1, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingVertical: 12, fontSize: 22, fontWeight: '700', color: Colors.stoneDark },
  reasons:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonChip:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  reasonActive:    { backgroundColor: Colors.terracotta, borderColor: Colors.terracotta },
  reasonText:      { fontSize: 13, color: Colors.stone, fontWeight: '500' },
  reasonTextActive:{ color: Colors.white },
  noteInput:       { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, fontSize: 14, color: Colors.stoneDark, minHeight: 80 },
})
