import { describe, expect, it } from 'vitest'
import type { BulletinMeta } from './api'
import {
  counts,
  crumb,
  describe as label,
  filterPublications,
  issuesOf,
  longPeriod,
  nextAutoDraft,
  notifications,
  pageOf,
  readFilters,
  recent,
  schedule,
  shortPeriod,
  statusOf,
  toPublish,
  writeFilters,
} from './catalog'
import { plain } from './testing'

const plainLabel = (l: { name: string; detail: string }) => ({ name: plain(l.name), detail: plain(l.detail) })

let nextId = 1
/** une ligne de la liste, telle que le serveur la rend ; un brouillon de bulletin sans
 *  modèle par défaut */
function meta(over: Partial<BulletinMeta> = {}): BulletinMeta {
  return {
    id: nextId++, title: 'Bulletin', kind: 'bulletin', isTemplate: false, date: '2026-11-08', validUntil: null,
    cadence: 'daily', draftAt: null, parent: 1, parentTitle: 'Forecasts', blockCount: 0, updatedAt: 1000,
    live: false, hasUnpublishedChanges: false, url: null, template: null, publishedAt: null, preparedAt: null,
    issueCount: 0, nextDraft: null, ...over,
  }
}

const dekadal = meta({ isTemplate: true, title: 'Agromet dekadal', cadence: 'dekadal', draftAt: '08:00',
  nextDraft: { at: '2026-11-21T08:00', start: '2026-11-21', end: '2026-11-30' } })
const daily = meta({ isTemplate: true, title: 'Daily weather', draftAt: '06:00',
  nextDraft: { at: '2026-11-19T06:00', start: '2026-11-19', end: '2026-11-19' } })
const rain = meta({ isTemplate: true, kind: 'flash', title: 'Heavy rain' })
const of = (tpl: BulletinMeta) => ({ id: tpl.id, title: tpl.title })

// un brouillon préparé tout seul, un fait à la main, un en ligne à jour, un en ligne
// modifié depuis, un flash publié, une publication sans modèle
const prepared = meta({ title: 'Daily weather — 18 November 2026', template: of(daily), date: '2026-11-18', preparedAt: 5000, updatedAt: 5000 })
const byHand = meta({ title: 'Agromet dekadal — 11–20 Nov', template: of(dekadal), cadence: 'dekadal', date: '2026-11-11', validUntil: '2026-11-20', updatedAt: 4000 })
const online = meta({ title: 'Daily weather — 17 November 2026', template: of(daily), date: '2026-11-17', live: true, publishedAt: 3000, updatedAt: 3000 })
const changed = meta({ title: 'Agromet dekadal — 1–10 Nov', template: of(dekadal), cadence: 'dekadal', date: '2026-11-01', validUntil: '2026-11-10', live: true, hasUnpublishedChanges: true, publishedAt: 2000, updatedAt: 6000 })
const flash = meta({ title: 'Heavy rain — 8 Nov', kind: 'flash', template: of(rain), live: true, publishedAt: 3500, updatedAt: 3500 })
const oneOff = meta({ title: 'Début de la saison des pluies', date: '2026-10-28', live: true, publishedAt: 1000, updatedAt: 1000 })

const items = [dekadal, daily, rain, prepared, byHand, online, changed, flash, oneOff]

describe('status and what is waiting', () => {
  it('tells a draft, a page with unpublished changes and an up-to-date one apart', () => {
    expect(statusOf(byHand)).toBe('draft')
    expect(statusOf(changed)).toBe('pending')
    expect(statusOf(online)).toBe('live')
  })

  it('notifies the drafts the task prepared, and lists the rest to publish', () => {
    expect(notifications(items)).toEqual([prepared])
    expect(toPublish(items)).toEqual([changed, byHand]) // the latest change first
  })

  it('lists the latest publications, newest first', () => {
    expect(recent(items)).toEqual([flash, online, changed, oneOff])
    expect(recent(items, 2)).toEqual([flash, online])
  })

  it('finds the next automatic draft across templates', () => {
    expect(nextAutoDraft(items)).toMatchObject({ template: daily, at: '2026-11-19T06:00' })
    expect(nextAutoDraft([rain, oneOff])).toBeNull()
  })

  it('counts templates and publications by kind', () => {
    expect(counts(items)).toEqual({
      templates: { total: 3, bulletin: 2, flash: 1 },
      publications: { total: 6, bulletin: 5, flash: 1, drafts: 2 },
    })
  })

  it("orders a template's issues by period, the latest first", () => {
    expect(issuesOf(items, dekadal.id)).toEqual([byHand, changed])
    expect(issuesOf(items, rain.id)).toEqual([flash])
  })
})

describe('filters', () => {
  it('reads the address, and falls back on the defaults for what it cannot read', () => {
    expect(readFilters({})).toEqual({ q: '', kind: 'all', status: 'all', template: 'all', page: 1 })
    expect(readFilters({ kind: 'flash', status: 'draft', template: '12', q: 'rain', page: '3' })).toEqual({
      q: 'rain', kind: 'flash', status: 'draft', template: 12, page: 3,
    })
    expect(readFilters({ kind: 'poster', status: 'gone', template: 'x', page: '-2' })).toEqual(readFilters({}))
    expect(readFilters({ template: 'none' }).template).toBe('none')
  })

  it('writes only what differs from the defaults', () => {
    expect(writeFilters(readFilters({}))).toEqual({ q: '', kind: '', status: '', template: '', page: '' })
    const f = readFilters({ kind: 'bulletin', template: 'none', page: '2', q: ' x ' })
    expect(readFilters(writeFilters(f))).toEqual({ ...f, q: 'x' })
  })

  const filter = (query: Record<string, string>) => filterPublications(items, readFilters(query))

  it('filters by kind, status and template', () => {
    expect(filter({ kind: 'flash' })).toEqual([flash])
    expect(filter({ status: 'draft' })).toEqual([prepared, byHand])
    // "published" includes the pages whose changes are not online yet
    expect(filter({ status: 'live' })).toEqual([changed, flash, online, oneOff])
    expect(filter({ template: String(dekadal.id) })).toEqual([changed, byHand])
    expect(filter({ template: 'none' })).toEqual([oneOff])
  })

  it('searches titles regardless of accents and case', () => {
    expect(filter({ q: 'DEBUT de la saison' })).toEqual([oneOff])
    expect(filter({ q: 'nothing like it' })).toEqual([])
  })

  it('never lists templates', () => {
    expect(filter({}).some((b) => b.isTemplate)).toBe(false)
  })

  it('pages, keeping the page within bounds', () => {
    const list = Array.from({ length: 30 }, (_, i) => i)
    expect(pageOf(list, 1, 25)).toMatchObject({ page: 1, pages: 2, from: 1, to: 25 })
    expect(pageOf(list, 2, 25)).toMatchObject({ page: 2, from: 26, to: 30, items: [25, 26, 27, 28, 29] })
    expect(pageOf(list, 9, 25).page).toBe(2)
    expect(pageOf([], 1, 25)).toMatchObject({ page: 1, pages: 1, items: [] })
  })
})

describe('labels', () => {
  it('names an issue by its template, its number and its period', () => {
    expect(plainLabel(label(byHand))).toEqual({ name: 'Agromet dekadal', detail: 'No. 32 · Nov 11 – 20, 2026' })
    expect(plainLabel(label(prepared))).toEqual({ name: 'Daily weather', detail: 'No. 322 · Nov 18, 2026' })
    expect(plainLabel(label(flash))).toEqual({ name: 'Heavy rain', detail: 'Flash of Nov 8, 2026' })
    expect(plainLabel(label(oneOff))).toEqual({ name: 'Début de la saison des pluies', detail: 'Bulletin without template · Oct 28, 2026' })
  })

  it('ends the editor breadcrumb with what is being edited', () => {
    expect(plain(crumb(dekadal))).toBe('Edit the template')
    expect(plain(crumb(byHand))).toBe('No. 32 · Nov 11 – 20, 2026')
    expect(plain(crumb(flash))).toBe('Flash of Nov 8, 2026')
    expect(plain(crumb(oneOff))).toBe('Début de la saison des pluies')
  })

  it('writes a period short and long', () => {
    expect(plain(shortPeriod(byHand))).toBe('Nov 11 – 20, 2026')
    expect(plain(shortPeriod({ date: '2026-11-01', validUntil: '2026-11-30', cadence: 'monthly' }))).toBe('November 2026')
    expect(plain(longPeriod(byHand))).toBe('Dekad: Nov 11 – 20, 2026')
    expect(plain(longPeriod({ date: '2026-11-01', validUntil: '2026-11-30', cadence: 'monthly' }))).toBe('Month: November 2026')
    expect(plain(longPeriod(prepared))).toBe('Wednesday, November 18, 2026')
    expect(plain(shortPeriod({ date: null, validUntil: null, cadence: 'daily' }))).toBe('')
  })

  it('says when a template prepares its drafts, or that it does not', () => {
    expect(schedule(dekadal)).toBe('on the 1st, 11th and 21st at 08:00')
    expect(schedule(daily)).toBe('every day at 06:00')
    expect(schedule({ ...daily, draftAt: null })).toBeNull()
    expect(schedule({ ...rain, draftAt: '06:00' })).toBeNull() // a flash is made on demand
  })
})
