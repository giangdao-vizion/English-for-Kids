import Dexie, { type EntityTable } from 'dexie'
import {
  SCHEMA_VERSION,
  type AppSettings,
  type ChildProfile,
  type Flashcard,
  type Topic,
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

export const DATABASE_NAME = 'english-for-kids'
export const PROFILE_ID = 'primary-child'
export const SETTINGS_ID = 'app-settings'
export const ACTIVE_LESSON_ID = 'active-animals-lesson'

type LessonRecord = LessonProgress & {
  id: string
  schemaVersion: typeof SCHEMA_VERSION
  createdAt: string
}

export class EnglishForKidsDatabase extends Dexie {
  profiles!: EntityTable<ChildProfile, 'id'>
  settings!: EntityTable<AppSettings, 'id'>
  topics!: EntityTable<Topic, 'id'>
  cards!: EntityTable<Flashcard, 'id'>
  wordProgress!: EntityTable<WordProgress, 'id'>
  lessons!: EntityTable<LessonRecord, 'id'>

  constructor(databaseName = DATABASE_NAME) {
    super(databaseName)

    this.version(SCHEMA_VERSION).stores({
      profiles: 'id, lastActiveAt',
      settings: 'id',
      topics: 'id, status, addedMonth, lastStudiedAt',
      cards: 'id, topicId, normalizedWord, parentConfirmed',
      wordProgress: 'id, [profileId+cardId], state, nextReviewAt, lastSeenAt',
      lessons: 'id, topicId, completed, updatedAt',
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

export async function loadTopicSummary(): Promise<{
  topic: Topic | undefined
  learnedCount: number
  totalCount: number
  activeLesson: LessonProgress | undefined
}> {
  await ensureAnimalsDemoTopic()
  const topic = await db.topics.get(ANIMALS_TOPIC_ID)
  const lesson = await db.lessons.get(ACTIVE_LESSON_ID)
  const totalCount = animalCards.length
  const learnedCount = lesson?.completed
    ? totalCount
    : Math.min(
        totalCount,
        ((lesson?.checkpoint ?? 1) - 1) * 5 +
          (lesson?.phase === 'listen-choose'
            ? (lesson.questionIndex ?? 0)
            : lesson?.cardIndex ?? 0),
      )

  return {
    topic,
    learnedCount,
    totalCount,
    activeLesson: lesson,
  }
}

export async function loadOrStartLesson(): Promise<LessonProgress> {
  await ensureAnimalsDemoTopic()
  const existing = await db.lessons.get(ACTIVE_LESSON_ID)
  if (existing && !existing.completed) {
    return existing
  }

  const progress = createInitialProgress(ANIMALS_TOPIC_ID)
  const now = timestamp()
  const record: LessonRecord = {
    ...progress,
    id: ACTIVE_LESSON_ID,
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
  }
  await db.lessons.put(record)
  return record
}

export async function saveLessonProgress(
  progress: LessonProgress,
): Promise<LessonProgress> {
  const existing = await db.lessons.get(ACTIVE_LESSON_ID)
  const now = timestamp()
  const record: LessonRecord = {
    ...progress,
    id: ACTIVE_LESSON_ID,
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

    const topic = await db.topics.get(ANIMALS_TOPIC_ID)
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
    const topic = await db.topics.get(ANIMALS_TOPIC_ID)
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

export async function restartLesson(): Promise<LessonProgress> {
  const progress = createInitialProgress(ANIMALS_TOPIC_ID)
  return saveLessonProgress(progress)
}
