import type { TopicCategory } from '@english-for-kids/shared'
import type { LessonPhase } from './engine'

export type ExerciseDefinition = {
  id: string
  phase: LessonPhase | null
  nameVietnamese: string
  nameEnglish: string
  implemented: boolean
  defaultEnabled: boolean
  categories: TopicCategory[] | 'all'
}

/** Danh mục dạng bài MVP — chỉ các bài `implemented` mới chạy trong buổi học. */
export const EXERCISE_CATALOG: ExerciseDefinition[] = [
  {
    id: 'flashcard',
    phase: 'flashcard',
    nameVietnamese: 'Làm quen từ',
    nameEnglish: 'Flashcard',
    implemented: true,
    defaultEnabled: true,
    categories: 'all',
  },
  {
    id: 'listen-and-choose',
    phase: 'listen-choose',
    nameVietnamese: 'Nghe và chọn hình',
    nameEnglish: 'Listen and choose',
    implemented: true,
    defaultEnabled: true,
    categories: 'all',
  },
  {
    id: 'choose-word',
    phase: 'choose-word',
    nameVietnamese: 'Chọn từ đúng',
    nameEnglish: 'Choose the word',
    implemented: true,
    defaultEnabled: true,
    categories: 'all',
  },
  {
    id: 'yes-no',
    phase: 'yes-no',
    nameVietnamese: 'Yes / No',
    nameEnglish: 'Yes or No',
    implemented: true,
    defaultEnabled: true,
    categories: 'all',
  },
  {
    id: 'match-pair',
    phase: null,
    nameVietnamese: 'Ghép cặp',
    nameEnglish: 'Match pairs',
    implemented: false,
    defaultEnabled: false,
    categories: ['animals', 'food_drinks', 'objects', 'general'],
  },
  {
    id: 'find-picture',
    phase: null,
    nameVietnamese: 'Tìm hình',
    nameEnglish: 'Find the picture',
    implemented: false,
    defaultEnabled: false,
    categories: ['animals', 'food_drinks', 'objects', 'general'],
  },
  {
    id: 'situation',
    phase: null,
    nameVietnamese: 'Câu hỏi tình huống',
    nameEnglish: 'Situation question',
    implemented: false,
    defaultEnabled: false,
    categories: ['actions', 'emotions', 'general'],
  },
  {
    id: 'mini-story',
    phase: null,
    nameVietnamese: 'Câu chuyện ngắn',
    nameEnglish: 'Mini story',
    implemented: false,
    defaultEnabled: false,
    categories: 'all',
  },
  {
    id: 'count-choose',
    phase: null,
    nameVietnamese: 'Đếm và chọn số',
    nameEnglish: 'Count and choose',
    implemented: false,
    defaultEnabled: false,
    categories: ['numbers'],
  },
  {
    id: 'color-shape',
    phase: null,
    nameVietnamese: 'Nhận diện màu / hình',
    nameEnglish: 'Color or shape',
    implemented: false,
    defaultEnabled: false,
    categories: ['colors', 'shapes'],
  },
  {
    id: 'body-tap',
    phase: null,
    nameVietnamese: 'Chạm đúng vị trí',
    nameEnglish: 'Tap the body part',
    implemented: false,
    defaultEnabled: false,
    categories: ['body_parts'],
  },
  {
    id: 'drag-drop',
    phase: null,
    nameVietnamese: 'Kéo và thả',
    nameEnglish: 'Drag and drop',
    implemented: false,
    defaultEnabled: false,
    categories: ['animals', 'food_drinks', 'objects', 'positions', 'general'],
  },
]

export type TopicExerciseConfig = {
  id: string
  topicId: string
  exerciseId: string
  enabled: boolean
  order: number
  source: 'system_default' | 'parent_override'
  schemaVersion: 1
  createdAt: string
  updatedAt: string
}

export function exercisesForCategory(
  category: TopicCategory,
): ExerciseDefinition[] {
  return EXERCISE_CATALOG.filter(
    (exercise) =>
      exercise.categories === 'all' || exercise.categories.includes(category),
  )
}

export function normalizeExerciseId(exerciseId: string): string {
  if (exerciseId === 'listen-choose') return 'listen-and-choose'
  return exerciseId
}

export function phaseForExerciseId(exerciseId: string): LessonPhase | null {
  const normalized = normalizeExerciseId(exerciseId)
  return EXERCISE_CATALOG.find((item) => item.id === normalized)?.phase ?? null
}

export function defaultConfigsForTopic(
  topicId: string,
  category: TopicCategory,
  now = new Date().toISOString(),
): TopicExerciseConfig[] {
  return exercisesForCategory(category).map((exercise, index) => ({
    id: `${topicId}__${exercise.id}`,
    topicId,
    exerciseId: exercise.id,
    enabled: exercise.implemented && exercise.defaultEnabled,
    order: index + 1,
    source: 'system_default',
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
  }))
}

export type GradedPhase = Extract<
  LessonPhase,
  'listen-choose' | 'choose-word' | 'yes-no'
>

const GRADED_ORDER: GradedPhase[] = [
  'listen-choose',
  'choose-word',
  'yes-no',
]

/** Chuỗi bài có chấm điểm đang bật; luôn giữ ít nhất Nghe và chọn. */
export function resolveGradedPhases(
  enabledExerciseIds: string[],
): GradedPhase[] {
  const enabledPhases = new Set<GradedPhase>()
  for (const exerciseId of enabledExerciseIds) {
    const phase = phaseForExerciseId(exerciseId)
    if (phase === 'listen-choose' || phase === 'choose-word' || phase === 'yes-no') {
      enabledPhases.add(phase)
    }
  }
  const phases = GRADED_ORDER.filter((phase) => enabledPhases.has(phase))
  return phases.length > 0 ? phases : ['listen-choose']
}

export function isFlashcardEnabled(enabledExerciseIds: string[]): boolean {
  return enabledExerciseIds
    .map(normalizeExerciseId)
    .includes('flashcard')
}
