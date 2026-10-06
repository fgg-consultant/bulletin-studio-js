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
    document.getElementById('bulletin-studio-app')?.dataset.locale || navigator.language || 'en'
  const code = raw.split('-')[0].toLowerCase()
  return code in CATALOGS ? code : 'en'
}

export const locale = resolve()

const catalog = CATALOGS[locale]
const plural = new Intl.PluralRules(locale)

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
/** `n` jours après une date ISO, en ISO */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// le libellé de dépôt d'une colonne vide vit dans un ::after : il passe par une
// custom property, seul moyen de traduire un `content` CSS
document.documentElement.style.setProperty('--bs-drop-label', JSON.stringify(t('canvas.dropHere')))
