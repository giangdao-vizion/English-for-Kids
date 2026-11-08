import type { TopicCategory } from '@english-for-kids/shared'
import type { LessonPhase } from './engine'

export type ExerciseDefinition = {
  id: string
  phase: LessonPhase | null
  nameVietnamese: string
  nameEnglish: string
  descriptionVietnamese: string
  implemented: boolean
  /** Gắn mặc định khi tạo chủ đề mới. */
  defaultAttached: boolean
  categories: TopicCategory[] | 'all'
}

/** Thư viện dạng bài MVP — dữ liệu tạo câu hỏi đã sẵn cho các bài `implemented`. */
export const EXERCISE_CATALOG: ExerciseDefinition[] = [
  {
    id: 'flashcard',
    phase: 'flashcard',
    nameVietnamese: 'Làm quen từ',
    nameEnglish: 'Flashcard',
    descriptionVietnamese: 'Xem hình, nghe từ và nghĩa trước khi luyện.',
    implemented: true,
    defaultAttached: true,
    categories: 'all',
  },
  {
    id: 'listen-and-choose',
    phase: 'listen-choose',
    nameVietnamese: 'Nghe và chọn hình',
    nameEnglish: 'Listen and choose',
    descriptionVietnamese: 'Nghe từ tiếng Anh rồi chọn đúng hình.',
    implemented: true,
    defaultAttached: true,
    categories: 'all',
  },
  {
    id: 'choose-word',
    phase: 'choose-word',
    nameVietnamese: 'Chọn từ đúng',
    nameEnglish: 'Choose the word',
    descriptionVietnamese: 'Nhìn hình và chọn chữ tiếng Anh đúng.',
    implemented: true,
    defaultAttached: true,
    categories: 'all',
  },
  {
    id: 'yes-no',
    phase: 'yes-no',
    nameVietnamese: 'Yes / No',
    nameEnglish: 'Yes or No',
    descriptionVietnamese: 'Nghe câu hỏi và chọn Yes hoặc No.',
    implemented: true,
    defaultAttached: true,
    categories: 'all',
  },
  {
    id: 'match-pair',
    phase: null,
    nameVietnamese: 'Ghép cặp',
    nameEnglish: 'Match pairs',
    descriptionVietnamese: 'Ghép từ với hình tương ứng.',
    implemented: false,
    defaultAttached: false,
    categories: ['animals', 'food_drinks', 'objects', 'general'],
  },
  {
    id: 'find-picture',
    phase: null,
    nameVietnamese: 'Tìm hình',
    nameEnglish: 'Find the picture',
    descriptionVietnamese: 'Tìm đúng hình theo từ đã nghe.',
    implemented: false,
    defaultAttached: false,
    categories: ['animals', 'food_drinks', 'objects', 'general'],
  },
  {
    id: 'situation',
    phase: null,
    nameVietnamese: 'Câu hỏi tình huống',
    nameEnglish: 'Situation question',
    descriptionVietnamese: 'Trả lời câu hỏi theo hành động hoặc cảm xúc.',
    implemented: false,
    defaultAttached: false,
    categories: ['actions', 'emotions', 'general'],
  },
  {
    id: 'mini-story',
    phase: null,
    nameVietnamese: 'Câu chuyện ngắn',
    nameEnglish: 'Mini story',
    descriptionVietnamese: 'Nghe chuyện ngắn rồi trả lời câu hỏi.',
    implemented: false,
    defaultAttached: false,
    categories: 'all',
  },
  {
    id: 'count-choose',
    phase: null,
    nameVietnamese: 'Đếm và chọn số',
    nameEnglish: 'Count and choose',
    descriptionVietnamese: 'Đếm và chọn đáp án số đúng.',
    implemented: false,
    defaultAttached: false,
    categories: ['numbers'],
  },
  {
    id: 'color-shape',
    phase: null,
    nameVietnamese: 'Nhận diện màu / hình',
    nameEnglish: 'Color or shape',
    descriptionVietnamese: 'Chọn đúng màu sắc hoặc hình dạng.',
    implemented: false,
    defaultAttached: false,
    categories: ['colors', 'shapes'],
  },
  {
    id: 'body-tap',
    phase: null,
    nameVietnamese: 'Chạm đúng vị trí',
    nameEnglish: 'Tap the body part',
    descriptionVietnamese: 'Chạm đúng bộ phận cơ thể được gọi tên.',
    implemented: false,
    defaultAttached: false,
    categories: ['body_parts'],
  },
  {
    id: 'drag-drop',
    phase: null,
    nameVietnamese: 'Kéo và thả',
    nameEnglish: 'Drag and drop',
    descriptionVietnamese: 'Kéo vật vào đúng vị trí hoặc nhóm.',
    implemented: false,
    defaultAttached: false,
    categories: ['animals', 'food_drinks', 'objects', 'positions', 'general'],
  },
]

export type TopicExerciseConfig = {
  id: string
  topicId: string
  exerciseId: string
  enabled: boolean
  order: number
  source: 'system_default' | 'parent_added'
  schemaVersion: 1
  createdAt: string
  updatedAt: string
}

export function normalizeExerciseId(exerciseId: string): string {
  if (exerciseId === 'listen-choose') return 'listen-and-choose'
  return exerciseId
}

export function getExerciseDefinition(
  exerciseId: string,
): ExerciseDefinition | undefined {
  const normalized = normalizeExerciseId(exerciseId)
  return EXERCISE_CATALOG.find((item) => item.id === normalized)
}

export function exercisesForCategory(
  category: TopicCategory,
): ExerciseDefinition[] {
  return EXERCISE_CATALOG.filter(
    (exercise) =>
      exercise.categories === 'all' || exercise.categories.includes(category),
  )
}

export function exerciseFitsCategory(
  exerciseId: string,
  category: TopicCategory,
): boolean {
  const definition = getExerciseDefinition(exerciseId)
  if (!definition) return false
  return (
    definition.categories === 'all' ||
    definition.categories.includes(category)
  )
}

export function defaultConfigsForTopic(
  topicId: string,
  category: TopicCategory,
  now = new Date().toISOString(),
): TopicExerciseConfig[] {
  return exercisesForCategory(category)
    .filter((exercise) => exercise.implemented && exercise.defaultAttached)
    .map((exercise, index) => ({
      id: `${topicId}__${exercise.id}`,
      topicId,
      exerciseId: exercise.id,
      enabled: true,
      order: index + 1,
      source: 'system_default' as const,
      schemaVersion: 1 as const,
      createdAt: now,
      updatedAt: now,
    }))
}

/** Bài trong thư viện có thể thêm vào chủ đề (đã sẵn sàng, phù hợp, chưa gắn). */
export function addableExercisesForTopic(
  category: TopicCategory,
  attachedExerciseIds: string[],
): ExerciseDefinition[] {
  const attached = new Set(attachedExerciseIds.map(normalizeExerciseId))
  return exercisesForCategory(category).filter(
    (exercise) => exercise.implemented && !attached.has(exercise.id),
  )
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

/** Chuỗi bài có chấm điểm đang gắn; luôn giữ ít nhất Nghe và chọn. */
export function resolveGradedPhases(
  enabledExerciseIds: string[],
): GradedPhase[] {
  const enabledPhases = new Set<GradedPhase>()
  for (const exerciseId of enabledExerciseIds) {
    const phase = getExerciseDefinition(exerciseId)?.phase ?? null
    if (
      phase === 'listen-choose' ||
      phase === 'choose-word' ||
      phase === 'yes-no'
    ) {
      enabledPhases.add(phase)
    }
  }
  const phases = GRADED_ORDER.filter((phase) => enabledPhases.has(phase))
  return phases.length > 0 ? phases : ['listen-choose']
}

export function isFlashcardEnabled(enabledExerciseIds: string[]): boolean {
  return enabledExerciseIds.map(normalizeExerciseId).includes('flashcard')
}

export function isGradedExercise(exerciseId: string): boolean {
  const phase = getExerciseDefinition(exerciseId)?.phase
  return (
    phase === 'listen-choose' || phase === 'choose-word' || phase === 'yes-no'
  )
}
