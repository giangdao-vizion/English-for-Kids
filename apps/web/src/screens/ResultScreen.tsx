import type { LessonProgress } from '../lesson/engine'

type ResultScreenProps = {
  topicName: string
  cardCount: number
  progress: LessonProgress
  onHome: () => void
  onContinue: () => void
}

export function ResultScreen({
  topicName,
  cardCount,
  progress,
  onHome,
  onContinue,
}: ResultScreenProps) {
  const accuracy =
    progress.answeredQuestions === 0
      ? 0
      : Math.round(
          (progress.firstTryCorrect / progress.answeredQuestions) * 100,
        )

  return (
    <main className="app-shell result-screen">
      <header className="parent-header">
        <button className="back-chip" type="button" onClick={onHome}>
          ‹
        </button>
        <div className="parent-header-copy">
          <strong>Hoàn thành</strong>
          <span>{topicName}</span>
        </div>
      </header>

      <section className="result-panel">
        <div className="result-badge" aria-hidden="true">
          ✓
        </div>
        <h1>Con làm tốt lắm!</h1>
        <p>
          Hoàn thành {cardCount} từ chủ đề {topicName}
        </p>

        <div className="star-row" aria-label={`${progress.awardedStars} sao`}>
          {[1, 2, 3].map((star) => (
            <span
              key={star}
              className={star <= progress.awardedStars ? 'earned' : 'empty'}
            >
              ★
            </span>
          ))}
        </div>

        <div className="result-stats">
          {accuracy}% đúng lần đầu
          {progress.incorrectCardIds.length > 0
            ? ` · ${progress.incorrectCardIds.length} từ sẽ được ôn lại`
            : ' · Không có từ cần ôn lại'}
        </div>
      </section>

      <div className="result-actions">
        <button className="primary-button" type="button" onClick={onContinue}>
          Học lại
        </button>
        <button className="secondary-button" type="button" onClick={onHome}>
          Về trang chính
        </button>
      </div>
    </main>
  )
}
