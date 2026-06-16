// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import App from './App'
import { encodeState } from './lib/urlState'

const encoded = encodeState({ participants: [{ id: 'al', name: 'Alice' }], assignments: { brazil: 'al' } })
const lockedEncoded = encodeState({
  participants: [{ id: 'al', name: 'Alice' }],
  assignments: { brazil: 'al' },
  locked: true,
})

// useResults fetches /api/results and /overrides.json — stub them.
vi.stubGlobal(
  'fetch',
  vi.fn(async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch,
)

afterEach(cleanup)

describe('App tab navigation', () => {
  it('keeps the ?s= state param when switching tabs', async () => {
    window.history.replaceState(null, '', `/?s=${encoded}`)

    await act(async () => {
      render(<App />)
    })

    const groupsTab = screen.getByRole('tab', { name: 'Groups' })
    await act(async () => {
      groupsTab.click()
    })

    expect(window.location.pathname).toBe('/groups')
    expect(new URLSearchParams(window.location.search).get('s')).toBe(encoded)
  })
})

describe('locked draw', () => {
  it('hides the assignment editor and shows a read-only roster with an unlock control', async () => {
    window.history.replaceState(null, '', `/?s=${lockedEncoded}`)

    await act(async () => {
      render(<App />)
    })

    // The editing UI is gone...
    expect(screen.queryByRole('button', { name: /lock the draw/i })).toBeNull()
    expect(screen.queryByText('Assign teams')).toBeNull()
    // ...replaced by the read-only roster and an unlock affordance.
    expect(screen.getByRole('heading', { name: 'Participants' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /unlock to edit/i })).toBeTruthy()
  })
})
