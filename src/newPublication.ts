/** La fenêtre « Nouvelle publication », ouverte de partout : l'en-tête du studio, la
 *  ligne d'un modèle, la page d'un modèle, l'éditeur d'un modèle. Elle vit une fois,
 *  dans App.vue ; on l'ouvre ici, réglée ou non sur un modèle.
 *
 *  Et les périodes qu'elle propose pour un numéro : celle en cours, la suivante. */
import { reactive } from 'vue'
import { shortPeriod } from './catalog'
import { formatLongDay, t } from './i18n'
import { nextPeriod, periodNumber, periodOf, type Period } from './periods'
import type { Cadence, Kind } from './types'

export type Source = 'template' | 'blank'

export const newPublication = reactive({
  open: false,
  kind: 'bulletin' as Kind,
  source: 'template' as Source,
  /** le modèle choisi d'avance ; null : le premier de son type */
  templateId: null as number | null,
})

export function openNewPublication(preset: { kind?: Kind; source?: Source; templateId?: number | null } = {}) {
  newPublication.kind = preset.kind ?? 'bulletin'
  newPublication.source = preset.source ?? 'template'
  newPublication.templateId = preset.templateId ?? null
  newPublication.open = true
}

/** ce que couvrira un numéro de cette période : « N° 32 · 11–20 nov. 2026 » pour un
 *  bulletin, « mercredi 18 novembre 2026 » pour un flash */
export function periodLabel(kind: Kind, cadence: Cadence, p: Period): string {
  if (kind === 'flash') return formatLongDay(p.start)
  const period = shortPeriod({ date: p.start, validUntil: p.end, cadence })
  return t('issue.crumb', { number: periodNumber(cadence, p.start), period })
}

export interface PeriodChoice {
  key: 'current' | 'next'
  /** le jour à envoyer au serveur, qui en déduit la période : son premier */
  date: string
  label: string
}

/** la période en cours et la suivante ; « aujourd'hui » et « demain » pour un numéro
 *  d'un jour */
export function periodChoices(kind: Kind, cadence: Cadence, today: string): PeriodChoice[] {
  // un flash couvre un jour, quelle que soit la cadence enregistrée de son modèle
  const c: Cadence = kind === 'flash' ? 'daily' : cadence
  const current = periodOf(c, today)
  const next = nextPeriod(c, current)
  const single = c === 'daily'
  return [
    { key: 'current', date: current.start, label: t(single ? 'newPublication.today' : 'newPublication.current', { label: periodLabel(kind, c, current) }) },
    { key: 'next', date: next.start, label: t(single ? 'newPublication.tomorrow' : 'newPublication.next', { label: periodLabel(kind, c, next) }) },
  ]
}
