import { View, StyleSheet, ViewStyle } from 'react-native'
import { Colors } from '@/constants/colors'

interface Props {
  children: React.ReactNode
  style?:   ViewStyle
  padding?: number
}

export function Card({ children, style, padding = 16 }: Props) {
  return (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius:    12,
    borderWidth:     1,
    borderColor:     Colors.border,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.04,
    shadowRadius:    2,
    elevation:       1,
  },
})
