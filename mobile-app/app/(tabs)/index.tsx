import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/useAppStore'
import { labels } from '@/lib/labels'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Colors } from '@/constants/colors'

interface StockEntry {
  id: string
  change_qty: number
  reason: string
  created_at: string
  products: { name: string } | null
}

function translateReason(reason: string, lang: 'en' | 'es'): string {
  const key = reason as keyof typeof labels.reasons
  if (labels.reasons[key]) return lang === 'es' ? labels.reasons[key].es : labels.reasons[key].en
  return reason.replace(/_/g, ' ')
}

export default function DashboardScreen() {
  const user   = useAppStore(s => s.user)
  const lang   = useAppStore(s => s.lang)
  const router = useRouter()
  const t = (l: { en: string; es: string }) => lang === 'es' ? l.es : l.en

  const [lowStockCount,  setLowStockCount]  = useState(0)
  const [recentActivity, setRecentActivity] = useState<StockEntry[]>([])
  const [refreshing,     setRefreshing]     = useState(false)
  const [dataError,      setDataError]      = useState<string | null>(null)

  async function load() {
    setRefreshing(true)
    setDataError(null)
    try {
      // Low stock count
      const { data: products, error: productsErr } = await supabase
        .from('products')
        .select('id, reorder_point, stock_ledger(change_qty)')
        .eq('is_active', true)

      if (productsErr) { setDataError(productsErr.message); setRefreshing(false); return }

      let lowCount = 0
      for (const p of (products ?? [])) {
        const stock = ((p.stock_ledger as { change_qty: number }[]) ?? []).reduce((s, e) => s + e.change_qty, 0)
        if (p.reorder_point !== null && stock <= p.reorder_point) lowCount++
      }
      setLowStockCount(lowCount)

      // Recent ledger activity
      // Note: profiles join omitted — no FK from performed_by to profiles.id
      const { data: ledger, error: ledgerErr } = await supabase
        .from('stock_ledger')
        .select('id, change_qty, reason, created_at, products(name)')
        .order('created_at', { ascending: false })
        .limit(12)

      if (ledgerErr) { setDataError(ledgerErr.message); setRefreshing(false); return }
      setRecentActivity((ledger ?? []) as unknown as StockEntry[])
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  function actorName(_entry: StockEntry): string {
    return t(labels.ui.system)
  }

  function formatTime(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.terracotta} />}
    >
      {dataError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Data error: {dataError}</Text>
        </View>
      )}

      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={styles.greetName}>Hi, {user?.firstName ?? user?.fullName ?? 'there'}</Text>
        <Text style={styles.greetSub}>{t(labels.ui.todaySummary)}</Text>
      </View>

      {/* Stat cards */}
      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statCard} onPress={() => router.push('/inventory')}>
          <Text style={[styles.statNumber, lowStockCount > 0 && { color: Colors.red }]}>
            {lowStockCount}
          </Text>
          <Text style={styles.statLabel}>{t(labels.ui.lowStock)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.statCard} onPress={() => router.push('/scan')}>
          <Text style={[styles.statNumber, { color: Colors.terracotta }]}>⊡</Text>
          <Text style={styles.statLabel}>{t(labels.ui.scanItem)}</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t(labels.ui.recentActivity)}</Text>
        <Card padding={0}>
          {recentActivity.length === 0 ? (
            <Text style={styles.emptyText}>{t(labels.ui.noActivity)}</Text>
          ) : recentActivity.map((entry, i) => (
            <View key={entry.id} style={[styles.activityRow, i > 0 && styles.divider]}>
              <View style={styles.activityLeft}>
                <Text style={styles.activityProduct} numberOfLines={1}>
                  {(entry.products as { name: string } | null)?.name ?? '—'}
                </Text>
                <Text style={styles.activityMeta}>
                  {actorName(entry)} · {translateReason(entry.reason, lang)}
                </Text>
                <Text style={styles.activityTime}>{formatTime(entry.created_at)}</Text>
              </View>
              <Badge
                label={`${entry.change_qty > 0 ? '+' : ''}${entry.change_qty}`}
                variant={entry.change_qty > 0 ? 'green' : 'red'}
              />
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: Colors.bgScreen },
  container:    { padding: 20, paddingBottom: 40 },
  greeting:     { marginBottom: 20 },
  greetName:    { fontSize: 22, fontWeight: '800', color: Colors.stoneDark },
  greetSub:     { fontSize: 14, color: Colors.stone, marginTop: 2 },
  statsRow:     { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard:     { flex: 1, backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 16, alignItems: 'center' },
  statNumber:   { fontSize: 28, fontWeight: '800', color: Colors.stoneDark },
  statLabel:    { fontSize: 12, color: Colors.stone, marginTop: 4, fontWeight: '600' },
  section:      { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.stoneDark, marginBottom: 10 },
  emptyText:    { padding: 20, textAlign: 'center', color: Colors.stoneLight, fontSize: 14 },
  activityRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  activityLeft: { flex: 1, marginRight: 12 },
  activityProduct:{ fontSize: 14, fontWeight: '600', color: Colors.stoneDark },
  activityMeta: { fontSize: 12, color: Colors.stone, marginTop: 2, textTransform: 'capitalize' },
  activityTime: { fontSize: 11, color: Colors.stoneLight, marginTop: 2 },
  divider:      { borderTopWidth: 1, borderTopColor: Colors.border },
  errorBox:     { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText:    { color: Colors.red, fontSize: 13 },
})
