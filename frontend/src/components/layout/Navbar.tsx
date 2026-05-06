import { motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { BookOpen, LayoutDashboard, Zap, MessageSquare, LogOut, User } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { path: '/dashboard', label: 'Accueil',   icon: LayoutDashboard },
  { path: '/learning',  label: 'Parcours',  icon: BookOpen },
  { path: '/quiz',      label: 'Quiz',      icon: Zap },
  { path: '/chat',      label: 'Agent IA',  icon: MessageSquare },
]

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, handleLogout } = useAuth()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800 text-lg">PathWise</span>
          </motion.div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname.startsWith(item.path)
              return (
                <motion.button
                  key={item.path}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </motion.button>
              )
            })}
          </div>

          {/* User + Logout */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/profile')}
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                location.pathname === '/profile'
                  ? 'bg-indigo-50 border-indigo-200'
                  : 'bg-slate-50 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="text-xs text-left">
                <p className="font-semibold text-slate-700">{user?.nom?.split(' ')[0]}</p>
                <p className="text-slate-400 capitalize">{user?.niveau}</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto">
          {[...navItems, { path: '/profile', label: 'Profil', icon: User }].map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}