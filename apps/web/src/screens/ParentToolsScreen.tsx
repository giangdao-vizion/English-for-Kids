import { useRef, useState } from 'react'
import {
  downloadBackupFile,
  readBackupFile,
  restoreBackupPayload,
} from '../backup'

type ParentToolsScreenProps = {
  lastBackupAt: string | null
  onBack: () => void
  onDataChanged: () => Promise<void>
}

export function ParentToolsScreen({
  lastBackupAt,
  onBack,
  onDataChanged,
}: ParentToolsScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleExport() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await downloadBackupFile()
      await onDataChanged()
      setMessage('Đã tải file sao lưu. Hãy giữ file này ở nơi an toàn.')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không thể xuất bản sao lưu.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleImport(file: File | null) {
    if (!file) return
    const confirmed = window.confirm(
      'Khôi phục sẽ thay toàn bộ dữ liệu hiện tại trên máy này. Tiếp tục?',
    )
    if (!confirmed) return

    setBusy(true)
    setError('')
    setMessage('')
    try {
      const payload = await readBackupFile(file)
      await restoreBackupPayload(payload)
      await onDataChanged()
      setMessage('Đã khôi phục dữ liệu từ bản sao lưu.')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không thể khôi phục bản sao lưu.',
      )
    } finally {
      setBusy(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <main className="app-shell parent-screen parent-tools-screen">
      <header className="parent-header">
        <button className="back-chip" type="button" onClick={onBack}>
          ‹
        </button>
        <div className="parent-header-copy">
          <strong>Sao lưu & cài đặt</strong>
          <span>Giữ dữ liệu trên máy và gắn app lên màn hình chính</span>
        </div>
      </header>

      <section className="tools-section">
        <h1>Cài lên iPhone</h1>
        <ol className="install-steps">
          <li>Mở app bằng Safari (không dùng Chrome trên iPhone).</li>
          <li>Chạm nút Chia sẻ, rồi chọn Thêm vào Màn hình chính.</li>
          <li>Mở app từ icon vừa thêm để nghe và học ổn định hơn.</li>
        </ol>
        <p className="tools-note">
          Lần đầu vào mỗi dạng bài, bé cần chạm “Chạm để nghe” một lần để
          iPhone cho phép đọc to.
        </p>
      </section>

      <section className="tools-section">
        <h1>Sao lưu cục bộ</h1>
        <p>
          Xuất một file JSON gồm chủ đề, từ, ảnh đã tối ưu, tiến độ và quà.
          Không cần tài khoản đám mây.
        </p>
        {lastBackupAt && (
          <p className="tools-meta">
            Lần xuất gần nhất:{' '}
            {new Date(lastBackupAt).toLocaleString('vi-VN', {
              timeZone: 'Asia/Saigon',
            })}
          </p>
        )}
        <div className="tools-actions">
          <button
            className="primary-button"
            type="button"
            disabled={busy}
            onClick={() => void handleExport()}
          >
            Xuất bản sao lưu
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            Khôi phục từ file
          </button>
          <input
            ref={fileInputRef}
            accept="application/json,.json"
            className="visually-hidden"
            type="file"
            onChange={(event) =>
              void handleImport(event.target.files?.[0] ?? null)
            }
          />
        </div>
      </section>

      {message && <p className="info-message">{message}</p>}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </main>
  )
}
