import { describe, expect, it } from 'vitest'
import { addDays, nextPeriod, periodNumber, periodOf, previousPeriod } from './periods'

describe('periodOf', () => {
  it('is the day itself for a daily cadence', () => {
    expect(periodOf('daily', '2026-11-18')).toEqual({ start: '2026-11-18', end: '2026-11-18' })
  })

  it('cuts months into three dekads, the last one up to the month end', () => {
    expect(periodOf('dekadal', '2026-11-01')).toEqual({ start: '2026-11-01', end: '2026-11-10' })
    expect(periodOf('dekadal', '2026-11-10')).toEqual({ start: '2026-11-01', end: '2026-11-10' })
    expect(periodOf('dekadal', '2026-11-11')).toEqual({ start: '2026-11-11', end: '2026-11-20' })
    expect(periodOf('dekadal', '2026-11-21')).toEqual({ start: '2026-11-21', end: '2026-11-30' })
    expect(periodOf('dekadal', '2026-12-31')).toEqual({ start: '2026-12-21', end: '2026-12-31' })
    expect(periodOf('dekadal', '2028-02-25')).toEqual({ start: '2028-02-21', end: '2028-02-29' })
  })

  it('covers the whole month for a monthly cadence', () => {
    expect(periodOf('monthly', '2026-02-14')).toEqual({ start: '2026-02-01', end: '2026-02-28' })
    expect(periodOf('monthly', '2028-02-14')).toEqual({ start: '2028-02-01', end: '2028-02-29' })
  })
})

describe('nextPeriod and previousPeriod', () => {
  it('step over month and year ends', () => {
    expect(nextPeriod('dekadal', periodOf('dekadal', '2026-12-25'))).toEqual({ start: '2027-01-01', end: '2027-01-10' })
    expect(previousPeriod('dekadal', periodOf('dekadal', '2027-01-05'))).toEqual({ start: '2026-12-21', end: '2026-12-31' })
    expect(nextPeriod('monthly', periodOf('monthly', '2026-12-03'))).toEqual({ start: '2027-01-01', end: '2027-01-31' })
    expect(previousPeriod('monthly', periodOf('monthly', '2026-03-03'))).toEqual({ start: '2026-02-01', end: '2026-02-28' })
    expect(nextPeriod('daily', periodOf('daily', '2026-12-31'))).toEqual({ start: '2027-01-01', end: '2027-01-01' })
  })
})

describe('periodNumber', () => {
  it('ranks a dekad among the 36 of its year', () => {
    expect(periodNumber('dekadal', '2026-01-01')).toBe(1)
    expect(periodNumber('dekadal', '2026-10-01')).toBe(28)
    expect(periodNumber('dekadal', '2026-11-11')).toBe(32)
    expect(periodNumber('dekadal', '2026-12-21')).toBe(36)
  })

  it('is the month for a monthly cadence, the day of the year for a daily one', () => {
    expect(periodNumber('monthly', '2026-11-01')).toBe(11)
    expect(periodNumber('daily', '2026-01-01')).toBe(1)
    expect(periodNumber('daily', '2026-11-08')).toBe(312)
    expect(periodNumber('daily', '2028-12-31')).toBe(366)
  })
})

describe('addDays', () => {
  it('crosses month, year and leap days', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
  })
})
