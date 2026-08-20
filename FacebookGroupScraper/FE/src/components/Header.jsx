import { useState, useEffect, useCallback } from 'react'
import { fetchBotStatus, startBot, stopBot, quitBot } from '../api'

export default function Header() {
  const [status, setStatus] = useState({
    running: false,
    round_count: 0,
    session_posts: 0,
    total_db_posts: 0,
    current_group: null,
    seen_urls_count: 0,
  })

  const refreshStatus = useCallback(async () => {
    const data = await fetchBotStatus()
    if (data) setStatus(data)
  }, [])

  useEffect(() => {
    refreshStatus()
    const interval = setInterval(refreshStatus, 3000)
    return () => clearInterval(interval)
  }, [refreshStatus])

  const handleStart = async () => {
    await startBot()
    refreshStatus()
  }

  const handleStop = async () => {
    await stopBot()
    refreshStatus()
  }

  const handleQuit = async () => {
    if (window.confirm('Tắt bot hoàn toàn? Browser sẽ bị đóng.')) {
      await quitBot()
      refreshStatus()
    }
  }

  const fmt = (n) => {
    if (n >= 10000) return (n / 1000).toFixed(1) + 'K'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return String(n)
  }

  return (
    <header className="fixed top-0 left-72 right-0 h-20 bg-surface/90 backdrop-blur-md border-b border-outline-variant/10 z-40 px-gutter flex items-center justify-between">
      {/* Left: Status & Stats */}
      <div className="flex items-center gap-gutter">
        <div className="flex flex-col">
          <span className="text-[10px] font-label-bold text-text-muted uppercase tracking-widest">System Status</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status.running ? 'bg-status-running animate-pulse' : 'bg-status-stopped'}`} />
            <span className={`text-label-bold font-label-bold ${status.running ? 'text-status-running' : 'text-status-stopped'}`}>
              {status.running ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>
        </div>

        <div className="h-10 w-[1px] bg-outline-variant/20" />

        <div className="flex gap-stack-lg">
          <div className="flex flex-col">
            <span className="text-[10px] font-label-bold text-text-muted uppercase">Rounds</span>
            <span className="font-headline-sm text-headline-sm text-primary">{status.round_count}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-label-bold text-text-muted uppercase">Session</span>
            <span className="font-headline-sm text-headline-sm text-primary">{status.session_posts}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-label-bold text-text-muted uppercase">Total DB</span>
            <span className="font-headline-sm text-headline-sm text-primary">{fmt(status.total_db_posts)}</span>
          </div>
        </div>
      </div>

      {/* Right: Control Buttons */}
      <div className="flex items-center gap-stack-md">
        <button
          onClick={handleStart}
          className="bg-secondary-container text-on-secondary-container px-6 py-2 rounded-lg font-label-bold text-label-bold hover:shadow-[0_0_15px_rgba(195,244,0,0.3)] transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">play_arrow</span>START
        </button>
        <button
          onClick={handleStop}
          className="border border-status-stopped text-status-stopped px-6 py-2 rounded-lg font-label-bold text-label-bold hover:bg-status-stopped hover:text-white transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">stop</span>STOP
        </button>
        <button
          onClick={handleQuit}
          className="text-on-surface-variant hover:text-error transition-colors"
          title="Quit (close browser)"
        >
          <span className="material-symbols-outlined">power_settings_new</span>
        </button>
      </div>
    </header>
  )
}
