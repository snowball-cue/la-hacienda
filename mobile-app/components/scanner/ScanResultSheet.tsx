import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native'
import { Colors } from '@/constants/colors'
import { labels } from '@/lib/labels'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { ProductRow } from '@/hooks/useProducts'

interface Props {
  product:   ProductRow | null
  notFound:  boolean
  lang:      'en' | 'es'
  onClose:   () => void
  onReceive: (product: ProductRow) => void
  onAdjust:  (product: ProductRow) => void
  onView:    (product: ProductRow) => void
}

export function ScanResultSheet({ product, notFound, lang, onClose, onReceive, onAdjust, onView }: Props) {
  const t = (l: { en: string; es: string }) => lang === 'es' ? l.es : l.en
  const visible = !!product || notFound

  const isLow = product && product.reorderPoint !== null
    && product.currentStock <= product.reorderPoint

  const stockVariant = !product ? 'stone'
    : product.currentStock <= 0 ? 'red'
    : isLow                     ? 'gold'
    :                             'green'

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {notFound && !product ? (
          <View style={styles.notFound}>
            <Text style={styles.notFoundTitle}>{t(labels.ui.productNotFound)}</Text>
            <Text style={styles.notFoundSub}>{t(labels.ui.notFoundSub)}</Text>
            <Button label={t(labels.ui.close)} onPress={onClose} variant="secondary" fullWidth style={{ marginTop: 16 }} />
          </View>
        ) : product ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.name}>{product.name}</Text>
            {product.namEs && (
              <Text style={styles.nameEs}>{product.namEs}</Text>
            )}

            <View style={styles.row}>
              {product.sku && (
                <Text style={styles.sku}>SKU: {product.sku}</Text>
              )}
              <Badge
                label={`Stock: ${product.currentStock} ${product.unit}`}
                variant={stockVariant as 'green' | 'red' | 'gold' | 'stone'}
              />
            </View>

            {isLow && (
              <View style={styles.lowAlert}>
                <Text style={styles.lowText}>{t(labels.ui.belowReorder)} ({product.reorderPoint} {product.unit})</Text>
              </View>
            )}

            <View style={styles.actions}>
              <Button
                label={t(labels.ui.receive)}
                onPress={() => onReceive(product)}
                variant="primary"
                fullWidth
              />
              <Button
                label={t(labels.ui.adjustStock)}
                onPress={() => onAdjust(product)}
                variant="secondary"
                fullWidth
                style={{ marginTop: 10 }}
              />
              <Button
                label={t(labels.ui.viewDetails)}
                onPress={() => onView(product)}
                variant="ghost"
                fullWidth
                style={{ marginTop: 6 }}
              />
            </View>
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:        { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingTop: 12, maxHeight: '70%' },
  handle:       { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  name:         { fontSize: 20, fontWeight: '700', color: Colors.stoneDark },
  nameEs:       { fontSize: 15, color: Colors.stone, marginTop: 2 },
  row:          { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  sku:          { fontSize: 12, color: Colors.stoneLight, fontFamily: 'monospace' },
  lowAlert:     { backgroundColor: Colors.goldLight, borderRadius: 8, padding: 10, marginTop: 12 },
  lowText:      { fontSize: 13, color: '#92400E', fontWeight: '500' },
  actions:      { marginTop: 24 },
  notFound:     { paddingVertical: 16 },
  notFoundTitle:{ fontSize: 18, fontWeight: '700', color: Colors.stoneDark, textAlign: 'center' },
  notFoundSub:  { fontSize: 14, color: Colors.stone, textAlign: 'center', marginTop: 6 },
})
