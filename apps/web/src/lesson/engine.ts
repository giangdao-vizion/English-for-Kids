import type { SampleCard } from '../sample/animals'

export type LessonPhase = 'flashcard' | 'listen-choose' | 'result'
export type Checkpoint = 1 | 2 | 3

export type LessonProgress = {
  topicId: string
  checkpoint: Checkpoint
  phase: LessonPhase
  cardIndex: number
  questionIndex: number
  firstTryCorrect: number
  answeredQuestions: number
  revealCount: number
  incorrectCardIds: string[]
  completed: boolean
  awardedStars: 0 | 1 | 2 | 3
  updatedAt: string
}

export type ChoiceQuestion = {
  card: SampleCard
  choices: SampleCard[]
}

export const WORDS_PER_CHECKPOINT = 5

export function createInitialProgress(topicId: string): LessonProgress {
  return {
    topicId,
    checkpoint: 1,
    phase: 'flashcard',
    cardIndex: 0,
    questionIndex: 0,
    firstTryCorrect: 0,
    answeredQuestions: 0,
    revealCount: 0,
    incorrectCardIds: [],
    completed: false,
    awardedStars: 0,
    updatedAt: new Date().toISOString(),
  }
}

export function cardsForCheckpoint(
  cards: SampleCard[],
  checkpoint: Checkpoint,
): SampleCard[] {
  if (checkpoint === 3) {
    return cards
  }
  const start = (checkpoint - 1) * WORDS_PER_CHECKPOINT
  return cards.slice(start, start + WORDS_PER_CHECKPOINT)
}

export function buildChoiceQuestion(
  cards: SampleCard[],
  target: SampleCard,
  choiceCount = 4,
): ChoiceQuestion {
  const distractors = shuffle(
    cards.filter((card) => card.id !== target.id),
  ).slice(0, Math.max(choiceCount - 1, 1))

  return {
    card: target,
    choices: shuffle([target, ...distractors]),
  }
}

export function calculateStars(
  answeredQuestions: number,
  firstTryCorrect: number,
  revealCount: number,
): 0 | 1 | 2 | 3 {
  if (answeredQuestions === 0) {
    return 0
  }

  let stars: 0 | 1 | 2 | 3 = 1
  const firstTryRate = firstTryCorrect / answeredQuestions
  const revealRate = revealCount / answeredQuestions

  if (firstTryRate >= 0.8) {
    stars = 2
  }
  if (firstTryRate >= 0.8 && revealRate <= 0.2) {
    stars = 3
  }
  return stars
}

export function advanceAfterFlashcards(
  progress: LessonProgress,
  totalCardsInCheckpoint: number,
): LessonProgress {
  if (progress.cardIndex + 1 < totalCardsInCheckpoint) {
    return {
      ...progress,
      cardIndex: progress.cardIndex + 1,
      updatedAt: new Date().toISOString(),
    }
  }

  return {
    ...progress,
    phase: 'listen-choose',
    questionIndex: 0,
    updatedAt: new Date().toISOString(),
  }
}

export function advanceAfterQuestion(
  progress: LessonProgress,
  totalQuestions: number,
  options: {
    firstTry: boolean
    correct: boolean
    revealed: boolean
    cardId: string
  },
): LessonProgress {
  const next: LessonProgress = {
    ...progress,
    answeredQuestions: progress.answeredQuestions + 1,
    firstTryCorrect:
      progress.firstTryCorrect + (options.firstTry && options.correct ? 1 : 0),
    revealCount: progress.revealCount + (options.revealed ? 1 : 0),
    incorrectCardIds:
      options.correct || progress.incorrectCardIds.includes(options.cardId)
        ? progress.incorrectCardIds
        : [...progress.incorrectCardIds, options.cardId],
    updatedAt: new Date().toISOString(),
  }

  if (progress.questionIndex + 1 < totalQuestions) {
    return {
      ...next,
      questionIndex: progress.questionIndex + 1,
    }
  }

  if (progress.checkpoint < 3) {
    return {
      ...next,
      checkpoint: (progress.checkpoint + 1) as Checkpoint,
      phase: 'flashcard',
      cardIndex: 0,
      questionIndex: 0,
    }
  }

  return {
    ...next,
    phase: 'result',
    completed: true,
    awardedStars: calculateStars(
      next.answeredQuestions,
      next.firstTryCorrect,
      next.revealCount,
    ),
  }
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
}
