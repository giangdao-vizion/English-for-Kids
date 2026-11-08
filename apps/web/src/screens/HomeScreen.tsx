import { useEffect, useRef } from 'react'
import type { ChildProfile, Topic } from '@english-for-kids/shared'

type HomeScreenProps = {
  profile: ChildProfile
  topic: Topic | undefined
  learnedCount: number
  totalCount: number
  hasActiveLesson: boolean
  topicCompleted: boolean
  onContinue: () => void
  onRestart: () => void
  onOpenParent: () => void
}

const HOLD_MS = 3000

export function HomeScreen({
  profile,
  topic,
  learnedCount,
  totalCount,
  hasActiveLesson,
  topicCompleted,
  onContinue,
  onRestart,
  onOpenParent,
}: HomeScreenProps) {
  const holdTimer = useRef<number | null>(null)
  const progressLabel = topicCompleted
    ? 'Đã hoàn thành'
    : `Đang học ${Math.min(learnedCount, totalCount)}/${totalCount}`

  useEffect(() => {
    return () => {
      if (holdTimer.current) {
        window.clearTimeout(holdTimer.current)
      }
    }
  }, [])

  function clearHold() {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }

  function startHold() {
    clearHold()
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null
      onOpenParent()
    }, HOLD_MS)
  }

  return (
    <main className="app-shell home-screen">
      <header className="child-header">
        <div className={`child-avatar avatar-${profile.avatarImageId}`}>
          {profile.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <span>Xin chào</span>
          <strong>{profile.displayName}</strong>
        </div>
        <div
          className="star-count"
          aria-label={`${profile.totalStars} ngôi sao`}
        >
          <span aria-hidden="true">★</span>
          {profile.totalStars}
        </div>
      </header>

      <section className="empty-lesson">
        <div className="topic-art animals-art" aria-hidden="true">
          <span>Aa</span>
          <span>Bb</span>
          <span>Cc</span>
        </div>
        <h1>{topic?.nameEnglish ?? 'Animals'}</h1>
        <p>
          {topic?.nameVietnamese ?? 'Động vật'} · {progressLabel}
        </p>
        <button className="primary-button" type="button" onClick={onContinue}>
          {hasActiveLesson && !topicCompleted ? 'Học tiếp' : 'Bắt đầu học'}
        </button>
        {topicCompleted && (
          <button className="secondary-button" type="button" onClick={onRestart}>
            Học lại
          </button>
        )}
        {!topicCompleted && (
          <button className="secondary-button" type="button" disabled>
            Ôn tập
          </button>
        )}
      </section>

      <footer className="home-footer">
        <button aria-label="Kho quà" className="corner-button" type="button">
          <span aria-hidden="true">□</span>
        </button>
        <button
          aria-label="Giữ 3 giây để mở khu vực phụ huynh"
          className="parent-button"
          title="Giữ 3 giây để mở khu vực phụ huynh"
          type="button"
          onPointerDown={startHold}
          onPointerUp={clearHold}
          onPointerLeave={clearHold}
          onPointerCancel={clearHold}
          onContextMenu={(event) => event.preventDefault()}
        >
          Phụ huynh
        </button>
      </footer>
    </main>
  )
}
