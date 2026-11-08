import Dexie, { type EntityTable } from 'dexie'
import {
  SCHEMA_VERSION,
  type AppSettings,
  type ChildProfile,
  type Flashcard,
  type Topic,
  type TopicCategory,
  type WordProgress,
} from '@english-for-kids/shared'
import {
  ANIMALS_TOPIC_ID,
  ANIMALS_TOPIC_NAME,
  ANIMALS_TOPIC_NAME_VI,
  animalCards,
} from './sample/animals'
import {
  createInitialProgress,
  finalCheckpointFor,
  type LessonProgress,
} from './lesson/engine'
import {
  addableExercisesForTopic,
  defaultConfigsForTopic,
  exerciseFitsCategory,
  getExerciseDefinition,
  isFlashcardEnabled,
  isGradedExercise,
  resolveGradedPhases,
  type TopicExerciseConfig,
} from './lesson/exercises'
import type { LessonCard } from './lesson/types'
import {
  colorForWord,
  type StoredImage,
} from './images'

export const DATABASE_NAME = 'english-for-kids'
export const PROFILE_ID = 'primary-child'
export const SETTINGS_ID = 'app-settings'
export const ACTIVE_TOPIC_KEY = 'active-topic-id'
export const SEEN_LESSON_INTROS_KEY = 'seen-lesson-intros'

type LessonRecord = LessonProgress & {
  id: string
  schemaVersion: typeof SCHEMA_VERSION
  createdAt: string
}

type MetaRecord = {
  id: string
  value: string
  updatedAt: string
}

export type DraftFlashcard = {
  localId: string
  fileName: string
  previewUrl: string
  image: StoredImage
  word: string
  meaningVietnamese: string
  removed: boolean
}

export type GiftItem = {
  id: string
  schemaVersion: typeof SCHEMA_VERSION
  name: string
  starCost: number
  stock: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export type RedeemRequest = {
  id: string
  schemaVersion: typeof SCHEMA_VERSION
  giftId: string
  giftName: string
  starCost: number
  status: 'pending' | 'approved' | 'deferred'
  createdAt: string
  updatedAt: string
}

export class EnglishForKidsDatabase extends Dexie {
  profiles!: EntityTable<ChildProfile, 'id'>
  settings!: EntityTable<AppSettings, 'id'>
  topics!: EntityTable<Topic, 'id'>
  cards!: EntityTable<Flashcard, 'id'>
  wordProgress!: EntityTable<WordProgress, 'id'>
  lessons!: EntityTable<LessonRecord, 'id'>
  images!: EntityTable<StoredImage, 'id'>
  meta!: EntityTable<MetaRecord, 'id'>
  gifts!: EntityTable<GiftItem, 'id'>
  redeemRequests!: EntityTable<RedeemRequest, 'id'>
  exerciseConfigs!: EntityTable<TopicExerciseConfig, 'id'>

  constructor(databaseName = DATABASE_NAME) {
    super(databaseName)

    this.version(1).stores({
      profiles: 'id, lastActiveAt',
      settings: 'id',
      topics: 'id, status, addedMonth, lastStudiedAt',
      cards: 'id, topicId, normalizedWord, parentConfirmed',
      wordProgress: 'id, [profileId+cardId], state, nextReviewAt, lastSeenAt',
      lessons: 'id, topicId, completed, updatedAt',
    })

    this.version(2).stores({
      profiles: 'id, lastActiveAt',
      settings: 'id',
      topics: 'id, status, addedMonth, lastStudiedAt',
      cards: 'id, topicId, normalizedWord, parentConfirmed',
      wordProgress: 'id, [profileId+cardId], state, nextReviewAt, lastSeenAt',
      lessons: 'id, topicId, completed, updatedAt',
      images: 'id, kind',
      meta: 'id',
    })

    this.version(3).stores({
      profiles: 'id, lastActiveAt',
      settings: 'id',
      topics: 'id, status, addedMonth, lastStudiedAt',
      cards: 'id, topicId, normalizedWord, parentConfirmed',
      wordProgress: 'id, [profileId+cardId], state, nextReviewAt, lastSeenAt',
      lessons: 'id, topicId, completed, updatedAt',
      images: 'id, kind',
      meta: 'id',
      gifts: 'id, active',
      redeemRequests: 'id, status, createdAt',
    })

    this.version(4).stores({
      profiles: 'id, lastActiveAt',
      settings: 'id',
      topics: 'id, status, addedMonth, lastStudiedAt',
      cards: 'id, topicId, normalizedWord, parentConfirmed',
      wordProgress: 'id, [profileId+cardId], state, nextReviewAt, lastSeenAt',
      lessons: 'id, topicId, completed, updatedAt',
      images: 'id, kind',
      meta: 'id',
      gifts: 'id, active',
      redeemRequests: 'id, status, createdAt',
      exerciseConfigs: 'id, topicId, exerciseId, [topicId+exerciseId]',
    })
  }
}

export const db = new EnglishForKidsDatabase()

function timestamp(): string {
  return new Date().toISOString()
}

function currentMonth(): string {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}`
}

function lessonIdFor(topicId: string, mode: 'learn' | 'review' = 'learn'): string {
  return mode === 'review' ? `review-${topicId}` : `lesson-${topicId}`
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export async function getAppSettings(): Promise<AppSettings | undefined> {
  return db.settings.get(SETTINGS_ID)
}

export async function createProfile(
  displayName: string,
  avatarImageId: string,
): Promise<ChildProfile> {
  const now = timestamp()
  const profile: ChildProfile = {
    id: PROFILE_ID,
    schemaVersion: SCHEMA_VERSION,
    displayName: displayName.trim(),
    avatarImageId,
    totalStars: 0,
    lastActiveAt: now,
    createdAt: now,
    updatedAt: now,
  }

  await db.profiles.put(profile)

  const existingSettings = await db.settings.get(SETTINGS_ID)
  if (!existingSettings) {
    const settings: AppSettings = {
      id: SETTINGS_ID,
      schemaVersion: SCHEMA_VERSION,
      englishVoice: 'en-US',
      vietnameseVoice: 'vi-VN',
      speechRate: 0.85,
      readVietnameseMeaning: true,
      wordsPerCheckpoint: 5,
      lastBackupAt: null,
      createdAt: now,
      updatedAt: now,
    }
    await db.settings.put(settings)
  }

  await ensureAnimalsDemoTopic()
  await ensureDefaultGifts()
  await setActiveTopicId(ANIMALS_TOPIC_ID)
  return profile
}

export async function ensureDefaultGifts(): Promise<void> {
  const count = await db.gifts.count()
  if (count > 0) {
    return
  }
  const now = timestamp()
  await db.gifts.bulkPut([
    {
      id: 'gift-sticker',
      schemaVersion: SCHEMA_VERSION,
      name: 'Sticker dễ thương',
      starCost: 3,
      stock: 10,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'gift-candy',
      schemaVersion: SCHEMA_VERSION,
      name: 'Kẹo trái cây',
      starCost: 5,
      stock: 8,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'gift-toy',
      schemaVersion: SCHEMA_VERSION,
      name: 'Đồ chơi nhỏ',
      starCost: 10,
      stock: 3,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ])
}

export async function loadProfile(): Promise<ChildProfile | undefined> {
  return db.profiles.get(PROFILE_ID)
}

export async function ensureAnimalsDemoTopic(): Promise<Topic> {
  const existing = await db.topics.get(ANIMALS_TOPIC_ID)
  if (existing) {
    await ensureExerciseConfigsForTopic(existing)
    return existing
  }

  const now = timestamp()
  const topic: Topic = {
    id: ANIMALS_TOPIC_ID,
    schemaVersion: SCHEMA_VERSION,
    analysisBatchId: 'seed-animals',
    nameEnglish: ANIMALS_TOPIC_NAME,
    nameVietnamese: ANIMALS_TOPIC_NAME_VI,
    category: 'animals',
    addedMonth: currentMonth(),
    cardIds: animalCards.map((card) => card.id),
    status: 'active',
    completedAt: null,
    lastStudiedAt: null,
    lastReviewedAt: null,
    aiConfidence: 1,
    parentConfirmed: true,
    createdAt: now,
    updatedAt: now,
  }

  const cards: Flashcard[] = animalCards.map((card) => ({
    id: card.id,
    schemaVersion: SCHEMA_VERSION,
    topicId: ANIMALS_TOPIC_ID,
    sourceImageId: card.id,
    optimizedImageId: card.id,
    thumbnailImageId: card.id,
    cropBox: null,
    word: card.word,
    normalizedWord: card.word,
    meaningVietnamese: card.meaningVietnamese,
    partOfSpeech: 'noun',
    imageDescription: card.word,
    tags: ['animal'],
    exampleEnglish: card.exampleEnglish,
    exampleVietnamese: card.exampleVietnamese,
    trueStatement: card.exampleEnglish,
    falseStatement: `This is not a ${card.word}.`,
    situationQuestion: null,
    compatibleExerciseIds: ['flashcard', 'listen-and-choose'],
    aiConfidence: 1,
    reviewFlags: [],
    parentConfirmed: true,
    parentEdited: false,
    createdAt: now,
    updatedAt: now,
  }))

  await db.transaction(
    'rw',
    db.topics,
    db.cards,
    db.exerciseConfigs,
    async () => {
      await db.topics.put(topic)
      await db.cards.bulkPut(cards)
      await db.exerciseConfigs.bulkPut(
        defaultConfigsForTopic(ANIMALS_TOPIC_ID, 'animals', now),
      )
    },
  )

  return topic
}

function sortExerciseConfigs(
  configs: TopicExerciseConfig[],
): TopicExerciseConfig[] {
  return [...configs].sort((left, right) => left.order - right.order)
}

function assertHasGradedExercise(configs: TopicExerciseConfig[]): void {
  const graded = configs.filter(
    (config) =>
      config.enabled &&
      getExerciseDefinition(config.exerciseId)?.implemented &&
      isGradedExercise(config.exerciseId),
  )
  if (graded.length === 0) {
    throw new Error('Cần giữ ít nhất một dạng bài có chấm điểm.')
  }
}

export async function ensureExerciseConfigsForTopic(
  topic: Topic,
): Promise<TopicExerciseConfig[]> {
  const existing = await db.exerciseConfigs
    .where('topicId')
    .equals(topic.id)
    .toArray()

  if (existing.length === 0) {
    const seeded = defaultConfigsForTopic(topic.id, topic.category)
    await db.exerciseConfigs.bulkPut(seeded)
    return sortExerciseConfigs(seeded)
  }

  // Dọn các dạng "Sắp có" từng gắn mặc định; chỉ giữ bài sẵn sàng.
  const stale = existing.filter((config) => {
    const definition = getExerciseDefinition(config.exerciseId)
    return !definition?.implemented
  })
  if (stale.length > 0) {
    await db.exerciseConfigs.bulkDelete(stale.map((item) => item.id))
  }
  const ready = existing.filter((config) => {
    const definition = getExerciseDefinition(config.exerciseId)
    return Boolean(definition?.implemented)
  })
  if (ready.length === 0) {
    const seeded = defaultConfigsForTopic(topic.id, topic.category)
    await db.exerciseConfigs.bulkPut(seeded)
    return sortExerciseConfigs(seeded)
  }
  return sortExerciseConfigs(ready)
}

export async function listExerciseConfigs(
  topicId: string,
): Promise<TopicExerciseConfig[]> {
  const topic = await db.topics.get(topicId)
  if (!topic) {
    return []
  }
  return ensureExerciseConfigsForTopic(topic)
}

export async function listAllExerciseConfigs(): Promise<
  Record<string, TopicExerciseConfig[]>
> {
  const topics = await listTopics()
  const result: Record<string, TopicExerciseConfig[]> = {}
  for (const topic of topics) {
    result[topic.id] = await ensureExerciseConfigsForTopic(topic)
  }
  return result
}

export async function setTopicExerciseEnabled(
  topicId: string,
  exerciseId: string,
  enabled: boolean,
): Promise<TopicExerciseConfig[]> {
  const topic = await db.topics.get(topicId)
  if (!topic) {
    throw new Error('Không tìm thấy chủ đề.')
  }
  const definition = getExerciseDefinition(exerciseId)
  if (!definition?.implemented) {
    throw new Error('Dạng bài này chưa sẵn sàng.')
  }

  const configs = await ensureExerciseConfigsForTopic(topic)
  const normalized = normalizeExerciseId(exerciseId)
  if (!configs.some((config) => config.exerciseId === normalized)) {
    throw new Error('Dạng bài chưa được gắn vào chủ đề.')
  }

  const now = timestamp()
  const next = configs.map((config) =>
    config.exerciseId === normalized
      ? {
          ...config,
          enabled,
          updatedAt: now,
        }
      : config,
  )
  assertHasGradedExercise(next)
  await db.exerciseConfigs.bulkPut(next)
  return sortExerciseConfigs(next)
}

function normalizeExerciseId(exerciseId: string): string {
  return exerciseId === 'listen-choose' ? 'listen-and-choose' : exerciseId
}

export async function addTopicExercise(
  topicId: string,
  exerciseId: string,
): Promise<TopicExerciseConfig[]> {
  const topic = await db.topics.get(topicId)
  if (!topic) {
    throw new Error('Không tìm thấy chủ đề.')
  }
  const definition = getExerciseDefinition(exerciseId)
  if (!definition?.implemented) {
    throw new Error('Dạng bài này chưa sẵn sàng để thêm.')
  }
  if (!exerciseFitsCategory(exerciseId, topic.category)) {
    throw new Error('Dạng bài không phù hợp với chủ đề này.')
  }

  const configs = await ensureExerciseConfigsForTopic(topic)
  if (configs.some((config) => config.exerciseId === definition.id)) {
    return configs
  }

  const now = timestamp()
  const nextOrder =
    configs.reduce((max, config) => Math.max(max, config.order), 0) + 1
  const added: TopicExerciseConfig = {
    id: `${topicId}__${definition.id}`,
    topicId,
    exerciseId: definition.id,
    enabled: true,
    order: nextOrder,
    source: 'parent_added',
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
  }
  await db.exerciseConfigs.put(added)
  return sortExerciseConfigs([...configs, added])
}

export async function removeTopicExercise(
  topicId: string,
  exerciseId: string,
): Promise<TopicExerciseConfig[]> {
  const topic = await db.topics.get(topicId)
  if (!topic) {
    throw new Error('Không tìm thấy chủ đề.')
  }
  const configs = await ensureExerciseConfigsForTopic(topic)
  const normalized = normalizeExerciseId(exerciseId)
  const remaining = configs.filter(
    (config) => config.exerciseId !== normalized,
  )
  if (remaining.length === configs.length) {
    return configs
  }
  assertHasGradedExercise(remaining)
  const target = configs.find((config) => config.exerciseId === normalized)
  if (target) {
    await db.exerciseConfigs.delete(target.id)
  }
  return sortExerciseConfigs(remaining)
}

export async function listAddableExercises(topicId: string) {
  const topic = await db.topics.get(topicId)
  if (!topic) {
    return []
  }
  const configs = await ensureExerciseConfigsForTopic(topic)
  return addableExercisesForTopic(
    topic.category,
    configs.map((config) => config.exerciseId),
  )
}

export async function getLessonExerciseOptions(topicId: string): Promise<{
  includeFlashcard: boolean
  gradedPhases: ReturnType<typeof resolveGradedPhases>
  enabledExerciseIds: string[]
}> {
  const configs = await listExerciseConfigs(topicId)
  const enabledExerciseIds = configs
    .filter((config) => config.enabled)
    .map((config) => config.exerciseId)
  return {
    includeFlashcard: isFlashcardEnabled(enabledExerciseIds),
    gradedPhases: resolveGradedPhases(enabledExerciseIds),
    enabledExerciseIds,
  }
}

export async function getActiveTopicId(): Promise<string> {
  const meta = await db.meta.get(ACTIVE_TOPIC_KEY)
  if (meta?.value) {
    return meta.value
  }
  return ANIMALS_TOPIC_ID
}

export async function setActiveTopicId(topicId: string): Promise<void> {
  await db.meta.put({
    id: ACTIVE_TOPIC_KEY,
    value: topicId,
    updatedAt: timestamp(),
  })
}

export async function hasSeenLessonIntro(phase: string): Promise<boolean> {
  const meta = await db.meta.get(SEEN_LESSON_INTROS_KEY)
  if (!meta?.value) {
    return false
  }
  try {
    const parsed = JSON.parse(meta.value) as string[]
    return Array.isArray(parsed) && parsed.includes(phase)
  } catch {
    return false
  }
}

export async function markLessonIntroSeen(phase: string): Promise<void> {
  const meta = await db.meta.get(SEEN_LESSON_INTROS_KEY)
  let seen: string[] = []
  if (meta?.value) {
    try {
      const parsed = JSON.parse(meta.value) as string[]
      if (Array.isArray(parsed)) {
        seen = parsed
      }
    } catch {
      seen = []
    }
  }
  if (seen.includes(phase)) {
    return
  }
  await db.meta.put({
    id: SEEN_LESSON_INTROS_KEY,
    value: JSON.stringify([...seen, phase]),
    updatedAt: timestamp(),
  })
}

export async function listTopics(): Promise<Topic[]> {
  await ensureAnimalsDemoTopic()
  const topics = await db.topics.toArray()
  return topics
    .filter((topic) => topic.parentConfirmed && topic.status !== 'hidden')
    .sort((left, right) => {
      const leftTime = left.lastStudiedAt ?? left.updatedAt
      const rightTime = right.lastStudiedAt ?? right.updatedAt
      return rightTime.localeCompare(leftTime)
    })
}

export async function loadLessonCards(topicId: string): Promise<LessonCard[]> {
  await ensureAnimalsDemoTopic()
  const cards = await db.cards.where('topicId').equals(topicId).toArray()
  const confirmed = cards.filter((card) => card.parentConfirmed)
  const ordered = await orderCards(topicId, confirmed)

  return Promise.all(
    ordered.map(async (card) => {
      const image = await db.images.get(card.optimizedImageId)
      const sample = animalCards.find((item) => item.id === card.id)
      return {
        id: card.id,
        word: card.word,
        meaningVietnamese: card.meaningVietnamese,
        imageUrl: image ? URL.createObjectURL(image.blob) : null,
        emoji: sample?.emoji ?? null,
        color: sample?.color ?? colorForWord(card.word),
        exampleEnglish: card.exampleEnglish,
        exampleVietnamese: card.exampleVietnamese,
      } satisfies LessonCard
    }),
  )
}

async function orderCards(
  topicId: string,
  cards: Flashcard[],
): Promise<Flashcard[]> {
  const topic = await db.topics.get(topicId)
  if (!topic) {
    return cards
  }
  const byId = new Map(cards.map((card) => [card.id, card]))
  const ordered = topic.cardIds
    .map((id) => byId.get(id))
    .filter((card): card is Flashcard => Boolean(card))
  const leftovers = cards.filter((card) => !topic.cardIds.includes(card.id))
  return [...ordered, ...leftovers]
}

export async function loadTopicSummary(topicId?: string): Promise<{
  topic: Topic | undefined
  topics: Topic[]
  learnedCount: number
  totalCount: number
  activeLesson: LessonProgress | undefined
  cards: LessonCard[]
}> {
  await ensureAnimalsDemoTopic()
  const topics = await listTopics()
  const activeId = topicId ?? (await getActiveTopicId())
  const topic = topics.find((item) => item.id === activeId) ?? topics[0]
  const resolvedId = topic?.id ?? ANIMALS_TOPIC_ID
  const cards = await loadLessonCards(resolvedId)
  const lesson = await db.lessons.get(lessonIdFor(resolvedId))
  const totalCount = cards.length
  const learnedCount = lesson?.completed
    ? totalCount
    : Math.min(
        totalCount,
        ((lesson?.checkpoint ?? 1) - 1) * 5 +
          (lesson?.phase === 'listen-choose'
            ? (lesson.questionIndex ?? 0)
            : (lesson?.cardIndex ?? 0)),
      )

  return {
    topic,
    topics,
    learnedCount,
    totalCount,
    activeLesson: lesson,
    cards,
  }
}

export async function loadOrStartLesson(
  topicId?: string,
): Promise<{ progress: LessonProgress; cards: LessonCard[] }> {
  const activeId = topicId ?? (await getActiveTopicId())
  await setActiveTopicId(activeId)
  const cards = await loadLessonCards(activeId)
  if (cards.length < 2) {
    throw new Error('Chủ đề cần ít nhất 2 flashcard để học.')
  }

  const existing = await db.lessons.get(lessonIdFor(activeId, 'learn'))
  if (existing && !existing.completed) {
    return { progress: existing, cards }
  }

  const lessonOptions = await getLessonExerciseOptions(activeId)
  const progress = createInitialProgress(activeId, 'learn', lessonOptions)
  const now = timestamp()
  const record: LessonRecord = {
    ...progress,
    id: progress.sessionId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
  }
  await db.lessons.put(record)
  return { progress: record, cards }
}

export async function recordCardAttempt(input: {
  cardId: string
  firstTry: boolean
  correct: boolean
  revealed: boolean
}): Promise<void> {
  const now = timestamp()
  const id = `wp-${PROFILE_ID}-${input.cardId}`
  const existing = await db.wordProgress.get(id)
  const base =
    existing ??
    ({
      id,
      schemaVersion: SCHEMA_VERSION,
      profileId: PROFILE_ID,
      cardId: input.cardId,
      state: 'new' as const,
      totalAppearances: 0,
      firstTryCorrectCount: 0,
      incorrectCount: 0,
      answerRevealCount: 0,
      successfulSessionDates: [],
      lastSeenAt: null,
      nextReviewAt: null,
      reviewStep: 0 as const,
      weakExerciseIds: [],
      createdAt: now,
      updatedAt: now,
    } satisfies WordProgress)

  const totalAppearances = base.totalAppearances + 1
  const firstTryCorrectCount =
    base.firstTryCorrectCount + (input.firstTry && input.correct ? 1 : 0)
  const incorrectCount = base.incorrectCount + (input.correct ? 0 : 1)
  const answerRevealCount =
    base.answerRevealCount + (input.revealed ? 1 : 0)

  let state: WordProgress['state'] = base.state
  if (!input.correct || input.revealed) {
    state = 'needs_review'
  } else if (input.firstTry && input.correct) {
    state = state === 'new' ? 'learning' : state
    if (firstTryCorrectCount >= 2 && incorrectCount === 0) {
      state = 'mastered'
    } else if (state === 'needs_review') {
      state = 'learning'
    }
  } else {
    state = state === 'new' ? 'learning' : state
  }

  const reviewDays = [1, 3, 7, 30] as const
  let reviewStep: WordProgress['reviewStep'] = base.reviewStep
  let nextReviewAt = base.nextReviewAt
  if (state === 'needs_review') {
    reviewStep = 0
    nextReviewAt = new Date(Date.now() + reviewDays[0] * 86400000).toISOString()
  } else if (input.correct && input.firstTry && !input.revealed) {
    const nextStep = Math.min(3, base.reviewStep + 1)
    reviewStep = nextStep as WordProgress['reviewStep']
    nextReviewAt = new Date(
      Date.now() + reviewDays[Math.min(nextStep, 3)] * 86400000,
    ).toISOString()
  }

  await db.wordProgress.put({
    ...base,
    state,
    totalAppearances,
    firstTryCorrectCount,
    incorrectCount,
    answerRevealCount,
    lastSeenAt: now,
    nextReviewAt,
    reviewStep,
    updatedAt: now,
  })
}

export async function listWeakCardIds(topicId: string): Promise<string[]> {
  const cards = await db.cards.where('topicId').equals(topicId).toArray()
  const ids = cards.map((card) => card.id)
  const progressRows = await db.wordProgress
    .where('profileId')
    .equals(PROFILE_ID)
    .toArray()
  const weak = new Set(
    progressRows
      .filter(
        (row) =>
          ids.includes(row.cardId) &&
          (row.state === 'needs_review' || row.incorrectCount > 0),
      )
      .map((row) => row.cardId),
  )
  return ids.filter((id) => weak.has(id))
}

export async function saveLessonProgress(
  progress: LessonProgress,
): Promise<LessonProgress> {
  const id = progress.sessionId || lessonIdFor(progress.topicId, progress.mode)
  const existing = await db.lessons.get(id)
  const now = timestamp()
  const record: LessonRecord = {
    ...progress,
    sessionId: id,
    id,
    schemaVersion: SCHEMA_VERSION,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  const wasCompleted = Boolean(existing?.completed)
  await db.lessons.put(record)

  if (progress.completed) {
    const profile = await db.profiles.get(PROFILE_ID)
    if (profile) {
      const earnedStars = wasCompleted ? 0 : progress.awardedStars
      await db.profiles.put({
        ...profile,
        totalStars: profile.totalStars + earnedStars,
        lastActiveAt: now,
        updatedAt: now,
      })
    }

    const topic = await db.topics.get(progress.topicId)
    if (topic) {
      await db.topics.put({
        ...topic,
        status: progress.mode === 'learn' ? 'completed' : topic.status,
        completedAt:
          progress.mode === 'learn' ? now : topic.completedAt,
        lastStudiedAt: now,
        lastReviewedAt: progress.mode === 'review' ? now : topic.lastReviewedAt,
        updatedAt: now,
      })
    }
  } else {
    const topic = await db.topics.get(progress.topicId)
    if (topic) {
      await db.topics.put({
        ...topic,
        status: progress.mode === 'learn' ? 'active' : topic.status,
        completedAt:
          progress.mode === 'learn' ? null : topic.completedAt,
        lastStudiedAt: now,
        updatedAt: now,
      })
    }
  }

  return record
}

export async function restartLesson(
  topicId?: string,
): Promise<{ progress: LessonProgress; cards: LessonCard[] }> {
  const activeId = topicId ?? (await getActiveTopicId())
  const lessonOptions = await getLessonExerciseOptions(activeId)
  const progress = createInitialProgress(activeId, 'learn', lessonOptions)
  const saved = await saveLessonProgress(progress)
  const cards = await loadLessonCards(activeId)
  return { progress: saved, cards }
}

export async function confirmFlashcardBatch(input: {
  topicNameEnglish: string
  topicNameVietnamese: string
  category: TopicCategory
  drafts: DraftFlashcard[]
}): Promise<Topic> {
  const usable = input.drafts.filter(
    (draft) =>
      !draft.removed &&
      draft.word.trim() &&
      draft.meaningVietnamese.trim(),
  )
  if (usable.length < 2) {
    throw new Error('Cần ít nhất 2 flashcard có từ và nghĩa để lưu.')
  }
  if (usable.length > 20) {
    throw new Error('Mỗi lần chỉ lưu tối đa 20 flashcard.')
  }

  const now = timestamp()
  const topicId = createId('topic')
  const batchId = createId('batch')
  const cardIds: string[] = []
  const flashcards: Flashcard[] = []
  const images: StoredImage[] = []

  for (const draft of usable) {
    const cardId = createId('card')
    cardIds.push(cardId)
    images.push({ ...draft.image, id: draft.image.id || createId('img') })
    const imageId = images[images.length - 1].id
    const word = draft.word.trim().toLowerCase()
    flashcards.push({
      id: cardId,
      schemaVersion: SCHEMA_VERSION,
      topicId,
      sourceImageId: imageId,
      optimizedImageId: imageId,
      thumbnailImageId: imageId,
      cropBox: null,
      word,
      normalizedWord: word,
      meaningVietnamese: draft.meaningVietnamese.trim(),
      partOfSpeech: 'noun',
      imageDescription: word,
      tags: [input.category],
      exampleEnglish: `This is ${word}.`,
      exampleVietnamese: `Đây là ${draft.meaningVietnamese.trim()}.`,
      trueStatement: `This is ${word}.`,
      falseStatement: `This is not ${word}.`,
      situationQuestion: null,
      compatibleExerciseIds: ['flashcard', 'listen-and-choose'],
      aiConfidence: 0.5,
      reviewFlags: [],
      parentConfirmed: true,
      parentEdited: true,
      createdAt: now,
      updatedAt: now,
    })
  }

  const topic: Topic = {
    id: topicId,
    schemaVersion: SCHEMA_VERSION,
    analysisBatchId: batchId,
    nameEnglish: input.topicNameEnglish.trim() || 'My Topic',
    nameVietnamese: input.topicNameVietnamese.trim() || 'Chủ đề của bé',
    category: input.category,
    addedMonth: currentMonth(),
    cardIds,
    status: 'active',
    completedAt: null,
    lastStudiedAt: null,
    lastReviewedAt: null,
    aiConfidence: 0.5,
    parentConfirmed: true,
    createdAt: now,
    updatedAt: now,
  }

  await db.transaction(
    'rw',
    db.topics,
    db.cards,
    db.images,
    db.meta,
    db.exerciseConfigs,
    async () => {
      await db.images.bulkPut(images)
      await db.cards.bulkPut(flashcards)
      await db.topics.put(topic)
      await db.exerciseConfigs.bulkPut(
        defaultConfigsForTopic(topicId, input.category, now),
      )
      await db.meta.put({
        id: ACTIVE_TOPIC_KEY,
        value: topicId,
        updatedAt: now,
      })
    },
  )

  return topic
}

export async function startReviewLesson(
  topicId?: string,
): Promise<{ progress: LessonProgress; cards: LessonCard[] }> {
  const activeId = topicId ?? (await getActiveTopicId())
  await setActiveTopicId(activeId)
  const cards = await loadLessonCards(activeId)
  if (cards.length < 2) {
    throw new Error('Cần ít nhất 2 từ để ôn tập.')
  }

  const weakIds = await listWeakCardIds(activeId)
  const weakSet = new Set(weakIds)
  // Ưu tiên từ yếu / cần ôn trước, rồi các từ còn lại.
  const ordered =
    weakIds.length > 0
      ? [
          ...cards.filter((card) => weakSet.has(card.id)),
          ...cards.filter((card) => !weakSet.has(card.id)),
        ]
      : cards

  const now = timestamp()
  const lessonOptions = await getLessonExerciseOptions(activeId)
  const progress: LessonProgress = {
    ...createInitialProgress(activeId, 'review', lessonOptions),
    phase: lessonOptions.gradedPhases[0],
    checkpoint: finalCheckpointFor(ordered.length),
    updatedAt: now,
  }
  const record: LessonRecord = {
    ...progress,
    id: progress.sessionId,
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
  }
  await db.lessons.put(record)
  return { progress: record, cards: ordered }
}

export async function listGifts(): Promise<GiftItem[]> {
  await ensureDefaultGifts()
  return db.gifts.filter((gift) => gift.active).toArray()
}

export async function upsertGift(input: {
  id?: string
  name: string
  starCost: number
  stock: number
}): Promise<GiftItem> {
  const now = timestamp()
  const existing = input.id ? await db.gifts.get(input.id) : undefined
  const gift: GiftItem = {
    id: existing?.id || createId('gift'),
    schemaVersion: SCHEMA_VERSION,
    name: input.name.trim(),
    starCost: Math.max(1, Math.floor(input.starCost)),
    stock: Math.max(0, Math.floor(input.stock)),
    active: true,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }
  await db.gifts.put(gift)
  return gift
}

export async function requestRedeem(giftId: string): Promise<RedeemRequest> {
  const gift = await db.gifts.get(giftId)
  if (!gift || !gift.active || gift.stock <= 0) {
    throw new Error('Quà không còn hoặc đã hết.')
  }
  const profile = await db.profiles.get(PROFILE_ID)
  if (!profile || profile.totalStars < gift.starCost) {
    throw new Error('Bé chưa đủ sao để đổi quà này.')
  }
  const now = timestamp()
  const request: RedeemRequest = {
    id: createId('redeem'),
    schemaVersion: SCHEMA_VERSION,
    giftId: gift.id,
    giftName: gift.name,
    starCost: gift.starCost,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }
  await db.redeemRequests.put(request)
  return request
}

export async function listPendingRedeems(): Promise<RedeemRequest[]> {
  return db.redeemRequests.where('status').equals('pending').toArray()
}

export async function resolveRedeem(
  requestId: string,
  decision: 'approved' | 'deferred',
): Promise<void> {
  const request = await db.redeemRequests.get(requestId)
  if (!request || request.status !== 'pending') {
    throw new Error('Yêu cầu đổi quà không còn hiệu lực.')
  }
  const now = timestamp()
  if (decision === 'deferred') {
    await db.redeemRequests.put({
      ...request,
      status: 'deferred',
      updatedAt: now,
    })
    return
  }

  const profile = await db.profiles.get(PROFILE_ID)
  const gift = await db.gifts.get(request.giftId)
  if (!profile || !gift) {
    throw new Error('Không tìm thấy hồ sơ hoặc quà.')
  }
  if (profile.totalStars < request.starCost || gift.stock <= 0) {
    throw new Error('Không đủ sao hoặc quà đã hết.')
  }

  await db.transaction(
    'rw',
    db.profiles,
    db.gifts,
    db.redeemRequests,
    async () => {
      await db.profiles.put({
        ...profile,
        totalStars: profile.totalStars - request.starCost,
        updatedAt: now,
      })
      await db.gifts.put({
        ...gift,
        stock: gift.stock - 1,
        updatedAt: now,
      })
      await db.redeemRequests.put({
        ...request,
        status: 'approved',
        updatedAt: now,
      })
    },
  )
}
