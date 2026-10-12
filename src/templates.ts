import { $createListItemNode, $createListNode } from '@lexical/list'
import { $createHeadingNode } from '@lexical/rich-text'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  type ElementNode,
  type LexicalNode,
} from 'lexical'
import { hasForecast } from './api'
import { AS_FIELDS, defaultBadges } from './fields'
import { t } from './i18n'
import { nodes, theme } from './lexical'
import { uid } from './store'
import type { Block, Cadence, HeaderBlock, TextBlock } from './types'

const text = (preset: 'heading' | 'text' = 'text'): Block => ({ id: uid(), type: 'text', preset, state: null })

/** un texte déjà écrit : un paragraphe, une liste à puces (`ul`) ou numérotée (`ol`), un
 *  titre ; `**gras**` dans le texte */
type Rich = string | { ul: string[] } | { ol: string[] } | { h2: string } | { h3: string }

function $inline(parent: ElementNode, s: string): ElementNode {
  s.split(/\*\*(.+?)\*\*/).forEach((part, i) => {
    if (part) parent.append(i % 2 ? $createTextNode(part).toggleFormat('bold') : $createTextNode(part))
  })
  return parent
}

function $rich(part: Rich): LexicalNode {
  if (typeof part === 'string') return $inline($createParagraphNode(), part)
  if ('h2' in part) return $inline($createHeadingNode('h2'), part.h2)
  if ('h3' in part) return $inline($createHeadingNode('h3'), part.h3)
  const list = $createListNode('ul' in part ? 'bullet' : 'number')
  for (const item of 'ul' in part ? part.ul : part.ol) list.append($inline($createListItemNode(), item))
  return list
}

/** le plan et les phrases d'un modèle, que chaque numéro garde ou réécrit */
function rich(...parts: Rich[]): TextBlock {
  const editor = createEditor({ nodes, theme, onError: (e) => console.error(e) })
  editor.update(() => $getRoot().append(...parts.map($rich)), { discrete: true })
  return { id: uid(), type: 'text', preset: 'text', state: JSON.stringify(editor.getEditorState().toJSON()) }
}
const heading = (label: string): Block => ({ ...rich({ h2: label }), preset: 'heading' })

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
const table = (
  rows = [
    ['', '', ''],
    ['', '', ''],
    ['', '', ''],
  ],
): Block => ({ id: uid(), type: 'table', header: true, rows })
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
  // le bulletin agrométéorologique décadaire que proposent les services de 17 pays
  // (revue « 10-day agromet bulletin », oct. 2026) : la page 1 se suffit à elle-même
  // (messages clés, petite carte de pluie, perspectives en une ligne, trois actions),
  // les cartes qui l'étayent suivent, puis les conseils par région et par secteur.
  // Les phrases par défaut sont écrites, [entre crochets] ce que chaque numéro
  // remplace. Les cartes sont des images : chaque légende dit sa période, observée
  // ou prévue, et le produit du catalogue Data Helper qui la remplit, qu'un service
  // remplace par sa carte nationale. Trois sections sont facultatives (cultures et
  // marchés, hydrologie, contexte saisonnier) : un service supprime de son modèle
  // celles qu'il ne publie pas.
  {
    key: 'agromet-dekadal',
    label: t('starters.agromet'),
    name: t('starters.agromet'),
    cadence: 'dekadal',
    preview: [
      { t: 'band' }, { t: 'title' }, { t: 'cols', r: [3, 2] }, { t: 'text' },
      { t: 'title' }, { t: 'cols', r: [1, 1] }, { t: 'table' },
    ],
    make: () => {
      const a = (key: string, params: Record<string, string> = {}) => t(`agromet.${key}`, params)
      // les dates de la légende suivent chaque numéro, comme celles de l'en-tête
      const map = (key: string) => () => image(a(key, AS_FIELDS))
      const row = (key: string) => a(key).split('|').map((cell) => cell.trim())
      const stations = row('stationsHead')
      return [
        {
          ...header(t('starters.agromet')),
          eyebrow: a('eyebrow'),
          subtitle: a('subtitle'),
          badges: [
            { id: uid(), text: a('badgeNumber', AS_FIELDS) },
            { id: uid(), text: a('badgePast', AS_FIELDS) },
            { id: uid(), text: a('badgeOutlook', AS_FIELDS) },
            { id: uid(), text: t('defaults.badgePublished', AS_FIELDS) },
          ],
        },
        // page 1 : ce qui s'est passé, ce qui vient, que faire
        heading(a('keyMessages')),
        cols([3, 2], [
          [() => rich({ ul: [a('keyRain'), a('keyTemperature'), a('keyCrops'), a('keyWater')] },
            { h3: a('nextDays') }, a('outlookLine'))],
          [map('capRainSmall')],
        ]),
        rich({ h3: a('actions') }, { ol: [a('action1'), a('action2'), a('action3')] }),
        divider(),
        // les cartes qui l'étayent
        rich({ h2: a('rainfall') }, a('rainText'), a('anomalyText')),
        cols([1, 1], [[map('capRain')], [map('capAnomaly')]]),
        // une légende en mots, la même d'un numéro à l'autre
        table([row('legendHead'), row('legendBelow'), row('legendNear'), row('legendAbove')]),
        rich({ h2: a('season') }, a('seasonText')),
        cols([1, 1], [[map('capSeason')], [map('capRainyDays')]]),
        rich({ h2: a('temperature') }, a('temperatureText')),
        cols([1, 1], [[map('capTmax')], [map('capTmin')]]),
        rich({ h2: a('water') }, a('waterText')),
        cols([1, 1], [[map('capSoil')], [map('capWrsi')]]),
        cols([1, 1], [[map('capNdvi')], [map('capNdviAnomaly')]]),
        heading(a('outlook')),
        cols([1, 1], [[map('capForecastRain')], [map('capForecastTemp')]]),
        rich({ ul: [a('outlookRegion'), a('outlookRegion'), a('outlookRegion')] }, a('efiText')),
        // chaque ligne : la région, ce qui l'attend, puis quoi faire, secteur par secteur
        heading(a('advice')),
        table([row('adviceHead'), row('adviceRow1'), row('adviceRow2'), row('adviceRow3')]),
        // facultatives
        rich({ h2: a('crops') }, a('cropsNote'), { ul: [a('cropStages'), a('pests'), a('pastures'), a('markets')] }),
        rich({ h2: a('hydrology') }, a('hydrologyNote'), a('river')),
        image(a('capRiver', AS_FIELDS)),
        rich({ h2: a('seasonal') }, a('seasonalNote'), a('seasonalText')),
        image(a('capSeasonal')),
        divider(),
        rich(
          { h2: a('sources') },
          { h3: a('dataSources') },
          { ul: [a('sourceRain'), a('sourceTemperature'), a('sourceWater'), a('sourceForecast')] },
          a('sourceNormal'),
          { h3: a('stations') },
        ),
        table([stations, ...[1, 2, 3].map(() => [a('station'), ...stations.slice(1).map(() => '')])]),
        rich({ h3: a('contacts') }, a('contactsText'), a('partners')),
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
