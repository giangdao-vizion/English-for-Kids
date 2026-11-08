import type { Topic } from '@english-for-kids/shared'

type ParentHomeScreenProps = {
  topics: Topic[]
  activeTopicId: string
  onBack: () => void
  onAddFlashcards: () => void
  onSelectTopic: (topicId: string) => void
}

export function ParentHomeScreen({
  topics,
  activeTopicId,
  onBack,
  onAddFlashcards,
  onSelectTopic,
}: ParentHomeScreenProps) {
  return (
    <main className="app-shell parent-screen">
      <header className="parent-header">
        <button className="back-chip" type="button" onClick={onBack}>
          ‹
        </button>
        <div className="parent-header-copy">
          <strong>Phụ huynh</strong>
          <span>Quản lý bài học của bé</span>
        </div>
      </header>

      <section className="parent-hero">
        <h1>Thêm flashcard</h1>
        <p>Chọn ảnh JPG/PNG, kiểm tra từ và nghĩa, rồi giao bài cho bé.</p>
        <button className="primary-button" type="button" onClick={onAddFlashcards}>
          Thêm flashcard
        </button>
      </section>

      <section className="parent-topic-list">
        <div className="section-label">
          <strong>Chủ đề đã lưu</strong>
          <span>{topics.length} chủ đề</span>
        </div>
        {topics.map((topic) => {
          const active = topic.id === activeTopicId
          return (
            <button
              key={topic.id}
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
          )
        })}
      </section>

      <p className="parent-note">
        Bản thử này dùng nhập thủ công / giả lập AI. Phân tích Gemini sẽ nối ở
        giai đoạn sau.
      </p>
    </main>
  )
}
