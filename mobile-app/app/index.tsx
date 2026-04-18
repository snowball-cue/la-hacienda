import { Redirect } from 'expo-router'

// Default entry — (auth) layout will redirect to (tabs) if already signed in.
export default function Index() {
  return <Redirect href="/(auth)/login" />
}
