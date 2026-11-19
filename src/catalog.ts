/** Ce que les pages du studio lisent dans la liste des bulletins : les modèles et leurs
 *  numéros, ce qui attend d'être publié, les filtres de la page Bulletins, et les
 *  libellés qui disent de quoi il s'agit (« N° 31 · 1–10 nov. 2026 »).
 *
 *  Pur : une liste de `BulletinMeta` en entrée, des valeurs en sortie, sans état ni
 *  appel au serveur — `library.ts` tient la liste, les pages la dérivent d'ici. */
import type { BulletinMeta } from './api'
import { formatLongDay, formatMonth, formatShortDay, formatShortRange, t } from './i18n'
import { periodNumber } from './periods'
import type { Kind } from './types'

/** une publication : en brouillon, en ligne avec des modifications à publier, en ligne */
export type Status = 'draft' | 'pending' | 'live'

/** ce qu'il faut savoir d'une publication pour la nommer : une ligne de la liste, ou le
 *  document ouvert dans l'éditeur */
export type Labelled = Pick<BulletinMeta, 'title' | 'kind' | 'isTemplate' | 'template' | 'date' | 'validUntil' | 'cadence'>

export const statusOf = (b: Pick<BulletinMeta, 'live' | 'hasUnpublishedChanges'>): Status =>
  !b.live ? 'draft' : b.hasUnpublishedChanges ? 'pending' : 'live'

export const templatesOf = (items: BulletinMeta[]) => items.filter((b) => b.isTemplate)
export const publicationsOf = (items: BulletinMeta[]) => items.filter((b) => !b.isTemplate)

/** du plus récent au plus ancien selon `key`, les valeurs absentes à la fin */
const newest =
  <K extends 'updatedAt' | 'publishedAt' | 'preparedAt'>(key: K) =>
  (a: BulletinMeta, b: BulletinMeta) =>
    (b[key] ?? 0) - (a[key] ?? 0)

/** les numéros d'un modèle, la période la plus récente d'abord */
export function issuesOf(items: BulletinMeta[], templateId: number): BulletinMeta[] {
  return items
    .filter((b) => !b.isTemplate && b.template?.id === templateId)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || newest('updatedAt')(a, b))
}

/** les brouillons préparés automatiquement, pas encore publiés : ce que l'office doit
 *  relire, le plus récent d'abord */
export const notifications = (items: BulletinMeta[]) =>
  publicationsOf(items)
    .filter((b) => !b.live && b.preparedAt !== null)
    .sort(newest('preparedAt'))

/** le reste de ce qui attend : les brouillons faits à la main, et les publications en
 *  ligne dont des modifications ne le sont pas encore */
export const toPublish = (items: BulletinMeta[]) =>
  publicationsOf(items)
    .filter((b) => (!b.live && b.preparedAt === null) || statusOf(b) === 'pending')
    .sort(newest('updatedAt'))

/** les dernières publications en ligne */
export const recent = (items: BulletinMeta[], count = 5) =>
  publicationsOf(items)
    .filter((b) => b.live)
    .sort(newest('publishedAt'))
    .slice(0, count)

/** le prochain brouillon automatique, tous modèles confondus */
export function nextAutoDraft(items: BulletinMeta[]) {
  let next: { template: BulletinMeta; at: string; start: string; end: string } | null = null
  for (const tpl of templatesOf(items))
    if (tpl.nextDraft && (!next || tpl.nextDraft.at < next.at)) next = { template: tpl, ...tpl.nextDraft }
  return next
}

/** les chiffres des cartes de l'accueil */
export function counts(items: BulletinMeta[]) {
  const byKind = (list: BulletinMeta[], kind: Kind) => list.filter((b) => b.kind === kind).length
  const templates = templatesOf(items)
  const publications = publicationsOf(items)
  return {
    templates: { total: templates.length, bulletin: byKind(templates, 'bulletin'), flash: byKind(templates, 'flash') },
    publications: {
      total: publications.length,
      bulletin: byKind(publications, 'bulletin'),
      flash: byKind(publications, 'flash'),
      drafts: publications.filter((b) => !b.live).length,
    },
  }
}

// ---- la page Bulletins : filtres et pages ----

export interface Filters {
  /** dans le titre, sans tenir compte des accents ni de la casse */
  q: string
  kind: 'all' | Kind
  /** « publiés » comprend ceux dont des modifications attendent */
  status: 'all' | 'draft' | 'live'
  /** l'id d'un modèle, `none` : sans modèle */
  template: 'all' | 'none' | number
  /** à partir de 1 */
  page: number
}

const pick = <T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback

/** les filtres d'après l'adresse ; ce qui ne se lit pas reprend sa valeur par défaut */
export function readFilters(query: Record<string, string>): Filters {
  const template = query.template === 'none' ? 'none' : /^\d+$/.test(query.template ?? '') ? Number(query.template) : 'all'
  const page = Number(query.page)
  return {
    q: query.q ?? '',
    kind: pick(query.kind, ['all', 'bulletin', 'flash'] as const, 'all'),
    status: pick(query.status, ['all', 'draft', 'live'] as const, 'all'),
    template,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

/** et l'inverse : l'adresse ne garde que ce qui s'écarte du défaut */
export function writeFilters(f: Filters): Record<string, string> {
  return {
    q: f.q.trim(),
    kind: f.kind === 'all' ? '' : f.kind,
    status: f.status === 'all' ? '' : f.status,
    template: f.template === 'all' ? '' : String(f.template),
    page: f.page > 1 ? String(f.page) : '',
  }
}

/** « Météo » se trouve en tapant « meteo » */
const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export function filterPublications(items: BulletinMeta[], f: Filters): BulletinMeta[] {
  const q = fold(f.q.trim())
  return publicationsOf(items)
    .filter(
      (b) =>
        (f.kind === 'all' || b.kind === f.kind) &&
        (f.status === 'all' || (f.status === 'draft') === !b.live) &&
        (f.template === 'all' || (f.template === 'none' ? b.template === null : b.template?.id === f.template)) &&
        (!q || fold(b.title).includes(q)),
    )
    .sort(newest('updatedAt'))
}

/** une page de `size` éléments ; `page` ramené dans les bornes */
export function pageOf<T>(list: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(list.length / size))
  const current = Math.min(Math.max(1, page), pages)
  const from = (current - 1) * size
  return { items: list.slice(from, from + size), page: current, pages, from: from + 1, to: from + Math.min(size, list.length - from) }
}

// ---- libellés ----

/** la période d'un numéro, courte : « 1–10 nov. 2026 », « nov. 2026 » s'il couvre un
 *  mois, « 8 nov. 2026 » s'il couvre un jour */
export function shortPeriod(b: Pick<BulletinMeta, 'date' | 'validUntil' | 'cadence'>): string {
  if (!b.date) return ''
  if (!b.validUntil || b.validUntil === b.date) return formatShortDay(b.date)
  return b.cadence === 'monthly' ? formatMonth(b.date) : formatShortRange(b.date, b.validUntil)
}

/** la même, en toutes lettres, pour l'éditeur : « samedi 8 novembre 2026 »,
 *  « Décade : 1–10 novembre 2026 », « Mois : novembre 2026 » */
export function longPeriod(b: Pick<BulletinMeta, 'date' | 'validUntil' | 'cadence'>): string {
  if (!b.date) return ''
  if (!b.validUntil || b.validUntil === b.date) return formatLongDay(b.date)
  if (b.cadence === 'monthly') return t('period.month', { period: formatMonth(b.date) })
  return t('period.dekad', { period: formatShortRange(b.date, b.validUntil) })
}

/** le rang du numéro dans l'année, celui d'un bulletin (« N° 31 ») ; null pour un flash
 *  ou une publication sans modèle */
export function issueNumber(b: Labelled): number | null {
  return b.kind === 'bulletin' && b.template && b.date ? periodNumber(b.cadence, b.date) : null
}

/** le numéro d'un modèle, d'après sa période : « N° 31 · 1–10 nov. 2026 » pour un
 *  bulletin, « Flash du 8 nov. 2026 » ; null pour une publication sans modèle */
function issueText(b: Labelled): string | null {
  if (!b.template || !b.date) return null
  if (b.kind === 'flash') return t('issue.flashOf', { date: formatShortDay(b.date) })
  return t('issue.crumb', { number: periodNumber(b.cadence, b.date), period: shortPeriod(b) })
}

/** ce qu'est une publication, en deux lignes : le modèle, puis le numéro et sa
 *  période ; une publication sans modèle se nomme par son titre */
export function describe(b: Labelled): { name: string; detail: string } {
  if (b.template) return { name: b.template.title, detail: issueText(b) ?? b.title }
  return {
    name: b.title,
    detail: t(b.kind === 'flash' ? 'issue.standaloneFlash' : 'issue.standalone', { date: formatShortDay(b.date) }),
  }
}

/** le dernier maillon du fil d'Ariane de l'éditeur */
export function crumb(b: Labelled): string {
  if (b.isTemplate) return t('editor.editTemplate')
  return issueText(b) ?? b.title
}

/** quand un modèle prépare ses brouillons : « chaque jour à 06:00 », « le 1er, le 11
 *  et le 21 à 08:00 » ; null s'il n'en prépare pas */
export function schedule(tpl: Pick<BulletinMeta, 'kind' | 'cadence' | 'draftAt'>): string | null {
  if (tpl.kind === 'flash' || !tpl.draftAt) return null
  return t(`schedule.${tpl.cadence}`, { time: tpl.draftAt })
}
