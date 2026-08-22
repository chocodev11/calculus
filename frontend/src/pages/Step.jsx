import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  X as XIcon, Check, Sparkles, RotateCcw, HelpCircle,
  Eye, Lightbulb, AlertTriangle, Info, GraduationCap,
  Copy, CheckCheck, Play, GripVertical, Trophy, Heart, Zap, ArrowRight, Medal
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api, { ApiError, normalizeListPayload } from '../lib/api'
import { useAuthStore } from '../lib/store'
import { decodeStepId, encodeStepId, cn } from '../lib/utils'
import { materializeAssessmentPools } from '../lib/lessonScheme'
import { cleanLessonCopy, isLastReaderSection, prepareReaderSlides } from '../lib/lessonPresentation'
import 'katex/dist/katex.min.css'
import * as ReactKatexModule from 'react-katex'
import { TactileButton } from '../components/ui/tactile-button'
import { GamifyBadge } from '../components/ui/gamify-badge'
import { AchievementIcon } from '../components/ui/semantic-icon'
import InteractionSlide from '../components/interactions'
import { MathText } from '../components/interactions/MathText'
import soundFX from '../lib/soundEffects'
import { fireConfetti, fireLessonCompleteConfetti } from '../lib/confetti'
import ErrorBoundary from '../components/ErrorBoundary'

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
  const [loadError, setLoadError] = useState(null)
  const [loadRetryToken, setLoadRetryToken] = useState(0)
  const [story, setStory] = useState(null)
  const [allSteps, setAllSteps] = useState([])

  // Slide navigation
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [completedSlideIds, setCompletedSlideIds] = useState([])
  const completedSlideIdsRef = useRef(new Set())
  const slideAwardRequestsRef = useRef(new Map())
  const [slideAwardError, setSlideAwardError] = useState(null)
  const [isNavigating, setIsNavigating] = useState(false)

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizSubmitted, setQuizSubmitted] = useState({})
  const [quizResults, setQuizResults] = useState({})
  const [totalXpEarned, setTotalXpEarned] = useState(0)

  const [showCompleteScreen, setShowCompleteScreen] = useState(false)
  const [completionError, setCompletionError] = useState(null)
  const [isCompleting, setIsCompleting] = useState(false)
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
  const loadRequestRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    const requestId = Symbol('step-load')
    loadData(controller.signal, requestId)
    return () => controller.abort()
  }, [id, slug, loadRetryToken])

  const loadData = async (signal, requestId) => {
    setLoading(true)
    setLoadError(null)
    setSlideAwardError(null)
    const isCurrentRequest = () => !signal.aborted && requestId === loadRequestRef.current
    loadRequestRef.current = requestId
    try {
      if (!id || !slug) {
        setLoadError({ kind: 'not-found', message: 'Đường dẫn bài học không hợp lệ.' })
        return
      }
      const fullStory = await api.get(`/stories/${slug}`, { signal, redirectOnUnauthorized: false })
      if (!isCurrentRequest()) return
      if (!fullStory || typeof fullStory !== 'object') {
        throw new ApiError('API trả về thông tin khóa học không đúng định dạng', { status: 200, endpoint: `/stories/${slug}` })
      }
      setStory(fullStory)

      if (!fullStory.is_enrolled) {
        setLoadError({ kind: 'not-enrolled', message: 'Bạn chưa đăng ký khóa học này.' })
        return
      }

      const steps = []
      fullStory.chapters?.forEach(ch => {
        ch.steps?.forEach(s => steps.push({
          ...s,
          chapter_id: ch.id,
          chapter_title: ch.title,
        }))
      })
      setAllSteps(steps)

      const [stepData, slidesData, invData] = await Promise.all([
        api.get(`/steps/${id}`, { signal, redirectOnUnauthorized: false }),
        api.get(`/steps/${id}/slides`, { signal, redirectOnUnauthorized: false }),
        api.get('/shop/inventory', { signal, redirectOnUnauthorized: false }).catch(error => {
          if (error?.name === 'AbortError') throw error
          return []
        }),
      ])
      if (!isCurrentRequest()) return

      const normalizedSlides = normalizeListPayload(slidesData, 'slides')
      if (!stepData || typeof stepData !== 'object' || !Array.isArray(normalizedSlides)) {
        throw new ApiError('Nội dung bài học không đúng định dạng', { status: 200, endpoint: `/steps/${id}` })
      }
      let materializedSlides
      try {
        materializedSlides = materializeAssessmentPools(normalizedSlides)
      } catch (error) {
        throw new ApiError(`Nội dung bài học không hợp lệ: ${error?.message || String(error)}`, {
          status: 422,
          endpoint: `/steps/${id}/slides`,
          payload: error,
        })
      }

      const boost = Array.isArray(invData) && invData.find(i => i.item?.item_type === 'xp_boost' && i.quantity > 0)
      setHasXpBoost(!!boost)

      setStep({ ...stepData, description: cleanLessonCopy(stepData.description) })
      setSlides(prepareReaderSlides(materializedSlides))
      setCurrentSlideIndex(0)
      completedSlideIdsRef.current = new Set()
      slideAwardRequestsRef.current.clear()
      setCompletedSlideIds([])
      setQuizAnswers({})
      setQuizSubmitted({})
      setQuizResults({})
      setTotalXpEarned(0)
      setShowCompleteScreen(false)
      setCompletionError(null)
      stepStartTimeRef.current = Date.now()
    } catch (e) {
      if (e?.name === 'AbortError' || !isCurrentRequest()) return
      console.error('Error loading step:', e)
      const status = e instanceof ApiError ? e.status : 0
      const kind = status === 401
        ? 'api-unauthorized'
        : status === 404
        ? 'not-found'
        : status === 422
        ? 'content-validation'
        : 'api-error'
      setLoadError({ kind, message: e?.message || 'Không thể tải bài học.', status, endpoint: e?.endpoint })
    } finally {
      if (isCurrentRequest()) setLoading(false)
    }
  }

  const currentSlide = slides[currentSlideIndex]
  const progress = slides.length > 0 ? ((currentSlideIndex + 1) / slides.length) * 100 : 0
  const isLastSlide = currentSlideIndex === slides.length - 1
  const currentSourceSlideId = currentSlide?.sourceSlideId || currentSlide?.id
  const nextStep = useMemo(() => {
    const currentStepIndex = allSteps.findIndex(candidate => String(candidate.id) === String(step?.id))
    return currentStepIndex >= 0 ? allSteps[currentStepIndex + 1] || null : null
  }, [allSteps, step?.id])

  const awardSlideXp = useCallback(async (slideId) => {
    if (!slideId || completedSlideIdsRef.current.has(slideId)) return true
    const existingRequest = slideAwardRequestsRef.current.get(slideId)
    if (existingRequest) return existingRequest

    const request = (async () => {
      setSlideAwardError(null)
      try {
        const res = await api.post(`/steps/${id}/slides/${slideId}/complete`, {}, { redirectOnUnauthorized: false })
        completedSlideIdsRef.current.add(slideId)
        setCompletedSlideIds(Array.from(completedSlideIdsRef.current))
        if (res?.newly_earned_achievements?.length > 0) {
          setSlideAchievements(res.newly_earned_achievements)
        }
        return true
      } catch (error) {
        if (error?.name !== 'AbortError') {
          console.warn('Error recording slide completion', error)
          setSlideAwardError({ slideId, message: error?.message || 'Chưa ghi nhận được tiến độ slide.' })
        }
        return false
      } finally {
        slideAwardRequestsRef.current.delete(slideId)
      }
    })()

    slideAwardRequestsRef.current.set(slideId, request)
    return request
  }, [id])

  const goNext = useCallback(async () => {
    if (isNavigating || currentSlideIndex >= slides.length - 1) return false
    setIsNavigating(true)
    const shouldAward = isLastReaderSection(slides, currentSlideIndex)
    const awarded = shouldAward ? await awardSlideXp(currentSourceSlideId) : true
    if (awarded) setCurrentSlideIndex(index => index + 1)
    setIsNavigating(false)
    return awarded
  }, [awardSlideXp, currentSourceSlideId, currentSlideIndex, isNavigating, slides])

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
    soundFX.play('select')
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
      soundFX.play('correct')
      fireConfetti({ particleCount: 35, origin: { x: 0.5, y: 0.7 } })
    } else {
      soundFX.play('incorrect')
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
    setCompletionError(null)
    const correctCount = Object.values(quizResults).filter(r => r.correct).length
    const baseXp = (step?.xp_reward || 0) + correctCount * 15
    setTotalXpEarned(hasXpBoost ? baseXp * 2 : baseXp)
    setShowCompleteScreen(true)
  }

  const handleCompleteAndNavigate = async () => {
    if (isCompleting) return
    setIsCompleting(true)
    setCompletionError(null)
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

      soundFX.play('lesson-complete')
      fireLessonCompleteConfetti()

      const unlocked = result?.newly_earned_achievements || []
      if (unlocked.length > 0) {
        setNewAchievements(unlocked)
        setShowAchievementsScreen(true)
        return
      }

      doNavigateNext()
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setCompletionError({
          message: error?.message || 'Không thể ghi nhận hoàn thành bài học.',
          status: error?.status,
        })
      }
    } finally {
      setIsCompleting(false)
    }
  }

  const doNavigateNext = () => {
    const destination = nextStep?.id
      ? `/course/${slug}/step/${encodeStepId(nextStep.id)}`
      : `/course/${slug}`
    navigate(destination)
    fetchUser().catch(() => {})
  }

  const handleQuit = () => {
    api.post(`/steps/${id}/quit`, {}, { redirectOnUnauthorized: false }).then(result => {
      if (result?.hearts != null) {
        setLocalHearts(result.hearts)
        updateUserStats({ hearts: result.hearts })
      }
    }).catch(error => {
      if (error?.name !== 'AbortError') console.warn('Could not record lesson quit', error)
    })
    navigate(`/course/${slug}`)
  }

  const handleFooterAction = async () => {
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
        if (await awardSlideXp(currentSourceSlideId)) handleComplete()
      } else {
        await goNext()
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
      if (await awardSlideXp(currentSourceSlideId)) handleComplete()
    } else {
      await goNext()
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

  if (loadError) {
    return (
      <StepLoadErrorScreen
        error={loadError}
        onRetry={() => setLoadRetryToken(token => token + 1)}
        onCourse={() => navigate(`/course/${slug}`)}
      />
    )
  }

  if (!step || slides.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="text-center bg-white border border-slate-200 rounded-3xl p-8 space-y-4 max-w-sm">
          <p className="text-slate-600 font-bold">Nội dung bài học đang trống hoặc chưa được xuất bản.</p>
          <TactileButton variant="secondary" onClick={() => setLoadRetryToken(token => token + 1)} className="w-full">
            Thử lại
          </TactileButton>
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
        nextStep={nextStep}
        onContinue={handleCompleteAndNavigate}
        error={completionError}
        isSubmitting={isCompleting}
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
      {slideAwardError && (
        <div className="absolute top-[10vh] left-0 right-0 z-40 flex items-center justify-center gap-3 bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs font-bold text-rose-800">
          <span>{slideAwardError.message}</span>
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => awardSlideXp(slideAwardError.slideId)}
          >
            Thử lại
          </button>
        </div>
      )}
      
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
        <div className="flex w-1/2 max-w-md mx-4 items-center gap-2.5">
          <div
            className="relative h-3.5 min-w-0 flex-1 bg-slate-100 rounded-full overflow-hidden border border-slate-200"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={slides.length}
            aria-valuenow={currentSlideIndex + 1}
            aria-valuetext={`${currentSlideIndex + 1}/${slides.length}`}
            aria-label="Tiến độ bài học"
          >
            <motion.div
              className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>
          <span className="shrink-0 text-xs font-bold tabular-nums text-slate-400">
            {currentSlideIndex + 1}/{slides.length}
          </span>
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
                      <ErrorBoundary
                        fallback={({ reset }) => (
                          <BlockFailure onRetry={reset} />
                        )}
                      >
                        <InteractionSlide
                          interactionType={content.interactionType}
                          lesson={content.lesson}
                        />
                      </ErrorBoundary>
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
              {currentSlide?.title && (
                <div className="flex items-end justify-between gap-4 border-b border-slate-100 pb-4">
                  <h1 className="min-w-0 text-xl sm:text-2xl font-extrabold tracking-tight leading-snug text-slate-900">
                    {currentSlide.title}
                  </h1>
                </div>
              )}
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
                    <ErrorBoundary
                      key={block.id || `${currentSlideIndex}-${blockIdx}`}
                      fallback={({ reset }) => <BlockFailure onRetry={reset} />}
                    >
                      <BlockRenderer
                        block={block}
                        quizAnswer={quizAnswers[block.id]}
                        quizSubmitted={quizSubmitted[block.id]}
                        quizResult={quizResults[block.id]}
                        onQuizAnswer={(ans) => handleQuizAnswer(block.id, ans)}
                        onQuizSubmit={(correct, explanation) => handleQuizSubmit(block.id, correct, explanation)}
                        onQuizRetry={() => handleQuizRetry(block.id)}
                      />
                    </ErrorBoundary>
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


function StepLoadErrorScreen({ error, onRetry, onCourse }) {
  const labels = {
    'not-enrolled': {
      title: 'Bạn chưa đăng ký bài học',
      detail: 'Hãy quay lại khóa học và đăng ký trước khi bắt đầu.',
    },
    'not-found': {
      title: 'Không tìm thấy bài học',
      detail: 'Đường dẫn hoặc nội dung bài học có thể đã thay đổi.',
    },
    'api-unauthorized': {
      title: 'Phiên đăng nhập không hợp lệ',
      detail: 'Hãy đăng nhập lại rồi thử tải bài học.',
    },
    'content-validation': {
      title: 'Nội dung bài học không hợp lệ',
      detail: 'Bài học có dữ liệu assessment/slide chưa đúng contract.',
    },
    'api-error': {
      title: 'Không thể tải bài học',
      detail: 'Máy chủ hoặc kết nối đang gặp sự cố.',
    },
  }
  const label = labels[error?.kind] || labels['api-error']

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 space-y-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-rose-50 p-3 text-rose-600 border border-rose-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">{label.title}</h1>
            <p className="mt-1 text-sm text-slate-600">{label.detail}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600">
          <p>{error?.message}</p>
          {(error?.status || error?.endpoint) && (
            <p className="mt-1 font-mono text-slate-500">
              {error.status ? `HTTP ${error.status}` : ''}{error.status && error.endpoint ? ' · ' : ''}{error.endpoint || ''}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <TactileButton variant="primary" onClick={onRetry} className="flex-1">
            <RotateCcw className="mr-1.5 h-4 w-4" /> Thử lại
          </TactileButton>
          <TactileButton variant="secondary" onClick={onCourse} className="flex-1">
            Quay lại khóa học
          </TactileButton>
        </div>
      </div>
    </div>
  )
}

function BlockFailure({ onRetry }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <p className="font-bold">Khối nội dung này không hiển thị được.</p>
      <button type="button" onClick={onRetry} className="mt-2 font-bold underline underline-offset-2">
        Thử render lại
      </button>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════════
// BLOCK RENDERERS
// ═══════════════════════════════════════════════════════════════════════════════

export function BlockRenderer({ block, quizAnswer, quizSubmitted, quizResult, onQuizAnswer, onQuizSubmit, onQuizRetry }) {
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
    default: return <LegacyBlockFallback block={block} />
  }
}

function InteractionBlock({ block }) {
  const content = block.content || block.block_data || {}
  const interactionType = content.interactionType || block.interactionType
  const lesson = content.lesson || block.lesson
  const isCanvas = ['A', 'B', 'C', 'E'].includes(interactionType)

  return (
    <div className={`my-6 rounded-3xl overflow-hidden border border-slate-200 bg-white flex flex-col ${
      isCanvas ? 'h-[520px]' : 'min-h-[560px] h-auto'
    }`}>
      <InteractionSlide
        interactionType={interactionType}
        lesson={lesson}
        content={content}
      />
    </div>
  )
}

function TextBlock({ block }) {
  const content = block.content || block.block_data || {}

  return (
    <div className="space-y-4">
      {content.heading && (
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
          <MathText text={content.heading} />
        </h2>
      )}
      {content.paragraphs?.map((p, idx) => (
        <p key={idx} className="whitespace-pre-line text-base text-slate-700 leading-8 font-medium">
          <MathText text={p} />
        </p>
      ))}
      {content.content && (
        <div className="whitespace-pre-line text-base text-slate-700 leading-8 font-medium">
          <MathText text={content.content} />
        </div>
      )}
    </div>
  )
}



function MathBlock({ block }) {
  const content = block.content || block.block_data || {}
  const latex = content.latex || content.math || ''
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
  const source = content.src || content.url
  const [loaded, setLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  return (
    <figure className="my-6">
      <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-100">
        {!loaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}
        {imageError || !source ? (
          <div className="min-h-32 flex flex-col items-center justify-center gap-2 p-5 text-center text-xs font-semibold text-slate-500">
            <Info className="w-5 h-5 text-slate-400" />
            <span>Ảnh minh họa không tải được.</span>
          </div>
        ) : (
          <img
            src={source}
            alt={content.alt || ''}
            onLoad={() => setLoaded(true)}
            onError={() => {
              setImageError(true)
              setLoaded(true)
            }}
            className={cn(
              'w-full transition-opacity duration-300',
              loaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}
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
  const [copyError, setCopyError] = useState(false)

  const handleCopy = async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) throw new Error('clipboard_unavailable')
      await navigator.clipboard.writeText(content.code || '')
      setCopyError(false)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopyError(true)
    }
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
      {copyError && <p className="px-4 pb-3 text-xs font-semibold text-amber-300">Không thể sao chép trên trình duyệt này.</p>}
    </div>
  )
}

function QuizBlock({ block, answer, submitted, result, onAnswer }) {
  const content = block.content || block.block_data || {}
  const question = content.question || ''
  const qType = content.quiz_type || (content.items ? 'true_false_group' : 'multiple_choice')

  // ─── Dạng II: Đúng / Sai 4 ý ──────────────────────────────────────────────
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
            <div className="whitespace-pre-line text-sm sm:text-base text-slate-800 font-medium leading-relaxed">
              <MathText text={content.body} />
            </div>
          )}
          {content.content && (
            <div className="whitespace-pre-line text-sm sm:text-base text-slate-800 font-medium leading-relaxed">
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
  const rawSteps = content.steps || content.items || content.content || []
  const steps = Array.isArray(rawSteps) ? rawSteps : rawSteps ? [rawSteps] : []
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
      <LegacyPreviewNotice />
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
      <LegacyPreviewNotice />
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

function LegacyPreviewNotice() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-amber-800">
      <span>Legacy interaction</span>
      <span>preview-only · chưa chấm điểm</span>
    </div>
  )
}

function LegacyBlockFallback({ block }) {
  const type = block?.type || block?.block_type || 'unknown'
  const content = block?.content || block?.block_data || block
  const readable = typeof content === 'string'
    ? content
    : JSON.stringify(content, null, 2)
  return (
    <div className="my-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
      <div className="flex items-center justify-between gap-3">
        <span className="font-extrabold">Nội dung tương tác cũ: {type}</span>
        <span className="rounded-lg border border-amber-300 bg-white/70 px-2 py-1 text-[10px] font-black uppercase tracking-wide">preview-only</span>
      </div>
      <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-amber-200 bg-white/70 p-3 text-xs text-amber-900">
        {readable}
      </pre>
      <p className="mt-3 text-xs font-semibold text-amber-800">Khối này chưa có chấm điểm trong phiên bản hiện tại.</p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE SCREEN & ACHIEVEMENTS POPUPS
// ═══════════════════════════════════════════════════════════════════════════════

function CompleteScreen({ xpEarned, stepTitle, nextStep, onContinue, error, isSubmitting }) {
  const headingRef = useRef(null)
  const hasNextStep = Boolean(nextStep?.id)

  useEffect(() => {
    headingRef.current?.focus()
  }, [error])

  return (
    <main
      className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center px-4 py-8 font-sans sm:p-10"
      aria-busy={isSubmitting}
    >
      <section
        aria-labelledby="lesson-complete-title"
        className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 animate-in fade-in duration-200 sm:p-10"
      >
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center gap-2 text-sm font-bold ${error ? 'text-rose-700' : 'text-emerald-700'}`}
        >
          {error ? (
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Check className="h-4 w-4" aria-hidden="true" />
          )}
          {isSubmitting ? 'Đang lưu kết quả…' : error ? 'Chưa lưu được kết quả' : 'Bài học đã hoàn tất'}
        </div>

        <h1
          ref={headingRef}
          id="lesson-complete-title"
          tabIndex="-1"
          className="mt-8 text-4xl font-black tracking-tight text-slate-900 outline-none sm:text-5xl"
        >
          Hoàn thành.
        </h1>
        <p className="mt-3 max-w-lg text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
          {stepTitle || 'Bài học hiện tại'}
        </p>

        <div className="mt-10 flex items-baseline justify-between gap-4 border-y border-slate-200 py-5">
          <p className="text-sm font-semibold text-slate-500">Phần thưởng</p>
          <p className="text-3xl font-black tabular-nums text-amber-600 sm:text-4xl">
            +{xpEarned} <span className="text-xl">XP</span>
          </p>
        </div>

        {error && (
          <div role="alert" className="mt-6 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
            <p>{error.message}</p>
            <p className="mt-1 text-xs text-rose-700">Kiểm tra kết nối rồi thử lại.</p>
          </div>
        )}

        <div className="mt-8 flex items-start justify-between gap-5 border-b border-slate-200 pb-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              {hasNextStep ? 'Bài học tiếp theo' : 'Khóa học đã hoàn tất'}
            </p>
            <p className="mt-2 text-base font-extrabold leading-snug text-slate-900">
              {hasNextStep ? nextStep.title : 'Xem lại tiến độ và các bài đã hoàn thành'}
            </p>
            {hasNextStep && nextStep.chapter_title && (
              <p className="mt-1 text-sm font-medium text-slate-500">{nextStep.chapter_title}</p>
            )}
          </div>
          {hasNextStep && <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-indigo-600" aria-hidden="true" />}
        </div>

        <TactileButton
          variant="primary"
          size="lg"
          onClick={onContinue}
          disabled={isSubmitting}
          className="mt-8 w-full text-base sm:text-lg"
        >
          <span>
            {isSubmitting
              ? 'Đang lưu kết quả…'
              : error
              ? 'Thử ghi nhận lại'
              : hasNextStep
              ? 'Lưu và học bài tiếp theo'
              : 'Lưu và về khóa học'}
          </span>
          <ArrowRight className="ml-1.5 h-5 w-5" />
        </TactileButton>
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
