import { describe, expect, it } from 'vitest'
import {
  addableExercisesForTopic,
  defaultConfigsForTopic,
  exercisesForCategory,
  isFlashcardEnabled,
  resolveGradedPhases,
} from './exercises'

describe('exercise catalog', () => {
  it('includes animal-specific upcoming exercises in the library filter', () => {
    const ids = exercisesForCategory('animals').map((item) => item.id)
    expect(ids).toContain('listen-and-choose')
    expect(ids).toContain('match-pair')
    expect(ids).toContain('drag-drop')
    expect(ids).not.toContain('count-choose')
  })

  it('seeds only ready default exercises on a new topic', () => {
    const seeded = defaultConfigsForTopic('topic-1', 'animals')
    expect(seeded.map((item) => item.exerciseId)).toEqual([
      'flashcard',
      'listen-and-choose',
      'choose-word',
      'yes-no',
    ])
  })

  it('lists addable ready exercises excluding attached ones', () => {
    const addable = addableExercisesForTopic('animals', [
      'flashcard',
      'listen-and-choose',
      'choose-word',
      'yes-no',
    ])
    expect(addable).toEqual([])
  })

  it('keeps listen-choose when graded list is empty', () => {
    expect(resolveGradedPhases([])).toEqual(['listen-choose'])
  })

  it('respects attached graded phases', () => {
    expect(
      resolveGradedPhases(['flashcard', 'yes-no', 'choose-word']),
    ).toEqual(['choose-word', 'yes-no'])
    expect(isFlashcardEnabled(['choose-word'])).toBe(false)
    expect(isFlashcardEnabled(['flashcard', 'listen-and-choose'])).toBe(true)
  })
})
