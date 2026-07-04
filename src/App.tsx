import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { TransferPrefsProvider } from './context/TransferPrefs'
import Layout from './components/Layout'
import PinEntry from './components/PinEntry'
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
import NetWorthPage from './modules/networth/NetWorthPage'

function AppRoutes() {
  const location = useLocation()
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('smiley_token'))

  useEffect(() => {
    const handler = () => setToken(null)
    window.addEventListener('token-cleared', handler)
    return () => window.removeEventListener('token-cleared', handler)
  }, [])

  // Public participant pages bypass PIN
  if (location.pathname.startsWith('/split/')) {
    return (
      <Routes>
        <Route path="/split/:token" element={<ParticipantPage />} />
      </Routes>
    )
  }

  if (!token) return <PinEntry onSuccess={(t) => { localStorage.setItem('smiley_token', t); setToken(t) }} />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/todos" replace />} />
        <Route path="/todos" element={<TodosPage />} />
        <Route path="/rates" element={<RatesPage />} />
        <Route path="/net-worth" element={<NetWorthPage />} />
        <Route path="/ec2" element={<EC2Page />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/weather" element={<WeatherPage />} />
        <Route path="/mail" element={<MailPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/trips/:id" element={<TripDetailPage />} />
        <Route path="/splitwise" element={<SplitWisePage />} />
        <Route path="/splitwise/:id" element={<TourDetailPage />} />
        <Route path="/quant" element={<QuantPage />} />
        <Route path="/quant/signals" element={<SignalsPage />} />
        <Route path="/quant/positions" element={<PositionsPage />} />
        <Route path="/quant/backtest" element={<BacktestPage />} />
        <Route path="/quant/universe" element={<UniversePage />} />
        <Route path="/quant/jobs" element={<QuantJobsPage />} />
        <Route path="/quant/settings" element={<SettingsPage />} />
        <Route path="/tools" element={<ToolsHubPage />} />
        <Route path="/tools/base64-image" element={<Base64ImagePage />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <TransferPrefsProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TransferPrefsProvider>
  )
}
