import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { path: '/', icon: 'grid_view', label: 'Home' },
  { path: '/fixtures', icon: 'sports_soccer', label: 'Fixtures' },
  { path: '/predictions', icon: 'edit_note', label: 'Predictions' },
  { path: '/leaderboard', icon: 'leaderboard', label: 'Leaderboard' },
  { path: '/tournament-predictions', icon: 'emoji_events', label: 'Tournament' },
  { path: '/table-prediction', icon: 'table_chart', label: 'Table Prediction' },
  { path: '/rules', icon: 'info', label: 'Rules' },
]

const mobileNavItems = [
  { path: '/', icon: 'home', label: 'Home' },
  { path: '/predictions', icon: 'history', label: 'My Picks' },
  { path: '/fixtures', icon: 'add_circle', label: 'Predict', special: true },
  { path: '/leaderboard', icon: 'military_tech', label: 'Rank' },
  { path: '/rules', icon: 'info', label: 'Rules' },
]

export default function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Grid Background */}
      <div className="fixed inset-0 z-0 grid-bg opacity-20"></div>
      <div className="fixed inset-0 z-0 scanline opacity-30"></div>
      {/* Ambient glow blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[30%] h-[30%] rounded-full bg-primary/5 blur-[120px] animate-pulse-slow pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-secondary/5 blur-[120px] animate-pulse-slow pointer-events-none"></div>

      {/* Top Nav */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 border-b border-outline-variant bg-background/80 backdrop-blur-md shadow-[0_0_12px_rgba(255,45,120,0.1)]">
        <NavLink to="/" className="flex items-center gap-2 text-2xl font-headline font-bold text-primary drop-shadow-[0_0_8px_rgba(255,45,120,0.8)]">
          <img src="https://crests.football-data.org/wm26.png" alt="WC26" className="w-8 h-8 object-contain" />
          WC26 PREDICTOR
        </NavLink>
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `font-label text-sm uppercase tracking-wider transition-colors duration-300 ${
                  isActive
                    ? 'text-primary border-b-2 border-primary pb-1 font-bold'
                    : 'text-on-surface-variant hover:text-secondary'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `font-label text-sm uppercase tracking-wider transition-colors duration-300 ${
                  isActive
                    ? 'text-tertiary border-b-2 border-tertiary pb-1 font-bold'
                    : 'text-on-surface-variant hover:text-tertiary'
                }`
              }
            >
              Admin
            </NavLink>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <span className="font-label text-xs text-on-surface-variant hidden sm:block">
            {user?.username}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-1.5 rounded border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-all text-xs font-label"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </header>

      {/* Sidebar - Desktop */}
      <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] z-40 w-60 hidden lg:flex flex-col bg-surface-container border-r border-outline-variant">
        <div className="p-5">
          {/* User card */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center border border-primary/50 shadow-[0_0_10px_rgba(255,45,120,0.3)]">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
            </div>
            <div>
              <h2 className="font-headline font-bold text-sm text-on-surface leading-none">{user?.username}</h2>
              <p className="font-label text-[10px] text-secondary mt-1 tracking-tighter">{user?.role}</p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 font-label text-sm transition-all hover:translate-x-1 ${
                    isActive
                      ? 'bg-surface-container-highest text-secondary border-l-4 border-secondary'
                      : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
                  }`
                }
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 font-label text-sm transition-all hover:translate-x-1 ${
                    isActive
                      ? 'bg-surface-container-highest text-tertiary border-l-4 border-tertiary'
                      : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
                  }`
                }
              >
                <span className="material-symbols-outlined">admin_panel_settings</span>
                Admin
              </NavLink>
            )}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative z-10 pt-20 pb-24 lg:pb-8 lg:pl-64 px-4 sm:px-6 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Bottom Nav - Mobile */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-16 lg:hidden border-t border-outline-variant bg-background/95 backdrop-blur-lg shadow-[0_-4px_16px_rgba(0,255,204,0.1)]">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center transition-all ${
                item.special
                  ? 'text-secondary relative -top-3'
                  : isActive
                  ? 'text-secondary drop-shadow-[0_0_5px_rgba(0,255,204,0.8)]'
                  : 'text-on-surface-variant opacity-60'
              }`
            }
          >
            {item.special ? (
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-on-secondary shadow-[0_0_15px_rgba(0,255,204,0.5)] active:scale-110 transition-transform">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
              </div>
            ) : (
              <span className="material-symbols-outlined">{item.icon}</span>
            )}
            <span className="font-label text-[10px] uppercase tracking-wider mt-1">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
