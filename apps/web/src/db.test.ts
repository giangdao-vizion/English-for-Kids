import { afterEach, describe, expect, it } from 'vitest'
import {
  EnglishForKidsDatabase,
  PROFILE_ID,
  SETTINGS_ID,
} from './db'
import { SCHEMA_VERSION } from '@english-for-kids/shared'

const databaseNames: string[] = []

function createTestDatabase(): EnglishForKidsDatabase {
  const name = `english-for-kids-test-${crypto.randomUUID()}`
  databaseNames.push(name)
  return new EnglishForKidsDatabase(name)
}

afterEach(async () => {
  await Promise.all(databaseNames.splice(0).map((name) => DexieDelete(name)))
})

async function DexieDelete(name: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

describe('EnglishForKidsDatabase', () => {
  it('persists a profile and settings', async () => {
    const database = createTestDatabase()
    const now = new Date().toISOString()

    await database.profiles.put({
      id: PROFILE_ID,
      schemaVersion: SCHEMA_VERSION,
      displayName: 'An',
      avatarImageId: 'fox',
      totalStars: 0,
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
    })
    await database.settings.put({
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
    })

    expect(await database.profiles.get(PROFILE_ID)).toMatchObject({
      displayName: 'An',
      avatarImageId: 'fox',
    })
    expect(await database.settings.get(SETTINGS_ID)).toMatchObject({
      englishVoice: 'en-US',
      vietnameseVoice: 'vi-VN',
      wordsPerCheckpoint: 5,
    })

    database.close()
  })
})
