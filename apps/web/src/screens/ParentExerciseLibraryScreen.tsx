import { EXERCISE_CATALOG } from '../lesson/exercises'

type ParentExerciseLibraryScreenProps = {
  onBack: () => void
}

export function ParentExerciseLibraryScreen({
  onBack,
}: ParentExerciseLibraryScreenProps) {
  const ready = EXERCISE_CATALOG.filter((item) => item.implemented)
  const upcoming = EXERCISE_CATALOG.filter((item) => !item.implemented)

  return (
    <main className="app-shell parent-screen">
      <header className="parent-header">
        <button className="back-chip" type="button" onClick={onBack}>
          ‹
        </button>
        <div className="parent-header-copy">
          <strong>Thư viện bài tập</strong>
          <span>Quản lý dạng bài và trò chơi</span>
        </div>
      </header>

      <section className="parent-hero compact-hero">
        <h1>Danh sách dạng bài</h1>
        <p>
          Các bài Sẵn sàng đã có dữ liệu tạo câu hỏi — thêm vào chủ đề là bé học
          được ngay. Dạng mới sẽ xuất hiện tại đây khi được bổ sung.
        </p>
      </section>

      <section className="parent-topic-list">
        <div className="section-label">
          <strong>Sẵn sàng</strong>
          <span>{ready.length}</span>
        </div>
        {ready.map((exercise) => (
          <article key={exercise.id} className="library-card ready">
            <div className="library-card-copy">
              <strong>{exercise.nameVietnamese}</strong>
              <span>{exercise.nameEnglish}</span>
              <p>{exercise.descriptionVietnamese}</p>
            </div>
            <span className="library-badge ready">Sẵn sàng</span>
          </article>
        ))}
      </section>

      <section className="parent-topic-list">
        <div className="section-label">
          <strong>Sắp có</strong>
          <span>{upcoming.length}</span>
        </div>
        {upcoming.map((exercise) => (
          <article key={exercise.id} className="library-card soon">
            <div className="library-card-copy">
              <strong>{exercise.nameVietnamese}</strong>
              <span>{exercise.nameEnglish}</span>
              <p>{exercise.descriptionVietnamese}</p>
            </div>
            <span className="library-badge soon">Sắp có</span>
          </article>
        ))}
      </section>
    </main>
  )
}
