import { useEffect, useMemo, useState } from 'react'
import type { TopicCategory } from '@english-for-kids/shared'
import { analyzeFlashcards, blobToBase64 } from '../parent/analyze'
import { colorForWord, optimizeImageFile } from '../images'
import type { DraftFlashcard } from '../db'

type AddFlashcardsScreenProps = {
  onBack: () => void
  onConfirm: (payload: {
    topicNameEnglish: string
    topicNameVietnamese: string
    category: TopicCategory
    drafts: DraftFlashcard[]
  }) => Promise<void>
}

const CATEGORY_OPTIONS: Array<[TopicCategory, string]> = [
  ['animals', 'Động vật'],
  ['food_drinks', 'Đồ ăn'],
  ['objects', 'Đồ vật'],
  ['colors', 'Màu sắc'],
  ['numbers', 'Số đếm'],
  ['shapes', 'Hình dạng'],
  ['body_parts', 'Cơ thể'],
  ['actions', 'Hành động'],
  ['emotions', 'Cảm xúc'],
  ['general', 'Chung'],
]

export function AddFlashcardsScreen({
  onBack,
  onConfirm,
}: AddFlashcardsScreenProps) {
  const [drafts, setDrafts] = useState<DraftFlashcard[]>([])
  const [topicNameEnglish, setTopicNameEnglish] = useState('')
  const [topicNameVietnamese, setTopicNameVietnamese] = useState('')
  const [category, setCategory] = useState<TopicCategory>('general')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [phase, setPhase] = useState<'pick' | 'analyzing' | 'review'>('pick')

  useEffect(() => {
    return () => {
      for (const draft of drafts) {
        URL.revokeObjectURL(draft.previewUrl)
      }
    }
  }, [drafts])

  const usableCount = useMemo(
    () =>
      drafts.filter(
        (draft) =>
          !draft.removed &&
          draft.word.trim() &&
          draft.meaningVietnamese.trim(),
      ).length,
    [drafts],
  )

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return
    }

    setError('')
    setInfo('')
    setBusy(true)
    setPhase('analyzing')
    try {
      const selected = [...fileList].slice(0, 20)
      if (fileList.length > 20) {
        setError('Chỉ lấy tối đa 20 ảnh mỗi lần.')
      }

      const nextDrafts: DraftFlashcard[] = []
      const analyzeInputs = []
      for (const file of selected) {
        const imageId = `img-${crypto.randomUUID()}`
        const image = await optimizeImageFile(file, imageId)
        const previewUrl = URL.createObjectURL(image.blob)
        nextDrafts.push({
          localId: crypto.randomUUID(),
          fileName: file.name,
          previewUrl,
          image,
          word: '',
          meaningVietnamese: '',
          removed: false,
        })
        analyzeInputs.push({
          fileName: file.name,
          mimeType: image.mimeType,
          base64: await blobToBase64(image.blob),
        })
      }

      setDrafts((current) => {
        for (const draft of current) {
          URL.revokeObjectURL(draft.previewUrl)
        }
        return nextDrafts
      })

      const result = await analyzeFlashcards(analyzeInputs)
      const topic = result.analysis.topics[0]
      if (!topic) {
        throw new Error('AI không trả về chủ đề nào.')
      }

      setTopicNameEnglish(topic.nameEnglish)
      setTopicNameVietnamese(topic.nameVietnamese)
      setCategory(topic.category)

      setDrafts((current) =>
        current.map((draft, index) => {
          const card =
            topic.cards.find((item) => item.sourceImageIndex === index) ||
            topic.cards[index]
          return {
            ...draft,
            word: card?.word || card?.normalizedWord || '',
            meaningVietnamese: card?.meaningVietnamese || '',
          }
        }),
      )

      if (result.warning) {
        setInfo(result.warning)
      } else {
        setInfo('AI đã điền sẵn. Ba mẹ chỉ cần xem và xác nhận.')
      }
      setPhase('review')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không thể phân tích ảnh. Hãy thử lại.',
      )
      setPhase('pick')
      setDrafts((current) => {
        for (const draft of current) {
          URL.revokeObjectURL(draft.previewUrl)
        }
        return []
      })
    } finally {
      setBusy(false)
    }
  }

  function updateDraft(
    localId: string,
    patch: Partial<Pick<DraftFlashcard, 'word' | 'meaningVietnamese' | 'removed'>>,
  ) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.localId === localId ? { ...draft, ...patch } : draft,
      ),
    )
  }

  async function handleSave() {
    setError('')
    if (usableCount < 2) {
      setError('Cần ít nhất 2 flashcard có từ và nghĩa tiếng Việt.')
      return
    }
    if (!topicNameEnglish.trim() || !topicNameVietnamese.trim()) {
      setError('Ba mẹ hãy nhập tên chủ đề tiếng Anh và tiếng Việt.')
      return
    }

    setBusy(true)
    try {
      await onConfirm({
        topicNameEnglish,
        topicNameVietnamese,
        category,
        drafts,
      })
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không thể lưu flashcard.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="app-shell parent-screen">
      <header className="parent-header">
        <button className="back-chip" type="button" onClick={onBack}>
          ‹
        </button>
        <div className="parent-header-copy">
          <strong>Thêm flashcard</strong>
          <span>
            {phase === 'pick' && 'Chọn ảnh để AI phân tích'}
            {phase === 'analyzing' && 'AI đang phân tích…'}
            {phase === 'review' && `Xác nhận ${usableCount} từ`}
          </span>
        </div>
      </header>

      {phase === 'pick' && (
        <section className="upload-panel">
          <div className="upload-art" aria-hidden="true">
            <span style={{ background: colorForWord('flash') }}>Aa</span>
          </div>
          <h1>Chọn ảnh flashcard</h1>
          <p>JPG hoặc PNG, tối đa 20 ảnh. AI sẽ điền từ, nghĩa và chủ đề.</p>
          <label className="primary-button upload-button">
            <span className="upload-button-label">Chọn ảnh từ thư viện</span>
            <input
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              multiple
              type="file"
              onChange={(event) => {
                void handleFiles(event.target.files)
                event.currentTarget.value = ''
              }}
            />
          </label>
        </section>
      )}

      {phase === 'analyzing' && (
        <section className="analyzing-panel" aria-live="polite">
          <div className="loading-dot" />
          <h1>AI đang làm giúp ba mẹ</h1>
          <p>Nhận diện từ, nghĩa tiếng Việt và chủ đề. Chỉ cần xác nhận sau đó.</p>
        </section>
      )}

      {phase === 'review' && (
        <>
          {info && <p className="info-banner">{info}</p>}
          <section className="confirm-meta">
            <label>
              <span>Tên chủ đề (English)</span>
              <input
                value={topicNameEnglish}
                onChange={(event) => setTopicNameEnglish(event.target.value)}
              />
            </label>
            <label>
              <span>Tên chủ đề (Tiếng Việt)</span>
              <input
                value={topicNameVietnamese}
                onChange={(event) => setTopicNameVietnamese(event.target.value)}
              />
            </label>
            <label>
              <span>Nhóm</span>
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as TopicCategory)
                }
              >
                {CATEGORY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="draft-list">
            {drafts.map((draft) => (
              <article
                key={draft.localId}
                className={`draft-card ${draft.removed ? 'removed' : ''}`}
              >
                <img src={draft.previewUrl} alt={draft.fileName} />
                <div className="draft-fields">
                  <label>
                    <span>Từ tiếng Anh</span>
                    <input
                      value={draft.word}
                      disabled={draft.removed}
                      onChange={(event) =>
                        updateDraft(draft.localId, {
                          word: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>Nghĩa tiếng Việt</span>
                    <input
                      value={draft.meaningVietnamese}
                      disabled={draft.removed}
                      onChange={(event) =>
                        updateDraft(draft.localId, {
                          meaningVietnamese: event.target.value,
                        })
                      }
                    />
                  </label>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() =>
                      updateDraft(draft.localId, {
                        removed: !draft.removed,
                      })
                    }
                  >
                    {draft.removed ? 'Khôi phục' : 'Bỏ thẻ này'}
                  </button>
                </div>
              </article>
            ))}
          </section>

          <div className="result-actions sticky-actions">
            <button
              className="primary-button"
              type="button"
              disabled={busy}
              onClick={() => {
                void handleSave()
              }}
            >
              {busy ? 'Đang lưu…' : `Xác nhận và giao bài (${usableCount})`}
            </button>
            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={() => {
                setPhase('pick')
                setInfo('')
                setDrafts((current) => {
                  for (const draft of current) {
                    URL.revokeObjectURL(draft.previewUrl)
                  }
                  return []
                })
              }}
            >
              Chọn ảnh khác
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </main>
  )
}
