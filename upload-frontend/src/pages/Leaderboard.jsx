import { useState, useEffect, useMemo } from 'react'
import { leaderboardAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

function PointsBreakdownModal({ username, onClose }) {
  const [breakdown, setBreakdown] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBreakdown() {
      try {
        const res = await leaderboardAPI.getBreakdown(username)
        setBreakdown(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchBreakdown()
  }, [username])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-surface-container rounded-2xl border border-outline-variant shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant">
          <div>
            <h2 className="font-headline font-bold text-lg">{username}</h2>
            <p className="font-label text-xs text-on-surface-variant">Points Breakdown</p>
          </div>
          <button onClick={onClose} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors">close</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner text="Loading breakdown..." />
            </div>
          ) : breakdown ? (
            <>
              {/* Total */}
              <div className="text-center py-3 bg-primary/10 rounded-xl border border-primary/20">
                <span className="font-headline font-extrabold text-3xl text-primary neon-glow-primary">{breakdown.totalPoints}</span>
                <p className="font-label text-xs text-on-surface-variant mt-1">Total Points</p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <SummaryCard label="Match Results" points={breakdown.summary.matchResults.points} count={breakdown.summary.matchResults.count} color="secondary" icon="check_circle" />
                <SummaryCard label="Exact Scores" points={breakdown.summary.exactScores.points} count={breakdown.summary.exactScores.count} color="primary" icon="scoreboard" />
                <SummaryCard label="Goal Scorers" points={breakdown.summary.goalScorers.points} count={`${breakdown.summary.goalScorers.correct || 0}✓ ${breakdown.summary.goalScorers.wrong || 0}✗`} color={breakdown.summary.goalScorers.points >= 0 ? "secondary" : "error"} icon="sports_soccer" />
                <SummaryCard label="Man of the Match" points={breakdown.summary.motm.points} count={breakdown.summary.motm.count} color="tertiary" icon="star" />
                {breakdown.summary.tournament.points > 0 && (
                  <SummaryCard label="Tournament" points={breakdown.summary.tournament.points} count={breakdown.summary.tournament.count} color="tertiary" icon="emoji_events" />
                )}
              </div>

              {/* Match Details */}
              {breakdown.matchDetails.length > 0 && (
                <BreakdownSection title="Match Predictions" icon="scoreboard" color="primary">
                  {breakdown.matchDetails.map((d, i) => (
                    <DetailRow key={i} left={d.match} mid={`${d.predicted} → ${d.actual}`} right={`+${d.points}`} tag={d.type} />
                  ))}
                </BreakdownSection>
              )}

              {/* Goal Scorer Details */}
              {breakdown.goalScorerDetails.length > 0 && (
                <BreakdownSection title="Goal Scorers" icon="sports_soccer" color="secondary">
                  {breakdown.goalScorerDetails.map((d, i) => (
                    <DetailRow key={i} left={d.match} mid={`${d.player} (×${d.predictedGoals || 1})`} right={`${d.points >= 0 ? '+' : ''}${d.points}`} rightColor={d.points >= 0 ? 'text-secondary' : 'text-error'} />
                  ))}
                </BreakdownSection>
              )}

              {/* MOTM Details */}
              {breakdown.motmDetails.length > 0 && (
                <BreakdownSection title="Man of the Match" icon="star" color="tertiary">
                  {breakdown.motmDetails.map((d, i) => (
                    <DetailRow key={i} left={d.match} mid={d.player} right={`+${d.points}`} />
                  ))}
                </BreakdownSection>
              )}

              {/* Tournament Details */}
              {breakdown.tournamentDetails.length > 0 && (
                <BreakdownSection title="Tournament Awards" icon="emoji_events" color="tertiary">
                  {breakdown.tournamentDetails.map((d, i) => (
                    <DetailRow key={i} left={d.type} mid={d.prediction} right={`+${d.points}`} />
                  ))}
                </BreakdownSection>
              )}
            </>
          ) : (
            <p className="text-center text-on-surface-variant text-sm py-8">Failed to load breakdown</p>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, points, count, color, icon }) {
  return (
    <div className={`p-3 rounded-lg bg-${color}/10 border border-${color}/20`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`material-symbols-outlined text-${color} text-sm`}>{icon}</span>
        <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider">{label}</span>
      </div>
      <span className={`font-headline font-extrabold text-lg text-${color}`}>{points >= 0 ? '+' : ''}{points}</span>
      <span className="font-label text-[10px] text-on-surface-variant ml-1">({count})</span>
    </div>
  )
}

function BreakdownSection({ title, icon, color, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`material-symbols-outlined text-${color} text-sm`}>{icon}</span>
        <span className="font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant">{title}</span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function DetailRow({ left, mid, right, tag, rightColor }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-surface-dim rounded-lg text-xs">
      <div className="flex-1 min-w-0">
        <p className="font-label text-on-surface truncate">{left}</p>
        <p className="font-label text-on-surface-variant text-[10px] truncate">{mid}</p>
      </div>
      <div className="flex items-center gap-2 ml-2 shrink-0">
        {tag && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{tag}</span>}
        <span className={`font-headline font-bold ${rightColor || 'text-secondary'}`}>{right}</span>
      </div>
    </div>
  )
}

export default function Leaderboard() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [breakdownUser, setBreakdownUser] = useState(null)
  const { user } = useAuth()

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await leaderboardAPI.get()
        setEntries(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchLeaderboard()
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return entries
    return entries.filter((e) => e.username.toLowerCase().includes(search.toLowerCase()))
  }, [entries, search])

  if (loading) return <LoadingSpinner text="Loading standings..." />

  const top3 = entries.slice(0, 3)
  const podiumOrder = [1, 0, 2] // silver, gold, bronze positions

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline font-bold text-2xl neon-glow-secondary">Leaderboard</h1>
        <p className="font-label text-sm text-on-surface-variant mt-1">Global rankings</p>
      </div>

      {/* Podium */}
      {top3.length >= 3 && (
        <div className="flex items-end justify-center gap-4 py-8">
          {podiumOrder.map((idx) => {
            const entry = top3[idx]
            const isGold = idx === 0
            const isSilver = idx === 1
            const heights = ['h-32', 'h-24', 'h-20']
            const colors = [
              'border-primary text-primary bg-primary/10',
              'border-secondary text-secondary bg-secondary/10',
              'border-tertiary text-tertiary bg-tertiary/10',
            ]
            return (
              <div key={entry.username} className="flex flex-col items-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 mb-2 ${colors[idx]}`}>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {isGold ? 'emoji_events' : 'person'}
                  </span>
                </div>
                <span className="font-label text-xs font-bold mb-1 truncate max-w-[80px]">{entry.username}</span>
                <button
                  onClick={() => setBreakdownUser(entry.username)}
                  className={`font-headline font-extrabold text-sm cursor-pointer hover:underline ${isGold ? 'neon-glow-primary text-primary' : isSilver ? 'text-secondary' : 'text-tertiary'}`}
                >
                  {entry.totalPoints} PTS
                </button>
                <div className={`w-20 ${heights[idx]} mt-3 rounded-t-lg ${colors[idx]} border flex items-center justify-center`}>
                  <span className="font-headline font-extrabold text-2xl opacity-50">{idx + 1}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">search</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search player..."
          className="w-full bg-surface-container border border-outline-variant focus:border-secondary focus:ring-0 focus:outline-none text-on-surface font-label pl-10 pr-4 py-3 rounded-lg transition-all"
        />
      </div>

      {/* Full List */}
      <div className="space-y-2">
        {(search ? filtered : entries).map((entry) => {
          const rank = entries.indexOf(entry) + 1
          const isCurrentUser = entry.username === user?.username
          return (
            <div
              key={entry.username}
              className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                isCurrentUser
                  ? 'bg-secondary/10 border border-secondary/30 shadow-[0_0_12px_rgba(0,255,204,0.1)]'
                  : rank <= 3
                  ? 'bg-surface-container-highest border border-primary/10'
                  : 'bg-surface-container border border-outline-variant hover:border-secondary/30'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className={`font-headline font-extrabold text-sm w-8 ${
                  isCurrentUser ? 'text-secondary' : rank === 1 ? 'text-primary' : rank <= 3 ? 'text-tertiary' : 'text-on-surface-variant'
                }`}>
                  {String(rank).padStart(2, '0')}
                </span>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                  isCurrentUser ? 'bg-secondary/20 border-secondary/30' : 'bg-surface-variant border-outline'
                }`}>
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: isCurrentUser ? "'FILL' 1" : "'FILL' 0" }}>person</span>
                </div>
                <span className={`font-label text-sm ${isCurrentUser ? 'font-bold text-secondary' : ''}`}>
                  {entry.username}
                  {isCurrentUser && <span className="ml-2 text-[10px] text-secondary/60">(YOU)</span>}
                </span>
              </div>
              <button
                onClick={() => setBreakdownUser(entry.username)}
                className={`font-headline font-extrabold text-sm cursor-pointer hover:underline transition-colors ${
                  isCurrentUser ? 'text-secondary neon-glow-secondary' : rank === 1 ? 'text-primary' : 'text-on-surface-variant hover:text-secondary'
                }`}
              >
                {entry.totalPoints} PTS
              </button>
            </div>
          )
        })}
      </div>

      {/* Points Breakdown Modal */}
      {breakdownUser && (
        <PointsBreakdownModal username={breakdownUser} onClose={() => setBreakdownUser(null)} />
      )}
    </div>
  )
}
