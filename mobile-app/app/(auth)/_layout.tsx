import { View, ActivityIndicator } from 'react-native'
import { Stack, Redirect } from 'expo-router'
import { useAppStore } from '@/stores/useAppStore'
import { Colors } from '@/constants/colors'

export default function AuthLayout() {
  const user      = useAppStore(s => s.user)
  const authReady = useAppStore(s => s.authReady)

  // Wait for the initial session check to complete
  if (!authReady) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bgScreen, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    )
  }

  // Already signed in — go straight to the app
  if (user) return <Redirect href="/(tabs)" />

  return <Stack screenOptions={{ headerShown: false }} />
}
