import { resolve } from 'node:path'
import { compileAllCourses } from './mdx_course_compiler'

const repoRoot = resolve(new URL('..', import.meta.url).pathname)

await compileAllCourses({
  sourceDir: resolve(repoRoot, 'frontend/src/content/courses'),
  outputDir: resolve(repoRoot, 'data/courses'),
  write: true,
})
