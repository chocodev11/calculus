import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  X as XIcon, Check, Sparkles, RotateCcw, HelpCircle,
  Eye, Lightbulb, AlertTriangle, Info, GraduationCap,
  Copy, CheckCheck, Play, GripVertical, Trophy, Heart, Zap, ArrowRight, Medal
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../lib/api'
import { useAuthStore } from '../lib/store'
import { decodeStepId, encodeStepId, cn } from '../lib/utils'
import { materializeAssessmentPools } from '../lib/lessonScheme'
import 'katex/dist/katex.min.css'
import * as ReactKatexModule from 'react-katex'
import { TactileButton } from '../components/ui/tactile-button'
import { GamifyBadge } from '../components/ui/gamify-badge'
import { AchievementIcon } from '../components/ui/semantic-icon'
import InteractionSlide from '../components/interactions'
import { MathText } from '../components/interactions/MathText'
import soundFX from '../lib/soundEffects'
import { fireConfetti, fireLessonCompleteConfetti } from '../lib/confetti'

const ReactKatex = ReactKatexModule.default || ReactKatexModule
const { InlineMath, BlockMath } = ReactKatex

// ─── MAIN STEP LESSON COMPONENT ─────────────────────────────────────────────

export default function Step() {
  const { slug, encodedId } = useParams()
  const navigate = useNavigate()
  const id = decodeStepId(encodedId)
  const { user, updateUserStats, fetchUser } = useAuthStore()

  const [step, setStep] = useState(null)
  const [slides, setSlides] = useState([])
  const [loading, setLoading] = useState(true)
  const [story, setStory] = useState(null)
  const [allSteps, setAllSteps] = useState([])

  // Slide navigation
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [completedSlideIds, setCompletedSlideIds] = useState([])

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizSubmitted, setQuizSubmitted] = useState({})
  const [quizResults, setQuizResults] = useState({})
  const [totalXpEarned, setTotalXpEarned] = useState(0)

  const [showCompleteScreen, setShowCompleteScreen] = useState(false)
  const [showAchievementsScreen, setShowAchievementsScreen] = useState(false)
  const [newAchievements, setNewAchievements] = useState([])
  const [slideAchievements, setSlideAchievements] = useState([])

  // Explanation popup state
  const [showExplanation, setShowExplanation] = useState(false)
  const [currentExplanation, setCurrentExplanation] = useState('')

  // Track time spent
  const stepStartTimeRef = useRef(Date.now())
  const [localHearts, setLocalHearts] = useState(() => user?.hearts ?? 5)
  const [hasXpBoost, setHasXpBoost] = useState(false)

  useEffect(() => { loadData() }, [id, slug])

  const loadData = async () => {
    setLoading(true)
    try {
      const fullStory = await api.get(`/stories/${slug}`)
      setStory(fullStory)

      if (!fullStory.is_enrolled) {
        navigate(`/course/${slug}`)
        setLoading(false)
        return
      }

      const steps = []
      fullStory.chapters?.forEach(ch => {
        ch.steps?.forEach(s => steps.push({ ...s, chapter_id: ch.id }))
      })
      setAllSteps(steps)

      const [stepData, slidesData, invData] = await Promise.all([
        api.get(`/steps/${id}`),
        api.get(`/steps/${id}/slides`),
        api.get('/shop/inventory').catch(() => []),
      ])

      const boost = Array.isArray(invData) && invData.find(i => i.item?.item_type === 'xp_boost' && i.quantity > 0)
      setHasXpBoost(!!boost)

      setStep(stepData)
      setSlides(materializeAssessmentPools(slidesData))
      setCurrentSlideIndex(0)
      setQuizAnswers({})
      setQuizSubmitted({})
      setQuizResults({})
      setTotalXpEarned(0)
      setShowCompleteScreen(false)
      stepStartTimeRef.current = Date.now()
    } catch (e) {
      console.error('Error loading step:', e)
    } finally {
      setLoading(false)
    }
  }

  const currentSlide = slides[currentSlideIndex]
  const progress = slides.length > 0 ? (currentSlideIndex / slides.length) * 100 : 0
  const isLastSlide = currentSlideIndex === slides.length - 1

  const awardSlideXp = useCallback(async (slideId) => {
    if (!slideId) return
    if (completedSlideIds.includes(slideId)) return
    setCompletedSlideIds(prev => [...prev, slideId])
    try {
      const res = await api.post(`/steps/${id}/slides/${slideId}/complete`, {})
      if (res?.newly_earned_achievements?.length > 0) {
        setSlideAchievements(res.newly_earned_achievements)
      }
    } catch (e) {
      console.warn('Error recording slide completion', e)
    }
  }, [id, completedSlideIds])

  const goNext = useCallback(() => {
    if (currentSlideIndex < slides.length - 1) {
      try { awardSlideXp(currentSlide?.id) } catch (e) {}
      setCurrentSlideIndex(i => i + 1)
    }
  }, [currentSlideIndex, slides.length, awardSlideXp, currentSlide])

  const isInteractionSlide = useMemo(() => {
    const blocks = currentSlide?.blocks || []
    return blocks.some(b => (b.type || b.block_type) === 'interaction')
  }, [currentSlide])

  const currentQuizBlocks = useMemo(() => {
    if (!currentSlide?.blocks) return []
    return currentSlide.blocks.filter(b => (b.type || b.block_type) === 'quiz')
  }, [currentSlide])

  const isTrueFalseOnlySlide = currentQuizBlocks.length > 0 && currentQuizBlocks.every((block) => {
    const content = block.content || block.block_data || {}
    return (content.quiz_type || (content.items ? 'true_false_group' : 'multiple_choice')) === 'true_false_group'
  })

  const isQuizBlockSelected = useCallback((block) => {
    const content = block.content || block.block_data || {}
    const qType = content.quiz_type || (content.items ? 'true_false_group' : 'multiple_choice')
    const ans = quizAnswers[block.id]
    if (qType === 'true_false_group') {
      const items = content.items || []
      return items.length > 0 && typeof ans === 'object' && ans !== null && items.every(itm => ans[itm.id] !== undefined)
    }
    if (qType === 'short_answer' || qType === 'text_input') {
      return ans != null && String(ans).trim() !== ''
    }
    return ans != null
  }, [quizAnswers])

  const hasQuiz = currentQuizBlocks.length > 0
  const allQuizzesSelected = useMemo(() => {
    return currentQuizBlocks.length > 0 && currentQuizBlocks.every(b => isQuizBlockSelected(b))
  }, [currentQuizBlocks, isQuizBlockSelected])
  const allQuizzesAnswered = currentQuizBlocks.every(b => quizSubmitted[b.id])
  const allQuizzesCorrect = currentQuizBlocks.every(b => quizResults[b.id]?.correct)

  const handleQuizAnswer = (blockId, answer) => {
    soundFX.pop()
    setQuizAnswers(prev => ({ ...prev, [blockId]: answer }))
    if (quizSubmitted[blockId]) {
      setQuizSubmitted(prev => ({ ...prev, [blockId]: false }))
      setQuizResults(prev => {
        const copy = { ...prev }
        delete copy[blockId]
        return copy
      })
    }
  }

  const handleQuizSubmit = (blockId, isCorrect, explanation) => {
    const xp = isCorrect ? 15 : 0
    setQuizSubmitted(prev => ({ ...prev, [blockId]: true }))
    setQuizResults(prev => ({ ...prev, [blockId]: { correct: isCorrect, xp, explanation } }))
    
    if (isCorrect) {
      soundFX.success()
      fireConfetti({ particleCount: 35, origin: { x: 0.5, y: 0.7 } })
    } else {
      soundFX.error()
      setLocalHearts(h => Math.max(0, h - 1))
    }
  }

  const handleQuizRetry = (blockId, { preserveAnswer = false } = {}) => {
    setQuizSubmitted(prev => ({ ...prev, [blockId]: false }))
    if (!preserveAnswer) {
      setQuizAnswers(prev => ({ ...prev, [blockId]: null }))
    }
    setQuizResults(prev => {
      const copy = { ...prev }
      delete copy[blockId]
      return copy
    })
  }

  const handleComplete = () => {
    const correctCount = Object.values(quizResults).filter(r => r.correct).length
    const baseXp = (step?.xp_reward || 0) + correctCount * 15
    setTotalXpEarned(hasXpBoost ? baseXp * 2 : baseXp)
    soundFX.complete()
    fireLessonCompleteConfetti()
    setShowCompleteScreen(true)
  }

  const handleCompleteAndNavigate = async () => {
    try {
      const timeSpent = Math.round((Date.now() - stepStartTimeRef.current) / 1000)
      const quizEntries = Object.values(quizResults)
      const quizzesTotal = quizEntries.length
      const quizzesCorrect = quizEntries.filter(r => r.correct).length
      const result = await api.post(`/steps/${id}/complete`, {
        score: quizzesTotal > 0 ? Math.round((quizzesCorrect / quizzesTotal) * 100) : 100,
        time_spent_seconds: timeSpent,
        quizzes_correct: quizzesCorrect,
        quizzes_total: quizzesTotal,
      })

      if (result) {
        updateUserStats(result)
        if (result.hearts != null) setLocalHearts(result.hearts)
      }

      const unlocked = result?.newly_earned_achievements || []
      if (unlocked.length > 0) {
        setNewAchievements(unlocked)
        setShowAchievementsScreen(true)
        return
      }

      doNavigateNext()
    } catch {
      navigate(`/course/${slug}`)
    }
  }

  const doNavigateNext = () => {
    navigate(`/course/${slug}`)
    fetchUser().catch(() => {})
  }

  const handleQuit = () => {
    api.post(`/steps/${id}/quit`, {}).then(result => {
      if (result?.hearts != null) {
        setLocalHearts(result.hearts)
        updateUserStats({ hearts: result.hearts })
      }
    }).catch(() => {})
    navigate(`/course/${slug}`)
  }

  const handleFooterAction = () => {
    if (hasQuiz && !allQuizzesAnswered) {
      currentQuizBlocks.forEach(b => {
        if (!quizSubmitted[b.id] && isQuizBlockSelected(b)) {
          const content = b.content || b.block_data || {}
          const qType = content.quiz_type || (content.items ? 'true_false_group' : 'multiple_choice')
          const ans = quizAnswers[b.id]
          let isCorrect = false
          if (qType === 'true_false_group') {
            const items = content.items || []
            isCorrect = items.length > 0 && items.every(itm => {
              const expected = itm.correct === true || String(itm.correct).toLowerCase() === 'đúng' || String(itm.correct).toLowerCase() === 'true'
              const userVal = ans[itm.id] === true || String(ans[itm.id]).toLowerCase() === 'đúng' || String(ans[itm.id]).toLowerCase() === 'true'
              return expected === userVal
            })
          } else if (qType === 'short_answer' || qType === 'text_input') {
            const correctAnswers = content.correct_answers || [content.correct, content.expected].filter(Boolean)
            const cleanUser = String(ans).trim().toLowerCase()
            isCorrect = correctAnswers.some(c => String(c).trim().toLowerCase() === cleanUser)
          } else {
            isCorrect = String(ans) === String(content.correct)
          }
          handleQuizSubmit(b.id, isCorrect, content.explanation)
        }
      })
      return
    }
    if (hasQuiz && allQuizzesAnswered && isTrueFalseOnlySlide) {
      if (isLastSlide) {
        try { awardSlideXp(currentSlide?.id) } catch (e) {}
        handleComplete()
      } else {
        goNext()
      }
      return
    }
    if (hasQuiz && !allQuizzesCorrect) {
      currentQuizBlocks
        .filter(block => !quizResults[block.id]?.correct)
        .forEach(block => handleQuizRetry(block.id, { preserveAnswer: true }))
      return
    }
    if (isLastSlide) {
      try { awardSlideXp(currentSlide?.id) } catch (e) {}
      handleComplete()
    } else {
      goNext()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-bold text-sm">Đang tải bài học…</p>
        </div>
      </div>
    )
  }

  if (!step || slides.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="text-center bg-white border border-slate-200 rounded-3xl p-8 space-y-4 max-w-sm">
          <p className="text-slate-600 font-bold">Không tìm thấy nội dung cho bài học này.</p>
          <TactileButton variant="secondary" onClick={() => navigate(`/course/${slug}`)} className="w-full">
            Quay lại khoá học
          </TactileButton>
        </div>
      </div>
    )
  }

  // Achievement Popups & Screens
  const achievementPopup = slideAchievements.length > 0 ? (
    <AchievementUnlockedPopup
      achievements={slideAchievements}
      onClose={() => setSlideAchievements([])}
    />
  ) : null

  if (showAchievementsScreen) {
    return (
      <AchievementsScreen
        achievements={newAchievements}
        onContinue={() => {
          setNewAchievements([])
          setShowAchievementsScreen(false)
          doNavigateNext()
        }}
      />
    )
  }

  if (showCompleteScreen) {
    return (
      <CompleteScreen
        xpEarned={totalXpEarned || (step?.xp_reward || 10)}
        stepTitle={step?.title}
        onContinue={handleCompleteAndNavigate}
      />
    )
  }



  const handleWhyClick = () => {
    const explanations = currentQuizBlocks
      .map(b => (b.content || b.block_data || {}).explanation)
      .filter(Boolean)
    setCurrentExplanation(explanations.join('\n\n') || 'Không có giải thích chi tiết cho câu hỏi này.')
    setShowExplanation(true)
  }

  const quizIsAnswered = hasQuiz && allQuizzesAnswered
  const quizIsCorrect = quizIsAnswered && allQuizzesCorrect
  const quizIsIncorrect = quizIsAnswered && !allQuizzesCorrect
  const currentSlideXp = currentQuizBlocks.reduce((sum, b) => sum + (quizResults[b.id]?.xp || 0), 0)

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-white font-sans select-none">
      {achievementPopup}
      
      {/* ─── Top Header (10vh) ────────────────────────────────────────── */}
      <header className="h-[10vh] shrink-0 border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 bg-white relative z-20">
        
        {/* Exit Button */}
        <button
          onClick={handleQuit}
          className="p-2 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          title="Thoát bài học"
        >
          <XIcon className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Progress Bar */}
        <div className="w-1/2 max-w-md mx-4">
          <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <motion.div
              className="h-full bg-emerald-500 rounded-full"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Status Indicators (Hearts & Boosters) */}
        <div className="flex items-center gap-3">
          {hasXpBoost && (
            <span className="hidden sm:inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-extrabold px-2.5 py-1 rounded-xl border border-amber-200">
              <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              2x XP
            </span>
          )}
          <GamifyBadge type="hearts" value={localHearts} max={5} />
        </div>

      </header>

      {/* ─── Main Slide Content Body ─────────────────────────────────── */}
      <main className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
        {isInteractionSlide ? (
          // Full-bleed interactive math engine slide with scroll support
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlideIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full overflow-y-auto flex flex-col"
            >
              {(() => {
                const blocks = currentSlide?.blocks || []
                const interactionBlock = blocks.find(b => (b.type || b.block_type) === 'interaction')
                if (interactionBlock) {
                  const content = interactionBlock.content || interactionBlock.block_data || {}
                  return (
                    <div className="w-full max-w-4xl mx-auto my-auto p-3 sm:p-6">
                      <InteractionSlide
                        interactionType={content.interactionType}
                        lesson={content.lesson}
                      />
                    </div>
                  )
                }
                return null
              })()}
            </motion.div>
          </AnimatePresence>
        ) : (
          // Standard slide content (only scrolls when viewport is insufficient, vertically centered)
          <div className="h-full overflow-y-auto flex flex-col px-4 sm:px-8 py-4 sm:py-6">
            <div className="w-full max-w-2xl mx-auto my-auto space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlideIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="space-y-6"
                >
                  {currentSlide?.blocks?.map((block, blockIdx) => (
                    <BlockRenderer
                      key={block.id || `${currentSlideIndex}-${blockIdx}`}
                      block={block}
                      quizAnswer={quizAnswers[block.id]}
                      quizSubmitted={quizSubmitted[block.id]}
                      quizResult={quizResults[block.id]}
                      onQuizAnswer={(ans) => handleQuizAnswer(block.id, ans)}
                      onQuizSubmit={(correct, explanation) => handleQuizSubmit(block.id, correct, explanation)}
                      onQuizRetry={() => handleQuizRetry(block.id)}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* ─── Bottom Feedback Drawer (Duolingo-style) ─────────────────── */}
      <footer className={cn(
        'shrink-0 border-t-2 transition-colors duration-200 px-4 sm:px-6 py-3.5 pb-safe relative z-30',
        quizIsCorrect
          ? 'bg-emerald-50 border-emerald-300'
          : quizIsIncorrect
          ? 'bg-rose-50 border-rose-300'
          : 'bg-white border-slate-200'
      )}>
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          
          {quizIsAnswered ? (
            <>
              {/* Feedback Message */}
              <div className="flex items-center gap-3.5">
                <div className={cn(
                  'w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0',
                  quizIsCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                )}>
                  {quizIsCorrect ? (
                    <Check className="w-6 h-6 stroke-[3]" />
                  ) : (
                    <XIcon className="w-6 h-6 stroke-[3]" />
                  )}
                </div>
                <div>
                  <h4 className={cn('text-base font-extrabold', quizIsCorrect ? 'text-emerald-900' : 'text-rose-900')}>
                    {quizIsCorrect ? 'Chính xác! Xuất sắc lắm!' : 'Chưa hoàn toàn chính xác!'}
                  </h4>
                  <p className={cn('text-xs font-semibold', quizIsCorrect ? 'text-emerald-700' : 'text-rose-600')}>
                    {quizIsCorrect
                      ? `+${currentSlideXp || 15} XP Tích lũy`
                      : isTrueFalseOnlySlide
                      ? 'Xem đối chiếu đáp án chi tiết ở từng ý bên trên'
                      : 'Còn đáp án chưa đúng · bấm để thử lại hoặc xem lời giải'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <TactileButton
                  variant="secondary"
                  size="md"
                  onClick={handleWhyClick}
                  className="hidden sm:inline-flex"
                >
                  <HelpCircle className="w-4 h-4 mr-1.5 text-slate-500" />
                  Xem lời giải
                </TactileButton>

                <TactileButton
                  variant={quizIsCorrect ? 'success' : 'danger'}
                  size="lg"
                  onClick={handleFooterAction}
                  className="min-w-[140px]"
                >
                  {quizIsIncorrect && !isTrueFalseOnlySlide ? 'Sửa câu sai' : isLastSlide ? 'Hoàn thành' : 'Tiếp tục'}
                  {quizIsIncorrect && !isTrueFalseOnlySlide
                    ? <RotateCcw className="w-5 h-5 ml-1.5" />
                    : <ArrowRight className="w-5 h-5 ml-1.5" />}
                </TactileButton>
              </div>
            </>
          ) : (
            <>
              <div className="text-xs font-semibold text-slate-400 hidden sm:block">
                {hasQuiz ? 'Chọn câu trả lời và nhấn kiểm tra' : 'Đọc và tiếp tục bài học'}
              </div>

              <div className="ml-auto w-full sm:w-auto">
                <TactileButton
                  variant={hasQuiz ? 'primary' : 'primary'}
                  size="lg"
                  onClick={handleFooterAction}
                  disabled={hasQuiz && !allQuizzesSelected}
                  className="w-full sm:w-auto min-w-[160px]"
                >
                  {hasQuiz && !allQuizzesAnswered ? (
                    'Kiểm tra đáp án'
                  ) : isLastSlide ? (
                    'Hoàn thành bài học'
                  ) : (
                    'Tiếp tục'
                  )}
                  <ArrowRight className="w-5 h-5 ml-1.5" />
                </TactileButton>
              </div>
            </>
          )}

        </div>
      </footer>

      {/* ─── Explanation Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showExplanation && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
            onClick={() => setShowExplanation(false)}
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full overflow-hidden"
            >
              <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-800">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                  <h3 className="font-extrabold text-base">Giải thích chi tiết</h3>
                </div>
                <button
                  onClick={() => setShowExplanation(false)}
                  className="p-1 rounded-xl hover:bg-amber-100 text-amber-600 transition-colors"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto text-slate-700 leading-relaxed text-sm font-medium">
                <MathText text={currentExplanation} />
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                <TactileButton variant="primary" size="md" onClick={() => setShowExplanation(false)} className="w-full">
                  Đã hiểu!
                </TactileButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// BLOCK RENDERERS
// ═══════════════════════════════════════════════════════════════════════════════

function BlockRenderer({ block, quizAnswer, quizSubmitted, quizResult, onQuizAnswer, onQuizSubmit, onQuizRetry }) {
  const type = block.type || block.block_type

  switch (type) {
    case 'text': return <TextBlock block={block} />
    case 'math': return <MathBlock block={block} />
    case 'image': return <ImageBlock block={block} />
    case 'quiz': return (
      <QuizBlock
        block={block}
        answer={quizAnswer}
        submitted={quizSubmitted}
        result={quizResult}
        onAnswer={onQuizAnswer}
        onSubmit={onQuizSubmit}
        onRetry={onQuizRetry}
      />
    )
    case 'code': return <CodeBlock block={block} />
    case 'callout': return <CalloutBlock block={block} />
    case 'reveal': return <RevealBlock block={block} />
    case 'video': return <VideoBlock block={block} />
    case 'fill_blank': return <FillBlankBlock block={block} />
    case 'ordering': return <OrderingBlock block={block} />
    case 'interaction': return <InteractionBlock block={block} />
    default:
      return <div className="text-slate-400 text-xs italic">Nội dung không hỗ trợ: {type}</div>
  }
}

function InteractionBlock({ block }) {
  const content = block.content || block.block_data || {}
  const isCanvas = ['A', 'B', 'C', 'E'].includes(content.interactionType)

  return (
    <div className={`my-6 rounded-3xl overflow-hidden border border-slate-200 bg-white flex flex-col ${
      isCanvas ? 'h-[520px]' : 'min-h-[560px] h-auto'
    }`}>
      <InteractionSlide
        interactionType={content.interactionType}
        lesson={content.lesson}
      />
    </div>
  )
}

function TextBlock({ block }) {
  const content = block.content || block.block_data || {}

  return (
    <div className="space-y-3">
      {content.heading && (
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
          <MathText text={content.heading} />
        </h2>
      )}
      {content.paragraphs?.map((p, idx) => (
        <p key={idx} className="text-base text-slate-700 leading-relaxed font-medium">
          <MathText text={p} />
        </p>
      ))}
      {content.content && (
        <div className="text-base text-slate-700 leading-relaxed font-medium">
          <MathText text={content.content} />
        </div>
      )}
    </div>
  )
}



function MathBlock({ block }) {
  const content = block.content || block.block_data || {}
  const latex = content.latex || ''
  const label = content.label
  const isInline = content.display_mode === 'inline'

  try {
    return (
      <div className="my-5">
        {label && (
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
            {label}
          </p>
        )}
        <div className={cn(
          'bg-slate-50 rounded-2xl border border-slate-200 px-6 py-5 text-slate-900',
          isInline && 'inline-block bg-transparent border-0 p-0 shadow-none'
        )}>
          {isInline ? (
            <InlineMath math={latex} />
          ) : (
            <div className="text-center overflow-x-auto text-lg py-1">
              <BlockMath math={latex} />
            </div>
          )}
        </div>
      </div>
    )
  } catch {
    return (
      <div className="bg-rose-50 text-rose-600 rounded-xl p-3 text-xs font-mono border border-rose-200">
        Lỗi render LaTeX: {latex}
      </div>
    )
  }
}

function ImageBlock({ block }) {
  const content = block.content || block.block_data || {}
  const [loaded, setLoaded] = useState(false)

  return (
    <figure className="my-6">
      <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-100">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}
        <img
          src={content.src}
          alt={content.alt || ''}
          onLoad={() => setLoaded(true)}
          className={cn(
            'w-full transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      </div>
      {content.caption && (
        <figcaption className="mt-2 text-center text-xs text-slate-400 font-semibold italic">
          <MathText text={content.caption} />
        </figcaption>
      )}
    </figure>
  )
}

function CodeBlock({ block }) {
  const content = block.content || block.block_data || {}
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content.code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-4 rounded-2xl overflow-hidden border-2 border-slate-800 bg-[#0F172A] text-white">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1E293B] border-b border-slate-700">
        <span className="text-xs font-mono text-slate-400">{content.language || 'python'}</span>
        <button
          onClick={handleCopy}
          className="text-slate-400 hover:text-white transition p-1 rounded-lg"
        >
          {copied ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed text-emerald-300">
        <code>{content.code}</code>
      </pre>
    </div>
  )
}

function QuizBlock({ block, answer, submitted, result, onAnswer }) {
  const content = block.content || block.block_data || {}
  const question = content.question || ''
  const qType = content.quiz_type || (content.items ? 'true_false_group' : 'multiple_choice')

  // ─── Dạng II: Đúng / Sai 4 ý (GDPT 2018 Standard) ─────────────────────────
  if (qType === 'true_false_group' || content.items) {
    const items = content.items || []
    const currentMap = typeof answer === 'object' && answer !== null ? answer : {}

    const handleSelect = (itemId, choiceVal) => {
      if (submitted) return
      // If clicking the current selection, toggle off or switch
      const nextVal = currentMap[itemId] === choiceVal ? undefined : choiceVal
      onAnswer({ ...currentMap, [itemId]: nextVal })
    }

    return (
      <div className="space-y-5">
        {/* Header Badge & Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-extrabold rounded-xl uppercase tracking-wider border border-indigo-200">
            <Sparkles className="w-3.5 h-3.5 fill-indigo-500 text-indigo-500" />
            <span>Dạng II · Trắc nghiệm Đúng / Sai 4 ý</span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
            <MathText text={question} />
          </p>
          <p className="text-xs sm:text-sm font-semibold text-slate-500">
            Chọn <strong className="text-emerald-700 font-extrabold">Đúng</strong> hoặc <strong className="text-rose-700 font-extrabold">Sai</strong> cho từng khẳng định bên dưới:
          </p>
        </div>

        {/* List of Statements */}
        <div className="space-y-3">
          {items.map((item, idx) => {
            const itemKey = item.id || `item_${idx}`
            const selectedVal = currentMap[itemKey]
            const isItemSubmitted = Boolean(submitted && result)
            const expected = item.correct === true || String(item.correct).toLowerCase() === 'đúng' || String(item.correct).toLowerCase() === 'true'
            const isItemCorrect = isItemSubmitted && selectedVal === expected
            const isItemIncorrect = isItemSubmitted && selectedVal !== expected

            return (
              <div
                key={itemKey}
                className={cn(
                  'rounded-3xl border-2 p-4 sm:p-5 transition-all bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                  isItemSubmitted
                    ? isItemCorrect
                      ? 'border-emerald-400 bg-emerald-50/40'
                      : 'border-rose-400 bg-rose-50/40'
                    : selectedVal !== undefined
                    ? 'border-indigo-300 bg-indigo-50/20'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                {/* Statement with Letter Badge */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className={cn(
                    'w-8 h-8 rounded-2xl font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 border transition-colors',
                    isItemSubmitted
                      ? isItemCorrect
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-rose-600 text-white border-rose-700'
                      : selectedVal !== undefined
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  )}>
                    {String.fromCharCode(97 + idx)}
                  </span>
                  <div className="text-sm sm:text-base font-bold text-slate-800 leading-relaxed pt-0.5">
                    <MathText text={item.label || item.text || item.statement || ''} />
                  </div>
                </div>

                {/* Dual Tactile 2.5D Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleSelect(itemKey, true)}
                    disabled={submitted}
                    aria-pressed={selectedVal === true}
                    className={cn(
                      'px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer select-none min-h-[38px] transition-all',
                      selectedVal === true
                        ? 'btn-tactile-success'
                        : 'btn-tactile-secondary',
                      submitted && 'cursor-default pointer-events-none opacity-85'
                    )}
                  >
                    <Check className={cn('w-4 h-4 stroke-[3]', selectedVal === true ? 'text-white' : 'text-emerald-600')} />
                    <span>Đúng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelect(itemKey, false)}
                    disabled={submitted}
                    aria-pressed={selectedVal === false}
                    className={cn(
                      'px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer select-none min-h-[38px] transition-all',
                      selectedVal === false
                        ? 'btn-tactile-danger'
                        : 'btn-tactile-secondary',
                      submitted && 'cursor-default pointer-events-none opacity-85'
                    )}
                  >
                    <XIcon className={cn('w-4 h-4 stroke-[3]', selectedVal === false ? 'text-white' : 'text-rose-600')} />
                    <span>Sai</span>
                  </button>

                  {/* Submission Feedback Tag */}
                  {isItemSubmitted && (
                    <div className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-black border-2 shrink-0 ml-1',
                      isItemCorrect
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-rose-50 border-rose-300 text-rose-800'
                    )}>
                      {isItemCorrect ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3] text-emerald-600" />
                          <span>Chính xác</span>
                        </>
                      ) : (
                        <>
                          <XIcon className="w-4 h-4 stroke-[3] text-rose-600" />
                          <span>Đáp án: {expected ? 'Đúng' : 'Sai'}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── Dạng III: Trả lời ngắn / Điền đáp số ───────────────────────────────
  if (qType === 'short_answer' || qType === 'text_input') {
    const inputVal = answer ?? ''
    const isCorrect = result?.correct
    const correctVal = content.correct ?? (content.correct_answers ? content.correct_answers[0] : '')

    return (
      <div className="space-y-6 max-w-lg mx-auto">
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 text-xs font-extrabold rounded-xl uppercase tracking-wider border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>Dạng III · Điền đáp số / Trả lời ngắn</span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
            <MathText text={question} />
          </p>
        </div>

        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 space-y-4">
          <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
            Nhập kết quả hoặc số nguyên:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={String(inputVal)}
              onChange={(e) => !submitted && onAnswer(e.target.value)}
              disabled={submitted}
              placeholder="Nhập đáp số vào đây…"
              className={cn(
                'w-full py-3.5 px-4 rounded-2xl border-2 font-bold text-lg text-center outline-none transition-all',
                submitted
                  ? isCorrect
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                    : 'border-rose-500 bg-rose-50 text-rose-900'
                  : 'border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 bg-slate-50 focus:bg-white text-slate-900'
              )}
            />
          </div>

          {submitted && (
            <div className={cn(
              'p-4 rounded-2xl border-2 flex items-center justify-between text-xs sm:text-sm font-bold',
              isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'
            )}>
              <span>{isCorrect ? 'Chính xác!' : 'Chưa đúng. Hãy xem lại kết quả.'}</span>
              {isCorrect && (
                <span className="font-extrabold px-3 py-1 rounded-xl bg-white border border-emerald-200 text-emerald-800">
                  <MathText text={String(correctVal)} />
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Dạng I: Trắc nghiệm 4 lựa chọn (A, B, C, D) ───────────────────────
  const options = content.options || []
  const correctAnswer = content.correct

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-extrabold rounded-xl uppercase tracking-wider border border-indigo-200">
          <Sparkles className="w-3.5 h-3.5 fill-indigo-500 text-indigo-500" />
          <span>Dạng I · Trắc nghiệm 4 lựa chọn</span>
        </div>
        <p className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
          <MathText text={question} />
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {options.map((opt, idx) => {
          const optValue = opt.value ?? opt.id ?? idx
          const optLabel = opt.label || opt.text || (typeof opt === 'string' ? opt : String(opt))
          const isSelected = answer === optValue
          const showCorrectMark = submitted && result?.correct && String(optValue) === String(correctAnswer)
          const showWrongMark = submitted && result && !result.correct && isSelected

          return (
            <motion.button
              key={optValue}
              onClick={() => !submitted && onAnswer(optValue)}
              disabled={submitted}
              whileHover={!submitted ? { scale: 1.01 } : {}}
              whileTap={!submitted ? { scale: 0.99 } : {}}
              className={cn(
                'relative w-full min-h-[72px] sm:min-h-[84px] rounded-2xl border-2 flex flex-col items-start justify-center p-3.5 sm:p-5 cursor-pointer text-left transition-colors',
                showCorrectMark
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                  : showWrongMark
                  ? 'bg-rose-50 border-rose-500 text-rose-900'
                  : isSelected
                  ? 'bg-indigo-50/80 border-indigo-600 text-indigo-950'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-300'
              )}
            >
              {/* Option Letter Chip */}
              <span className={cn(
                'text-xs font-extrabold mb-1 px-2.5 py-0.5 rounded-lg border transition-colors',
                showCorrectMark ? 'bg-emerald-200 border-emerald-300 text-emerald-900' :
                showWrongMark ? 'bg-rose-200 border-rose-300 text-rose-900' :
                isSelected ? 'bg-indigo-600 border-indigo-700 text-white' :
                'bg-slate-100 border-slate-200 text-slate-600'
              )}>
                {String.fromCharCode(65 + idx)}
              </span>

              {/* Option Text */}
              <span className="text-sm sm:text-base font-bold leading-snug">
                <MathText text={typeof optLabel === 'string' ? optLabel : String(optLabel)} />
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

const calloutConfig = {
  info: { icon: Info, bg: 'bg-sky-50', border: 'border-sky-200', iconColor: 'text-sky-600', iconBg: 'bg-sky-100 border-sky-200', title: 'Thông tin' },
  tip: { icon: Lightbulb, bg: 'bg-amber-50', border: 'border-amber-200', iconColor: 'text-amber-600', iconBg: 'bg-amber-100 border-amber-200', title: 'Mẹo học tập' },
  warning: { icon: AlertTriangle, bg: 'bg-orange-50', border: 'border-orange-200', iconColor: 'text-orange-600', iconBg: 'bg-orange-100 border-orange-200', title: 'Lưu ý' },
  theorem: { icon: GraduationCap, bg: 'bg-indigo-50', border: 'border-indigo-200', iconColor: 'text-indigo-600', iconBg: 'bg-indigo-100 border-indigo-200', title: 'Định lý' },
}

function CalloutBlock({ block }) {
  const content = block.content || block.block_data || {}
  const variant = content.variant || content.callout_type || 'info'
  const cfg = calloutConfig[variant] || calloutConfig.info
  const Icon = cfg.icon

  return (
    <div className={cn('my-6 rounded-3xl border-2 p-6', cfg.bg, cfg.border)}>
      <div className="flex items-start gap-4">
        <div className={cn('p-2.5 rounded-2xl border shrink-0', cfg.iconBg)}>
          <Icon className={cn('w-6 h-6', cfg.iconColor)} />
        </div>
        <div className="space-y-2 min-w-0 flex-1">
          <p className={cn('text-xs font-extrabold uppercase tracking-wider', cfg.iconColor)}>
            <MathText text={content.title || cfg.title} />
          </p>
          {content.body && (
            <div className="text-sm sm:text-base text-slate-800 font-medium leading-relaxed">
              <MathText text={content.body} />
            </div>
          )}
          {content.content && (
            <div className="text-sm sm:text-base text-slate-800 font-medium leading-relaxed">
              <MathText text={content.content} />
            </div>
          )}
          {content.latex && (
            <div className="mt-3 p-3 bg-white/80 rounded-2xl border border-slate-200 overflow-x-auto">
              <BlockMath math={content.latex} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RevealBlock({ block }) {
  const content = block.content || block.block_data || {}
  const steps = content.steps || content.items || []
  const [revealedCount, setRevealedCount] = useState(0)

  return (
    <div className="my-6 rounded-3xl border-2 border-slate-200 bg-white overflow-hidden">
      <div className="px-6 py-4 bg-slate-50 border-b-2 border-slate-200 flex items-center justify-between">
        <span className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Eye className="w-4 h-4 text-indigo-600" />
          {content.title || 'Hướng dẫn giải từng bước'}
        </span>
        <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg tabular-nums">
          {revealedCount}/{steps.length} bước
        </span>
      </div>
      <div className="p-6 space-y-4">
        {steps.map((s, idx) => {
          const isRevealed = idx < revealedCount
          const stepText = typeof s === 'string' ? s : (s.content || s.text || '')
          return (
            <div key={idx} className={cn('flex items-start gap-3 transition-all duration-200', isRevealed ? 'opacity-100 translate-y-0' : 'opacity-30')}>
              <span className={cn(
                'w-7 h-7 rounded-xl text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5 border',
                isRevealed ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              )}>
                {idx + 1}
              </span>
              <div className="text-sm sm:text-base text-slate-800 font-medium leading-relaxed min-w-0 pt-0.5">
                {isRevealed ? <MathText text={stepText} /> : <span className="text-slate-300 font-bold tracking-widest">• • •</span>}
              </div>
            </div>
          )
        })}

        <div className="pt-2">
          {revealedCount < steps.length ? (
            <TactileButton
              variant="secondary"
              size="sm"
              onClick={() => setRevealedCount(prev => prev + 1)}
              className="w-full"
            >
              <Eye className="w-4 h-4 mr-1.5" /> Hiển thị bước tiếp theo
            </TactileButton>
          ) : (
            <TactileButton
              variant="ghost"
              size="sm"
              onClick={() => setRevealedCount(0)}
              className="w-full text-slate-400"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" /> Thu gọn
            </TactileButton>
          )}
        </div>
      </div>
    </div>
  )
}

function VideoBlock({ block }) {
  const content = block.content || block.block_data || {}
  return (
    <div className="my-6 rounded-3xl overflow-hidden border-2 border-slate-800 bg-black aspect-video">
      <video src={content.src} controls className="w-full h-full" poster={content.poster} />
    </div>
  )
}

function FillBlankBlock({ block }) {
  const content = block.content || block.block_data || {}
  return (
    <div className="my-6 p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl space-y-3">
      <div className="flex items-center gap-2 text-indigo-700 text-xs font-extrabold uppercase tracking-wider">
        <Sparkles className="w-3.5 h-3.5" />
        <span>{content.prompt || 'Điền vào chỗ trống:'}</span>
      </div>
      <div className="text-base text-slate-900 font-bold leading-relaxed bg-white p-4 rounded-2xl border border-slate-200">
        <MathText text={content.template || ''} />
      </div>
    </div>
  )
}

function OrderingBlock({ block }) {
  const content = block.content || block.block_data || {}
  const items = content.items || []
  return (
    <div className="my-6 p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl space-y-4">
      <div className="flex items-center gap-2 text-indigo-700 text-xs font-extrabold uppercase tracking-wider">
        <GripVertical className="w-4 h-4" />
        <span>{content.prompt || 'Sắp xếp theo thứ tự đúng:'}</span>
      </div>
      <div className="space-y-2.5">
        {items.map((item, idx) => (
          <div key={idx} className="p-4 bg-white border-2 border-slate-200 rounded-2xl text-sm sm:text-base font-bold text-slate-800 flex items-center gap-3">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-xs flex items-center justify-center shrink-0">
              {idx + 1}
            </span>
            <div className="flex-1">
              <MathText text={item} />
            </div>
            <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE SCREEN & ACHIEVEMENTS POPUPS
// ═══════════════════════════════════════════════════════════════════════════════

function CompleteScreen({ xpEarned, stepTitle, onContinue }) {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-8 font-sans">
      <section
        aria-labelledby="lesson-complete-title"
        className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white border border-slate-800 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="bg-indigo-700 px-6 py-10 text-white sm:px-10 sm:py-14">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-emerald-950">
              <Check className="h-7 w-7 stroke-[3]" aria-hidden="true" />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-indigo-100">
              Bài học đã hoàn tất
            </span>
          </div>
          <h1 id="lesson-complete-title" className="mt-8 text-4xl font-black tracking-tight sm:text-5xl">
            Hoàn thành!
          </h1>
          <p className="mt-3 max-w-xl text-base font-semibold leading-relaxed text-indigo-100 sm:text-lg">
            {stepTitle}
          </p>
        </div>

        <div className="px-6 py-7 sm:px-10 sm:py-9">
          <div className="flex flex-col gap-6 border-b-2 border-slate-100 pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
                Phần thưởng
              </p>
              <p className="mt-1 text-5xl font-black tabular-nums text-amber-600">
                +{xpEarned} <span className="text-2xl">XP</span>
              </p>
            </div>
            <p className="inline-flex items-center gap-2 text-sm font-extrabold text-emerald-700">
              <Check className="h-5 w-5" aria-hidden="true" />
              Kết quả đã ghi nhận
            </p>
          </div>

          <TactileButton variant="primary" size="lg" onClick={onContinue} className="mt-7 w-full text-base sm:text-lg">
            <span>Tiếp tục học</span>
            <ArrowRight className="ml-1.5 h-5 w-5" />
          </TactileButton>
        </div>
      </section>
    </main>
  )
}

function AchievementsScreen({ achievements = [], onContinue }) {
  return (
    <div className="min-h-screen bg-amber-50/50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm bg-white border-2 border-amber-200 rounded-3xl p-8 text-center space-y-6">
        
        <div className="w-20 h-20 mx-auto bg-amber-500 text-white rounded-3xl flex items-center justify-center border-2 border-amber-600">
          <Trophy className="w-10 h-10" />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-900">
            <span className="inline-flex items-center gap-2">
              Mở khóa thành tựu!
              <Medal className="w-5 h-5 text-amber-500" aria-hidden="true" />
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            Chúc mừng bạn đã đạt cột mốc mới
          </p>
        </div>

        <div className="space-y-3">
          {achievements.map((ach) => (
            <div key={ach.id} className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl flex items-center gap-3 text-left">
              <AchievementIcon achievement={ach} className="w-6 h-6 text-amber-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-xs truncate">{ach.title}</p>
                <p className="text-[11px] text-amber-700 font-extrabold">+{ach.xp_reward} XP</p>
              </div>
            </div>
          ))}
        </div>

        <TactileButton variant="primary" size="lg" onClick={onContinue} className="w-full">
          Tiếp tục
        </TactileButton>

      </div>
    </div>
  )
}

function AchievementUnlockedPopup({ achievements = [], onClose }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {achievements.map((ach) => (
        <div
          key={ach.id}
          onClick={onClose}
          className="bg-white border-2 border-amber-300 rounded-2xl p-4 flex items-center gap-3 cursor-pointer animate-in slide-in-from-top-2 duration-200"
        >
          <AchievementIcon achievement={ach} className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-slate-900">{ach.title}</p>
            <p className="text-[10px] font-extrabold text-amber-600">+{ach.xp_reward} XP Thành tựu</p>
          </div>
        </div>
      ))}
    </div>
  )
}


