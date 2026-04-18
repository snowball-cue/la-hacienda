import { View, Text, StyleSheet } from 'react-native'
import { Colors } from '@/constants/colors'

type Variant = 'green' | 'red' | 'gold' | 'stone' | 'blue'

interface Props {
  label:    string
  variant?: Variant
}

const COLORS: Record<Variant, { bg: string; text: string }> = {
  green: { bg: Colors.greenLight, text: Colors.green },
  red:   { bg: Colors.redLight,   text: Colors.red   },
  gold:  { bg: Colors.goldLight,  text: '#92400E'    },
  stone: { bg: Colors.border,     text: Colors.stone  },
  blue:  { bg: Colors.blueLight,  text: Colors.blue   },
}

export function Badge({ label, variant = 'stone' }: Props) {
  const { bg, text } = COLORS[variant]
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label.toUpperCase()}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  text:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
})
