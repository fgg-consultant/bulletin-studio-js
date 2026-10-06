/** La grille des prévisions par ville : une ligne par ville, son icône, ses
 *  températures max/min et son vent. Le même HTML sert la page publiée (render.ts)
 *  et l'aperçu de l'éditeur (CitiesBlock.vue) — du texte, là où la carte de
 *  prévision est une image.
 *
 *  Les valeurs sont celles de l'office, telles que forecastmanager les garde :
 *  arrondies pour l'affichage, jamais recalculées. Une colonne qu'aucune ville ne
 *  renseigne disparaît (un office qui ne publie pas le vent n'a pas de colonne vent).
 *  La flèche du vent passe par un `style` inline : seul moyen de l'orienter dans un
 *  HTML assaini, sans svg ni script. */
import { esc } from './esc'
import { formatDay, locale, t } from './i18n'
import type { CitiesBlock, CityForecastRow } from './types'

const POINTS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const

/** le point cardinal d'où vient le vent, sur une rose à huit directions */
export const compass = (deg: number) =>
  t(`cities.compass.${POINTS[Math.round((((deg % 360) + 360) % 360) / 45) % 8]}`)

const whole = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
const tenth = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
// arrondie avant, et + 0 : -0,3 °C s'écrit 0, pas -0
const temp = (v: number | null) => (v === null ? '—' : whole.format(Math.round(v) + 0))

/** les lignes montrées : les villes choisies, dans l'ordre choisi ; toutes sinon */
export function shownRows(b: Pick<CitiesBlock, 'rows' | 'cities'>): CityForecastRow[] {
  const rows = b.rows ?? []
  if (!b.cities) return rows
  const bySlug = new Map(rows.map((r) => [r.slug, r]))
  return b.cities.flatMap((slug) => bySlug.get(slug) ?? [])
}

/** colonne après colonne, dans l'ordre de lecture : les premières villes remplissent
 *  la première. Une table par colonne : sur un téléphone, elles s'empilent. */
function split<T>(items: T[], n: number): T[][] {
  const per = Math.ceil(items.length / Math.max(1, n)) || 1
  return Array.from({ length: Math.ceil(items.length / per) }, (_, i) => items.slice(i * per, (i + 1) * per))
}

export function citiesHtml(b: CitiesBlock): string {
  const rows = shownRows(b)
  if (!rows.length) return ''
  const any = (f: (r: CityForecastRow) => unknown) => rows.some((r) => f(r) != null)
  const show = {
    icon: any((r) => r.icon),
    minmax: any((r) => r.tmax ?? r.tmin),
    temp: any((r) => r.temp),
    wind: any((r) => r.wind ?? r.windDir),
  }
  const tUnit = esc(b.units?.temperature ?? '')
  const wUnit = b.units?.wind ?? ''

  const row = (r: CityForecastRow) => {
    const cells = [`<td class="bs-city-name">${esc(r.name)}</td>`]
    if (show.icon) {
      const img = r.icon ? `<img src="${esc(r.icon)}" alt="${esc(r.condition)}">` : ''
      cells.push(`<td class="bs-city-icon">${img}</td>`)
    }
    if (show.minmax || show.temp) {
      const values = show.minmax
        ? `<span class="bs-tmax">${temp(r.tmax)}</span><span class="bs-tmin">${temp(r.tmin)}</span>`
        : `<span class="bs-temp">${temp(r.temp)}</span>`
      cells.push(`<td class="bs-city-temp"><span class="bs-temps">${values}</span><span class="bs-unit">${tUnit}</span></td>`)
    }
    if (show.wind) {
      // la flèche montre où va le vent : à l'opposé de sa provenance
      const arrow = r.windDir === null ? '' :
        `<span class="bs-wind"><span class="bs-wind-arrow" style="transform:rotate(${Math.round(r.windDir + 180) % 360}deg)"></span></span>`
      const text = [
        r.windDir === null ? '' : `<span>${esc(compass(r.windDir))}</span>`,
        r.wind === null ? '' : `<span class="bs-speed">${esc(`${tenth.format(r.wind)} ${wUnit}`)}</span>`,
      ].join('')
      cells.push(`<td class="bs-city-arrow">${arrow}</td><td class="bs-city-wind">${text}</td>`)
    }
    return `<tr>${cells.join('')}</tr>`
  }

  const tables = split(rows, b.columns)
    .map((col) => `<table class="bs-cities-table"><tbody>${col.map(row).join('')}</tbody></table>`)
    .join('')
  const key = show.minmax
    ? ` · <span class="bs-tmax">${esc(t('cities.max'))}</span> / <span class="bs-tmin">${esc(t('cities.min'))}</span>`
    : ''
  const meta = esc(t('cities.forecastFor', { date: formatDay(b.date), period: b.periodLabel }))
  return `<div class="bs-cities"><div class="bs-cities-grid">${tables}</div><p class="bs-cities-meta">${meta}${key}</p></div>`
}
