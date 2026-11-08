import type { Topic } from '@english-for-kids/shared'

type ParentHomeScreenProps = {
  topics: Topic[]
  activeTopicId: string
  pendingRedeemCount: number
  onBack: () => void
  onAddFlashcards: () => void
  onManageGifts: () => void
  onSelectTopic: (topicId: string) => void
}

export function ParentHomeScreen({
  topics,
  activeTopicId,
  pendingRedeemCount,
  onBack,
  onAddFlashcards,
  onManageGifts,
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
    </main>
  )
}
