// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { encodeState, writeStateToUrl } from './urlState'
import { writeTabToPath } from './tabs'

const sample = { participants: [{ id: 'al', name: 'Alice' }], assignments: { brazil: 'al' } }

beforeEach(() => {
  window.history.replaceState(null, '', `/?s=${encodeState(sample)}`)
})

describe('tab navigation preserves the state query param', () => {
  it('keeps ?s= when switching tabs', () => {
    writeTabToPath('groups')
    expect(window.location.pathname).toBe('/groups')
    expect(new URLSearchParams(window.location.search).get('s')).toBe(encodeState(sample))
  })

  it('keeps ?s= when a state write follows a tab change', () => {
    writeTabToPath('awards')
    writeStateToUrl(sample)
    expect(window.location.pathname).toBe('/awards')
    expect(new URLSearchParams(window.location.search).get('s')).toBe(encodeState(sample))
  })

  it('preserves the tab path when state is written', () => {
    writeTabToPath('knockouts')
    writeStateToUrl(sample)
    expect(window.location.pathname).toBe('/knockouts')
  })
})
