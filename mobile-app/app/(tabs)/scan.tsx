import { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner'
import { ScanResultSheet } from '@/components/scanner/ScanResultSheet'
import { lookupByBarcode } from '@/hooks/useProducts'
import type { ProductRow } from '@/hooks/useProducts'
import { useAppStore } from '@/stores/useAppStore'
import { Colors } from '@/constants/colors'

export default function ScanScreen() {
  const router = useRouter()
  const lang   = useAppStore(s => s.lang)

  const [scanning,  setScanning]  = useState(true)
  const [product,   setProduct]   = useState<ProductRow | null>(null)
  const [notFound,  setNotFound]  = useState(false)

  async function handleScan(barcode: string) {
    setScanning(false)
    const result = await lookupByBarcode(barcode)
    if (result) {
      setProduct(result)
    } else {
      setNotFound(true)
    }
  }

  function closeSheet() {
    setProduct(null)
    setNotFound(false)
    setScanning(true)
  }

  return (
    <View style={styles.container}>
      <BarcodeScanner
        active={scanning}
        onScan={handleScan}
        onClose={() => router.back()}
      />

      <ScanResultSheet
        product={product}
        notFound={notFound}
        lang={lang}
        onClose={closeSheet}
        onReceive={(p) => {
          closeSheet()
          router.push({ pathname: '/receive', params: { productId: p.id, productName: p.name } })
        }}
        onAdjust={(p) => {
          closeSheet()
          router.push({ pathname: '/adjust', params: { productId: p.id, productName: p.name } })
        }}
        onView={(p) => {
          closeSheet()
          router.push(`/product/${p.id}`)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
})
