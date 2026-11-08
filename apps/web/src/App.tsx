import { useEffect, useState } from 'react'
import type { ChildProfile } from '@english-for-kids/shared'
import './app.css'
import { createProfile, loadProfile } from './db'

function App() {
  const [profile, setProfile] = useState<ChildProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('fox')
  const [error, setError] = useState('')

  useEffect(() => {
    loadProfile()
      .then((savedProfile) => {
        setProfile(savedProfile ?? null)
      })
      .catch(() => {
        setError('Không thể đọc dữ liệu đã lưu trên thiết bị.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  async function handleSetup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const displayName = name.trim()
    if (!displayName) {
      setError('Ba mẹ hãy nhập tên của bé.')
      return
    }

    setError('')
    try {
      const savedProfile = await createProfile(displayName, avatar)
      setProfile(savedProfile)
    } catch {
      setError('Không thể lưu hồ sơ. Ba mẹ hãy thử lại.')
    }
  }

  if (loading) {
    return (
      <main className="app-shell loading-state" aria-live="polite">
        <div className="loading-dot" />
        <p>Đang mở bài học…</p>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="app-shell setup-screen">
        <section className="setup-heading">
          <div className="book-mark" aria-hidden="true">
            Aa
          </div>
          <h1>Chào mừng con</h1>
          <p>Ba mẹ chỉ cần thiết lập một lần</p>
        </section>

        <form className="setup-form" onSubmit={handleSetup}>
          <fieldset>
            <legend>Chọn hình đại diện</legend>
            <div className="avatar-list">
              {[
                ['fox', 'Cáo'],
                ['bear', 'Gấu'],
                ['rabbit', 'Thỏ'],
              ].map(([value, label]) => (
                <label
                  className={`avatar-option ${avatar === value ? 'selected' : ''}`}
                  key={value}
                >
                  <input
                    checked={avatar === value}
                    name="avatar"
                    onChange={() => setAvatar(value)}
                    type="radio"
                    value={value}
                  />
                  <span aria-hidden="true">{label.slice(0, 1)}</span>
                  <small>{label}</small>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="name-field">
            <span>Tên của bé</span>
            <input
              autoComplete="off"
              id="child-name"
              maxLength={30}
              name="childName"
              onChange={(event) => setName(event.target.value)}
              placeholder="Nhập tên của bé"
              value={name}
            />
          </label>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <button className="primary-button" type="submit">
            Bắt đầu học
          </button>
        </form>
      </main>
    )
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
        <div className="star-count" aria-label={`${profile.totalStars} ngôi sao`}>
          <span aria-hidden="true">★</span>
          {profile.totalStars}
        </div>
      </header>

      <section className="empty-lesson">
        <div className="topic-art" aria-hidden="true">
          <span>A</span>
          <span>B</span>
          <span>C</span>
        </div>
        <h1>Sẵn sàng học rồi!</h1>
        <p>Ba mẹ hãy thêm bộ flashcard đầu tiên cho con.</p>
        <button className="primary-button" type="button">
          Học tiếp
        </button>
        <button className="secondary-button" type="button">
          Ôn tập
        </button>
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

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </main>
  )
}

export default App
