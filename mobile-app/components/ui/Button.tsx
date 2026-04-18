import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native'
import { Colors } from '@/constants/colors'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface Props {
  label:     string
  onPress:   () => void
  variant?:  Variant
  loading?:  boolean
  disabled?: boolean
  style?:    ViewStyle
  fullWidth?: boolean
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, style, fullWidth }: Props) {
  const isDisabled = disabled || loading
  const bg = variant === 'primary'   ? Colors.terracotta
           : variant === 'secondary' ? Colors.white
           : variant === 'danger'    ? Colors.red
           :                          'transparent'

  const textColor = variant === 'primary'   ? Colors.white
                  : variant === 'secondary' ? Colors.stoneDark
                  : variant === 'danger'    ? Colors.white
                  :                          Colors.terracotta

  const borderColor = variant === 'secondary' ? Colors.border : 'transparent'

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        { backgroundColor: bg, borderColor, borderWidth: variant === 'secondary' ? 1 : 0 },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={textColor} size="small" />
        : <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      }
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base:      { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  fullWidth: { width: '100%' },
  disabled:  { opacity: 0.5 },
  label:     { fontSize: 15, fontWeight: '600' },
})
