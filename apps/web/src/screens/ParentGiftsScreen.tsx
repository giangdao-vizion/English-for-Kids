import { useEffect, useRef, useState } from 'react'
import type { GiftItem, RedeemRequest } from '../db'

type ParentGiftsScreenProps = {
  gifts: GiftItem[]
  pending: RedeemRequest[]
  onBack: () => void
  onSaveGift: (input: {
    id?: string
    name: string
    starCost: number
    stock: number
  }) => Promise<void>
  onResolve: (
    requestId: string,
    decision: 'approved' | 'deferred',
  ) => Promise<void>
}

export function ParentGiftsScreen({
  gifts,
  pending,
  onBack,
  onSaveGift,
  onResolve,
}: ParentGiftsScreenProps) {
  const [name, setName] = useState('')
  const [starCost, setStarCost] = useState('5')
  const [stock, setStock] = useState('5')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd() {
    setError('')
    setBusy(true)
    try {
      await onSaveGift({
        name,
        starCost: Number(starCost),
        stock: Number(stock),
      })
      setName('')
      setStarCost('5')
      setStock('5')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không lưu được quà.')
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
          <strong>Quản lý quà</strong>
          <span>Thêm quà và duyệt yêu cầu đổi</span>
        </div>
      </header>

      {pending.length > 0 && (
        <section className="parent-topic-list">
          <div className="section-label">
            <strong>Chờ duyệt</strong>
            <span>{pending.length}</span>
          </div>
          {pending.map((request) => (
            <div key={request.id} className="topic-row gift-pending-row">
              <div className="topic-row-copy">
                <strong>{request.giftName}</strong>
                <span>{request.starCost} sao</span>
              </div>
              <div className="pending-actions">
                <HoldApproveButton
                  onApprove={() => {
                    void onResolve(request.id, 'approved')
                  }}
                />
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    void onResolve(request.id, 'deferred')
                  }}
                >
                  Để sau
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="confirm-meta">
        <strong>Thêm quà mới</strong>
        <label>
          <span>Tên quà</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          <span>Số sao</span>
          <input
            inputMode="numeric"
            value={starCost}
            onChange={(event) => setStarCost(event.target.value)}
          />
        </label>
        <label>
          <span>Số lượng</span>
          <input
            inputMode="numeric"
            value={stock}
            onChange={(event) => setStock(event.target.value)}
          />
        </label>
        <button
          className="primary-button"
          type="button"
          disabled={busy || !name.trim()}
          onClick={() => {
            void handleAdd()
          }}
        >
          Lưu quà
        </button>
      </section>

      <section className="parent-topic-list">
        <div className="section-label">
          <strong>Quà hiện có</strong>
          <span>{gifts.length}</span>
        </div>
        {gifts.map((gift) => (
          <div key={gift.id} className="topic-row">
            <div className="topic-row-copy">
              <strong>{gift.name}</strong>
              <span>
                {gift.starCost} sao · còn {gift.stock}
              </span>
            </div>
          </div>
        ))}
      </section>

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </main>
  )
}

function HoldApproveButton({ onApprove }: { onApprove: () => void }) {
  const timer = useRef<number | null>(null)
  const [holding, setHolding] = useState(false)
  const [progress, setProgress] = useState(0)
  const started = useRef<number | null>(null)

  useEffect(() => {
    if (!holding || started.current === null) return
    let frame = 0
    const tick = () => {
      if (started.current === null) return
      setProgress(Math.min(1, (performance.now() - started.current) / 3000))
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [holding])

  function clear() {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
    started.current = null
    setHolding(false)
    setProgress(0)
  }

  return (
    <button
      className={`parent-hold-button ${holding ? 'holding' : ''}`}
      type="button"
      onPointerDown={(event) => {
        event.preventDefault()
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          // ignore
        }
        clear()
        started.current = performance.now()
        setHolding(true)
        timer.current = window.setTimeout(() => {
          clear()
          onApprove()
        }, 3000)
      }}
      onPointerUp={clear}
      onPointerCancel={clear}
      onContextMenu={(event) => event.preventDefault()}
      onClick={(event) => event.preventDefault()}
    >
      <span
        className="parent-hold-fill"
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden="true"
      />
      <span className="parent-hold-label">
        {holding ? 'Giữ thêm…' : 'Giữ để duyệt'}
      </span>
    </button>
  )
}
