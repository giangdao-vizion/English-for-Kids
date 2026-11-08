import type { Topic } from '@english-for-kids/shared'
import {
  exercisesForCategory,
  type TopicExerciseConfig,
} from '../lesson/exercises'

type ParentHomeScreenProps = {
  topics: Topic[]
  activeTopicId: string
  exerciseConfigsByTopic: Record<string, TopicExerciseConfig[]>
  pendingRedeemCount: number
  onBack: () => void
  onAddFlashcards: () => void
  onManageGifts: () => void
  onSelectTopic: (topicId: string) => void
  onToggleExercise: (
    topicId: string,
    exerciseId: string,
    enabled: boolean,
  ) => void
}

export function ParentHomeScreen({
  topics,
  activeTopicId,
  exerciseConfigsByTopic,
  pendingRedeemCount,
  onBack,
  onAddFlashcards,
  onManageGifts,
  onSelectTopic,
  onToggleExercise,
}: ParentHomeScreenProps) {
  const activeTopic = topics.find((topic) => topic.id === activeTopicId)

  return (
    <main className="app-shell parent-screen">
      <header className="parent-header">
        <button className="back-chip" type="button" onClick={onBack}>
          ‹
        </button>
        <div className="parent-header-copy">
          <strong>Phụ huynh</strong>
          <span>Chọn chủ đề, chỉnh bài tập, rồi bấm Xong</span>
        </div>
      </header>

      <section className="parent-hero">
        <h1>Thêm flashcard</h1>
        <p>Chọn ảnh, AI phân tích giúp, ba mẹ chỉ xác nhận rồi giao bài.</p>
        <button className="primary-button" type="button" onClick={onAddFlashcards}>
          Thêm flashcard
        </button>
        <button className="secondary-button" type="button" onClick={onManageGifts}>
          Quản lý quà
          {pendingRedeemCount > 0 ? ` (${pendingRedeemCount} chờ duyệt)` : ''}
        </button>
      </section>

      <section className="parent-topic-list">
        <div className="section-label">
          <strong>Chủ đề đã lưu</strong>
          <span>{topics.length} chủ đề</span>
        </div>
        {topics.map((topic) => {
          const active = topic.id === activeTopicId
          const configs = exerciseConfigsByTopic[topic.id] ?? []
          const catalog = exercisesForCategory(topic.category)

          return (
            <article
              key={topic.id}
              className={`topic-block ${active ? 'active' : ''}`}
            >
              <button
                className={`topic-row ${active ? 'active' : ''}`}
                type="button"
                onClick={() => onSelectTopic(topic.id)}
              >
                <div className="topic-row-copy">
                  <strong>{topic.nameEnglish}</strong>
                  <span>
                    {topic.nameVietnamese} · {topic.cardIds.length} từ
                  </span>
                </div>
                <span className="topic-row-status">
                  {active ? 'Đang dùng' : 'Chọn'}
                </span>
              </button>

              <div className="topic-exercise-list" aria-label={`Bài tập ${topic.nameEnglish}`}>
                <p className="topic-exercise-label">Bài tập áp dụng</p>
                {catalog.map((exercise) => {
                  const config = configs.find(
                    (item) => item.exerciseId === exercise.id,
                  )
                  const enabled = config?.enabled ?? false
                  return (
                    <label
                      key={exercise.id}
                      className={`exercise-toggle ${exercise.implemented ? '' : 'soon'}`}
                    >
                      <span className="exercise-toggle-copy">
                        <strong>{exercise.nameVietnamese}</strong>
                        <small>
                          {exercise.implemented
                            ? exercise.nameEnglish
                            : 'Sắp có'}
                        </small>
                      </span>
                      <input
                        type="checkbox"
                        checked={enabled}
                        disabled={!exercise.implemented}
                        onChange={(event) =>
                          onToggleExercise(
                            topic.id,
                            exercise.id,
                            event.target.checked,
                          )
                        }
                      />
                    </label>
                  )
                })}
              </div>
            </article>
          )
        })}
      </section>

      <footer className="parent-confirm-bar">
        <p>
          {activeTopic
            ? `Đang chọn: ${activeTopic.nameEnglish}`
            : 'Hãy chọn một chủ đề cho bé'}
        </p>
        <button
          className="primary-button"
          type="button"
          disabled={!activeTopicId}
          onClick={onBack}
        >
          Xong — về trang học
        </button>
      </footer>
    </main>
  )
}
