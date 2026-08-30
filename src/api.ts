/** Client du store climweb. La page django hôte fournit les urls et le jeton CSRF
 *  par attributs data sur le point de montage. */
import type { Block } from './types'

const mount = document.getElementById('bulletin-studio-app')

const API = mount?.dataset.apiUrl ?? ''
const PRODUCT_PAGES = mount?.dataset.productPagesUrl ?? ''
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

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': CSRF, ...init.headers },
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.error ?? `${res.status} ${res.statusText}`)
  }
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
