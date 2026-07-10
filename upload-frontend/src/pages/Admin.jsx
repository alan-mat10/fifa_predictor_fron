import { useState, useEffect } from 'react'
import { matchesAPI, playersAPI, adminAPI, leaderboardAPI, announcementAPI } from '../services/api'
import { useToast } from '../components/Toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Admin() {
  const { addToast } = useToast()
  const [matches, setMatches] = useState([])
  const [pinnedMsg, setPinnedMsg] = useState('')
  const [currentAnnouncement, setCurrentAnnouncement] = useState('')
  const [loading, setLoading] = useState(true)

  // User score management state
  const [users, setUsers] = useState([])
  const [scoreUsername, setScoreUsername] = useState('')
  const [userPredictions, setUserPredictions] = useState(null)

  // Match result state
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [resultTeam1Score, setResultTeam1Score] = useState(0)
  const [resultTeam2Score, setResultTeam2Score] = useState(0)
  const [resultSubmitting, setResultSubmitting] = useState(false)

  // Goal scorers state
  const [gsMatchId, setGsMatchId] = useState('')
  const [gsPlayerSearch, setGsPlayerSearch] = useState('')
  const [gsPlayerResults, setGsPlayerResults] = useState([])
  const [gsSelectedPlayers, setGsSelectedPlayers] = useState([])
  const [gsFirstScorerId, setGsFirstScorerId] = useState(null)
  const [gsSubmitting, setGsSubmitting] = useState(false)

  // Award state
  const [topScorerName, setTopScorerName] = useState('')
  const [goldenBallName, setGoldenBallName] = useState('')
  const [goldenGloveName, setGoldenGloveName] = useState('')
  const [awardSubmitting, setAwardSubmitting] = useState(false)

  // MOTM state
  const [motmMatchId, setMotmMatchId] = useState('')
  const [motmPlayerSearch, setMotmPlayerSearch] = useState('')
  const [motmPlayerResults, setMotmPlayerResults] = useState([])
  const [motmSelectedPlayer, setMotmSelectedPlayer] = useState(null)
  const [motmSubmitting, setMotmSubmitting] = useState(false)

  // Invite code state
  const [inviteCodes, setInviteCodes] = useState([])
  const [newCodeLabel, setNewCodeLabel] = useState('')
  const [codeGenerating, setCodeGenerating] = useState(false)

  // Tournament lock state
  const [tournamentLockTime, setTournamentLockTime] = useState('')
  const [tournamentLocked, setTournamentLocked] = useState(false)
  const [isCurrentlyLocked, setIsCurrentlyLocked] = useState(false)
  const [lockLoading, setLockLoading] = useState(false)

  useEffect(() => {
    async function fetchMatches() {
      try {
        const [matchRes, codesRes, usersRes, annRes, lockRes] = await Promise.allSettled([
          matchesAPI.getAll(),
          adminAPI.getInviteCodes(),
          leaderboardAPI.get(),
          announcementAPI.get(),
          adminAPI.getTournamentSettings(),
        ])
        if (matchRes.status === 'fulfilled') {
          setMatches(matchRes.value.data.map(m => ({
            ...m,
            team1: m.team1Name,
            team2: m.team2Name,
          })))
        }
        if (codesRes.status === 'fulfilled') setInviteCodes(codesRes.value.data)
        if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data)
        if (annRes.status === 'fulfilled' && annRes.value.data?.message) {
          setCurrentAnnouncement(annRes.value.data.message)
          setPinnedMsg(annRes.value.data.message)
        }
        if (lockRes.status === 'fulfilled') {
          setTournamentLockTime(lockRes.value.data.tournamentPredictionLockTime || '')
          setTournamentLocked(lockRes.value.data.tournamentPredictionsLocked)
          setIsCurrentlyLocked(lockRes.value.data.isCurrentlyLocked)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchMatches()
  }, [])

  useEffect(() => {
    if (gsPlayerSearch.length < 2) {
      setGsPlayerResults([])
      return
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await playersAPI.search(gsPlayerSearch)
        setGsPlayerResults(res.data.slice(0, 10))
      } catch (err) {
        console.error(err)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [gsPlayerSearch])

  useEffect(() => {
    if (motmPlayerSearch.length < 2) {
      setMotmPlayerResults([])
      return
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await playersAPI.search(motmPlayerSearch)
        setMotmPlayerResults(res.data.slice(0, 10))
      } catch (err) {
        console.error(err)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [motmPlayerSearch])

  const handleSubmitResult = async () => {
    if (!selectedMatchId) return
    setResultSubmitting(true)
    try {
      await adminAPI.submitMatchResult(Number(selectedMatchId), resultTeam1Score, resultTeam2Score)
      addToast('Match result submitted and points calculated', 'success')
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to submit result', 'error')
    } finally {
      setResultSubmitting(false)
    }
  }

  const handleSubmitGoalScorers = async () => {
    if (!gsMatchId || gsSelectedPlayers.length === 0) return
    setGsSubmitting(true)
    try {
      await adminAPI.submitGoalScorers(
        Number(gsMatchId),
        gsSelectedPlayers.map(p => p.id),
        gsFirstScorerId
      )
      addToast('Goal scorers submitted and points calculated', 'success')
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to submit goal scorers', 'error')
    } finally {
      setGsSubmitting(false)
    }
  }

  const handleAwardTopScorer = async () => {
    if (!topScorerName.trim()) return
    setAwardSubmitting(true)
    try {
      await adminAPI.awardTopScorer(topScorerName.trim())
      addToast('Top scorer points awarded', 'success')
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to award', 'error')
    } finally {
      setAwardSubmitting(false)
    }
  }

  const handleAwardGoldenBall = async () => {
    if (!goldenBallName.trim()) return
    setAwardSubmitting(true)
    try {
      await adminAPI.awardGoldenBall(goldenBallName.trim())
      addToast('Golden Ball points awarded', 'success')
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to award', 'error')
    } finally {
      setAwardSubmitting(false)
    }
  }

  const handleAwardGoldenGlove = async () => {
    if (!goldenGloveName.trim()) return
    setAwardSubmitting(true)
    try {
      await adminAPI.awardGoldenGlove(goldenGloveName.trim())
      addToast('Golden Glove points awarded', 'success')
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to award', 'error')
    } finally {
      setAwardSubmitting(false)
    }
  }

  const handleSubmitMotm = async () => {
    if (!motmMatchId || !motmSelectedPlayer) return
    setMotmSubmitting(true)
    try {
      await adminAPI.submitMotm(Number(motmMatchId), motmSelectedPlayer.name)
      addToast('MOTM set and points awarded', 'success')
      setMotmSelectedPlayer(null)
      setMotmPlayerSearch('')
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to set MOTM', 'error')
    } finally {
      setMotmSubmitting(false)
    }
  }

  const handleGenerateCode = async () => {
    setCodeGenerating(true)
    try {
      const res = await adminAPI.generateInviteCode(newCodeLabel)
      setInviteCodes([res.data, ...inviteCodes])
      setNewCodeLabel('')
      addToast(`Invite code generated: ${res.data.code}`, 'success')
    } catch (err) {
      addToast('Failed to generate code', 'error')
    } finally {
      setCodeGenerating(false)
    }
  }

  const handleDeleteCode = async (id) => {
    try {
      await adminAPI.deleteInviteCode(id)
      setInviteCodes(inviteCodes.filter(c => c.id !== id))
      addToast('Invite code deleted', 'success')
    } catch (err) {
      addToast(err.response?.data || 'Failed to delete', 'error')
    }
  }

  const [pullLoading, setPullLoading] = useState(false)
  const [pullResult, setPullResult] = useState('')

  const handlePullAllResults = async () => {
    setPullLoading(true)
    setPullResult('')
    try {
      const res = await adminAPI.pullAllResults()
      setPullResult(res.data)
      addToast(res.data, 'success')
      // Refresh matches
      const matchRes = await matchesAPI.getAll()
      setMatches(matchRes.data)
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to pull results'
      setPullResult(msg)
      addToast(msg, 'error')
    } finally {
      setPullLoading(false)
    }
  }

  const handlePullSingleResult = async (matchId) => {
    setPullLoading(true)
    try {
      const res = await adminAPI.pullSingleResult(matchId)
      addToast(res.data, 'success')
      const matchRes = await matchesAPI.getAll()
      setMatches(matchRes.data)
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to pull result', 'error')
    } finally {
      setPullLoading(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading admin panel..." />

  const selectedMatch = matches.find(m => String(m.id) === String(selectedMatchId))
  const gsMatch = matches.find(m => String(m.id) === String(gsMatchId))

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="font-headline font-bold text-2xl neon-glow-primary">Admin Panel</h1>
        <p className="font-label text-sm text-on-surface-variant mt-1">Manage match results and awards</p>
      </div>

      {/* Pinned Announcement */}
      <div className="bg-surface-container rounded-xl p-6 border border-tertiary/30">
        <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary">campaign</span>
          Pinned Announcement
        </h3>
        <p className="text-xs text-on-surface-variant mb-4">
          Set a message that appears on all users' home screen. Clear to remove it.
        </p>

        {currentAnnouncement && (
          <div className="mb-4 p-3 bg-tertiary/10 border border-tertiary/20 rounded-lg flex items-center justify-between">
            <span className="font-label text-sm text-on-surface">{currentAnnouncement}</span>
            <button
              onClick={async () => {
                try {
                  await announcementAPI.clear()
                  setCurrentAnnouncement('')
                  setPinnedMsg('')
                  addToast('Announcement cleared', 'success')
                } catch (err) {
                  addToast('Failed to clear', 'error')
                }
              }}
              className="material-symbols-outlined text-error text-sm hover:text-error/80 ml-2"
            >
              delete
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={pinnedMsg}
            onChange={(e) => setPinnedMsg(e.target.value)}
            placeholder="Type announcement message..."
            className="flex-1 bg-surface-dim border border-outline-variant focus:border-tertiary focus:ring-0 focus:outline-none text-on-surface font-label text-sm px-4 py-2.5 rounded-lg"
          />
          <button
            onClick={async () => {
              if (!pinnedMsg.trim()) return
              try {
                await announcementAPI.set(pinnedMsg.trim())
                setCurrentAnnouncement(pinnedMsg.trim())
                addToast('Announcement set', 'success')
              } catch (err) {
                addToast('Failed to set announcement', 'error')
              }
            }}
            disabled={!pinnedMsg.trim()}
            className="px-5 py-2.5 bg-tertiary/20 border border-tertiary/50 text-tertiary font-label font-bold text-xs tracking-widest rounded hover:bg-tertiary/30 transition-all disabled:opacity-30"
          >
            PIN
          </button>
        </div>
      </div>

      {/* Pull Results from API */}
      <div className="bg-surface-container rounded-xl p-6 border border-secondary/30 shadow-[0_0_16px_rgba(0,255,204,0.1)]">
        <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">cloud_download</span>
          Pull Results from Football API
        </h3>
        <p className="text-xs text-on-surface-variant mb-4">
          Automatically fetch match results and goal scorers from football-data.org for all finished matches.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handlePullAllResults}
            disabled={pullLoading}
            className="flex-1 py-3 bg-secondary/10 border border-secondary/50 text-secondary font-headline font-bold text-xs tracking-widest hover:bg-secondary/20 transition-all rounded disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {pullLoading ? (
              <span className="material-symbols-outlined animate-spin text-sm">sync</span>
            ) : (
              <span className="material-symbols-outlined text-sm">cloud_sync</span>
            )}
            {pullLoading ? 'PULLING...' : 'PULL ALL FINISHED RESULTS'}
          </button>
        </div>
        {pullResult && (
          <p className="mt-3 font-label text-xs text-secondary bg-secondary/10 px-3 py-2 rounded border border-secondary/20">
            {pullResult}
          </p>
        )}

        {/* Individual match pull */}
        <div className="mt-4 pt-4 border-t border-outline-variant">
          <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-2">Or pull a specific match:</p>
          <div className="flex gap-2">
            <select
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(e.target.value)}
              className="flex-1 bg-surface-dim border border-outline-variant focus:border-secondary focus:ring-0 text-on-surface font-label text-xs px-3 py-2 rounded"
            >
              <option value="">Select match...</option>
              {matches.filter(m => m.status !== 'COMPLETED').map((m) => (
                <option key={m.id} value={m.id}>{m.team1Name || m.team1} vs {m.team2Name || m.team2}</option>
              ))}
            </select>
            <button
              onClick={() => selectedMatchId && handlePullSingleResult(Number(selectedMatchId))}
              disabled={!selectedMatchId || pullLoading}
              className="px-4 py-2 bg-secondary/10 border border-secondary/40 text-secondary font-label text-xs rounded hover:bg-secondary/20 transition-all disabled:opacity-50"
            >
              Pull
            </button>
          </div>
        </div>
      </div>

      {/* Recalculate All Points */}
      <div className="bg-surface-container rounded-xl p-6 border border-primary/30">
        <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">calculate</span>
          Recalculate All Points
        </h3>
        <p className="text-xs text-on-surface-variant mb-4">
          Resets all user points to 0 and re-scores every completed match from scratch. Use after fixing scores or goal scorers.
        </p>
        <button
          onClick={async () => {
            if (!confirm('This will reset ALL user points and recalculate from scratch. Continue?')) return
            setPullLoading(true)
            try {
              const res = await adminAPI.recalculateAllPoints()
              addToast(res.data, 'success')
              setPullResult(res.data)
            } catch (err) {
              addToast(err.response?.data || 'Recalculation failed', 'error')
            } finally {
              setPullLoading(false)
            }
          }}
          disabled={pullLoading}
          className="w-full py-3 bg-primary/10 border border-primary/50 text-primary font-headline font-bold text-xs tracking-widest rounded hover:bg-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          {pullLoading ? 'RECALCULATING...' : 'RECALCULATE ALL POINTS'}
        </button>
      </div>

      {/* Setup Bracket */}
      <div className="bg-surface-container rounded-xl p-6 border border-secondary/30">
        <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">account_tree</span>
          Setup Bracket (QF / SF / Final)
        </h3>
        <p className="text-xs text-on-surface-variant mb-4">
          Creates QF, SF, 3rd place and Final placeholder matches and sets Portugal/Spain on R16 M93, Argentina/Egypt on R16 M95. Safe to run multiple times.
        </p>
        <button
          onClick={async () => {
            setPullLoading(true)
            try {
              const res = await adminAPI.setupBracket()
              addToast('Bracket setup complete!', 'success')
              setPullResult(res.data)
            } catch (err) {
              addToast(err.response?.data || 'Bracket setup failed', 'error')
            } finally {
              setPullLoading(false)
            }
          }}
          disabled={pullLoading}
          className="w-full py-3 bg-secondary/10 border border-secondary/50 text-secondary font-headline font-bold text-xs tracking-widest rounded hover:bg-secondary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">account_tree</span>
          {pullLoading ? 'SETTING UP...' : 'SETUP BRACKET'}
        </button>
        {pullResult && (
          <pre className="mt-3 font-label text-xs text-secondary bg-secondary/10 px-3 py-2 rounded border border-secondary/20 whitespace-pre-wrap">{pullResult}</pre>
        )}
      </div>

      {/* Fix Completed Bracket */}
      <div className="bg-surface-container rounded-xl p-6 border border-secondary/30">
        <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">sync_alt</span>
          Fix Completed Bracket
        </h3>
        <p className="text-xs text-on-surface-variant mb-4">
          Re-advances winners of all completed knockout matches into the next round. Use this if R16/QF slots are empty despite results being submitted.
        </p>
        <button
          onClick={async () => {
            setPullLoading(true)
            try {
              const res = await adminAPI.fixBracket()
              addToast('Bracket fixed!', 'success')
              setPullResult(res.data)
            } catch (err) {
              addToast(err.response?.data || 'Fix failed', 'error')
            } finally {
              setPullLoading(false)
            }
          }}
          disabled={pullLoading}
          className="w-full py-3 bg-secondary/10 border border-secondary/50 text-secondary font-headline font-bold text-xs tracking-widest rounded hover:bg-secondary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">sync_alt</span>
          {pullLoading ? 'FIXING...' : 'FIX COMPLETED BRACKET'}
        </button>
        {pullResult && (
          <pre className="mt-3 font-label text-xs text-secondary bg-secondary/10 px-3 py-2 rounded border border-secondary/20 whitespace-pre-wrap">{pullResult}</pre>
        )}
      </div>

      {/* Edit Match Score */}
      <div className="bg-surface-container rounded-xl p-6 border border-error/30">
        <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-error">edit</span>
          Edit Match Score
        </h3>
        <p className="text-xs text-on-surface-variant mb-4">
          Correct the score of a completed match if it was pulled incorrectly.
        </p>
        <EditMatchScore matches={matches} addToast={addToast} onUpdate={async () => {
          const matchRes = await matchesAPI.getAll()
          setMatches(matchRes.data.map(mx => ({ ...mx, team1: mx.team1Name, team2: mx.team2Name })))
        }} />
      </div>

      {/* Submit Match Result */}
      <div className="bg-surface-container rounded-xl p-6 primary-glow-border">
        <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">scoreboard</span>
          Submit Match Result (Manual)
        </h3>

        <div className="space-y-4">
          <select
            value={selectedMatchId}
            onChange={(e) => setSelectedMatchId(e.target.value)}
            className="w-full bg-surface-dim border border-outline-variant focus:border-primary focus:ring-0 focus:outline-none text-on-surface font-label text-sm px-4 py-3 rounded-lg"
          >
            <option value="">Select match...</option>
            {matches.filter(m => m.status !== 'COMPLETED').map((m) => (
              <option key={m.id} value={m.id}>{m.team1} vs {m.team2} ({m.group || m.stage})</option>
            ))}
          </select>

          {selectedMatch && (
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="font-label text-xs text-on-surface-variant mb-2">{selectedMatch.team1}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setResultTeam1Score(Math.max(0, resultTeam1Score - 1))} className="w-8 h-8 rounded bg-surface-variant border border-outline-variant flex items-center justify-center hover:border-primary text-sm">-</button>
                  <span className="text-2xl font-headline font-extrabold w-8 text-center">{resultTeam1Score}</span>
                  <button onClick={() => setResultTeam1Score(resultTeam1Score + 1)} className="w-8 h-8 rounded bg-surface-variant border border-outline-variant flex items-center justify-center hover:border-secondary text-sm">+</button>
                </div>
              </div>
              <span className="text-on-surface-variant">—</span>
              <div className="text-center">
                <p className="font-label text-xs text-on-surface-variant mb-2">{selectedMatch.team2}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setResultTeam2Score(Math.max(0, resultTeam2Score - 1))} className="w-8 h-8 rounded bg-surface-variant border border-outline-variant flex items-center justify-center hover:border-primary text-sm">-</button>
                  <span className="text-2xl font-headline font-extrabold w-8 text-center">{resultTeam2Score}</span>
                  <button onClick={() => setResultTeam2Score(resultTeam2Score + 1)} className="w-8 h-8 rounded bg-surface-variant border border-outline-variant flex items-center justify-center hover:border-secondary text-sm">+</button>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleSubmitResult}
            disabled={!selectedMatchId || resultSubmitting}
            className="w-full py-3 btn-solid-primary rounded disabled:opacity-30"
          >
            {resultSubmitting ? 'SUBMITTING...' : 'SUBMIT RESULT'}
          </button>
        </div>
      </div>

      {/* Omit Match - Accordion */}
      <div className="bg-surface-container rounded-xl border border-error/30 overflow-hidden">
        <button
          onClick={() => document.getElementById('omit-section').classList.toggle('hidden')}
          className="w-full p-6 flex items-center justify-between hover:bg-error/5 transition-colors"
        >
          <h3 className="font-headline font-bold text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-error">block</span>
            Omit Match (Exclude from Scoring)
          </h3>
          <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
        </button>
        <div id="omit-section" className="hidden px-6 pb-6">
          <p className="text-xs text-on-surface-variant mb-4">
            Mark a match as omitted — predictions for this match won't count in point calculations.
          </p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {matches.filter(m => m.status === 'COMPLETED').map((m) => (
              <div key={m.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${m.omitted ? 'bg-error/10 border-error/30' : 'bg-surface-dim border-outline-variant'}`}>
                <span className="font-label text-xs text-on-surface">
                  {m.team1} vs {m.team2} ({m.team1Score}-{m.team2Score})
                  {m.omitted && <span className="ml-2 text-[9px] bg-error/20 text-error px-1.5 py-0.5 rounded">OMITTED</span>}
                </span>
                <button
                  onClick={async () => {
                    try {
                      await adminAPI.omitMatch(m.id)
                      const matchRes = await matchesAPI.getAll()
                      setMatches(matchRes.data.map(mx => ({ ...mx, team1: mx.team1Name, team2: mx.team2Name })))
                      addToast(m.omitted ? 'Match restored' : 'Match omitted', 'success')
                    } catch (err) {
                      addToast('Failed to toggle omit', 'error')
                    }
                  }}
                  className={`px-3 py-1 font-label text-xs rounded transition-all shrink-0 ${
                    m.omitted
                      ? 'bg-secondary/20 border border-secondary/50 text-secondary hover:bg-secondary/30'
                      : 'bg-error/20 border border-error/50 text-error hover:bg-error/30'
                  }`}
                >
                  {m.omitted ? 'RESTORE' : 'OMIT'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Match Details (Team/Time) */}
      <div className="bg-surface-container rounded-xl p-6 border border-tertiary/30">
        <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary">edit_calendar</span>
          Edit Match Details (Team / Time)
        </h3>
        <p className="text-xs text-on-surface-variant mb-4">
          Change team or match time for upcoming matches (including TBD knockout fixtures).
        </p>
        <EditMatchDetails matches={matches} addToast={addToast} onUpdate={async () => {
          const matchRes = await matchesAPI.getAll()
          setMatches(matchRes.data.map(mx => ({ ...mx, team1: mx.team1Name, team2: mx.team2Name })))
        }} />
      </div>

      {/* Submit Goal Scorers */}
      <div className="bg-surface-container rounded-xl p-6 card-glow">
        <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">sports_soccer</span>
          Manage Goal Scorers
        </h3>

        <div className="space-y-4">
          <select
            value={gsMatchId}
            onChange={async (e) => {
              setGsMatchId(e.target.value)
              setGsSelectedPlayers([])
              // Load existing scorers if any
              if (e.target.value) {
                try {
                  const res = await adminAPI.getMatchGoalScorers(Number(e.target.value))
                  if (res.data.length > 0) {
                    setGsSelectedPlayers(res.data.map((s, i) => ({
                      playerName: s.playerName,
                      minute: s.minute,
                      ownGoal: s.ownGoal,
                      penalty: s.penalty,
                      _key: Date.now() + i
                    })))
                  }
                } catch (err) { /* no existing data */ }
              }
            }}
            className="w-full bg-surface-dim border border-outline-variant focus:border-secondary focus:ring-0 focus:outline-none text-on-surface font-label text-sm px-4 py-3 rounded-lg"
          >
            <option value="">Select match...</option>
            {matches.filter(m => m.status === 'COMPLETED').map((m) => (
              <option key={m.id} value={m.id}>{m.team1} vs {m.team2} ({m.team1Score}-{m.team2Score})</option>
            ))}
          </select>

          {gsMatchId && (
            <>
              {/* Fetch from API button */}
              <button
                onClick={async () => {
                  setGsSubmitting(true)
                  try {
                    const res = await adminAPI.fetchGoalScorersFromApi(Number(gsMatchId))
                    if (res.data.length > 0) {
                      setGsSelectedPlayers(res.data.map((s, i) => ({
                        playerName: s.playerName,
                        minute: s.minute || 0,
                        ownGoal: s.ownGoal || false,
                        penalty: s.penalty || false,
                        _key: Date.now() + i
                      })))
                      addToast(`Fetched ${res.data.length} scorer(s) from API`, 'success')
                    } else {
                      addToast('No scorers found from API', 'info')
                    }
                  } catch (err) {
                    addToast('Failed to fetch from API. Check API key.', 'error')
                  } finally {
                    setGsSubmitting(false)
                  }
                }}
                disabled={gsSubmitting}
                className="w-full py-2.5 bg-secondary/10 border border-secondary/40 text-secondary font-label text-xs tracking-widest rounded hover:bg-secondary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">cloud_download</span>
                {gsSubmitting ? 'FETCHING...' : 'FETCH SCORERS FROM API'}
              </button>

              {/* Player search + manual add */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-sm">search</span>
                <input
                  type="text"
                  value={gsPlayerSearch}
                  onChange={(e) => setGsPlayerSearch(e.target.value)}
                  placeholder="Search player or type name manually..."
                  className="w-full bg-surface-dim border border-outline-variant focus:border-secondary focus:ring-0 focus:outline-none text-on-surface font-label text-sm pl-10 pr-4 py-2.5 rounded-lg"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && gsPlayerSearch.trim()) {
                      setGsSelectedPlayers([...gsSelectedPlayers, {
                        playerName: gsPlayerSearch.trim(),
                        minute: 0,
                        ownGoal: false,
                        penalty: false,
                        _key: Date.now()
                      }])
                      setGsPlayerSearch('')
                      setGsPlayerResults([])
                    }
                  }}
                />
              </div>

              {/* Search results from DB */}
              {gsPlayerResults.length > 0 && (
                <div className="bg-surface-dim border border-outline-variant rounded-lg max-h-40 overflow-y-auto">
                  {gsPlayerResults.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => {
                        setGsSelectedPlayers([...gsSelectedPlayers, {
                          playerName: player.name,
                          minute: 0,
                          ownGoal: false,
                          penalty: false,
                          _key: Date.now()
                        }])
                        setGsPlayerSearch('')
                        setGsPlayerResults([])
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-variant transition-colors text-left border-b border-outline-variant last:border-b-0"
                    >
                      <span className="font-label text-sm">{player.name} ({player.teamName})</span>
                      <span className="material-symbols-outlined text-secondary text-sm">add_circle</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Manual add button (if search doesn't find player) */}
              {gsPlayerSearch.trim().length > 1 && gsPlayerResults.length === 0 && (
                <button
                  onClick={() => {
                    setGsSelectedPlayers([...gsSelectedPlayers, {
                      playerName: gsPlayerSearch.trim(),
                      minute: 0,
                      ownGoal: false,
                      penalty: false,
                      _key: Date.now()
                    }])
                    setGsPlayerSearch('')
                  }}
                  className="w-full py-2 bg-surface-dim border border-dashed border-secondary/40 text-secondary font-label text-xs rounded hover:bg-secondary/10 transition-all"
                >
                  + Add "{gsPlayerSearch.trim()}" manually
                </button>
              )}

              {/* Scorer list */}
              {gsSelectedPlayers.length > 0 && (
                <div className="space-y-2">
                  <p className="font-label text-[10px] text-on-surface-variant uppercase">
                    Scorers ({gsSelectedPlayers.length}) — edit or remove before saving
                  </p>
                  {gsSelectedPlayers.map((p, idx) => (
                    <div key={p._key || idx} className="flex items-center justify-between px-3 py-2 bg-surface-variant rounded-lg border border-outline-variant">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-label text-sm text-on-surface">{p.playerName}</span>
                        <span className="font-label text-[10px] text-on-surface-variant">({p.minute}')</span>
                        {p.ownGoal && <span className="text-[9px] bg-error/20 text-error px-1.5 py-0.5 rounded">OG</span>}
                        {p.penalty && <span className="text-[9px] bg-tertiary/20 text-tertiary px-1.5 py-0.5 rounded">PEN</span>}
                      </div>
                      <button onClick={() => {
                        const updated = [...gsSelectedPlayers]
                        updated.splice(idx, 1)
                        setGsSelectedPlayers(updated)
                      }} className="material-symbols-outlined text-error text-sm">close</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <button
            onClick={async () => {
              if (!gsMatchId || gsSelectedPlayers.length === 0) return
              setGsSubmitting(true)
              try {
                await adminAPI.saveMatchGoalScorers(Number(gsMatchId), gsSelectedPlayers.map(p => ({
                  playerName: p.playerName,
                  minute: p.minute || 0,
                  ownGoal: p.ownGoal || false,
                  penalty: p.penalty || false
                })))
                addToast('Goal scorers saved!', 'success')
              } catch (err) {
                addToast(err.response?.data || 'Failed to save', 'error')
              } finally {
                setGsSubmitting(false)
              }
            }}
            disabled={!gsMatchId || gsSelectedPlayers.length === 0 || gsSubmitting}
            className="w-full py-3 btn-neon-secondary rounded disabled:opacity-30"
          >
            {gsSubmitting ? 'SAVING...' : 'SAVE GOAL SCORERS'}
          </button>
        </div>
      </div>

      {/* MOTM Entry */}
      <div className="bg-surface-container rounded-xl p-6 border border-tertiary/30">
        <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
          Submit Man of the Match
        </h3>
        <div className="space-y-4">
          <select
            value={motmMatchId}
            onChange={(e) => setMotmMatchId(e.target.value)}
            className="w-full bg-surface-dim border border-outline-variant focus:border-tertiary focus:ring-0 focus:outline-none text-on-surface font-label text-sm px-4 py-3 rounded-lg"
          >
            <option value="">Select completed match...</option>
            {matches.filter(m => m.status === 'COMPLETED').map((m) => (
              <option key={m.id} value={m.id}>{m.team1} vs {m.team2} ({m.team1Score}-{m.team2Score})</option>
            ))}
          </select>

          {motmMatchId && (
            <>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-sm">search</span>
                <input
                  type="text"
                  value={motmPlayerSearch}
                  onChange={(e) => { setMotmPlayerSearch(e.target.value); setMotmSelectedPlayer(null) }}
                  placeholder="Search MOTM player..."
                  className="w-full bg-surface-dim border border-outline-variant focus:border-tertiary focus:ring-0 focus:outline-none text-on-surface font-label text-sm pl-10 pr-4 py-2.5 rounded-lg"
                />
              </div>

              {motmPlayerResults.length > 0 && !motmSelectedPlayer && (
                <div className="bg-surface-dim border border-outline-variant rounded-lg max-h-40 overflow-y-auto">
                  {motmPlayerResults.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => {
                        setMotmSelectedPlayer(player)
                        setMotmPlayerSearch(player.name)
                        setMotmPlayerResults([])
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-variant transition-colors text-left border-b border-outline-variant last:border-b-0"
                    >
                      <span className="font-label text-sm">{player.name} ({player.teamName})</span>
                      <span className="material-symbols-outlined text-tertiary text-sm">check_circle</span>
                    </button>
                  ))}
                </div>
              )}

              {motmSelectedPlayer && (
                <div className="flex items-center justify-between px-3 py-2 bg-surface-variant rounded-lg border border-tertiary/30">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="font-label text-sm">{motmSelectedPlayer.name} ({motmSelectedPlayer.teamName})</span>
                  </div>
                  <button onClick={() => { setMotmSelectedPlayer(null); setMotmPlayerSearch('') }} className="material-symbols-outlined text-error text-sm">close</button>
                </div>
              )}
            </>
          )}

          <button
            onClick={handleSubmitMotm}
            disabled={!motmMatchId || !motmSelectedPlayer || motmSubmitting}
            className="w-full py-3 bg-tertiary/20 border border-tertiary/50 text-tertiary font-label font-bold text-xs tracking-widest rounded hover:bg-tertiary/30 transition-all disabled:opacity-30"
          >
            {motmSubmitting ? 'SUBMITTING...' : 'SET MOTM'}
          </button>
        </div>
      </div>

      {/* Award Tournament Prizes */}
      <div className="bg-surface-container rounded-xl p-6 border border-tertiary/30">
        <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
          Award Tournament Prizes
        </h3>

        <div className="space-y-6">
          {/* Top Scorer */}
          <div className="space-y-3">
            <label className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Golden Boot (Top Scorer) — +4 pts</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={topScorerName}
                onChange={(e) => setTopScorerName(e.target.value)}
                placeholder="Player name..."
                className="flex-1 bg-surface-dim border border-outline-variant focus:border-tertiary focus:ring-0 focus:outline-none text-on-surface font-label text-sm px-4 py-2.5 rounded-lg"
              />
              <button
                onClick={handleAwardTopScorer}
                disabled={!topScorerName.trim() || awardSubmitting}
                className="px-6 py-2.5 bg-tertiary/20 border border-tertiary/50 text-tertiary font-label font-bold text-xs tracking-widest rounded hover:bg-tertiary/30 transition-all disabled:opacity-30"
              >
                AWARD
              </button>
            </div>
          </div>

          {/* Golden Ball */}
          <div className="space-y-3">
            <label className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Golden Ball (Best Player) — +4 pts</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={goldenBallName}
                onChange={(e) => setGoldenBallName(e.target.value)}
                placeholder="Player name..."
                className="flex-1 bg-surface-dim border border-outline-variant focus:border-tertiary focus:ring-0 focus:outline-none text-on-surface font-label text-sm px-4 py-2.5 rounded-lg"
              />
              <button
                onClick={handleAwardGoldenBall}
                disabled={!goldenBallName.trim() || awardSubmitting}
                className="px-6 py-2.5 bg-tertiary/20 border border-tertiary/50 text-tertiary font-label font-bold text-xs tracking-widest rounded hover:bg-tertiary/30 transition-all disabled:opacity-30"
              >
                AWARD
              </button>
            </div>
          </div>

          {/* Golden Glove */}
          <div className="space-y-3">
            <label className="font-label text-xs text-on-surface-variant uppercase tracking-widest">Golden Glove (Best GK) — +4 pts</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={goldenGloveName}
                onChange={(e) => setGoldenGloveName(e.target.value)}
                placeholder="Goalkeeper name..."
                className="flex-1 bg-surface-dim border border-outline-variant focus:border-tertiary focus:ring-0 focus:outline-none text-on-surface font-label text-sm px-4 py-2.5 rounded-lg"
              />
              <button
                onClick={handleAwardGoldenGlove}
                disabled={!goldenGloveName.trim() || awardSubmitting}
                className="px-6 py-2.5 bg-tertiary/20 border border-tertiary/50 text-tertiary font-label font-bold text-xs tracking-widest rounded hover:bg-tertiary/30 transition-all disabled:opacity-30"
              >
                AWARD
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tournament Prediction Lock */}
      <div className="bg-surface-container rounded-xl p-6 border border-tertiary/30">
        <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary">lock_clock</span>
          Tournament Prediction Lock
        </h3>
        <p className="text-xs text-on-surface-variant mb-4">
          Control when users can no longer submit tournament predictions (Winner, Golden Boot, Ball, Glove).
        </p>

        {/* Status */}
        <div className={`mb-4 p-3 rounded-lg border ${isCurrentlyLocked ? 'bg-error/10 border-error/30' : 'bg-secondary/10 border-secondary/30'}`}>
          <span className={`font-label text-xs font-bold ${isCurrentlyLocked ? 'text-error' : 'text-secondary'}`}>
            Status: {isCurrentlyLocked ? '🔒 LOCKED' : '🔓 OPEN'}
          </span>
          {tournamentLockTime && !tournamentLocked && (
            <span className="font-label text-[10px] text-on-surface-variant ml-2">
              (Auto-locks: {new Date(tournamentLockTime).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})})
            </span>
          )}
          {tournamentLocked && (
            <span className="font-label text-[10px] text-on-surface-variant ml-2">(Manually locked)</span>
          )}
        </div>

        {/* Set Lock Time */}
        <div className="flex gap-2 mb-4">
          <input
            type="datetime-local"
            value={tournamentLockTime ? tournamentLockTime.substring(0, 16) : ''}
            onChange={(e) => setTournamentLockTime(e.target.value)}
            className="flex-1 bg-surface-dim border border-outline-variant focus:border-tertiary focus:ring-0 focus:outline-none text-on-surface font-label text-xs px-3 py-2 rounded-lg"
          />
          <button
            onClick={async () => {
              if (!tournamentLockTime) return
              setLockLoading(true)
              try {
                await adminAPI.setTournamentLockTime(tournamentLockTime)
                const res = await adminAPI.getTournamentSettings()
                setTournamentLockTime(res.data.tournamentPredictionLockTime || '')
                setTournamentLocked(res.data.tournamentPredictionsLocked)
                setIsCurrentlyLocked(res.data.isCurrentlyLocked)
                addToast('Lock time updated', 'success')
              } catch (err) {
                addToast('Failed to set lock time', 'error')
              } finally { setLockLoading(false) }
            }}
            disabled={lockLoading || !tournamentLockTime}
            className="px-4 py-2 bg-tertiary/20 border border-tertiary/50 text-tertiary font-label text-xs rounded hover:bg-tertiary/30 transition-all disabled:opacity-30"
          >
            Set Time
          </button>
        </div>

        {/* Lock/Unlock Buttons */}
        <div className="flex gap-2">
          <button
            onClick={async () => {
              setLockLoading(true)
              try {
                await adminAPI.lockTournamentPredictions()
                setTournamentLocked(true)
                setIsCurrentlyLocked(true)
                addToast('Tournament predictions locked!', 'success')
              } catch (err) {
                addToast('Failed to lock', 'error')
              } finally { setLockLoading(false) }
            }}
            disabled={lockLoading || isCurrentlyLocked}
            className="flex-1 py-2.5 bg-error/20 border border-error/50 text-error font-label text-xs tracking-widest rounded hover:bg-error/30 transition-all disabled:opacity-30"
          >
            🔒 LOCK NOW
          </button>
          <button
            onClick={async () => {
              setLockLoading(true)
              try {
                await adminAPI.unlockTournamentPredictions()
                setTournamentLocked(false)
                const res = await adminAPI.getTournamentSettings()
                setIsCurrentlyLocked(res.data.isCurrentlyLocked)
                addToast('Tournament predictions unlocked', 'success')
              } catch (err) {
                addToast('Failed to unlock', 'error')
              } finally { setLockLoading(false) }
            }}
            disabled={lockLoading || !isCurrentlyLocked}
            className="flex-1 py-2.5 bg-secondary/20 border border-secondary/50 text-secondary font-label text-xs tracking-widest rounded hover:bg-secondary/30 transition-all disabled:opacity-30"
          >
            🔓 UNLOCK
          </button>
        </div>
      </div>

      {/* Invite Code Management */}
      <div className="bg-surface-container rounded-xl p-6 border border-primary/30">
        <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">vpn_key</span>
          Invite Codes
        </h3>
        <p className="text-xs text-on-surface-variant mb-4">
          Generate unique codes and share them with friends. Each code can only be used once.
        </p>

        {/* Generate new code */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newCodeLabel}
            onChange={(e) => setNewCodeLabel(e.target.value)}
            placeholder="Label (e.g., For Shibunan)"
            className="flex-1 bg-surface-dim border border-outline-variant focus:border-primary focus:ring-0 focus:outline-none text-on-surface font-label text-sm px-4 py-2.5 rounded-lg"
          />
          <button
            onClick={handleGenerateCode}
            disabled={codeGenerating}
            className="px-5 py-2.5 bg-primary/10 border border-primary/50 text-primary font-label font-bold text-xs tracking-widest rounded hover:bg-primary/20 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {codeGenerating ? (
              <span className="material-symbols-outlined animate-spin text-sm">sync</span>
            ) : (
              <span className="material-symbols-outlined text-sm">add</span>
            )}
            GENERATE
          </button>
        </div>

        {/* Code list */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {inviteCodes.length === 0 && (
            <p className="text-xs text-on-surface-variant text-center py-4">No invite codes generated yet</p>
          )}
          {inviteCodes.map((code) => (
            <div key={code.id} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
              code.used
                ? 'bg-surface-dim/50 border-outline-variant opacity-60'
                : 'bg-surface-dim border-secondary/30'
            }`}>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className={`font-label font-bold text-sm tracking-widest ${code.used ? 'text-on-surface-variant line-through' : 'text-secondary neon-glow-secondary'}`}>
                    {code.code}
                  </span>
                  {code.used && (
                    <span className="font-label text-[9px] bg-on-surface-variant/20 text-on-surface-variant px-2 py-0.5 rounded uppercase">Used</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {code.label && <span className="font-label text-[10px] text-on-surface-variant">{code.label}</span>}
                  {code.usedByUsername && (
                    <span className="font-label text-[10px] text-primary">→ {code.usedByUsername}</span>
                  )}
                </div>
              </div>
              {!code.used && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { navigator.clipboard.writeText(code.code); addToast('Code copied!', 'info') }}
                    className="material-symbols-outlined text-on-surface-variant hover:text-secondary text-sm transition-colors"
                    title="Copy code"
                  >
                    content_copy
                  </button>
                  <button
                    onClick={() => handleDeleteCode(code.id)}
                    className="material-symbols-outlined text-on-surface-variant hover:text-error text-sm transition-colors"
                    title="Delete code"
                  >
                    delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Change User Password */}
      <div className="bg-surface-container rounded-xl p-6 border border-outline-variant">
        <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface-variant">lock_reset</span>
          Change User Password
        </h3>
        <p className="text-xs text-on-surface-variant mb-4">
          Reset a user's password. They'll need to use the new password on next login.
        </p>
        <ChangePasswordForm users={users} addToast={addToast} />
      </div>

      {/* User Score Management */}
      <div className="bg-surface-container rounded-xl p-6 border border-error/30">
        <h3 className="font-headline font-bold text-sm mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-error">edit_note</span>
          Edit User Prediction Points
        </h3>
        <p className="text-xs text-on-surface-variant mb-4">
          Select a user, then edit points on individual predictions. Total auto-updates.
        </p>

        <div className="space-y-4">
          {/* User select */}
          <select
            value={scoreUsername}
            onChange={async (e) => {
              setScoreUsername(e.target.value)
              setUserPredictions(null)
              if (e.target.value) {
                try {
                  const res = await adminAPI.getUserPredictions(e.target.value)
                  setUserPredictions(res.data)
                } catch (err) {
                  addToast('Failed to load predictions', 'error')
                }
              }
            }}
            className="w-full bg-surface-dim border border-outline-variant focus:border-error focus:ring-0 focus:outline-none text-on-surface font-label text-sm px-4 py-3 rounded-lg"
          >
            <option value="">Select user...</option>
            {users.map((u) => (
              <option key={u.username} value={u.username}>{u.username} ({u.totalPoints} pts)</option>
            ))}
          </select>

          {/* Predictions Editor */}
          {userPredictions && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-3 py-2 bg-primary/10 rounded-lg border border-primary/20">
                <span className="font-label text-sm text-on-surface">{userPredictions.username}</span>
                <span className="font-headline font-bold text-primary">{userPredictions.totalPoints} PTS</span>
              </div>

              {/* Match Predictions */}
              {userPredictions.matchPredictions?.length > 0 && (
                <PredictionEditSection
                  title="Match Predictions"
                  icon="scoreboard"
                  items={userPredictions.matchPredictions}
                  type="match"
                  renderLabel={(item) => `${item.match} (${item.predicted} → ${item.actual})`}
                  onUpdate={async (id, pts) => {
                    await adminAPI.updatePredictionPoints('match', id, pts)
                    const res = await adminAPI.getUserPredictions(scoreUsername)
                    setUserPredictions(res.data)
                    const usersRes = await leaderboardAPI.get()
                    setUsers(usersRes.data)
                    addToast('Points updated', 'success')
                  }}
                  addToast={addToast}
                />
              )}

              {/* Goal Scorer Predictions */}
              {userPredictions.goalScorerPredictions?.length > 0 && (
                <PredictionEditSection
                  title="Goal Scorers"
                  icon="sports_soccer"
                  items={userPredictions.goalScorerPredictions}
                  type="goalScorer"
                  renderLabel={(item) => `${item.match} — ${item.player} (×${item.predictedGoals || 1})`}
                  onUpdate={async (id, pts) => {
                    await adminAPI.updatePredictionPoints('goalScorer', id, pts)
                    const res = await adminAPI.getUserPredictions(scoreUsername)
                    setUserPredictions(res.data)
                    const usersRes = await leaderboardAPI.get()
                    setUsers(usersRes.data)
                    addToast('Points updated', 'success')
                  }}
                  addToast={addToast}
                />
              )}

              {/* MOTM Predictions */}
              {userPredictions.motmPredictions?.length > 0 && (
                <PredictionEditSection
                  title="Man of the Match"
                  icon="star"
                  items={userPredictions.motmPredictions}
                  type="motm"
                  renderLabel={(item) => `${item.match} — ${item.player}`}
                  onUpdate={async (id, pts) => {
                    await adminAPI.updatePredictionPoints('motm', id, pts)
                    const res = await adminAPI.getUserPredictions(scoreUsername)
                    setUserPredictions(res.data)
                    const usersRes = await leaderboardAPI.get()
                    setUsers(usersRes.data)
                    addToast('Points updated', 'success')
                  }}
                  addToast={addToast}
                />
              )}

              {userPredictions.matchPredictions?.length === 0 && userPredictions.goalScorerPredictions?.length === 0 && userPredictions.motmPredictions?.length === 0 && (
                <p className="text-xs text-on-surface-variant text-center py-4">No scored predictions yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PredictionEditSection({ title, icon, items, type, renderLabel, onUpdate, addToast }) {
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')

  return (
    <div>
      <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-2 flex items-center gap-1">
        <span className="material-symbols-outlined text-sm">{icon}</span>
        {title}
      </p>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-surface-dim rounded-lg text-xs">
            <span className="font-label text-on-surface flex-1 truncate mr-2">{renderLabel(item)}</span>
            {editingId === item.id ? (
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-14 bg-surface border border-error/50 text-on-surface font-headline font-bold text-sm px-2 py-0.5 rounded text-center"
                  autoFocus
                />
                <button
                  onClick={async () => {
                    try {
                      await onUpdate(item.id, Number(editValue))
                      setEditingId(null)
                    } catch (err) {
                      addToast('Failed to update', 'error')
                    }
                  }}
                  className="material-symbols-outlined text-secondary text-sm hover:text-secondary/80"
                >check</button>
                <button onClick={() => setEditingId(null)} className="material-symbols-outlined text-on-surface-variant text-sm">close</button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingId(item.id); setEditValue(String(item.points)) }}
                className="flex items-center gap-1 shrink-0 hover:bg-error/10 px-2 py-0.5 rounded transition-colors"
              >
                <span className="font-headline font-bold text-sm text-secondary">+{item.points}</span>
                <span className="material-symbols-outlined text-on-surface-variant text-xs">edit</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ChangePasswordForm({ users, addToast }) {
  const [selectedUser, setSelectedUser] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="space-y-4">
      <select
        value={selectedUser}
        onChange={(e) => setSelectedUser(e.target.value)}
        className="w-full bg-surface-dim border border-outline-variant focus:border-secondary focus:ring-0 focus:outline-none text-on-surface font-label text-sm px-4 py-3 rounded-lg"
      >
        <option value="">Select user...</option>
        {users.map((u) => (
          <option key={u.username} value={u.username}>{u.username}</option>
        ))}
      </select>

      {selectedUser && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password..."
            className="flex-1 bg-surface-dim border border-outline-variant focus:border-secondary focus:ring-0 focus:outline-none text-on-surface font-label text-sm px-4 py-2.5 rounded-lg"
          />
          <button
            onClick={async () => {
              if (!newPassword.trim()) return
              setSubmitting(true)
              try {
                await adminAPI.changeUserPassword(selectedUser, newPassword.trim())
                addToast(`Password changed for ${selectedUser}`, 'success')
                setNewPassword('')
              } catch (err) {
                addToast(err.response?.data?.error || 'Failed to change password', 'error')
              } finally {
                setSubmitting(false)
              }
            }}
            disabled={!newPassword.trim() || submitting}
            className="px-5 py-2.5 bg-secondary/20 border border-secondary/50 text-secondary font-label font-bold text-xs tracking-widest rounded hover:bg-secondary/30 transition-all disabled:opacity-30"
          >
            {submitting ? '...' : 'CHANGE'}
          </button>
        </div>
      )}
    </div>
  )
}

function EditMatchScore({ matches, addToast, onUpdate }) {
  const [editMatchId, setEditMatchId] = useState('')
  const [editTeam1Score, setEditTeam1Score] = useState(0)
  const [editTeam2Score, setEditTeam2Score] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const selectedMatch = matches.find(m => String(m.id) === editMatchId)

  return (
    <div className="space-y-4">
      <select
        value={editMatchId}
        onChange={(e) => {
          setEditMatchId(e.target.value)
          const m = matches.find(mx => String(mx.id) === e.target.value)
          if (m) {
            setEditTeam1Score(m.team1Score ?? 0)
            setEditTeam2Score(m.team2Score ?? 0)
          }
        }}
        className="w-full bg-surface-dim border border-outline-variant focus:border-error focus:ring-0 focus:outline-none text-on-surface font-label text-sm px-4 py-3 rounded-lg"
      >
        <option value="">Select completed match...</option>
        {matches.filter(m => m.status === 'COMPLETED').map((m) => (
          <option key={m.id} value={m.id}>{m.team1} vs {m.team2} ({m.team1Score}-{m.team2Score})</option>
        ))}
      </select>

      {selectedMatch && (
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="font-label text-xs text-on-surface-variant mb-2">{selectedMatch.team1}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setEditTeam1Score(Math.max(0, editTeam1Score - 1))} className="w-8 h-8 rounded bg-surface-variant border border-outline-variant flex items-center justify-center hover:border-error text-sm">-</button>
              <span className="text-2xl font-headline font-extrabold w-8 text-center">{editTeam1Score}</span>
              <button onClick={() => setEditTeam1Score(editTeam1Score + 1)} className="w-8 h-8 rounded bg-surface-variant border border-outline-variant flex items-center justify-center hover:border-secondary text-sm">+</button>
            </div>
          </div>
          <span className="text-on-surface-variant">—</span>
          <div className="text-center">
            <p className="font-label text-xs text-on-surface-variant mb-2">{selectedMatch.team2}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setEditTeam2Score(Math.max(0, editTeam2Score - 1))} className="w-8 h-8 rounded bg-surface-variant border border-outline-variant flex items-center justify-center hover:border-error text-sm">-</button>
              <span className="text-2xl font-headline font-extrabold w-8 text-center">{editTeam2Score}</span>
              <button onClick={() => setEditTeam2Score(editTeam2Score + 1)} className="w-8 h-8 rounded bg-surface-variant border border-outline-variant flex items-center justify-center hover:border-secondary text-sm">+</button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={async () => {
          if (!editMatchId) return
          setSubmitting(true)
          try {
            await adminAPI.editMatchScore(Number(editMatchId), editTeam1Score, editTeam2Score)
            addToast('Match score updated', 'success')
            if (onUpdate) await onUpdate()
          } catch (err) {
            addToast(err.response?.data || 'Failed to update score', 'error')
          } finally {
            setSubmitting(false)
          }
        }}
        disabled={!editMatchId || submitting}
        className="w-full py-3 bg-error/10 border border-error/50 text-error font-headline font-bold text-xs tracking-widest rounded hover:bg-error/20 transition-all disabled:opacity-30"
      >
        {submitting ? 'UPDATING...' : 'UPDATE SCORE'}
      </button>
    </div>
  )
}

function EditMatchDetails({ matches, addToast, onUpdate }) {
  const [editMatchId, setEditMatchId] = useState('')
  const [teams, setTeams] = useState([])
  const [team1Id, setTeam1Id] = useState('')
  const [team2Id, setTeam2Id] = useState('')
  const [matchDateTime, setMatchDateTime] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    matchesAPI.getTeams().then(res => setTeams(res.data)).catch(() => {})
  }, [])

  const selectedMatch = matches.find(m => String(m.id) === editMatchId)

  useEffect(() => {
    if (selectedMatch) {
      setTeam1Id(selectedMatch.team1Id ? String(selectedMatch.team1Id) : '')
      setTeam2Id(selectedMatch.team2Id ? String(selectedMatch.team2Id) : '')
      setMatchDateTime(selectedMatch.matchDateTime ? selectedMatch.matchDateTime.substring(0, 16) : '')
    }
  }, [editMatchId])

  return (
    <div className="space-y-4">
      <select
        value={editMatchId}
        onChange={(e) => setEditMatchId(e.target.value)}
        className="w-full bg-surface-dim border border-outline-variant focus:border-tertiary focus:ring-0 focus:outline-none text-on-surface font-label text-sm px-4 py-3 rounded-lg"
      >
        <option value="">Select match to edit...</option>
        {matches.filter(m => m.status !== 'COMPLETED').map((m) => (
          <option key={m.id} value={m.id}>{m.team1 || 'TBD'} vs {m.team2 || 'TBD'} — {m.stage}</option>
        ))}
      </select>

      {selectedMatch && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-label text-[10px] text-on-surface-variant uppercase mb-1 block">Team 1</label>
              <select
                value={team1Id}
                onChange={(e) => setTeam1Id(e.target.value)}
                className="w-full bg-surface-dim border border-outline-variant focus:border-tertiary focus:ring-0 text-on-surface font-label text-xs px-3 py-2.5 rounded-lg"
              >
                <option value="">TBD</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="font-label text-[10px] text-on-surface-variant uppercase mb-1 block">Team 2</label>
              <select
                value={team2Id}
                onChange={(e) => setTeam2Id(e.target.value)}
                className="w-full bg-surface-dim border border-outline-variant focus:border-tertiary focus:ring-0 text-on-surface font-label text-xs px-3 py-2.5 rounded-lg"
              >
                <option value="">TBD</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="font-label text-[10px] text-on-surface-variant uppercase mb-1 block">Match Date & Time (ET)</label>
            <input
              type="datetime-local"
              value={matchDateTime}
              onChange={(e) => setMatchDateTime(e.target.value)}
              className="w-full bg-surface-dim border border-outline-variant focus:border-tertiary focus:ring-0 text-on-surface font-label text-xs px-3 py-2.5 rounded-lg"
            />
          </div>
          <button
            onClick={async () => {
              if (!editMatchId) return
              setSubmitting(true)
              try {
                const data = { matchId: Number(editMatchId) }
                if (team1Id) data.team1Id = Number(team1Id)
                if (team2Id) data.team2Id = Number(team2Id)
                if (matchDateTime) data.matchDateTime = matchDateTime
                await adminAPI.editMatchDetails(data)
                addToast('Match details updated', 'success')
                if (onUpdate) await onUpdate()
              } catch (err) {
                addToast(err.response?.data || 'Failed to update', 'error')
              } finally {
                setSubmitting(false)
              }
            }}
            disabled={!editMatchId || submitting}
            className="w-full py-3 bg-tertiary/10 border border-tertiary/50 text-tertiary font-headline font-bold text-xs tracking-widest rounded hover:bg-tertiary/20 transition-all disabled:opacity-30"
          >
            {submitting ? 'UPDATING...' : 'UPDATE MATCH DETAILS'}
          </button>
        </div>
      )}
    </div>
  )
}
