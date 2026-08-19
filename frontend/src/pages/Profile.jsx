import { useNavigate } from 'react-router-dom'
import { User, Settings, LogOut, Trophy, Flame, Star, X, ChevronRight, Bell, Sparkles, KeyRound, Medal, CheckCircle2, Zap } from 'lucide-react'
import { useAuthStore, useShopStore } from '../lib/store'
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import api from '../lib/api'
import { t } from '../lib/locale'
import { TactileButton } from '../components/ui/tactile-button'
import { GamifyBadge } from '../components/ui/gamify-badge'

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout, isAuthenticated, updateProfile, changePassword, fetchUser } = useAuthStore()

  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)

  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [saving, setSaving] = useState(false)

  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [passwordError, setPasswordError] = useState('')

  // Achievements state
  const [statsData, setStatsData] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [achFilter, setAchFilter] = useState('all') // 'all' | 'earned' | 'locked'
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'achievements'
  const [tabDirection, setTabDirection] = useState(0)

  const TABS = ['overview', 'achievements']
  const switchTab = (tab) => {
    if (tab === activeTab) return
    setTabDirection(TABS.indexOf(tab) > TABS.indexOf(activeTab) ? 1 : -1)
    setActiveTab(tab)
  }

  const { items, fetchItems } = useShopStore()

  useEffect(() => {
    if (isAuthenticated()) {
      fetchUser()
      fetchStats()
      if (items.length === 0) fetchItems()
    }
  }, [])

  const fetchStats = async () => {
    setLoadingStats(true)
    try {
      const data = await api.get('/progress/stats')
      setStatsData(data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    } finally {
      setLoadingStats(false)
    }
  }

  if (!isAuthenticated()) {
    navigate('/login')
    return null
  }

  const equippedFrameId = user?.equipped_items?.avatar_frame
  const equippedFrame = items.find(i => i.id === equippedFrameId)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await updateProfile({ display_name: displayName })
      setShowEditProfile(false)
    } catch (err) {
      console.error(err)
      alert("Không thể cập nhật hồ sơ")
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    if (!passwordData.old_password || !passwordData.new_password) {
      setPasswordError('Vui lòng nhập đầy đủ thông tin')
      return
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('Mật khẩu xác nhận không khớp')
      return
    }

    setSaving(true)
    try {
      await changePassword(passwordData.old_password, passwordData.new_password)
      alert("Đổi mật khẩu thành công!")
      setShowChangePassword(false)
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      setPasswordError(err.message || "Mật khẩu cũ không chính xác")
    } finally {
      setSaving(false)
    }
  }

  const xp = user?.xp || 0
  const level = Math.floor(xp / 100) + 1
  const xpProgress = xp % 100

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 font-sans">
      
      {/* ─── Profile Header Card ───────────────────────────────────────── */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-[0_4px_0_0_#E2E8F0] relative overflow-hidden">
        
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          
          {/* Avatar Container with Frame */}
          <div className="relative shrink-0">
            {(() => {
              let borderStyle = "border-4 border-indigo-600 shadow-indigo-100"
              if (equippedFrame) {
                const name = equippedFrame.name.toLowerCase()
                if (name.includes("gold")) borderStyle = "border-4 border-amber-400 ring-4 ring-amber-100 shadow-amber-200"
                else if (name.includes("diamond")) borderStyle = "border-4 border-sky-400 ring-4 ring-sky-100 shadow-sky-200"
                else borderStyle = "border-4 border-purple-400 ring-4 ring-purple-100 shadow-purple-200"
              }
              return (
                <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 shadow-md bg-white ${borderStyle} flex items-center justify-center`}>
                  <div className="w-full h-full bg-indigo-50 rounded-full flex items-center justify-center">
                    <span className="text-3xl sm:text-4xl font-extrabold text-indigo-700">
                      {user?.display_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>
              )
            })()}

            <div className="absolute -bottom-1 -right-1 bg-amber-500 border-2 border-white text-white text-xs font-extrabold px-2.5 py-0.5 rounded-full shadow-sm">
              Cấp {level}
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">
                  {user?.display_name || user?.username}
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-slate-400">@{user?.username}</p>
              </div>

              <div className="flex items-center gap-2 justify-center sm:justify-end">
                <TactileButton variant="secondary" size="sm" onClick={() => setShowEditProfile(true)}>
                  Chỉnh sửa
                </TactileButton>
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 rounded-xl border-2 border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Level Progress Bar */}
            <div className="space-y-1.5 pt-2 max-w-md">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Tiến độ Cấp {level + 1}</span>
                <span className="text-indigo-600 tabular-nums">{xpProgress} / 100 XP</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 p-0.5 border border-slate-200 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ─── Tabs Segmented Switcher ───────────────────────────────────── */}
      <div className="grid grid-cols-2 p-1.5 bg-slate-200/70 rounded-2xl gap-1.5 border border-slate-200">
        <button
          onClick={() => switchTab('overview')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer select-none ${
            activeTab === 'overview'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Star className={`w-4 h-4 ${activeTab === 'overview' ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
          <span>Tổng quan thống kê</span>
        </button>

        <button
          onClick={() => switchTab('achievements')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer select-none ${
            activeTab === 'achievements'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Medal className={`w-4 h-4 ${activeTab === 'achievements' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span>Thành tựu ({statsData ? `${statsData.stats.achievements_earned}/${statsData.stats.total_achievements}` : '17'})</span>
        </button>
      </div>

      {/* ─── Animated Tab Content ──────────────────────────────────────── */}
      <div>
        <AnimatePresence mode="wait" custom={tabDirection}>
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Stat Cards 3-Column */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-[0_4px_0_0_#E2E8F0] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-amber-600">
                    <Zap className="w-6 h-6 fill-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{xp}</p>
                    <p className="text-xs font-bold text-slate-500">Tổng điểm XP</p>
                  </div>
                </div>

                <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-[0_4px_0_0_#E2E8F0] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-amber-600">
                    <Flame className="w-6 h-6 fill-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{user?.current_streak || 0}</p>
                    <p className="text-xs font-bold text-slate-500">Ngày chuỗi học</p>
                  </div>
                </div>

                <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-[0_4px_0_0_#E2E8F0] flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-indigo-600">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                      {statsData ? `${statsData.stats.achievements_earned}/${statsData.stats.total_achievements}` : '—'}
                    </p>
                    <p className="text-xs font-bold text-slate-500">Huy hiệu đạt được</p>
                  </div>
                </div>

              </div>

              {/* Account Quick Actions */}
              <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-[0_4px_0_0_#E2E8F0] divide-y divide-slate-100">
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="w-full py-4 flex items-center justify-between text-left hover:text-indigo-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <KeyRound className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-bold text-slate-800">Đổi mật khẩu</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full py-4 flex items-center justify-between text-left text-rose-600 hover:text-rose-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-5 h-5 text-rose-500" />
                    <span className="text-sm font-bold">Đăng xuất tài khoản</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400" />
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'achievements' && (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Filter Pills */}
              <div className="flex gap-2">
                {['all', 'earned', 'locked'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setAchFilter(filter)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold capitalize border transition-all ${
                      achFilter === filter
                        ? 'bg-indigo-600 text-white border-indigo-800'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {filter === 'all' ? 'Tất cả' : filter === 'earned' ? 'Đã đạt' : 'Chưa mở'}
                  </button>
                ))}
              </div>

              {/* Achievements Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(statsData?.achievements || []).filter(ach => {
                  if (achFilter === 'earned') return ach.earned
                  if (achFilter === 'locked') return !ach.earned
                  return true
                }).map(ach => (
                  <div
                    key={ach.id}
                    className={`bg-white border-2 rounded-2xl p-4 flex items-center gap-4 transition-all ${
                      ach.earned
                        ? 'border-amber-300 shadow-[0_4px_0_0_#FDE68A]'
                        : 'border-slate-200 opacity-60'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                      ach.earned ? 'bg-amber-100' : 'bg-slate-100 grayscale'
                    }`}>
                      {ach.icon || '🏅'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-extrabold text-sm text-slate-900 truncate">{ach.title}</p>
                        {ach.earned && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md">
                            Đạt được
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{ach.description}</p>
                      <p className="text-xs font-bold text-amber-600 mt-1 tabular-nums">+{ach.xp_reward} XP</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Modals: Edit Profile, Change Password ────────────────────── */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">Chỉnh sửa hồ sơ</h3>
              <button onClick={() => setShowEditProfile(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase">Họ và tên hiển thị</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full py-3 px-4 border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <TactileButton variant="secondary" onClick={() => setShowEditProfile(false)} className="flex-1">
                Hủy
              </TactileButton>
              <TactileButton variant="primary" onClick={handleSaveProfile} disabled={saving} className="flex-1">
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </TactileButton>
            </div>
          </div>
        </div>
      )}

      {showChangePassword && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900">Đổi mật khẩu</h3>
              <button onClick={() => setShowChangePassword(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">{passwordError}</p>
            )}

            <div className="space-y-3">
              <input
                type="password"
                placeholder="Mật khẩu hiện tại"
                value={passwordData.old_password}
                onChange={e => setPasswordData(d => ({ ...d, old_password: e.target.value }))}
                className="w-full py-3 px-4 border-2 border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-600"
              />
              <input
                type="password"
                placeholder="Mật khẩu mới"
                value={passwordData.new_password}
                onChange={e => setPasswordData(d => ({ ...d, new_password: e.target.value }))}
                className="w-full py-3 px-4 border-2 border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-600"
              />
              <input
                type="password"
                placeholder="Xác nhận mật khẩu mới"
                value={passwordData.confirm_password}
                onChange={e => setPasswordData(d => ({ ...d, confirm_password: e.target.value }))}
                className="w-full py-3 px-4 border-2 border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <TactileButton variant="secondary" onClick={() => setShowChangePassword(false)} className="flex-1">
                Hủy
              </TactileButton>
              <TactileButton variant="primary" onClick={handleChangePassword} disabled={saving} className="flex-1">
                {saving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </TactileButton>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}