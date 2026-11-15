import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Save, Play, CheckCircle, XCircle, RefreshCw, AlertTriangle, MessageSquare, ArrowLeft, LineChart } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import {
  useQuantConfig, useQuantContainerStatus,
  useSaveQuantConfig, useStartMoomoo, useStopMoomoo, useTriggerScheduler,
  useDiscoverMoomooAccounts, useMoomooVerifyStatus, useSubmitMoomooVerifyCode
} from '../../hooks/useQuant'
import { useTradingSettings, useUpdatePhaseConfig } from '../../hooks/useTrading'

function formatAccountLabel(accType?: string, trdMarketAuth?: string[]): string {
  if (!accType) return ''
  const markets = trdMarketAuth?.length ? ` · ${trdMarketAuth.join(',')}` : ''
  return `${accType} Account${markets}`
}

export default function SettingsPage() {
  const configQ = useQuantConfig()
  const statusQ = useQuantContainerStatus()
  const tradingSettingsQ = useTradingSettings()
  const updatePhaseConfig = useUpdatePhaseConfig()
  const saveConfig = useSaveQuantConfig()
  const startMoomoo = useStartMoomoo()
  const stopMoomoo = useStopMoomoo()
  const triggerPipeline = useTriggerScheduler()
  const discoverAccounts = useDiscoverMoomooAccounts()
  const moomooRunningForVerify = statusQ.data?.moomoo_opend?.running === true
  const verifyStatusQ = useMoomooVerifyStatus(moomooRunningForVerify)
  const submitVerifyCode = useSubmitMoomooVerifyCode()
  const [verifyCode, setVerifyCode] = useState('')

  const [moomooAccount, setMoomooAccount] = useState('')
  const [moomooPassword, setMoomooPassword] = useState('')
  const [tradePwd, setTradePwd] = useState('')
  const [allowedAccId, setAllowedAccId] = useState('')
  const [tradeEnv, setTradeEnv] = useState<'SIMULATE' | 'REAL'>('SIMULATE')
  const [autoExecute, setAutoExecute] = useState(true)
  const [saved, setSaved] = useState(false)
  const [pipelineMsg, setPipelineMsg] = useState('')

  useEffect(() => {
    if (configQ.data) {
      setMoomooAccount(configQ.data.moomoo_account ?? '')
      setAllowedAccId(configQ.data.allowed_acc_id ?? '')
      setTradeEnv(configQ.data.trade_env ?? 'SIMULATE')
      setAutoExecute(configQ.data.auto_execute ?? true)
    }
  }, [configQ.data])

  const handleSave = async () => {
    const updates: Record<string, string | boolean> = {
      moomoo_account: moomooAccount,
      allowed_acc_id: allowedAccId,
      trade_env: tradeEnv,
      auto_execute: autoExecute,
    }
    if (moomooPassword) updates.moomoo_password = moomooPassword
    if (tradePwd) updates.moomoo_trade_pwd = tradePwd

    saveConfig.mutate(updates, {
      onSuccess: () => {
        setSaved(true)
        setMoomooPassword('')
        setTradePwd('')
        setTimeout(() => setSaved(false), 3000)
      },
    })
  }

  const handleSubmitVerifyCode = () => {
    if (!verifyCode.trim()) return
    submitVerifyCode.mutate(verifyCode.trim(), {
      onSuccess: () => setVerifyCode(''),
    })
  }

  const handlePipeline = (market: 'US' | 'SGX') => {
    triggerPipeline.mutate(market, {
      onSuccess: () => {
        setPipelineMsg(`${market} pipeline triggered`)
        setTimeout(() => setPipelineMsg(''), 4000)
      },
    })
  }

  const quantApiStatus = statusQ.data?.quant_api
  const moomooStatus = statusQ.data?.moomoo_opend
  const moomooRunning = moomooStatus?.running === true

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '9px 12px',
    color: 'var(--text-primary)',
    fontSize: 13,
    fontFamily: 'IBM Plex Mono',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'var(--text-muted)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: 6,
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Bot &amp; Phase Settings</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Phase 1 &amp; Phase 2 onboarding config, moomoo OpenD credentials &amp; container control</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Link
            to="/internal/quant"
            className="btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13, padding: '6px 12px' }}
          >
            <ArrowLeft size={14} />
            Back to Model Perf
          </Link>
          <Link
            to="/internal/trading"
            className="btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13, padding: '6px 12px' }}
          >
            <LineChart size={14} />
            Trading Hub
          </Link>
          <button className="btn-ghost" onClick={() => { configQ.refetch(); statusQ.refetch(); tradingSettingsQ.refetch() }} style={{ padding: '6px 10px' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Container status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          {
            label: 'quant-api',
            running: quantApiStatus?.running,
            healthy: quantApiStatus?.healthy,
            status: quantApiStatus?.status ?? '—',
          },
          {
            label: 'moomoo-opend',
            running: moomooStatus?.running,
            healthy: moomooStatus?.running,
            status: moomooStatus?.status ?? '—',
          },
        ].map(c => (
          <GlassCard key={c.label} style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            {statusQ.isLoading ? <Spinner size={14} /> : c.running
              ? <CheckCircle size={16} color="var(--accent-green)" />
              : <XCircle size={16} color="var(--accent-red)" />}
            <div>
              <p style={{ fontFamily: 'IBM Plex Mono', fontSize: 13, fontWeight: 500 }}>{c.label}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.status}</p>
            </div>
            {c.healthy && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--accent-green)', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 10 }}>healthy</span>}
          </GlassCard>
        ))}
      </div>

      {/* moomoo OpenD control */}
      <GlassCard style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, fontSize: 14 }}>moomoo OpenD Gateway</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {moomooRunning ? 'Running — paper trading active' : 'Stopped — start to enable paper trading'}
          </p>
        </div>
        {moomooRunning ? (
          <button className="btn-ghost" onClick={() => stopMoomoo.mutate()} disabled={stopMoomoo.isPending}
            style={{ padding: '7px 18px', fontSize: 13, color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}>
            {stopMoomoo.isPending ? <Spinner size={13} /> : 'Stop'}
          </button>
        ) : (
          <button className="btn-primary" onClick={() => startMoomoo.mutate()} disabled={startMoomoo.isPending}
            style={{ padding: '7px 18px', fontSize: 13 }}>
            {startMoomoo.isPending ? <Spinner size={13} /> : 'Start moomoo OpenD'}
          </button>
        )}
        {startMoomoo.isError && (
          <p style={{ fontSize: 12, color: 'var(--accent-red)', width: '100%' }}>
            Container not found. Deploy it first: <code style={{ fontSize: 11 }}>docker compose -f dc-quant-bot.yml up -d moomoo-opend</code>
          </p>
        )}
      </GlassCard>

      {/* SMS verification prompt */}
      {verifyStatusQ.data?.status === 'code_requested' && (
        <GlassCard style={{ padding: '16px 20px', border: '1px solid var(--accent-amber, #f59e0b)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <MessageSquare size={18} color="var(--accent-amber, #f59e0b)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 14 }}>moomoo OpenD needs a verification code</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                moomoo sent an SMS code to your registered phone number. Enter it below to finish logging in.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <input
                  style={{ ...inputStyle, width: 160, flex: 'none' }}
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value)}
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="off"
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmitVerifyCode() }}
                />
                <button className="btn-primary" onClick={handleSubmitVerifyCode}
                  disabled={submitVerifyCode.isPending || !verifyCode.trim()}
                  style={{ padding: '7px 18px', fontSize: 13 }}>
                  {submitVerifyCode.isPending ? <Spinner size={13} /> : 'Submit code'}
                </button>
              </div>
              {submitVerifyCode.isError && (
                <p style={{ fontSize: 12, color: 'var(--accent-red)', marginTop: 8 }}>Failed to submit code — try again.</p>
              )}
              {submitVerifyCode.isSuccess && (
                <p style={{ fontSize: 12, color: 'var(--accent-green)', marginTop: 8 }}>Code submitted — waiting for moomoo OpenD to confirm.</p>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Phase 1 & Phase 2 Onboarding Config (Defaulted ON for SIMULATE & REAL) */}
      <GlassCard style={{ padding: 24, border: '1px solid rgba(6, 182, 212, 0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
              ⚙️ Phase 1 &amp; Phase 2 Quant Engine Onboarding (SIMULATE &amp; REAL)
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Configure whether Phase 1 (Macro Regime, 20d Relative Strength Alpha &amp; RL Contextual Bandit Q-Edge) and Phase 2 (FinBERT News Sentiment &amp; Severe Event Risk Guardrails) are active for SIMULATE and REAL evaluations. Defaulted ON for both environments.
            </p>
          </div>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 9px',
            borderRadius: 6,
            background: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--accent-green)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            fontFamily: 'IBM Plex Mono',
          }}>
            DEFAULT: ON (SIMULATE &amp; REAL)
          </span>
        </div>

        {(() => {
          const p1Sim = tradingSettingsQ.data?.phase1_simulate_enabled !== false
          const p2Sim = tradingSettingsQ.data?.phase2_simulate_enabled !== false
          const p1Real = tradingSettingsQ.data?.phase1_real_enabled !== false
          const p2Real = tradingSettingsQ.data?.phase2_real_enabled !== false

          const renderCard = (
            envLabel: string,
            isReal: boolean,
            p1: boolean,
            p2: boolean,
            onToggleP1: () => void,
            onToggleP2: () => void,
          ) => (
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: isReal ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(6, 182, 212, 0.35)',
                borderRadius: 10,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: isReal ? 'var(--accent-amber, #fbbf24)' : 'var(--accent-cyan)',
                  fontFamily: 'IBM Plex Mono',
                }}>
                  {envLabel}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {p1 && p2 ? 'Phase 1 + 2 Active' : p1 ? 'Phase 1 Only' : p2 ? 'Phase 2 Only' : 'Base Technicals Only'}
                </span>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: p1 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.02)',
                  border: p1 ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Phase 1: Macro Regime, 20d Alpha &amp; RL Contextual Bandit
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    SPY/VIX/10Y/STI/BTC regime scoring + online RL policy Q-Edge (±15 pts)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={p1}
                  disabled={updatePhaseConfig.isPending}
                  onChange={onToggleP1}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: p2 ? 'rgba(6, 182, 212, 0.1)' : 'rgba(255,255,255,0.02)',
                  border: p2 ? '1px solid rgba(6, 182, 212, 0.35)' : '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Phase 2: FinBERT News Sentiment &amp; Catalyst Guardrails
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Yahoo/Google News catalyst scoring (±18 pts) + falling-knife auto-cancel
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={p2}
                  disabled={updatePhaseConfig.isPending}
                  onChange={onToggleP2}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </label>
            </div>
          )

          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14 }}>
              {renderCard(
                '🧪 SIMULATE (Paper Trading)',
                false,
                p1Sim,
                p2Sim,
                () => updatePhaseConfig.mutate({ phase1_simulate_enabled: !p1Sim }),
                () => updatePhaseConfig.mutate({ phase2_simulate_enabled: !p2Sim }),
              )}
              {renderCard(
                '💵 REAL (Live Moomoo Brokerage)',
                true,
                p1Real,
                p2Real,
                () => updatePhaseConfig.mutate({ phase1_real_enabled: !p1Real }),
                () => updatePhaseConfig.mutate({ phase2_real_enabled: !p2Real }),
              )}
            </div>
          )
        })()}
      </GlassCard>

      {/* Config form */}
      <GlassCard style={{ padding: 24 }}>
        <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 20 }}>moomoo Credentials</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>moomoo Account (email)</label>
            <input style={inputStyle} value={moomooAccount} onChange={e => setMoomooAccount(e.target.value)}
              placeholder="your@email.com" autoComplete="off" />
          </div>
          <div>
            <label style={labelStyle}>
              moomoo Password
              {configQ.data?.password_set && <span style={{ marginLeft: 8, color: 'var(--accent-green)', fontSize: 10 }}>✓ set</span>}
            </label>
            <input style={inputStyle} type="password" value={moomooPassword} onChange={e => setMoomooPassword(e.target.value)}
              placeholder={configQ.data?.password_set ? 'leave blank to keep current' : 'enter password'} />
          </div>
          <div>
            <label style={labelStyle}>
              Trade Password
              {configQ.data?.trade_pwd_set && <span style={{ marginLeft: 8, color: 'var(--accent-green)', fontSize: 10 }}>✓ set</span>}
            </label>
            <input style={inputStyle} type="password" value={tradePwd} onChange={e => setTradePwd(e.target.value)}
              placeholder={configQ.data?.trade_pwd_set ? 'leave blank to keep current' : 'enter trade PIN'} />
          </div>
          <div>
            <label style={labelStyle}>Allowed Account ID</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={allowedAccId}
                onChange={e => setAllowedAccId(e.target.value)}
                placeholder="click Discover or enter manually"
                autoComplete="off"
              />
              <button
                className="btn-ghost"
                onClick={() => discoverAccounts.mutate(undefined, {
                  onSuccess: (data) => {
                    const simAccount = data.accounts?.find((a: any) => a.trd_env === 'SIMULATE')
                    if (simAccount) setAllowedAccId(simAccount.acc_id)
                  },
                })}
                disabled={discoverAccounts.isPending}
                style={{ padding: '7px 14px', fontSize: 12, whiteSpace: 'nowrap' }}
              >
                {discoverAccounts.isPending ? <Spinner size={12} /> : 'Discover'}
              </button>
            </div>
            {discoverAccounts.data?.accounts?.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {discoverAccounts.data.accounts.map((a: any) => (
                  <button
                    key={a.acc_id}
                    onClick={() => setAllowedAccId(a.acc_id)}
                    style={{
                      background: allowedAccId === a.acc_id ? 'rgba(6,182,212,0.1)' : 'var(--bg-secondary)',
                      border: `1px solid ${allowedAccId === a.acc_id ? 'var(--accent-cyan)' : 'var(--border)'}`,
                      borderRadius: 6, padding: '6px 12px', cursor: 'pointer', textAlign: 'left',
                      display: 'flex', gap: 12, alignItems: 'center',
                    }}
                  >
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: 'var(--text-primary)' }}>{a.acc_id}</span>
                    <span style={{ fontSize: 11, color: a.trd_env === 'SIMULATE' ? 'var(--accent-cyan)' : 'var(--accent-red)' }}>{a.trd_env}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatAccountLabel(a.acc_type, a.trdmarket_auth)}</span>
                    {a.card_num && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.card_num}</span>}
                  </button>
                ))}
              </div>
            )}
            {discoverAccounts.isError && (
              <p style={{ fontSize: 12, color: 'var(--accent-red)', marginTop: 6 }}>
                moomoo OpenD not reachable — start it first, then try again.
              </p>
            )}
          </div>
        </div>

        {/* Trade env toggle */}
        <div style={{ marginTop: 20 }}>
          <label style={labelStyle}>Trading Mode</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['SIMULATE', 'REAL'] as const).map(env => (
              <button key={env}
                className={tradeEnv === env ? 'btn-primary' : 'btn-ghost'}
                style={{ padding: '7px 20px', fontSize: 13 }}
                onClick={() => setTradeEnv(env)}>
                {env}
              </button>
            ))}
          </div>
          {tradeEnv === 'REAL' && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-red)', fontSize: 13 }}>
              <AlertTriangle size={14} />
              Live trading mode — real money. Use SIMULATE until strategy is validated.
            </div>
          )}
        </div>

        {/* Auto-execute toggle */}
        <div style={{ marginTop: 20 }}>
          <label style={labelStyle}>Order Execution</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className={autoExecute ? 'btn-primary' : 'btn-ghost'}
              style={{ padding: '7px 20px', fontSize: 13 }}
              onClick={() => setAutoExecute(true)}>
              Auto-execute
            </button>
            <button
              className={!autoExecute ? 'btn-primary' : 'btn-ghost'}
              style={{ padding: '7px 20px', fontSize: 13 }}
              onClick={() => setAutoExecute(false)}>
              Analysis only
            </button>
          </div>
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            {autoExecute
              ? 'Bot places orders for BUY signals automatically via moomoo OpenD.'
              : 'Bot generates signals but skips order placement — review them yourself before trading.'}
          </p>
        </div>

        {/* Save */}
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-primary" onClick={handleSave} disabled={saveConfig.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 24px' }}>
            {saveConfig.isPending ? <Spinner size={14} /> : <Save size={14} />}
            Save & Restart Bot
          </button>
          {saved && <span style={{ fontSize: 13, color: 'var(--accent-green)' }}>✓ Saved — quant-api restarting</span>}
          {saveConfig.isError && <span style={{ fontSize: 13, color: 'var(--accent-red)' }}>Save failed</span>}
        </div>
      </GlassCard>

      {/* Pipeline trigger */}
      <GlassCard style={{ padding: '16px 20px' }}>
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Manual Pipeline Run</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {(['US', 'SGX'] as const).map(m => (
            <button key={m} className="btn-ghost"
              onClick={() => handlePipeline(m)}
              disabled={triggerPipeline.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px', fontSize: 13 }}>
              {triggerPipeline.isPending ? <Spinner size={13} /> : <Play size={13} />}
              Run {m}
            </button>
          ))}
          {pipelineMsg && <span style={{ fontSize: 13, color: 'var(--accent-green)' }}>{pipelineMsg}</span>}
        </div>
      </GlassCard>
    </div>
  )
}
