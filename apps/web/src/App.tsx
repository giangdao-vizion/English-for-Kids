import { useEffect, useState } from 'react'
import type { ChildProfile, Topic } from '@english-for-kids/shared'
import './app.css'
import {
  addTopicExercise,
  confirmFlashcardBatch,
  createProfile,
  getLessonExerciseOptions,
  listAddableExercises,
  listAllExerciseConfigs,
  listGifts,
  listPendingRedeems,
  loadOrStartLesson,
  loadProfile,
  loadTopicSummary,
  removeTopicExercise,
  requestRedeem,
  resolveRedeem,
  restartLesson,
  saveLessonProgress,
  setActiveTopicId,
  startReviewLesson,
  upsertGift,
  type GiftItem,
  type RedeemRequest,
} from './db'
import {
  advanceAfterFlashcards,
  advanceAfterQuestion,
  cardsForCheckpoint,
  finalCheckpointFor,
  learningCheckpointCount,
  type LessonProgress,
} from './lesson/engine'
import type { TopicExerciseConfig } from './lesson/exercises'
import type { LessonCard } from './lesson/types'
import { AddFlashcardsScreen } from './screens/AddFlashcardsScreen'
import { GiftShopScreen } from './screens/GiftShopScreen'
import { HomeScreen } from './screens/HomeScreen'
import { LessonScreen } from './screens/LessonScreen'
import { ParentExerciseLibraryScreen } from './screens/ParentExerciseLibraryScreen'
import { ParentGiftsScreen } from './screens/ParentGiftsScreen'
import { ParentHomeScreen } from './screens/ParentHomeScreen'
import { ResultScreen } from './screens/ResultScreen'
import { prepareVoices, stopSpeaking, unlockSpeech } from './speech'

type Screen =
  | 'home'
  | 'lesson'
  | 'result'
  | 'parent-home'
  | 'parent-add'
  | 'parent-gifts'
  | 'parent-exercises'
  | 'gifts'

function normalizeProgress(progress: LessonProgress): LessonProgress {
  return {
    ...progress,
    mode: progress.mode || 'learn',
    sessionId:
      progress.sessionId ||
      (progress.mode === 'review'
        ? `review-${progress.topicId}`
        : `lesson-${progress.topicId}`),
  }
}

function App() {
  const [profile, setProfile] = useState<ChildProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('fox')
  const [error, setError] = useState('')
  const [screen, setScreen] = useState<Screen>('home')
  const [progress, setProgress] = useState<LessonProgress | null>(null)
  const [lessonCards, setLessonCards] = useState<LessonCard[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [activeTopic, setActiveTopic] = useState<Topic | undefined>()
  const [learnedCount, setLearnedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [topicCompleted, setTopicCompleted] = useState(false)
  const [gifts, setGifts] = useState<GiftItem[]>([])
  const [pendingRedeems, setPendingRedeems] = useState<RedeemRequest[]>([])
  const [exerciseConfigsByTopic, setExerciseConfigsByTopic] = useState<
    Record<string, TopicExerciseConfig[]>
  >({})

  useEffect(() => {
    prepareVoices()
    return () => stopSpeaking()
  }, [])

  useEffect(() => {
    return () => {
      for (const card of lessonCards) {
        if (card.imageUrl) URL.revokeObjectURL(card.imageUrl)
      }
    }
  }, [lessonCards])

  async function refreshSummary(topicId?: string) {
    const summary = await loadTopicSummary(topicId)
    const latestProfile = await loadProfile()
    const nextGifts = await listGifts()
    const pending = await listPendingRedeems()
    const exerciseConfigs = await listAllExerciseConfigs()
    setProfile(latestProfile ?? null)
    setTopics(summary.topics)
    setActiveTopic(summary.topic)
    setLearnedCount(summary.learnedCount)
    setTotalCount(summary.totalCount)
    setTopicCompleted(summary.topic?.status === 'completed')
    setProgress(summary.activeLesson ? normalizeProgress(summary.activeLesson) : null)
    setGifts(nextGifts)
    setPendingRedeems(pending)
    setExerciseConfigsByTopic(exerciseConfigs)
    setLessonCards((previous) => {
      for (const card of previous) {
        if (card.imageUrl) URL.revokeObjectURL(card.imageUrl)
      }
      return summary.cards
    })
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const savedProfile = await loadProfile()
        setProfile(savedProfile ?? null)
        if (savedProfile) {
          await refreshSummary()
        }
      } catch {
        setError('Không thể đọc dữ liệu đã lưu trên thiết bị.')
      } finally {
        setLoading(false)
      }
    }
    void bootstrap()
  }, [])

  async function handleSetup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    unlockSpeech()
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
      const started = await loadOrStartLesson()
      setProgress(normalizeProgress(started.progress))
      setLessonCards((previous) => {
        for (const card of previous) {
          if (card.imageUrl) URL.revokeObjectURL(card.imageUrl)
        }
        return started.cards
      })
      setScreen(started.progress.phase === 'result' ? 'result' : 'lesson')
    } catch {
      setError('Không thể lưu hồ sơ. Ba mẹ hãy thử lại.')
    }
  }

  async function handleContinueLesson() {
    setError('')
    unlockSpeech()
    try {
      const started = await loadOrStartLesson(activeTopic?.id)
      setProgress(normalizeProgress(started.progress))
      setLessonCards((previous) => {
        for (const card of previous) {
          if (card.imageUrl) URL.revokeObjectURL(card.imageUrl)
        }
        return started.cards
      })
      setScreen(started.progress.phase === 'result' ? 'result' : 'lesson')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể mở bài học.')
    }
  }

  async function handleReview() {
    setError('')
    unlockSpeech()
    try {
      const started = await startReviewLesson(activeTopic?.id)
      setProgress(normalizeProgress(started.progress))
      setLessonCards((previous) => {
        for (const card of previous) {
          if (card.imageUrl) URL.revokeObjectURL(card.imageUrl)
        }
        return started.cards
      })
      setScreen('lesson')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể mở ôn tập.')
    }
  }

  async function handleRestartLesson() {
    setError('')
    unlockSpeech()
    try {
      const started = await restartLesson(activeTopic?.id)
      setProgress(normalizeProgress(started.progress))
      setLessonCards((previous) => {
        for (const card of previous) {
          if (card.imageUrl) URL.revokeObjectURL(card.imageUrl)
        }
        return started.cards
      })
      setTopicCompleted(false)
      setScreen('lesson')
      await refreshSummary(activeTopic?.id)
    } catch {
      setError('Không thể bắt đầu lại bài học.')
    }
  }

  async function persist(next: LessonProgress) {
    const saved = normalizeProgress(await saveLessonProgress(next))
    setProgress(saved)
    await refreshSummary(saved.topicId)
    if (saved.phase === 'result' || saved.completed) {
      setScreen('result')
    }
  }

  async function handleFlashcardNext() {
    if (!progress) return
    const checkpointCards = cardsForCheckpoint(lessonCards, progress.checkpoint)
    const lessonOptions = await getLessonExerciseOptions(progress.topicId)
    await persist(
      advanceAfterFlashcards(
        progress,
        checkpointCards.length,
        lessonOptions.gradedPhases[0],
      ),
    )
  }

  async function handleAnswer(payload: {
    firstTry: boolean
    correct: boolean
    revealed: boolean
    cardId: string
  }) {
    if (!progress) return
    const checkpointCards = cardsForCheckpoint(lessonCards, progress.checkpoint)
    const lessonOptions = await getLessonExerciseOptions(progress.topicId)
    await persist(
      advanceAfterQuestion(
        progress,
        checkpointCards.length,
        payload,
        finalCheckpointFor(lessonCards.length),
        learningCheckpointCount(lessonCards.length),
        lessonOptions,
      ),
    )
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

  if (screen === 'parent-add') {
    return (
      <AddFlashcardsScreen
        onBack={() => setScreen('parent-home')}
        onConfirm={async (payload) => {
          const topic = await confirmFlashcardBatch(payload)
          await refreshSummary(topic.id)
          setScreen('home')
        }}
      />
    )
  }

  if (screen === 'parent-gifts') {
    return (
      <ParentGiftsScreen
        gifts={gifts}
        pending={pendingRedeems}
        onBack={() => setScreen('parent-home')}
        onSaveGift={async (input) => {
          await upsertGift(input)
          await refreshSummary(activeTopic?.id)
        }}
        onResolve={async (requestId, decision) => {
          await resolveRedeem(requestId, decision)
          await refreshSummary(activeTopic?.id)
        }}
      />
    )
  }

  if (screen === 'parent-exercises') {
    return (
      <ParentExerciseLibraryScreen
        onBack={() => setScreen('parent-home')}
      />
    )
  }

  if (screen === 'parent-home') {
    return (
      <>
        <ParentHomeScreen
          topics={topics}
          activeTopicId={activeTopic?.id ?? ''}
          exerciseConfigsByTopic={exerciseConfigsByTopic}
          pendingRedeemCount={pendingRedeems.length}
          onBack={() => {
            setError('')
            setScreen('home')
          }}
          onAddFlashcards={() => setScreen('parent-add')}
          onManageGifts={() => setScreen('parent-gifts')}
          onManageExercises={() => setScreen('parent-exercises')}
          onSelectTopic={(topicId) => {
            void (async () => {
              await setActiveTopicId(topicId)
              await refreshSummary(topicId)
            })()
          }}
          onAddExercise={(topicId, exerciseId) => {
            void (async () => {
              try {
                setError('')
                const next = await addTopicExercise(topicId, exerciseId)
                setExerciseConfigsByTopic((previous) => ({
                  ...previous,
                  [topicId]: next,
                }))
              } catch (caught) {
                setError(
                  caught instanceof Error
                    ? caught.message
                    : 'Không thể thêm dạng bài.',
                )
              }
            })()
          }}
          onRemoveExercise={(topicId, exerciseId) => {
            void (async () => {
              try {
                setError('')
                const next = await removeTopicExercise(topicId, exerciseId)
                setExerciseConfigsByTopic((previous) => ({
                  ...previous,
                  [topicId]: next,
                }))
              } catch (caught) {
                setError(
                  caught instanceof Error
                    ? caught.message
                    : 'Không thể xoá dạng bài.',
                )
              }
            })()
          }}
          onLoadAddable={async (topicId) => listAddableExercises(topicId)}
        />
        {error && (
          <p className="error-message floating-error" role="alert">
            {error}
          </p>
        )}
      </>
    )
  }

  if (screen === 'gifts') {
    return (
      <GiftShopScreen
        profile={profile}
        gifts={gifts}
        onBack={() => setScreen('home')}
        onRedeem={async (giftId) => {
          await requestRedeem(giftId)
          await refreshSummary(activeTopic?.id)
        }}
      />
    )
  }

  if (screen === 'lesson' && progress && progress.phase !== 'result') {
    return (
      <LessonScreen
        topicName={
          progress.mode === 'review'
            ? `Ôn: ${activeTopic?.nameEnglish ?? 'Lesson'}`
            : activeTopic?.nameEnglish ?? 'Lesson'
        }
        cards={lessonCards}
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
          void refreshSummary(progress.topicId)
        }}
      />
    )
  }

  if (screen === 'result' && progress) {
    return (
      <ResultScreen
        topicName={activeTopic?.nameEnglish ?? 'Lesson'}
        cardCount={lessonCards.length || totalCount}
        progress={progress}
        onHome={() => {
          setScreen('home')
          void refreshSummary(progress.topicId)
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
        topic={activeTopic}
        learnedCount={learnedCount}
        totalCount={totalCount}
        hasActiveLesson={Boolean(progress && !progress.completed && progress.mode !== 'review')}
        topicCompleted={topicCompleted}
        onContinue={() => {
          void handleContinueLesson()
        }}
        onRestart={() => {
          void handleRestartLesson()
        }}
        onReview={() => {
          void handleReview()
        }}
        onOpenGifts={() => setScreen('gifts')}
        onOpenParent={() => setScreen('parent-home')}
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
