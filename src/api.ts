/** Client du store climweb. La page django hôte fournit les urls et le jeton CSRF
 *  par attributs data sur le point de montage. */
import type { Block, Cadence, CitiesBlock, CityForecastRow, FlashShare, Kind } from './types'

const mount = document.getElementById('bulletin-studio-app')

const API = mount?.dataset.apiUrl ?? ''
const PRODUCT_PAGES = mount?.dataset.productPagesUrl ?? ''
const IMAGES = mount?.dataset.imagesUrl ?? ''
const MAP_CONFIG = mount?.dataset.mapConfigUrl ?? ''
// seulement sur un climweb météorologique (forecastmanager installé)
const FORECAST = mount?.dataset.forecastUrl ?? ''
const FORECAST_CITIES = mount?.dataset.forecastCitiesUrl ?? ''

/** le fuseau du site : celui du brouillon quotidien, pas forcément celui du navigateur */
export const siteTimeZone = mount?.dataset.timeZone ?? ''
/** l'identité de l'organisation (réglages climweb > Organisation), en tête du bulletin
 *  imprimé : logo, drapeau, et le texte que la barre de climweb met à côté */
export const letterhead = {
  logo: mount?.dataset.letterheadLogo ?? '',
  flag: mount?.dataset.letterheadFlag ?? '',
  text: mount?.dataset.letterheadText ?? '',
}
const CSRF = mount?.dataset.csrfToken ?? ''

export interface BulletinMeta {
  id: number
  title: string
  kind: Kind
  isTemplate: boolean
  /** le premier jour de la période du numéro (« Effective from » de climweb), ISO */
  date: string | null
  /** son dernier jour (« Effective until ») ; null pour un numéro d'un jour */
  validUntil: string | null
  /** d'un modèle : la période de ses numéros ; d'un numéro : celle de son modèle */
  cadence: Cadence
  /** un modèle seulement : le premier jour de chaque période à cette heure (HH:MM,
   *  heure du site), un brouillon de numéro est préparé ; null : jamais */
  draftAt: string | null
  /** pk de la ProductPage hôte : les parutions d'un modèle la partagent */
  parent: number
  parentTitle: string
  blockCount: number
  updatedAt: number | null
  live: boolean
  hasUnpublishedChanges: boolean
  /** url publique, seulement une fois publié */
  url: string | null
  /** un numéro : le modèle dont il est issu. null pour un modèle, pour une publication
   *  faite sans modèle, et pour le numéro d'un modèle supprimé depuis */
  template: { id: number; title: string } | null
  /** la dernière publication, ms */
  publishedAt: number | null
  /** un numéro préparé par le brouillon automatique : quand, ms ; null s'il a été fait
   *  à la main */
  preparedAt: number | null
  /** un modèle : le nombre de numéros qui en sont issus */
  issueCount: number
  /** un modèle dont les brouillons sont automatiques : le prochain, à l'heure du site
   *  (`at`, YYYY-MM-DDTHH:MM), et la période qu'il couvrira */
  nextDraft: { at: string; start: string; end: string } | null
}

/** le document tel que le studio le range : les blocs, et pour un flash le texte du
 *  post et l'image de sa dernière publication */
export interface StoredDoc {
  blocks?: Block[]
  caption?: string
  share?: FlashShare | null
}

export interface BulletinFull extends BulletinMeta {
  doc: StoredDoc
}

export interface ProductPage {
  id: number
  title: string
}

async function fail(res: Response): Promise<never> {
  const detail = await res.json().catch(() => null)
  throw new Error(detail?.error ?? `${res.status} ${res.statusText}`)
}

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': CSRF, ...init.headers },
  })
  if (!res.ok) await fail(res)
  return res.status === 204 ? (undefined as T) : res.json()
}

export interface BulletinPayload {
  title: string
  doc: StoredDoc & { blocks: Block[] }
  html: string
  isTemplate: boolean
  /** un modèle seulement ; absents, le serveur n'y touche pas */
  cadence?: Cadence
  draftAt?: string | null
  /** l'image que montre un lien partagé (l'og:image de climweb), de la bibliothèque */
  shareImage?: number | null
  /** une publication sans modèle seulement : son jour (« Effective from »). Celle d'un
   *  numéro suit la cadence de son modèle, le serveur la fixe */
  date?: string | null
  /** à la création uniquement : ensuite fixés */
  parent?: number
  kind?: Kind
}

export const listProductPages = () => call<ProductPage[]>(PRODUCT_PAGES)

export const list = () => call<BulletinMeta[]>(API)

export const read = (id: number) => call<BulletinFull>(`${API}${id}/`)

export const create = (payload: BulletinPayload) =>
  call<BulletinFull>(API, { method: 'POST', body: JSON.stringify(payload) })

export const update = (id: number, payload: BulletinPayload) =>
  call<BulletinFull>(`${API}${id}/`, { method: 'PUT', body: JSON.stringify(payload) })

/** un nouveau numéro du modèle, préparé par le serveur : celui de la période qui
 *  contient `date` (aujourd'hui pour le site, par défaut), ses cartes de prévision
 *  figées */
export const createIssue = (templateId: number, date?: string) =>
  call<BulletinFull>(`${API}${templateId}/issues/`, {
    method: 'POST',
    body: JSON.stringify(date ? { date } : {}),
  })

export const publish = (id: number) =>
  call<BulletinMeta>(`${API}${id}/publish/`, { method: 'POST' })

export const remove = (id: number) => call<void>(`${API}${id}/`, { method: 'DELETE' })

/** Une image de la bibliothèque climweb. `url` est une rendition, pas l'original :
 *  une photo de 4000 px n'a rien à faire dans une page publiée. */
export interface StoredImage {
  id: number
  title: string
  url: string
  width: number
  height: number
  thumb: string
  alt: string
}

export const listImages = (q = '') =>
  call<StoredImage[]>(IMAGES + (q ? `?q=${encodeURIComponent(q)}` : ''))

/** `flash` : la capture d'un flash, rangée à part de la bibliothèque (hors du choix
 *  d'images, comme les cartes de prévision) */
export async function uploadImage(file: File, purpose?: 'flash'): Promise<StoredImage> {
  const body = new FormData()
  body.append('title', file.name.replace(/\.[^.]+$/, ''))
  body.append('file', file)
  if (purpose) body.append('purpose', purpose)
  // pas de Content-Type ici : le navigateur doit poser lui-même la frontière multipart
  const res = await fetch(IMAGES, { method: 'POST', body, headers: { 'X-CSRFToken': CSRF } })
  if (!res.ok) await fail(res)
  return res.json()
}

/** Ce dont une carte a besoin et qui ne vient pas du bulletin : où geomanager sert
 *  son catalogue, les frontières administratives du site, le cadrage par défaut. */
export interface MapConfig {
  datasetsUrl: string | null
  boundaryTilesUrl: string | null
  bounds: number[] | null
}

export const mapConfig = () => call<MapConfig>(MAP_CONFIG)

export interface GeoLayer {
  id: string
  name: string
  dataset: string
  legendConfig?: { type?: string; items?: unknown[] } | null
  /** couche raster de geomanager : son TileJSON donne ses tuiles et ses dates */
  tileJsonUrl?: string
  /** couche WMS (toutes celles du Data Helper) : le gabarit GetMap de geomanager,
   *  `{bbox-epsg-3857}` et `{time}` compris, et de quoi lire ses dates (wms.ts) */
  wms?: { tiles: string; capabilities: string; layer: string }
}

interface RawLayer {
  id: string
  name: string
  layerType?: string
  tileJsonUrl?: string
  layerConfig?: { source?: { tiles?: string[] } }
  getCapabilitiesUrl?: string
  layerName?: string
  legendConfig?: GeoLayer['legendConfig']
}

/** geomanager rend ses urls absolues à partir du Site wagtail, dont l'hôte et le
 *  port sont souvent faux en dev. Tout vit sur la même origine : on ne garde que
 *  le chemin. */
export const samePath = (url: string) =>
  // URL() échappe les accolades ; les gabarits {z}/{x}/{y} doivent rester lisibles
  new URL(url, location.origin).pathname.replace(/%7B/gi, '{').replace(/%7D/gi, '}')

/** Les couches du catalogue geomanager qu'une carte sait dessiner, à plat : raster
 *  (tuiles de geomanager) et WMS (tuiles du service lui-même, url absolue : elles ne
 *  sont pas sur le site). Ni vecteur ni frontières. Le catalogue pèse près d'un Mo :
 *  lu une fois par session. */
let layersOnce: Promise<GeoLayer[]> | null = null
export function listLayers(datasetsUrl: string): Promise<GeoLayer[]> {
  layersOnce ??= call<{ name?: string; layers?: RawLayer[] }[]>(datasetsUrl).then((datasets) =>
    datasets.flatMap((d) =>
      (d.layers ?? []).flatMap((l): GeoLayer[] => {
        const base = { id: l.id, name: l.name, dataset: d.name ?? '', legendConfig: l.legendConfig }
        if (l.tileJsonUrl) return [{ ...base, tileJsonUrl: samePath(l.tileJsonUrl) }]
        const tiles = l.layerConfig?.source?.tiles?.[0]
        if (l.layerType === 'wms' && tiles && l.getCapabilitiesUrl && l.layerName)
          return [{ ...base, wms: { tiles, capabilities: l.getCapabilitiesUrl, layer: l.layerName } }]
        return []
      }),
    ),
  )
  layersOnce.catch(() => (layersOnce = null))
  return layersOnce
}

export interface TileJson {
  tiles: string[]
  timestamps?: string[]
}

export const tileJson = (url: string) => call<TileJson>(url)

/** sans forecastmanager, ni le bloc prévision ni le bloc villes n'existent */
export const hasForecast = Boolean(FORECAST)

/** Une carte de prévision telle que le serveur la garde : le dernier rendu du
 *  créneau, réécrit à chaque pull. `version` est le sha1 du PNG. */
export interface ForecastMap {
  date: string
  period: string
  preset: string
  url: string
  version: string
  renderedAt: number
}

export interface ForecastOptions {
  /** aujourd'hui pour le site, pas pour le navigateur */
  today: string
  daysAhead: number
  /** les créneaux que l'office publie comme prévision du jour */
  periods: { time: string; label: string }[]
  presets: string[]
  /** celles dessinées, de la date demandée à `daysAhead` jours plus tard */
  maps: ForecastMap[]
}

export const forecastMaps = (date?: string | null) =>
  call<ForecastOptions>(FORECAST + (date ? `?date=${encodeURIComponent(date)}` : ''))

/** La carte du moment, copiée dans la bibliothèque : l'image que le numéro fige. */
export interface PromotedForecast extends StoredImage {
  date: string
  period: string
  periodLabel: string
  preset: string
  version: string
}

export const promoteForecast = (date: string, period: string, preset: string) =>
  call<PromotedForecast>(FORECAST, { method: 'POST', body: JSON.stringify({ date, period, preset }) })

/** La prévision publiée d'un créneau, ville par ville : ce qu'un bloc villes fige. */
export interface CityTable {
  date: string
  period: string
  periodLabel: string
  units: NonNullable<CitiesBlock['units']>
  rows: CityForecastRow[]
  version: string
}

export interface CityForecasts {
  /** toutes les villes du site, pour le choix du bloc, par nom */
  cities: { slug: string; name: string }[]
  /** null tant que rien n'est publié pour ce créneau */
  table: CityTable | null
}

export const cityForecasts = (date: string, period: string) =>
  call<CityForecasts>(
    `${FORECAST_CITIES}?date=${encodeURIComponent(date)}&period=${encodeURIComponent(period)}`,
  )
