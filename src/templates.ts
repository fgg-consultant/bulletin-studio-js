import { hasForecast } from './api'
import { defaultBadges } from './fields'
import { t } from './i18n'
import { uid } from './store'
import type { Block, Cadence } from './types'

const text = (preset: 'heading' | 'text' = 'text'): Block => ({ id: uid(), type: 'text', preset, state: null })
const image = (): Block => ({ id: uid(), type: 'image', src: null, alt: '', caption: '' })
const header = (title = '', badges = true): Block => ({
  id: uid(),
  type: 'header',
  eyebrow: t('defaults.eyebrow'),
  title,
  subtitle: '',
  badges: badges ? defaultBadges(uid) : [],
  bg: '#175243',
})
const cols = (ratios: number[], fill: (() => Block)[][]): Block => ({
  id: uid(),
  type: 'columns',
  ratios,
  columns: ratios.map((_, i) => (fill[i] ?? []).map((f) => f())),
})
const table = (): Block => ({
  id: uid(),
  type: 'table',
  header: true,
  rows: [
    ['', '', ''],
    ['', '', ''],
    ['', '', ''],
  ],
})
const divider = (): Block => ({ id: uid(), type: 'divider' })
const issueDate = (): Block => ({
  id: uid(), type: 'date', date: new Date().toISOString().slice(0, 10), issueDate: true, align: 'left',
})
const forecast = (dayOffset: number): Block => ({
  id: uid(), type: 'forecast', period: null, preset: 'bulletin', dayOffset,
  date: null, src: null, imageId: null, version: null, periodLabel: '', alt: '', caption: '',
})
const cities = (dayOffset: number): Block => ({
  id: uid(), type: 'cities', period: null, dayOffset, cities: null, columns: 2,
  date: null, periodLabel: '', units: null, rows: null, version: null,
})

/** jetons de l'aperçu miniature dessiné sur la carte */
export type PreviewToken =
  | { t: 'band' }
  | { t: 'title' }
  | { t: 'text' }
  | { t: 'img' }
  | { t: 'cols'; r: number[] }
  | { t: 'table' }

export interface Template {
  key: string
  label: string
  /** le titre du modèle créé, plutôt que « Modèle {label} » : ses numéros s'appellent
   *  « {titre} — {date} » */
  name?: string
  /** la période de ses numéros, quotidienne par défaut */
  cadence?: Cadence
  preview: PreviewToken[]
  make: () => Block[]
}

export const templates: Template[] = [
  { key: 'blank', label: t('starters.blank'), preview: [], make: () => [] },
  {
    key: 'c1',
    label: t('starters.c1'),
    preview: [{ t: 'title' }, { t: 'text' }, { t: 'img' }, { t: 'text' }],
    make: () => [text('heading'), text(), image(), text()],
  },
  {
    key: 'c1b',
    label: t('starters.c1band'),
    preview: [{ t: 'band' }, { t: 'text' }, { t: 'img' }, { t: 'text' }],
    make: () => [header(), text(), image(), text()],
  },
  {
    key: 'c12b',
    label: t('starters.c12band'),
    preview: [{ t: 'band' }, { t: 'cols', r: [1, 2] }, { t: 'text' }],
    make: () => [header(), cols([1, 2], [[image], [text]]), text()],
  },
  {
    key: 'c2b',
    label: t('starters.c2band'),
    preview: [{ t: 'band' }, { t: 'title' }, { t: 'cols', r: [1, 1] }, { t: 'text' }],
    make: () => [header(), text('heading'), cols([1, 1], [[text], [text]]), text()],
  },
  {
    key: 'c3b',
    label: t('starters.c3band'),
    preview: [{ t: 'band' }, { t: 'title' }, { t: 'cols', r: [1, 1, 1] }],
    make: () => [header(), text('heading'), cols([1, 1, 1], [[text], [text], [text]])],
  },
  {
    key: 'c21',
    label: t('starters.c21'),
    preview: [{ t: 'title' }, { t: 'cols', r: [2, 1] }, { t: 'text' }],
    make: () => [text('heading'), cols([2, 1], [[text], [image]]), text()],
  },
  // la perspective de la décade ou du mois qui commence : badges de validité et date
  // du bulletin suivent la période de chaque numéro
  {
    key: 'decadaire',
    label: t('starters.decadal'),
    name: t('starters.decadal'),
    cadence: 'dekadal',
    preview: [{ t: 'band' }, { t: 'title' }, { t: 'text' }, { t: 'cols', r: [1, 1] }, { t: 'table' }],
    make: () => [
      header(t('starters.decadal')),
      issueDate(),
      text('heading'),
      text(),
      divider(),
      cols([1, 1], [[text], [image]]),
      table(),
    ],
  },
  {
    key: 'monthly',
    label: t('starters.monthly'),
    name: t('starters.monthly'),
    cadence: 'monthly',
    preview: [{ t: 'band' }, { t: 'title' }, { t: 'cols', r: [1, 1] }, { t: 'text' }, { t: 'table' }],
    make: () => [
      header(t('starters.monthly')),
      text('heading'),
      cols([1, 1], [[text], [image]]),
      text(),
      table(),
    ],
  },
  // la carte du jour et celle du lendemain, autour du commentaire du prévisionniste ;
  // seulement là où climweb dessine des cartes de prévision
  ...(hasForecast
    ? [
        {
          key: 'daily',
          label: t('starters.daily'),
          name: t('starters.daily'),
          preview: [{ t: 'band' }, { t: 'img' }, { t: 'text' }, { t: 'img' }],
          make: () => [header(t('starters.daily'), false), issueDate(), forecast(0), text(), forecast(1)],
        } satisfies Template,
        // le commentaire du prévisionniste, puis la grille des villes du jour
        {
          key: 'cities',
          label: t('starters.cities'),
          name: t('starters.cities'),
          preview: [{ t: 'band' }, { t: 'text' }, { t: 'table' }],
          make: () => [header(t('starters.cities'), false), issueDate(), text(), cities(0)],
        } satisfies Template,
      ]
    : []),
]
