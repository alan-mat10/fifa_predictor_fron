import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { matchesAPI, leaderboardAPI, predictionsAPI, announcementAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { requestNotificationPermission, isSubscribed } from '../utils/pushNotifications'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Dashboard() {
  const [todayMatches, setTodayMatches] = useState([])
  const [notifStatus, setNotifStatus] = useState(null) // 'granted' | 'denied' | 'prompt' | 'unsupported'
  const [leaderboard, setLeaderboard] = useState([])
  const [myPredictions, setMyPredictions] = useState([])
  const [prizeWinners, setPrizeWinners] = useState([])
  const [announcement, setAnnouncement] = useState(null)
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
  const [showContestPopup, setShowContestPopup] = useState(false)
  const [showWinnerPopup, setShowWinnerPopup] = useState(false)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchData() {
      try {
        const [matchesRes, leaderboardRes, predictionsRes, announcementRes, prizeRes] = await Promise.allSettled([
          matchesAPI.getToday(),
          leaderboardAPI.get(),
          predictionsAPI.getMy(),
          announcementAPI.get(),
          matchesAPI.getPrizeWinners(),
        ])
        if (matchesRes.status === 'fulfilled') {
          setTodayMatches(matchesRes.value.data.map(m => ({
            ...m,
            team1: m.team1Name,
            team2: m.team2Name,
            matchTime: m.matchDateTime,
          })))
        }
        if (leaderboardRes.status === 'fulfilled') setLeaderboard(leaderboardRes.value.data)
        if (predictionsRes.status === 'fulfilled') setMyPredictions(predictionsRes.value.data)
        if (announcementRes.status === 'fulfilled' && announcementRes.value.data?.message) {
          const msg = announcementRes.value.data.message
          setAnnouncement(msg)
          // Show modal if user hasn't seen this announcement yet
          const seenKey = `announcement_seen_${user?.username}`
          const lastSeen = localStorage.getItem(seenKey)
          if (lastSeen !== msg) {
            setShowAnnouncementModal(true)
          }
        }
        if (prizeRes.status === 'fulfilled') setPrizeWinners(prizeRes.value.data)

        // Check if tournament winner is announced
        try {
          const lockRes = await predictionsAPI.getTournamentLockStatus()
          if (lockRes.data?.winnerAnnounced && !sessionStorage.getItem('winner_popup_seen')) {
            setShowWinnerPopup(true)
          }
        } catch (e) {}
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()

    // Check notification status
    async function checkNotifications() {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        setNotifStatus('unsupported')
      } else if (Notification.permission === 'granted') {
        setNotifStatus('granted')
        // Auto-subscribe in background
        requestNotificationPermission().catch(() => {})
      } else if (Notification.permission === 'denied') {
        setNotifStatus('denied')
      } else {
        setNotifStatus('prompt')
      }
    }
    checkNotifications()

    // Show contest popup once per browser session (shows again after tab close or new login)
    if (!sessionStorage.getItem('contest_popup_dismissed')) {
      setShowContestPopup(true)
    }
  }, [])

  const dismissAnnouncementModal = () => {
    setShowAnnouncementModal(false)
    if (announcement && user?.username) {
      localStorage.setItem(`announcement_seen_${user.username}`, announcement)
    }
  }

  if (loading) return <LoadingSpinner text="Syncing neural data..." />

  const totalPoints = leaderboard.find((e) => e.username === user?.username)?.totalPoints || 0
  const rank = leaderboard.findIndex((e) => e.username === user?.username) + 1
  const scored = myPredictions.filter((p) => p.pointsEarned > 0).length
  const accuracy = myPredictions.length > 0 ? Math.round((scored / myPredictions.length) * 100) : 0

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    // Backend already sends times converted to IST
    const d = new Date(dateStr)
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      {/* Announcement Modal Popup */}
      {showAnnouncementModal && announcement && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={dismissAnnouncementModal}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative bg-surface-container rounded-2xl border border-tertiary/40 shadow-[0_0_40px_rgba(0,255,204,0.2)] w-full max-w-sm overflow-hidden animate-[scaleIn_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow header */}
            <div className="bg-gradient-to-r from-tertiary/20 via-primary/10 to-secondary/20 px-6 py-4 border-b border-tertiary/20">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-tertiary text-2xl animate-pulse">campaign</span>
                <h3 className="font-headline font-bold text-sm text-on-surface">New Announcement</h3>
              </div>
            </div>
            {/* Body */}
            <div className="px-6 py-5">
              <p className="font-label text-sm text-on-surface leading-relaxed">{announcement}</p>
            </div>
            {/* Footer */}
            <div className="px-6 pb-5">
              <button
                onClick={dismissAnnouncementModal}
                className="w-full py-3 bg-tertiary/20 border border-tertiary/50 text-tertiary font-headline font-bold text-xs tracking-widest rounded-lg hover:bg-tertiary/30 transition-all"
              >
                GOT IT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contest Popup Modal — once per login session */}
      {showContestPopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => { setShowContestPopup(false); sessionStorage.setItem('contest_popup_dismissed', '1') }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative bg-surface-container rounded-2xl border border-primary/40 shadow-[0_0_40px_rgba(255,45,120,0.2)] w-full max-w-md max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-primary/20 via-tertiary/10 to-secondary/20 px-6 py-4 border-b border-primary/20">
              <h3 className="font-headline font-bold text-sm text-on-surface">
                🏆 FIFA World Cup Score Prediction – Prize Announcement! ⚽🎉
              </h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="font-label text-sm text-on-surface leading-relaxed">
                The excitement continues! For all the remaining FIFA World Cup matches, we're introducing a special reward.
              </p>
              <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4">
                <p className="font-label text-sm font-bold text-secondary">💰 Prize: Rs.500 for each match</p>
              </div>
              <div className="space-y-3">
                <p className="font-label text-xs font-bold text-on-surface uppercase tracking-wider">How to win:</p>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-secondary text-sm mt-0.5">emoji_events</span>
                  <p className="font-label text-xs text-on-surface-variant leading-relaxed">
                    The user with the highest prediction points for a match will win <strong className="text-secondary">Rs.500</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-tertiary text-sm mt-0.5">handshake</span>
                  <p className="font-label text-xs text-on-surface-variant leading-relaxed">
                    If two or more users finish with the same highest points, the Rs.500 prize will be split equally among them.
                  </p>
                </div>
              </div>
              <div className="bg-tertiary/10 border border-tertiary/20 rounded-lg p-3">
                <p className="font-label text-xs text-on-surface leading-relaxed">
                  📢 Make sure to submit your predictions before kickoff and don't miss your chance to win!
                </p>
              </div>

              {/* Winner Announcements */}
              {prizeWinners.length > 0 && (
                <div className="space-y-3">
                  {prizeWinners.map((pw, i) => (
                    <div key={i} className="bg-gradient-to-r from-secondary/20 to-tertiary/20 border border-secondary/40 rounded-lg p-3 text-center space-y-1">
                      <span className="text-lg">🎉🏆</span>
                      <p className="font-label text-xs text-on-surface">
                        <strong>{pw.team1} {pw.team1Score} - {pw.team2Score} {pw.team2}</strong>
                      </p>
                      <p className="font-label text-sm text-on-surface">
                        🥇 <strong className="text-secondary">{pw.winner}</strong> wins <strong className="text-secondary">Rs.500</strong>! 🎊
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <p className="font-label text-sm text-on-surface text-center pt-2">
                Good luck to everyone, and may the best predictor win! 🍀⚽
              </p>
            </div>
            <div className="px-6 pb-5">
              <button
                onClick={() => { setShowContestPopup(false); sessionStorage.setItem('contest_popup_dismissed', '1') }}
                className="w-full py-3 bg-primary/20 border border-primary/50 text-primary font-headline font-bold text-xs tracking-widest rounded-lg hover:bg-primary/30 transition-all"
              >
                LET'S GO! 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Winner Popup — dynamic from leaderboard */}
      {showWinnerPopup && leaderboard.length >= 3 && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => { setShowWinnerPopup(false); sessionStorage.setItem('winner_popup_seen', '1') }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div
            className="relative bg-surface-container rounded-2xl border border-secondary/40 shadow-[0_0_60px_rgba(0,255,204,0.3)] w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-secondary/30 via-primary/20 to-tertiary/30 px-6 py-5 text-center border-b border-secondary/20">
              <span className="text-4xl">🏆</span>
              <h3 className="font-headline font-bold text-lg text-on-surface mt-2">Tournament Champions!</h3>
              <p className="font-label text-xs text-on-surface-variant mt-1">FIFA World Cup 2026 Predictor</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* 1st Place */}
              <div className="flex items-center gap-4 p-4 bg-secondary/10 border border-secondary/30 rounded-xl">
                <span className="text-3xl">🥇</span>
                <div className="flex-1">
                  <p className="font-headline font-extrabold text-lg text-secondary">{leaderboard[0]?.username}</p>
                  <p className="font-label text-xs text-on-surface-variant">{leaderboard[0]?.totalPoints} points</p>
                </div>
                <span className="font-headline font-bold text-sm text-secondary">🎉</span>
              </div>
              {/* 2nd Place */}
              <div className="flex items-center gap-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <span className="text-2xl">🥈</span>
                <div className="flex-1">
                  <p className="font-headline font-bold text-sm text-on-surface">{leaderboard[1]?.username}</p>
                  <p className="font-label text-[10px] text-on-surface-variant">{leaderboard[1]?.totalPoints} points</p>
                </div>
              </div>
              {/* 3rd Place */}
              <div className="flex items-center gap-4 p-3 bg-tertiary/5 border border-tertiary/20 rounded-lg">
                <span className="text-2xl">🥉</span>
                <div className="flex-1">
                  <p className="font-headline font-bold text-sm text-on-surface">{leaderboard[2]?.username}</p>
                  <p className="font-label text-[10px] text-on-surface-variant">{leaderboard[2]?.totalPoints} points</p>
                </div>
              </div>
              <p className="font-label text-xs text-on-surface-variant text-center pt-2">
                Congratulations to all participants! 🎊
              </p>
            </div>
            <div className="px-6 pb-5">
              <button
                onClick={() => { setShowWinnerPopup(false); sessionStorage.setItem('winner_popup_seen', '1') }}
                className="w-full py-3 bg-secondary/20 border border-secondary/50 text-secondary font-headline font-bold text-xs tracking-widest rounded-lg hover:bg-secondary/30 transition-all"
              >
                AMAZING! 🏆
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pinned Announcement */}
      {announcement && (
        <div className="xl:col-span-12 bg-tertiary/10 border border-tertiary/30 rounded-xl px-5 py-3 flex items-start gap-3">
          <span className="material-symbols-outlined text-tertiary text-lg mt-0.5">campaign</span>
          <p className="font-label text-sm text-on-surface flex-1">{announcement}</p>
        </div>
      )}

      {/* Fair Play Warning */}
      <div className="xl:col-span-12 bg-error/5 border border-error/20 rounded-xl px-5 py-3 flex items-start gap-3">
        <span className="material-symbols-outlined text-error text-lg mt-0.5">gavel</span>
        <p className="font-label text-xs text-on-surface-variant flex-1">
          <strong className="text-error">Fair Play:</strong> Any player found violating the spirit of the game — exploiting bugs, manipulating scores, or gaining unfair advantages by any means — will be disqualified from the match result or from the tournament itself.
        </p>
      </div>

      {/* Jersey Prize */}
      <div className="xl:col-span-12 bg-gradient-to-r from-tertiary/10 to-secondary/10 border border-tertiary/30 rounded-xl px-6 py-4 flex items-center gap-4 overflow-hidden relative">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-tertiary/10 rounded-full blur-2xl"></div>
        <span className="material-symbols-outlined text-tertiary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>checkroom</span>
        <div className="flex-1">
          <p className="font-headline font-bold text-sm text-on-surface">🏆 Tournament Winner Prize</p>
          <p className="font-label text-xs text-on-surface-variant mt-1">
            The overall <strong className="text-tertiary">tournament winner</strong> will be awarded with a <strong className="text-secondary">jersey of their favorite team!</strong>
          </p>
        </div>
        <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
      </div>

      {/* Contest Announcement */}
      <div className="xl:col-span-12 bg-gradient-to-br from-primary/10 via-tertiary/5 to-secondary/10 border border-primary/30 rounded-xl p-6 overflow-hidden relative">
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-secondary/10 rounded-full blur-2xl"></div>
        
        <div className="relative space-y-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
            <h3 className="font-headline font-bold text-base text-on-surface">
              🏆 FIFA World Cup Score Prediction – Prize Announcement! ⚽🎉
            </h3>
          </div>

          <p className="font-label text-sm text-on-surface-variant leading-relaxed">
            The excitement continues! For all the remaining FIFA World Cup matches, we're introducing a special reward.
          </p>

          <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4 space-y-3">
            <p className="font-label text-sm font-bold text-secondary">💰 Prize: Rs.500 for each match</p>
            <div className="space-y-2 pl-1">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-secondary text-sm mt-0.5">emoji_events</span>
                <p className="font-label text-xs text-on-surface-variant">
                  The user with the highest prediction points for a match will win <strong className="text-secondary">Rs.500</strong>.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-tertiary text-sm mt-0.5">handshake</span>
                <p className="font-label text-xs text-on-surface-variant">
                  If two or more users finish with the same highest points, the Rs.500 prize will be split equally among them.
                </p>
              </div>
            </div>
          </div>

          <p className="font-label text-xs text-on-surface-variant">
            📢 Make sure to submit your predictions before kickoff and don't miss your chance to win!
          </p>

          {/* Winner Announcements */}
          {prizeWinners.length > 0 && (
            <div className="space-y-3">
              <p className="font-headline font-bold text-sm text-secondary">🏆 Match Winners</p>
              {prizeWinners.map((pw, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 bg-secondary/10 border border-secondary/30 rounded-lg">
                  <div>
                    <p className="font-label text-xs text-on-surface-variant">{pw.team1} {pw.team1Score} - {pw.team2Score} {pw.team2}</p>
                    <p className="font-label text-sm text-on-surface font-bold">🥇 {pw.winner} <span className="text-secondary">Rs.500</span></p>
                  </div>
                  <span className="text-lg">🎊</span>
                </div>
              ))}
            </div>
          )}

          <p className="font-label text-sm text-on-surface text-center">
            Good luck to everyone, and may the best predictor win! 🍀⚽
          </p>
        </div>
      </div>

      {/* Prize Distribution Feed - Carousel */}
      <div className="xl:col-span-12 bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/50 shadow-lg">
        <PrizeCarousel />
        <div className="px-4 py-3 bg-surface-container">
          <p className="font-label text-xs text-on-surface-variant">
            🏆 Congratulations to our winners!
          </p>
        </div>
      </div>

      {/* Notification Permission Prompt */}
      {notifStatus === 'prompt' && (
        <div className="xl:col-span-12 bg-secondary/5 border border-secondary/30 rounded-xl px-5 py-4 flex items-center gap-4">
          <span className="material-symbols-outlined text-secondary text-2xl">notifications_active</span>
          <div className="flex-1">
            <p className="font-label text-sm text-on-surface font-bold">Enable Match Reminders</p>
            <p className="font-label text-xs text-on-surface-variant mt-0.5">Get notified 30 minutes before each match so you never miss a prediction!</p>
          </div>
          <button
            onClick={async () => {
              const result = await requestNotificationPermission()
              setNotifStatus(result)
            }}
            className="px-4 py-2 bg-secondary/20 border border-secondary/50 text-secondary font-label text-xs font-bold rounded hover:bg-secondary/30 transition-all whitespace-nowrap"
          >
            ENABLE
          </button>
        </div>
      )}

      {/* Left Column */}
      <div className="xl:col-span-8 space-y-8">
        {/* Section Header */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="font-headline font-bold text-2xl text-on-surface neon-glow-secondary">Today's Matches</h2>
            <p className="font-label text-on-surface-variant text-sm mt-1">FIFA WORLD CUP 2026</p>
          </div>
          <button onClick={() => navigate('/fixtures')} className="text-secondary font-label text-xs uppercase tracking-widest hover:underline decoration-secondary underline-offset-4">
            View All
          </button>
        </div>

        {/* Matches Horizontal Scroll */}
        {todayMatches.length > 0 ? (
          <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 -mx-2 px-2">
            {todayMatches.map((match) => (
              <div key={match.id} className="flex-none w-[300px] bg-surface-container rounded-xl p-5 card-glow relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-secondary/10 to-transparent"></div>
                <div className="flex justify-between items-center mb-5">
                  <span className={`font-label text-[10px] px-2 py-0.5 rounded border ${
                    match.status === 'COMPLETED' ? 'bg-on-surface-variant/20 text-on-surface-variant border-outline-variant' :
                    match.status === 'LIVE' ? 'bg-secondary/20 text-secondary border-secondary/30' :
                    'bg-tertiary/20 text-tertiary border-tertiary/30'
                  }`}>
                    {match.status === 'COMPLETED' ? 'FINAL' : match.status === 'LIVE' ? 'LIVE' : formatTime(match.matchTime)}
                  </span>
                  <span className="font-label text-[10px] text-on-surface-variant">{match.group || match.stage}</span>
                </div>
                <div className="flex justify-around items-center gap-4 mb-5">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center border border-outline mb-2 overflow-hidden">
                      {match.team1Flag ? (
                        <img src={match.team1Flag} alt={match.team1} className="w-10 h-10 object-cover" />
                      ) : (
                        <span className="font-headline font-bold text-xs">{match.team1?.substring(0, 3).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="font-headline font-bold text-xs uppercase tracking-wider block truncate max-w-[80px]">{match.team1}</span>
                  </div>
                  <div className="text-center">
                    {match.status === 'COMPLETED' ? (
                      <span className="text-xl font-headline font-extrabold text-on-surface">{match.team1Score} - {match.team2Score}</span>
                    ) : (
                      <span className="text-xl font-headline font-extrabold text-on-surface opacity-30">VS</span>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center border border-outline mb-2 overflow-hidden">
                      {match.team2Flag ? (
                        <img src={match.team2Flag} alt={match.team2} className="w-10 h-10 object-cover" />
                      ) : (
                        <span className="font-headline font-bold text-xs">{match.team2?.substring(0, 3).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="font-headline font-bold text-xs uppercase tracking-wider block truncate max-w-[80px]">{match.team2}</span>
                  </div>
                </div>
                {match.status !== 'COMPLETED' ? (
                  <button
                    onClick={() => navigate(`/predict/${match.id}`)}
                    className="w-full py-3 btn-solid-secondary rounded text-xs"
                  >
                    PREDICT
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/match-results/${match.id}`)}
                    className="w-full py-3 border border-outline text-on-surface-variant font-headline font-bold text-xs tracking-widest hover:text-on-surface transition-all rounded"
                  >
                    VIEW RESULTS
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface-container rounded-xl p-8 card-glow text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-3 block">sports_soccer</span>
            <p className="font-label text-sm text-on-surface-variant">No matches scheduled today</p>
            <button onClick={() => navigate('/fixtures')} className="mt-4 btn-neon-secondary px-6 py-2 rounded">
              VIEW FIXTURES
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-container-high rounded-xl p-6 primary-glow-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">monitoring</span>
              </div>
              <span className="font-label text-[10px] text-on-surface-variant uppercase">Points</span>
            </div>
            <span className="text-4xl font-headline font-extrabold text-on-surface neon-glow-primary">{totalPoints}</span>
          </div>
          <div className="bg-surface-container-high rounded-xl p-6 card-glow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary">leaderboard</span>
              </div>
              <span className="font-label text-[10px] text-on-surface-variant uppercase">Rank</span>
            </div>
            <span className="text-4xl font-headline font-extrabold text-secondary neon-glow-secondary">#{rank || '-'}</span>
          </div>
          <div className="bg-surface-container-high rounded-xl p-6 border border-tertiary/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-tertiary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-tertiary">percent</span>
              </div>
              <span className="font-label text-[10px] text-on-surface-variant uppercase">Accuracy</span>
            </div>
            <span className="text-4xl font-headline font-extrabold text-tertiary neon-glow-tertiary">{accuracy}%</span>
          </div>
        </div>
      </div>

      {/* Right Column - Mini Leaderboard */}
      <div className="xl:col-span-4 space-y-6">
        <div className="bg-surface-container rounded-xl p-6 border border-outline-variant">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline font-bold text-sm tracking-tight">Leaderboard</h3>
            <span className="font-label text-[10px] text-on-surface-variant">TOP 5</span>
          </div>
          <div className="space-y-3">
            {leaderboard.slice(0, 5).map((entry, idx) => (
              <div
                key={entry.username}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  entry.username === user?.username
                    ? 'bg-secondary/10 border border-secondary/30'
                    : idx === 0
                    ? 'bg-surface-container-highest border border-primary/20'
                    : 'bg-surface-container hover:bg-surface-variant'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-headline font-extrabold text-sm ${
                    entry.username === user?.username ? 'text-secondary' : idx === 0 ? 'text-primary' : 'text-on-surface-variant'
                  }`}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                    entry.username === user?.username ? 'bg-secondary/20 border-secondary/30' : 'bg-surface-variant border-outline'
                  }`}>
                    <span className="material-symbols-outlined text-sm">person</span>
                  </div>
                  <span className={`font-label text-sm ${entry.username === user?.username ? 'font-bold text-secondary' : ''}`}>
                    {entry.username}
                  </span>
                </div>
                <span className={`font-headline font-extrabold text-xs ${
                  entry.username === user?.username ? 'text-secondary neon-glow-secondary' : 'text-on-surface-variant'
                }`}>
                  {entry.totalPoints} PTS
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/leaderboard')}
            className="w-full mt-6 py-2 text-on-surface-variant font-label text-xs uppercase tracking-widest hover:text-secondary transition-colors"
          >
            View Full Leaderboard
          </button>
        </div>

        {/* Pro Tip */}
        <div className="bg-gradient-to-br from-tertiary/20 to-transparent rounded-xl p-6 border border-tertiary/30">
          <div className="flex gap-4">
            <span className="material-symbols-outlined text-tertiary text-4xl">tips_and_updates</span>
            <div>
              <h4 className="font-headline font-bold text-sm text-tertiary">Scoring Rules</h4>
              <p className="text-xs text-on-tertiary-container mt-1 leading-relaxed">
                Correct result: +1. Exact score: +3 bonus. Goal scorer: +3 each (wrong: -1). MOTM: +3.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const prizeSlides = [
  { image: '/winners/arg-eng-winner1.jpg', name: 'Mayadas', caption: 'Argentina vs England — Rs.250 to Mayadas' },
  { image: '/winners/arg-eng-winner2.jpg', name: 'Bhavya', caption: 'Argentina vs England — Rs.250 to Bhavya' },
  { image: '/winners/bivin-france-spain.jpg', name: 'Bivin R', caption: 'France vs Spain — Rs.500 to Bivin R' },
]

function PrizeCarousel() {
  const [current, setCurrent] = useState(0)
  const [seenSlides, setSeenSlides] = useState(new Set())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => {
        const next = (prev + 1) % prizeSlides.length
        setSeenSlides(s => new Set([...s, prev]))
        return next
      })
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  const slide = prizeSlides[current]
  const showConfetti = !seenSlides.has(current)

  return (
    <div className="relative overflow-hidden">
      {/* Confetti burst from top-left — only first time per slide */}
      {showConfetti && (
        <div className="absolute top-0 left-0 pointer-events-none z-10 w-full h-full">
          {[...Array(25)].map((_, i) => {
            const angle = (i * 15) * Math.PI / 180
            const dist = 120 + Math.random() * 200
            const tx = Math.cos(angle) * dist
            const ty = Math.sin(angle) * dist
            return (
              <div
                key={`${current}-${i}`}
                className="absolute w-3 h-3 rounded-sm"
                style={{
                  left: '20px',
                  top: '20px',
                  backgroundColor: ['#00ffcc', '#ff2d78', '#ffd700', '#7c4dff', '#00e5ff', '#ff6d00'][i % 6],
                  animation: `confetti-burst 1.5s ease-out forwards`,
                  animationDelay: `${i * 0.04}s`,
                  '--tx': `${tx}px`,
                  '--ty': `${ty}px`,
                }}
              />
            )
          })}
        </div>
      )}
      {/* Winner name near top-left */}
      <div className="absolute top-3 left-3 z-20">
        <span className="font-headline font-extrabold text-lg text-secondary drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">🏆 {slide.name}</span>
      </div>
      {/* Image */}
      <img
        src={slide.image}
        alt={slide.name}
        className="w-full h-auto object-cover transition-opacity duration-500"
      />
      {/* Bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-4 py-3 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-secondary/30 border-2 border-secondary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-secondary text-xs">emoji_events</span>
          </div>
          <p className="font-headline font-bold text-xs text-white">
            🎉 {slide.caption}
          </p>
        </div>
      </div>
      {/* Dots */}
      <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {prizeSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-secondary w-4' : 'bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  )
}
