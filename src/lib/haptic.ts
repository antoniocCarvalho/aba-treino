import { useSettingsStore } from '../stores/settingsStore'

/** Vibra o dispositivo, respeitando a preferência do usuário. */
export function haptic(ms = 25) {
  if (useSettingsStore.getState().hapticEnabled && navigator.vibrate) {
    navigator.vibrate(ms)
  }
}
