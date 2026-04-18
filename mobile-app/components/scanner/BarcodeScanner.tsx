import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native'
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera'
import { useAppStore } from '@/stores/useAppStore'
import { labels } from '@/lib/labels'
import { Colors } from '@/constants/colors'

interface Props {
  onScan:  (barcode: string) => void
  onClose: () => void
  active:  boolean
}

export function BarcodeScanner({ onScan, onClose, active }: Props) {
  const lang = useAppStore(s => s.lang)
  const t = (l: { en: string; es: string }) => lang === 'es' ? l.es : l.en
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned]           = useState(false)
  const cooldown = useRef(false)

  useEffect(() => {
    if (!permission?.granted) requestPermission()
  }, [permission, requestPermission])

  useEffect(() => {
    if (active) setScanned(false)
  }, [active])

  function handleScan(result: BarcodeScanningResult) {
    if (cooldown.current || scanned) return
    cooldown.current = true
    setScanned(true)
    Vibration.vibrate(80)
    onScan(result.data)
    setTimeout(() => { cooldown.current = false }, 1500)
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.infoText}>Requesting camera permission…</Text>
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.infoText}>{lang === 'es' ? 'Se requiere acceso a la cámara para escanear.' : 'Camera access is required for scanning.'}</Text>
        <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
          <Text style={styles.grantText}>{lang === 'es' ? 'Conceder acceso' : 'Grant Access'}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['upc_a', 'ean13', 'ean8', 'code128', 'qr'] }}
        onBarcodeScanned={active ? handleScan : undefined}
      />

      {/* Viewfinder overlay */}
      <View style={styles.overlay}>
        <View style={styles.viewfinder} />
        <Text style={styles.hint}>{t(labels.ui.pointCamera)}</Text>
      </View>

      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeTxt}>✕</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#000' },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgScreen, padding: 24 },
  infoText:   { fontSize: 15, color: Colors.stone, textAlign: 'center', marginBottom: 16 },
  grantBtn:   { backgroundColor: Colors.terracotta, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  grantText:  { color: Colors.white, fontWeight: '600' },
  overlay:    { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  viewfinder: {
    width: 240, height: 160, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.terracotta,
    backgroundColor: 'transparent',
  },
  hint:       { color: Colors.white, fontSize: 13, marginTop: 16, opacity: 0.8 },
  closeBtn:   { position: 'absolute', top: 56, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  closeTxt:   { color: Colors.white, fontSize: 18, fontWeight: '600' },
})
