import { describe, expect, it } from 'vitest'
import {
  exercisesForCategory,
  isFlashcardEnabled,
  resolveGradedPhases,
} from './exercises'

describe('exercise catalog', () => {
  it('includes animal-specific upcoming exercises', () => {
    const ids = exercisesForCategory('animals').map((item) => item.id)
    expect(ids).toContain('listen-and-choose')
    expect(ids).toContain('match-pair')
    expect(ids).toContain('drag-drop')
    expect(ids).not.toContain('count-choose')
  })

  it('keeps listen-choose when graded list is empty', () => {
    expect(resolveGradedPhases([])).toEqual(['listen-choose'])
  })

  it('respects parent-enabled graded phases', () => {
    expect(
      resolveGradedPhases(['flashcard', 'yes-no', 'choose-word']),
    ).toEqual(['choose-word', 'yes-no'])
    expect(isFlashcardEnabled(['choose-word'])).toBe(false)
    expect(isFlashcardEnabled(['flashcard', 'listen-and-choose'])).toBe(true)
  })
})
