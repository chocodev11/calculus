import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Smartphone, Tablet, Monitor, RotateCw, Volume2, VolumeX,
  Sparkles, ArrowLeft, ChevronRight
} from 'lucide-react'
import { getAllCourses, getStep } from '../lib/courseRegistry'
import mdxComponents from '../components/mdx'
import soundFX from '../lib/soundEffects'
import { cn } from '../lib/utils'
import ErrorBoundary from '../components/ErrorBoundary'

// Device Viewport Presets for Mobile/Tablet Testing
const DEVICE_PRESETS = [
  { id: 'responsive', name: 'Desktop Fluid', width: '100%', height: '100%', icon: Monitor, type: 'desktop' },
  { id: 'iphone-15', name: 'iPhone 15', width: 393, height: 852, icon: Smartphone, type: 'phone' },
  { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667, icon: Smartphone, type: 'phone' },
  { id: 'ipad-mini', name: 'iPad Mini', width: 768, height: 1024, icon: Tablet, type: 'tablet' },
]

export default function StudioPreview() {
  const { courseSlug: paramCourse, stepId: paramStep } = useParams()
  const navigate = useNavigate()

  const courses = getAllCourses()
  const [selectedCourse, setSelectedCourse] = useState(paramCourse || courses[0]?.slug || '')
  const currentCourse = courses.find(c => c.slug === selectedCourse) || courses[0]

  const availableSteps = currentCourse?.chapters?.flatMap(ch => ch.steps || []) || []
  const [selectedStepId, setSelectedStepId] = useState(paramStep || availableSteps[0]?.id || '')

  const [stepData, setStepData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Emulation & Viewport Settings
  const [currentDevice, setCurrentDevice] = useState(DEVICE_PRESETS[0]) // Responsive by default
  const [isLandscape, setIsLandscape] = useState(false)
  const [zoomScale] = useState(1)
  const [soundEnabled, setSoundEnabled] = useState(soundFX.isSoundEnabled())

  // Load selected step MDX with Vite HMR
  useEffect(() => {
    if (!selectedCourse || !selectedStepId) return
    setLoading(true)
    setError(null)

    getStep(selectedCourse, selectedStepId)
      .then(res => {
        setStepData(res)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError(err.message)
        setLoading(false)
      })
  }, [selectedCourse, selectedStepId])

  // Sync URL when selecting course or step
  const handleCourseChange = (newCourseSlug) => {
    setSelectedCourse(newCourseSlug)
    const c = courses.find(item => item.slug === newCourseSlug)
    const firstStep = c?.chapters?.[0]?.steps?.[0]?.id || ''
    setSelectedStepId(firstStep)
    if (firstStep) {
      navigate(`/studio/${newCourseSlug}/${firstStep}`, { replace: true })
    } else {
      navigate(`/studio`, { replace: true })
    }
  }

  const handleStepChange = (newStepId) => {
    setSelectedStepId(newStepId)
    navigate(`/studio/${selectedCourse}/${newStepId}`, { replace: true })
  }

  const toggleSound = () => {
    const newState = !soundEnabled
    setSoundEnabled(newState)
    soundFX.setSoundEnabled(newState)
    if (newState) soundFX.play('tap')
  }

  const StepComponent = stepData?.Component

  // Calculate viewport dimensions for device frame emulation
  const isDeviceFramed = currentDevice.type !== 'desktop'
  const frameWidth = isDeviceFramed
    ? isLandscape ? currentDevice.height : currentDevice.width
    : '100%'
  const frameHeight = isDeviceFramed
    ? isLandscape ? currentDevice.width : currentDevice.height
    : 'auto'

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      
      {/* ─── Top Studio Navigation Bar ───────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        
        {/* Left: Brand & Return */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Thoát</span>
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-extrabold text-xs flex items-center gap-1.5 border border-indigo-200">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Calculus Studio &amp; Preview
            </span>
          </div>
        </div>

        {/* Center: Device Viewport Controls */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {DEVICE_PRESETS.map(preset => {
            const Icon = preset.icon
            const isSelected = currentDevice.id === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setCurrentDevice(preset)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title={preset.name}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{preset.name}</span>
              </button>
            )
          })}

          {isDeviceFramed && (
            <>
              <div className="h-4 w-px bg-slate-300 mx-1" />
              <button
                type="button"
                onClick={() => setIsLandscape(!isLandscape)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                title="Xoay thiết bị (Portrait / Landscape)"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Right: Course / Lesson Selectors & Tooling */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Course Selector */}
          <select
            value={selectedCourse}
            onChange={(e) => handleCourseChange(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold focus:border-indigo-500 outline-none cursor-pointer"
          >
            {courses.map(c => (
              <option key={c.slug} value={c.slug}>{c.title} ({c.slug})</option>
            ))}
          </select>

          {/* Step Selector */}
          <select
            value={selectedStepId}
            onChange={(e) => handleStepChange(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold focus:border-indigo-500 outline-none cursor-pointer max-w-[200px] truncate"
          >
            {availableSteps.map(s => (
              <option key={s.id} value={s.id}>{s.title || s.id}</option>
            ))}
          </select>
        </div>
      </header>

      {/* ─── Main Workspace & Canvas ─────────────────────────────────── */}
      <main className="flex-1 p-4 md:p-6 flex flex-col items-center justify-start overflow-y-auto">
        {loading && (
          <div className="flex-1 flex items-center justify-center py-24 text-slate-400 font-bold gap-2">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span>Đang tải nội dung MDX trực tiếp (Vite HMR)...</span>
          </div>
        )}

        {error && (
          <div className="w-full max-w-3xl p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 my-8 space-y-2">
            <h3 className="font-extrabold text-base">Lỗi tải bài học</h3>
            <p className="text-xs font-mono bg-white p-3 rounded-xl border border-rose-200">{error}</p>
          </div>
        )}

        {!loading && !error && stepData && (
          <div
            className="w-full transition-all duration-200 flex flex-col items-center"
            style={{
              maxWidth: isDeviceFramed ? `${frameWidth}px` : '56rem', // 56rem = max-w-4xl
              transform: zoomScale !== 1 ? `scale(${zoomScale})` : undefined,
              transformOrigin: 'top center',
            }}
          >
            {/* Emulated Device Frame Outer Border */}
            <div className={cn(
              "w-full bg-white transition-all",
              isDeviceFramed
                ? "rounded-[40px] border-8 border-slate-800 shadow-2xl p-4 sm:p-6 my-4 overflow-hidden"
                : "rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6"
            )}>
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-600 uppercase tracking-wider">
                    <span>{currentCourse?.title}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>{stepData.frontmatter?.id || selectedStepId}</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                    {stepData.frontmatter?.title || selectedStepId}
                  </h1>
                  {stepData.frontmatter?.description && (
                    <p className="text-slate-500 text-xs sm:text-sm max-w-2xl leading-relaxed">
                      {stepData.frontmatter.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 font-extrabold text-xs border border-amber-200">
                    +{stepData.frontmatter?.xp || 100} XP
                  </span>
                </div>
              </div>

              {/* Rendered MDX Content */}
              <div className="pt-2">
                {StepComponent && (
                  <ErrorBoundary>
                    <StepComponent components={mdxComponents} />
                  </ErrorBoundary>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

    </div>
  )
}
