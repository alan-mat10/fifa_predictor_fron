import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8085',
})

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── Auth ──────────────────────────────────────────────
export const authAPI = {
  login: (username, password) =>
    api.post('/api/auth/login', { username, password }),
  register: (username, password, inviteCode, avatar) =>
    api.post('/api/auth/register', { username, password, inviteCode, avatar }),
}

// ─── Matches ───────────────────────────────────────────
export const matchesAPI = {
  getAll: () => api.get('/api/matches'),
  getToday: () => api.get('/api/matches/today'),
  getById: (id) => api.get(`/api/matches/${id}`),
  getByGroup: (group) => api.get(`/api/matches/group/${group}`),
  getByStage: (stage) => api.get(`/api/matches/stage/${stage}`),
  getScorers: (matchId) => api.get(`/api/matches/${matchId}/scorers`),
  getStandings: () => api.get('/api/matches/standings'),
  getStandingsByGroup: (group) => api.get(`/api/matches/standings/${group}`),
}

// ─── Predictions ───────────────────────────────────────
export const predictionsAPI = {
  make: (matchId, predictedTeam1Score, predictedTeam2Score, penaltyWinnerTeamId) =>
    api.post('/api/predictions', { matchId, predictedTeam1Score, predictedTeam2Score, penaltyWinnerTeamId }),
  getMy: () => api.get('/api/predictions/my'),
  getForMatch: (matchId) => api.get(`/api/predictions/match/${matchId}`),
  getMyTournament: () => api.get('/api/predictions/tournament'),
  getTournamentLockStatus: () => api.get('/api/predictions/tournament-lock-status'),
  predictGoalScorers: (matchId, playerIds, firstGoalScorerPlayerId, playerGoalCounts) =>
    api.post('/api/predictions/goal-scorers', { matchId, playerIds, firstGoalScorerPlayerId, playerGoalCounts }),
  getGoalScorerPredictions: (matchId) =>
    api.get(`/api/predictions/goal-scorers/match/${matchId}`),
  getAllGoalScorerPredictions: (matchId) =>
    api.get(`/api/predictions/goal-scorers/match/${matchId}/all`),
  getMotmPredictions: (matchId) =>
    api.get(`/api/predictions/motm/match/${matchId}`),
}

// ─── Players ───────────────────────────────────────────
export const playersAPI = {
  search: (query) => api.get(`/api/players/search?q=${encodeURIComponent(query)}`),
  getByTeam: (teamId) => api.get(`/api/players/team/${teamId}`),
  getForwards: () => api.get('/api/players/forwards'),
}

// ─── Leaderboard ───────────────────────────────────────
export const leaderboardAPI = {
  get: () => api.get('/api/leaderboard'),
  getBreakdown: (username) => api.get(`/api/leaderboard/breakdown/${encodeURIComponent(username)}`),
}

// ─── Special Predictions ───────────────────────────────
export const specialPredictionsAPI = {
  predictTopScorer: (playerName, teamName) =>
    api.post('/api/predictions/top-scorer', { playerName, teamName }),
  predictGoldenBall: (playerName, teamName) =>
    api.post('/api/predictions/golden-ball', { playerName, teamName }),
  predictGoldenGlove: (playerName, teamName) =>
    api.post('/api/predictions/golden-glove', { playerName, teamName }),
  predictWorldCupWinner: (teamId) =>
    api.post(`/api/predictions/world-cup-winner?teamId=${teamId}`),
  predictMotm: (matchId, playerId) =>
    api.post(`/api/predictions/motm?matchId=${matchId}&playerId=${playerId}`),
}

// ─── Announcements ─────────────────────────────────────
export const announcementAPI = {
  get: () => api.get('/api/announcement'),
  set: (message) => api.post('/api/announcement', { message }),
  clear: () => api.delete('/api/announcement'),
}

// ─── Admin ─────────────────────────────────────────────
export const adminAPI = {
  submitMatchResult: (matchId, team1Score, team2Score) =>
    api.post('/api/admin/match-result', { matchId, team1Score, team2Score }),
  submitGoalScorers: (matchId, scorerPlayerIds, firstGoalScorerPlayerId) =>
    api.post('/api/admin/match-goal-scorers', { matchId, scorerPlayerIds, firstGoalScorerPlayerId }),
  pullAllResults: () =>
    api.post('/api/admin/pull-results'),
  pullSingleResult: (matchId) =>
    api.post(`/api/admin/pull-result/${matchId}`),
  awardTopScorer: (playerName) =>
    api.post(`/api/admin/award-top-scorer?playerName=${encodeURIComponent(playerName)}`),
  awardGoldenBall: (playerName) =>
    api.post(`/api/admin/award-golden-ball?playerName=${encodeURIComponent(playerName)}`),
  awardGoldenGlove: (playerName) =>
    api.post(`/api/admin/award-golden-glove?playerName=${encodeURIComponent(playerName)}`),
  awardWorldCupWinner: (teamId) =>
    api.post(`/api/admin/award-world-cup-winner?teamId=${teamId}`),
  submitMotm: (matchId, playerName) =>
    api.post(`/api/admin/submit-motm?matchId=${matchId}&playerName=${encodeURIComponent(playerName)}`),
  recalculateAllPoints: () =>
    api.post('/api/admin/recalculate-points'),
  getUserPredictions: (username) =>
    api.get(`/api/admin/user-predictions/${encodeURIComponent(username)}`),
  updatePredictionPoints: (type, predictionId, points) =>
    api.post(`/api/admin/update-prediction-points?type=${type}&predictionId=${predictionId}&points=${points}`),
  // Invite codes
  generateInviteCode: (label) =>
    api.post(`/api/admin/invite-codes/generate?label=${encodeURIComponent(label || '')}`),
  generateBulkInviteCodes: (count, labelPrefix) =>
    api.post(`/api/admin/invite-codes/generate-bulk?count=${count}&labelPrefix=${encodeURIComponent(labelPrefix || '')}`),
  getInviteCodes: () =>
    api.get('/api/admin/invite-codes'),
  deleteInviteCode: (id) =>
    api.delete(`/api/admin/invite-codes/${id}`),
  // Tournament lock settings
  getTournamentSettings: () =>
    api.get('/api/admin/tournament-settings'),
  setTournamentLockTime: (lockTime) =>
    api.post(`/api/admin/tournament-settings/set-lock-time?lockTime=${encodeURIComponent(lockTime)}`),
  lockTournamentPredictions: () =>
    api.post('/api/admin/tournament-settings/lock-now'),
  unlockTournamentPredictions: () =>
    api.post('/api/admin/tournament-settings/unlock'),
}

export default api
