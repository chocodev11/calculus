/**
 * Course Registry (Content-as-Code)
 *
 * Uses Vite's import.meta.glob for zero-latency indexing and dynamic loading of MDX lessons.
 * Provides instant HMR during authoring.
 */

// Glob all course metadata JSON files
const courseMetaModules = import.meta.glob('../content/courses/*/meta.json', { eager: true })

// Glob all MDX lesson step files (lazy loaded on demand for optimal bundle splitting)
const stepModules = import.meta.glob('../content/courses/*/*.mdx')

export interface StepMeta {
  id: string
  title: string
  description?: string
  order?: number
  xp?: number
  courseSlug: string
  chapterSlug: string
}

export interface Chapter {
  id?: string
  title: string
  slug: string
  description?: string
  order?: number
  step_ids?: string[]
  steps?: StepMeta[]
}

export interface Course {
  id?: string
  title: string
  slug: string
  description?: string
  icon?: string
  grade?: string
  grade_title?: string
  topic?: string
  topic_title?: string
  category_id?: string
  category_slug?: string
  illustration?: string
  color?: string
  difficulty?: string
  level?: string
  order_index?: number
  is_published?: boolean
  is_featured?: boolean
  chapters?: Chapter[]
}

// In-memory indexed courses
let _coursesCache: Course[] | null = null

export function getAllCourses(): Course[] {
  if (_coursesCache) return _coursesCache

  const courses: Course[] = []

  for (const [path, module] of Object.entries(courseMetaModules)) {
    const data = (module as any).default || module
    const courseSlug = data.slug || path.split('/')[3]

    // Enrich steps in chapters
    const chapters = (data.chapters || []).map((ch: any) => {
      const stepIds = ch.step_ids || []
      const steps: StepMeta[] = stepIds.map((stepId: string, idx: number) => ({
        id: stepId,
        title: stepId.replace(/^\d+-/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        order: idx,
        courseSlug,
        chapterSlug: ch.slug || ch.id || 'default'
      }))

      return {
        ...ch,
        steps
      }
    })

    courses.push({
      ...data,
      slug: courseSlug,
      chapters
    })
  }

  _coursesCache = courses
  return courses
}

export function getCourse(slug: string): Course | null {
  const courses = getAllCourses()
  return courses.find(c => c.slug === slug) || null
}

export function getFeaturedCourse(): Course | null {
  const courses = getAllCourses()
  return courses.find(c => c.is_featured) || courses[0] || null
}

export function getFallbackLearningPaths() {
  const courses = getAllCourses()
  const grade10Courses = courses.filter(c => c.grade === '10' || !c.grade)

  return [
    {
      id: 'toan-10',
      grade: '10',
      title: 'Toán Lớp 10',
      description: 'Các chủ điểm kiến thức trọng tâm Toán 10: Mệnh đề, Tập hợp, Bất phương trình...',
      iconUrl: 'https://ds055uzetaobb.cloudfront.net/category-images/Foundations_of_Algebra-6MUKk8.png?width=204',
      courses: grade10Courses.length > 0 ? grade10Courses : courses
    }
  ]
}

export async function getStep(courseSlug: string, stepId: string) {
  // Find step module in glob
  // Path pattern: ../content/courses/{courseSlug}/{stepId}.mdx
  const matchKey = Object.keys(stepModules).find(path => {
    return path.includes(`/content/courses/${courseSlug}/`) && 
           (path.endsWith(`/${stepId}.mdx`) || path.endsWith(`/${stepId}`))
  })

  if (!matchKey) {
    throw new Error(`Step MDX not found for course: ${courseSlug}, stepId: ${stepId}`)
  }

  const moduleLoader = stepModules[matchKey]
  const module = await moduleLoader() as any

  return {
    Component: module.default,
    frontmatter: module.frontmatter || {},
    meta: {
      id: stepId,
      courseSlug,
      ...(module.frontmatter || {})
    }
  }
}
