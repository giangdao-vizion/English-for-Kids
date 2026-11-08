import { useEffect, useMemo, useState } from 'react'
import type { SampleCard } from '../sample/animals'
import {
  buildChoiceQuestion,
  cardsForCheckpoint,
  type LessonProgress,
} from '../lesson/engine'
import { speakEnglish, speakVietnamese, stopSpeaking } from '../speech'

type LessonScreenProps = {
  cards: SampleCard[]
  progress: LessonProgress
  onFlashcardNext: () => void
  onAnswer: (payload: {
    firstTry: boolean
    correct: boolean
    revealed: boolean
    cardId: string
  }) => void
  onExit: () => void
}

export function LessonScreen({
  cards,
  progress,
  onFlashcardNext,
  onAnswer,
  onExit,
}: LessonScreenProps) {
  const checkpointCards = useMemo(
    () => cardsForCheckpoint(cards, progress.checkpoint),
    [cards, progress.checkpoint],
  )

  if (progress.phase === 'flashcard') {
    const card = checkpointCards[progress.cardIndex]
    return (
      <FlashcardStep
        card={card}
        checkpoint={progress.checkpoint}
        index={progress.cardIndex}
        total={checkpointCards.length}
        onNext={onFlashcardNext}
        onExit={onExit}
      />
    )
  }

  const target = checkpointCards[progress.questionIndex]
  return (
    <ListenChooseStep
      key={target.id}
      allCards={cards}
      target={target}
      checkpoint={progress.checkpoint}
      index={progress.questionIndex}
      total={checkpointCards.length}
      onAnswer={onAnswer}
      onExit={onExit}
    />
  )
}

function FlashcardStep({
  card,
  checkpoint,
  index,
  total,
  onNext,
  onExit,
}: {
  card: SampleCard
  checkpoint: number
  index: number
  total: number
  onNext: () => void
  onExit: () => void
}) {
  useEffect(() => {
    speakEnglish(card.word)
    return () => stopSpeaking()
  }, [card.id, card.word])

  return (
    <main className="app-shell lesson-screen">
      <LessonHeader
        title="Animals"
        subtitle={`Chặng ${checkpoint} · Làm quen từ`}
        progressValue={((index + 1) / total) * 100}
        progressLabel={`${index + 1}/${total}`}
        onExit={onExit}
      />

      <section className="flashcard-panel">
        <div
          className="animal-hero"
          style={{ background: card.color }}
          aria-hidden="true"
        >
          <span>{card.emoji}</span>
        </div>
        <h1>{card.word}</h1>
        <p>{card.meaningVietnamese}</p>
        <div className="speech-actions">
          <button
            className="round-sound"
            type="button"
            aria-label="Nghe tiếng Anh"
            onClick={() => speakEnglish(card.word)}
          >
            ♪
          </button>
          <button
            className="ghost-sound"
            type="button"
            onClick={() => speakVietnamese(card.meaningVietnamese)}
          >
            Tiếng Việt
          </button>
        </div>
      </section>

      <button className="primary-button" type="button" onClick={onNext}>
        {index + 1 < total ? 'Từ tiếp theo' : 'Bắt đầu luyện'}
      </button>
    </main>
  )
}

function ListenChooseStep({
  allCards,
  target,
  checkpoint,
  index,
  total,
  onAnswer,
  onExit,
}: {
  allCards: SampleCard[]
  target: SampleCard
  checkpoint: number
  index: number
  total: number
  onAnswer: (payload: {
    firstTry: boolean
    correct: boolean
    revealed: boolean
    cardId: string
  }) => void
  onExit: () => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [feedback, setFeedback] = useState('')
  const question = useMemo(
    () => buildChoiceQuestion(allCards, target),
    [allCards, target],
  )

  useEffect(() => {
    speakEnglish(target.word)
    return () => stopSpeaking()
  }, [target.word])

  function handleChoose(cardId: string) {
    if (revealed) {
      return
    }

    const correct = cardId === target.id
    const nextAttempts = attempts + 1
    setSelectedId(cardId)
    setAttempts(nextAttempts)

    if (correct) {
      setFeedback(`Chính xác! ${target.word} – ${target.meaningVietnamese}`)
      speakEnglish(target.word)
      window.setTimeout(() => {
        onAnswer({
          firstTry: nextAttempts === 1,
          correct: true,
          revealed: false,
          cardId: target.id,
        })
      }, 700)
      return
    }

    if (nextAttempts >= 2) {
      setRevealed(true)
      setFeedback(`Đáp án đúng là ${target.word}`)
      speakEnglish(target.word)
      window.setTimeout(() => {
        onAnswer({
          firstTry: false,
          correct: false,
          revealed: true,
          cardId: target.id,
        })
      }, 1100)
      return
    }

    setFeedback('Con thử lại nhé')
    speakVietnamese('Con thử lại nhé')
    window.setTimeout(() => speakEnglish(target.word), 700)
  }

  return (
    <main className="app-shell lesson-screen">
      <LessonHeader
        title="Animals"
        subtitle={`Chặng ${checkpoint} · Nghe và chọn`}
        progressValue={((index + 1) / total) * 100}
        progressLabel={`${index + 1}/${total}`}
        onExit={onExit}
      />

      <section className="prompt-panel">
        <button
          className="round-sound large"
          type="button"
          aria-label="Nghe lại"
          onClick={() => speakEnglish(target.word)}
        >
          ♪
        </button>
        <p>Chạm để nghe lại</p>
      </section>

      <section className="choice-grid">
        {question.choices.map((choice) => {
          const selected = selectedId === choice.id
          const isCorrect = choice.id === target.id
          let stateClass = ''
          if (selected && isCorrect) stateClass = 'correct'
          if (selected && !isCorrect) stateClass = 'wrong'
          if (revealed && isCorrect) stateClass = 'correct'

          return (
            <button
              key={choice.id}
              className={`choice-card ${stateClass}`}
              type="button"
              onClick={() => handleChoose(choice.id)}
              disabled={revealed}
            >
              <span
                className="choice-emoji"
                style={{ background: choice.color }}
                aria-hidden="true"
              >
                {choice.emoji}
              </span>
              <strong>{choice.word}</strong>
            </button>
          )
        })}
      </section>

      {feedback && (
        <p
          className={`lesson-feedback ${
            feedback.startsWith('Chính xác') ? 'ok' : 'retry'
          }`}
          role="status"
        >
          {feedback}
        </p>
      )}
    </main>
  )
}

function LessonHeader({
  title,
  subtitle,
  progressValue,
  progressLabel,
  onExit,
}: {
  title: string
  subtitle: string
  progressValue: number
  progressLabel: string
  onExit: () => void
}) {
  return (
    <header className="lesson-header">
      <button className="back-chip" type="button" onClick={onExit}>
        ‹
      </button>
      <div>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <span className="progress-chip">{progressLabel}</span>
      <div className="progress-track" aria-hidden="true">
        <div
          className="progress-fill"
          style={{ width: `${Math.min(progressValue, 100)}%` }}
        />
      </div>
    </header>
  )
}
