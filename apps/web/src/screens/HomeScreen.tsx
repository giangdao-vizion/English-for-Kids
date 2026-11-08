import type { ChildProfile } from '@english-for-kids/shared'
import {
  ANIMALS_TOPIC_NAME,
  ANIMALS_TOPIC_NAME_VI,
} from '../sample/animals'

type HomeScreenProps = {
  profile: ChildProfile
  learnedCount: number
  totalCount: number
  hasActiveLesson: boolean
  topicCompleted: boolean
  onContinue: () => void
  onRestart: () => void
}

export function HomeScreen({
  profile,
  learnedCount,
  totalCount,
  hasActiveLesson,
  topicCompleted,
  onContinue,
  onRestart,
}: HomeScreenProps) {
  const progressLabel = topicCompleted
    ? 'Đã hoàn thành'
    : `Đang học ${Math.min(learnedCount, totalCount)}/${totalCount}`

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
          <span>🐱</span>
          <span>🐶</span>
          <span>🐦</span>
        </div>
        <h1>{ANIMALS_TOPIC_NAME}</h1>
        <p>
          {ANIMALS_TOPIC_NAME_VI} · {progressLabel}
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
          aria-label="Mở khu vực phụ huynh"
          className="parent-button"
          title="Giữ 3 giây để mở khu vực phụ huynh"
          type="button"
        >
          Phụ huynh
        </button>
      </footer>
    </main>
  )
}
