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
  type LessonProgress,
} from './lesson/engine'
import type { LessonCard } from './lesson/types'
import {
  colorForWord,
  type StoredImage,
} from './images'

export const DATABASE_NAME = 'english-for-kids'
export const PROFILE_ID = 'primary-child'
export const SETTINGS_ID = 'app-settings'
export const ACTIVE_TOPIC_KEY = 'active-topic-id'

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

export class EnglishForKidsDatabase extends Dexie {
  profiles!: EntityTable<ChildProfile, 'id'>
  settings!: EntityTable<AppSettings, 'id'>
  topics!: EntityTable<Topic, 'id'>
  cards!: EntityTable<Flashcard, 'id'>
  wordProgress!: EntityTable<WordProgress, 'id'>
  lessons!: EntityTable<LessonRecord, 'id'>
  images!: EntityTable<StoredImage, 'id'>
  meta!: EntityTable<MetaRecord, 'id'>

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

function lessonIdFor(topicId: string): string {
  return `lesson-${topicId}`
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
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
  await setActiveTopicId(ANIMALS_TOPIC_ID)
  return profile
}

export async function loadProfile(): Promise<ChildProfile | undefined> {
  return db.profiles.get(PROFILE_ID)
}

export async function ensureAnimalsDemoTopic(): Promise<Topic> {
  const existing = await db.topics.get(ANIMALS_TOPIC_ID)
  if (existing) {
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

  await db.transaction('rw', db.topics, db.cards, async () => {
    await db.topics.put(topic)
    await db.cards.bulkPut(cards)
  })

  return topic
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

  const existing = await db.lessons.get(lessonIdFor(activeId))
  if (existing && !existing.completed) {
    return { progress: existing, cards }
  }

  const progress = createInitialProgress(activeId)
  const now = timestamp()
  const record: LessonRecord = {
    ...progress,
    id: lessonIdFor(activeId),
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
  }
  await db.lessons.put(record)
  return { progress: record, cards }
}

export async function saveLessonProgress(
  progress: LessonProgress,
): Promise<LessonProgress> {
  const id = lessonIdFor(progress.topicId)
  const existing = await db.lessons.get(id)
  const now = timestamp()
  const record: LessonRecord = {
    ...progress,
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
        status: 'completed',
        completedAt: now,
        lastStudiedAt: now,
        updatedAt: now,
      })
    }
  } else {
    const topic = await db.topics.get(progress.topicId)
    if (topic) {
      await db.topics.put({
        ...topic,
        status: 'active',
        completedAt: null,
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
  const progress = createInitialProgress(activeId)
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
    async () => {
      await db.images.bulkPut(images)
      await db.cards.bulkPut(flashcards)
      await db.topics.put(topic)
      await db.meta.put({
        id: ACTIVE_TOPIC_KEY,
        value: topicId,
        updatedAt: now,
      })
    },
  )

  return topic
}
