import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, ArrowLeft, ArrowRight, BookOpen, Layers,
  Code2, Eye, RefreshCw, CheckCircle2, ChevronRight, Play
} from 'lucide-react'
import { getAllCourses, getStep } from '../lib/courseRegistry'
import mdxComponents, { Slide } from '../components/mdx'
import { TactileButton } from '../components/ui/tactile-button'
import { cn } from '../lib/utils'

export default function StudioPreview() {
  const { courseSlug: paramCourse, stepId: paramStep } = useParams()
  const navigate = useNavigate()

  const courses = getAllCourses()
  const [selectedCourse, setSelectedCourse] = useState(paramCourse || courses[0]?.slug || '')
  const currentCourse = courses.find(c => c.slug === selectedCourse) || courses[0]

  const availableSteps = currentCourse?.chapters?.flatMap(ch => ch.steps || []) || []
  const [selectedStepId, setSelectedStepId] = useState(paramStep || availableSteps[0]?.id || '')

  const [stepData, setStepData] = useState(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load selected step MDX
  useEffect(() => {
    if (!selectedCourse || !selectedStepId) return
    setLoading(true)
    setError(null)

    getStep(selectedCourse, selectedStepId)
      .then(res => {
        setStepData(res)
        setCurrentSlide(0)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError(err.message)
        setLoading(false)
      })
  }, [selectedCourse, selectedStepId])

  // Keyboard navigation for slides
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        handleNextSlide()
      } else if (e.key === 'ArrowLeft') {
        handlePrevSlide()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentSlide, stepData])

  const StepComponent = stepData?.Component

  // In MDX, children of the root component can be inspected or rendered slide by slide
  const handleNextSlide = () => {
    setCurrentSlide(prev => prev + 1)
  }

  const handlePrevSlide = () => {
    setCurrentSlide(prev => Math.max(0, prev - 1))
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Studio Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Thoát Studio</span>
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Content-as-Code Studio (Vite HMR)
            </span>
          </div>
        </div>

        {/* Selectors */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Course Selector */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-bold text-slate-500">Khóa học:</label>
            <select
              value={selectedCourse}
              onChange={(e) => {
                const newCourse = e.target.value
                setSelectedCourse(newCourse)
                const c = courses.find(item => item.slug === newCourse)
                const firstStep = c?.chapters?.[0]?.steps?.[0]?.id || ''
                setSelectedStepId(firstStep)
              }}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs font-bold focus:border-indigo-500 outline-none cursor-pointer"
            >
              {courses.map(c => (
                <option key={c.slug} value={c.slug}>{c.title} ({c.slug})</option>
              ))}
            </select>
          </div>

          {/* Step Selector */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-bold text-slate-500">Bài học:</label>
            <select
              value={selectedStepId}
              onChange={(e) => setSelectedStepId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs font-bold focus:border-indigo-500 outline-none cursor-pointer max-w-[220px] truncate"
            >
              {availableSteps.map(s => (
                <option key={s.id} value={s.id}>{s.title || s.id}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main Studio View */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 flex flex-col">
        {loading && (
          <div className="flex-1 flex items-center justify-center py-20 text-slate-400 font-bold">
            Đang tải bài học MDX...
          </div>
        )}

        {error && (
          <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 my-8">
            <h3 className="font-black text-lg mb-2">Lỗi tải bài học</h3>
            <p className="text-sm font-mono">{error}</p>
          </div>
        )}

        {!loading && !error && stepData && (
          <div className="space-y-6">
            {/* Step Header */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                  <span>{currentCourse?.title}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>{stepData.frontmatter?.id || selectedStepId}</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100">
                  {stepData.frontmatter?.title || selectedStepId}
                </h1>
                {stepData.frontmatter?.description && (
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-2xl">
                    {stepData.frontmatter.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-black text-xs border border-amber-200 dark:border-amber-800">
                  +{stepData.frontmatter?.xp || 100} XP
                </span>
              </div>
            </div>

            {/* Rendered MDX Container */}
            <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-sm min-h-[500px]">
              {StepComponent && (
                <StepComponent components={mdxComponents} />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
