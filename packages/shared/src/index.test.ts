import { describe, expect, it } from 'vitest'
import {
  addLowConfidenceFlags,
  aiAnalysisResponseSchema,
} from './index'

const validResponse = {
  schemaVersion: 1,
  topics: [
    {
      nameEnglish: 'Animals',
      nameVietnamese: 'Động vật',
      category: 'animals',
      confidence: 0.98,
      recommendedExerciseIds: ['listen-and-choose'],
      cards: [
        {
          sourceImageIndex: 0,
          cropBox: null,
          word: 'cat',
          normalizedWord: 'cat',
          meaningVietnamese: 'con mèo',
          partOfSpeech: 'noun',
          imageDescription: 'A cat',
          tags: ['animal'],
          exampleEnglish: 'This is a cat.',
          exampleVietnamese: 'Đây là một con mèo.',
          trueStatement: 'This is a cat.',
          falseStatement: 'This is a dog.',
          situationQuestion: null,
          compatibleExerciseIds: ['listen-and-choose'],
          confidence: 0.98,
          reviewFlags: [],
        },
      ],
      miniStory: null,
    },
  ],
  warnings: [],
} as const

describe('AI response schema', () => {
  it('accepts a valid response', () => {
    expect(aiAnalysisResponseSchema.safeParse(validResponse).success).toBe(true)
  })

  it('rejects fields outside the schema', () => {
    const responseWithUnexpectedCode = {
      ...validResponse,
      executableCode: 'alert(1)',
    }

    expect(
      aiAnalysisResponseSchema.safeParse(responseWithUnexpectedCode).success,
    ).toBe(false)
  })

  it('flags cards below the confidence threshold', () => {
    const parsed = aiAnalysisResponseSchema.parse({
      ...validResponse,
      topics: [
        {
          ...validResponse.topics[0],
          cards: [
            {
              ...validResponse.topics[0].cards[0],
              confidence: 0.79,
            },
          ],
        },
      ],
    })

    const normalized = addLowConfidenceFlags(parsed)

    expect(normalized.topics[0].cards[0].reviewFlags).toContain(
      'low_confidence',
    )
  })
})
