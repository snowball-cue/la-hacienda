import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { Colors } from '@/constants/colors'

export default function RootLayout() {
  // Initialize the auth listener once at the root.
  // Group layouts handle their own redirects via <Redirect />.
  useCurrentUser()

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index"        options={{ headerShown: false }} />
        <Stack.Screen name="(auth)"       options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)"       options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ presentation: 'card',  headerShown: true, title: 'Product Detail', headerTintColor: Colors.terracotta }} />
        <Stack.Screen name="receive"      options={{ presentation: 'modal', headerShown: true, title: 'Receive Goods',   headerTintColor: Colors.terracotta }} />
        <Stack.Screen name="adjust"       options={{ presentation: 'modal', headerShown: true, title: 'Adjust Stock',    headerTintColor: Colors.terracotta }} />
      </Stack>
    </>
  )
}
