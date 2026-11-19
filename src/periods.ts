/** La période que couvre un numéro, d'après la cadence de son modèle : un jour, une
 *  décade (1–10, 11–20, 21–fin du mois) ou un mois. Le pendant de `periods.py` du
 *  paquet django : le serveur fixe la période d'un numéro, le studio la calcule pour
 *  proposer celles à venir et numéroter celles qui existent.
 *
 *  Pur : des dates ISO `YYYY-MM-DD` en entrée et en sortie, lues en UTC — jamais
 *  l'heure ni le fuseau du navigateur. */
import type { Cadence } from './types'

export interface Period {
  /** le premier jour, ISO */
  start: string
  /** le dernier ; = start pour un jour */
  end: string
}

const parts = (iso: string) => iso.split('-').map(Number) as [number, number, number]
const iso = (d: Date) => d.toISOString().slice(0, 10)

/** `n` jours après une date ISO, en ISO */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return iso(d)
}

/** le dernier jour du mois d'une date ISO */
function lastOfMonth(day: string): string {
  const [y, m] = parts(day)
  return iso(new Date(Date.UTC(y, m, 0)))
}

/** la période de `cadence` qui contient `day` ; le jour même pour une cadence inconnue */
export function periodOf(cadence: Cadence, day: string): Period {
  const month = day.slice(0, 8)
  if (cadence === 'monthly') return { start: `${month}01`, end: lastOfMonth(day) }
  if (cadence === 'dekadal') {
    const first = Math.min(Math.floor((parts(day)[2] - 1) / 10), 2) * 10 + 1
    const start = `${month}${String(first).padStart(2, '0')}`
    return { start, end: first < 21 ? addDays(start, 9) : lastOfMonth(day) }
  }
  return { start: day, end: day }
}

/** la période qui suit, de même cadence */
export const nextPeriod = (cadence: Cadence, p: Period): Period => periodOf(cadence, addDays(p.end, 1))

/** celle d'avant : la décade écoulée dont un bulletin agrométéorologique fait le bilan
 *  avant les perspectives de la sienne */
export const previousPeriod = (cadence: Cadence, p: Period): Period =>
  periodOf(cadence, addDays(p.start, -1))

/** le rang de la période dans son année : décade 1–36, mois 1–12, jour 1–366 — le
 *  numéro que portent les bulletins (« N° 28 ») */
export function periodNumber(cadence: Cadence, start: string): number {
  const [y, m, d] = parts(start)
  if (cadence === 'monthly') return m
  if (cadence === 'dekadal') return (m - 1) * 3 + (d <= 10 ? 1 : d <= 20 ? 2 : 3)
  return (Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86_400_000 + 1
}
