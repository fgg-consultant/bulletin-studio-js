import { describe, expect, it } from 'vitest'
import { newPublication, openNewPublication, periodChoices, periodLabel } from './newPublication'
import { plain } from './testing'


describe('periodChoices', () => {
  it('offers the current dekad and the next one, with their numbers', () => {
    expect(periodChoices('bulletin', 'dekadal', '2026-11-18').map((c) => ({ ...c, label: plain(c.label) }))).toEqual([
      { key: 'current', date: '2026-11-11', label: 'Current — No. 32 · Nov 11 – 20, 2026' },
      { key: 'next', date: '2026-11-21', label: 'Next — No. 33 · Nov 21 – 30, 2026' },
    ])
  })

  it('says today and tomorrow for a daily bulletin', () => {
    expect(periodChoices('bulletin', 'daily', '2026-12-31').map((c) => [c.date, plain(c.label)])).toEqual([
      ['2026-12-31', 'Today — No. 365 · Dec 31, 2026'],
      ['2027-01-01', 'Tomorrow — No. 1 · Jan 1, 2027'],
    ])
  })

  it('treats a flash as a day, whatever its template says', () => {
    expect(periodChoices('flash', 'monthly', '2026-11-18').map((c) => plain(c.label))).toEqual([
      'Today — Wednesday, November 18, 2026',
      'Tomorrow — Thursday, November 19, 2026',
    ])
  })

  it('labels a month by its name', () => {
    expect(plain(periodLabel('bulletin', 'monthly', { start: '2026-11-01', end: '2026-11-30' }))).toBe('No. 11 · November 2026')
  })
})

describe('openNewPublication', () => {
  it('opens the dialog set on a template, or on a fresh bulletin', () => {
    openNewPublication({ kind: 'flash', templateId: 4 })
    expect(newPublication).toMatchObject({ open: true, kind: 'flash', source: 'template', templateId: 4 })
    openNewPublication()
    expect(newPublication).toMatchObject({ open: true, kind: 'bulletin', source: 'template', templateId: null })
  })
})
