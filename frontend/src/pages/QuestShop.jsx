import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  CheckCircle2,
  Clock,
  Sparkles,
  Flame,
  Zap,
  Trophy,
  ScrollText,
  ShoppingBag,
  Package,
  Heart,
  Snowflake,
  Shield,
  Layers,
  Award,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore, useQuestStore, useShopStore, useUIStore } from '../lib/store'
import { t } from '../lib/locale'
import { TactileButton } from '../components/ui/tactile-button'
import { GamifyBadge } from '../components/ui/gamify-badge'
import { QuestIcon } from '../components/ui/semantic-icon'

export default function QuestShop() {
  const location = useLocation()
  const initialTab = location.pathname.includes('/shop') ? 'shop' : 'quests'
  const [activeTab, setActiveTab] = useState(initialTab) // 'quests' | 'shop' | 'inventory'

  useEffect(() => {
    if (location.pathname.includes('/shop')) setActiveTab('shop')
    else if (location.pathname.includes('/quests')) setActiveTab('quests')
  }, [location.pathname])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8 font-sans">
      
      {/* ─── Top Header Banner ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-[0_4px_0_0_#E2E8F0]">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Nhiệm Vụ & Cửa Hàng
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Hoàn thành thử thách mỗi ngày, nhận Xu và trang bị vật phẩm hỗ trợ.
          </p>
        </div>
      </div>

      {/* ─── Segmented Navigation Switcher ────────────────────────────── */}
      <div className="grid grid-cols-3 p-1.5 bg-slate-200/70 rounded-2xl gap-1.5 border border-slate-200">
        <button
          onClick={() => setActiveTab('quests')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer select-none ${
            activeTab === 'quests'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ScrollText className="w-4 h-4" />
          <span>Nhiệm vụ</span>
        </button>

        <button
          onClick={() => setActiveTab('shop')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer select-none ${
            activeTab === 'shop'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Cửa hàng</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer select-none ${
            activeTab === 'inventory'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Túi đồ</span>
        </button>
      </div>

      {/* ─── Tab Content Panels ────────────────────────────────────────── */}
      <div>
        <AnimatePresence mode="wait">
          {activeTab === 'quests' && (
            <motion.div
              key="quests"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              <QuestsPanel />
            </motion.div>
          )}

          {activeTab === 'shop' && (
            <motion.div
              key="shop"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              <ShopPanel />
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              <InventoryPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUESTS PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function QuestsPanel() {
  const { user, fetchUser } = useAuthStore()
  const { quests, isLoading, fetchQuests, claimQuest } = useQuestStore()
  const { showToast } = useUIStore()
  const [claimingId, setClaimingId] = useState(null)
  const [claimingAll, setClaimingAll] = useState(false)

  useEffect(() => {
    fetchQuests()
  }, [])

  const claimable = quests.filter(q => q.is_complete && !q.coins_claimed)

  const handleClaim = async (uq) => {
    if (claimingId) return
    setClaimingId(uq.id)
    try {
      const res = await claimQuest(uq.id)
      await fetchUser()
      showToast(`+${res?.coins_awarded || uq.quest?.coin_reward || 10} Xu đã nhận!`, 'success')
    } catch (e) {
      showToast(e.message || 'Không thể nhận thưởng', 'error')
    } finally {
      setClaimingId(null)
    }
  }

  const handleClaimAll = async () => {
    if (claimingAll || claimable.length === 0) return
    setClaimingAll(true)
    let total = 0
    for (const uq of claimable) {
      try {
        const res = await claimQuest(uq.id)
        total += res.coins_awarded || uq.quest?.coin_reward || 10
      } catch (_) {}
    }
    await fetchUser()
    setClaimingAll(false)
    showToast(`+${total} Xu đã nhận thành công!`, 'success')
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold text-sm">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
        Đang tải danh sách nhiệm vụ...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* Action Strip */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-slate-900">
          Nhiệm vụ hoạt động ({quests.length})
        </h2>
        {claimable.length > 0 && (
          <TactileButton
            variant="amber"
            size="sm"
            onClick={handleClaimAll}
            disabled={claimingAll}
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            Nhận tất cả ({claimable.length})
          </TactileButton>
        )}
      </div>

      {/* Quests List */}
      <div className="space-y-4">
        {quests.map(uq => {
          const quest = uq.quest || {}
          const isComplete = uq.is_complete
          const isClaimed = uq.coins_claimed
          const pct = Math.min(100, Math.round((uq.progress / (quest.requirement_value || 1)) * 100))

          return (
            <div
              key={uq.id}
              className="bg-white border-2 border-slate-200 rounded-3xl p-5 sm:p-6 shadow-[0_4px_0_0_#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                  <QuestIcon quest={quest} className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <h3 className="font-extrabold text-base text-slate-900 truncate">
                    {quest.title}
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-xs h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isComplete ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-500 tabular-nums shrink-0">
                      {uq.progress} / {quest.requirement_value}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="flex items-center gap-1.5 text-amber-600 font-extrabold text-sm tabular-nums">
                  <Sparkles className="w-4 h-4 fill-amber-500" />
                  <span>+{quest.coin_reward} Xu</span>
                </div>

                {isComplete && !isClaimed ? (
                  <TactileButton
                    variant="amber"
                    size="sm"
                    onClick={() => handleClaim(uq)}
                    disabled={claimingId === uq.id}
                  >
                    {claimingId === uq.id ? 'Đang nhận...' : 'Nhận thưởng'}
                  </TactileButton>
                ) : isClaimed ? (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Đã nhận
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">
                    Đang làm ({pct}%)
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHOP PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function ShopPanel() {
  const { user, fetchUser } = useAuthStore()
  const { items, isLoading, fetchItems, buyItem } = useShopStore()
  const { showToast } = useUIStore()
  const [buyingId, setBuyingId] = useState(null)

  useEffect(() => {
    fetchItems()
  }, [])

  const handleBuy = async (item) => {
    if (buyingId) return
    setBuyingId(item.id)
    try {
      await buyItem(item.id)
      await fetchUser()
      showToast(`Mua thành công: ${item.name}!`, 'success')
    } catch (e) {
      showToast(e.message || 'Không đủ Xu hoặc lỗi hệ thống', 'error')
    } finally {
      setBuyingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold text-sm">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
        Đang tải cửa hàng...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(item => {
          const userCoins = user?.coins || 0
          const canAfford = userCoins >= item.price

          return (
            <div
              key={item.id}
              className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-[0_4px_0_0_#E2E8F0] flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-indigo-600">
                  {item.item_type === 'heart' ? (
                    <Heart className="w-7 h-7 fill-rose-500 text-rose-500" />
                  ) : item.item_type === 'streak_freeze' ? (
                    <Snowflake className="w-7 h-7 text-sky-500" />
                  ) : (
                    <Zap className="w-7 h-7 fill-amber-500 text-amber-500" />
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-slate-900">{item.name}</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 font-extrabold text-amber-600 text-sm tabular-nums">
                  <Sparkles className="w-4 h-4 fill-amber-500" />
                  <span>{item.price} Xu</span>
                </div>

                <TactileButton
                  variant={canAfford ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford || buyingId === item.id}
                >
                  {buyingId === item.id ? 'Đang mua...' : canAfford ? 'Mua ngay' : 'Không đủ xu'}
                </TactileButton>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTORY PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function InventoryPanel() {
  const { user, fetchUser } = useAuthStore()
  const { inventory, isLoading, fetchInventory, equipItem, unequipItem } = useShopStore()
  const { showToast } = useUIStore()
  const [actingId, setActingId] = useState(null)

  useEffect(() => {
    fetchInventory()
  }, [])

  const handleToggleEquip = async (inv) => {
    const item = inv.item
    if (!item) return
    setActingId(inv.id)
    try {
      const isEquipped = user?.equipped_items?.[item.item_type] === item.id
      if (isEquipped) {
        await unequipItem(item.item_type)
        showToast(`Đã tháo: ${item.name}`, 'info')
      } else {
        await equipItem(item.id)
        showToast(`Đã trang bị: ${item.name}`, 'success')
      }
      await fetchUser()
      await fetchInventory()
    } catch (e) {
      showToast(e.message || 'Lỗi trang bị vật phẩm', 'error')
    } finally {
      setActingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 font-bold text-sm">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
        Đang tải túi đồ...
      </div>
    )
  }

  if (!inventory || inventory.length === 0) {
    return (
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-12 text-center space-y-3">
        <Package className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="font-extrabold text-base text-slate-800">Túi đồ đang trống</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Bạn chưa sở hữu vật phẩm nào. Hãy ghé qua Cửa hàng để sắm thêm tim và khiên bảo vệ nhé!
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {inventory.map(inv => {
        const item = inv.item || {}
        const canEquip = item.item_type === 'avatar_frame'
        const isEquipped = user?.equipped_items?.[item.item_type] === item.id

        return (
          <div
            key={inv.id}
            className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-[0_4px_0_0_#E2E8F0] flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Package className="w-6 h-6" />
                </div>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 tabular-nums">
                  Số lượng: ×{inv.quantity}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-slate-900">{item.name}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>

            {canEquip && (
              <div className="pt-3 border-t border-slate-100">
                <TactileButton
                  variant={isEquipped ? 'danger' : 'success'}
                  size="sm"
                  onClick={() => handleToggleEquip(inv)}
                  disabled={actingId === inv.id}
                  className="w-full"
                >
                  {actingId === inv.id ? '...' : isEquipped ? 'Tháo khung' : 'Trang bị'}
                </TactileButton>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
