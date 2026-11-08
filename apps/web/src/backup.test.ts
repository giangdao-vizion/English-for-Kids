import { afterEach, describe, expect, it } from 'vitest'
import { SCHEMA_VERSION } from '@english-for-kids/shared'
import {
  createBackupPayload,
  restoreBackupPayload,
  type BackupPayload,
} from './backup'
import { DATABASE_NAME, PROFILE_ID, SETTINGS_ID, db } from './db'

async function resetDatabase(): Promise<void> {
  db.close()
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
  // Re-open the singleton after delete.
  await db.open()
}

afterEach(async () => {
  await resetDatabase()
})

describe('backup', () => {
  it('round-trips profile data with checksum', async () => {
    const now = new Date().toISOString()
    await db.profiles.put({
      id: PROFILE_ID,
      schemaVersion: SCHEMA_VERSION,
      displayName: 'An',
      avatarImageId: 'fox',
      totalStars: 3,
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
    })
    await db.settings.put({
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

    const payload = await createBackupPayload()
    expect(payload.schemaVersion).toBe(SCHEMA_VERSION)
    expect(payload.checksum).toMatch(/^[a-f0-9]{64}$/)

    await db.profiles.clear()
    await db.settings.clear()
    expect(await db.profiles.count()).toBe(0)

    await restoreBackupPayload(payload)
    expect(await db.profiles.get(PROFILE_ID)).toMatchObject({
      displayName: 'An',
      totalStars: 3,
    })
  })

  it('rejects tampered checksum', async () => {
    const payload = await createBackupPayload()
    const broken: BackupPayload = {
      ...payload,
      checksum: '0'.repeat(64),
    }
    await expect(restoreBackupPayload(broken)).rejects.toThrow(/Checksum/)
  })
})
