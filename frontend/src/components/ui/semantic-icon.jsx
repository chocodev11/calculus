import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  Crown,
  Flame,
  Footprints,
  FunctionSquare,
  GraduationCap,
  Layers,
  Medal,
  Rocket,
  Sigma,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react'

const iconProps = {
  'aria-hidden': true,
  focusable: 'false',
}

function normalizeLabel(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function renderIcon(Icon, props) {
  return <Icon {...iconProps} {...props} />
}

export function AchievementIcon({ achievement, ...props }) {
  const type = achievement?.requirement_type
  const value = Number(achievement?.requirement_value || 0)

  if (type === 'xp') {
    if (value >= 10000) return renderIcon(Crown, props)
    if (value >= 5000) return renderIcon(Trophy, props)
    if (value >= 1000) return renderIcon(GraduationCap, props)
    if (value >= 500) return renderIcon(BookOpen, props)
    return renderIcon(Sparkles, props)
  }

  if (type === 'steps') {
    if (value >= 25) return renderIcon(Rocket, props)
    if (value >= 10) return renderIcon(TrendingUp, props)
    if (value >= 5) return renderIcon(Flame, props)
    return renderIcon(Footprints, props)
  }

  if (type === 'streak') {
    if (value >= 100) return renderIcon(Medal, props)
    if (value >= 30) return renderIcon(Star, props)
    if (value >= 7) return renderIcon(Zap, props)
    return renderIcon(Flame, props)
  }

  if (type === 'stories') {
    if (value >= 5) return renderIcon(Crown, props)
    if (value >= 3) return renderIcon(Target, props)
    return renderIcon(CheckCircle2, props)
  }

  return renderIcon(Award, props)
}

export function QuestIcon({ quest, ...props }) {
  const type = quest?.requirement_type

  const icons = {
    lessons: BookOpen,
    quizzes: CheckCircle2,
    study_time: Clock3,
    perfect_quiz: Award,
    streak: Flame,
    slides: Layers,
    course: Trophy,
  }

  return renderIcon(icons[type] || Target, props)
}

export function CourseIcon({ course, ...props }) {
  const label = normalizeLabel(`${course?.slug || ''} ${course?.title || ''}`)
  const Icon = label.includes('dao-ham')
    ? TrendingUp
    : label.includes('tich-phan')
    ? FunctionSquare
    : label.includes('gioi-han')
    ? Target
    : label.includes('menh-de')
    ? Sigma
    : BookOpen

  return renderIcon(Icon, props)
}
