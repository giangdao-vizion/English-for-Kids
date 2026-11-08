import { SCHEMA_VERSION } from '@english-for-kids/shared'
import { db, SETTINGS_ID } from './db'
import type { StoredImage } from './images'
import { blobToBase64 } from './parent/analyze'

export type BackupImageRecord = Omit<StoredImage, 'blob'> & {
  base64: string
}

export type BackupPayload = {
  schemaVersion: typeof SCHEMA_VERSION
  exportedAt: string
  checksum: string
  tables: {
    profiles: unknown[]
    settings: unknown[]
    topics: unknown[]
    cards: unknown[]
    wordProgress: unknown[]
    lessons: unknown[]
    gifts: unknown[]
    redeemRequests: unknown[]
    exerciseConfigs: unknown[]
    meta: unknown[]
    images: BackupImageRecord[]
  }
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function serializeImages(): Promise<BackupImageRecord[]> {
  const images = await db.images.toArray()
  return Promise.all(
    images.map(async (image) => {
      const { blob, ...rest } = image
      return {
        ...rest,
        base64: await blobToBase64(blob),
      }
    }),
  )
}

function restoreImage(record: BackupImageRecord): StoredImage {
  const binary = atob(record.base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  const { base64: _base64, ...rest } = record
  return {
    ...rest,
    blob: new Blob([bytes], { type: record.mimeType }),
  }
}

export async function createBackupPayload(): Promise<BackupPayload> {
  const tables = {
    profiles: await db.profiles.toArray(),
    settings: await db.settings.toArray(),
    topics: await db.topics.toArray(),
    cards: await db.cards.toArray(),
    wordProgress: await db.wordProgress.toArray(),
    lessons: await db.lessons.toArray(),
    gifts: await db.gifts.toArray(),
    redeemRequests: await db.redeemRequests.toArray(),
    exerciseConfigs: await db.exerciseConfigs.toArray(),
    meta: await db.meta.toArray(),
    images: await serializeImages(),
  }
  const body = JSON.stringify(tables)
  const checksum = await sha256Hex(body)
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    checksum,
    tables,
  }
}

export async function downloadBackupFile(): Promise<void> {
  const payload = await createBackupPayload()
  const blob = new Blob([JSON.stringify(payload)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const stamp = payload.exportedAt.slice(0, 10)
  anchor.href = url
  anchor.download = `english-for-kids-backup-${stamp}.json`
  anchor.click()
  URL.revokeObjectURL(url)

  const settings = await db.settings.get(SETTINGS_ID)
  if (settings) {
    await db.settings.put({
      ...settings,
      lastBackupAt: payload.exportedAt,
      updatedAt: payload.exportedAt,
    })
  }
}

export async function restoreBackupPayload(
  payload: BackupPayload,
): Promise<void> {
  if (payload.schemaVersion !== SCHEMA_VERSION) {
    throw new Error('Bản sao lưu không cùng phiên bản dữ liệu.')
  }
  if (!payload.tables || !payload.checksum) {
    throw new Error('File không đúng định dạng sao lưu.')
  }
  const body = JSON.stringify(payload.tables)
  const checksum = await sha256Hex(body)
  if (checksum !== payload.checksum) {
    throw new Error('Checksum không khớp. File sao lưu có thể bị hỏng.')
  }

  const images = (payload.tables.images ?? []).map(restoreImage)

  await db.transaction(
    'rw',
    [
      db.profiles,
      db.settings,
      db.topics,
      db.cards,
      db.wordProgress,
      db.lessons,
      db.gifts,
      db.redeemRequests,
      db.exerciseConfigs,
      db.meta,
      db.images,
    ],
    async () => {
      await Promise.all([
        db.profiles.clear(),
        db.settings.clear(),
        db.topics.clear(),
        db.cards.clear(),
        db.wordProgress.clear(),
        db.lessons.clear(),
        db.gifts.clear(),
        db.redeemRequests.clear(),
        db.exerciseConfigs.clear(),
        db.meta.clear(),
        db.images.clear(),
      ])
      await db.profiles.bulkPut(payload.tables.profiles as never[])
      await db.settings.bulkPut(payload.tables.settings as never[])
      await db.topics.bulkPut(payload.tables.topics as never[])
      await db.cards.bulkPut(payload.tables.cards as never[])
      await db.wordProgress.bulkPut(payload.tables.wordProgress as never[])
      await db.lessons.bulkPut(payload.tables.lessons as never[])
      await db.gifts.bulkPut(payload.tables.gifts as never[])
      await db.redeemRequests.bulkPut(payload.tables.redeemRequests as never[])
      await db.exerciseConfigs.bulkPut(payload.tables.exerciseConfigs as never[])
      await db.meta.bulkPut(payload.tables.meta as never[])
      await db.images.bulkPut(images)
    },
  )
}

export async function readBackupFile(file: File): Promise<BackupPayload> {
  const text = await file.text()
  let parsed: BackupPayload
  try {
    parsed = JSON.parse(text) as BackupPayload
  } catch {
    throw new Error('File không phải JSON hợp lệ.')
  }
  if (!parsed?.tables || !parsed.checksum) {
    throw new Error('File không đúng định dạng sao lưu.')
  }
  return parsed
}
