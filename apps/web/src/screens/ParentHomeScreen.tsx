import { useRef, useState } from 'react'
import type { Topic } from '@english-for-kids/shared'
import {
  getExerciseDefinition,
  type ExerciseDefinition,
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
  onManageExercises: () => void
  onOpenTools: () => void
  onSelectTopic: (topicId: string) => void
  onToggleExercise: (
    topicId: string,
    exerciseId: string,
    enabled: boolean,
  ) => void
  onAddExercise: (topicId: string, exerciseId: string) => void
  onRemoveExercise: (topicId: string, exerciseId: string) => void
  onLoadAddable: (topicId: string) => Promise<ExerciseDefinition[]>
}

const SWIPE_DELETE_PX = 72

export function ParentHomeScreen({
  topics,
  activeTopicId,
  exerciseConfigsByTopic,
  pendingRedeemCount,
  onBack,
  onAddFlashcards,
  onManageGifts,
  onManageExercises,
  onOpenTools,
  onSelectTopic,
  onToggleExercise,
  onAddExercise,
  onRemoveExercise,
  onLoadAddable,
}: ParentHomeScreenProps) {
  const activeTopic = topics.find((topic) => topic.id === activeTopicId)
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null)
  const [pickerTopicId, setPickerTopicId] = useState<string | null>(null)
  const [addable, setAddable] = useState<ExerciseDefinition[]>([])
  const [pickerLoading, setPickerLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  async function openPicker(topicId: string) {
    setPickerTopicId(topicId)
    setPickerLoading(true)
    try {
      const items = await onLoadAddable(topicId)
      setAddable(items)
    } finally {
      setPickerLoading(false)
    }
  }

  function runMenuAction(action: () => void) {
    setMenuOpen(false)
    action()
  }

  return (
    <main className="app-shell parent-screen">
      <header className="parent-header has-menu">
        <button className="back-chip" type="button" onClick={onBack}>
          ‹
        </button>
        <div className="parent-header-copy">
          <strong>Phụ huynh</strong>
          <span>Thêm flashcard, chọn chủ đề, rồi về học</span>
        </div>
        <div className="parent-menu">
          <button
            className={`parent-menu-button ${menuOpen ? 'open' : ''}`}
            type="button"
            aria-label="Menu quản lý"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true">⋮</span>
            {pendingRedeemCount > 0 && (
              <span className="parent-menu-dot" aria-hidden="true" />
            )}
          </button>
          {menuOpen && (
            <>
              <button
                className="parent-menu-backdrop"
                type="button"
                aria-label="Đóng menu"
                onClick={() => setMenuOpen(false)}
              />
              <div className="parent-menu-popup" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runMenuAction(onManageExercises)}
                >
                  Thư viện bài tập
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runMenuAction(onManageGifts)}
                >
                  Quản lý quà
                  {pendingRedeemCount > 0
                    ? ` (${pendingRedeemCount} chờ duyệt)`
                    : ''}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => runMenuAction(onOpenTools)}
                >
                  Sao lưu & cài iPhone
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <section className="parent-hero">
        <h1>Thêm flashcard</h1>
        <p>Chọn ảnh, AI phân tích giúp, ba mẹ chỉ xác nhận rồi giao bài.</p>
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
          const configs = exerciseConfigsByTopic[topic.id] ?? []
          const expanded = expandedTopicId === topic.id

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

              <button
                className={`topic-exercise-toggle ${expanded ? 'open' : ''}`}
                type="button"
                aria-expanded={expanded}
                onClick={() =>
                  setExpandedTopicId((current) =>
                    current === topic.id ? null : topic.id,
                  )
                }
              >
                <span>
                  Bài tập · {configs.filter((item) => item.enabled).length}/
                  {configs.length}
                  {!expanded ? ' · chạm để mở' : ''}
                </span>
                <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
              </button>

              {expanded && (
                <div
                  className="topic-exercise-list"
                  aria-label={`Bài tập ${topic.nameEnglish}`}
                >
                  {configs.length === 0 && (
                    <p className="topic-exercise-empty">
                      Chưa có bài tập. Thêm từ thư viện.
                    </p>
                  )}
                  {configs.map((config) => {
                    const definition = getExerciseDefinition(config.exerciseId)
                    if (!definition) return null
                    return (
                      <SwipeExerciseRow
                        key={config.id}
                        title={definition.nameVietnamese}
                        subtitle={definition.nameEnglish}
                        enabled={config.enabled}
                        onToggle={(enabled) =>
                          onToggleExercise(
                            topic.id,
                            config.exerciseId,
                            enabled,
                          )
                        }
                        onDelete={() =>
                          onRemoveExercise(topic.id, config.exerciseId)
                        }
                      />
                    )
                  })}
                  <button
                    className="add-exercise-button"
                    type="button"
                    onClick={() => void openPicker(topic.id)}
                  >
                    + Thêm bài tập
                  </button>
                </div>
              )}
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

      {pickerTopicId && (
        <div className="exercise-picker-backdrop" role="presentation">
          <div
            className="exercise-picker-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Thêm bài tập"
          >
            <div className="exercise-picker-header">
              <strong>Thêm từ thư viện</strong>
              <button
                className="ghost-sound"
                type="button"
                onClick={() => setPickerTopicId(null)}
              >
                Đóng
              </button>
            </div>
            {pickerLoading && <p className="topic-exercise-empty">Đang tải…</p>}
            {!pickerLoading && addable.length === 0 && (
              <p className="topic-exercise-empty">
                Không còn dạng bài sẵn sàng để thêm cho chủ đề này.
              </p>
            )}
            {!pickerLoading &&
              addable.map((exercise) => (
                <button
                  key={exercise.id}
                  className="exercise-picker-item"
                  type="button"
                  onClick={() => {
                    onAddExercise(pickerTopicId, exercise.id)
                    setPickerTopicId(null)
                  }}
                >
                  <span className="exercise-toggle-copy">
                    <strong>{exercise.nameVietnamese}</strong>
                    <small>{exercise.descriptionVietnamese}</small>
                  </span>
                  <span className="library-badge ready">Thêm</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </main>
  )
}

function SwipeExerciseRow({
  title,
  subtitle,
  enabled,
  onToggle,
  onDelete,
}: {
  title: string
  subtitle: string
  enabled: boolean
  onToggle: (enabled: boolean) => void
  onDelete: () => void
}) {
  const startX = useRef(0)
  const currentX = useRef(0)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)

  function clamp(value: number) {
    return Math.max(-SWIPE_DELETE_PX, Math.min(0, value))
  }

  return (
    <div className="swipe-row">
      <button
        className="swipe-delete-action"
        type="button"
        aria-label={`Xoá ${title}`}
        onClick={onDelete}
      >
        Xoá
      </button>
      <div
        className={`swipe-row-front ${dragging ? 'dragging' : ''} ${enabled ? '' : 'off'}`}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={(event) => {
          const target = event.target as HTMLElement
          if (target.closest('input, label')) return
          startX.current = event.clientX
          currentX.current = offset
          setDragging(true)
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (!dragging) return
          const delta = event.clientX - startX.current
          setOffset(clamp(currentX.current + delta))
        }}
        onPointerUp={() => {
          setDragging(false)
          setOffset((value) => (value < -SWIPE_DELETE_PX / 2 ? -SWIPE_DELETE_PX : 0))
        }}
        onPointerCancel={() => {
          setDragging(false)
          setOffset(0)
        }}
      >
        <div className="exercise-toggle-copy">
          <strong>{title}</strong>
          <small>{subtitle}</small>
        </div>
        <label className="exercise-enable" onClick={(event) => event.stopPropagation()}>
          <span className="visually-hidden">Áp dụng {title}</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onToggle(event.target.checked)}
          />
        </label>
      </div>
    </div>
  )
}
