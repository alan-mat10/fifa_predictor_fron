import { useState, useEffect, useMemo } from 'react'
import { predictionsAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

export default function MyPredictions() {
  const [predictions, setPredictions] = useState([])
  const [tournamentPreds, setTournamentPreds] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    async function fetchPredictions() {
      try {
        const [res, tournRes] = await Promise.allSettled([
          predictionsAPI.getMy(),
          predictionsAPI.getMyTournament(),
        ])
        if (res.status === 'fulfilled') {
          setPredictions(res.value.data.map(p => ({
            ...p,
            team1: p.team1Name,
            team2: p.team2Name,
            team1Score: p.predictedTeam1Score,
            team2Score: p.predictedTeam2Score,
            scored: p.matchStatus === 'COMPLETED',
          })))
        }
        if (tournRes.status === 'fulfilled') setTournamentPreds(tournRes.value.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchPredictions()
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'ALL') return predictions
    if (filter === 'SCORED') return predictions.filter((p) => p.pointsEarned > 0)
    if (filter === 'PENDING') return predictions.filter((p) => !p.scored)
    return predictions
  }, [predictions, filter])

  const totalPoints = predictions.reduce((sum, p) => sum + (p.pointsEarned || 0), 0)
  const totalScored = predictions.filter((p) => p.pointsEarned > 0).length

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  if (loading) return <LoadingSpinner text="Loading predictions..." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline font-bold text-2xl neon-glow-secondary">My Predictions</h1>
        <p className="font-label text-sm text-on-surface-variant mt-1">Track your prediction history</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-container rounded-xl p-4 text-center card-glow">
          <p className="font-label text-[10px] text-on-surface-variant uppercase mb-1">Total</p>
          <span className="font-headline font-extrabold text-2xl text-on-surface">{predictions.length}</span>
        </div>
        <div className="bg-surface-container rounded-xl p-4 text-center primary-glow-border">
          <p className="font-label text-[10px] text-on-surface-variant uppercase mb-1">Points</p>
          <span className="font-headline font-extrabold text-2xl text-primary neon-glow-primary">{totalPoints}</span>
        </div>
        <div className="bg-surface-container rounded-xl p-4 text-center border border-secondary/20">
          <p className="font-label text-[10px] text-on-surface-variant uppercase mb-1">Scored</p>
          <span className="font-headline font-extrabold text-2xl text-secondary">{totalScored}</span>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['ALL', 'PENDING', 'SCORED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded font-label text-xs uppercase tracking-wider transition-all ${
              filter === f
                ? 'bg-secondary/20 text-secondary border border-secondary/30'
                : 'bg-surface-container text-on-surface-variant border border-outline-variant hover:border-secondary/50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Predictions List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-3 block">edit_note</span>
          <p className="font-label text-sm text-on-surface-variant">No predictions yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((pred) => (
            <div key={pred.id || `${pred.matchId}-${pred.team1Score}-${pred.team2Score}`} className="bg-surface-container rounded-xl p-5 card-glow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    {pred.team1Flag && <img src={pred.team1Flag} alt="" className="w-5 h-4 object-cover rounded-sm" />}
                    <span className="font-headline font-bold text-sm">{pred.team1} vs {pred.team2}</span>
                    {pred.team2Flag && <img src={pred.team2Flag} alt="" className="w-5 h-4 object-cover rounded-sm" />}
                  </div>
                  <p className="font-label text-[10px] text-on-surface-variant mt-1">{formatDate(pred.matchTime)}</p>
                </div>
                <div className={`px-3 py-1 rounded font-label text-xs font-bold ${
                  pred.pointsEarned >= 3 ? 'bg-primary/20 text-primary border border-primary/30' :
                  pred.pointsEarned > 0 ? 'bg-secondary/20 text-secondary border border-secondary/30' :
                  pred.scored ? 'bg-error/10 text-error border border-error/20' :
                  'bg-tertiary/10 text-tertiary border border-tertiary/20'
                }`}>
                  {pred.scored ? `${pred.pointsEarned} PTS` : 'PENDING'}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-label text-xs text-on-surface-variant">Your pick:</span>
                  <span className="font-headline font-bold text-sm text-secondary">{pred.team1Score} - {pred.team2Score}</span>
                </div>
                {pred.scored && pred.actualTeam1Score !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="font-label text-xs text-on-surface-variant">Actual:</span>
                    <span className="font-headline font-bold text-sm text-on-surface">{pred.actualTeam1Score} - {pred.actualTeam2Score}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
