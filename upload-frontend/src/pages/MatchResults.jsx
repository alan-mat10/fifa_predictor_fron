import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { matchesAPI, predictionsAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

export default function MatchResults() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const [match, setMatch] = useState(null)
  const [predictions, setPredictions] = useState([])
  const [goalScorerPredictions, setGoalScorerPredictions] = useState([])
  const [motmPredictions, setMotmPredictions] = useState([])
  const [actualScorers, setActualScorers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [matchRes, predsRes, gsRes, motmRes] = await Promise.allSettled([
          matchesAPI.getById(matchId),
          predictionsAPI.getForMatch(matchId),
          predictionsAPI.getAllGoalScorerPredictions(matchId),
          predictionsAPI.getMotmPredictions(matchId),
        ])
        if (matchRes.status === 'fulfilled') {
          const m = matchRes.value.data
          setMatch({
            ...m,
            team1: m.team1Name,
            team2: m.team2Name,
          })
        }
        if (predsRes.status === 'fulfilled') setPredictions(predsRes.value.data)
        if (gsRes.status === 'fulfilled') setGoalScorerPredictions(gsRes.value.data)
        if (motmRes.status === 'fulfilled') setMotmPredictions(motmRes.value.data)

        // Fetch actual goal scorers
        try {
          const scorersRes = await matchesAPI.getScorers(matchId)
          setActualScorers(scorersRes.data)
        } catch (e) { /* no scorers yet */ }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [matchId])

  if (loading) return <LoadingSpinner text="Loading results..." />
  if (!match) return <div className="text-center py-12 text-on-surface-variant">Match not found</div>

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-on-surface-variant hover:text-secondary transition-colors font-label text-sm">
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Back
      </button>

      {/* Match Result */}
      <div className="bg-surface-container rounded-xl p-8 primary-glow-border text-center">
        <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-4">
          {match.group ? `Group ${match.group}` : match.stage?.replace(/_/g, ' ')} • FINAL RESULT
        </p>
        <div className="flex justify-center items-center gap-8 mb-4">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-surface-variant flex items-center justify-center border border-outline mb-2 mx-auto overflow-hidden">
              {match.team1Flag ? (
                <img src={match.team1Flag} alt={match.team1} className="w-10 h-10 object-cover" />
              ) : (
                <span className="font-headline font-bold text-sm">{match.team1?.substring(0, 3).toUpperCase()}</span>
              )}
            </div>
            <span className="font-headline font-bold text-sm">{match.team1}</span>
          </div>
          <div className="text-center">
            <span className="text-4xl font-headline font-extrabold text-primary neon-glow-primary">
              {match.team1Score} - {match.team2Score}
            </span>
            {match.team1PenaltyScore != null && match.team2PenaltyScore != null && (
              <div className="font-label text-xs text-tertiary mt-1">
                (Penalties: {match.team1PenaltyScore} - {match.team2PenaltyScore})
              </div>
            )}
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-surface-variant flex items-center justify-center border border-outline mb-2 mx-auto overflow-hidden">
              {match.team2Flag ? (
                <img src={match.team2Flag} alt={match.team2} className="w-10 h-10 object-cover" />
              ) : (
                <span className="font-headline font-bold text-sm">{match.team2?.substring(0, 3).toUpperCase()}</span>
              )}
            </div>
            <span className="font-headline font-bold text-sm">{match.team2}</span>
          </div>
        </div>
        {match.venue && (
          <p className="font-label text-[10px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[10px] align-middle mr-1">location_on</span>
            {match.venue}
          </p>
        )}

        {/* Actual Goal Scorers */}
        {actualScorers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-outline-variant">
            <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-2">Goal Scorers</p>
            <div className="flex flex-wrap justify-center gap-2">
              {actualScorers.map((scorer, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-secondary/10 border border-secondary/30 rounded text-xs font-label text-secondary">
                  <span className="material-symbols-outlined text-xs">sports_soccer</span>
                  {scorer.playerName} {scorer.minute > 0 && `(${scorer.minute}')`}
                  {scorer.isPenalty && ' (P)'}
                  {scorer.isOwnGoal && ' (OG)'}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* All Predictions — Expandable per user */}
      <div className="space-y-4">
        <h3 className="font-headline font-bold text-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">group</span>
          All Predictions ({predictions.length})
        </h3>
        {predictions.length === 0 ? (
          <p className="text-on-surface-variant font-label text-sm text-center py-8">No predictions for this match</p>
        ) : (
          <ExpandablePredictions predictions={predictions} goalScorerPredictions={goalScorerPredictions} motmPredictions={motmPredictions} match={match} />
        )}
      </div>
    </div>
  )
}

function ExpandablePredictions({ predictions, goalScorerPredictions, motmPredictions, match }) {
  const [expanded, setExpanded] = useState(null)

  // Group goal scorers by username
  const gsByUser = {}
  for (const gs of goalScorerPredictions) {
    if (!gsByUser[gs.username]) gsByUser[gs.username] = []
    gsByUser[gs.username].push(gs)
  }

  // Group MOTM by username
  const motmByUser = {}
  for (const m of (motmPredictions || [])) {
    motmByUser[m.username] = m
  }

  return (
    <div className="space-y-2">
      {predictions.map((pred) => {
        const userGs = gsByUser[pred.username] || []
        const userMotm = motmByUser[pred.username]
        const gsPts = userGs.reduce((s, g) => s + (g.pointsEarned || 0), 0)
        const motmPts = userMotm?.pointsEarned || 0
        const totalPts = pred.pointsEarned + gsPts + motmPts
        const isExpanded = expanded === pred.username

        return (
          <div key={pred.id || pred.username} className={`rounded-xl border overflow-hidden ${
            totalPts >= 5 ? 'border-primary/30 bg-primary/5' :
            totalPts > 0 ? 'border-secondary/20 bg-secondary/5' :
            'border-outline-variant bg-surface-container'
          }`}>
            {/* Collapsed — click to expand */}
            <button
              onClick={() => setExpanded(isExpanded ? null : pred.username)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-variant/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center border border-outline">
                  <span className="material-symbols-outlined text-sm">person</span>
                </div>
                <span className="font-headline font-bold text-sm">{pred.username}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-headline font-extrabold text-sm ${
                  totalPts >= 5 ? 'text-primary neon-glow-primary' :
                  totalPts > 0 ? 'text-secondary' : 'text-on-surface-variant'
                }`}>
                  {totalPts} PTS
                </span>
                <span className={`material-symbols-outlined text-on-surface-variant text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </div>
            </button>

            {/* Expanded details */}
            {isExpanded && (
              <div className="px-5 pb-5 pt-2 border-t border-outline-variant/50 space-y-3">
                {/* Score prediction */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">scoreboard</span>
                    <span className="font-label text-sm">Score: {pred.predictedTeam1Score} - {pred.predictedTeam2Score}</span>
                  </div>
                  <div>
                    {pred.pointsEarned === 3 && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-bold">+1 Result +2 Exact</span>
                    )}
                    {pred.pointsEarned === 1 && (
                      <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded font-bold">+1 Result</span>
                    )}
                    {pred.pointsEarned === 0 && (
                      <span className="text-xs bg-error/10 text-error px-2 py-1 rounded font-bold">✗ Wrong</span>
                    )}
                  </div>
                </div>

                {/* Goal scorers */}
                {userGs.length > 0 && (
                  <div className="space-y-2">
                    {userGs.map((gs) => (
                      <div key={gs.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-secondary text-sm">sports_soccer</span>
                          <span className="font-label text-sm">{gs.playerName}</span>
                          {gs.predictedGoals > 1 && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">×{gs.predictedGoals}</span>}
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          gs.pointsEarned > 0 ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'
                        }`}>
                          {gs.pointsEarned > 0 ? `+${gs.pointsEarned}` : '✗'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* No goal scorers predicted */}
                {userGs.length === 0 && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-on-surface-variant text-sm">sports_soccer</span>
                    <span className="font-label text-xs text-on-surface-variant">No goal scorer predictions</span>
                  </div>
                )}

                {/* MOTM prediction */}
                {userMotm && (
                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-tertiary text-sm">star</span>
                      <span className="font-label text-sm">MOTM: {userMotm.playerName}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      userMotm.pointsEarned > 0 ? 'bg-tertiary/10 text-tertiary' : 'bg-error/10 text-error'
                    }`}>
                      {userMotm.pointsEarned > 0 ? `+${userMotm.pointsEarned}` : '✗'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
