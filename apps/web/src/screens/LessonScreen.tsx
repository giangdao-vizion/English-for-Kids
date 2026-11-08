import { useMemo, useState, type ReactNode } from 'react'
import {
  buildChoiceQuestion,
  buildWordChoiceQuestion,
  buildYesNoQuestion,
  cardsForCheckpoint,
  type LessonProgress,
} from '../lesson/engine'
import type { LessonCard } from '../lesson/types'
import {
  getSpeechSupportMessage,
  speakEnglish,
  speakVietnamese,
  unlockSpeech,
} from '../speech'

type LessonScreenProps = {
  topicName: string
  cards: LessonCard[]
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
  topicName,
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
  const speechHint = getSpeechSupportMessage()

  if (progress.phase === 'flashcard') {
    const card = checkpointCards[progress.cardIndex]
    return (
      <FlashcardStep
        topicName={topicName}
        card={card}
        checkpoint={progress.checkpoint}
        index={progress.cardIndex}
        total={checkpointCards.length}
        speechHint={speechHint}
        onNext={onFlashcardNext}
        onExit={onExit}
      />
    )
  }

  const target = checkpointCards[progress.questionIndex]

  if (progress.phase === 'choose-word') {
    return (
      <ChooseWordStep
        key={`word-${target.id}`}
        topicName={topicName}
        allCards={cards}
        target={target}
        checkpoint={progress.checkpoint}
        index={progress.questionIndex}
        total={checkpointCards.length}
        speechHint={speechHint}
        onAnswer={onAnswer}
        onExit={onExit}
      />
    )
  }

  if (progress.phase === 'yes-no') {
    return (
      <YesNoStep
        key={`yesno-${target.id}`}
        topicName={topicName}
        target={target}
        checkpoint={progress.checkpoint}
        index={progress.questionIndex}
        total={checkpointCards.length}
        speechHint={speechHint}
        onAnswer={onAnswer}
        onExit={onExit}
      />
    )
  }

  return (
    <ListenChooseStep
      key={`listen-${target.id}`}
      topicName={topicName}
      allCards={cards}
      target={target}
      checkpoint={progress.checkpoint}
      index={progress.questionIndex}
      total={checkpointCards.length}
      speechHint={speechHint}
      onAnswer={onAnswer}
      onExit={onExit}
    />
  )
}

function phaseLabel(phase: LessonProgress['phase']): string {
  if (phase === 'choose-word') return 'Chọn từ đúng'
  if (phase === 'yes-no') return 'Yes / No'
  if (phase === 'flashcard') return 'Làm quen từ'
  return 'Nghe và chọn'
}

function FlashcardStep({
  topicName,
  card,
  checkpoint,
  index,
  total,
  speechHint,
  onNext,
  onExit,
}: {
  topicName: string
  card: LessonCard
  checkpoint: number
  index: number
  total: number
  speechHint: string | null
  onNext: () => void
  onExit: () => void
}) {
  return (
    <main className="app-shell lesson-screen">
      <LessonHeader
        title={topicName}
        subtitle={`Chặng ${checkpoint} · ${phaseLabel('flashcard')}`}
        progressValue={((index + 1) / total) * 100}
        progressLabel={`${index + 1}/${total}`}
        onExit={onExit}
      />

      <section className="flashcard-panel">
        <CardVisual card={card} size="hero" />
        <h1>{card.word}</h1>
        <p>{card.meaningVietnamese}</p>
        {speechHint && <p className="speech-hint">{speechHint}</p>}
        <div className="speech-actions">
          <button
            className="round-sound"
            type="button"
            aria-label="Nghe tiếng Anh"
            onClick={() => {
              unlockSpeech()
              speakEnglish(card.word)
            }}
          >
            ♪
          </button>
          <button
            className="ghost-sound"
            type="button"
            onClick={() => {
              unlockSpeech()
              speakVietnamese(card.meaningVietnamese)
            }}
          >
            Tiếng Việt
          </button>
        </div>
      </section>

      <button
        className="primary-button"
        type="button"
        onClick={() => {
          unlockSpeech()
          speakEnglish(card.word)
          onNext()
        }}
      >
        {index + 1 < total ? 'Từ tiếp theo' : 'Bắt đầu luyện'}
      </button>
    </main>
  )
}

function ListenChooseStep({
  topicName,
  allCards,
  target,
  checkpoint,
  index,
  total,
  speechHint,
  onAnswer,
  onExit,
}: {
  topicName: string
  allCards: LessonCard[]
  target: LessonCard
  checkpoint: number
  index: number
  total: number
  speechHint: string | null
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

  function finish(payload: {
    firstTry: boolean
    correct: boolean
    revealed: boolean
    cardId: string
  }) {
    window.setTimeout(() => onAnswer(payload), payload.revealed ? 900 : 550)
  }

  function handleChoose(cardId: string) {
    if (revealed) return
    unlockSpeech()
    const correct = cardId === target.id
    const nextAttempts = attempts + 1
    setSelectedId(cardId)
    setAttempts(nextAttempts)

    if (correct) {
      setFeedback(`Chính xác! ${target.word} – ${target.meaningVietnamese}`)
      speakEnglish(target.word)
      finish({
        firstTry: nextAttempts === 1,
        correct: true,
        revealed: false,
        cardId: target.id,
      })
      return
    }

    if (nextAttempts >= 2) {
      setRevealed(true)
      setFeedback(`Đáp án đúng là ${target.word}`)
      speakEnglish(target.word)
      finish({
        firstTry: false,
        correct: false,
        revealed: true,
        cardId: target.id,
      })
      return
    }

    setFeedback('Con thử lại nhé')
    speakVietnamese('Con thử lại nhé')
  }

  return (
    <main className="app-shell lesson-screen listen-screen">
      <LessonHeader
        title={topicName}
        subtitle={`Chặng ${checkpoint} · ${phaseLabel('listen-choose')}`}
        progressValue={((index + 1) / total) * 100}
        progressLabel={`${index + 1}/${total}`}
        onExit={onExit}
      />

      <section className="prompt-panel compact-prompt">
        <button
          className="round-sound large"
          type="button"
          aria-label="Nghe lại"
          onClick={() => {
            unlockSpeech()
            speakEnglish(target.word)
          }}
        >
          ♪
        </button>
        <p>Chạm ♪ để nghe rồi chọn hình</p>
        {speechHint && <p className="speech-hint">{speechHint}</p>}
      </section>

      <AnswerStage feedback={feedback}>
        <div className="choice-grid">
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
                <CardVisual card={choice} size="choice" />
                <strong>{choice.word}</strong>
              </button>
            )
          })}
        </div>
      </AnswerStage>
    </main>
  )
}

function ChooseWordStep({
  topicName,
  allCards,
  target,
  checkpoint,
  index,
  total,
  speechHint,
  onAnswer,
  onExit,
}: {
  topicName: string
  allCards: LessonCard[]
  target: LessonCard
  checkpoint: number
  index: number
  total: number
  speechHint: string | null
  onAnswer: (payload: {
    firstTry: boolean
    correct: boolean
    revealed: boolean
    cardId: string
  }) => void
  onExit: () => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [feedback, setFeedback] = useState('')
  const question = useMemo(
    () => buildWordChoiceQuestion(allCards, target),
    [allCards, target],
  )

  function handleChoose(word: string) {
    if (revealed) return
    unlockSpeech()
    const correct = word === target.word
    const nextAttempts = attempts + 1
    setSelected(word)
    setAttempts(nextAttempts)

    if (correct) {
      setFeedback(`Đúng rồi! ${target.word}`)
      speakEnglish(target.word)
      window.setTimeout(() => {
        onAnswer({
          firstTry: nextAttempts === 1,
          correct: true,
          revealed: false,
          cardId: target.id,
        })
      }, 550)
      return
    }

    if (nextAttempts >= 2) {
      setRevealed(true)
      setFeedback(`Từ đúng là ${target.word}`)
      speakEnglish(target.word)
      window.setTimeout(() => {
        onAnswer({
          firstTry: false,
          correct: false,
          revealed: true,
          cardId: target.id,
        })
      }, 900)
      return
    }

    setFeedback('Con thử lại nhé')
    speakVietnamese('Con thử lại nhé')
  }

  return (
    <main className="app-shell lesson-screen listen-screen">
      <LessonHeader
        title={topicName}
        subtitle={`Chặng ${checkpoint} · ${phaseLabel('choose-word')}`}
        progressValue={((index + 1) / total) * 100}
        progressLabel={`${index + 1}/${total}`}
        onExit={onExit}
      />

      <section className="prompt-panel compact-prompt">
        <CardVisual card={target} size="hero" />
        <button
          className="round-sound"
          type="button"
          aria-label="Nghe từ"
          onClick={() => {
            unlockSpeech()
            speakEnglish(target.word)
          }}
        >
          ♪
        </button>
        <p>Nhìn hình, nghe rồi chọn chữ đúng</p>
        {speechHint && <p className="speech-hint">{speechHint}</p>}
      </section>

      <AnswerStage feedback={feedback}>
        <div className="word-choice-grid">
          {question.choices.map((word) => {
            let stateClass = ''
            if (selected === word && word === target.word) stateClass = 'correct'
            if (selected === word && word !== target.word) stateClass = 'wrong'
            if (revealed && word === target.word) stateClass = 'correct'
            return (
              <button
                key={word}
                className={`word-choice ${stateClass}`}
                type="button"
                disabled={revealed}
                onClick={() => handleChoose(word)}
              >
                {word}
              </button>
            )
          })}
        </div>
      </AnswerStage>
    </main>
  )
}

function YesNoStep({
  topicName,
  target,
  checkpoint,
  index,
  total,
  speechHint,
  onAnswer,
  onExit,
}: {
  topicName: string
  target: LessonCard
  checkpoint: number
  index: number
  total: number
  speechHint: string | null
  onAnswer: (payload: {
    firstTry: boolean
    correct: boolean
    revealed: boolean
    cardId: string
  }) => void
  onExit: () => void
}) {
  const question = useMemo(() => buildYesNoQuestion(target), [target])
  const [selected, setSelected] = useState<'yes' | 'no' | null>(null)
  const [feedback, setFeedback] = useState('')

  function handleChoose(value: 'yes' | 'no') {
    if (selected) return
    unlockSpeech()
    setSelected(value)
    const correct =
      (value === 'yes' && question.answerIsYes) ||
      (value === 'no' && !question.answerIsYes)
    setFeedback(correct ? 'Chính xác!' : `Đáp án: ${question.answerIsYes ? 'Yes' : 'No'}`)
    speakEnglish(correct ? 'Yes' : question.answerIsYes ? 'Yes' : 'No')
    window.setTimeout(() => {
      onAnswer({
        firstTry: true,
        correct,
        revealed: !correct,
        cardId: target.id,
      })
    }, correct ? 550 : 900)
  }

  return (
    <main className="app-shell lesson-screen listen-screen">
      <LessonHeader
        title={topicName}
        subtitle={`Chặng ${checkpoint} · ${phaseLabel('yes-no')}`}
        progressValue={((index + 1) / total) * 100}
        progressLabel={`${index + 1}/${total}`}
        onExit={onExit}
      />

      <section className="prompt-panel compact-prompt">
        <CardVisual card={target} size="hero" />
        <button
          className="round-sound"
          type="button"
          aria-label="Nghe câu hỏi"
          onClick={() => {
            unlockSpeech()
            speakEnglish(question.prompt)
          }}
        >
          ♪
        </button>
        <h2 className="yesno-prompt">{question.prompt}</h2>
        <p>Chạm ♪ để nghe câu hỏi</p>
        {speechHint && <p className="speech-hint">{speechHint}</p>}
      </section>

      <AnswerStage feedback={feedback}>
        <div className="yesno-grid">
          <button
            className={`word-choice ${selected === 'yes' ? (question.answerIsYes ? 'correct' : 'wrong') : ''}`}
            type="button"
            disabled={Boolean(selected)}
            onClick={() => handleChoose('yes')}
          >
            Yes
          </button>
          <button
            className={`word-choice ${selected === 'no' ? (!question.answerIsYes ? 'correct' : 'wrong') : ''}`}
            type="button"
            disabled={Boolean(selected)}
            onClick={() => handleChoose('no')}
          >
            No
          </button>
        </div>
      </AnswerStage>
    </main>
  )
}

function AnswerStage({
  feedback,
  children,
}: {
  feedback: string
  children: ReactNode
}) {
  return (
    <section className="answer-stage" aria-live="polite">
      {children}
      <p
        className={`lesson-feedback ${
          feedback
            ? feedback.startsWith('Chính xác') || feedback.startsWith('Đúng')
              ? 'ok'
              : 'retry'
            : 'idle'
        }`}
        role="status"
      >
        {feedback || '\u00a0'}
      </p>
    </section>
  )
}

function CardVisual({
  card,
  size,
}: {
  card: LessonCard
  size: 'hero' | 'choice'
}) {
  if (card.imageUrl) {
    return (
      <div
        className={size === 'hero' ? 'animal-hero photo' : 'choice-emoji photo'}
        aria-hidden="true"
      >
        <img src={card.imageUrl} alt="" />
      </div>
    )
  }

  return (
    <div
      className={size === 'hero' ? 'animal-hero' : 'choice-emoji'}
      style={{ background: card.color }}
      aria-hidden="true"
    >
      <span>{card.emoji ?? card.word.slice(0, 1).toUpperCase()}</span>
    </div>
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
      <div className="lesson-header-main">
        <div className="lesson-header-top">
          <div className="lesson-header-copy">
            <strong>{title}</strong>
            <span>{subtitle}</span>
          </div>
          <span className="progress-chip">{progressLabel}</span>
        </div>
        <div className="progress-track" aria-hidden="true">
          <div
            className="progress-fill"
            style={{ width: `${Math.min(progressValue, 100)}%` }}
          />
        </div>
      </div>
    </header>
  )
}
