import type { LessonCard } from './types'

export type LessonPhase =
  | 'flashcard'
  | 'listen-choose'
  | 'choose-word'
  | 'yes-no'
  | 'result'

export type Checkpoint = number

export type LessonProgress = {
  topicId: string
  sessionId: string
  mode: 'learn' | 'review'
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
  card: LessonCard
  choices: LessonCard[]
}

export type WordChoiceQuestion = {
  card: LessonCard
  choices: string[]
}

export type YesNoQuestion = {
  card: LessonCard
  prompt: string
  answerIsYes: boolean
}

export const WORDS_PER_CHECKPOINT = 5

const LEARN_PHASE_ORDER: LessonPhase[] = [
  'listen-choose',
  'choose-word',
  'yes-no',
]

export function createInitialProgress(
  topicId: string,
  mode: 'learn' | 'review' = 'learn',
): LessonProgress {
  return {
    topicId,
    sessionId: mode === 'review' ? `review-${topicId}` : `lesson-${topicId}`,
    mode,
    checkpoint: 1,
    phase: mode === 'review' ? 'listen-choose' : 'flashcard',
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

export function learningCheckpointCount(cardCount: number): number {
  return Math.max(1, Math.ceil(cardCount / WORDS_PER_CHECKPOINT))
}

export function finalCheckpointFor(cardCount: number): number {
  const learning = learningCheckpointCount(cardCount)
  return learning > 1 ? learning + 1 : learning
}

export function cardsForCheckpoint(
  cards: LessonCard[],
  checkpoint: Checkpoint,
): LessonCard[] {
  const learning = learningCheckpointCount(cards.length)
  const finalCheckpoint = finalCheckpointFor(cards.length)

  if (checkpoint >= finalCheckpoint && finalCheckpoint > learning) {
    return cards
  }

  const start = (checkpoint - 1) * WORDS_PER_CHECKPOINT
  return cards.slice(start, start + WORDS_PER_CHECKPOINT)
}

export function buildChoiceQuestion(
  cards: LessonCard[],
  target: LessonCard,
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

export function buildWordChoiceQuestion(
  cards: LessonCard[],
  target: LessonCard,
  choiceCount = 4,
): WordChoiceQuestion {
  const distractors = shuffle(
    cards
      .filter((card) => card.id !== target.id)
      .map((card) => card.word),
  ).slice(0, Math.max(choiceCount - 1, 1))

  return {
    card: target,
    choices: shuffle([target.word, ...distractors]),
  }
}

export function buildYesNoQuestion(target: LessonCard): YesNoQuestion {
  const answerIsYes = Math.random() >= 0.5
  return {
    card: target,
    prompt: answerIsYes
      ? `Is this a ${target.word}?`
      : `Is this a ${fakeOtherWord(target.word)}?`,
    answerIsYes,
  }
}

function fakeOtherWord(word: string): string {
  const pool = ['apple', 'ball', 'chair', 'door', 'egg', 'frog', 'grape', 'hat']
  return pool.find((item) => item !== word) || 'ball'
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

function nextGradedPhase(
  phase: LessonPhase,
  reviewOnly: boolean,
): LessonPhase | null {
  if (reviewOnly) {
    return null
  }
  const index = LEARN_PHASE_ORDER.indexOf(phase)
  if (index < 0 || index >= LEARN_PHASE_ORDER.length - 1) {
    return null
  }
  return LEARN_PHASE_ORDER[index + 1]
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
  finalCheckpoint = 3,
  learningCheckpoints = finalCheckpoint > 1 ? finalCheckpoint - 1 : 1,
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

  const reviewOnly =
    progress.checkpoint === finalCheckpoint &&
    finalCheckpoint > learningCheckpoints
  const gradedNext = nextGradedPhase(progress.phase, reviewOnly)

  if (gradedNext) {
    return {
      ...next,
      phase: gradedNext,
      questionIndex: 0,
    }
  }

  if (progress.checkpoint < finalCheckpoint) {
    const nextCheckpoint = progress.checkpoint + 1
    const nextIsReviewOnly =
      nextCheckpoint === finalCheckpoint && finalCheckpoint > learningCheckpoints
    return {
      ...next,
      checkpoint: nextCheckpoint,
      phase: nextIsReviewOnly ? 'listen-choose' : 'flashcard',
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
