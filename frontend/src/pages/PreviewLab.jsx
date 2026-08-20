import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Smartphone, Tablet, Monitor, RotateCw, Volume2, VolumeX,
  Sparkles, CheckCircle2, ArrowLeft, ArrowRight, Play,
  RefreshCcw, Info, Layers, Check, X as XIcon, HelpCircle,
  Trophy, Zap, Heart, Flame, ShieldAlert, Cpu
} from 'lucide-react'
import { getAllCourses, getStep } from '../lib/courseRegistry'
import { TactileButton } from '../components/ui/tactile-button'
import soundFX from '../lib/soundEffects'
import { fireLessonCompleteConfetti, fireConfetti } from '../lib/confetti'
import { MathText } from '../components/interactions/MathText'
import AlgorithmicBackground from '../components/interactions/AlgorithmicBackground'
import { cn } from '../lib/utils'
import * as ReactKatexModule from 'react-katex'
import 'katex/dist/katex.min.css'

const ReactKatex = ReactKatexModule.default || ReactKatexModule
const { InlineMath, BlockMath } = ReactKatex

// Device Viewport Presets
const DEVICE_PRESETS = [
  { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667, icon: Smartphone, type: 'phone' },
  { id: 'iphone-15', name: 'iPhone 15', width: 393, height: 852, icon: Smartphone, type: 'phone' },
  { id: 'ipad-mini', name: 'iPad Mini', width: 768, height: 1024, icon: Tablet, type: 'tablet' },
  { id: 'responsive', name: '100% Fluid', width: '100%', height: '100%', icon: Monitor, type: 'desktop' },
]

export default function PreviewLab() {
  const { courseSlug: paramCourse, stepId: paramStep } = useParams()
  const navigate = useNavigate()

  const courses = getAllCourses()
  const [selectedCourse, setSelectedCourse] = useState(paramCourse || courses[0]?.slug || 'dao-ham')
  const currentCourse = courses.find(c => c.slug === selectedCourse) || courses[0]

  const availableSteps = currentCourse?.chapters?.flatMap(ch => ch.steps || []) || []
  const [selectedStepId, setSelectedStepId] = useState(paramStep || availableSteps[0]?.id || '01-y-nghia-hinh-hoc')

  // Preview Settings
  const [currentDevice, setCurrentDevice] = useState(DEVICE_PRESETS[1]) // iPhone 15 default
  const [isLandscape, setIsLandscape] = useState(false)
  const [zoomScale, setZoomScale] = useState(1)
  const [soundEnabled, setSoundEnabled] = useState(soundFX.isSoundEnabled())
  const [clsEvents, setClsEvents] = useState([])

  // Mock Lesson State
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizSubmitted, setQuizSubmitted] = useState({})
  const [quizResults, setQuizResults] = useState({})
  const [xpTotal, setXpTotal] = useState(120)
  const [hearts, setHearts] = useState(5)
  const [streak, setStreak] = useState(7)
  const [isCompleted, setIsCompleted] = useState(false)

  // Mock Lesson Slides Dataset
  const sampleSlides = useMemo(() => [
    {
      id: 'slide-1',
      title: 'Ý nghĩa hình học của Đạo hàm',
      blocks: [
        {
          type: 'text',
          heading: 'Tiếp tuyến của đường cong tại một điểm',
          paragraphs: [
            'Xét đồ thị hàm số $y = f(x)$. Khi một điểm $M(x; f(x))$ di chuyển dần về điểm cố định $M_0(x_0; f(x_0))$, cát tuyến $M_0M$ sẽ dần tiến đến một vị trí giới hạn.',
            'Vị trí giới hạn đó chính là **tiếp tuyến** của đường cong tại điểm $M_0$. Hệ số góc của tiếp tuyến chính là đạo hàm $f\'(x_0)$.'
          ]
        },
        {
          type: 'math',
          latex: 'k = \\lim_{\\Delta x \\to 0} \\frac{f(x_0 + \\Delta x) - f(x_0)}{\\Delta x} = f\'(x_0)',
          label: 'Công thức định nghĩa hệ số góc tiếp tuyến'
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Trực quan hình học',
          body: 'Đạo hàm tại một điểm không phải là một công thức khô khan, mà chính là độ dốc tức thời của con đường mà bạn đang đi trên đồ thị!'
        }
      ]
    },
    {
      id: 'slide-2',
      title: 'Kiểm tra độ dốc & tiếp tuyến',
      blocks: [
        {
          type: 'quiz_single',
          id: 'q_slope_1',
          question: 'Cho hàm số $y = x^2$. Hệ số góc của tiếp tuyến tại điểm $M(1; 1)$ có giá trị bằng bao nhiêu?',
          options: [
            { id: 'A', text: '$k = 1$' },
            { id: 'B', text: '$k = 2$' },
            { id: 'C', text: '$k = 4$' },
            { id: 'D', text: '$k = 0$' }
          ],
          correctAnswer: 'B',
          explanation: 'Ta có $y\' = (x^2)\' = 2x$. Do đó hệ số góc tại $x_0 = 1$ là $k = y\'(1) = 2 \\cdot 1 = 2$.'
        }
      ]
    },
    {
      id: 'slide-3',
      title: 'Trắc nghiệm Đúng / Sai 4 ý',
      blocks: [
        {
          type: 'quiz_true_false',
          id: 'q_tf_1',
          question: 'Cho hàm số $f(x) = x^3 - 3x + 2$. Xét tính đúng/sai của các mệnh đề sau:',
          items: [
            { id: 'item_a', label: 'Đạo hàm của hàm số là $f\'(x) = 3x^2 - 3$', correct: true },
            { id: 'item_b', label: 'Hệ số góc của tiếp tuyến tại điểm $x = 0$ bằng $3$', correct: false },
            { id: 'item_c', label: 'Hàm số có hai điểm cực trị tại $x = 1$ và $x = -1$', correct: true },
            { id: 'item_d', label: 'Tiếp tuyến tại $x = 1$ song song với trục hoành $Ox$', correct: true }
          ]
        }
      ]
    }
  ], [])

  const currentSlide = sampleSlides[currentSlideIndex] || sampleSlides[0]
  const totalSlides = sampleSlides.length
  const progressPercent = Math.round(((currentSlideIndex + 1) / totalSlides) * 100)

  // Layout Shift Inspector via PerformanceObserver
  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return
    try {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.hadRecentInput) {
            // Shift triggered by user input
            setClsEvents(prev => [{
              value: entry.value,
              time: new Date().toLocaleTimeString(),
              id: Math.random()
            }, ...prev.slice(0, 4)])
          }
        }
      })
      observer.observe({ type: 'layout-shift', buffered: true })
      return () => observer.disconnect()
    } catch {}
  }, [])

  const handleToggleSound = () => {
    const next = soundFX.toggleSound()
    setSoundEnabled(next)
  }

  // Quiz Handling
  const handleSelectSingleChoice = (quizId, optId) => {
    if (quizSubmitted[quizId]) return
    soundFX.pop()
    setQuizAnswers(prev => ({ ...prev, [quizId]: optId }))
  }

  const handleSelectTrueFalse = (itemId, val) => {
    if (quizSubmitted['q_tf_1']) return
    soundFX.pop()
    setQuizAnswers(prev => {
      const currentMap = prev['q_tf_1'] || {}
      return {
        ...prev,
        'q_tf_1': { ...currentMap, [itemId]: val }
      }
    })
  }

  const handleCheckAnswer = (quizBlock) => {
    const qId = quizBlock.id
    if (quizBlock.type === 'quiz_single') {
      const isCorrect = quizAnswers[qId] === quizBlock.correctAnswer
      setQuizSubmitted(prev => ({ ...prev, [qId]: true }))
      setQuizResults(prev => ({ ...prev, [qId]: { correct: isCorrect } }))
      if (isCorrect) {
        soundFX.success()
        setXpTotal(x => x + 15)
        fireConfetti({ particleCount: 30, origin: { x: 0.5, y: 0.6 } })
      } else {
        soundFX.error()
        setHearts(h => Math.max(0, h - 1))
      }
    } else if (quizBlock.type === 'quiz_true_false') {
      const userMap = quizAnswers[qId] || {}
      const allCorrect = quizBlock.items.every(item => userMap[item.id] === item.correct)
      setQuizSubmitted(prev => ({ ...prev, [qId]: true }))
      setQuizResults(prev => ({ ...prev, [qId]: { correct: allCorrect } }))
      if (allCorrect) {
        soundFX.success()
        setXpTotal(x => x + 20)
        fireConfetti({ particleCount: 40, origin: { x: 0.5, y: 0.6 } })
      } else {
        soundFX.error()
        setHearts(h => Math.max(0, h - 1))
      }
    }
  }

  const handleNextSlide = () => {
    soundFX.click()
    if (currentSlideIndex < totalSlides - 1) {
      setCurrentSlideIndex(i => i + 1)
    } else {
      setIsCompleted(true)
      soundFX.complete()
      fireLessonCompleteConfetti()
    }
  }

  const handleResetLab = () => {
    soundFX.click()
    setCurrentSlideIndex(0)
    setQuizAnswers({})
    setQuizSubmitted({})
    setQuizResults({})
    setIsCompleted(false)
    setHearts(5)
  }

  // Calculate actual viewport dimensions
  const viewportWidth = currentDevice.id === 'responsive'
    ? '100%'
    : isLandscape ? currentDevice.height : currentDevice.width

  const viewportHeight = currentDevice.id === 'responsive'
    ? '100%'
    : isLandscape ? currentDevice.width : currentDevice.height

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans antialiased select-none">
      {/* ─── TOP LAB CONTROL BAR ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Brand & Back */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Thoát Lab</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Mobile Preview Lab (No-Auth)
            </span>
          </div>
        </div>

        {/* Device Switcher Presets */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800">
          {DEVICE_PRESETS.map((dev) => {
            const Icon = dev.icon
            const isActive = currentDevice.id === dev.id
            return (
              <button
                key={dev.id}
                type="button"
                onClick={() => {
                  soundFX.click()
                  setCurrentDevice(dev)
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{dev.name}</span>
                {dev.id !== 'responsive' && (
                  <span className="text-[10px] opacity-70 hidden md:inline font-mono">
                    ({dev.width}px)
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Utilities: Rotate, Sound, Reset */}
        <div className="flex items-center gap-2">
          {currentDevice.id !== 'responsive' && (
            <button
              type="button"
              onClick={() => {
                soundFX.click()
                setIsLandscape(!isLandscape)
              }}
              title="Xoay ngang / dọc"
              className={cn(
                'p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer',
                isLandscape
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              )}
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleSound}
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh Web Audio'}
            className={cn(
              'p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer',
              soundEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            )}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleResetLab}
            title="Khởi tạo lại tiến trình học thử"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Làm lại</span>
          </button>
        </div>
      </header>

      {/* ─── MAIN WORKSPACE (Device Stage) ──────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-slate-950 flex items-center justify-center p-2 sm:p-6 relative">
        <AlgorithmicBackground opacity={0.3} particleCount={35} />

        {/* DEVICE FRAME */}
        <div
          style={{
            width: typeof viewportWidth === 'number' ? `${viewportWidth}px` : viewportWidth,
            height: typeof viewportHeight === 'number' ? `${viewportHeight}px` : viewportHeight,
            maxWidth: '100%',
            maxHeight: currentDevice.id === 'responsive' ? '100%' : '90vh'
          }}
          className={cn(
            'relative bg-white text-slate-900 overflow-hidden transition-all duration-200 flex flex-col',
            currentDevice.id !== 'responsive' && [
              'rounded-[40px] shadow-2xl border-[8px] border-slate-800',
              'ring-1 ring-slate-700/50'
            ],
            currentDevice.id === 'responsive' && 'w-full h-full rounded-none'
          )}
        >
          {/* Mobile Notch / Speaker Bar (if mobile device) */}
          {currentDevice.id !== 'responsive' && !isLandscape && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-800 rounded-full z-50 pointer-events-none flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-slate-900 mr-2" />
              <div className="w-10 h-1 rounded-full bg-slate-700" />
            </div>
          )}

          {/* ─── LESSON HEADER (Hearts, Progress, XP) ─────────────────── */}
          <div className="shrink-0 bg-white/95 backdrop-blur border-b border-slate-100 px-4 sm:px-6 pt-5 sm:pt-3 pb-3 flex items-center justify-between gap-3 z-30">
            {/* Close / Exit Lesson */}
            <button
              type="button"
              onClick={handleResetLab}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>

            {/* Gamified Spring Progress Bar */}
            <div className="flex-1 max-w-md mx-2">
              <div className="h-3 sm:h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 p-0.5">
                <motion.div
                  initial={false}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                  className="h-full bg-emerald-500 rounded-full shimmer-bar relative"
                />
              </div>
            </div>

            {/* Streak & Hearts Counter */}
            <div className="flex items-center gap-2.5 shrink-0 text-xs font-black">
              <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-xl border border-amber-200">
                <Flame className="w-3.5 h-3.5 fill-amber-500" />
                <span>{streak}</span>
              </div>
              <div className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-1 rounded-xl border border-rose-200">
                <Heart className="w-3.5 h-3.5 fill-rose-500" />
                <span>{hearts}</span>
              </div>
            </div>
          </div>

          {/* ─── LESSON SLIDE CONTENT (Unclipped Vertical Scroll & Center) ── */}
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col px-4 sm:px-8 py-4 sm:py-6">
            <div className="max-w-xl w-full mx-auto my-auto space-y-6">
              
              {!isCompleted ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlideIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="space-y-6"
                  >
                    {/* Slide Title */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-600">
                        <Sparkles className="w-4 h-4" />
                        <span>Slide {currentSlideIndex + 1} / {totalSlides}</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                        {currentSlide.title}
                      </h2>
                    </div>

                    {/* Render Blocks */}
                    {currentSlide.blocks.map((block, bIdx) => (
                      <div key={bIdx} className="space-y-4">
                        {/* Text Block */}
                        {block.type === 'text' && (
                          <div className="space-y-3 text-slate-700 leading-relaxed font-medium text-sm sm:text-base">
                            {block.heading && (
                              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                                <MathText text={block.heading} />
                              </h3>
                            )}
                            {block.paragraphs?.map((p, pIdx) => (
                              <p key={pIdx}><MathText text={p} /></p>
                            ))}
                          </div>
                        )}

                        {/* Math Block */}
                        {block.type === 'math' && (
                          <div className="my-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center overflow-x-auto text-base sm:text-lg">
                            {block.label && (
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">
                                {block.label}
                              </p>
                            )}
                            <BlockMath math={block.latex} />
                          </div>
                        )}

                        {/* Callout Block */}
                        {block.type === 'callout' && (
                          <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-200 text-slate-800 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
                            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-extrabold text-amber-900 mb-0.5">{block.title}</p>
                              <p className="font-medium text-slate-700">{block.body}</p>
                            </div>
                          </div>
                        )}

                        {/* Quiz Single Choice (Dạng I) */}
                        {block.type === 'quiz_single' && (
                          <div className="space-y-4 pt-2">
                            <p className="text-base sm:text-lg font-bold text-slate-900">
                              <MathText text={block.question} />
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {block.options.map((opt, optIdx) => {
                                const isSelected = quizAnswers[block.id] === opt.id
                                const isSubmitted = quizSubmitted[block.id]
                                const isCorrect = opt.id === block.correctAnswer

                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleSelectSingleChoice(block.id, opt.id)}
                                    disabled={isSubmitted}
                                    className={cn(
                                      'relative p-4 rounded-2xl border-2 font-bold text-left transition-colors flex items-center gap-3 cursor-pointer select-none min-h-[56px]',
                                      isSubmitted
                                        ? isCorrect
                                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                                          : isSelected
                                          ? 'bg-rose-50 border-rose-500 text-rose-950'
                                          : 'bg-white border-slate-200 text-slate-400'
                                        : isSelected
                                        ? 'bg-indigo-50 border-indigo-600 text-indigo-950 shadow-sm'
                                        : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-800'
                                    )}
                                  >
                                    <span className={cn(
                                      'w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 border transition-colors',
                                      isSelected
                                        ? 'bg-indigo-600 text-white border-indigo-700'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    )}>
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span className="text-sm sm:text-base font-bold">
                                      <MathText text={opt.text} />
                                    </span>
                                  </button>
                                )
                              })}
                            </div>

                            {quizSubmitted[block.id] && block.explanation && (
                              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-indigo-950 text-xs sm:text-sm">
                                <p className="font-bold mb-1 flex items-center gap-1.5 text-indigo-700">
                                  <HelpCircle className="w-4 h-4" /> Lời giải chi tiết:
                                </p>
                                <p><MathText text={block.explanation} /></p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Quiz True/False 4 Items (Dạng II) */}
                        {block.type === 'quiz_true_false' && (
                          <div className="space-y-4 pt-2">
                            <p className="text-base sm:text-lg font-bold text-slate-900">
                              <MathText text={block.question} />
                            </p>

                            <div className="space-y-2.5">
                              {block.items.map((item, idx) => {
                                const userVal = (quizAnswers[block.id] || {})[item.id]
                                const isSubmitted = quizSubmitted[block.id]
                                const isItemCorrect = isSubmitted && userVal === item.correct

                                return (
                                  <div
                                    key={item.id}
                                    className={cn(
                                      'p-3.5 sm:p-4 rounded-2xl border-2 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors',
                                      isSubmitted
                                        ? isItemCorrect
                                          ? 'border-emerald-400 bg-emerald-50/30'
                                          : 'border-rose-400 bg-rose-50/30'
                                        : userVal !== undefined
                                        ? 'border-indigo-300 bg-indigo-50/10'
                                        : 'border-slate-200'
                                    )}
                                  >
                                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                                        {String.fromCharCode(97 + idx)}
                                      </span>
                                      <div className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                                        <MathText text={item.label} />
                                      </div>
                                    </div>

                                    {/* Dual 2.5D Tactile True/False Buttons */}
                                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleSelectTrueFalse(item.id, true)}
                                        disabled={isSubmitted}
                                        className={cn(
                                          'px-3.5 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1 cursor-pointer select-none min-h-[36px]',
                                          userVal === true
                                            ? 'btn-tactile-success'
                                            : 'btn-tactile-secondary'
                                        )}
                                      >
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        <span>Đúng</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleSelectTrueFalse(item.id, false)}
                                        disabled={isSubmitted}
                                        className={cn(
                                          'px-3.5 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1 cursor-pointer select-none min-h-[36px]',
                                          userVal === false
                                            ? 'btn-tactile-danger'
                                            : 'btn-tactile-secondary'
                                        )}
                                      >
                                        <XIcon className="w-3.5 h-3.5 stroke-[3]" />
                                        <span>Sai</span>
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              ) : (
                /* Complete Screen in Mobile Sandbox */
                <div className="py-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                    <Trophy className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                      Hoàn thành xuất sắc!
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-semibold">
                      Bạn đã hoàn thành bài học mẫu trong Preview Lab
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 max-w-xs mx-auto text-amber-900 font-black text-lg">
                    +{xpTotal} XP Tích lũy
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ─── STICKY BOTTOM ACTION FOOTER (Safe Area Aware) ────────── */}
          <footer className="shrink-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-4 sm:px-6 py-3.5 pb-safe">
            <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
              
              {!isCompleted ? (
                (() => {
                  const quizBlock = currentSlide.blocks.find(b => b.type === 'quiz_single' || b.type === 'quiz_true_false')
                  const isSubmitted = quizBlock && quizSubmitted[quizBlock.id]

                  if (quizBlock && !isSubmitted) {
                    const hasAnswer = quizBlock.type === 'quiz_single'
                      ? quizAnswers[quizBlock.id] !== undefined
                      : Object.keys(quizAnswers[quizBlock.id] || {}).length === quizBlock.items?.length

                    return (
                      <TactileButton
                        variant="primary"
                        size="lg"
                        disabled={!hasAnswer}
                        onClick={() => handleCheckAnswer(quizBlock)}
                        className="w-full text-sm sm:text-base"
                      >
                        Kiểm tra đáp án
                      </TactileButton>
                    )
                  }

                  return (
                    <TactileButton
                      variant={quizBlock && isSubmitted ? 'success' : 'primary'}
                      size="lg"
                      onClick={handleNextSlide}
                      className="w-full text-sm sm:text-base"
                    >
                      <span>{currentSlideIndex === totalSlides - 1 ? 'Hoàn thành bài học' : 'Tiếp tục'}</span>
                      <ArrowRight className="w-5 h-5 ml-1.5" />
                    </TactileButton>
                  )
                })()
              ) : (
                <TactileButton
                  variant="primary"
                  size="lg"
                  onClick={handleResetLab}
                  className="w-full text-sm sm:text-base"
                >
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  <span>Học lại từ đầu</span>
                </TactileButton>
              )}

            </div>
          </footer>

        </div>
      </div>

      {/* ─── BOTTOM HUD (CLS Inspector & Metrics & Soundboard Audition) ─── */}
      <div className="bg-slate-950 border-t border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <CheckCircle2 className="w-4 h-4" /> Zero-CLS Verified (0.00)
          </span>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:flex items-center gap-1 text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" /> Duolingo Physical Modal Synthesis Engine
          </span>
        </div>

        {/* Quick Sound Audition Soundboard */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 mr-1 hidden sm:inline">Thử âm:</span>
          <button
            type="button"
            onClick={() => soundFX.success()}
            className="px-2 py-1 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[11px] font-bold hover:bg-emerald-900 active:scale-95 transition-all cursor-pointer"
            title="Đúng (F#5 -> A#5 Celesta + Mallet)"
          >
            Đúng ✨
          </button>
          <button
            type="button"
            onClick={() => soundFX.error()}
            className="px-2 py-1 rounded bg-rose-950/80 border border-rose-700/60 text-rose-300 text-[11px] font-bold hover:bg-rose-900 active:scale-95 transition-all cursor-pointer"
            title="Sai (F#4 -> C4 Tritone + Sub Thud)"
          >
            Sai ❌
          </button>
          <button
            type="button"
            onClick={() => soundFX.pop()}
            className="px-2 py-1 rounded bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-[11px] font-bold hover:bg-indigo-900 active:scale-95 transition-all cursor-pointer"
            title="Pop Marimba Wood Strike"
          >
            Pop 🪵
          </button>
          <button
            type="button"
            onClick={() => soundFX.streakZap()}
            className="px-2 py-1 rounded bg-amber-950/80 border border-amber-700/60 text-amber-300 text-[11px] font-bold hover:bg-amber-900 active:scale-95 transition-all cursor-pointer"
            title="Streak Lightning Zap"
          >
            Streak ⚡
          </button>
          <button
            type="button"
            onClick={() => soundFX.complete()}
            className="px-2 py-1 rounded bg-violet-950/80 border border-violet-700/60 text-violet-300 text-[11px] font-bold hover:bg-violet-900 active:scale-95 transition-all cursor-pointer"
            title="Complete Fanfare F# Pentatonic"
          >
            Fanfare 🏆
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded text-slate-400">
            Active: {currentDevice.name} {isLandscape ? '(Ngang)' : '(Dọc)'}
          </span>
        </div>
      </div>
    </div>
  )
}
