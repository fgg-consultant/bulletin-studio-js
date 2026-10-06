import { $createHeadingNode } from '@lexical/rich-text'
import { $createTextNode, $getRoot, createEditor } from 'lexical'
import { hasForecast } from './api'
import { AS_FIELDS, defaultBadges } from './fields'
import { t } from './i18n'
import { nodes, theme } from './lexical'
import { uid } from './store'
import type { Block, Cadence, HeaderBlock } from './types'

const text = (preset: 'heading' | 'text' = 'text'): Block => ({ id: uid(), type: 'text', preset, state: null })
/** un titre déjà écrit : le plan d'un modèle, que chaque numéro garde */
function heading(label: string, tag: 'h2' | 'h3' = 'h2'): Block {
  const editor = createEditor({ nodes, theme, onError: (e) => console.error(e) })
  editor.update(() => $getRoot().append($createHeadingNode(tag).append($createTextNode(label))), { discrete: true })
  return { id: uid(), type: 'text', preset: 'heading', state: JSON.stringify(editor.getEditorState().toJSON()) }
}
/** la légende dit quelle carte va là : sans image, rien n'est publié */
const image = (caption = ''): Block => ({ id: uid(), type: 'image', src: null, alt: '', caption })
const header = (title = '', badges = true): HeaderBlock => ({
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
  // le plan commun des bulletins agrométéorologiques décadaires de quatre services
  // (Bénin, Burkina Faso, Kenya, Tchad) : le bilan de la décade écoulée, puis les
  // perspectives et les conseils de celle du numéro. Les cartes sont des images ; un
  // service supprime dans son modèle les sections qu'il ne produit pas.
  {
    key: 'agromet-dekadal',
    label: t('starters.agromet'),
    name: t('starters.agromet'),
    cadence: 'dekadal',
    preview: [
      { t: 'band' }, { t: 'title' }, { t: 'text' }, { t: 'cols', r: [1, 1] },
      { t: 'title' }, { t: 'cols', r: [1, 1] }, { t: 'text' },
    ],
    make: () => {
      const map = (key: string) => () => image(t(`agromet.${key}`))
      const h3 = (key: string) => () => heading(t(`agromet.${key}`), 'h3')
      return [
        {
          ...header(t('starters.agromet')),
          eyebrow: t('agromet.eyebrow'),
          subtitle: t('agromet.subtitle'),
          badges: [
            { id: uid(), text: t('agromet.badgePast', AS_FIELDS) },
            { id: uid(), text: t('agromet.badgeOutlook', AS_FIELDS) },
            { id: uid(), text: t('defaults.badgePublished', AS_FIELDS) },
          ],
        },
        heading(t('agromet.highlights')),
        text(),
        heading(t('agromet.rainfall')),
        text(),
        cols([1, 1], [[map('rainDekad')], [map('rainAnomaly')]]),
        heading(t('agromet.season'), 'h3'),
        text(),
        cols([1, 1], [[map('seasonTotal')], [map('seasonAnomaly')]]),
        heading(t('agromet.conditions')),
        cols([1, 1], [
          [h3('temperature'), text, map('temperatureMap')],
          [h3('soil'), text, map('soilMap')],
        ]),
        heading(t('agromet.vegetation')),
        text(),
        cols([1, 1], [[map('ndvi')], [map('ndviAnomaly')]]),
        heading(t('agromet.crops'), 'h3'),
        text(),
        heading(t('agromet.outlook')),
        cols([1, 1], [[text], [map('outlookMap')]]),
        heading(t('agromet.advice')),
        text(),
        cols([1, 1], [
          [h3('adviceCrops'), text],
          [h3('adviceLivestock'), text],
        ]),
        divider(),
        heading(t('agromet.contacts'), 'h3'),
        text(),
      ]
    },
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
