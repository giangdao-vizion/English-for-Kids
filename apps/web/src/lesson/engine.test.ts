import { describe, expect, it } from 'vitest'
import { animalCards } from '../sample/animals'
import {
  advanceAfterFlashcards,
  advanceAfterQuestion,
  buildChoiceQuestion,
  calculateStars,
  cardsForCheckpoint,
  createInitialProgress,
} from './engine'

describe('lesson engine', () => {
  it('covers every animal across three checkpoints', () => {
    const first = cardsForCheckpoint(animalCards, 1)
    const second = cardsForCheckpoint(animalCards, 2)
    const third = cardsForCheckpoint(animalCards, 3)

    expect(first).toHaveLength(5)
    expect(second).toHaveLength(5)
    expect(third).toHaveLength(10)
    expect([...first, ...second].map((card) => card.id).sort()).toEqual(
      animalCards.map((card) => card.id).sort(),
    )
  })

  it('uses a final mixed listening checkpoint for larger topics', async () => {
    const { finalCheckpointFor, learningCheckpointCount } = await import(
      './engine'
    )
    expect(learningCheckpointCount(10)).toBe(2)
    expect(finalCheckpointFor(10)).toBe(3)
    expect(finalCheckpointFor(4)).toBe(1)
  })

  it('moves from flashcards into listening practice', () => {
    const progress = createInitialProgress('topic-animals-demo')
    const next = advanceAfterFlashcards(progress, 5)
    expect(next.cardIndex).toBe(1)

    let current = progress
    for (let index = 0; index < 5; index += 1) {
      current = advanceAfterFlashcards(current, 5)
    }

    expect(current.phase).toBe('listen-choose')
    expect(current.questionIndex).toBe(0)
  })

  it('builds a choice set that includes the target word', () => {
    const target = animalCards[0]
    const question = buildChoiceQuestion(animalCards, target)
    expect(question.choices.some((card) => card.id === target.id)).toBe(true)
    expect(question.choices).toHaveLength(4)
  })

  it('awards three stars for strong first-try accuracy', () => {
    expect(calculateStars(10, 9, 1)).toBe(3)
    expect(calculateStars(10, 8, 3)).toBe(2)
    expect(calculateStars(10, 6, 1)).toBe(1)
  })

  it('completes the topic after the final checkpoint', () => {
    const progress = advanceAfterQuestion(
      {
        ...createInitialProgress('topic-animals-demo', 'learn'),
        checkpoint: 3,
        phase: 'listen-choose',
        questionIndex: 9,
      },
      10,
      {
        firstTry: true,
        correct: true,
        revealed: false,
        cardId: animalCards[9].id,
      },
    )

    expect(progress.completed).toBe(true)
    expect(progress.phase).toBe('result')
    expect(progress.awardedStars).toBeGreaterThan(0)
  })
})
