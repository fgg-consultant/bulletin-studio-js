/** Les couches WMS du catalogue geomanager : leurs dates et leur légende, lues dans les
 *  capabilities du service.
 *
 *  geomanager ne les donne pas : il sert pour chaque couche un gabarit GetMap
 *  (`{bbox-epsg-3857}`, que maplibre remplit, et `{time}`), le nom de la couche et l'url
 *  des capabilities, que sa propre carte lit dans le navigateur. On fait de même — les
 *  services du Data Helper (eStation, ECMWF, EUMETSAT, EFAS, GloFAS) répondent tous
 *  avec les en-têtes CORS. Un document de capabilities pèse quelques centaines de ko et
 *  sert à toutes les couches du service : une requête par service et par session. */

/** les dates proposées à l'auteur : les plus récentes */
const MAX_TIMES = 60

export interface WmsLayerInfo {
  /** triées, de la plus ancienne à la plus récente, telles que le service les attend */
  times: string[]
  /** la date que le service sert par défaut si elle est parmi elles, sinon la plus
   *  récente qui ne soit pas dans le futur */
  current: string | null
  legendUrl: string | null
}

const cache = new Map<string, Promise<Document>>()

function capabilities(url: string): Promise<Document> {
  let doc = cache.get(url)
  if (!doc) {
    doc = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        return res.text()
      })
      .then((xml) => {
        const parsed = new DOMParser().parseFromString(xml, 'text/xml')
        if (parsed.getElementsByTagName('parsererror').length) throw new Error('invalid capabilities')
        return parsed
      })
    doc.catch(() => cache.delete(url))
    cache.set(url, doc)
  }
  return doc
}

const children = (el: Element, name: string) => [...el.children].filter((c) => c.localName === name)
const childText = (el: Element, name: string) => children(el, name)[0]?.textContent?.trim() ?? ''

/** La couche `name` du service, null s'il ne la publie pas (ou plus). */
export async function layerInfo(capabilitiesUrl: string, name: string): Promise<WmsLayerInfo | null> {
  const doc = await capabilities(capabilitiesUrl)
  const layer = [...doc.getElementsByTagName('Layer')].find((l) => childText(l, 'Name') === name)
  if (!layer) return null

  // la dimension temps s'hérite d'une couche parente (WMS 1.3.0 §7.2.4.8) ; 1.1.1 la
  // met dans <Extent>
  let dim: Element | undefined
  for (let el: Element | null = layer; el?.localName === 'Layer' && !dim; el = el.parentElement) {
    dim = [...children(el, 'Dimension'), ...children(el, 'Extent')].find(
      (d) => d.getAttribute('name')?.toLowerCase() === 'time' && d.textContent?.trim(),
    )
  }
  const times = dim ? parseTimes(dim.textContent!) : []

  const legend = children(layer, 'Style')
    .flatMap((s) => children(s, 'LegendURL'))
    .flatMap((l) => children(l, 'OnlineResource'))[0]

  return {
    times,
    current: pickCurrent(times, dim?.getAttribute('default') ?? null),
    legendUrl:
      legend?.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ?? legend?.getAttribute('xlink:href') ?? null,
  }
}

/** Une date des capabilities : ISO 8601, avec ou sans fuseau (UTC alors, comme le veut
 *  WMS), ou compacte (`20261021`, eStation). */
function parse(text: string): Date | null {
  let s = text.trim()
  if (/^\d{8}$/.test(s)) s = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += 'T00:00:00Z'
  else if (/T[\d:.]+$/.test(s)) s += 'Z'
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

/** Une date calculée, écrite comme le service écrit les siennes : précision, fuseau. */
function formatLike(sample: string, d: Date): string {
  const iso = d.toISOString() // 2026-10-21T00:00:00.000Z
  const s = sample.trim()
  if (!s.includes('T')) return iso.slice(0, 10)
  const time = s.split('T')[1]
  const end = time.includes('.') ? 23 : time.split(':').length === 2 ? 16 : 19
  return iso.slice(0, end) + (/(Z|[+-]\d\d:?\d\d)$/.test(time) ? 'Z' : '')
}

const DURATION = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/

/** Les valeurs d'une dimension : une liste, des intervalles `début/fin/pas`, ou les deux
 *  mêlés (WMS 1.3.0, annexe C). Un intervalle compte ses pas depuis son début ; on n'en
 *  garde que les derniers. */
export function parseTimes(text: string): string[] {
  const values = new Map<number, string>()
  const add = (d: Date, sample: string) => values.set(d.getTime(), formatLike(sample, d))
  for (const item of text.split(',')) {
    const [a, b, step] = item.trim().split('/')
    if (!b) {
      const d = parse(a)
      if (d) values.set(d.getTime(), a.trim())
      continue
    }
    const start = parse(a)
    const end = parse(b)
    if (!start || !end) continue
    const m = DURATION.exec(step?.trim() ?? '')
    const [years, months, weeks, days, hours, minutes, seconds] = (m?.slice(1) ?? []).map((n) => Number(n ?? 0))
    const ms = ((((weeks * 7 + days) * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000
    const calendar = years * 12 + months
    // Sans pas lisible, la fin seule, que le service sert à coup sûr. Des bornes sans
    // heure et un pas de moins d'un jour ne disent rien des dates réelles non plus :
    // eStation déclare `19810101/20261021/PT5M` pour des décades.
    if (!m || (!calendar && !ms) || (!a.includes('T') && !b.includes('T') && !calendar && ms < 86_400_000)) {
      add(end, b)
      continue
    }
    if (calendar) {
      const steps: Date[] = []
      for (let k = 0; k < 100_000; k++) {
        const d = new Date(start)
        d.setUTCMonth(d.getUTCMonth() + calendar * k)
        d.setTime(d.getTime() + ms * k)
        if (d > end) break
        steps.push(d)
      }
      steps.slice(-MAX_TIMES).forEach((d) => add(d, b))
    } else {
      const last = Math.floor((end.getTime() - start.getTime()) / ms)
      for (let k = Math.max(0, last - MAX_TIMES + 1); k <= last; k++) add(new Date(start.getTime() + k * ms), b)
    }
  }
  return [...values.entries()]
    .sort(([x], [y]) => x - y)
    .slice(-MAX_TIMES)
    .map(([, v]) => v)
}

function pickCurrent(times: string[], fallback: string | null): string | null {
  if (!times.length) return null
  const def = fallback ? parse(fallback)?.getTime() : undefined
  const found = def === undefined ? undefined : times.find((v) => parse(v)?.getTime() === def)
  if (found) return found
  const now = Date.now()
  return [...times].reverse().find((v) => (parse(v)?.getTime() ?? Infinity) <= now) ?? times.at(-1)!
}

/** [ouest, sud, est, nord] en degrés : la BBOX d'un GetMap en EPSG:3857, ce que
 *  maplibre met à la place de {bbox-epsg-3857} */
export function bbox3857([w, s, e, n]: number[]): string {
  const R = 6378137
  const x = (lon: number) => (R * lon * Math.PI) / 180
  const y = (lat: number) =>
    R * Math.log(Math.tan(Math.PI / 4 + (Math.max(-85.05113, Math.min(85.05113, lat)) * Math.PI) / 360))
  return [x(w), y(s), x(e), y(n)].join(',')
}

/** L'image du service est-elle vide, entièrement transparente ? Une couche sans donnée
 *  ici à cette date (la pluie en saison sèche, une couche qui ne couvre que l'Europe)
 *  ne se distingue pas autrement d'une carte qui ne charge pas. null : on ne sait pas. */
export async function isBlank(url: string): Promise<boolean | null> {
  try {
    const res = await fetch(url)
    if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) return null
    const img = await createImageBitmap(await res.blob())
    const g = new OffscreenCanvas(img.width, img.height).getContext('2d')!
    g.drawImage(img, 0, 0)
    const px = g.getImageData(0, 0, img.width, img.height).data
    for (let i = 3; i < px.length; i += 4) if (px[i]) return false
    return true
  } catch {
    return null
  }
}

/** Le libellé d'une date de couche : le jour, et l'heure (UTC) quand il y en a une. */
export function timeLabel(value: string, locale: string): string {
  const d = parse(value)
  if (!d) return value
  const midnight = d.getUTCHours() === 0 && d.getUTCMinutes() === 0
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(midnight ? {} : { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }),
  }).format(d)
}
