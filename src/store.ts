import { nextTick, reactive, watch } from 'vue'
import * as api from './api'
import { renderHtml } from './render'
import type { Block } from './types'

export const uid = () => crypto.randomUUID()

export interface BulletinDoc {
  /** null quand aucun bulletin n'est chargé (dashboard) */
  id: number | null
  title: string
  blocks: Block[]
  /** un modèle est un simple point de départ : jamais publié, jamais public */
  isTemplate: boolean
  /** la ProductPage hôte — les parutions d'un modèle la partagent */
  parent: number | null
  live: boolean
  hasUnpublishedChanges: boolean
  url: string | null
}

export const doc = reactive<BulletinDoc>({
  id: null, title: '', blocks: [], isTemplate: false,
  parent: null, live: false, hasUnpublishedChanges: false, url: null,
})

export const ui = reactive({
  selectedId: null as string | null,
  hoverId: null as string | null,
  device: 'desktop' as 'desktop' | 'pdf' | 'mobile',
  saved: true,
  error: null as string | null,
})

/** le document + le html publiable, rendu au moment d'enregistrer */
function payload(): api.BulletinPayload {
  return {
    title: doc.title,
    doc: { blocks: doc.blocks },
    html: renderHtml(doc.blocks),
    isTemplate: doc.isTemplate,
  }
}

// vrai pendant qu'on charge un bulletin : les mutations d'un chargement ne sont
// pas des modifications de l'auteur, elles ne doivent pas déclencher d'écriture
let loading = false

function apply(b: api.BulletinFull | api.BulletinMeta, blocks?: Block[]) {
  loading = true
  doc.id = b.id
  doc.title = b.title
  if (blocks) doc.blocks = blocks
  doc.isTemplate = b.isTemplate
  doc.parent = b.parent
  doc.live = b.live
  doc.hasUnpublishedChanges = b.hasUnpublishedChanges
  doc.url = b.url
  nextTick(() => {
    loading = false
    ui.saved = true
  })
}

async function persist() {
  if (!doc.id) return
  try {
    apply(await api.update(doc.id, payload()))
    ui.error = null
  } catch (e) {
    ui.error = (e as Error).message
  }
}

let saveTimer: number | undefined
watch(
  doc,
  () => {
    if (loading || !doc.id) return
    ui.saved = false
    clearTimeout(saveTimer)
    saveTimer = window.setTimeout(persist, 600)
  },
  { deep: true },
)

export async function openBulletin(id: number): Promise<boolean> {
  clearTimeout(saveTimer)
  if (doc.id && !ui.saved) await persist() // ne pas perdre la dernière frappe
  try {
    const b = await api.read(id)
    apply(b, b.doc?.blocks ?? [])
    ui.selectedId = null
    ui.hoverId = null
    ui.error = null
    return true
  } catch (e) {
    ui.error = (e as Error).message
    return false
  }
}

export async function createBulletin(
  blocks: Block[], title: string, parent: number, isTemplate = false,
): Promise<number> {
  const created = await api.create({
    title, doc: { blocks }, html: renderHtml(blocks), isTemplate, parent,
  })
  return created.id
}

/** un nouveau numéro : une copie du document du modèle, sous le même produit.
 *  Le modèle n'est qu'un point de départ — rien ne reste lié ensuite. */
export async function createFromTemplate(id: number): Promise<number> {
  const t = await api.read(id)
  return createBulletin(t.doc?.blocks ?? [], t.title, t.parent, false)
}

export async function deleteBulletin(id: number) {
  await api.remove(id)
  if (doc.id === id) {
    clearTimeout(saveTimer)
    doc.id = null
  }
}

/** publie la parution courante : le html enregistré devient la page publique */
export async function publishCurrent() {
  if (!doc.id || doc.isTemplate) return
  clearTimeout(saveTimer)
  if (!ui.saved) await persist()
  try {
    apply(await api.publish(doc.id))
    ui.error = null
  } catch (e) {
    ui.error = (e as Error).message
  }
}

function findList(blocks: Block[], id: string): { list: Block[]; index: number } | null {
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.id === id) return { list: blocks, index: i }
    if (b.type === 'columns') {
      for (const col of b.columns) {
        const r = findList(col, id)
        if (r) return r
      }
    }
  }
  return null
}

export function removeBlock(id: string) {
  const r = findList(doc.blocks, id)
  if (r) r.list.splice(r.index, 1)
  if (ui.selectedId === id) ui.selectedId = null
}

function reId(b: Block): Block {
  b.id = uid()
  if (b.type === 'columns') b.columns.forEach((col) => col.forEach(reId))
  return b
}

export function duplicateBlock(id: string) {
  const r = findList(doc.blocks, id)
  if (!r) return
  const copy = reId(JSON.parse(JSON.stringify(r.list[r.index])))
  r.list.splice(r.index + 1, 0, copy)
  ui.selectedId = copy.id
}

// colle du texte brut dans les contenteditable (sinon le HTML stylé du presse-papier entre dans le doc)
export function pastePlain(e: ClipboardEvent) {
  e.preventDefault()
  document.execCommand('insertText', false, e.clipboardData?.getData('text/plain') ?? '')
}

// impression native du navigateur : la feuille de style @media print force le rendu « pdf »
export async function exportPdf() {
  ui.selectedId = null
  ui.hoverId = null
  await nextTick()
  window.print()
}

export function exportJson() {
  const blob = new Blob([JSON.stringify({ title: doc.title, blocks: doc.blocks }, null, 2)], {
    type: 'application/json',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${doc.title.trim() || 'bulletin'}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}
