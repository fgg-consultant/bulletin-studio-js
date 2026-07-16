import { uid } from './store'
import type { Block } from './types'

const text = (preset: 'heading' | 'text' = 'text'): Block => ({ id: uid(), type: 'text', preset, state: null })
const image = (): Block => ({ id: uid(), type: 'image', src: null, alt: '', caption: '' })
const header = (): Block => ({
  id: uid(),
  type: 'header',
  eyebrow: 'Bulletin',
  title: '',
  subtitle: '',
  badges: [
    { id: uid(), text: 'Valide du … au …' },
    { id: uid(), text: 'Publié le …' },
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
  { key: 'blank', label: 'Page vierge', preview: [], make: () => [] },
  {
    key: 'c1',
    label: '1 colonne',
    preview: [{ t: 'title' }, { t: 'text' }, { t: 'img' }, { t: 'text' }],
    make: () => [text('heading'), text(), image(), text()],
  },
  {
    key: 'c1b',
    label: '1 colonne · bandeau',
    preview: [{ t: 'band' }, { t: 'text' }, { t: 'img' }, { t: 'text' }],
    make: () => [header(), text(), image(), text()],
  },
  {
    key: 'c12b',
    label: '1 : 2 · bandeau',
    preview: [{ t: 'band' }, { t: 'cols', r: [1, 2] }, { t: 'text' }],
    make: () => [header(), cols([1, 2], [[image], [text]]), text()],
  },
  {
    key: 'c2b',
    label: '2 colonnes · bandeau',
    preview: [{ t: 'band' }, { t: 'title' }, { t: 'cols', r: [1, 1] }, { t: 'text' }],
    make: () => [header(), text('heading'), cols([1, 1], [[text], [text]]), text()],
  },
  {
    key: 'c3b',
    label: '3 colonnes · bandeau',
    preview: [{ t: 'band' }, { t: 'title' }, { t: 'cols', r: [1, 1, 1] }],
    make: () => [header(), text('heading'), cols([1, 1, 1], [[text], [text], [text]])],
  },
  {
    key: 'c21',
    label: '2 : 1',
    preview: [{ t: 'title' }, { t: 'cols', r: [2, 1] }, { t: 'text' }],
    make: () => [text('heading'), cols([2, 1], [[text], [image]]), text()],
  },
  {
    key: 'decadaire',
    label: 'Bulletin décadaire',
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
