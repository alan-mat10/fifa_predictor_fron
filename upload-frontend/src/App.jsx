import { Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Fixtures from './pages/Fixtures'
import MatchPrediction from './pages/MatchPrediction'
import MyPredictions from './pages/MyPredictions'
import Leaderboard from './pages/Leaderboard'
import TournamentPredictions from './pages/TournamentPredictions'
import MatchResults from './pages/MatchResults'
import Rules from './pages/Rules'
import TablePrediction from './pages/TablePrediction'
import Admin from './pages/Admin'

function ProtectedLayout({ children, adminOnly = false }) {
  return (
    <ProtectedRoute adminOnly={adminOnly}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
        <Route path="/fixtures" element={<ProtectedLayout><Fixtures /></ProtectedLayout>} />
        <Route path="/predict/:matchId" element={<ProtectedLayout><MatchPrediction /></ProtectedLayout>} />
        <Route path="/predictions" element={<ProtectedLayout><MyPredictions /></ProtectedLayout>} />
        <Route path="/leaderboard" element={<ProtectedLayout><Leaderboard /></ProtectedLayout>} />
        <Route path="/tournament-predictions" element={<ProtectedLayout><TournamentPredictions /></ProtectedLayout>} />
        <Route path="/match-results/:matchId" element={<ProtectedLayout><MatchResults /></ProtectedLayout>} />
        <Route path="/rules" element={<ProtectedLayout><Rules /></ProtectedLayout>} />
        <Route path="/table-prediction" element={<ProtectedLayout><TablePrediction /></ProtectedLayout>} />
        <Route path="/admin" element={<ProtectedLayout adminOnly><Admin /></ProtectedLayout>} />
      </Routes>
    </ToastProvider>
  )
}
