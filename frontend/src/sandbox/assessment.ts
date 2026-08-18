import api from '../lib/api'

export interface ServerAssessmentItem {
  id: number
}

export interface AssessmentAttemptResult {
  attempt_id: number
  assessment_item_id: number
  correct: boolean
  score: number
  normalized_answer: unknown
  grader_version: string
}

function attemptId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `attempt-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Submit an answer to the server grader; no client-provided score is accepted. */
export function gradeAttempt(
  item: ServerAssessmentItem,
  answer: unknown,
  clientAttemptId = attemptId(),
): Promise<AssessmentAttemptResult> {
  return api.post('/sandbox/assessment/attempts', {
    assessment_item_id: item.id,
    client_attempt_id: clientAttemptId,
    answer,
  }) as Promise<AssessmentAttemptResult>
}
