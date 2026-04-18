import { useEffect, useRef } from 'react'
import { Animated, Text, StyleSheet, Platform } from 'react-native'
import { Colors } from '@/constants/colors'

interface Props {
  message:  string
  type?:    'success' | 'error'
  visible:  boolean
  onHide:   () => void
}

export function Toast({ message, type = 'success', visible, onHide }: Props) {
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onHide())
    }
  }, [visible, opacity, onHide])

  if (!visible) return null

  const bg = type === 'success' ? Colors.green : Colors.red

  return (
    <Animated.View style={[styles.container, { backgroundColor: bg, opacity }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position:     'absolute',
    bottom:       Platform.OS === 'ios' ? 100 : 80,
    left:         24,
    right:        24,
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderRadius:      10,
    zIndex:            999,
  },
  text: { color: Colors.white, fontSize: 14, fontWeight: '600', textAlign: 'center' },
})
