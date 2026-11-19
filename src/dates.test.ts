// Les heures relatives et l'heure du site. Les tests tournent en UTC (vitest.config.ts).
import { describe, expect, it } from 'vitest'
import { inLocalTime } from './clock'
import { formatAge, formatDayAt, formatDayOf, formatLongDay, formatRecentDay, formatShortRange, formatWhen } from './i18n'
import { plain } from './testing'


const at = (iso: string) => new Date(iso).getTime()
const now = at('2026-11-18T10:00:00Z')

describe('formatRecentDay and formatWhen', () => {
  it('says today and yesterday, then the date, with the year only when it differs', () => {
    expect(plain(formatRecentDay(at('2026-11-18T07:38:00Z'), now))).toBe('today')
    expect(plain(formatRecentDay(at('2026-11-17T23:59:00Z'), now))).toBe('yesterday')
    expect(plain(formatRecentDay(at('2026-11-06T07:51:00Z'), now))).toBe('Nov 6')
    expect(plain(formatRecentDay(at('2025-11-06T07:51:00Z'), now))).toBe('Nov 6, 2025')
    expect(plain(formatWhen(at('2026-11-17T07:38:00Z'), now))).toBe('yesterday, 07:38 AM')
  })

  it('never says yesterday after "Published"', () => {
    expect(plain(formatDayOf(at('2026-11-17T07:38:00Z'), now))).toBe('Nov 17')
  })
})

describe('formatDayAt', () => {
  it('names the day of an automatic draft relative to the site today', () => {
    expect(plain(formatDayAt('2026-11-18', '06:00', '2026-11-18'))).toBe('today at 06:00')
    expect(plain(formatDayAt('2026-11-19', '06:00', '2026-11-18'))).toBe('tomorrow at 06:00')
    expect(plain(formatDayAt('2026-11-21', '08:00', '2026-11-18'))).toBe('Saturday, November 21 at 08:00')
    expect(plain(formatDayAt('2027-01-01', '08:00', '2026-12-30'))).toBe('Friday, January 1, 2027 at 08:00')
  })
})

describe('formatAge', () => {
  it('picks the unit that says it best', () => {
    expect(formatAge(now - 20 * 60_000, now)).toBe('20 minutes')
    expect(formatAge(now - 4 * 3_600_000, now)).toBe('4 hours')
    expect(formatAge(now - 30 * 3_600_000, now)).toBe('30 hours')
    expect(formatAge(now - 7 * 86_400_000, now)).toBe('7 days')
    expect(formatAge(now + 60_000, now)).toBe('0 minutes') // a clock slightly ahead
  })
})

describe('date formats', () => {
  it('writes long days and short ranges', () => {
    expect(plain(formatLongDay('2026-11-08'))).toBe('Sunday, November 8, 2026')
    expect(plain(formatShortRange('2026-11-01', '2026-11-10'))).toBe('Nov 1 – 10, 2026')
    expect(plain(formatLongDay(''))).toBe('')
  })
})

describe('inLocalTime', () => {
  it('converts the site time to the browser time, or says nothing when they agree', () => {
    expect(inLocalTime('09:00', 'Africa/Nairobi', new Date(now))).toBe('06:00') // UTC+3
    expect(inLocalTime('09:00', 'UTC', new Date(now))).toBe('')
    expect(inLocalTime('09:00', 'Not/AZone', new Date(now))).toBe('')
    expect(inLocalTime(null, 'Africa/Nairobi')).toBe('')
  })
})
