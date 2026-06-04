import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  // Supervisão clínica (revisão/aprovação de sessões). Desligada por padrão —
  // a maioria dos cenários (atendimento individual) não precisa.
  supervisionEnabled: boolean
  // Feedback tátil (vibração) ao registrar
  hapticEnabled: boolean
  // Critério de maestria padrão para novas sessões
  defaultCriterion: number
  setSupervisionEnabled: (v: boolean) => void
  setHapticEnabled: (v: boolean) => void
  setDefaultCriterion: (v: number) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      supervisionEnabled: false,
      hapticEnabled: true,
      defaultCriterion: 80,
      setSupervisionEnabled: (v) => set({ supervisionEnabled: v }),
      setHapticEnabled: (v) => set({ hapticEnabled: v }),
      setDefaultCriterion: (v) => set({ defaultCriterion: v }),
    }),
    { name: 'aba_settings_v1' }
  )
)
