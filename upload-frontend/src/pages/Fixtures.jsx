import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { matchesAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
const STAGES = ['GROUP_STAGE', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL']

export default function Fixtures() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await matchesAPI.getAll()
        setMatches(res.data.map(m => ({
          ...m,
          team1: m.team1Name,
          team2: m.team2Name,
          matchTime: m.matchDateTime,
        })))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchMatches()
  }, [])

  const filteredMatches = useMemo(() => {
    let result = matches
    if (filter !== 'ALL') {
      if (GROUPS.includes(filter)) {
        result = result.filter((m) => m.group === filter)
      } else {
        result = result.filter((m) => m.stage === filter)
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (m) => m.team1?.toLowerCase().includes(q) || m.team2?.toLowerCase().includes(q)
      )
    }
    return result
  }, [matches, filter, search])

  const [section, setSection] = useState('UPCOMING')

  const sectionedMatches = useMemo(() => {
    if (section === 'COMPLETED') return filteredMatches.filter(m => m.status === 'COMPLETED')
    return filteredMatches.filter(m => m.status !== 'COMPLETED')
  }, [filteredMatches, section])

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups = {}
    sectionedMatches.forEach((m) => {
      const date = m.matchTime ? new Date(m.matchTime).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' }) : 'TBD'
      if (!groups[date]) groups[date] = []
      groups[date].push(m)
    })
    return groups
  }, [sectionedMatches])

  const formatTime = (dateStr) => {
    if (!dateStr) return 'TBD'
    // Backend already sends times converted to IST
    const d = new Date(dateStr)
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
  }

  if (loading) return <LoadingSpinner text="Loading fixtures..." />

  const tabs = ['ALL', ...GROUPS, ...STAGES.map(s => s)]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-headline font-bold text-2xl neon-glow-secondary">Fixtures</h1>
        <p className="font-label text-sm text-on-surface-variant mt-1">All World Cup 2026 matches</p>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">search</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team..."
          className="w-full bg-surface-container border border-outline-variant focus:border-secondary focus:ring-0 focus:outline-none text-on-surface font-label pl-10 pr-4 py-3 rounded-lg transition-all"
        />
      </div>

      {/* Section Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setSection('UPCOMING')}
          className={`flex-1 py-2.5 rounded font-label text-xs uppercase tracking-wider transition-all ${
            section === 'UPCOMING'
              ? 'bg-secondary/20 text-secondary border border-secondary/30'
              : 'bg-surface-container text-on-surface-variant border border-outline-variant hover:border-secondary/50'
          }`}
        >
          Upcoming ({filteredMatches.filter(m => m.status !== 'COMPLETED').length})
        </button>
        <button
          onClick={() => setSection('COMPLETED')}
          className={`flex-1 py-2.5 rounded font-label text-xs uppercase tracking-wider transition-all ${
            section === 'COMPLETED'
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'bg-surface-container text-on-surface-variant border border-outline-variant hover:border-primary/50'
          }`}
        >
          Completed ({filteredMatches.filter(m => m.status === 'COMPLETED').length})
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
        {['ALL', ...GROUPS].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex-none px-4 py-2 rounded font-label text-xs uppercase tracking-wider transition-all ${
              filter === tab
                ? 'bg-secondary/20 text-secondary border border-secondary/30'
                : 'bg-surface-container text-on-surface-variant border border-outline-variant hover:border-secondary/50'
            }`}
          >
            {tab === 'ALL' ? 'All' : `Group ${tab}`}
          </button>
        ))}
        {STAGES.map((stage) => (
          <button
            key={stage}
            onClick={() => setFilter(stage)}
            className={`flex-none px-4 py-2 rounded font-label text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              filter === stage
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-surface-container text-on-surface-variant border border-outline-variant hover:border-primary/50'
            }`}
          >
            {stage.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Matches Grid */}
      {Object.keys(groupedByDate).length === 0 ? (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-3 block">event_busy</span>
          <p className="font-label text-sm text-on-surface-variant">No matches found</p>
        </div>
      ) : (
        Object.entries(groupedByDate).map(([date, dateMatches]) => (
          <div key={date} className="space-y-4">
            <h3 className="font-label text-xs uppercase tracking-widest text-on-surface-variant border-b border-outline-variant pb-2">
              {date}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {dateMatches.map((match) => (
                <div key={match.id} className="bg-surface-container rounded-xl p-4 card-glow hover:scale-[1.02] transition-transform">
                  <div className="flex justify-between items-center mb-3">
                    <span className={`font-label text-[10px] px-2 py-0.5 rounded border ${
                      match.status === 'COMPLETED' ? 'bg-on-surface-variant/20 text-on-surface-variant border-outline-variant' :
                      match.status === 'LIVE' ? 'bg-secondary/20 text-secondary border-secondary/30' :
                      'bg-tertiary/20 text-tertiary border-tertiary/30'
                    }`}>
                      {match.status === 'COMPLETED' ? 'FINAL' : match.status === 'LIVE' ? 'LIVE' : formatTime(match.matchTime)}
                    </span>
                    <span className="font-label text-[10px] text-on-surface-variant">{match.group ? `GRP ${match.group}` : match.stage?.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1 flex items-center gap-2">
                      {match.team1Flag && <img src={match.team1Flag} alt="" className="w-6 h-4 object-cover rounded-sm" />}
                      <span className="font-headline font-bold text-sm">{match.team1}</span>
                    </div>
                    <div className="px-3">
                      {match.status === 'COMPLETED' ? (
                        <div className="text-center">
                          <span className="font-headline font-extrabold text-sm text-on-surface">{match.team1Score} - {match.team2Score}</span>
                          {match.team1PenaltyScore != null && match.team2PenaltyScore != null && (
                            <div className="font-label text-[9px] text-tertiary mt-0.5">
                              Pens: {match.team1PenaltyScore} - {match.team2PenaltyScore}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="font-headline font-extrabold text-sm text-on-surface opacity-30">vs</span>
                      )}
                    </div>
                    <div className="flex-1 flex items-center justify-end gap-2">
                      <span className="font-headline font-bold text-sm">{match.team2}</span>
                      {match.team2Flag && <img src={match.team2Flag} alt="" className="w-6 h-4 object-cover rounded-sm" />}
                    </div>
                  </div>
                  {match.venue && (
                    <p className="font-label text-[10px] text-on-surface-variant mb-3 truncate">
                      <span className="material-symbols-outlined text-[10px] align-middle mr-1">location_on</span>
                      {match.venue}
                    </p>
                  )}
                  {match.status !== 'COMPLETED' ? (
                    <button
                      onClick={() => navigate(`/predict/${match.id}`)}
                      className="w-full py-2 btn-neon-secondary rounded text-[10px]"
                    >
                      PREDICT
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/match-results/${match.id}`)}
                      className="w-full py-2 border border-outline-variant text-on-surface-variant font-label text-[10px] tracking-widest hover:text-secondary hover:border-secondary/50 transition-all rounded"
                    >
                      RESULTS
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
