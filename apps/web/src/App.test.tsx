import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./db', () => ({
  loadProfile: vi.fn().mockResolvedValue(undefined),
  createProfile: vi.fn(),
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the one-time child setup when no profile exists', async () => {
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Chào mừng con' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Tên của bé')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Bắt đầu học' }),
    ).toBeInTheDocument()
  })
})
