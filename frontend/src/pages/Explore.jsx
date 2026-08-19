import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import categoriesData from '../../../data/categories.json'
import { t } from '../lib/locale'
import { Compass, BookOpen, Sparkles, ArrowRight, Layers, GraduationCap } from 'lucide-react'
import { TactileButton } from '../components/ui/tactile-button'

// Load learningPaths directly from project data/categories.json or API
function useLearningPaths() {
  const [learningPaths, setLearningPaths] = useState([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const data = categoriesData
        const raw = data.learningPaths ?? data.learning_paths ?? (Array.isArray(data) ? data : data.categories) ?? []
        const mapped = (raw || []).map(p => ({
          id: p.id ?? p.slug,
          slug: p.slug,
          title: p.title ?? p.name,
          description: p.description ?? p.summary ?? '',
          iconUrl: p.iconUrl ?? p.icon_url ?? p.icon ?? '',
          courses: p.courses ?? []
        }))
        if (mounted) setLearningPaths(mapped)
      } catch (err) {
        console.error('Error loading learning paths:', err)
        if (mounted) setLearningPaths([])
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return learningPaths
}

export default function Explore() {
  const learningPaths = useLearningPaths()

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 font-sans space-y-12 select-none">
      
      {/* ─── Header Banner ────────────────────────────────────────────── */}
      <div className="space-y-3 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-extrabold">
          <Compass className="w-3.5 h-3.5" />
          <span>Lộ trình chinh phục Toán Giải Tích</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {t.explore?.title || 'Khám Phá Các Học Phần'}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
          {t.explore?.subtitle || 'Lộ trình bài bản từ trực quan hình học cơ bản đến kỹ thuật giải tích nâng cao.'}
        </p>
      </div>

      {/* ─── Learning Paths List ──────────────────────────────────────── */}
      <div className="space-y-14">
        {learningPaths.map((path, index) => (
          <div key={path.id || index} className="space-y-6">
            
            {/* Path Header */}
            <div className="flex items-center gap-4">
              {path.iconUrl ? (
                <div className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-200 p-2 shadow-sm shrink-0 flex items-center justify-center">
                  <img src={path.iconUrl} alt={path.title} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
                  <BookOpen className="w-7 h-7" />
                </div>
              )}
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">{path.title}</h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">{path.description}</p>
              </div>
            </div>

            {/* Courses Tray */}
            <div className="bg-slate-100/80 border-2 border-slate-200/80 rounded-3xl p-6 sm:p-8 flex items-center gap-6 overflow-x-auto scrollbar-hide">
              {path.courses.map((course, cIdx) => (
                <div key={course.slug || cIdx} className="flex items-center gap-6 shrink-0">
                  <CourseCard course={course} />
                  {cIdx !== path.courses.length - 1 && (
                    <div className="w-8 h-1 bg-slate-300 rounded-full shrink-0 -translate-y-4 hidden sm:block" />
                  )}
                </div>
              ))}
            </div>

          </div>
        ))}
      </div>

    </div>
  )
}

function CourseCard({ course }) {
  return (
    <Link 
      to={`/course/${course.slug}`} 
      className="flex-shrink-0 w-44 sm:w-48 flex flex-col gap-3 group no-underline"
    >
      {/* Visual Tile */}
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ y: 0 }}
        className="relative w-44 h-44 sm:w-48 sm:h-48 bg-white border-2 border-slate-200 rounded-3xl shadow-[0_6px_0_0_#E2E8F0] group-hover:border-indigo-400 group-hover:shadow-[0_8px_0_0_#C7D2FE] flex flex-col items-center justify-center p-4 transition-all duration-200 cursor-pointer"
      >
        {course.isNew && (
          <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
            {t.explore?.new || 'MỚI'}
          </div>
        )}
        
        {course.illustration ? (
          <img 
            src={course.illustration} 
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
            alt={course.title}
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <GraduationCap className="w-10 h-10" />
          </div>
        )}
      </motion.div>
      
      {/* Title */}
      <div className="text-center font-bold text-sm sm:text-base text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight px-1">
        {course.title}
      </div>
    </Link>
  )
}
