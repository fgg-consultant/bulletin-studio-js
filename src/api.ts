/** Client du store climweb. La page django hôte fournit les urls et le jeton CSRF
 *  par attributs data sur le point de montage. */
import type { Block } from './types'

const mount = document.getElementById('bulletin-studio-app')

const API = mount?.dataset.apiUrl ?? ''
const PRODUCT_PAGES = mount?.dataset.productPagesUrl ?? ''
const IMAGES = mount?.dataset.imagesUrl ?? ''
const CSRF = mount?.dataset.csrfToken ?? ''

export interface BulletinMeta {
  id: number
  title: string
  isTemplate: boolean
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
