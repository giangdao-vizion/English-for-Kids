import { z } from 'zod'

export const SCHEMA_VERSION = 1

const topicCategories = [
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
]

const partOfSpeechValues = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'phrase',
  'other',
]

const reviewFlagValues = [
  'low_confidence',
  'unreadable',
  'duplicate',
  'ambiguous_topic',
  'invalid_sentence',
]

const confidenceSchema = z.number().min(0).max(1)
const nullableShortText = z.string().trim().min(1).max(160).nullable()

const cropBoxSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
  })
  .strict()
  .nullable()

const aiCardSchema = z
  .object({
    sourceImageIndex: z.number().int().nonnegative(),
    cropBox: cropBoxSchema,
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

const aiTopicSchema = z
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
    miniStory: z
      .object({
        frames: z
          .array(
            z
              .object({
                cardIndexes: z
                  .array(z.number().int().nonnegative())
                  .min(1)
                  .max(5),
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
      .nullable(),
  })
  .strict()

export const aiAnalysisResponseSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    topics: z.array(aiTopicSchema).min(1).max(20),
    warnings: z
      .array(
        z
          .object({
            sourceImageIndex: z.number().int().nonnegative().nullable(),
            code: z.string().trim().min(1).max(60),
            messageVietnamese: z.string().trim().min(1).max(240),
          })
          .strict(),
      )
      .max(40),
  })
  .strict()
