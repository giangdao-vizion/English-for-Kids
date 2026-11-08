import { useEffect, useRef, useState } from 'react'
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
  onReview: () => void
  onOpenGifts: () => void
  onOpenParent: () => void
}

const HOLD_MS = 1000

export function HomeScreen({
  profile,
  topic,
  learnedCount,
  totalCount,
  hasActiveLesson,
  topicCompleted,
  onContinue,
  onRestart,
  onReview,
  onOpenGifts,
  onOpenParent,
}: HomeScreenProps) {
  const holdTimer = useRef<number | null>(null)
  const holdStartedAt = useRef<number | null>(null)
  const openedRef = useRef(false)
  const activePointerId = useRef<number | null>(null)
  const [holding, setHolding] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
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

  useEffect(() => {
    if (!holding || holdStartedAt.current === null) {
      return
    }

    let frame = 0
    const tick = () => {
      if (holdStartedAt.current === null) {
        return
      }
      const elapsed = performance.now() - holdStartedAt.current
      setHoldProgress(Math.min(1, elapsed / HOLD_MS))
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [holding])

  function clearHold(resetVisual = true) {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    holdStartedAt.current = null
    activePointerId.current = null
    if (resetVisual) {
      setHolding(false)
      setHoldProgress(0)
    }
  }

  function finishHold() {
    if (openedRef.current) {
      return
    }
    openedRef.current = true
    clearHold(true)
    onOpenParent()
    window.setTimeout(() => {
      openedRef.current = false
    }, 500)
  }

  function startHold(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Một số trình duyệt / sự kiện không hỗ trợ capture; vẫn giữ timer.
    }
    activePointerId.current = event.pointerId
    openedRef.current = false
    clearHold(false)
    holdStartedAt.current = performance.now()
    setHolding(true)
    setHoldProgress(0)
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null
      finishHold()
    }, HOLD_MS)
  }

  function endHold(event: React.PointerEvent<HTMLButtonElement>) {
    if (
      activePointerId.current !== null &&
      event.pointerId !== activePointerId.current
    ) {
      return
    }

    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    } catch {
      // ignore
    }
    clearHold(true)
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
        <button className="secondary-button" type="button" onClick={onReview}>
          Ôn tập
        </button>
      </section>

      <footer className="home-footer">
        <button
          aria-label="Kho quà"
          className="corner-button"
          type="button"
          onClick={onOpenGifts}
        >
          <span aria-hidden="true">□</span>
        </button>
        <button
          aria-label="Giữ 1 giây để mở khu vực phụ huynh"
          className={`parent-hold-button ${holding ? 'holding' : ''}`}
          title="Giữ 1 giây để mở khu vực phụ huynh"
          type="button"
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerCancel={endHold}
          onLostPointerCapture={() => clearHold(true)}
          onContextMenu={(event) => event.preventDefault()}
          onClick={(event) => event.preventDefault()}
        >
          <span
            className="parent-hold-fill"
            style={{ transform: `scaleX(${holdProgress})` }}
            aria-hidden="true"
          />
          <span className="parent-hold-label">
            {holding ? 'Giữ thêm…' : 'Phụ huynh'}
          </span>
        </button>
      </footer>
    </main>
  )
}
