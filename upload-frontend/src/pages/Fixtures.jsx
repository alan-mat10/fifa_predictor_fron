import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { matchesAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
const STAGES = ['GROUP', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL']

export default function Fixtures() {
  const [matches, setMatches] = useState([])
  const [standings, setStandings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('FIXTURES') // FIXTURES or STANDINGS
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchData() {
      try {
        const [matchesRes, standingsRes] = await Promise.all([
          matchesAPI.getAll(),
          matchesAPI.getStandings()
        ])
        setMatches(matchesRes.data.map(m => ({
          ...m,
          team1: m.team1Name,
          team2: m.team2Name,
          matchTime: m.matchDateTime,
        })))
        setStandings(standingsRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
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
    const d = new Date(dateStr)
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
  }

  const formatStageName = (stage) => {
    const names = {
      'GROUP': 'Group Stage',
      'ROUND_OF_32': 'Round of 32',
      'ROUND_OF_16': 'Round of 16',
      'QUARTER_FINAL': 'Quarter Final',
      'SEMI_FINAL': 'Semi Final',
      'THIRD_PLACE': 'Third Place',
      'FINAL': 'Final'
    }
    return names[stage] || stage?.replace(/_/g, ' ')
  }

  if (loading) return <LoadingSpinner text="Loading fixtures..." />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-headline font-bold text-2xl neon-glow-secondary">Fixtures</h1>
        <p className="font-label text-sm text-on-surface-variant mt-1">All World Cup 2026 matches</p>
      </div>

      {/* View Toggle: Fixtures / Standings */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('FIXTURES')}
          className={`flex-1 py-2.5 rounded font-label text-xs uppercase tracking-wider transition-all ${
            view === 'FIXTURES'
              ? 'bg-secondary/20 text-secondary border border-secondary/30'
              : 'bg-surface-container text-on-surface-variant border border-outline-variant hover:border-secondary/50'
          }`}
        >
          <span className="material-symbols-outlined text-sm align-middle mr-1">sports_soccer</span>
          Fixtures
        </button>
        <button
          onClick={() => setView('STANDINGS')}
          className={`flex-1 py-2.5 rounded font-label text-xs uppercase tracking-wider transition-all ${
            view === 'STANDINGS'
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'bg-surface-container text-on-surface-variant border border-outline-variant hover:border-primary/50'
          }`}
        >
          <span className="material-symbols-outlined text-sm align-middle mr-1">leaderboard</span>
          Group Standings
        </button>
      </div>

      {/* ═══════════════ STANDINGS VIEW ═══════════════ */}
      {view === 'STANDINGS' && standings && (
        <div className="space-y-6">
          {Object.entries(standings).map(([group, teams]) => (
            <div key={group} className="bg-surface-container rounded-xl p-4 card-glow">
              <h3 className="font-headline font-bold text-sm mb-3 text-secondary">
                Group {group}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-on-surface-variant border-b border-outline-variant">
                      <th className="text-left py-2 pl-1">#</th>
                      <th className="text-left py-2">Team</th>
                      <th className="text-center py-2">P</th>
                      <th className="text-center py-2">W</th>
                      <th className="text-center py-2">D</th>
                      <th className="text-center py-2">L</th>
                      <th className="text-center py-2">GF</th>
                      <th className="text-center py-2">GA</th>
                      <th className="text-center py-2">GD</th>
                      <th className="text-center py-2 font-bold">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team, idx) => (
                      <tr
                        key={team.teamId}
                        className={`border-b border-outline-variant/30 ${
                          idx < 2 ? 'bg-secondary/5' : idx === 2 ? 'bg-tertiary/5' : ''
                        }`}
                      >
                        <td className="py-2 pl-1 font-bold text-on-surface-variant">{idx + 1}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            {team.teamFlagUrl && (
                              <img src={team.teamFlagUrl} alt="" className="w-5 h-3.5 object-cover rounded-sm" />
                            )}
                            <span className="font-label font-medium text-on-surface">{team.teamName}</span>
                          </div>
                        </td>
                        <td className="text-center py-2">{team.matchesPlayed}</td>
                        <td className="text-center py-2">{team.wins}</td>
                        <td className="text-center py-2">{team.draws}</td>
                        <td className="text-center py-2">{team.losses}</td>
                        <td className="text-center py-2">{team.goalsFor}</td>
                        <td className="text-center py-2">{team.goalsAgainst}</td>
                        <td className="text-center py-2">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                        <td className="text-center py-2 font-bold text-secondary">{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-4 mt-2 text-[10px] text-on-surface-variant">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary/30"></span> Qualified (Top 2)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-tertiary/30"></span> Best 3rd place</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════ FIXTURES VIEW ═══════════════ */}
      {view === 'FIXTURES' && (
        <>
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
                {formatStageName(stage)}
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
                        <span className="font-label text-[10px] text-on-surface-variant">
                          {match.group ? `GRP ${match.group}` : formatStageName(match.stage)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1 flex items-center gap-2">
                          {match.team1Flag && <img src={match.team1Flag} alt="" className="w-6 h-4 object-cover rounded-sm" />}
                          <span className={`font-headline font-bold text-sm ${match.team1 === 'TBD' ? 'text-on-surface-variant italic' : ''}`}>
                            {match.team1}
                          </span>
                        </div>
                        <div className="px-3">
                          {match.status === 'COMPLETED' ? (
                            <span className="font-headline font-extrabold text-sm text-on-surface">{match.team1Score} - {match.team2Score}</span>
                          ) : (
                            <span className="font-headline font-extrabold text-sm text-on-surface opacity-30">vs</span>
                          )}
                        </div>
                        <div className="flex-1 flex items-center justify-end gap-2">
                          <span className={`font-headline font-bold text-sm ${match.team2 === 'TBD' ? 'text-on-surface-variant italic' : ''}`}>
                            {match.team2}
                          </span>
                          {match.team2Flag && <img src={match.team2Flag} alt="" className="w-6 h-4 object-cover rounded-sm" />}
                        </div>
                      </div>
                      {match.venue && (
                        <p className="font-label text-[10px] text-on-surface-variant mb-3 truncate">
                          <span className="material-symbols-outlined text-[10px] align-middle mr-1">location_on</span>
                          {match.venue}
                        </p>
                      )}
                      {match.status !== 'COMPLETED' && match.team1 !== 'TBD' && match.team2 !== 'TBD' ? (
                        <button
                          onClick={() => navigate(`/predict/${match.id}`)}
                          className="w-full py-2 btn-neon-secondary rounded text-[10px]"
                        >
                          PREDICT
                        </button>
                      ) : match.status === 'COMPLETED' ? (
                        <button
                          onClick={() => navigate(`/match-results/${match.id}`)}
                          className="w-full py-2 border border-outline-variant text-on-surface-variant font-label text-[10px] tracking-widest hover:text-secondary hover:border-secondary/50 transition-all rounded"
                        >
                          RESULTS
                        </button>
                      ) : (
                        <div className="w-full py-2 text-center font-label text-[10px] text-on-surface-variant tracking-widest opacity-50">
                          AWAITING TEAMS
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}
