import { describe, expect, it } from 'vitest'
import { colorForWord, guessWordFromFilename } from './images'

describe('image helpers', () => {
  it('guesses english words from filenames', () => {
    expect(guessWordFromFilename('Cat.png')).toBe('cat')
    expect(guessWordFromFilename('red-apple_01.jpg')).toBe('red apple')
    expect(guessWordFromFilename('123.png')).toBe('')
  })

  it('picks a stable palette color for a word', () => {
    expect(colorForWord('cat')).toBe(colorForWord('cat'))
    expect(colorForWord('dog')).not.toBe('')
  })
})
