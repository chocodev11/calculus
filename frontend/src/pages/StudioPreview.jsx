import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  Smartphone, Tablet, Monitor, RotateCw, Volume2, VolumeX,
  Sparkles, ArrowLeft, ChevronRight, ChevronLeft
} from 'lucide-react'
import api, { formatErrorDetail } from '../lib/api'
import { getAllCourses } from '../lib/courseRegistry'
import { materializeAssessmentPools } from '../lib/lessonScheme'
import { cleanLessonCopy, prepareReaderSlides } from '../lib/lessonPresentation'
import { BlockRenderer } from './Step'
import soundFX from '../lib/soundEffects'
import ErrorBoundary from '../components/ErrorBoundary'
import { cn } from '../lib/utils'

const DEVICE_PRESETS = [
  { id: 'responsive', name: 'Desktop Fluid', width: '100%', height: '100%', icon: Monitor, type: 'desktop' },
  { id: 'iphone-15', name: 'iPhone 15', width: 393, height: 852, icon: Smartphone, type: 'phone' },
  { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667, icon: Smartphone, type: 'phone' },
  { id: 'ipad-mini', name: 'iPad Mini', width: 768, height: 1024, icon: Tablet, type: 'tablet' },
]

function stepMatches(step, requestedId) {
  const id = String(requestedId || '')
  return String(step.id) === id
    || String(step.content_key || '').endsWith(`/${id}`)
    || String(step.title || '').toLowerCase() === id.toLowerCase()
}

function PreviewLesson({ content }) {
  const slides = useMemo(
    () => prepareReaderSlides(materializeAssessmentPools(content?.slides || [])),
    [content]
  )
  const [slideIndex, setSlideIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState({})

  useEffect(() => {
    setSlideIndex(0)
    setQuizAnswers({})
  }, [content])

  const slide = slides[slideIndex]
  if (!slide) return <p className="text-sm font-bold text-slate-500">Bản nháp chưa có slide.</p>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600">
            {slide.presentationKind === 'theory' ? 'Lý thuyết' : 'Bài tập'}
            {slide.readerSection?.total > 1
              ? ` · Phần ${slide.readerSection.index}/${slide.readerSection.total}`
              : ` · ${slideIndex + 1}/${slides.length}`}
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">{slide.title || slide.id}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={slideIndex === 0}
            onClick={() => setSlideIndex(index => index - 1)}
            className="rounded-xl border border-slate-200 p-2 text-slate-600 disabled:opacity-40"
            aria-label="Slide trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={slideIndex === slides.length - 1}
            onClick={() => setSlideIndex(index => index + 1)}
            className="rounded-xl border border-slate-200 p-2 text-slate-600 disabled:opacity-40"
            aria-label="Slide tiếp theo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {slide.blocks.map((block, blockIndex) => (
          <ErrorBoundary key={block.id || `${slide.id}-${blockIndex}`}>
            <BlockRenderer
              block={block}
              quizAnswer={quizAnswers[block.id]}
              quizSubmitted={false}
              quizResult={null}
              onQuizAnswer={(answer) => setQuizAnswers(previous => ({ ...previous, [block.id]: answer }))}
              onQuizSubmit={() => {}}
              onQuizRetry={() => setQuizAnswers(previous => ({ ...previous, [block.id]: null }))}
            />
          </ErrorBoundary>
        ))}
      </div>
    </div>
  )
}

export default function StudioPreview() {
  const { courseSlug: paramCourse, stepId: paramStep } = useParams()
  const navigate = useNavigate()
  const courses = getAllCourses()
  const [selectedCourse, setSelectedCourse] = useState(paramCourse || courses[0]?.slug || '')
  const [selectedStepId, setSelectedStepId] = useState(paramStep || '')
  const [courseData, setCourseData] = useState(null)
  const [stepData, setStepData] = useState(null)
  const [content, setContent] = useState(null)
  const [contentStatus, setContentStatus] = useState('published')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentDevice, setCurrentDevice] = useState(DEVICE_PRESETS[0])
  const [isLandscape, setIsLandscape] = useState(false)
  const [sfxEnabled, setSfxEnabled] = useState(soundFX.isSfxEnabled())
  const [hapticsEnabled, setHapticsEnabled] = useState(soundFX.isHapticsEnabled())
  const [sfxVolume, setSfxVolume] = useState(soundFX.getSfxVolume())

  const availableSteps = courseData?.chapters?.flatMap(chapter => chapter.steps || []) || []
  const selectedStep = availableSteps.find(step => stepMatches(step, selectedStepId))
  const activeStepId = selectedStep?.id

  useEffect(() => {
    let cancelled = false
    async function loadCourse() {
      setError(null)
      try {
        const response = await api.get(`/courses/${selectedCourse}`, { redirectOnUnauthorized: false })
        if (cancelled) return
        setCourseData(response)
        const steps = response.chapters?.flatMap(chapter => chapter.steps || []) || []
        const requested = steps.find(step => stepMatches(step, selectedStepId)) || steps[0]
        if (requested && String(requested.id) !== String(selectedStepId)) {
          setSelectedStepId(String(requested.id))
          navigate(`/studio/${selectedCourse}/${requested.id}`, { replace: true })
        }
      } catch (requestError) {
        if (!cancelled) setError(formatErrorDetail(requestError?.message || requestError))
      }
    }
    if (selectedCourse) loadCourse()
    return () => { cancelled = true }
  }, [navigate, selectedCourse])

  useEffect(() => {
    let cancelled = false
    async function loadLesson() {
      if (!activeStepId) return
      setLoading(true)
      setError(null)
      try {
        const details = await api.get(`/steps/${activeStepId}`, { redirectOnUnauthorized: false })
        let lessonContent
        let status = 'published'
        try {
          const draftPreview = await api.get(`/admin/lessons/${activeStepId}/preview`, { redirectOnUnauthorized: false })
          lessonContent = draftPreview.content
          status = draftPreview.version?.status || 'draft'
        } catch (draftError) {
          if (draftError?.name === 'AbortError') throw draftError
          if (draftError?.status && ![401, 403, 404].includes(draftError.status)) throw draftError
          const slides = await api.get(`/steps/${activeStepId}/slides`, { redirectOnUnauthorized: false })
          lessonContent = {
            schema_version: 'lesson-1',
            id: details.content_key?.split('/').pop() || String(details.id),
            content_key: details.content_key,
            title: details.title,
            description: details.description || '',
            course_slug: selectedCourse,
            chapter_slug: details.chapter_title || 'default',
            slides: Array.isArray(slides) ? slides : slides?.data || [],
          }
          status = 'published'
        }
        if (cancelled) return
        setStepData(details)
        setContent(lessonContent)
        setContentStatus(status)
      } catch (requestError) {
        if (!cancelled) setError(formatErrorDetail(requestError?.message || requestError))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadLesson()
    return () => { cancelled = true }
  }, [activeStepId, selectedCourse])

  const handleCourseChange = (courseSlug) => {
    setSelectedCourse(courseSlug)
    setCourseData(null)
    setSelectedStepId('')
    navigate(`/studio/${courseSlug}`, { replace: true })
  }

  const handleStepChange = (stepId) => {
    setSelectedStepId(String(stepId))
    navigate(`/studio/${selectedCourse}/${stepId}`, { replace: true })
  }

  const toggleSfx = () => {
    const next = soundFX.toggleSfx()
    setSfxEnabled(next)
    if (next) soundFX.play('tap')
  }

  const toggleHaptics = () => {
    setHapticsEnabled(soundFX.toggleHaptics())
  }

  const handleVolumeChange = (event) => {
    setSfxVolume(soundFX.setSfxVolume(event.target.value))
  }

  const isDeviceFramed = currentDevice.type !== 'desktop'
  const frameWidth = isDeviceFramed
    ? isLandscape ? currentDevice.height : currentDevice.width
    : '100%'
  const frameHeight = isDeviceFramed
    ? isLandscape ? currentDevice.width : currentDevice.height
    : 'auto'

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 font-sans text-slate-900">
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Link to="/" className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-500">
            <ArrowLeft className="h-3.5 w-3.5" /> Thoát
          </Link>
          <span className="rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-extrabold text-indigo-700">
            <Sparkles className="mr-1 inline h-3.5 w-3.5" /> JSON Lesson Studio
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
          {DEVICE_PRESETS.map(preset => {
            const Icon = preset.icon
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setCurrentDevice(preset)}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold',
                  currentDevice.id === preset.id ? 'border border-slate-200 bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{preset.name}</span>
              </button>
            )
          })}
          {isDeviceFramed && (
            <button type="button" onClick={() => setIsLandscape(value => !value)} className="rounded-lg p-1 text-slate-500" title="Xoay thiết bị">
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-1.5 py-1">
            <button
              type="button"
              onClick={toggleSfx}
              aria-label={sfxEnabled ? 'Tắt hiệu ứng âm thanh' : 'Bật hiệu ứng âm thanh'}
              aria-pressed={sfxEnabled}
              className="flex min-h-10 min-w-10 items-center justify-center rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300"
            >
              {sfxEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
            <label className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
              <span className="hidden md:inline">Âm lượng</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={sfxVolume}
                onChange={handleVolumeChange}
                aria-label="Âm lượng hiệu ứng âm thanh"
                className="h-1.5 w-14 accent-indigo-600 sm:w-16"
              />
              <span className="hidden w-7 text-right tabular-nums sm:inline">{Math.round(sfxVolume * 100)}%</span>
            </label>
            <button
              type="button"
              onClick={toggleHaptics}
              aria-label={hapticsEnabled ? 'Tắt rung phản hồi' : 'Bật rung phản hồi'}
              aria-pressed={hapticsEnabled}
              className={`min-h-10 rounded-lg px-2 text-[11px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300 ${
                hapticsEnabled ? 'bg-white text-indigo-700' : 'text-slate-400 hover:bg-white hover:text-slate-600'
              }`}
            >
              Rung
            </button>
          </div>
          <select value={selectedCourse} onChange={event => handleCourseChange(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold">
            {courses.map(course => <option key={course.slug} value={course.slug}>{course.title}</option>)}
          </select>
          <select value={selectedStepId} onChange={event => handleStepChange(event.target.value)} className="max-w-[220px] truncate rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold">
            {availableSteps.map(step => <option key={step.id} value={step.id}>{step.title || step.id}</option>)}
          </select>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center overflow-y-auto p-4 md:p-6">
        {loading && <div className="py-24 text-sm font-bold text-slate-400">Đang tải lesson JSON…</div>}
        {error && !loading && <div className="my-8 w-full max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-800">{error}</div>}
        {!loading && !error && content && (
          <div className="w-full" style={{ maxWidth: isDeviceFramed ? `${frameWidth}px` : '56rem', minHeight: isDeviceFramed ? `${frameHeight}px` : undefined }}>
            <div className={cn(
              'w-full bg-white transition-all',
              isDeviceFramed ? 'my-4 overflow-hidden rounded-[40px] border-8 border-slate-800 p-4 shadow-2xl sm:p-6' : 'rounded-3xl border border-slate-200 p-6 shadow-sm md:p-8'
            )}>
              <div className="mb-5 flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-indigo-600">
                    <span>{courseData?.title || selectedCourse}</span><ChevronRight className="h-3.5 w-3.5" /><span>{stepData?.content_key || selectedStepId}</span>
                  </div>
                  <h1 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{content.title || stepData?.title}</h1>
                  {content.description && <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 sm:text-sm">{cleanLessonCopy(content.description)}</p>}
                </div>
                <span className={cn(
                  'shrink-0 rounded-xl border px-2.5 py-1 text-xs font-extrabold',
                  contentStatus === 'draft' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                )}>
                  {contentStatus === 'draft' ? 'DRAFT PREVIEW' : 'PUBLISHED'}
                </span>
              </div>
              <PreviewLesson content={content} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
