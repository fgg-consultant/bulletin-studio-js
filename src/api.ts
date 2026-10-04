/** Client du store climweb. La page django hôte fournit les urls et le jeton CSRF
 *  par attributs data sur le point de montage. */
import type { Block } from './types'

const mount = document.getElementById('bulletin-studio-app')

const API = mount?.dataset.apiUrl ?? ''
const PRODUCT_PAGES = mount?.dataset.productPagesUrl ?? ''
const IMAGES = mount?.dataset.imagesUrl ?? ''
const MAP_CONFIG = mount?.dataset.mapConfigUrl ?? ''
// seulement sur un climweb météorologique (forecastmanager installé)
const FORECAST = mount?.dataset.forecastUrl ?? ''
const CSRF = mount?.dataset.csrfToken ?? ''

export interface BulletinMeta {
  id: number
  title: string
  isTemplate: boolean
  /** la date du numéro (« Effective from » de climweb), ISO YYYY-MM-DD */
  date: string | null
  /** pk de la ProductPage hôte : les parutions d'un modèle la partagent */
  parent: number
  parentTitle: string
  blockCount: number
  updatedAt: number | null
  live: boolean
  hasUnpublishedChanges: boolean
  /** url publique, seulement une fois publié */
  url: string | null
}

export interface BulletinFull extends BulletinMeta {
  doc: { blocks?: Block[] }
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
  doc: { blocks: Block[] }
  html: string
  isTemplate: boolean
  /** requis à la création uniquement */
  parent?: number
}

export const listProductPages = () => call<ProductPage[]>(PRODUCT_PAGES)

export const list = () => call<BulletinMeta[]>(API)

export const read = (id: number) => call<BulletinFull>(`${API}${id}/`)

export const create = (payload: BulletinPayload) =>
  call<BulletinFull>(API, { method: 'POST', body: JSON.stringify(payload) })

export const update = (id: number, payload: BulletinPayload) =>
  call<BulletinFull>(`${API}${id}/`, { method: 'PUT', body: JSON.stringify(payload) })

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

export async function uploadImage(file: File): Promise<StoredImage> {
  const body = new FormData()
  body.append('title', file.name.replace(/\.[^.]+$/, ''))
  body.append('file', file)
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
  tileJsonUrl: string
  legendConfig?: unknown
}

/** geomanager rend ses urls absolues à partir du Site wagtail, dont l'hôte et le
 *  port sont souvent faux en dev. Tout vit sur la même origine : on ne garde que
 *  le chemin. */
export const samePath = (url: string) =>
  // URL() échappe les accolades ; les gabarits {z}/{x}/{y} doivent rester lisibles
  new URL(url, location.origin).pathname.replace(/%7B/gi, '{').replace(/%7D/gi, '}')

/** Les couches raster du catalogue geomanager, à plat. */
export async function listLayers(datasetsUrl: string): Promise<GeoLayer[]> {
  const datasets = await call<{ name?: string; layers?: GeoLayer[] }[]>(datasetsUrl)
  return datasets.flatMap((d) =>
    (d.layers ?? [])
      .filter((l) => l.tileJsonUrl)
      .map((l) => ({ ...l, dataset: d.name ?? '', tileJsonUrl: samePath(l.tileJsonUrl) })),
  )
}

export interface TileJson {
  tiles: string[]
  timestamps?: string[]
}

export const tileJson = (url: string) => call<TileJson>(url)

/** sans forecastmanager, le bloc prévision n'existe pas */
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
