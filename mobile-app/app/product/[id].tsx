import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/useAppStore'
import { labels } from '@/lib/labels'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Colors } from '@/constants/colors'

interface ProductDetail {
  id:           string
  sku:          string | null
  barcode:      string | null
  name:         string
  nameEs:       string | null
  category:     string | null
  unit:         string
  reorderPoint: number | null
  currentStock: number
  imageUrl:     string | null
}

interface LedgerEntry {
  id:          string
  change_qty:  number
  reason:      string
  note:        string | null
  created_at:  string
  actorName:   string
}

function translateReason(reason: string, lang: 'en' | 'es'): string {
  const key = reason as keyof typeof labels.reasons
  if (labels.reasons[key]) return lang === 'es' ? labels.reasons[key].es : labels.reasons[key].en
  return reason.replace(/_/g, ' ')
}

export default function ProductDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>()
  const router  = useRouter()
  const lang    = useAppStore(s => s.lang)
  const t = (l: { en: string; es: string }) => lang === 'es' ? l.es : l.en

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [history, setHistory] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const [{ data: p }, { data: ledger }] = await Promise.all([
        supabase
          .from('products')
          .select('id, sku, barcode, name, name_es, category, unit, reorder_point, image_url, stock_ledger(change_qty)')
          .eq('id', id)
          .single(),
        supabase
          .from('stock_ledger')
          .select('id, change_qty, reason, note, created_at, profiles(first_name, last_name)')
          .eq('product_id', id)
          .order('created_at', { ascending: false })
          .limit(30),
      ])

      if (p) {
        const d = p as {
          id: string; sku: string | null; barcode: string | null; name: string; name_es: string | null;
          category: string | null; unit: string; reorder_point: number | null; image_url: string | null;
          stock_ledger: { change_qty: number }[];
        }
        setProduct({
          id: d.id, sku: d.sku, barcode: d.barcode, name: d.name, nameEs: d.name_es,
          category: d.category, unit: d.unit, reorderPoint: d.reorder_point, imageUrl: d.image_url,
          currentStock: (d.stock_ledger ?? []).reduce((s, e) => s + e.change_qty, 0),
        })
      }

      const ledgerRaw = (ledger ?? []) as unknown as {
        id: string; change_qty: number; reason: string; note: string | null; created_at: string;
        profiles: { first_name: string | null; last_name: string | null } | null;
      }[]
      setHistory(ledgerRaw.map((e) => ({
        id:         e.id,
        change_qty: e.change_qty,
        reason:     e.reason,
        note:       e.note,
        created_at: e.created_at,
        actorName:  [e.profiles?.last_name, e.profiles?.first_name].filter(Boolean).join(', ') || 'System',
      })))

      setLoading(false)
    })()
  }, [id])

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.terracotta} />

  if (!product) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Product not found.</Text>
    </View>
  )

  const isLow  = product.reorderPoint !== null && product.currentStock <= product.reorderPoint
  const stockV = product.currentStock <= 0 ? 'red' : isLow ? 'gold' : 'green'

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>

      {/* Header */}
      <Card style={styles.headerCard}>
        <Text style={styles.name}>{product.name}</Text>
        {product.nameEs && <Text style={styles.nameEs}>{product.nameEs}</Text>}

        <View style={styles.metaRow}>
          <Badge
            label={`${product.currentStock} ${product.unit}`}
            variant={stockV as 'green' | 'red' | 'gold'}
          />
          {product.category && (
            <Text style={styles.category}>{product.category}</Text>
          )}
        </View>

        {product.sku && (
          <Text style={styles.sku}>SKU: {product.sku}</Text>
        )}
        {product.barcode && (
          <Text style={styles.sku}>Barcode: {product.barcode}</Text>
        )}
        {product.reorderPoint !== null && (
          <Text style={[styles.reorder, isLow && { color: Colors.red }]}>
            {t(labels.ui.reorderAt)}: {product.reorderPoint} {product.unit}
            {isLow ? ` ${t(labels.ui.belowReorder)}` : ''}
          </Text>
        )}
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          label={t(labels.ui.receive)}
          onPress={() => router.push({ pathname: '/receive', params: { productId: product.id, productName: product.name } })}
          fullWidth
        />
        <Button
          label={t(labels.ui.adjustStock)}
          onPress={() => router.push({ pathname: '/adjust', params: { productId: product.id, productName: product.name } })}
          variant="secondary"
          fullWidth
          style={{ marginTop: 10 }}
        />
      </View>

      {/* Stock history */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t(labels.ui.stockHistory)}</Text>
        <Card padding={0}>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>{t(labels.ui.noMovementsYet)}</Text>
          ) : history.map((entry, i) => (
            <View key={entry.id} style={[styles.histRow, i > 0 && styles.divider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.histReason}>{translateReason(entry.reason, lang)}</Text>
                <Text style={styles.histMeta}>{entry.actorName}</Text>
                {entry.note && <Text style={styles.histNote}>{entry.note}</Text>}
                <Text style={styles.histTime}>{fmtDate(entry.created_at)}</Text>
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
  screen:      { flex: 1, backgroundColor: Colors.bgScreen },
  container:   { padding: 20, paddingBottom: 48 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText:   { color: Colors.stone, fontSize: 15 },
  headerCard:  { marginBottom: 16 },
  name:        { fontSize: 20, fontWeight: '800', color: Colors.stoneDark },
  nameEs:      { fontSize: 14, color: Colors.stone, marginTop: 2 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  category:    { fontSize: 12, color: Colors.stoneLight },
  sku:         { fontSize: 12, color: Colors.stoneLight, fontFamily: 'monospace', marginTop: 6 },
  reorder:     { fontSize: 12, color: Colors.stone, marginTop: 6 },
  actions:     { marginBottom: 24 },
  section:     { marginBottom: 24 },
  sectionTitle:{ fontSize: 15, fontWeight: '700', color: Colors.stoneDark, marginBottom: 10 },
  emptyText:   { padding: 20, textAlign: 'center', color: Colors.stoneLight, fontSize: 14 },
  histRow:     { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  histReason:  { fontSize: 14, fontWeight: '600', color: Colors.stoneDark, textTransform: 'capitalize' },
  histMeta:    { fontSize: 12, color: Colors.stone, marginTop: 2 },
  histNote:    { fontSize: 12, color: Colors.stone, marginTop: 2, fontStyle: 'italic' },
  histTime:    { fontSize: 11, color: Colors.stoneLight, marginTop: 2 },
  divider:     { borderTopWidth: 1, borderTopColor: Colors.border },
})
