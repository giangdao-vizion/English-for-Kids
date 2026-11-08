import { useState } from 'react'
import type { ChildProfile } from '@english-for-kids/shared'
import type { GiftItem } from '../db'

type GiftShopScreenProps = {
  profile: ChildProfile
  gifts: GiftItem[]
  onBack: () => void
  onRedeem: (giftId: string) => Promise<void>
}

export function GiftShopScreen({
  profile,
  gifts,
  onBack,
  onRedeem,
}: GiftShopScreenProps) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleRedeem(giftId: string) {
    setBusyId(giftId)
    setError('')
    setMessage('')
    try {
      await onRedeem(giftId)
      setMessage('Đã gửi yêu cầu. Ba mẹ sẽ xác nhận giúp con.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không đổi được quà.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="app-shell parent-screen">
      <header className="parent-header">
        <button className="back-chip" type="button" onClick={onBack}>
          ‹
        </button>
        <div className="parent-header-copy">
          <strong>Kho quà</strong>
          <span>Con đang có {profile.totalStars} sao</span>
        </div>
      </header>

      <section className="gift-list">
        {gifts.map((gift) => {
          const enough = profile.totalStars >= gift.starCost
          return (
            <article key={gift.id} className="gift-card">
              <div>
                <strong>{gift.name}</strong>
                <span>
                  {gift.starCost} sao · còn {gift.stock}
                </span>
              </div>
              <button
                className="primary-button compact-button"
                type="button"
                disabled={!enough || gift.stock <= 0 || busyId === gift.id}
                onClick={() => {
                  void handleRedeem(gift.id)
                }}
              >
                {busyId === gift.id ? '…' : 'Đổi'}
              </button>
            </article>
          )
        })}
      </section>

      {message && <p className="info-banner">{message}</p>}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </main>
  )
}
