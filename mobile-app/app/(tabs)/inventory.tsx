import { useState } from 'react'
import {
  View, Text, TextInput, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useProducts } from '@/hooks/useProducts'
import { useAppStore } from '@/stores/useAppStore'
import { labels } from '@/lib/labels'
import { Badge } from '@/components/ui/Badge'
import { Colors } from '@/constants/colors'

export default function InventoryScreen() {
  const router = useRouter()
  const lang   = useAppStore(s => s.lang)
  const t = (l: { en: string; es: string }) => lang === 'es' ? l.es : l.en
  const [search, setSearch] = useState('')
  const { products, loading, error, refetch } = useProducts(search)

  function stockVariant(stock: number, reorder: number | null) {
    if (stock <= 0) return 'red'
    if (reorder !== null && stock <= reorder) return 'gold'
    return 'green'
  }

  return (
    <View style={styles.screen}>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder={t(labels.ui.searchProducts)}
          placeholderTextColor={Colors.stoneLight}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      {error && (
        <Text style={styles.errorText}>Error: {error}</Text>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.terracotta} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={Colors.terracotta} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {search ? t(labels.ui.noSearchResults) : t(labels.ui.noProducts)}
            </Text>
          }
          renderItem={({ item: p }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/product/${p.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.rowMain}>
                <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                {p.namEs && <Text style={styles.productEs} numberOfLines={1}>{p.namEs}</Text>}
                {p.sku && <Text style={styles.sku}>{p.sku}</Text>}
              </View>
              <View style={styles.rowRight}>
                <Badge
                  label={`${p.currentStock} ${p.unit}`}
                  variant={stockVariant(p.currentStock, p.reorderPoint) as 'green' | 'red' | 'gold'}
                />
                {p.category && (
                  <Text style={styles.category} numberOfLines={1}>{p.category}</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: Colors.bgScreen },
  searchWrap:  { padding: 16, paddingBottom: 8 },
  search:      { backgroundColor: Colors.white, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: Colors.stoneDark },
  list:        { paddingHorizontal: 16, paddingBottom: 40 },
  emptyText:   { textAlign: 'center', color: Colors.stoneLight, fontSize: 14, marginTop: 48 },
  row:         { backgroundColor: Colors.white, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowMain:     { flex: 1 },
  rowRight:    { alignItems: 'flex-end', gap: 4 },
  productName: { fontSize: 15, fontWeight: '600', color: Colors.stoneDark },
  productEs:   { fontSize: 12, color: Colors.stone, marginTop: 1 },
  sku:         { fontSize: 11, color: Colors.stoneLight, fontFamily: 'monospace', marginTop: 2 },
  category:    { fontSize: 11, color: Colors.stoneLight },
  separator:   { height: 8 },
  errorText:   { color: Colors.red, fontSize: 13, margin: 16, textAlign: 'center' },
})
