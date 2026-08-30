import { t } from './i18n'
import { uid } from './store'
import type { Block } from './types'

const text = (preset: 'heading' | 'text' = 'text'): Block => ({ id: uid(), type: 'text', preset, state: null })
const image = (): Block => ({ id: uid(), type: 'image', src: null, alt: '', caption: '' })
const header = (): Block => ({
  id: uid(),
  type: 'header',
  eyebrow: t('defaults.eyebrow'),
  title: '',
  subtitle: '',
  badges: [
    { id: uid(), text: t('defaults.badgeValid') },
    { id: uid(), text: t('defaults.badgePublished') },
  ],
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
const date = (): Block => ({ id: uid(), type: 'date', date: new Date().toISOString().slice(0, 10), align: 'left' })
const divider = (): Block => ({ id: uid(), type: 'divider' })

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
  {
    key: 'decadaire',
    label: t('starters.decadal'),
    preview: [{ t: 'band' }, { t: 'title' }, { t: 'text' }, { t: 'cols', r: [1, 1] }, { t: 'table' }],
    make: () => [
      header(),
      date(),
      text('heading'),
      text(),
      divider(),
      cols([1, 1], [[text], [image]]),
      table(),
    ],
  },
]
