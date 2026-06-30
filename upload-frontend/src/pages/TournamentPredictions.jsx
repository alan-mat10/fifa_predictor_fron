import { useState, useEffect } from 'react'
import { playersAPI, specialPredictionsAPI, matchesAPI, predictionsAPI } from '../services/api'
import { useToast } from '../components/Toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function TournamentPredictions() {
  const { addToast } = useToast()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [tournamentLocked, setTournamentLocked] = useState(false)
  const [lockTime, setLockTime] = useState('')

  // World Cup Winner
  const [winnerTeamId, setWinnerTeamId] = useState('')
  const [winnerSubmitting, setWinnerSubmitting] = useState(false)

  // Top Scorer
  const [topScorerSearch, setTopScorerSearch] = useState('')
  const [topScorerResults, setTopScorerResults] = useState([])
  const [topScorerPick, setTopScorerPick] = useState(null)
  const [topScorerSubmitting, setTopScorerSubmitting] = useState(false)

  // Golden Ball
  const [goldenBallSearch, setGoldenBallSearch] = useState('')
  const [goldenBallResults, setGoldenBallResults] = useState([])
  const [goldenBallPick, setGoldenBallPick] = useState(null)
  const [goldenBallSubmitting, setGoldenBallSubmitting] = useState(false)

  // Golden Glove
  const [goldenGloveSearch, setGoldenGloveSearch] = useState('')
  const [goldenGloveResults, setGoldenGloveResults] = useState([])
  const [goldenGlovePick, setGoldenGlovePick] = useState(null)
  const [goldenGloveSubmitting, setGoldenGloveSubmitting] = useState(false)

  useEffect(() => {
    async function fetchTeams() {
      try {
        const [res, lockRes] = await Promise.all([
          matchesAPI.getAll(),
          predictionsAPI.getTournamentLockStatus()
        ])
        // Extract unique teams from matches
        const teamMap = new Map()
        res.data.forEach(m => {
          if (m.team1Id && m.team1Name) teamMap.set(m.team1Id, { id: m.team1Id, name: m.team1Name, flag: m.team1Flag })
          if (m.team2Id && m.team2Name) teamMap.set(m.team2Id, { id: m.team2Id, name: m.team2Name, flag: m.team2Flag })
        })
        setTeams([...teamMap.values()].sort((a, b) => a.name.localeCompare(b.name)))
        setTournamentLocked(lockRes.data.locked)
        setLockTime(lockRes.data.lockTime || '')
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchTeams()
  }, [])

  const searchPlayers = async (query, setResults) => {
    if (query.length < 2) { setResults([]); return }
    try {
      const res = await playersAPI.search(query)
      setResults(res.data.slice(0, 8))
    } catch (err) { console.error(err) }
  }

  const handleWinnerSubmit = async () => {
    if (!winnerTeamId) return
    setWinnerSubmitting(true)
    try {
      await specialPredictionsAPI.predictWorldCupWinner(Number(winnerTeamId))
      addToast('World Cup Winner prediction saved! (+5 pts if correct)', 'success')
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed — may be locked after group stage', 'error')
    } finally { setWinnerSubmitting(false) }
  }

  const handleTopScorerSubmit = async () => {
    if (!topScorerPick) return
    setTopScorerSubmitting(true)
    try {
      await specialPredictionsAPI.predictTopScorer(topScorerPick.name, topScorerPick.teamName)
      addToast('Golden Boot prediction saved! (+4 pts if correct)', 'success')
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save', 'error')
    } finally { setTopScorerSubmitting(false) }
  }

  const handleGoldenBallSubmit = async () => {
    if (!goldenBallPick) return
    setGoldenBallSubmitting(true)
    try {
      await specialPredictionsAPI.predictGoldenBall(goldenBallPick.name, goldenBallPick.teamName)
      addToast('Golden Ball prediction saved! (+4 pts if correct)', 'success')
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save', 'error')
    } finally { setGoldenBallSubmitting(false) }
  }

  const handleGoldenGloveSubmit = async () => {
    if (!goldenGlovePick) return
    setGoldenGloveSubmitting(true)
    try {
      await specialPredictionsAPI.predictGoldenGlove(goldenGlovePick.name, goldenGlovePick.teamName)
      addToast('Golden Glove prediction saved! (+4 pts if correct)', 'success')
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save', 'error')
    } finally { setGoldenGloveSubmitting(false) }
  }

  if (loading) return <LoadingSpinner text="Loading..." />

  const isGroupStageLocked = tournamentLocked

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="font-headline font-bold text-2xl neon-glow-secondary">Tournament Predictions</h1>
        <p className="font-label text-sm text-on-surface-variant mt-1">Predict award winners for bonus points</p>
      </div>

      {/* Points Info */}
      <div className="bg-tertiary/10 border border-tertiary/30 rounded-xl p-4 flex items-center gap-3">
        <span className="material-symbols-outlined text-tertiary">info</span>
        <p className="font-label text-xs text-on-tertiary-container">
          {tournamentLocked
            ? '🔒 Tournament predictions are locked.'
            : lockTime
              ? `Predictions lock: ${new Date(lockTime).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}`
              : 'Predictions are open.'}
        </p>
      </div>

      {/* World Cup Winner */}
      <div className="bg-surface-container rounded-xl p-6 border border-tertiary/40 shadow-[0_0_16px_rgba(255,224,74,0.1)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-tertiary/20 flex items-center justify-center border border-tertiary/30">
            <span className="material-symbols-outlined text-tertiary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>trophy</span>
          </div>
          <div>
            <h3 className="font-headline font-bold text-lg text-tertiary">World Cup Winner</h3>
            <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">+5 points • {isGroupStageLocked ? 'LOCKED' : lockTime ? `Locks: ${new Date(lockTime).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}` : 'Open'}</p>
          </div>
        </div>

        <select
          value={winnerTeamId}
          onChange={(e) => setWinnerTeamId(e.target.value)}
          disabled={isGroupStageLocked}
          className="w-full bg-surface-dim border border-outline-variant focus:border-tertiary focus:ring-0 focus:outline-none text-on-surface font-label text-sm px-4 py-3 rounded-lg mb-4 disabled:opacity-50"
        >
          <option value="">Select a team...</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>

        <button
          onClick={handleWinnerSubmit}
          disabled={!winnerTeamId || winnerSubmitting || isGroupStageLocked}
          className="w-full py-3 bg-tertiary/20 border border-tertiary/50 text-tertiary font-headline font-bold text-xs tracking-widest rounded hover:bg-tertiary/30 transition-all disabled:opacity-30"
        >
          {winnerSubmitting ? 'SAVING...' : isGroupStageLocked ? 'PREDICTIONS LOCKED' : 'SAVE WINNER PICK'}
        </button>
      </div>

      {/* Golden Boot (Top Scorer) */}
      <PlayerPredictionCard
        title="Golden Boot"
        subtitle="Top Goal Scorer"
        points="+4 points"
        icon="sports_soccer"
        color="primary"
        pick={topScorerPick}
        setPick={setTopScorerPick}
        search={topScorerSearch}
        setSearch={setTopScorerSearch}
        results={topScorerResults}
        setResults={setTopScorerResults}
        searchPlayers={searchPlayers}
        onSubmit={handleTopScorerSubmit}
        submitting={topScorerSubmitting}
        locked={tournamentLocked}
      />

      {/* Golden Ball */}
      <PlayerPredictionCard
        title="Golden Ball"
        subtitle="Best Player of Tournament"
        points="+4 points"
        icon="emoji_events"
        color="secondary"
        pick={goldenBallPick}
        setPick={setGoldenBallPick}
        search={goldenBallSearch}
        setSearch={setGoldenBallSearch}
        results={goldenBallResults}
        setResults={setGoldenBallResults}
        searchPlayers={searchPlayers}
        onSubmit={handleGoldenBallSubmit}
        submitting={goldenBallSubmitting}
        locked={tournamentLocked}
      />

      {/* Golden Glove */}
      <PlayerPredictionCard
        title="Golden Glove"
        subtitle="Best Goalkeeper"
        points="+4 points"
        icon="sports_handball"
        color="secondary"
        pick={goldenGlovePick}
        setPick={setGoldenGlovePick}
        search={goldenGloveSearch}
        setSearch={setGoldenGloveSearch}
        results={goldenGloveResults}
        setResults={setGoldenGloveResults}
        searchPlayers={searchPlayers}
        onSubmit={handleGoldenGloveSubmit}
        submitting={goldenGloveSubmitting}
        locked={tournamentLocked}
      />
    </div>
  )
}

function PlayerPredictionCard({ title, subtitle, points, icon, color, pick, setPick, search, setSearch, results, setResults, searchPlayers, onSubmit, submitting, locked }) {
  const borderClass = color === 'primary' ? 'primary-glow-border' : 'card-glow'
  const accentColor = color === 'primary' ? 'primary' : color === 'secondary' ? 'secondary' : 'tertiary'

  return (
    <div className={`bg-surface-container rounded-xl p-6 ${borderClass}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-12 h-12 rounded-lg bg-${accentColor}/20 flex items-center justify-center border border-${accentColor}/30`}>
          <span className={`material-symbols-outlined text-${accentColor} text-2xl`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
        <div>
          <h3 className={`font-headline font-bold text-lg text-${accentColor}`}>{title}</h3>
          <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">{subtitle} • {points}</p>
        </div>
      </div>

      {pick && (
        <div className={`mb-4 p-3 bg-${accentColor}/10 border border-${accentColor}/20 rounded-lg flex items-center justify-between`}>
          <div>
            <span className={`font-label text-sm font-bold text-${accentColor}`}>{pick.name}</span>
            <span className="font-label text-[10px] text-on-surface-variant ml-2">{pick.teamName}</span>
          </div>
          <button onClick={() => setPick(null)} className="material-symbols-outlined text-error text-sm">close</button>
        </div>
      )}

      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-sm">search</span>
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            searchPlayers(e.target.value, setResults)
          }}
          placeholder="Search player..."
          className={`w-full bg-surface-dim border border-outline-variant focus:border-${accentColor} focus:ring-0 focus:outline-none text-on-surface font-label text-sm pl-10 pr-4 py-2.5 rounded-lg transition-all`}
        />
      </div>
      {results.length > 0 && (
        <div className="bg-surface-dim border border-outline-variant rounded-lg mb-4 max-h-40 overflow-y-auto">
          {results.map((player) => (
            <button
              key={player.id}
              onClick={() => { setPick(player); setSearch(''); setResults([]) }}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-variant transition-colors text-left border-b border-outline-variant last:border-b-0"
            >
              <div>
                <span className="font-label text-sm text-on-surface">{player.name}</span>
                <span className="font-label text-[10px] text-on-surface-variant ml-2">{player.teamName} • {player.position}</span>
              </div>
              <span className={`material-symbols-outlined text-${accentColor} text-sm`}>add_circle</span>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={onSubmit}
        disabled={!pick || submitting || locked}
        className={`w-full py-3 ${color === 'primary' ? 'btn-solid-primary' : 'btn-neon-secondary'} rounded disabled:opacity-30`}
      >
        {submitting ? 'SAVING...' : locked ? '🔒 PREDICTIONS LOCKED' : `SAVE ${title.toUpperCase()} PICK`}
      </button>
    </div>
  )
}
