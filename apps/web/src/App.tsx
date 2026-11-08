import { useEffect, useState } from 'react'
import type { ChildProfile } from '@english-for-kids/shared'
import './app.css'
import {
  createProfile,
  loadOrStartLesson,
  loadProfile,
  loadTopicSummary,
  restartLesson,
  saveLessonProgress,
} from './db'
import {
  advanceAfterFlashcards,
  advanceAfterQuestion,
  cardsForCheckpoint,
  type LessonProgress,
} from './lesson/engine'
import { animalCards } from './sample/animals'
import { HomeScreen } from './screens/HomeScreen'
import { LessonScreen } from './screens/LessonScreen'
import { ResultScreen } from './screens/ResultScreen'
import { prepareVoices, stopSpeaking } from './speech'

type Screen = 'home' | 'lesson' | 'result'

function App() {
  const [profile, setProfile] = useState<ChildProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('fox')
  const [error, setError] = useState('')
  const [screen, setScreen] = useState<Screen>('home')
  const [progress, setProgress] = useState<LessonProgress | null>(null)
  const [learnedCount, setLearnedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(animalCards.length)
  const [topicCompleted, setTopicCompleted] = useState(false)

  useEffect(() => {
    prepareVoices()
    return () => stopSpeaking()
  }, [])

  useEffect(() => {
    async function bootstrap() {
      try {
        const savedProfile = await loadProfile()
        setProfile(savedProfile ?? null)
        if (savedProfile) {
          const summary = await loadTopicSummary()
          setLearnedCount(summary.learnedCount)
          setTotalCount(summary.totalCount)
          setTopicCompleted(summary.topic?.status === 'completed')
          setProgress(summary.activeLesson ?? null)
        }
      } catch {
        setError('Không thể đọc dữ liệu đã lưu trên thiết bị.')
      } finally {
        setLoading(false)
      }
    }

    void bootstrap()
  }, [])

  async function refreshSummary() {
    const summary = await loadTopicSummary()
    const latestProfile = await loadProfile()
    setProfile(latestProfile ?? null)
    setLearnedCount(summary.learnedCount)
    setTotalCount(summary.totalCount)
    setTopicCompleted(summary.topic?.status === 'completed')
    setProgress(summary.activeLesson ?? null)
  }

  async function handleSetup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const displayName = name.trim()
    if (!displayName) {
      setError('Ba mẹ hãy nhập tên của bé.')
      return
    }

    setError('')
    try {
      const savedProfile = await createProfile(displayName, avatar)
      setProfile(savedProfile)
      await refreshSummary()
      const lesson = await loadOrStartLesson()
      setProgress(lesson)
      setScreen(lesson.phase === 'result' ? 'result' : 'lesson')
    } catch {
      setError('Không thể lưu hồ sơ. Ba mẹ hãy thử lại.')
    }
  }

  async function handleContinueLesson() {
    setError('')
    try {
      const lesson = await loadOrStartLesson()
      setProgress(lesson)
      setScreen(lesson.phase === 'result' ? 'result' : 'lesson')
    } catch {
      setError('Không thể mở bài học.')
    }
  }

  async function handleRestartLesson() {
    setError('')
    try {
      const lesson = await restartLesson()
      setProgress(lesson)
      setTopicCompleted(false)
      setScreen('lesson')
      await refreshSummary()
    } catch {
      setError('Không thể bắt đầu lại bài học.')
    }
  }

  async function persist(next: LessonProgress) {
    const saved = await saveLessonProgress(next)
    setProgress(saved)
    await refreshSummary()
    if (saved.phase === 'result' || saved.completed) {
      setScreen('result')
    }
  }

  async function handleFlashcardNext() {
    if (!progress) return
    const checkpointCards = cardsForCheckpoint(animalCards, progress.checkpoint)
    const next = advanceAfterFlashcards(progress, checkpointCards.length)
    await persist(next)
  }

  async function handleAnswer(payload: {
    firstTry: boolean
    correct: boolean
    revealed: boolean
    cardId: string
  }) {
    if (!progress) return
    const checkpointCards = cardsForCheckpoint(animalCards, progress.checkpoint)
    const next = advanceAfterQuestion(
      progress,
      checkpointCards.length,
      payload,
    )
    await persist(next)
  }

  if (loading) {
    return (
      <main className="app-shell loading-state" aria-live="polite">
        <div className="loading-dot" />
        <p>Đang mở bài học…</p>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="app-shell setup-screen">
        <section className="setup-heading">
          <div className="book-mark" aria-hidden="true">
            Aa
          </div>
          <h1>Chào mừng con</h1>
          <p>Ba mẹ chỉ cần thiết lập một lần</p>
        </section>

        <form className="setup-form" onSubmit={handleSetup}>
          <fieldset>
            <legend>Chọn hình đại diện</legend>
            <div className="avatar-list">
              {[
                ['fox', 'Cáo'],
                ['bear', 'Gấu'],
                ['rabbit', 'Thỏ'],
              ].map(([value, label]) => (
                <label
                  className={`avatar-option ${avatar === value ? 'selected' : ''}`}
                  key={value}
                >
                  <input
                    checked={avatar === value}
                    name="avatar"
                    onChange={() => setAvatar(value)}
                    type="radio"
                    value={value}
                  />
                  <span aria-hidden="true">{label.slice(0, 1)}</span>
                  <small>{label}</small>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="name-field">
            <span>Tên của bé</span>
            <input
              autoComplete="off"
              id="child-name"
              maxLength={30}
              name="childName"
              onChange={(event) => setName(event.target.value)}
              placeholder="Nhập tên của bé"
              value={name}
            />
          </label>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <button className="primary-button" type="submit">
            Bắt đầu học
          </button>
        </form>
      </main>
    )
  }

  if (screen === 'lesson' && progress && progress.phase !== 'result') {
    return (
      <LessonScreen
        cards={animalCards}
        progress={progress}
        onFlashcardNext={() => {
          void handleFlashcardNext()
        }}
        onAnswer={(payload) => {
          void handleAnswer(payload)
        }}
        onExit={() => {
          stopSpeaking()
          setScreen('home')
          void refreshSummary()
        }}
      />
    )
  }

  if (screen === 'result' && progress) {
    return (
      <ResultScreen
        progress={progress}
        onHome={() => {
          setScreen('home')
          void refreshSummary()
        }}
        onContinue={() => {
          void handleRestartLesson()
        }}
      />
    )
  }

  return (
    <>
      <HomeScreen
        profile={profile}
        learnedCount={learnedCount}
        totalCount={totalCount}
        hasActiveLesson={Boolean(progress && !progress.completed)}
        topicCompleted={topicCompleted}
        onContinue={() => {
          void handleContinueLesson()
        }}
        onRestart={() => {
          void handleRestartLesson()
        }}
      />
      {error && (
        <p className="error-message floating-error" role="alert">
          {error}
        </p>
      )}
    </>
  )
}

export default App
