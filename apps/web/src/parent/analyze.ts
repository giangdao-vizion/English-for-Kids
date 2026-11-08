import {
  aiAnalysisResponseSchema,
  SCHEMA_VERSION,
  type AiAnalysisResponse,
  type TopicCategory,
} from '@english-for-kids/shared'
import { guessWordFromFilename } from '../images'

const ANALYZER_URL =
  import.meta.env.VITE_ANALYZER_URL?.replace(/\/$/, '') ||
  'https://english-for-kids-analyzer-600276893901.us-central1.run.app'

const DICTIONARY: Record<
  string,
  { meaning: string; category: TopicCategory; topicEn: string; topicVi: string }
> = {
  cat: { meaning: 'con mèo', category: 'animals', topicEn: 'Animals', topicVi: 'Động vật' },
  dog: { meaning: 'con chó', category: 'animals', topicEn: 'Animals', topicVi: 'Động vật' },
  bird: { meaning: 'con chim', category: 'animals', topicEn: 'Animals', topicVi: 'Động vật' },
  fish: { meaning: 'con cá', category: 'animals', topicEn: 'Animals', topicVi: 'Động vật' },
  rabbit: { meaning: 'con thỏ', category: 'animals', topicEn: 'Animals', topicVi: 'Động vật' },
  duck: { meaning: 'con vịt', category: 'animals', topicEn: 'Animals', topicVi: 'Động vật' },
  cow: { meaning: 'con bò', category: 'animals', topicEn: 'Animals', topicVi: 'Động vật' },
  horse: { meaning: 'con ngựa', category: 'animals', topicEn: 'Animals', topicVi: 'Động vật' },
  lion: { meaning: 'sư tử', category: 'animals', topicEn: 'Animals', topicVi: 'Động vật' },
  elephant: { meaning: 'con voi', category: 'animals', topicEn: 'Animals', topicVi: 'Động vật' },
  apple: { meaning: 'quả táo', category: 'food_drinks', topicEn: 'Food', topicVi: 'Đồ ăn' },
  banana: { meaning: 'quả chuối', category: 'food_drinks', topicEn: 'Food', topicVi: 'Đồ ăn' },
  milk: { meaning: 'sữa', category: 'food_drinks', topicEn: 'Food', topicVi: 'Đồ ăn' },
  water: { meaning: 'nước', category: 'food_drinks', topicEn: 'Food', topicVi: 'Đồ ăn' },
  bread: { meaning: 'bánh mì', category: 'food_drinks', topicEn: 'Food', topicVi: 'Đồ ăn' },
  red: { meaning: 'màu đỏ', category: 'colors', topicEn: 'Colors', topicVi: 'Màu sắc' },
  blue: { meaning: 'màu xanh dương', category: 'colors', topicEn: 'Colors', topicVi: 'Màu sắc' },
  green: { meaning: 'màu xanh lá', category: 'colors', topicEn: 'Colors', topicVi: 'Màu sắc' },
  yellow: { meaning: 'màu vàng', category: 'colors', topicEn: 'Colors', topicVi: 'Màu sắc' },
  circle: { meaning: 'hình tròn', category: 'shapes', topicEn: 'Shapes', topicVi: 'Hình dạng' },
  square: { meaning: 'hình vuông', category: 'shapes', topicEn: 'Shapes', topicVi: 'Hình dạng' },
  hand: { meaning: 'bàn tay', category: 'body_parts', topicEn: 'Body', topicVi: 'Cơ thể' },
  eye: { meaning: 'mắt', category: 'body_parts', topicEn: 'Body', topicVi: 'Cơ thể' },
  happy: { meaning: 'vui vẻ', category: 'emotions', topicEn: 'Emotions', topicVi: 'Cảm xúc' },
  sad: { meaning: 'buồn', category: 'emotions', topicEn: 'Emotions', topicVi: 'Cảm xúc' },
  run: { meaning: 'chạy', category: 'actions', topicEn: 'Actions', topicVi: 'Hành động' },
  jump: { meaning: 'nhảy', category: 'actions', topicEn: 'Actions', topicVi: 'Hành động' },
  car: { meaning: 'xe hơi', category: 'objects', topicEn: 'Objects', topicVi: 'Đồ vật' },
  book: { meaning: 'quyển sách', category: 'objects', topicEn: 'Objects', topicVi: 'Đồ vật' },
  ball: { meaning: 'quả bóng', category: 'objects', topicEn: 'Objects', topicVi: 'Đồ vật' },
}

export type AnalyzeImageInput = {
  fileName: string
  mimeType: string
  base64: string
}

export type AnalyzeResult = {
  analysis: AiAnalysisResponse
  source: 'gemini' | 'local-fallback'
  warning?: string
}

function localFallback(images: AnalyzeImageInput[]): AiAnalysisResponse {
  const groups = new Map<
    string,
    {
      category: TopicCategory
      topicEn: string
      topicVi: string
      cards: AiAnalysisResponse['topics'][number]['cards']
    }
  >()

  images.forEach((image, index) => {
    const guessed = guessWordFromFilename(image.fileName) || `word ${index + 1}`
    const key = guessed.split(' ')[0] || guessed
    const known = DICTIONARY[key]
    const word = known ? key : guessed
    const meaning = known?.meaning || `nghĩa của ${word}`
    const category = known?.category || 'general'
    const topicEn = known?.topicEn || 'My Words'
    const topicVi = known?.topicVi || 'Từ của bé'
    const groupKey = `${category}:${topicEn}`
    const group = groups.get(groupKey) || {
      category,
      topicEn,
      topicVi,
      cards: [],
    }
    group.cards.push({
      sourceImageIndex: index,
      cropBox: null,
      word,
      normalizedWord: word,
      meaningVietnamese: meaning,
      partOfSpeech: 'noun',
      imageDescription: word,
      tags: [category],
      exampleEnglish: `This is ${word}.`,
      exampleVietnamese: `Đây là ${meaning}.`,
      trueStatement: `This is ${word}.`,
      falseStatement: `This is not ${word}.`,
      situationQuestion: null,
      compatibleExerciseIds: [
        'flashcard',
        'listen-and-choose',
        'choose-word',
        'yes-no',
      ],
      confidence: known ? 0.72 : 0.45,
      reviewFlags: known ? [] : ['low_confidence'],
    })
    groups.set(groupKey, group)
  })

  return {
    schemaVersion: SCHEMA_VERSION,
    topics: [...groups.values()].map((group) => ({
      nameEnglish: group.topicEn,
      nameVietnamese: group.topicVi,
      category: group.category,
      confidence: 0.7,
      recommendedExerciseIds: [
        'flashcard',
        'listen-and-choose',
        'choose-word',
        'yes-no',
      ],
      cards: group.cards,
      miniStory: null,
    })),
    warnings: [
      {
        sourceImageIndex: null,
        code: 'local_fallback',
        messageVietnamese:
          'Đang dùng phân tích dự phòng trên máy vì chưa gọi được AI cloud.',
      },
    ],
  }
}

function networkWarning(error: unknown): string {
  const offline =
    typeof navigator !== 'undefined' && navigator.onLine === false
  if (offline) {
    return 'Không có mạng. AI cloud cần Internet; đã điền sẵn dự phòng trên máy để ba mẹ xác nhận.'
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'AI cloud phản hồi quá lâu. Đã điền sẵn dự phòng trên máy để ba mẹ xác nhận.'
  }
  const message = error instanceof Error ? error.message : ''
  if (
    /failed to fetch|networkerror|load failed|network request failed/i.test(
      message,
    )
  ) {
    return 'Mất kết nối tới AI cloud. Kiểm tra mạng rồi thử lại, hoặc xác nhận bản điền sẵn trên máy.'
  }
  return error instanceof Error
    ? `AI cloud chưa sẵn sàng (${error.message}). Đã điền sẵn để ba mẹ xác nhận.`
    : 'AI cloud chưa sẵn sàng. Đã điền sẵn để ba mẹ xác nhận.'
}

export async function analyzeFlashcards(
  images: AnalyzeImageInput[],
): Promise<AnalyzeResult> {
  try {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 45000)
    const response = await fetch(`${ANALYZER_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images }),
      signal: controller.signal,
    })
    window.clearTimeout(timer)

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string
      } | null
      throw new Error(payload?.error || `HTTP ${response.status}`)
    }

    const json = await response.json()
    const analysis = aiAnalysisResponseSchema.parse(json)
    return { analysis, source: 'gemini' }
  } catch (error) {
    const analysis = localFallback(images)
    return {
      analysis,
      source: 'local-fallback',
      warning: networkWarning(error),
    }
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index])
  }
  return btoa(binary)
}
