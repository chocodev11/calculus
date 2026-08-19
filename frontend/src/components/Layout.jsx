import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Compass, User, Flame, Zap, Coins, Settings, LogOut, HelpCircle, Bell, ScrollText, Sparkles } from 'lucide-react'
import { useAuthStore, useUIStore, useQuestStore } from '../lib/store'
import Toast from './Toast'
import AnimatedOutlet from './AnimatedOutlet'
import { t } from '../lib/locale'
import { GamifyBadge } from './ui/gamify-badge'
import { TactileButton } from './ui/tactile-button'

// shadcn/ui components
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { toast } = useUIStore()
  const { quests, fetchQuests } = useQuestStore()
  const claimableCount = quests.filter(q => q.is_complete && !q.coins_claimed).length

  // Fetch quests on mount so badge count is accurate
  useEffect(() => {
    if (user) fetchQuests()
  }, [user])

  const navItems = [
    { path: '/', icon: Home, label: t.layout?.nav?.home || 'Trang chủ' },
    { path: '/explore', icon: Compass, label: t.layout?.nav?.explore || 'Khám phá' },
    ...(user ? [{ path: '/quests', icon: ScrollText, label: t.layout?.nav?.quests || 'Nhiệm vụ' }] : []),
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 h-16">
          
          {/* Left: Brand Identity with Mathematical Integral Icon */}
          <Link to="/" className="flex items-center gap-2.5 group select-none">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 border-b-2 border-indigo-800 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <span className="font-serif italic font-extrabold text-2xl leading-none">∫</span>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                Calculus<span className="text-indigo-600">.app</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation (Center) */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path
              return (
                <Link
                  key={path}
                  to={path}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150 select-none ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{label}</span>
                  {path === '/quests' && claimableCount > 0 && (
                    <span className="w-5 h-5 bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center font-extrabold shadow-sm animate-pulse">
                      {claimableCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Right Section: Gamification Badges or Auth Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {user ? (
              <>
                {/* Gamification stat capsules */}
                <div className="hidden sm:flex items-center gap-2">
                  <GamifyBadge type="streak" value={user.current_streak || 0} />
                  <GamifyBadge type="xp" value={user.xp || 0} />
                  <GamifyBadge 
                    type="coins" 
                    value={user.coins || 0} 
                    onClick={() => navigate('/shop')} 
                  />
                  <GamifyBadge type="hearts" value={user.hearts ?? 5} max={5} />
                </div>

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative h-10 w-10 rounded-full border-2 border-slate-200 hover:border-indigo-400 transition-colors p-0.5 outline-none focus:ring-2 focus:ring-indigo-300">
                      <Avatar className="h-full w-full">
                        <AvatarImage src={user.avatar_url} alt={user.display_name || user.username} />
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-sm">
                          {getInitials(user.display_name || user.username)}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 rounded-2xl p-1.5 shadow-lg border-slate-200" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal px-3 py-2">
                      <div className="flex flex-col space-y-0.5">
                        <p className="text-sm font-bold text-slate-900 leading-none">{user.display_name || user.username}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem asChild className="cursor-pointer rounded-xl font-medium">
                      <Link to="/profile" className="flex items-center gap-2.5 px-3 py-2 text-slate-700">
                        <User className="w-4 h-4 text-slate-400" />
                        <span>{t.layout?.dropdown?.profile || 'Hồ sơ cá nhân'}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer rounded-xl font-medium">
                      <Link to="/quests" className="flex items-center gap-2.5 px-3 py-2 text-slate-700">
                        <ScrollText className="w-4 h-4 text-slate-400" />
                        <span>{t.layout?.dropdown?.quests || 'Nhiệm vụ & Cửa hàng'}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem 
                      onClick={handleLogout} 
                      className="cursor-pointer rounded-xl font-medium text-rose-600 focus:text-rose-600 focus:bg-rose-50 flex items-center gap-2.5 px-3 py-2"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>{t.layout?.dropdown?.logout || 'Đăng xuất'}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <TactileButton 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => navigate('/login')}
                  className="h-8 sm:h-9 px-2.5 sm:px-3.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-indigo-600"
                >
                  {t.layout?.auth?.login || 'Đăng nhập'}
                </TactileButton>
                <TactileButton 
                  variant="primary" 
                  size="sm" 
                  onClick={() => navigate('/register')}
                  className="h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm font-extrabold shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 hidden sm:inline" />
                  <span className="hidden sm:inline">{t.layout?.auth?.register || 'Bắt đầu miễn phí'}</span>
                  <span className="sm:hidden">Đăng ký</span>
                </TactileButton>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="flex-1 w-full pb-20 md:pb-0">
        <AnimatedOutlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 md:hidden shadow-lg">
        <div className="flex justify-around items-center py-1.5 px-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                className={`relative flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl text-xs font-bold transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  {path === '/quests' && claimableCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-white text-[8px] rounded-full flex items-center justify-center font-extrabold">
                      {claimableCount}
                    </span>
                  )}
                </div>
                <span>{label}</span>
              </Link>
            )
          })}
          {user ? (
            <Link
              to="/profile"
              className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl text-xs font-bold transition-colors ${
                location.pathname === '/profile' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <User className={`w-5 h-5 ${location.pathname === '/profile' ? 'stroke-[2.5]' : ''}`} />
              <span>{t.layout?.nav?.profile || 'Hồ sơ'}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl text-xs font-bold transition-colors ${
                location.pathname === '/login' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <User className={`w-5 h-5 ${location.pathname === '/login' ? 'stroke-[2.5]' : ''}`} />
              <span>Đăng nhập</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Global Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
