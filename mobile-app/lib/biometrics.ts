import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'

const BIOMETRIC_KEY = 'lh_biometric_enabled'

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync()
    if (!compatible) return false
    const enrolled = await LocalAuthentication.isEnrolledAsync()
    return !!enrolled
  } catch {
    return false
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(BIOMETRIC_KEY)
    return val === 'true'
  } catch {
    return false
  }
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(BIOMETRIC_KEY, enabled ? 'true' : 'false')
  } catch {
    // ignore — biometric is optional
  }
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage:         'Log in to La Hacienda',
      fallbackLabel:         'Use Password',
      cancelLabel:           'Cancel',
      disableDeviceFallback: false,
    })
    return result.success
  } catch {
    return false
  }
}
