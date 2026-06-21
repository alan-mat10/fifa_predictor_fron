import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { matchesAPI, predictionsAPI, playersAPI, specialPredictionsAPI } from '../services/api'
import { useToast } from '../components/Toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function MatchPrediction() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [match, setMatch] = useState(null)
  const [team1Score, setTeam1Score] = useState(0)
  const [team2Score, setTeam2Score] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [existingPrediction, setExistingPrediction] = useState(null)

  // Team players state
  const [team1Players, setTeam1Players] = useState([])
  const [team2Players, setTeam2Players] = useState([])
  const [selectedScorers, setSelectedScorers] = useState([]) // { id, name, teamName, goals }
  const [firstScorerId, setFirstScorerId] = useState(null)
  const [motmPick, setMotmPick] = useState(null)
  const [hasExistingScorers, setHasExistingScorers] = useState(false)
  const [hasExistingMotm, setHasExistingMotm] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const [matchRes, predRes] = await Promise.allSettled([
          matchesAPI.getById(matchId),
          predictionsAPI.getForMatch(matchId),
        ])
        if (matchRes.status === 'fulfilled') {
          const m = matchRes.value.data
          setMatch({
            ...m,
            team1: m.team1Name,
            team2: m.team2Name,
            matchTime: m.matchDateTime,
          })
          // Fetch players for both teams by team ID
          const [t1Res, t2Res] = await Promise.allSettled([
            playersAPI.getByTeam(m.team1Id),
            playersAPI.getByTeam(m.team2Id),
          ])
          if (t1Res.status === 'fulfilled') setTeam1Players(t1Res.value.data)
          if (t2Res.status === 'fulfilled') setTeam2Players(t2Res.value.data)
        }
        if (predRes.status === 'fulfilled' && predRes.value.data.length > 0) {
          const myPred = predRes.value.data[0]
          setExistingPrediction(myPred)
          setTeam1Score(myPred.predictedTeam1Score || 0)
          setTeam2Score(myPred.predictedTeam2Score || 0)
        }
        // Load existing goal scorer predictions
        const gsRes = await predictionsAPI.getGoalScorerPredictions(matchId)
        if (gsRes.data?.length > 0) {
          const m = matchRes.status === 'fulfilled' ? matchRes.value.data : null
          setSelectedScorers(gsRes.data.map(gs => {
            // Determine teamSide from player's team vs match teams
            let teamSide = 'team1'
            if (m && gs.playerTeam === m.team2Name) teamSide = 'team2'
            return { id: gs.playerId, name: gs.playerName, teamName: gs.teamName || gs.playerTeam, goals: gs.predictedGoals || 1, teamSide }
          }))
          const firstGs = gsRes.data.find(gs => gs.firstGoalScorer)
          if (firstGs) setFirstScorerId(firstGs.playerId)
          setHasExistingScorers(true)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [matchId])

  const handleSubmitScore = async () => {
    setSubmitting(true)
    try {
      await predictionsAPI.make(Number(matchId), team1Score, team2Score)
      addToast('Score prediction saved', 'success')
    } catch (err) {
      addToast(err.response?.data?.error || err.response?.data?.message || 'Failed to save prediction', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitGoalScorers = async () => {
    if (selectedScorers.length === 0) return
    setSubmitting(true)
    try {
      const playerGoalCounts = {}
      selectedScorers.forEach(s => { playerGoalCounts[s.id] = s.goals || 1 })
      await predictionsAPI.predictGoalScorers(
        Number(matchId),
        selectedScorers.map(s => s.id),
        firstScorerId,
        playerGoalCounts
      )
      addToast('Goal scorer prediction saved', 'success')
      setHasExistingScorers(true)
    } catch (err) {
      addToast(err.response?.data?.error || err.response?.data?.message || 'Failed to save goal scorers', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMotmSelect = (player) => {
    setMotmPick(motmPick?.id === player.id ? null : player)
  }

  const handleMotmSubmit = async () => {
    if (!motmPick) return
    setSubmitting(true)
    try {
      await specialPredictionsAPI.predictMotm(Number(matchId), motmPick.id)
      addToast('Man of the Match prediction saved', 'success')
      setHasExistingMotm(true)
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save MOTM', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const maxScorers = team1Score + team2Score
  const totalGoalsPicked = selectedScorers.reduce((sum, s) => sum + (s.goals || 1), 0)

  const getTeamGoals = (scorers, teamSide) => {
    return scorers.filter(s => s.teamSide === teamSide).reduce((sum, s) => sum + (s.goals || 1), 0)
  }

  const addScorer = (player, teamSide) => {
    if (selectedScorers.find(s => s.id === player.id)) return
    const teamMax = teamSide === 'team1' ? team1Score : team2Score
    const currentTeamGoals = getTeamGoals(selectedScorers, teamSide)
    if (currentTeamGoals >= teamMax && teamMax > 0) {
      addToast(`${teamSide === 'team1' ? match.team1 : match.team2} already has ${currentTeamGoals}/${teamMax} goals assigned`, 'error')
      return
    }
    if (totalGoalsPicked >= maxScorers && maxScorers > 0) {
      addToast(`Max ${maxScorers} total goals allowed for a ${team1Score}-${team2Score} prediction`, 'error')
      return
    }
    setSelectedScorers([...selectedScorers, { ...player, goals: 1, teamSide }])
    if (selectedScorers.length === 0) setFirstScorerId(player.id)
  }

  const updateScorerGoals = (playerId, newGoals) => {
    const scorer = selectedScorers.find(s => s.id === playerId)
    if (!scorer) return
    const clampedGoals = Math.max(1, newGoals)

    // Check per-team limit
    const teamMax = scorer.teamSide === 'team1' ? team1Score : team2Score
    const otherTeamScorers = selectedScorers.filter(s => s.teamSide === scorer.teamSide && s.id !== playerId)
    const otherTeamGoals = otherTeamScorers.reduce((sum, s) => sum + (s.goals || 1), 0)
    if (otherTeamGoals + clampedGoals > teamMax) {
      addToast(`${scorer.teamSide === 'team1' ? match.team1 : match.team2} goals (${otherTeamGoals + clampedGoals}) would exceed predicted score (${teamMax})`, 'error')
      return
    }

    // Check overall total
    const updated = selectedScorers.map(s => s.id === playerId ? { ...s, goals: clampedGoals } : s)
    const newTotal = updated.reduce((sum, s) => sum + (s.goals || 1), 0)
    if (newTotal > maxScorers && maxScorers > 0) {
      addToast(`Total goals (${newTotal}) would exceed predicted score (${maxScorers})`, 'error')
      return
    }
    setSelectedScorers(updated)
  }

  const removeScorer = (playerId) => {
    setSelectedScorers(selectedScorers.filter(s => s.id !== playerId))
    if (firstScorerId === playerId) {
      setFirstScorerId(selectedScorers.length > 1 ? selectedScorers.find(s => s.id !== playerId)?.id : null)
    }
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'TBD'
    // Backend already sends times converted to IST
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' }) + ' • ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
  }

  const getCountdown = () => {
    if (!match?.matchTime) return null
    const diff = new Date(match.matchTime) - new Date()
    if (diff <= 0) return null
    const hours = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    return `${hours}h ${mins}m`
  }

  if (loading) return <LoadingSpinner text="Loading match data..." />
  if (!match) return <div className="text-center py-12 text-on-surface-variant">Match not found</div>

  const countdown = getCountdown()

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-on-surface-variant hover:text-secondary transition-colors font-label text-sm">
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Back
      </button>

      {/* Match Header */}
      <div className="bg-surface-container rounded-xl p-8 card-glow text-center">
        <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-4">
          {match.group ? `Group ${match.group}` : match.stage?.replace(/_/g, ' ')} • {formatDateTime(match.matchTime)}
        </p>
        {match.venue && (
          <p className="font-label text-[10px] text-on-surface-variant mb-4">
            <span className="material-symbols-outlined text-[10px] align-middle mr-1">location_on</span>
            {match.venue}
          </p>
        )}
        <div className="flex justify-center items-center gap-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center border border-outline mb-2 mx-auto overflow-hidden">
              {match.team1Flag ? (
                <img src={match.team1Flag} alt={match.team1} className="w-12 h-12 object-cover" />
              ) : (
                <span className="font-headline font-bold text-sm">{match.team1?.substring(0, 3).toUpperCase()}</span>
              )}
            </div>
            <span className="font-headline font-bold text-sm">{match.team1}</span>
          </div>
          <span className="text-3xl font-headline font-extrabold text-primary neon-glow-primary">VS</span>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-surface-variant flex items-center justify-center border border-outline mb-2 mx-auto overflow-hidden">
              {match.team2Flag ? (
                <img src={match.team2Flag} alt={match.team2} className="w-12 h-12 object-cover" />
              ) : (
                <span className="font-headline font-bold text-sm">{match.team2?.substring(0, 3).toUpperCase()}</span>
              )}
            </div>
            <span className="font-headline font-bold text-sm">{match.team2}</span>
          </div>
        </div>
        {countdown && (
          <div className="mt-4 inline-flex items-center gap-2 bg-tertiary/10 border border-tertiary/30 px-4 py-1.5 rounded">
            <span className="material-symbols-outlined text-tertiary text-sm">timer</span>
            <span className="font-label text-xs text-tertiary">Locks in {countdown}</span>
          </div>
        )}
      </div>

      {/* Score Prediction */}
      {match.status !== 'COMPLETED' && (
      <div className="bg-surface-container rounded-xl p-6 neon-border">
        <h3 className="font-headline font-bold text-sm mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">scoreboard</span>
          Score Prediction
        </h3>
        <div className="flex items-center justify-center gap-6">
          {/* Team 1 Score */}
          <div className="text-center">
            <p className="font-label text-xs text-on-surface-variant mb-3">{match.team1}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTeam1Score(Math.max(0, team1Score - 1))}
                className="w-10 h-10 rounded-lg bg-surface-variant border border-outline-variant flex items-center justify-center hover:border-primary hover:text-primary transition-all"
              >
                <span className="material-symbols-outlined">remove</span>
              </button>
              <span className="text-3xl font-headline font-extrabold text-on-surface w-12 text-center">{team1Score}</span>
              <button
                onClick={() => setTeam1Score(team1Score + 1)}
                className="w-10 h-10 rounded-lg bg-surface-variant border border-outline-variant flex items-center justify-center hover:border-secondary hover:text-secondary transition-all"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
          </div>

          <span className="text-on-surface-variant font-headline font-bold text-lg">—</span>

          {/* Team 2 Score */}
          <div className="text-center">
            <p className="font-label text-xs text-on-surface-variant mb-3">{match.team2}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTeam2Score(Math.max(0, team2Score - 1))}
                className="w-10 h-10 rounded-lg bg-surface-variant border border-outline-variant flex items-center justify-center hover:border-primary hover:text-primary transition-all"
              >
                <span className="material-symbols-outlined">remove</span>
              </button>
              <span className="text-3xl font-headline font-extrabold text-on-surface w-12 text-center">{team2Score}</span>
              <button
                onClick={() => setTeam2Score(team2Score + 1)}
                className="w-10 h-10 rounded-lg bg-surface-variant border border-outline-variant flex items-center justify-center hover:border-secondary hover:text-secondary transition-all"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={handleSubmitScore}
          disabled={submitting}
          className="w-full mt-6 py-3 btn-solid-primary rounded disabled:opacity-50"
        >
          {submitting ? 'SAVING...' : existingPrediction ? 'UPDATE PREDICTION' : 'SUBMIT PREDICTION'}
        </button>
      </div>
      )}

      {/* Goal Scorer Prediction */}
      {match.status !== 'COMPLETED' && (
      <div className="bg-surface-container rounded-xl p-6 card-glow">
        <h3 className="font-headline font-bold text-sm mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">sports_soccer</span>
          Goal Scorers (Bonus Points)
        </h3>
        <p className="font-label text-[10px] text-on-surface-variant mb-4">
          {maxScorers > 0
            ? `Select scorers for your ${team1Score}-${team2Score} prediction (${totalGoalsPicked}/${maxScorers} goals assigned)`
            : 'Set a score prediction above first (0-0 = no scorers needed)'}
        </p>

        {/* Player Lists - Both Teams */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Team 1 Players */}
          <div>
            <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-2">{match.team1}</p>
            <div className="bg-surface-dim rounded-lg border border-outline-variant max-h-52 overflow-y-auto">
              <GroupedPlayerList players={team1Players} selectedScorers={selectedScorers} onToggle={(player) => {
                const isSelected = selectedScorers.some(s => s.id === player.id)
                isSelected ? removeScorer(player.id) : addScorer(player, 'team1')
              }} />
            </div>
          </div>

          {/* Team 2 Players */}
          <div>
            <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-2">{match.team2}</p>
            <div className="bg-surface-dim rounded-lg border border-outline-variant max-h-52 overflow-y-auto">
              <GroupedPlayerList players={team2Players} selectedScorers={selectedScorers} onToggle={(player) => {
                const isSelected = selectedScorers.some(s => s.id === player.id)
                isSelected ? removeScorer(player.id) : addScorer(player, 'team2')
              }} />
            </div>
          </div>
        </div>

        {/* Selected Scorers */}
        {selectedScorers.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">Selected scorers (tap star for first scorer, use +/- for goals)</p>
            {selectedScorers.map((scorer) => (
              <div key={scorer.id} className="flex items-center justify-between px-4 py-2 bg-surface-variant rounded-lg border border-outline-variant">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFirstScorerId(scorer.id)}
                    className={`material-symbols-outlined text-lg transition-colors ${
                      firstScorerId === scorer.id ? 'text-tertiary' : 'text-on-surface-variant hover:text-tertiary'
                    }`}
                    style={{ fontVariationSettings: firstScorerId === scorer.id ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    star
                  </button>
                  <span className="font-label text-sm">{scorer.name}</span>
                  <span className="font-label text-[10px] text-on-surface-variant">{scorer.teamName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Goal count controls */}
                  <div className="flex items-center gap-1 bg-surface-dim rounded border border-outline-variant px-1">
                    <button
                      onClick={() => updateScorerGoals(scorer.id, (scorer.goals || 1) - 1)}
                      disabled={(scorer.goals || 1) <= 1}
                      className="material-symbols-outlined text-sm text-on-surface-variant hover:text-primary disabled:opacity-30"
                    >
                      remove
                    </button>
                    <span className="font-headline font-bold text-sm w-5 text-center text-secondary">
                      {scorer.goals || 1}
                    </span>
                    <button
                      onClick={() => updateScorerGoals(scorer.id, (scorer.goals || 1) + 1)}
                      className="material-symbols-outlined text-sm text-on-surface-variant hover:text-secondary"
                    >
                      add
                    </button>
                  </div>
                  <span className="font-label text-[9px] text-on-surface-variant">goal{(scorer.goals || 1) > 1 ? 's' : ''}</span>
                  <button onClick={() => removeScorer(scorer.id)} className="material-symbols-outlined text-error text-sm hover:text-error/80 ml-1">close</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleSubmitGoalScorers}
          disabled={submitting || selectedScorers.length === 0}
          className="w-full py-3 btn-neon-secondary rounded disabled:opacity-30"
        >
          {submitting ? 'SAVING...' : hasExistingScorers ? 'UPDATE GOAL SCORERS' : 'SAVE GOAL SCORERS'}
        </button>
      </div>
      )}

      {/* Man of the Match Prediction */}
      {match.status !== 'COMPLETED' && (
      <div className="bg-surface-container rounded-xl p-6 border border-tertiary/30">
        <h3 className="font-headline font-bold text-sm mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
          Man of the Match (+3 pts)
        </h3>
        <p className="font-label text-[10px] text-on-surface-variant mb-4">Pick who you think will be the MOTM</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-2">{match.team1}</p>
            <div className="bg-surface-dim rounded-lg border border-outline-variant max-h-40 overflow-y-auto">
              <GroupedMotmList players={team1Players} motmPick={motmPick} onSelect={handleMotmSelect} />
            </div>
          </div>
          <div>
            <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-2">{match.team2}</p>
            <div className="bg-surface-dim rounded-lg border border-outline-variant max-h-40 overflow-y-auto">
              <GroupedMotmList players={team2Players} motmPick={motmPick} onSelect={handleMotmSelect} />
            </div>
          </div>
        </div>

        {motmPick && (
          <div className="mt-4 p-3 bg-tertiary/10 border border-tertiary/20 rounded-lg flex items-center justify-between">
            <span className="font-label text-sm text-tertiary font-bold">MOTM Pick: {motmPick.name}</span>
            <button onClick={() => setMotmPick(null)} className="material-symbols-outlined text-error text-sm">close</button>
          </div>
        )}

        <button
          onClick={handleMotmSubmit}
          disabled={!motmPick || submitting}
          className="w-full mt-4 py-3 bg-tertiary/20 border border-tertiary/50 text-tertiary font-headline font-bold text-xs tracking-widest rounded hover:bg-tertiary/30 transition-all disabled:opacity-30"
        >
          {submitting ? 'SAVING...' : hasExistingMotm ? 'UPDATE MOTM PICK' : 'SAVE MOTM PICK'}
        </button>
      </div>
      )}

      {/* All Predictions Section (shown after match is completed) */}
      {match.status === 'COMPLETED' && <AllPredictionsSection matchId={matchId} match={match} />}
    </div>
  )
}

const POSITION_ORDER = ['FORWARD', 'MIDFIELDER', 'DEFENDER', 'GOALKEEPER']
const POSITION_LABELS = { FORWARD: 'Forwards', MIDFIELDER: 'Midfielders', DEFENDER: 'Defenders', GOALKEEPER: 'Goalkeepers' }

function GroupedPlayerList({ players, selectedScorers, onToggle }) {
  if (players.length === 0) return <p className="text-xs text-on-surface-variant p-3">No players loaded</p>

  const grouped = {}
  for (const player of players) {
    const pos = player.position || 'FORWARD'
    if (!grouped[pos]) grouped[pos] = []
    grouped[pos].push(player)
  }

  return (
    <>
      {POSITION_ORDER.map((pos) => {
        const group = grouped[pos]
        if (!group || group.length === 0) return null
        return (
          <div key={pos}>
            <div className="px-3 py-1.5 bg-surface-variant/50 border-b border-outline-variant/50 sticky top-0">
              <span className="font-label text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">{POSITION_LABELS[pos]}</span>
            </div>
            {group.map((player) => {
              const isSelected = selectedScorers.some(s => s.id === player.id)
              return (
                <button
                  key={player.id}
                  onClick={() => onToggle(player)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left border-b border-outline-variant/50 last:border-b-0 transition-colors ${
                    isSelected ? 'bg-secondary/10 text-secondary' : 'hover:bg-surface-variant'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-sm ${isSelected ? 'text-secondary' : 'text-on-surface-variant'}`}>
                      {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span className="font-label text-xs">{player.name}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )
      })}
    </>
  )
}

function GroupedMotmList({ players, motmPick, onSelect }) {
  if (players.length === 0) return <p className="text-xs text-on-surface-variant p-3">No players loaded</p>

  const grouped = {}
  for (const player of players) {
    const pos = player.position || 'FORWARD'
    if (!grouped[pos]) grouped[pos] = []
    grouped[pos].push(player)
  }

  return (
    <>
      {POSITION_ORDER.map((pos) => {
        const group = grouped[pos]
        if (!group || group.length === 0) return null
        return (
          <div key={pos}>
            <div className="px-3 py-1.5 bg-surface-variant/50 border-b border-outline-variant/50 sticky top-0">
              <span className="font-label text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">{POSITION_LABELS[pos]}</span>
            </div>
            {group.map((player) => (
              <button
                key={player.id}
                onClick={() => onSelect(player)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left border-b border-outline-variant/50 last:border-b-0 transition-colors ${
                  motmPick?.id === player.id ? 'bg-tertiary/20 text-tertiary' : 'hover:bg-surface-variant'
                }`}
              >
                <span className={`material-symbols-outlined text-sm ${motmPick?.id === player.id ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                  {motmPick?.id === player.id ? 'star' : 'radio_button_unchecked'}
                </span>
                <span className="font-label text-xs">{player.name}</span>
              </button>
            ))}
          </div>
        )
      })}
    </>
  )
}

function AllPredictionsSection({ matchId, match }) {
  const [allPreds, setAllPreds] = useState([])
  const [allGs, setAllGs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    async function fetchAll() {
      try {
        const [predRes, gsRes] = await Promise.allSettled([
          predictionsAPI.getForMatch(matchId),
          predictionsAPI.getAllGoalScorerPredictions(matchId),
        ])
        if (predRes.status === 'fulfilled') setAllPreds(predRes.value.data)
        if (gsRes.status === 'fulfilled') setAllGs(gsRes.value.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [matchId])

  if (loading) return <div className="text-center py-4 text-on-surface-variant font-label text-xs">Loading predictions...</div>
  if (allPreds.length === 0) return null

  // Group goal scorers by username
  const gsByUser = {}
  for (const gs of allGs) {
    if (!gsByUser[gs.username]) gsByUser[gs.username] = []
    gsByUser[gs.username].push(gs)
  }

  return (
    <div className="bg-surface-container rounded-xl p-6 border border-outline-variant">
      <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">groups</span>
        All Predictions ({allPreds.length})
      </h3>

      <div className="space-y-2">
        {allPreds.map((pred) => {
          const userGs = gsByUser[pred.username] || []
          const gsPts = userGs.reduce((s, g) => s + (g.pointsEarned || 0), 0)
          const totalPts = pred.pointsEarned + gsPts
          const isExpanded = expanded === pred.username

          return (
            <div key={pred.id || pred.username} className="bg-surface-dim rounded-lg border border-outline-variant/50 overflow-hidden">
              {/* Collapsed header — click to expand */}
              <button
                onClick={() => setExpanded(isExpanded ? null : pred.username)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-variant/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">person</span>
                  <span className="font-headline font-bold text-sm">{pred.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-headline font-bold text-sm ${totalPts > 0 ? 'text-secondary neon-glow-secondary' : 'text-error'}`}>
                    {totalPts > 0 ? `+${totalPts}` : '0'} PTS
                  </span>
                  <span className={`material-symbols-outlined text-on-surface-variant text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-outline-variant/50 space-y-3">
                  {/* Score prediction */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-sm">scoreboard</span>
                      <span className="font-label text-xs">Score: {pred.predictedTeam1Score} - {pred.predictedTeam2Score}</span>
                    </div>
                    <div>
                      {pred.pointsEarned === 3 && (
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">+1 Result +2 Exact</span>
                      )}
                      {pred.pointsEarned === 1 && (
                        <span className="text-[10px] bg-secondary/10 text-secondary px-2 py-0.5 rounded font-bold">+1 Result</span>
                      )}
                      {pred.pointsEarned === 0 && (
                        <span className="text-[10px] bg-error/10 text-error px-2 py-0.5 rounded font-bold">✗ Wrong</span>
                      )}
                    </div>
                  </div>

                  {/* Goal scorers */}
                  {userGs.length > 0 && (
                    <div className="space-y-1.5">
                      {userGs.map((gs) => (
                        <div key={gs.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary text-sm">sports_soccer</span>
                            <span className="font-label text-xs">{gs.playerName}</span>
                            {gs.predictedGoals > 1 && <span className="text-[9px] bg-primary/10 text-primary px-1 rounded">×{gs.predictedGoals}</span>}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            gs.pointsEarned > 0 ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'
                          }`}>
                            {gs.pointsEarned > 0 ? `+${gs.pointsEarned}` : '✗'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* MOTM — TODO: needs backend endpoint for per-match MOTM predictions */}
                  {match.manOfTheMatch && (
                    <div className="flex items-center justify-between pt-1 border-t border-outline-variant/30">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-tertiary text-sm">star</span>
                        <span className="font-label text-xs text-on-surface-variant">MOTM: {match.manOfTheMatch}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
