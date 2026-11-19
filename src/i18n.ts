/** i18n minimale : un catalogue par langue, `Intl.PluralRules` pour les pluriels,
 *  `Intl.DateTimeFormat` pour les dates. Pas de dépendance — les besoins tiennent
 *  en une interpolation `{clé}` et deux formes de pluriel.
 *
 *  La langue vient de climweb (`data-locale` posé par la page d'admin django, donc
 *  le LANGUAGE_CODE de la requête), sinon du navigateur, sinon l'anglais. */
import ar from './locales/ar'
import en from './locales/en'
import es from './locales/es'
import fr from './locales/fr'
import pt from './locales/pt'

type Msg = string | Record<string, string>
type Dict = { [k: string]: Msg | Dict }

// climweb sert aussi am et sw : faute de catalogue, ils retombent sur l'anglais.
const CATALOGS: Record<string, Dict> = { ar, en, es, fr, pt }

function resolve(): string {
  const raw =
    globalThis.document?.getElementById('bulletin-studio-app')?.dataset.locale ||
    globalThis.navigator?.language ||
    'en'
  const code = raw.split('-')[0].toLowerCase()
  return code in CATALOGS ? code : 'en'
}

export const locale = resolve()

const catalog = CATALOGS[locale]
// le catalogue portugais est européen : « pt » seul prend les règles du Brésil, où 0
// est singulier (« 0 boletim »)
const plural = new Intl.PluralRules(locale === 'pt' ? 'pt-PT' : locale)

function lookup(dict: Dict, path: string): Msg | Dict | undefined {
  return path.split('.').reduce<Msg | Dict | undefined>(
    (node, key) => (node && typeof node === 'object' ? (node as Dict)[key] : undefined),
    dict,
  )
}

export function t(key: string, params: Record<string, string | number> = {}): string {
  let msg = lookup(catalog, key) ?? lookup(en as unknown as Dict, key)
  if (msg && typeof msg === 'object') {
    const forms = msg as Record<string, string>
    msg = forms[plural.select(Number(params.count ?? 0))] ?? forms.other
  }
  if (typeof msg !== 'string') return key // clé inconnue : visible plutôt que muette
  return msg.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? ''))
}

const dateOnly = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' })
const monthYear = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' })

export const formatDate = (d: Date) => dateOnly.format(d)
/** une date ISO `YYYY-MM-DD`, lue à minuit local (`new Date(iso)` la lirait en UTC et
 *  afficherait la veille à l'ouest de Greenwich) ; null si elle est vide ou invalide */
function day(iso: string | null | undefined): Date | null {
  const d = new Date(`${iso}T00:00:00`)
  return iso && !isNaN(d.getTime()) ? d : null
}
/** « 5 octobre 2026 » ; '' si la date est vide ou invalide */
export function formatDay(iso: string | null | undefined): string {
  const d = day(iso)
  return d ? formatDate(d) : ''
}
/** « octobre 2026 » */
export function formatMonth(iso: string | null | undefined): string {
  const d = day(iso)
  return d ? monthYear.format(d) : ''
}
/** « 11–20 octobre 2026 » : la plage dans la tournure de la langue, qu'Intl connaît */
export function formatDayRange(from: string | null | undefined, to: string | null | undefined): string {
  const a = day(from)
  const b = day(to)
  return a && b ? dateOnly.formatRange(a, b) : formatDay(from)
}
export const formatDateTime = (d: Date | number) => dateTime.format(d)
export { addDays } from './periods'

const shortDay = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
const shortDayThisYear = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
const longDay = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const longDayThisYear = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' })
const clock = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })
const relativeDay = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

/** « 8 nov. 2026 » */
export function formatShortDay(iso: string | null | undefined): string {
  const d = day(iso)
  return d ? shortDay.format(d) : ''
}
/** « 1–10 nov. 2026 » */
export function formatShortRange(from: string | null | undefined, to: string | null | undefined): string {
  const a = day(from)
  const b = day(to)
  return a && b ? shortDay.formatRange(a, b) : formatShortDay(from)
}
/** « samedi 8 novembre 2026 » */
export function formatLongDay(iso: string | null | undefined): string {
  const d = day(iso)
  return d ? longDay.format(d) : ''
}

/** les jours de `from` à `to`, deux dates du calendrier local */
const daysBetween = (from: Date, to: Date) =>
  Math.round(
    (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
      Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) /
      86_400_000,
  )

/** le jour d'un instant, près d'aujourd'hui : « aujourd'hui », « hier », « 6 nov. »,
 *  « 6 nov. 2025 » — à l'heure du navigateur, comme toute heure qu'on lui montre */
export function formatRecentDay(when: number, now = Date.now()): string {
  const d = new Date(when)
  const n = new Date(now)
  const diff = daysBetween(n, d)
  if (Math.abs(diff) <= 1) return relativeDay.format(diff, 'day')
  return (d.getFullYear() === n.getFullYear() ? shortDayThisYear : shortDay).format(d)
}
/** le jour d'un instant, sans « hier » : « 1 nov. », « 1 nov. 2025 » — après « Publié
 *  le », où un jour relatif ne se dit pas dans toutes les langues */
export function formatDayOf(when: number, now = Date.now()): string {
  const d = new Date(when)
  return (d.getFullYear() === new Date(now).getFullYear() ? shortDayThisYear : shortDay).format(d)
}
/** « hier, 07:38 » */
export const formatWhen = (when: number, now = Date.now()) =>
  t('when.dayTime', { day: formatRecentDay(when, now), time: clock.format(when) })

/** « demain à 06:00 », « mercredi 11 novembre à 08:00 » : un jour ISO et une heure
 *  HH:MM du site, tels quels — l'heure d'un brouillon automatique */
export function formatDayAt(iso: string, hhmm: string, today: string): string {
  const d = day(iso)
  const n = day(today)
  if (!d || !n) return hhmm
  const diff = daysBetween(n, d)
  const label =
    Math.abs(diff) <= 1
      ? relativeDay.format(diff, 'day')
      : (d.getFullYear() === n.getFullYear() ? longDayThisYear : longDay).format(d)
  return t('when.dayAt', { day: label, time: hhmm })
}

/** une durée écoulée, dans l'unité qui la dit le mieux : « 20 minutes », « 4 heures »,
 *  « 7 jours » — les noms d'unités viennent d'Intl, pas du catalogue */
export function formatAge(since: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - since) / 60_000))
  const [value, unit] =
    minutes < 60 ? [minutes, 'minute'] : minutes < 48 * 60 ? [Math.floor(minutes / 60), 'hour'] : [Math.floor(minutes / 1440), 'day']
  return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'long' }).format(value)
}

// le libellé de dépôt d'une colonne vide vit dans un ::after : il passe par une
// custom property, seul moyen de traduire un `content` CSS
globalThis.document?.documentElement.style.setProperty('--bs-drop-label', JSON.stringify(t('canvas.dropHere')))
