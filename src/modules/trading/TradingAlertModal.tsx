import { useState, useEffect } from 'react'
import {
  X,
  Bell,
  Target,
  Settings2,
  Send,
  CheckCircle2,
  AlertCircle,
  Zap,
  CheckCheck,
  Clock,
  Slack,
} from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import {
  useTradingAlerts,
  useMarkTradingAlertsRead,
  useTradingSettings,
  useSaveTradingSettings,
  useTestTradingSlack,
  useUpdateWatchlistItem,
  useRunTradingMonitor,
} from '../../hooks/useTrading'
import type { WatchlistItem, TradingMonitorSettings } from '../../types/trading'

interface Props {
  open: boolean
  initialTab?: 'alerts' | 'targets' | 'settings'
  watchlist: WatchlistItem[]
  onClose: () => void
  onSelectSymbol?: (symbol: string) => void
}

function fmtPrice(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return '—'
  if (v >= 1000) return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (v >= 1) return v.toFixed(2)
  if (v >= 0.01) return v.toFixed(4)
  return v.toFixed(6)
}

export default function TradingAlertModal({
  open,
  initialTab = 'alerts',
  watchlist,
  onClose,
  onSelectSymbol,
}: Props) {
  const [tab, setTab] = useState<'alerts' | 'targets' | 'settings'>(initialTab)
  const alertsQ = useTradingAlerts(50)
  const markReadMut = useMarkTradingAlertsRead()
  const settingsQ = useTradingSettings()
  const saveSettingsMut = useSaveTradingSettings()
  const testSlackMut = useTestTradingSlack()
  const updateWlMut = useUpdateWatchlistItem()
  const runMonitorMut = useRunTradingMonitor()

  const [form, setForm] = useState<TradingMonitorSettings>({
    monitor_enabled: true,
    slack_enabled: false,
    slack_webhook_url: '',
    slack_bot_token: '',
    slack_channel: '#trading-alerts',
    notify_signal_flip: true,
    notify_key_levels: true,
    notify_extreme_rsi: true,
    notify_price_targets: true,
  })
  const [targetEdits, setTargetEdits] = useState<
    Record<number, { above: string; below: string; enabled: boolean; saved?: boolean }>
  >({})
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    if (open) setTab(initialTab)
  }, [open, initialTab])

  useEffect(() => {
    if (settingsQ.data) {
      setForm(settingsQ.data)
    }
  }, [settingsQ.data])

  useEffect(() => {
    const map: Record<number, { above: string; below: string; enabled: boolean }> = {}
    for (const w of watchlist) {
      map[w.id] = {
        above: w.target_above != null ? String(w.target_above) : '',
        below: w.target_below != null ? String(w.target_below) : '',
        enabled: w.alerts_enabled !== false,
      }
    }
    setTargetEdits(map)
  }, [watchlist])

  if (!open) return null

  const alerts = alertsQ.data?.alerts ?? []
  const unreadCount = alertsQ.data?.unread_count ?? 0

  const handleSaveSettings = async () => {
    setFeedback(null)
    try {
      await saveSettingsMut.mutateAsync(form)
      setFeedback({ type: 'ok', text: 'Hourly monitor & Slack settings saved.' })
    } catch (err: any) {
      setFeedback({ type: 'err', text: err?.response?.data?.error || 'Failed to save settings' })
    }
  }

  const handleTestSlack = async () => {
    setFeedback(null)
    try {
      await saveSettingsMut.mutateAsync(form)
      const res = await testSlackMut.mutateAsync(form)
      if (res.ok) {
        setFeedback({ type: 'ok', text: 'Test alert delivered to Slack!' })
      } else {
        setFeedback({ type: 'err', text: res.error || 'Slack test failed' })
      }
    } catch (err: any) {
      setFeedback({
        type: 'err',
        text: err?.response?.data?.error || err?.message || 'Slack test failed',
      })
    }
  }

  const handleRunScanNow = async () => {
    setFeedback(null)
    try {
      const res = await runMonitorMut.mutateAsync()
      setFeedback({
        type: 'ok',
        text: `Hourly scan complete: ${res.scanned} tickers checked, ${res.alertsTriggered} new alert(s) triggered (${res.slackSent} sent to Slack).`,
      })
    } catch (err: any) {
      setFeedback({ type: 'err', text: err?.response?.data?.error || 'Failed to run scan' })
    }
  }

  const handleSaveTickerTargets = async (item: WatchlistItem) => {
    const edit = targetEdits[item.id]
    if (!edit) return
    try {
      await updateWlMut.mutateAsync({
        id: item.id,
        payload: {
          target_above: edit.above.trim() === '' ? null : Number(edit.above),
          target_below: edit.below.trim() === '' ? null : Number(edit.below),
          alerts_enabled: edit.enabled,
        },
      })
      setTargetEdits((prev) => ({
        ...prev,
        [item.id]: { ...prev[item.id], saved: true },
      }))
      setTimeout(() => {
        setTargetEdits((prev) =>
          prev[item.id] ? { ...prev, [item.id]: { ...prev[item.id], saved: false } } : prev,
        )
      }, 1800)
    } catch {}
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(4, 7, 14, 0.78)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card animate-slide-up"
        style={{
          width: '100%',
          maxWidth: 740,
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(13, 17, 23, 0.98)',
          border: '1px solid var(--border-active)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--accent-cyan-dim)',
                border: '1px solid var(--border-active)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={16} color="var(--accent-cyan)" />
            </div>
            <div>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16 }}>
                Hourly Watchlist Monitor & Alert Center
              </h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Automated 1-hour technical scanner · In-App + Mobile Push + Slack Channel Alerts
              </p>
            </div>
          </div>

          <button className="btn-ghost" onClick={onClose} style={{ padding: '6px 8px' }}>
            <X size={15} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.02)',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              {
                id: 'alerts' as const,
                label: `Alert Feed${unreadCount > 0 ? ` (${unreadCount})` : ''}`,
                icon: Bell,
              },
              { id: 'targets' as const, label: 'Ticker Price Targets', icon: Target },
              { id: 'settings' as const, label: 'Monitor & Slack Config', icon: Settings2 },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id)
                  setFeedback(null)
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1px solid ${tab === t.id ? 'var(--border-active)' : 'var(--border)'}`,
                  background: tab === t.id ? 'var(--accent-cyan-dim)' : 'transparent',
                  color: tab === t.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                }}
              >
                <t.icon size={13} />
                {t.label}
              </button>
            ))}
          </div>

          <button
            className="btn-primary"
            onClick={handleRunScanNow}
            disabled={runMonitorMut.isPending}
            style={{ fontSize: 12, padding: '6px 12px' }}
          >
            {runMonitorMut.isPending ? <Spinner size={12} /> : <Zap size={13} />}
            {runMonitorMut.isPending ? 'Scanning Watchlist...' : 'Run Hourly Scan Now'}
          </button>
        </div>

        {feedback && (
          <div
            style={{
              margin: '12px 20px 0',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background:
                feedback.type === 'ok' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${
                feedback.type === 'ok' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'
              }`,
              color: feedback.type === 'ok' ? '#34d399' : '#f87171',
            }}
          >
            {feedback.type === 'ok' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tab === 'alerts' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Showing latest {alerts.length} triggered alerts (4h cooldown deduplication active)
                </span>
                {unreadCount > 0 && (
                  <button
                    className="btn-ghost"
                    onClick={() => markReadMut.mutate()}
                    disabled={markReadMut.isPending}
                    style={{ fontSize: 11, padding: '4px 10px' }}
                  >
                    <CheckCheck size={13} />
                    Mark All Read
                  </button>
                )}
              </div>

              {alertsQ.isLoading ? (
                <div style={{ padding: 36, display: 'flex', justifyContent: 'center' }}>
                  <Spinner size={22} />
                </div>
              ) : alerts.length === 0 ? (
                <GlassCard style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No alerts triggered yet. Click <strong>Run Hourly Scan Now</strong> above or configure custom price targets in the <strong>Ticker Price Targets</strong> tab.
                </GlassCard>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {alerts.map((a) => {
                    const isBull = a.severity === 'bullish'
                    const isBear = a.severity === 'bearish'
                    const borderColor = isBull
                      ? 'rgba(16,185,129,0.3)'
                      : isBear
                        ? 'rgba(239,68,68,0.3)'
                        : 'rgba(245,158,11,0.3)'
                    return (
                      <div
                        key={a.id}
                        onClick={() => {
                          if (onSelectSymbol) {
                            onSelectSymbol(a.symbol)
                            onClose()
                          }
                        }}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 10,
                          background: a.read ? 'rgba(255,255,255,0.02)' : 'rgba(6,182,212,0.06)',
                          border: `1px solid ${a.read ? 'var(--border)' : borderColor}`,
                          cursor: onSelectSymbol ? 'pointer' : 'default',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                              {a.title}
                            </span>
                            {a.slack_sent && (
                              <span
                                style={{
                                  fontSize: 9,
                                  fontFamily: 'IBM Plex Mono, monospace',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: 'rgba(168,85,247,0.16)',
                                  color: '#c084fc',
                                }}
                              >
                                SLACK SENT
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} />
                            {new Date(a.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {a.message}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'targets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Set optional custom price targets per watchlist ticker. When the hourly scanner sees price cross your upper or lower target, it triggers an immediate In-App, Mobile Push, and Slack alert.
              </p>

              {watchlist.map((w) => {
                const edit = targetEdits[w.id] || { above: '', below: '', enabled: true }
                const curPrice = w.latest?.price
                return (
                  <div
                    key={w.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.025)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 130 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, fontSize: 14 }}>
                          {w.symbol}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--accent-cyan)', fontFamily: 'IBM Plex Mono, monospace', textTransform: 'uppercase' }}>
                          {w.asset_type}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace', marginTop: 2 }}>
                        Spot: {curPrice != null ? `${w.latest?.currency || 'USD'} ${fmtPrice(curPrice)}` : '—'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={edit.enabled}
                          onChange={(e) =>
                            setTargetEdits((prev) => ({
                              ...prev,
                              [w.id]: { ...edit, enabled: e.target.checked },
                            }))
                          }
                        />
                        Monitor
                      </label>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--accent-green)', fontFamily: 'IBM Plex Mono, monospace' }}>
                          Above ≥
                        </span>
                        <input
                          className="input"
                          type="number"
                          step="any"
                          placeholder="e.g. 98000"
                          value={edit.above}
                          onChange={(e) =>
                            setTargetEdits((prev) => ({
                              ...prev,
                              [w.id]: { ...edit, above: e.target.value },
                            }))
                          }
                          style={{ width: 110, padding: '5px 8px', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--accent-red)', fontFamily: 'IBM Plex Mono, monospace' }}>
                          Below ≤
                        </span>
                        <input
                          className="input"
                          type="number"
                          step="any"
                          placeholder="e.g. 85000"
                          value={edit.below}
                          onChange={(e) =>
                            setTargetEdits((prev) => ({
                              ...prev,
                              [w.id]: { ...edit, below: e.target.value },
                            }))
                          }
                          style={{ width: 110, padding: '5px 8px', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}
                        />
                      </div>

                      <button
                        className="btn-primary"
                        onClick={() => handleSaveTickerTargets(w)}
                        disabled={updateWlMut.isPending}
                        style={{ padding: '5px 12px', fontSize: 11 }}
                      >
                        {edit.saved ? 'Saved ✓' : 'Save'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Hourly Monitor Rules */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14 }}>
                      Hourly Watchlist Scanner (Every 1 Hour at :00)
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Automatically fetches 200 candles, recalculates indicators, and checks alert rules for all watchlist tickers
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.monitor_enabled}
                    onChange={(e) => setForm((f) => ({ ...f, monitor_enabled: e.target.checked }))}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  {[
                    {
                      key: 'notify_signal_flip' as const,
                      title: 'Signal Flips & Strong Signals',
                      desc: 'Neutral → BUY / STRONG BUY / SELL / STRONG SELL',
                    },
                    {
                      key: 'notify_key_levels' as const,
                      title: 'Key Level & Entry Zone Hits',
                      desc: 'Price testing S1 Support, R1 Resistance, or EMA 21 Entry Zone',
                    },
                    {
                      key: 'notify_extreme_rsi' as const,
                      title: 'RSI Extreme & Bollinger Squeeze',
                      desc: 'RSI ≤ 30 oversold, RSI ≥ 72 overbought, or Squeeze + Volume',
                    },
                    {
                      key: 'notify_price_targets' as const,
                      title: 'Custom Ticker Price Targets',
                      desc: 'Price crosses your per-ticker Above / Below thresholds',
                    },
                  ].map((rule) => (
                    <label
                      key={rule.key}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form[rule.key]}
                        onChange={(e) => setForm((f) => ({ ...f, [rule.key]: e.target.checked }))}
                        style={{ marginTop: 3 }}
                      />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {rule.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {rule.desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Slack Channel Integration */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Slack size={16} color="var(--accent-cyan)" />
                    <div>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14 }}>
                        Slack Channel Notification
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Provide either a Slack Incoming Webhook URL OR a Slack Bot Token (`xoxb-...`) + Channel
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.slack_enabled}
                    onChange={(e) => setForm((f) => ({ ...f, slack_enabled: e.target.checked }))}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      Option A: Slack Incoming Webhook URL (Recommended — 1-step setup)
                    </label>
                    <input
                      className="input"
                      type="text"
                      placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXX"
                      value={form.slack_webhook_url}
                      onChange={(e) => setForm((f) => ({ ...f, slack_webhook_url: e.target.value }))}
                      style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}
                    />
                  </div>

                  <div className="trading-two-col">
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                        Option B: Slack Bot Token (`xoxb-...`)
                      </label>
                      <input
                        className="input"
                        type="password"
                        placeholder="xoxb-..."
                        value={form.slack_bot_token}
                        onChange={(e) => setForm((f) => ({ ...f, slack_bot_token: e.target.value }))}
                        style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                        Slack Channel Name or ID
                      </label>
                      <input
                        className="input"
                        type="text"
                        placeholder="#trading-alerts or C01234567"
                        value={form.slack_channel}
                        onChange={(e) => setForm((f) => ({ ...f, slack_channel: e.target.value }))}
                        style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, flexWrap: 'wrap', gap: 10 }}>
                  <button
                    className="btn-ghost"
                    onClick={handleTestSlack}
                    disabled={testSlackMut.isPending}
                  >
                    {testSlackMut.isPending ? <Spinner size={13} /> : <Send size={13} />}
                    Send Test Slack Alert
                  </button>

                  <button
                    className="btn-primary"
                    onClick={handleSaveSettings}
                    disabled={saveSettingsMut.isPending}
                  >
                    {saveSettingsMut.isPending ? <Spinner size={13} /> : <CheckCircle2 size={13} />}
                    Save Monitor & Slack Config
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
