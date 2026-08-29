import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Compass,
  Lightbulb,
  Sparkles,
} from 'lucide-react'
import * as ReactKatexModule from 'react-katex'
import 'katex/dist/katex.min.css'
import { TactileButton } from '../components/ui/tactile-button'
import LandingMathStage from '../components/landing/LandingMathStage'
import LandingQuizPreview from '../components/landing/LandingQuizPreview'
import { getAllCourses } from '../lib/courseRegistry'

const ReactKatex = ReactKatexModule.default || ReactKatexModule
const { InlineMath } = ReactKatex

const GRADES = ['10', '11', '12']

export default function Landing() {
  const courses = useMemo(
    () => getAllCourses().filter(course => course.is_published !== false),
    [],
  )
  const firstCourse = courses.find(course => course.is_featured) || courses[0] || null
  const [selectedGrade, setSelectedGrade] = useState(firstCourse?.grade || '10')
  const activeCourses = courses.filter(course => course.grade === selectedGrade)
  const activeCourse = activeCourses[0] || null
  const firstCourseStepCount = getCourseStepCount(firstCourse)

  return (
    <div className="w-full overflow-hidden bg-slate-50 font-sans text-slate-900">
      <main>
        <section className="mx-auto w-full max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:pb-28 lg:pt-20" aria-labelledby="landing-title">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.83fr_1.17fr] lg:gap-16">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="max-w-xl"
            >
              <h1 id="landing-title" className="text-4xl font-extrabold leading-[1.08] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
                <span className="block">Chạm để hiểu,</span>
                <span className="block text-indigo-600">Nhìn để tin.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
                Tạm biệt học vẹt. Khám phá bản chất chương trình Toán THPT qua các mô phỏng tương tác, kéo thả trực quan và phản hồi tức thì chuẩn GDPT 2018.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <TactileButton
                  as={Link}
                  to={firstCourse ? `/course/${firstCourse.slug}` : '/explore'}
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Thử bài đầu tiên
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </TactileButton>
                <TactileButton
                  as={Link}
                  to="/explore"
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <Compass className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  Xem các chủ điểm
                </TactileButton>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: 'easeOut' }}
              className="flex justify-center lg:justify-end"
            >
              <LandingMathStage />
            </motion.div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white" aria-label="Thông tin về TiaMath">
          <div className="mx-auto grid max-w-7xl grid-cols-1 sm:grid-cols-3">
            <ProofItem value="3" label="mô phỏng để thử ngay" />
            <ProofItem value={firstCourseStepCount || '0'} label="bước trong bài học đầu" />
            <ProofItem value="Tự thử" label="rồi mới đọc lời giải" last />
          </div>
        </section>

        <section id="learning" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:py-32" aria-labelledby="learning-title">
          <div className="max-w-2xl">
            <h2 id="learning-title" className="text-3xl font-extrabold leading-tight tracking-[-0.025em] sm:text-4xl">
              Học bằng cách nhìn ra điều thay đổi.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
              Mỗi bài học đưa bạn từ một quan sát cụ thể đến cách diễn đạt bằng ký hiệu và lời giải.
            </p>
          </div>

          <div className="mt-20 space-y-24 lg:mt-28 lg:space-y-32">
            <StoryScene
              reverse
              title="Thử một giả thuyết, không chỉ chọn đáp án."
              description="Bài học phản hồi theo thao tác của bạn, để mỗi lần thử đều cho thêm một manh mối."
            >
              <FeedbackVisual />
            </StoryScene>
            <StoryScene
              title="Từ điều nhìn thấy đến điều giải thích được."
              description="Ký hiệu và hình học đứng cạnh nhau, giúp lời giải không bị tách khỏi ý nghĩa của nó."
            >
              <ExplanationVisual />
            </StoryScene>
            <StoryScene
              reverse
              title="Tiến bộ bắt đầu từ một nhịp học vừa sức."
              description="Chọn một chủ điểm, hoàn thành từng bước ngắn và quay lại đúng nơi bạn muốn tiếp tục."
            >
              <PracticeVisual course={firstCourse} totalSteps={firstCourseStepCount || 1} />
            </StoryScene>
          </div>
        </section>

        <LandingQuizPreview />

        <section id="courses" className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:py-32" aria-labelledby="courses-title">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <h2 id="courses-title" className="text-3xl font-extrabold leading-tight tracking-[-0.025em] sm:text-4xl">
                Chọn chủ điểm để bắt đầu.
              </h2>
              <p className="mt-5 text-base leading-relaxed text-slate-600">
                Nội dung được sắp theo chương trình THPT, bắt đầu từ những bài học đã có thể mở ngay.
              </p>
            </div>

            <div className="flex w-full gap-1 rounded-2xl border border-slate-200 bg-white p-1 md:w-auto" role="group" aria-label="Chọn khối THPT">
              {GRADES.map((grade) => {
                const isActive = selectedGrade === grade
                return (
                  <button
                    key={grade}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setSelectedGrade(grade)}
                    className={`min-h-11 flex-1 rounded-xl px-4 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 md:flex-none ${
                      isActive ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    THPT {grade}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-12">
            {activeCourse ? <FeaturedCourse course={activeCourse} /> : <EmptyCourseState grade={selectedGrade} />}
          </div>
        </section>

        <section className="w-full bg-slate-950 text-white" aria-labelledby="closing-title">
          <div className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:pt-28">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
              <div className="max-w-xl">
                <h2 id="closing-title" className="text-3xl font-extrabold leading-tight tracking-[-0.025em] sm:text-4xl">
                  Bắt đầu từ một chủ điểm.
                </h2>
                <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-300">
                  Chọn bài học đầu tiên, thử một ý tưởng và để tiến bộ được xây từ những lần bạn tự kiểm tra.
                </p>
                <TactileButton as={Link} to="/register" variant="primary" size="lg" className="mt-8">
                  Tạo tài khoản miễn phí
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </TactileButton>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8" aria-label="Một cách nhìn về đạo hàm">
                <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-5 text-sm font-semibold text-slate-400">
                  <span>Nhìn thấy giới hạn</span>
                  <span className="text-emerald-400">Δx → 0</span>
                </div>
                <div className="flex min-h-44 items-center justify-center py-8 text-4xl text-white sm:text-5xl">
                  <InlineMath math="\lim_{\Delta x \to 0} \frac{f(1 + \Delta x) - f(1)}{\Delta x} = f'(1)" />
                </div>
                <p className="text-sm leading-relaxed text-slate-400">
                  Một giới hạn không còn là ký hiệu đứng riêng. Bạn có thể kéo nó về gần và quan sát ý nghĩa hình học.
                </p>
              </div>
            </div>

            <footer className="mt-20 flex flex-col gap-5 border-t border-slate-800 py-7 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between lg:mt-28">
              <span className="font-extrabold text-white">TiaMath</span>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Link to="/explore" className="transition-colors hover:text-white">Khám phá</Link>
                <Link to="/login" className="transition-colors hover:text-white">Đăng nhập</Link>
                <span>Học qua mô phỏng và bài học ngắn</span>
              </div>
            </footer>
          </div>
        </section>
      </main>
    </div>
  )
}

function ProofItem({ value, label, last = false }) {
  return (
    <div className={`flex items-center gap-4 px-5 py-5 sm:px-8 sm:py-6 ${last ? '' : 'sm:border-r sm:border-slate-200'} border-b border-slate-200 last:border-b-0 sm:border-b-0`}>
      <span className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{value}</span>
      <span className="text-sm leading-relaxed text-slate-500">{label}</span>
    </div>
  )
}

function StoryScene({ title, description, children, reverse = false }) {
  return (
    <motion.article
      initial={{ opacity: 0, x: reverse ? 24 : -24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-24"
    >
      <div className={reverse ? 'lg:order-2' : ''}>
        <h3 className="max-w-lg text-2xl font-extrabold leading-tight tracking-[-0.02em] sm:text-3xl">{title}</h3>
        <p className="mt-5 max-w-md text-base leading-relaxed text-slate-600">{description}</p>
      </div>
      <div className={reverse ? 'lg:order-1' : ''}>{children}</div>
    </motion.article>
  )
}

function FeedbackVisual() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-extrabold text-slate-900">Bạn dự đoán điều gì?</span>
        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700">Đã kiểm tra</span>
      </div>
      <div className="mt-6 space-y-2.5">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-200 text-xs">A</span>
          Đường cong giữ nguyên
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500 text-white"><Check className="h-4 w-4" aria-hidden="true" /></span>
          Độ dốc thay đổi
        </div>
      </div>
      <div className="mt-6 rounded-2xl bg-emerald-50/70 p-4 text-sm leading-relaxed text-emerald-900">
        <strong className="font-extrabold">Đúng hướng.</strong> Khi tham số đổi, độ dốc của đồ thị cũng đổi theo.
      </div>
    </div>
  )
}

function ExplanationVisual() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
      <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
        <Lightbulb className="h-5 w-5 text-indigo-600" aria-hidden="true" />
        Hình ảnh và ký hiệu cùng nói một điều
      </div>
      <div className="mt-10 text-center text-3xl text-slate-900 sm:text-4xl">
        <InlineMath math="\Delta x \to 0" />
      </div>
      <div className="mx-auto mt-7 h-px w-20 bg-indigo-300" />
      <p className="mx-auto mt-7 max-w-sm text-center text-sm leading-relaxed text-slate-600">
        Khoảng cách thu hẹp dần, cát tuyến tiến gần tiếp tuyến và ý nghĩa của đạo hàm trở nên có thể quan sát.
      </p>
    </div>
  )
}

function PracticeVisual({ course, totalSteps }) {
  const steps = [
    { label: 'Quan sát', state: 'Đã mở' },
    { label: 'Tự thử', state: 'Đang làm' },
    { label: 'Giải thích', state: 'Tiếp theo' },
  ]

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-extrabold text-slate-900">{course?.title || 'Bài học đầu tiên'}</span>
        <span className="text-xs font-bold text-slate-400">Bài 1 / {totalSteps}</span>
      </div>
      <div className="mt-7 space-y-1">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center gap-4 py-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${index < 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              {index < 2 ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
            </span>
            <span className="flex-1 text-sm font-bold text-slate-700">{step.label}</span>
            <span className={`text-xs font-semibold ${index === 1 ? 'text-indigo-600' : 'text-slate-400'}`}>{step.state}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FeaturedCourse({ course }) {
  const stepCount = getCourseStepCount(course)
  const steps = course.chapters?.flatMap(chapter => chapter.steps || []).slice(0, 3) || []

  return (
    <article className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white lg:grid-cols-[0.9fr_1.1fr]">
      <div className="flex min-h-[280px] items-center justify-center bg-indigo-50 p-8 sm:p-12">
        {course.illustration ? (
          <img src={course.illustration} alt={`${course.title} minh họa`} loading="lazy" className="h-44 w-44 object-contain sm:h-56 sm:w-56" />
        ) : (
          <span className="text-6xl font-extrabold text-indigo-600">{course.icon || '∑'}</span>
        )}
      </div>
      <div className="p-6 sm:p-10">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
          <span>{course.grade_title || `THPT ${course.grade}`}</span>
          <span aria-hidden="true">·</span>
          <span>{course.topic_title || course.topic || 'Toán học'}</span>
        </div>
        <h3 className="mt-4 text-2xl font-extrabold leading-tight tracking-[-0.02em] text-slate-900 sm:text-3xl">{course.title}</h3>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">{course.description}</p>

        {steps.length > 0 && (
          <div className="mt-7 space-y-2">
            {steps.map((step, index) => (
              <div key={step.id || step.title} className="flex items-center gap-3 py-2 text-sm text-slate-600">
                <span className="w-5 text-xs font-extrabold tabular-nums text-indigo-600">{String(index + 1).padStart(2, '0')}</span>
                <span>{step.title}</span>
              </div>
            ))}
            {stepCount > steps.length && <span className="block pt-1 text-xs font-semibold text-slate-400">Còn {stepCount - steps.length} bước tiếp theo</span>}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <TactileButton as={Link} to={`/course/${course.slug}`} variant="primary" size="md" className="w-full sm:w-auto">
            Học thử chủ điểm
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </TactileButton>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {stepCount} bước tương tác
          </span>
        </div>
      </div>
    </article>
  )
}

function EmptyCourseState({ grade }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center sm:px-10">
      <Sparkles className="mx-auto h-7 w-7 text-indigo-600" aria-hidden="true" />
      <h3 className="mt-5 text-xl font-extrabold text-slate-900">Nội dung THPT {grade} đang được mở rộng.</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">Bạn có thể bắt đầu với bài học Mệnh đề và Logic đang mở cho THPT 10.</p>
      <TactileButton as={Link} to="/explore" variant="secondary" size="md" className="mt-6">
        Xem nội dung hiện có
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </TactileButton>
    </div>
  )
}

function getCourseStepCount(course) {
  return course?.chapters?.reduce((total, chapter) => total + (chapter.step_ids?.length || chapter.steps?.length || 0), 0) || 0
}
