import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { publicRatesApi } from '../../api/publicRates'

export default function PublicRatesPage() {
  const latestQuery = useQuery({
    queryKey: ['public-rates', 'latest'],
    queryFn: publicRatesApi.getLatest,
    refetchInterval: 300_000,
  })
  const dailyQuery = useQuery({
    queryKey: ['public-rates', 'daily'],
    queryFn: () => publicRatesApi.getDaily(30),
    refetchInterval: 300_000,
  })

  const daily = dailyQuery.data ?? []
  const chartData = daily.map(r => ({
    date: format(parseISO(r.rate_date), 'MMM d'),
    rate: Number(parseFloat(r.buy_rate).toFixed(4)),
  }))

  const currentRate = latestQuery.data ? parseFloat(String(latestQuery.data.buy_rate)) : null
  const sevenDayAgo = daily[daily.length - 8] ? parseFloat(daily[daily.length - 8].buy_rate) : null
  const change7d = currentRate && sevenDayAgo ? (currentRate - sevenDayAgo) / sevenDayAgo : null
  const changeColor = !change7d ? 'var(--text-muted)' : change7d > 0 ? 'var(--accent-green)' : 'var(--accent-red)'
  const TrendIcon = !change7d ? Minus : change7d > 0 ? TrendingUp : TrendingDown

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px' }}>
      <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>SGD → MYR</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Live exchange rate</p>
        </div>

        <GlassCard style={{ padding: '28px 28px', position: 'relative', overflow: 'hidden' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Current Rate</p>
          {latestQuery.isLoading ? <Spinner /> : (
            <>
              <div style={{ fontFamily: 'IBM Plex Mono', fontWeight: 500, fontSize: 48, letterSpacing: '-0.03em', color: 'var(--accent-cyan)', lineHeight: 1, marginBottom: 8 }}>
                {currentRate?.toFixed(4) ?? '—'}
              </div>
              {change7d != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: changeColor, fontSize: 13 }}>
                  <TrendIcon size={14} />
                  {(change7d * 100).toFixed(2)}% over 7 days
                </div>
              )}
            </>
          )}
        </GlassCard>

        <GlassCard style={{ padding: '20px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Last 30 Days</p>
          {dailyQuery.isLoading ? <Spinner /> : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip />
                <Line type="monotone" dataKey="rate" stroke="var(--accent-cyan)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
