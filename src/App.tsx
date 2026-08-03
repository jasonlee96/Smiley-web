import { HashRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { TransferPrefsProvider } from './context/TransferPrefs'
import Layout from './components/Layout'
import PinEntry from './components/PinEntry'
import PublicRatesPage from './modules/rates/PublicRatesPage'
import TodosPage from './modules/todos/TodosPage'
import RatesPage from './modules/rates/RatesPage'
import EC2Page from './modules/ec2/EC2Page'
import JobsPage from './modules/jobs/JobsPage'
import WeatherPage from './modules/weather/WeatherPage'
import MailPage from './modules/mail/MailPage'
import TripsPage from './modules/trips/TripsPage'
import TripDetailPage from './modules/trips/TripDetailPage'
import SplitWisePage from './modules/splitwise/SplitWisePage'
import TourDetailPage from './modules/splitwise/TourDetailPage'
import ParticipantPage from './modules/splitwise/ParticipantPage'
import QuantPage from './modules/quant/QuantPage'
import SignalsPage from './modules/quant/SignalsPage'
import PositionsPage from './modules/quant/PositionsPage'
import BacktestPage from './modules/quant/BacktestPage'
import UniversePage from './modules/quant/UniversePage'
import QuantJobsPage from './modules/quant/JobsPage'
import SettingsPage from './modules/quant/SettingsPage'
import ToolsHubPage from './modules/tools/ToolsHubPage'
import Base64ImagePage from './modules/tools/base64Image/Base64ImagePage'
import SelfSignedCertPage from './modules/tools/selfSignedCert/SelfSignedCertPage'
import NetWorthPage from './modules/networth/NetWorthPage'
import ExpensesHubPage from './modules/expenses/ExpensesHubPage'
import MonthDetailPage from './modules/expenses/MonthDetailPage'
import CategoriesPage from './modules/expenses/CategoriesPage'
import ImportPage from './modules/expenses/ImportPage'

function LegacySplitRedirect() {
  const { token } = useParams()
  return <Navigate to={`/public/split/${token}`} replace />
}

function AppRoutes() {
  const location = useLocation()
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('smiley_token'))

  useEffect(() => {
    const handler = () => setToken(null)
    window.addEventListener('token-cleared', handler)
    return () => window.removeEventListener('token-cleared', handler)
  }, [])

  // Public pages — no PIN required
  if (location.pathname.startsWith('/public/') || location.pathname === '/public') {
    return (
      <Routes>
        <Route path="/public/rates" element={<PublicRatesPage />} />
        <Route path="/public/split/:token" element={<ParticipantPage />} />
      </Routes>
    )
  }

  // Legacy participant links shared before the /public prefix existed
  if (location.pathname.startsWith('/split/')) {
    return (
      <Routes>
        <Route path="/split/:token" element={<LegacySplitRedirect />} />
      </Routes>
    )
  }

  if (!token) return <PinEntry onSuccess={(t) => { localStorage.setItem('smiley_token', t); setToken(t) }} />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/internal/todos" replace />} />
        <Route path="/internal" element={<Navigate to="/internal/todos" replace />} />
        <Route path="/internal/todos" element={<TodosPage />} />
        <Route path="/internal/rates" element={<RatesPage />} />
        <Route path="/internal/net-worth" element={<NetWorthPage />} />
        <Route path="/internal/expenses" element={<ExpensesHubPage />} />
        <Route path="/internal/expenses/categories" element={<CategoriesPage />} />
        <Route path="/internal/expenses/import" element={<ImportPage />} />
        <Route path="/internal/expenses/:year/:month" element={<MonthDetailPage />} />
        <Route path="/internal/ec2" element={<EC2Page />} />
        <Route path="/internal/jobs" element={<JobsPage />} />
        <Route path="/internal/weather" element={<WeatherPage />} />
        <Route path="/internal/mail" element={<MailPage />} />
        <Route path="/internal/trips" element={<TripsPage />} />
        <Route path="/internal/trips/:id" element={<TripDetailPage />} />
        <Route path="/internal/splitwise" element={<SplitWisePage />} />
        <Route path="/internal/splitwise/:id" element={<TourDetailPage />} />
        <Route path="/internal/quant" element={<QuantPage />} />
        <Route path="/internal/quant/signals" element={<SignalsPage />} />
        <Route path="/internal/quant/positions" element={<PositionsPage />} />
        <Route path="/internal/quant/backtest" element={<BacktestPage />} />
        <Route path="/internal/quant/universe" element={<UniversePage />} />
        <Route path="/internal/quant/jobs" element={<QuantJobsPage />} />
        <Route path="/internal/quant/settings" element={<SettingsPage />} />
        <Route path="/internal/tools" element={<ToolsHubPage />} />
        <Route path="/internal/tools/base64-image" element={<Base64ImagePage />} />
        <Route path="/internal/tools/self-signed-cert" element={<SelfSignedCertPage />} />
        <Route path="*" element={<Navigate to="/internal/todos" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <TransferPrefsProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </TransferPrefsProvider>
  )
}
