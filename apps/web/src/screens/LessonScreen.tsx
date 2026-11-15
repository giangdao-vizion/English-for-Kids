import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react'
import { hasSeenLessonIntro, markLessonIntroSeen } from '../db'
import {
  buildChoiceQuestion,
  buildWordChoiceQuestion,
  buildYesNoQuestion,
  cardsForCheckpoint,
  type LessonPhase,
  type LessonProgress,
} from '../lesson/engine'
import { FEEDBACK_VOICE, LESSON_INTROS } from '../lesson/intros'
import type { LessonCard } from '../lesson/types'
import {
  estimateSpeechMs,
  getSpeechSupportMessage,
  speakEnglish,
  speakNow,
  speakVietnamese,
  stopSpeaking,
  type SpeakPart,
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
  const gateKey = `${progress.checkpoint}:${progress.phase}`
  const [introReady, setIntroReady] = useState(false)
  const [firstTimeByPhase, setFirstTimeByPhase] = useState<
    Record<string, boolean>
  >({})
  const [openedGates, setOpenedGates] = useState<Record<string, true>>({})
  // Nội dung đã đọc ngay sau màn chạm-để-nghe — tránh đọc trùng khi bước mount.
  const gateSpokenKeysRef = useRef(new Set<string>())

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (progress.phase === 'result') {
        if (!cancelled) setIntroReady(true)
        return
      }
      const seen = await hasSeenLessonIntro(progress.phase)
      if (cancelled) return
      setFirstTimeByPhase((previous) => ({
        ...previous,
        [progress.phase]: !seen,
      }))
      setIntroReady(true)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [progress.phase])

  useEffect(() => {
    return () => stopSpeaking()
  }, [progress.phase, progress.checkpoint])

  const gateOpen =
    progress.phase !== 'result' && introReady && !openedGates[gateKey]

  function contentKeyForProgress(): string | null {
    if (progress.phase === 'flashcard') {
      const card = checkpointCards[progress.cardIndex]
      return card
        ? `flash:${progress.checkpoint}:${progress.cardIndex}:${card.id}`
        : null
    }
    const target = checkpointCards[progress.questionIndex]
    if (!target) return null
    return `${progress.phase}:${progress.checkpoint}:${progress.questionIndex}:${target.id}`
  }

  function startPhase() {
    if (progress.phase === 'result') return
    const intro = LESSON_INTROS[progress.phase]
    const firstTime = firstTimeByPhase[progress.phase] !== false
    const guide = firstTime ? intro.speakText : intro.shortSpeak
    const contentKey = contentKeyForProgress()
    if (contentKey) {
      gateSpokenKeysRef.current.add(contentKey)
    }
    // Hướng dẫn VI + nội dung câu/từ đầu tiên trong cùng thao tác chạm.
    speakNow([{ text: guide, lang: 'vi' }, ...firstContentParts()])
    if (firstTime) {
      void markLessonIntroSeen(progress.phase)
      setFirstTimeByPhase((previous) => ({
        ...previous,
        [progress.phase]: false,
      }))
    }
    setOpenedGates((previous) => ({ ...previous, [gateKey]: true }))
  }

  function firstContentParts(): SpeakPart[] {
    if (progress.phase === 'flashcard') {
      const card = checkpointCards[progress.cardIndex]
      if (!card) return []
      return [{ text: card.word, lang: 'en' }]
    }
    const target = checkpointCards[progress.questionIndex]
    if (!target) return []
    if (progress.phase === 'yes-no') {
      return [{ text: buildYesNoQuestion(target).prompt, lang: 'en' }]
    }
    return [{ text: target.word, lang: 'en' }]
  }

  if (!introReady) {
    return (
      <main className="app-shell lesson-screen loading-state" aria-live="polite">
        <div className="loading-dot" />
        <p>Đang mở bài…</p>
      </main>
    )
  }

  if (gateOpen && progress.phase !== 'result') {
    const intro = LESSON_INTROS[progress.phase]
    const firstTime = firstTimeByPhase[progress.phase] !== false
    return (
      <main className="app-shell lesson-screen">
        <LessonHeader
          title={topicName}
          subtitle={`Chặng ${progress.checkpoint} · ${phaseLabel(progress.phase)}`}
          progressValue={0}
          progressLabel={firstTime ? 'Hướng dẫn' : 'Nghe'}
          onExit={onExit}
        />
        <section className="lesson-intro-panel">
          <h1>{intro.title}</h1>
          <p>
            {firstTime
              ? intro.body
              : 'Chạm nút bên dưới để nghe hướng dẫn và bắt đầu chặng này.'}
          </p>
          {speechHint && <p className="speech-hint">{speechHint}</p>}
          <button className="primary-button" type="button" onClick={startPhase}>
            {firstTime ? 'Nghe hướng dẫn và bắt đầu' : 'Chạm để nghe và bắt đầu'}
          </button>
        </section>
      </main>
    )
  }

  if (progress.phase === 'flashcard') {
    const card = checkpointCards[progress.cardIndex]
    const contentKey = `flash:${progress.checkpoint}:${progress.cardIndex}:${card.id}`
    return (
      <FlashcardStep
        key={contentKey}
        topicName={topicName}
        card={card}
        checkpoint={progress.checkpoint}
        index={progress.cardIndex}
        total={checkpointCards.length}
        speechHint={speechHint}
        contentKey={contentKey}
        gateSpokenKeysRef={gateSpokenKeysRef}
        onNext={onFlashcardNext}
        onExit={onExit}
      />
    )
  }

  const target = checkpointCards[progress.questionIndex]
  const gradedKey = `${progress.phase}:${progress.checkpoint}:${progress.questionIndex}:${target.id}`

  if (progress.phase === 'choose-word') {
    return (
      <ChooseWordStep
        key={gradedKey}
        topicName={topicName}
        allCards={cards}
        target={target}
        checkpoint={progress.checkpoint}
        index={progress.questionIndex}
        total={checkpointCards.length}
        speechHint={speechHint}
        contentKey={gradedKey}
        gateSpokenKeysRef={gateSpokenKeysRef}
        onAnswer={onAnswer}
        onExit={onExit}
      />
    )
  }

  if (progress.phase === 'yes-no') {
    return (
      <YesNoStep
        key={gradedKey}
        topicName={topicName}
        target={target}
        checkpoint={progress.checkpoint}
        index={progress.questionIndex}
        total={checkpointCards.length}
        speechHint={speechHint}
        contentKey={gradedKey}
        gateSpokenKeysRef={gateSpokenKeysRef}
        onAnswer={onAnswer}
        onExit={onExit}
      />
    )
  }

  return (
    <ListenChooseStep
      key={gradedKey}
      topicName={topicName}
      allCards={cards}
      target={target}
      checkpoint={progress.checkpoint}
      index={progress.questionIndex}
      total={checkpointCards.length}
      speechHint={speechHint}
      contentKey={gradedKey}
      gateSpokenKeysRef={gateSpokenKeysRef}
      onAnswer={onAnswer}
      onExit={onExit}
    />
  )
}

function phaseLabel(phase: LessonPhase): string {
  if (phase === 'choose-word') return 'Chọn từ đúng'
  if (phase === 'yes-no') return 'Yes / No'
  if (phase === 'flashcard') return 'Làm quen từ'
  if (phase === 'result') return 'Kết quả'
  return 'Nghe và chọn'
}

function usePromptSpeech(
  parts: SpeakPart[],
  contentKey: string,
  gateSpokenKeysRef: MutableRefObject<Set<string>>,
) {
  useEffect(() => {
    // Câu đầu đã được đọc trong gesture "Chạm để nghe" — không cắt tiếng đó.
    if (gateSpokenKeysRef.current.has(contentKey)) {
      return
    }
    const timer = window.setTimeout(() => {
      speakNow(parts)
    }, 200)
    return () => {
      window.clearTimeout(timer)
      stopSpeaking()
    }
    // parts are derived from contentKey for this step instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey])
}

function useFinishTimer() {
  const timerRef = useRef<number | null>(null)
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  return (parts: SpeakPart[], onDone: () => void, minimumMs = 1100) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
    }
    const wait = Math.max(minimumMs, estimateSpeechMs(parts) + 250)
    timerRef.current = window.setTimeout(onDone, wait)
  }
}

function FlashcardStep({
  topicName,
  card,
  checkpoint,
  index,
  total,
  speechHint,
  contentKey,
  gateSpokenKeysRef,
  onNext,
  onExit,
}: {
  topicName: string
  card: LessonCard
  checkpoint: number
  index: number
  total: number
  speechHint: string | null
  contentKey: string
  gateSpokenKeysRef: MutableRefObject<Set<string>>
  onNext: () => void
  onExit: () => void
}) {
  usePromptSpeech(
    [{ text: card.word, lang: 'en' }],
    contentKey,
    gateSpokenKeysRef,
  )

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
            aria-label="Nghe lại tiếng Anh"
            onClick={() => speakEnglish(card.word)}
          >
            ♪
          </button>
          <button
            className="ghost-sound"
            type="button"
            onClick={() => speakVietnamese(card.meaningVietnamese)}
          >
            Nghe lại
          </button>
        </div>
      </section>

      <button
        className="primary-button"
        type="button"
        onClick={() => {
          stopSpeaking()
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
  contentKey,
  gateSpokenKeysRef,
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
  contentKey: string
  gateSpokenKeysRef: MutableRefObject<Set<string>>
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
  const [locked, setLocked] = useState(false)
  const finishAfterSpeech = useFinishTimer()
  const question = useMemo(
    () => buildChoiceQuestion(allCards, target),
    [allCards, target],
  )

  usePromptSpeech(
    [{ text: target.word, lang: 'en' }],
    contentKey,
    gateSpokenKeysRef,
  )

  function handleChoose(cardId: string) {
    if (revealed || locked) return
    const correct = cardId === target.id
    const nextAttempts = attempts + 1
    setSelectedId(cardId)
    setAttempts(nextAttempts)

    if (correct) {
      const parts: SpeakPart[] = [
        { text: FEEDBACK_VOICE.correct, lang: 'en' },
      ]
      setFeedback(FEEDBACK_VOICE.correct)
      setLocked(true)
      speakNow(parts)
      finishAfterSpeech(parts, () => {
        stopSpeaking()
        onAnswer({
          firstTry: nextAttempts === 1,
          correct: true,
          revealed: false,
          cardId: target.id,
        })
      })
      return
    }

    if (nextAttempts >= 2) {
      const revealText = FEEDBACK_VOICE.reveal(target.word)
      const parts: SpeakPart[] = [
        { text: revealText, lang: 'en' },
        { text: target.word, lang: 'en' },
      ]
      setRevealed(true)
      setFeedback(revealText)
      setLocked(true)
      speakNow(parts)
      finishAfterSpeech(
        parts,
        () => {
          stopSpeaking()
          onAnswer({
            firstTry: false,
            correct: false,
            revealed: true,
            cardId: target.id,
          })
        },
        1400,
      )
      return
    }

    setFeedback(FEEDBACK_VOICE.retry)
    speakNow({ text: FEEDBACK_VOICE.retry, lang: 'en' })
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
          onClick={() => speakEnglish(target.word)}
        >
          ♪
        </button>
        <p>Nghe từ rồi chọn hình đúng</p>
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
                disabled={revealed || locked}
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
  contentKey,
  gateSpokenKeysRef,
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
  contentKey: string
  gateSpokenKeysRef: MutableRefObject<Set<string>>
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
  const [locked, setLocked] = useState(false)
  const finishAfterSpeech = useFinishTimer()
  const question = useMemo(
    () => buildWordChoiceQuestion(allCards, target),
    [allCards, target],
  )

  usePromptSpeech(
    [{ text: target.word, lang: 'en' }],
    contentKey,
    gateSpokenKeysRef,
  )

  function handleChoose(word: string) {
    if (revealed || locked) return
    const correct = word === target.word
    const nextAttempts = attempts + 1
    setSelected(word)
    setAttempts(nextAttempts)

    if (correct) {
      const parts: SpeakPart[] = [
        { text: FEEDBACK_VOICE.correct, lang: 'en' },
      ]
      setFeedback(FEEDBACK_VOICE.correct)
      setLocked(true)
      speakNow(parts)
      finishAfterSpeech(parts, () => {
        stopSpeaking()
        onAnswer({
          firstTry: nextAttempts === 1,
          correct: true,
          revealed: false,
          cardId: target.id,
        })
      })
      return
    }

    if (nextAttempts >= 2) {
      const revealText = FEEDBACK_VOICE.reveal(target.word)
      const parts: SpeakPart[] = [
        { text: revealText, lang: 'en' },
        { text: target.word, lang: 'en' },
      ]
      setRevealed(true)
      setFeedback(revealText)
      setLocked(true)
      speakNow(parts)
      finishAfterSpeech(
        parts,
        () => {
          stopSpeaking()
          onAnswer({
            firstTry: false,
            correct: false,
            revealed: true,
            cardId: target.id,
          })
        },
        1400,
      )
      return
    }

    setFeedback(FEEDBACK_VOICE.retry)
    speakNow({ text: FEEDBACK_VOICE.retry, lang: 'en' })
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
          aria-label="Nghe lại từ"
          onClick={() => speakEnglish(target.word)}
        >
          ♪
        </button>
        <p>Nghe từ rồi chọn chữ đúng</p>
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
                disabled={revealed || locked}
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
  contentKey,
  gateSpokenKeysRef,
  onAnswer,
  onExit,
}: {
  topicName: string
  target: LessonCard
  checkpoint: number
  index: number
  total: number
  speechHint: string | null
  contentKey: string
  gateSpokenKeysRef: MutableRefObject<Set<string>>
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
  const [locked, setLocked] = useState(false)
  const finishAfterSpeech = useFinishTimer()

  usePromptSpeech(
    [{ text: question.prompt, lang: 'en' }],
    contentKey,
    gateSpokenKeysRef,
  )

  function handleChoose(value: 'yes' | 'no') {
    if (selected || locked) return
    setSelected(value)
    setLocked(true)
    const correct =
      (value === 'yes' && question.answerIsYes) ||
      (value === 'no' && !question.answerIsYes)
    const answerLabel = question.answerIsYes ? 'Yes' : 'No'
    const parts: SpeakPart[] = correct
      ? [{ text: FEEDBACK_VOICE.correct, lang: 'en' }]
      : [
          { text: FEEDBACK_VOICE.wrongYesNo(answerLabel), lang: 'en' },
          { text: answerLabel, lang: 'en' },
        ]
    setFeedback(
      correct ? FEEDBACK_VOICE.correct : FEEDBACK_VOICE.wrongYesNo(answerLabel),
    )
    speakNow(parts)
    finishAfterSpeech(
      parts,
      () => {
        stopSpeaking()
        onAnswer({
          firstTry: true,
          correct,
          revealed: !correct,
          cardId: target.id,
        })
      },
      correct ? 1100 : 1400,
    )
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
          aria-label="Nghe lại câu hỏi"
          onClick={() => speakEnglish(question.prompt)}
        >
          ♪
        </button>
        <h2 className="yesno-prompt">{question.prompt}</h2>
        <p>Nghe câu hỏi rồi chọn Yes hoặc No</p>
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
            ? feedback.startsWith('Great')
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
