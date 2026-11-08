import Dexie, { type EntityTable } from 'dexie'
import {
  SCHEMA_VERSION,
  type AppSettings,
  type ChildProfile,
  type Flashcard,
  type Topic,
  type WordProgress,
} from '@english-for-kids/shared'

export const DATABASE_NAME = 'english-for-kids'
export const PROFILE_ID = 'primary-child'
export const SETTINGS_ID = 'app-settings'

export class EnglishForKidsDatabase extends Dexie {
  profiles!: EntityTable<ChildProfile, 'id'>
  settings!: EntityTable<AppSettings, 'id'>
  topics!: EntityTable<Topic, 'id'>
  cards!: EntityTable<Flashcard, 'id'>
  wordProgress!: EntityTable<WordProgress, 'id'>

  constructor(databaseName = DATABASE_NAME) {
    super(databaseName)

    this.version(SCHEMA_VERSION).stores({
      profiles: 'id, lastActiveAt',
      settings: 'id',
      topics: 'id, status, addedMonth, lastStudiedAt',
      cards: 'id, topicId, normalizedWord, parentConfirmed',
      wordProgress:
        'id, [profileId+cardId], state, nextReviewAt, lastSeenAt',
    })
  }
}

export const db = new EnglishForKidsDatabase()

function timestamp(): string {
  return new Date().toISOString()
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

  return profile
}

export async function loadProfile(): Promise<ChildProfile | undefined> {
  return db.profiles.get(PROFILE_ID)
}
