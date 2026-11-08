import { SCHEMA_VERSION, type Id } from '@english-for-kids/shared'

export type StoredImage = {
  id: Id
  schemaVersion: typeof SCHEMA_VERSION
  kind: 'optimized' | 'thumbnail' | 'avatar'
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  width: number
  height: number
  byteSize: number
  checksum: string
  blob: Blob
  createdAt: string
  updatedAt: string
}

const MAX_EDGE = 1024
const JPEG_QUALITY = 0.82

export async function optimizeImageFile(
  file: File,
  id: string,
): Promise<StoredImage> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Chỉ nhận ảnh JPG hoặc PNG.')
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    throw new Error('Không thể xử lý ảnh trên thiết bị này.')
  }
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const mimeType =
    file.type === 'image/png' ? 'image/png' : ('image/jpeg' as const)
  const blob = await canvasToBlob(canvas, mimeType)
  const now = new Date().toISOString()
  const checksum = await sha256Hex(await blob.arrayBuffer())

  return {
    id,
    schemaVersion: SCHEMA_VERSION,
    kind: 'optimized',
    mimeType,
    width,
    height,
    byteSize: blob.size,
    checksum,
    blob,
    createdAt: now,
    updatedAt: now,
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: 'image/jpeg' | 'image/png',
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Không thể nén ảnh.'))
          return
        }
        resolve(blob)
      },
      mimeType,
      mimeType === 'image/jpeg' ? JPEG_QUALITY : undefined,
    )
  })
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function guessWordFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '')
  const cleaned = base
    .replace(/[_\-.]+/g, ' ')
    .replace(/[^a-zA-Z\s']/g, ' ')
    .trim()
    .toLowerCase()
  const words = cleaned.split(/\s+/).filter(Boolean)
  return words.slice(0, 3).join(' ')
}

const PALETTE = [
  '#7bc8c8',
  '#f0a35e',
  '#7dba7a',
  '#6aa8e8',
  '#d7a4c7',
  '#e8c35a',
  '#9bb0c9',
  '#c49a6c',
  '#e0a045',
  '#8d9bb8',
]

export function colorForWord(word: string): string {
  let hash = 0
  for (const char of word) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}
