import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Compass, User, LogOut, ScrollText, Sparkles } from 'lucide-react'
import { useAuthStore, useUIStore, useQuestStore } from '../lib/store'
import Toast from './Toast'
import AnimatedOutlet from './AnimatedOutlet'
import { t } from '../lib/locale'
import { GamifyBadge } from './ui/gamify-badge'
import { TactileButton } from './ui/tactile-button'
import { REWARD_PATHS, REWARD_TAB_ROUTES } from '../lib/rewardNavigation'
import { BRAND } from '../lib/brand'

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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 h-16">
          
          {/* Left: TiaMath brand identity */}
          <Link to="/" className="flex items-center gap-2.5 group select-none shrink-0" aria-label={`${BRAND.name} - Trang chủ`}>
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs overflow-hidden shrink-0 transition-transform group-hover:scale-105">
              <img
                src={BRAND.logo}
                alt={BRAND.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xl font-extrabold tracking-tight leading-none text-slate-900 font-sans">
              Tia<span className="text-indigo-600">Math</span>
            </span>
          </Link>

          {/* Desktop Navigation (Center) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 shrink-0">
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = path === '/quests'
                ? REWARD_PATHS.includes(location.pathname)
                : location.pathname === path
              return (
                <Link
                  key={path}
                  to={path}
                  className={`relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all duration-150 select-none border ${
                    isActive
                      ? 'bg-white text-indigo-600 border-slate-200/90 shadow-xs'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600 stroke-[2.5]' : 'text-slate-400'}`} />
                  <span>{label}</span>
                  {path === '/quests' && claimableCount > 0 && (
                    <span className="w-5 h-5 bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center font-extrabold shrink-0 shadow-xs">
                      {claimableCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Right Section: Gamification Badges or Auth Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {user ? (
              <>
                {/* Gamification stat capsules */}
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <GamifyBadge type="streak" value={user.streak || user.current_streak || 0} />
                  <GamifyBadge type="xp" value={user.xp || 0} />
                  <GamifyBadge 
                    type="coins" 
                    value={user.coins || 0} 
                    onClick={() => navigate(REWARD_TAB_ROUTES.shop)}
                  />
                  <GamifyBadge type="hearts" value={user.hearts ?? 5} max={5} />
                </div>

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative h-9 w-9 rounded-full border border-slate-200 hover:border-indigo-400 transition-colors p-0.5 outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer shrink-0">
                      <Avatar className="h-full w-full">
                        <AvatarImage src={user.avatar_url} alt={user.display_name || user.username} />
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-xs">
                          {getInitials(user.display_name || user.username)}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 rounded-2xl p-1.5 border border-slate-200 bg-white" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal px-3 py-2">
                      <div className="flex flex-col space-y-0.5">
                        <p className="text-sm font-bold text-slate-900 leading-none">{user.display_name || user.username}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors">
                        <User className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                        <span>{t.layout?.dropdown?.profile || 'Hồ sơ cá nhân'}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleLogout} 
                      className="cursor-pointer rounded-xl font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 focus:text-rose-700 focus:bg-rose-50 flex items-center gap-2.5 px-3 py-2"
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
                  className="h-9 px-3 sm:px-4 text-xs sm:text-sm font-bold text-slate-700 hover:text-indigo-600"
                >
                  {t.layout?.auth?.login || 'Đăng nhập'}
                </TactileButton>
                <TactileButton 
                  variant="primary" 
                  size="sm" 
                  onClick={() => navigate('/register')}
                  className="h-9 px-3.5 sm:px-5 text-xs sm:text-sm font-extrabold"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                  <span>{t.layout?.auth?.register || 'Bắt đầu học'}</span>
                </TactileButton>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="flex-1 w-full pb-20 md:pb-6">
        <AnimatedOutlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 md:hidden">
        <div className="flex justify-around items-center h-15 px-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = path === '/quests'
              ? REWARD_PATHS.includes(location.pathname)
              : location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                className={`relative flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-[11px] font-bold transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
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
              className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-[11px] font-bold transition-colors ${
                location.pathname === '/profile' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <User className={`w-5 h-5 ${location.pathname === '/profile' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span>{t.layout?.nav?.profile || 'Hồ sơ'}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-[11px] font-bold transition-colors ${
                location.pathname === '/login' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <User className={`w-5 h-5 ${location.pathname === '/login' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
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
