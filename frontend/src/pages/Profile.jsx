import { useNavigate } from 'react-router-dom'
import { User, Settings, LogOut, Trophy, Flame, Star, X, ChevronRight, ChevronDown, Bell, Lock, Sparkles, KeyRound, Medal } from 'lucide-react'
import { useAuthStore, useShopStore } from '../lib/store'
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import api from '../lib/api'
import { t } from '../lib/locale'

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout, isAuthenticated, updateProfile, changePassword, fetchUser } = useAuthStore()

  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)

  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [notifications, setNotifications] = useState(true)
  const [saving, setSaving] = useState(false)

  // State cho đổi mật khẩu
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

  // Fetch fresh user data + achievements when profile page loads
  // Fetch fresh user data when profile page loads
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
      // SỬA TẠI ĐÂY: Dùng hàm của Store giống như file cũ của bạn
      await changePassword(passwordData.old_password, passwordData.new_password)

      alert("Đổi mật khẩu thành công!")
      setShowChangePassword(false)
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      // Hiển thị lỗi từ server trả về hoặc thông báo mặc định
      setPasswordError(err.message || "Mật khẩu cũ không chính xác");
    } finally {
      setSaving(false)
    }
  }

  const xp = user?.xp || 0
  const level = Math.floor(xp / 100) + 1
  const xpProgress = xp % 100

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-500">

      {/* ================= PROFILE HEADER ================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-[2px]">
        <div className="relative bg-white rounded-[22px] p-6 text-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-yellow-200/40 to-transparent rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-200/40 to-transparent rounded-full blur-xl" />

          <div className="relative inline-block mb-4">
            {(() => {
              let borderStyle = "bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-purple-500/25"
              if (equippedFrame) {
                const name = equippedFrame.name.toLowerCase()
                if (name.includes("gold")) borderStyle = "bg-[#FFC800] ring-4 ring-[#FFC800]/30 shadow-[#FFC800]/40"
                else if (name.includes("diamond")) borderStyle = "bg-[#1CB0F6] ring-4 ring-[#1CB0F6]/30 shadow-[#1CB0F6]/40"
                else borderStyle = "bg-[#CE82FF] ring-4 ring-[#CE82FF]/30 shadow-[#CE82FF]/40"
              }
              return (
                <div className={`w-28 h-28 rounded-full p-1 shadow-xl ${borderStyle}`}>
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                    <span className="text-4xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 bg-clip-text text-transparent">
                      {user?.display_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>
              )
            })()}
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Lv.{level}
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-800 mb-1">
            {user?.display_name || user?.username}
          </h1>
          <p className="text-slate-500 mb-4">@{user?.username}</p>

          <div className="max-w-xs mx-auto">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-medium">
              <span>Level {level}</span>
              <span>{xpProgress}/100 XP</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= TAB BAR ================= */}
      <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
        <button
          onClick={() => switchTab('overview')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'overview'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <Star className={
            activeTab === 'overview' ? 'w-4 h-4 text-yellow-500' : 'w-4 h-4 text-slate-400'
          } />
          {t.profile.overview}
        </button>
        <button
          onClick={() => switchTab('achievements')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'achievements'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <Medal className={
            activeTab === 'achievements' ? 'w-4 h-4 text-purple-500' : 'w-4 h-4 text-slate-400'
          } />
          {t.profile.achievements}
          {statsData && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'achievements' ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-500'
              }`}>
              {statsData.stats.achievements_earned}/{statsData.stats.total_achievements}
            </span>
          )}
        </button>
      </div>

      {/* ================= ANIMATED TAB PANELS ================= */}
      <div className="overflow-hidden">
        <AnimatePresence mode="wait" custom={tabDirection}>
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              custom={tabDirection}
              variants={{
                enter: (d) => ({ opacity: 0, x: d * 48 }),
                center: { opacity: 1, x: 0 },
                exit: (d) => ({ opacity: 0, x: d * -48 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="space-y-4">
                {/* Stat cards */}
                <div className="grid grid-cols-3 gap-3">
                  <StatCard icon={<Star className="w-6 h-6" />} value={xp} label="XP" color="yellow" />
                  <StatCard
                    icon={<Trophy className="w-6 h-6" />}
                    value={statsData ? `${statsData.stats.achievements_earned}/${statsData.stats.total_achievements}` : '—'}
                    label="Badges"
                    color="purple"
                  />
                  <StatCard
                    icon={<Flame className="w-6 h-6" />}
                    value={user?.current_streak || 0}
                    label="Streak"
                    color="orange"
                  />
                </div>

                {/* Menu */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <MenuItem
                    icon={<User className="w-5 h-5" />}
                    label="Chỉnh sửa hồ sơ"
                    desc="Cập nhật thông tin"
                    onClick={() => { setDisplayName(user?.display_name || ''); setShowEditProfile(true) }}
                  />
                  <MenuItem
                    icon={<Settings className="w-5 h-5" />}
                    label="Cài đặt"
                    desc="Thông báo & Bảo mật"
                    onClick={() => setShowSettings(true)}
                  />
                  <MenuItem
                    icon={<LogOut className="w-5 h-5" />}
                    label="Đăng xuất"
                    desc="Thoát tài khoản"
                    onClick={handleLogout}
                    danger
                    last
                  />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'achievements' && (
            <motion.div
              key="achievements"
              custom={tabDirection}
              variants={{
                enter: (d) => ({ opacity: 0, x: d * 48 }),
                center: { opacity: 1, x: 0 },
                exit: (d) => ({ opacity: 0, x: d * -48 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="space-y-4">
                {/* Overall progress bar */}
                {statsData && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-medium">
                      <span className="flex items-center gap-1">
                        <Medal className="w-3.5 h-3.5 text-purple-500" />
                        <span className="font-bold text-slate-700">Thành tích</span>
                      </span>
                      <span>
                        <span className="text-purple-600 font-bold">{statsData.stats.achievements_earned}</span>
                        /{statsData.stats.total_achievements} đã mở khoá
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full transition-all duration-700"
                        style={{ width: `${(statsData.stats.achievements_earned / statsData.stats.total_achievements) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Filter tabs */}
                <div className="flex gap-2">
                  {['all', 'earned', 'locked'].map(f => (
                    <button
                      key={f}
                      onClick={() => setAchFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${achFilter === f
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      {f === 'all' ? 'Tất cả' : f === 'earned' ? 'Đã đạt' : 'Chưa đạt'}
                    </button>
                  ))}
                </div>

                {/* Categorised achievement cards */}
                {loadingStats ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 animate-pulse h-20" />
                    ))}
                  </div>
                ) : statsData ? (
                  <AchievementCategories
                    achievements={statsData.achievements}
                    stats={statsData.stats}
                    filter={achFilter}
                  />
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ================= EDIT PROFILE MODAL ================= */}
      {showEditProfile && (
        <Modal title="Chỉnh sửa hồ sơ" onClose={() => setShowEditProfile(false)}>
          <div className="space-y-5">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full p-0.5">
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 bg-clip-text text-transparent">
                    {displayName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
            </div>
            <InputField label="Tên hiển thị" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Nhập tên của bạn" />
            <InputField label="Username" value={user?.username} disabled prefix="@" />
            <InputField label="Email" value={user?.email} disabled />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowEditProfile(false)} className="flex-1 py-3 px-4 rounded-xl border-2 border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Hủy
              </button>
              <button onClick={handleSaveProfile} disabled={saving} className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all disabled:opacity-70">
                {saving ? "Đang lưu..." : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= SETTINGS MODAL ================= */}
      {showSettings && (
        <Modal title="Cài đặt" onClose={() => setShowSettings(false)}>
          <div className="space-y-2">
            <SettingRow icon={<Bell className="w-5 h-5 text-orange-500" />} label="Thông báo" desc="Nhắc nhở học tập">
              <Toggle checked={notifications} onChange={() => setNotifications(!notifications)} />
            </SettingRow>

            <div className="pt-3">
              <button
                onClick={() => { setShowSettings(false); setShowChangePassword(true); }}
                className="w-full py-3 px-4 rounded-xl border-2 border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Đổi mật khẩu
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= CHANGE PASSWORD MODAL ================= */}
      {showChangePassword && (
        <Modal title="Đổi mật khẩu" onClose={() => setShowChangePassword(false)}>
          <div className="space-y-4">
            <div className="flex justify-center mb-2">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                <KeyRound className="w-8 h-8" />
              </div>
            </div>

            {passwordError && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-500 text-sm rounded-xl text-center font-medium">
                {passwordError}
              </div>
            )}

            <InputField
              label="Mật khẩu hiện tại"
              type="password"
              value={passwordData.old_password}
              onChange={e => setPasswordData({ ...passwordData, old_password: e.target.value })}
              placeholder="••••••••"
            />
            <InputField
              label="Mật khẩu mới"
              type="password"
              value={passwordData.new_password}
              onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
              placeholder="Tối thiểu 6 ký tự"
            />
            <InputField
              label="Xác nhận mật khẩu mới"
              type="password"
              value={passwordData.confirm_password}
              onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
              placeholder="Nhập lại mật khẩu mới"
            />

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowChangePassword(false)}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleChangePassword}
                disabled={saving || !passwordData.old_password || !passwordData.new_password}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 text-white font-semibold shadow-lg hover:bg-slate-900 transition-all disabled:opacity-50"
              >
                {saving ? "Đang xử lý..." : "Cập nhật"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ================= COMPONENTS (Giữ nguyên các component bổ trợ cũ) ================= */
// ... (StatCard, MenuItem, InputField, Toggle, SettingRow, Modal giữ nguyên như code bạn cung cấp)

function StatCard({ icon, value, label, color }) {
  const colors = {
    orange: 'bg-orange-50 text-orange-500',
    yellow: 'bg-yellow-50 text-yellow-500',
    purple: 'bg-purple-50 text-purple-500',
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group text-center">
      <div className={`w-12 h-12 mx-auto ${colors[color]} rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="text-xl font-extrabold text-slate-800">{value}</div>
      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</div>
    </div>
  )
}

function MenuItem({ icon, label, desc, onClick, danger, last }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 transition-all group
        ${danger ? 'hover:bg-red-50 text-red-500' : 'hover:bg-slate-50 text-slate-700'}
        ${!last && 'border-b border-slate-100'}
      `}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors
        ${danger ? 'bg-red-100 group-hover:bg-red-200' : 'bg-slate-100 group-hover:bg-blue-100 group-hover:text-blue-500'}
      `}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <div className="font-semibold">{label}</div>
        <div className={`text-xs ${danger ? 'text-red-400' : 'text-slate-400'}`}>{desc}</div>
      </div>
      {!danger && <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />}
    </button>
  )
}

function InputField({ label, prefix, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{prefix}</span>}
        <input
          {...props}
          className={`w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-700 
            focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all
            disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
            ${prefix ? 'pl-8' : ''}
          `}
        />
      </div>
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button onClick={onChange} className={`relative w-12 h-7 rounded-full transition-colors duration-300 ${checked ? 'bg-blue-500' : 'bg-slate-200'}`}>
      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  )
}

function SettingRow({ icon, label, desc, children }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">{icon}</div>
      <div className="flex-1">
        <div className="font-semibold text-slate-700">{label}</div>
        <div className="text-xs text-slate-400">{desc}</div>
      </div>
      {children}
    </div>
  )
}

function Modal({ title, children, onClose }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setVisible(true) }, [])
  const handleClose = () => { setVisible(false); setTimeout(onClose, 200) }

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose}>
      <div className={`bg-white w-full max-w-md rounded-3xl p-6 relative shadow-2xl transition-all duration-300 ${visible ? 'translate-y-0 scale-100' : 'translate-y-8 sm:scale-95'}`} onClick={e => e.stopPropagation()}>
        <button onClick={handleClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-slate-500" />
        </button>
        <h2 className="text-xl font-bold text-slate-800 mb-6">{title}</h2>
        {children}
      </div>
    </div>
  )
}

// ─── Category meta ───────────────────────────────────────────────────────────
const ACH_CATEGORIES = [
  { key: 'xp', label: 'Kinh nghiệm', emoji: '⭐', statKey: 'total_xp', unit: 'XP', color: 'from-yellow-400 to-orange-400', bg: 'bg-yellow-50', border: 'border-yellow-100' },
  { key: 'progress', label: 'Bài học', emoji: '📚', statKey: 'completed_steps', unit: 'bài', color: 'from-blue-400 to-indigo-500', bg: 'bg-blue-50', border: 'border-blue-100' },
  { key: 'streak', label: 'Streak', emoji: '🔥', statKey: 'current_streak', unit: 'ngày', color: 'from-orange-400 to-rose-500', bg: 'bg-orange-50', border: 'border-orange-100' },
  { key: 'stories', label: 'Khoá học', emoji: '🎯', statKey: 'completed_stories', unit: 'khoá', color: 'from-green-400 to-emerald-500', bg: 'bg-green-50', border: 'border-green-100' },
]

const RARITY_STYLES = {
  common:    { bar: 'bg-slate-400',  chip: 'bg-slate-100 text-slate-500',   text: t.profile.rarityLabels.common },
  uncommon:  { bar: 'bg-green-400',  chip: 'bg-green-100 text-green-700',   text: t.profile.rarityLabels.uncommon },
  rare:      { bar: 'bg-blue-500',   chip: 'bg-blue-100 text-blue-700',     text: t.profile.rarityLabels.rare },
  epic:      { bar: 'bg-purple-500', chip: 'bg-purple-100 text-purple-700', text: t.profile.rarityLabels.epic },
  legendary: { bar: 'bg-yellow-500', chip: 'bg-yellow-100 text-yellow-700', text: t.profile.rarityLabels.legendary },
}

function AchievementCategories({ achievements, stats, filter }) {
  const [collapsed, setCollapsed] = useState({})

  const toggle = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="space-y-3">
      {ACH_CATEGORIES.map(cat => {
        const list = achievements.filter(a => {
          const catMatch = (a.category === cat.key) ||
            (cat.key === 'progress' && a.requirement_type === 'steps') ||
            (cat.key === 'xp' && a.requirement_type === 'xp') ||
            (cat.key === 'streak' && a.requirement_type === 'streak') ||
            (cat.key === 'stories' && a.requirement_type === 'stories')
          if (!catMatch) return false
          if (filter === 'earned') return a.is_earned
          if (filter === 'locked') return !a.is_earned
          return true
        })
        if (list.length === 0) return null
        const earnedCount = list.filter(a => a.is_earned).length
        const current = stats[cat.statKey] ?? 0
        const isOpen = !collapsed[cat.key]
        return (
          <div key={cat.key} className={`rounded-2xl border overflow-hidden ${cat.border} ${cat.bg}`}>
            {/* Collapsible category header */}
            <button
              onClick={() => toggle(cat.key)}
              className={`w-full flex items-center justify-between px-4 py-3 transition-colors hover:brightness-95 ${cat.bg}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{cat.emoji}</span>
                <span className="font-bold text-slate-700 text-sm">{cat.label}</span>
                <span className="text-xs font-bold text-slate-400">
                  <span className="text-slate-600">{earnedCount}</span>/{list.length}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
              />
            </button>

            {/* Achievement cards (collapsible) */}
            {isOpen && (
              <div className="bg-white border-t border-slate-100 divide-y divide-slate-50">
                {list.map(ach => (
                  <AchievementCard key={ach.id} achievement={ach} current={current} unit={cat.unit} gradientBar={cat.color} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function AchievementCard({ achievement, current, unit, gradientBar }) {
  const rarity = RARITY_STYLES[achievement.rarity] || RARITY_STYLES.common
  const earned = achievement.is_earned
  const req = achievement.requirement_value ?? 1
  const progress = req > 0 ? Math.min(current ?? 0, req) : 0
  const pct = req > 0 ? Math.min(Math.round(((current ?? 0) / req) * 100), 100) : 0

  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${earned ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/60'
      }`}>
      {/* Icon */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${earned ? 'bg-white shadow-sm border border-slate-100' : 'opacity-40 grayscale'
        }`}>
        {achievement.icon || '🏅'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`font-bold text-sm leading-tight ${earned ? 'text-slate-800' : 'text-slate-400'
            }`}>{achievement.title}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0 ${earned ? rarity.chip : 'bg-slate-100 text-slate-400'
            }`}>{rarity.text}</span>
        </div>
        <p className={`text-[11px] leading-snug mb-1.5 ${earned ? 'text-slate-500' : 'text-slate-400'
          }`}>{achievement.description}</p>
        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${earned ? gradientBar : 'bg-slate-300'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`text-[10px] font-bold flex-shrink-0 ${earned ? 'text-slate-500' : 'text-slate-400'
            }`}>
            {earned ? `✓ ${current}/${req} ${unit}` : `${progress}/${req} ${unit}`}
          </span>
        </div>
      </div>

      {/* XP reward */}
      <div className={`flex-shrink-0 text-center ${earned ? 'opacity-100' : 'opacity-40'}`}>
        <div className={`text-xs font-black ${earned ? 'text-yellow-500' : 'text-slate-400'}`}>+{achievement.xp_reward}</div>
        <div className="text-[9px] text-slate-400 font-bold">XP</div>
      </div>
    </div>
  )
}