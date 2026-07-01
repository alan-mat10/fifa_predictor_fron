import { useState, useEffect, useMemo } from 'react'
import { predictionsAPI, leaderboardAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

export default function MyPredictions() {
  const { user } = useAuth()
  const [predictions, setPredictions] = useState([])
  const [goalScorerPreds, setGoalScorerPreds] = useState([])
  const [motmPreds, setMotmPreds] = useState([])
  const [tournamentPreds, setTournamentPreds] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [tab, setTab] = useState('MATCHES')

  useEffect(() => {
    async function fetchPredictions() {
      try {
        const [res, tournRes, breakdownRes] = await Promise.allSettled([
          predictionsAPI.getMy(),
          predictionsAPI.getMyTournament(),
          user?.username ? leaderboardAPI.getBreakdown(user.username) : Promise.reject('no user'),
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

          // Fetch goal scorer predictions for each match
          const matchIds = res.value.data.map(p => p.matchId)
          const gsResults = await Promise.allSettled(
            [...new Set(matchIds)].map(id => predictionsAPI.getGoalScorerPredictions(id))
          )
          const allGs = gsResults
            .filter(r => r.status === 'fulfilled' && r.value.data.length > 0)
            .flatMap(r => r.value.data)
          setGoalScorerPreds(allGs)
        }
        if (tournRes.status === 'fulfilled') setTournamentPreds(tournRes.value.data)

        // Get MOTM predictions from breakdown
        if (breakdownRes.status === 'fulfilled') {
          const bd = breakdownRes.value.data
          if (bd.motmDetails) setMotmPreds(bd.motmDetails)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchPredictions()
  }, [user])

  const filtered = useMemo(() => {
    if (filter === 'ALL') return predictions
    if (filter === 'SCORED') return predictions.filter((p) => p.pointsEarned > 0)
    if (filter === 'PENDING') return predictions.filter((p) => !p.scored)
    return predictions
  }, [predictions, filter])

  // Group goal scorer predictions by matchId
  const gsByMatch = useMemo(() => {
    const map = {}
    for (const gs of goalScorerPreds) {
      if (!map[gs.matchId]) map[gs.matchId] = []
      map[gs.matchId].push(gs)
    }
    return map
  }, [goalScorerPreds])

  // Group MOTM predictions by match name (breakdown returns match as string)
  const motmByMatch = useMemo(() => {
    const map = {}
    for (const m of motmPreds) {
      map[m.match] = m
    }
    return map
  }, [motmPreds])

  const totalPoints = predictions.reduce((sum, p) => sum + (p.pointsEarned || 0), 0)
    + goalScorerPreds.reduce((sum, gs) => sum + (gs.pointsEarned || 0), 0)
    + motmPreds.reduce((sum, m) => sum + (m.points || 0), 0)
  const totalMatches = predictions.length

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
          <p className="font-label text-[10px] text-on-surface-variant uppercase mb-1">Matches</p>
          <span className="font-headline font-extrabold text-2xl text-on-surface">{totalMatches}</span>
        </div>
        <div className="bg-surface-container rounded-xl p-4 text-center primary-glow-border">
          <p className="font-label text-[10px] text-on-surface-variant uppercase mb-1">Points</p>
          <span className="font-headline font-extrabold text-2xl text-primary neon-glow-primary">{totalPoints}</span>
        </div>
        <div className="bg-surface-container rounded-xl p-4 text-center border border-secondary/20">
          <p className="font-label text-[10px] text-on-surface-variant uppercase mb-1">Scorers</p>
          <span className="font-headline font-extrabold text-2xl text-secondary">{goalScorerPreds.length}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {['MATCHES', 'TOURNAMENT'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded font-label text-xs uppercase tracking-wider transition-all ${
              tab === t
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-surface-container text-on-surface-variant border border-outline-variant hover:border-primary/50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Match Predictions (score + goal scorers + MOTM combined per match) */}
      {tab === 'MATCHES' && (
        <>
          <div className="flex gap-2">
            {['ALL', 'PENDING', 'SCORED'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded font-label text-[10px] uppercase tracking-wider transition-all ${
                  filter === f
                    ? 'bg-secondary/20 text-secondary border border-secondary/30'
                    : 'bg-surface-container text-on-surface-variant border border-outline-variant hover:border-secondary/50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-3 block">edit_note</span>
              <p className="font-label text-sm text-on-surface-variant">No predictions yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((pred) => {
                const matchGs = gsByMatch[pred.matchId] || []
                const matchName = `${pred.team1} vs ${pred.team2}`
                const motm = motmByMatch[matchName]
                return (
                  <div key={pred.id || pred.matchId} className="bg-surface-container rounded-xl p-5 card-glow">
                    {/* Match header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {pred.team1Flag && <img src={pred.team1Flag} alt="" className="w-5 h-4 object-cover rounded-sm" />}
                          <span className="font-headline font-bold text-sm">{pred.team1} vs {pred.team2}</span>
                          {pred.team2Flag && <img src={pred.team2Flag} alt="" className="w-5 h-4 object-cover rounded-sm" />}
                        </div>
                      </div>
                      {/* Points badge with breakdown */}
                      <div className={`px-3 py-1 rounded font-label text-xs font-bold ${
                        pred.pointsEarned >= 3 ? 'bg-primary/20 text-primary border border-primary/30' :
                        pred.pointsEarned > 0 ? 'bg-secondary/20 text-secondary border border-secondary/30' :
                        pred.scored ? 'bg-error/10 text-error border border-error/20' :
                        'bg-tertiary/10 text-tertiary border border-tertiary/20'
                      }`}>
                        {pred.scored
                          ? pred.pointsEarned === 4 ? '+1 Result +3 Exact'
                          : pred.pointsEarned === 1 ? '+1 Result'
                          : '0 PTS'
                          : 'PENDING'}
                      </div>
                    </div>

                    {/* Score prediction */}
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-on-surface-variant text-sm">scoreboard</span>
                        <span className="font-label text-xs text-on-surface-variant">Score:</span>
                        <span className="font-headline font-bold text-sm text-secondary">{pred.team1Score} - {pred.team2Score}</span>
                      </div>
                      {pred.scored && pred.actualTeam1Score !== undefined && (
                        <div className="flex items-center gap-1">
                          <span className="font-label text-xs text-on-surface-variant">Actual:</span>
                          <span className="font-headline font-bold text-sm text-on-surface">{pred.actualTeam1Score} - {pred.actualTeam2Score}</span>
                        </div>
                      )}
                    </div>

                    {/* Goal scorers + MOTM for this match */}
                    {(matchGs.length > 0 || motm) && (
                      <div className="mt-2 pt-2 border-t border-outline-variant/50 space-y-2">
                        {/* Goal scorers */}
                        {matchGs.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {matchGs.map((gs) => (
                              <div key={gs.id} className="flex items-center gap-1 bg-surface-variant/50 px-2 py-1 rounded">
                                <span className="material-symbols-outlined text-secondary text-xs">sports_soccer</span>
                                <span className="font-label text-xs">{gs.playerName}</span>
                                {gs.predictedGoals > 1 && <span className="text-[8px] bg-primary/20 text-primary px-1 rounded">×{gs.predictedGoals}</span>}
                                {gs.matchStatus === 'COMPLETED' && (
                                  <span className={`text-[8px] px-1 rounded ${gs.pointsEarned > 0 ? 'bg-secondary/20 text-secondary' : 'bg-error/10 text-error'}`}>
                                    {gs.pointsEarned > 0 ? `+${gs.pointsEarned}` : '✗'}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* MOTM */}
                        {motm && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-tertiary/10 px-2 py-1 rounded border border-tertiary/20">
                              <span className="material-symbols-outlined text-tertiary text-xs">star</span>
                              <span className="font-label text-xs">MOTM: {motm.player}</span>
                              <span className={`text-[8px] px-1 rounded ${motm.points > 0 ? 'bg-tertiary/20 text-tertiary' : 'bg-error/10 text-error'}`}>
                                {motm.points > 0 ? `+${motm.points}` : '✗'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Tournament Predictions */}
      {tab === 'TOURNAMENT' && (
        <div className="space-y-3">
          {!tournamentPreds || Object.keys(tournamentPreds).filter(k => k !== 'locked').length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-3 block">emoji_events</span>
              <p className="font-label text-sm text-on-surface-variant">No tournament predictions yet</p>
            </div>
          ) : (
            <>
              {tournamentPreds.topScorer && (
                <div className="bg-surface-container rounded-xl p-4 border border-tertiary/20">
                  <p className="font-label text-[10px] text-on-surface-variant uppercase">Golden Boot</p>
                  <p className="font-headline font-bold text-sm mt-1">{tournamentPreds.topScorer.playerName}</p>
                  {tournamentPreds.topScorer.teamName && <p className="font-label text-xs text-on-surface-variant">{tournamentPreds.topScorer.teamName}</p>}
                </div>
              )}
              {tournamentPreds.goldenBall && (
                <div className="bg-surface-container rounded-xl p-4 border border-tertiary/20">
                  <p className="font-label text-[10px] text-on-surface-variant uppercase">Golden Ball</p>
                  <p className="font-headline font-bold text-sm mt-1">{tournamentPreds.goldenBall.playerName}</p>
                  {tournamentPreds.goldenBall.teamName && <p className="font-label text-xs text-on-surface-variant">{tournamentPreds.goldenBall.teamName}</p>}
                </div>
              )}
              {tournamentPreds.goldenGlove && (
                <div className="bg-surface-container rounded-xl p-4 border border-tertiary/20">
                  <p className="font-label text-[10px] text-on-surface-variant uppercase">Golden Glove</p>
                  <p className="font-headline font-bold text-sm mt-1">{tournamentPreds.goldenGlove.playerName}</p>
                  {tournamentPreds.goldenGlove.teamName && <p className="font-label text-xs text-on-surface-variant">{tournamentPreds.goldenGlove.teamName}</p>}
                </div>
              )}
              {tournamentPreds.worldCupWinner && (
                <div className="bg-surface-container rounded-xl p-4 border border-primary/20">
                  <p className="font-label text-[10px] text-on-surface-variant uppercase">World Cup Winner</p>
                  <p className="font-headline font-bold text-sm mt-1">{tournamentPreds.worldCupWinner.teamName}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
