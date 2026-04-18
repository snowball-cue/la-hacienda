import { View, ActivityIndicator } from 'react-native'
import { Tabs, Redirect } from 'expo-router'
import { Text } from 'react-native'
import { useAppStore } from '@/stores/useAppStore'
import { Colors } from '@/constants/colors'

function TabIcon({ label, color }: { label: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{label}</Text>
}

export default function TabLayout() {
  const user      = useAppStore(s => s.user)
  const authReady = useAppStore(s => s.authReady)

  if (!authReady) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bgScreen, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    )
  }

  // Signed out — go to login
  if (!user) return <Redirect href="/(auth)/login" />

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   Colors.terracotta,
        tabBarInactiveTintColor: Colors.stoneLight,
        tabBarStyle:             { backgroundColor: Colors.white, borderTopColor: Colors.border },
        tabBarLabelStyle:        { fontSize: 11, fontWeight: '600' },
        headerStyle:             { backgroundColor: Colors.bgScreen },
        headerTitleStyle:        { color: Colors.stoneDark, fontWeight: '700' },
        headerShadowVisible:     false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title:       'Home',
          tabBarLabel: 'Home',
          tabBarIcon:  ({ color }) => <TabIcon label="⌂" color={color} />,
          headerTitle: 'La Hacienda',
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title:       'Scan',
          tabBarLabel: 'Scan',
          tabBarIcon:  ({ color }) => <TabIcon label="⊡" color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title:       'Inventory',
          tabBarLabel: 'Inventory',
          tabBarIcon:  ({ color }) => <TabIcon label="☰" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title:       'Reports',
          tabBarLabel: 'Reports',
          tabBarIcon:  ({ color }) => <TabIcon label="↗" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title:       'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon:  ({ color }) => <TabIcon label="⚙" color={color} />,
        }}
      />
    </Tabs>
  )
}
