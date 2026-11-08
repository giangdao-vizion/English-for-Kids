import { z } from 'zod'

export const SCHEMA_VERSION = 1 as const
export const LOW_CONFIDENCE_THRESHOLD = 0.8

export const topicCategories = [
  'animals',
  'food_drinks',
  'colors',
  'numbers',
  'shapes',
  'body_parts',
  'actions',
  'emotions',
  'positions',
  'objects',
  'general',
] as const

export const partOfSpeechValues = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'phrase',
  'other',
] as const

export const reviewFlagValues = [
  'low_confidence',
  'unreadable',
  'duplicate',
  'ambiguous_topic',
  'invalid_sentence',
] as const

export type TopicCategory = (typeof topicCategories)[number]
export type PartOfSpeech = (typeof partOfSpeechValues)[number]
export type ReviewFlag = (typeof reviewFlagValues)[number]
export type WordState = 'new' | 'learning' | 'needs_review' | 'mastered'
export type IsoDateTime = string
export type Id = string

export interface VersionedRecord {
  id: Id
  schemaVersion: typeof SCHEMA_VERSION
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export interface ChildProfile extends VersionedRecord {
  displayName: string
  avatarImageId: Id | null
  totalStars: number
  lastActiveAt: IsoDateTime | null
}

export interface AppSettings extends VersionedRecord {
  englishVoice: 'en-US'
  vietnameseVoice: 'vi-VN'
  speechRate: number
  readVietnameseMeaning: boolean
  wordsPerCheckpoint: 5
  lastBackupAt: IsoDateTime | null
}

export interface Topic extends VersionedRecord {
  analysisBatchId: Id
  nameEnglish: string
  nameVietnamese: string
  category: TopicCategory
  addedMonth: string
  cardIds: Id[]
  status: 'active' | 'completed' | 'hidden'
  completedAt: IsoDateTime | null
  lastStudiedAt: IsoDateTime | null
  lastReviewedAt: IsoDateTime | null
  aiConfidence: number
  parentConfirmed: boolean
}

export interface Flashcard extends VersionedRecord {
  topicId: Id
  sourceImageId: Id
  optimizedImageId: Id
  thumbnailImageId: Id
  cropBox: CropBox | null
  word: string
  normalizedWord: string
  meaningVietnamese: string
  partOfSpeech: PartOfSpeech
  imageDescription: string
  tags: string[]
  exampleEnglish: string
  exampleVietnamese: string
  trueStatement: string
  falseStatement: string
  situationQuestion: string | null
  compatibleExerciseIds: string[]
  aiConfidence: number
  reviewFlags: ReviewFlag[]
  parentConfirmed: boolean
  parentEdited: boolean
}

export interface WordProgress extends VersionedRecord {
  profileId: Id
  cardId: Id
  state: WordState
  totalAppearances: number
  firstTryCorrectCount: number
  incorrectCount: number
  answerRevealCount: number
  successfulSessionDates: string[]
  lastSeenAt: IsoDateTime | null
  nextReviewAt: IsoDateTime | null
  reviewStep: 0 | 1 | 2 | 3 | 4
  weakExerciseIds: string[]
}

export interface CropBox {
  x: number
  y: number
  width: number
  height: number
}

const confidenceSchema = z.number().min(0).max(1)

const cropBoxSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
  })
  .strict()

const nullableShortText = z.string().trim().min(1).max(160).nullable()

export const aiCardSchema = z
  .object({
    sourceImageIndex: z.number().int().nonnegative(),
    cropBox: cropBoxSchema.nullable(),
    word: z.string().trim().min(1).max(80).nullable(),
    normalizedWord: z.string().trim().min(1).max(80).nullable(),
    meaningVietnamese: z.string().trim().min(1).max(120).nullable(),
    partOfSpeech: z.enum(partOfSpeechValues).nullable(),
    imageDescription: z.string().trim().max(240),
    tags: z.array(z.string().trim().min(1).max(40)).max(12),
    exampleEnglish: nullableShortText,
    exampleVietnamese: nullableShortText,
    trueStatement: nullableShortText,
    falseStatement: nullableShortText,
    situationQuestion: nullableShortText,
    compatibleExerciseIds: z.array(z.string().trim().min(1).max(60)).max(13),
    confidence: confidenceSchema,
    reviewFlags: z.array(z.enum(reviewFlagValues)).max(5),
  })
  .strict()

export const aiMiniStorySchema = z
  .object({
    frames: z
      .array(
        z
          .object({
            cardIndexes: z.array(z.number().int().nonnegative()).min(1).max(5),
            narrationEnglish: z.string().trim().min(1).max(180),
            narrationVietnamese: z.string().trim().min(1).max(180),
          })
          .strict(),
      )
      .min(2)
      .max(3),
    comprehensionQuestions: z
      .array(
        z
          .object({
            promptEnglish: z.string().trim().min(1).max(160),
            promptVietnamese: z.string().trim().min(1).max(160),
            answerCardIndexes: z
              .array(z.number().int().nonnegative())
              .min(1)
              .max(5),
          })
          .strict(),
      )
      .min(1)
      .max(3),
  })
  .strict()

export const aiTopicSchema = z
  .object({
    nameEnglish: z.string().trim().min(1).max(80),
    nameVietnamese: z.string().trim().min(1).max(80),
    category: z.enum(topicCategories),
    confidence: confidenceSchema,
    recommendedExerciseIds: z
      .array(z.string().trim().min(1).max(60))
      .min(1)
      .max(13),
    cards: z.array(aiCardSchema).min(1).max(20),
    miniStory: aiMiniStorySchema.nullable(),
  })
  .strict()

export const aiWarningSchema = z
  .object({
    sourceImageIndex: z.number().int().nonnegative().nullable(),
    code: z.string().trim().min(1).max(60),
    messageVietnamese: z.string().trim().min(1).max(240),
  })
  .strict()

export const aiAnalysisResponseSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    topics: z.array(aiTopicSchema).min(1).max(20),
    warnings: z.array(aiWarningSchema).max(40),
  })
  .strict()

export type AiAnalysisResponse = z.infer<typeof aiAnalysisResponseSchema>

export function addLowConfidenceFlags(
  response: AiAnalysisResponse,
): AiAnalysisResponse {
  return {
    ...response,
    topics: response.topics.map((topic) => ({
      ...topic,
      cards: topic.cards.map((card) => ({
        ...card,
        reviewFlags:
          card.confidence < LOW_CONFIDENCE_THRESHOLD &&
          !card.reviewFlags.includes('low_confidence')
            ? [...card.reviewFlags, 'low_confidence']
            : card.reviewFlags,
      })),
    })),
  }
}
