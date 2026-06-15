// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import App from './App'
import { encodeState } from './lib/urlState'

const encoded = encodeState({ participants: [{ id: 'al', name: 'Alice' }], assignments: { brazil: 'al' } })

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
