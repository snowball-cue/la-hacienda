import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/useAppStore'
import { labels } from '@/lib/labels'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Colors } from '@/constants/colors'

interface LowStockItem {
  id:           string
  name:         string
  currentStock: number
  reorderPoint: number
  unit:         string
}

interface ActivityEntry {
  id:         string
  change_qty: number
  reason:     string
  created_at: string
  productName: string
  actorName:  string
}

function translateReason(reason: string, lang: 'en' | 'es'): string {
  const key = reason as keyof typeof labels.reasons
  if (labels.reasons[key]) return lang === 'es' ? labels.reasons[key].es : labels.reasons[key].en
  return reason.replace(/_/g, ' ')
}

export default function ReportsScreen() {
  const lang       = useAppStore(s => s.lang)
  const t = (l: { en: string; es: string }) => lang === 'es' ? l.es : l.en
  const [lowStock,  setLowStock]  = useState<LowStockItem[]>([])
  const [activity,  setActivity]  = useState<ActivityEntry[]>([])
  const [loading,   setLoading]   = useState(true)
  const [refreshing,setRefreshing]= useState(false)

  async function load() {
    setRefreshing(true)
    try {
      const [{ data: products }, { data: ledger }] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, unit, reorder_point, stock_ledger(change_qty)')
          .eq('is_active', true),
        supabase
          .from('stock_ledger')
          .select('id, change_qty, reason, created_at, products(name), profiles(first_name, last_name)')
          .order('created_at', { ascending: false })
          .limit(30),
      ])

      const low: LowStockItem[] = []
      for (const p of (products ?? [])) {
        const stock = ((p.stock_ledger as { change_qty: number }[]) ?? []).reduce((s, e) => s + e.change_qty, 0)
        if (p.reorder_point !== null && stock <= p.reorder_point) {
          low.push({ id: p.id, name: p.name, currentStock: stock, reorderPoint: p.reorder_point, unit: p.unit })
        }
      }
      setLowStock(low.sort((a, b) => a.currentStock - b.currentStock))

      const raw = (ledger ?? []) as unknown as {
        id: string; change_qty: number; reason: string; created_at: string;
        products: { name: string } | null;
        profiles: { first_name: string | null; last_name: string | null } | null;
      }[]
      const acts: ActivityEntry[] = raw.map((e) => ({
        id:          e.id,
        change_qty:  e.change_qty,
        reason:      e.reason,
        created_at:  e.created_at,
        productName: e.products?.name ?? '—',
        actorName:   [e.profiles?.last_name, e.profiles?.first_name].filter(Boolean).join(', ') || 'System',
      }))
      setActivity(acts)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.terracotta} />

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={Colors.terracotta} />}
    >
      {/* Low Stock */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t(labels.ui.lowStockAlert)}  <Text style={styles.badge}>{lowStock.length}</Text>
        </Text>
        {lowStock.length === 0 ? (
          <Card><Text style={styles.emptyText}>{t(labels.ui.allGood)}</Text></Card>
        ) : (
          <Card padding={0}>
            {lowStock.map((item, i) => (
              <View key={item.id} style={[styles.lowRow, i > 0 && styles.divider]}>
                <Text style={styles.lowName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.lowRight}>
                  <Badge
                    label={`${item.currentStock} / ${item.reorderPoint} ${item.unit}`}
                    variant={item.currentStock <= 0 ? 'red' : 'gold'}
                  />
                </View>
              </View>
            ))}
          </Card>
        )}
      </View>

      {/* Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t(labels.ui.recentMovements)}</Text>
        <Card padding={0}>
          {activity.length === 0 ? (
            <Text style={styles.emptyText}>{t(labels.ui.noMovements)}</Text>
          ) : activity.map((entry, i) => (
            <View key={entry.id} style={[styles.actRow, i > 0 && styles.divider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.actProduct} numberOfLines={1}>{entry.productName}</Text>
                <Text style={styles.actMeta}>{entry.actorName} · {translateReason(entry.reason, lang)}</Text>
                <Text style={styles.actTime}>{fmtDate(entry.created_at)}</Text>
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
  section:      { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.stoneDark, marginBottom: 10 },
  badge:        { fontSize: 13, color: Colors.stone },
  emptyText:    { textAlign: 'center', color: Colors.stoneLight, fontSize: 14, padding: 8 },
  lowRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  lowName:      { flex: 1, fontSize: 14, color: Colors.stoneDark, fontWeight: '500' },
  lowRight:     { marginLeft: 12 },
  actRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  actProduct:   { fontSize: 14, fontWeight: '600', color: Colors.stoneDark },
  actMeta:      { fontSize: 12, color: Colors.stone, marginTop: 2, textTransform: 'capitalize' },
  actTime:      { fontSize: 11, color: Colors.stoneLight, marginTop: 2 },
  divider:      { borderTopWidth: 1, borderTopColor: Colors.border },
})
