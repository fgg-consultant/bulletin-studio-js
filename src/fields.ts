/** Les dates insérées dans l'en-tête : `{start}`, `{end}`, `{period}`, `{published}`.
 *
 *  Un modèle les pose ; chaque numéro les remplit avec la période qu'il couvre, au
 *  moment d'afficher et de rendre le html — le document garde les champs, pas les
 *  dates. Corriger la période d'un numéro les met donc à jour, comme le bloc « date du
 *  bulletin ». Les dates sont dans la langue de l'admin, comme le reste du studio. */
import { siteTimeZone } from './api'
import { formatDay, formatDayRange, formatMonth, t } from './i18n'
import type { Cadence } from './types'

export const FIELDS = ['start', 'end', 'period', 'published'] as const
export type Field = (typeof FIELDS)[number]

const PATTERN = /\{(start|end|period|published)\}/g

/** la période d'un numéro, et le jour où il paraît */
export interface IssueDates {
  /** ISO YYYY-MM-DD */
  start: string
  /** le dernier jour ; = start pour un numéro d'un jour */
  end: string
  cadence: Cadence
  /** aujourd'hui pour le site : le html est rendu à chaque publication */
  published: string
}

/** le jour du site, ISO — pas celui du navigateur */
export function siteToday(): string {
  try {
    // en-CA écrit les dates en ISO
    return new Intl.DateTimeFormat('en-CA', { timeZone: siteTimeZone || undefined }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10) // fuseau inconnu du navigateur
  }
}

function value(field: Field, d: IssueDates): string {
  switch (field) {
    case 'start':
      return formatDay(d.start)
    case 'end':
      return formatDay(d.end)
    case 'published':
      return formatDay(d.published)
    case 'period':
      if (d.end === d.start) return formatDay(d.start)
      return d.cadence === 'monthly' ? formatMonth(d.start) : formatDayRange(d.start, d.end)
  }
}

export const hasFields = (text: string) => new RegExp(PATTERN.source).test(text)

/** le texte, ses champs remplacés par les dates du numéro */
export const fillFields = (text: string, dates: IssueDates) =>
  text.replace(PATTERN, (_, f: Field) => value(f, dates))

/** le texte en morceaux, pour montrer les champs d'un modèle comme des étiquettes */
export function splitFields(text: string): (string | { field: Field })[] {
  const parts: (string | { field: Field })[] = []
  let last = 0
  for (const m of text.matchAll(PATTERN)) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push({ field: m[1] as Field })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export const fieldLabel = (f: Field) => t(`fields.${f}`)

/** les champs tels quels, pour un message du catalogue qui en contient (`t()`
 *  remplacerait sinon `{start}` par rien) */
export const AS_FIELDS = Object.fromEntries(FIELDS.map((f) => [f, `{${f}}`]))

/** les badges d'un nouvel en-tête : validité et date de publication */
export const defaultBadges = (uid: () => string) => [
  { id: uid(), text: t('defaults.badgeValid', AS_FIELDS) },
  { id: uid(), text: t('defaults.badgePublished', AS_FIELDS) },
]
