import { useEffect, useRef } from 'react'
import { useSessionStore } from '../stores/sessionStore'
import { SessionConfig } from '../components/session/SessionConfig'
import { SessionRecording } from '../components/session/SessionRecording'
import { SessionResult } from '../components/session/SessionResult'

export function SessionPage({ onNavigate }: { onNavigate: (t: string) => void }) {
  const panel = useSessionStore((s) => s.panel)
  const tickTimer = useSessionStore((s) => s.tickTimer)
  const tickDurTimer = useSessionStore((s) => s.tickDurTimer)
  const tickIntervalTimer = useSessionStore((s) => s.tickIntervalTimer)
  const active = useSessionStore((s) => s.active)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const durRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const intRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (active && panel === 'recording') {
      timerRef.current = setInterval(tickTimer, 1000)
      durRef.current = setInterval(tickDurTimer, 1000)
      intRef.current = setInterval(tickIntervalTimer, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (durRef.current) clearInterval(durRef.current)
      if (intRef.current) clearInterval(intRef.current)
    }
  }, [active, panel])

  if (panel === 'recording') return <SessionRecording />
  if (panel === 'result')    return <SessionResult onNavigate={onNavigate} />
  return <SessionConfig />
}
