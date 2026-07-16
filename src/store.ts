import { nextTick, reactive, watch } from 'vue'
import type { Block } from './types'

const PREFIX = 'bs-doc:'

export const uid = () => crypto.randomUUID()

export interface BulletinDoc {
  /** null quand aucun bulletin n'est chargé (dashboard) */
  id: string | null
  title: string
  blocks: Block[]
}

export const doc = reactive<BulletinDoc>({ id: null, title: '', blocks: [] })

export const ui = reactive({
  selectedId: null as string | null,
  hoverId: null as string | null,
  device: 'desktop' as 'desktop' | 'pdf' | 'mobile',
  saved: true,
})

// migration de l'ancien stockage mono-document
const legacy = localStorage.getItem('bulletin-studio-doc')
if (legacy) {
  try {
    const d = JSON.parse(legacy)
    localStorage.setItem(PREFIX + uid(), JSON.stringify({ ...d, updatedAt: Date.now() }))
  } catch {
    /* contenu illisible : on l'abandonne */
  }
  localStorage.removeItem('bulletin-studio-doc')
}

export interface BulletinMeta {
  id: string
  title: string
  updatedAt: number
  blockCount: number
}

export function listBulletins(): BulletinMeta[] {
  const out: BulletinMeta[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!
    if (!k.startsWith(PREFIX)) continue
    try {
      const d = JSON.parse(localStorage.getItem(k)!)
      out.push({
        id: k.slice(PREFIX.length),
        title: d.title || 'Sans titre',
        updatedAt: d.updatedAt ?? 0,
        blockCount: (d.blocks ?? []).length,
      })
    } catch {
      /* clé corrompue : ignorée */
    }
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt)
}

function persist() {
  if (!doc.id) return
  localStorage.setItem(
    PREFIX + doc.id,
    JSON.stringify({ title: doc.title, blocks: doc.blocks, updatedAt: Date.now() }),
  )
  ui.saved = true
}

// ponytail: autosave localStorage — brancher l'API climweb ici lors de l'intégration
let saveTimer: number | undefined
watch(
  doc,
  () => {
    if (!doc.id) return
    ui.saved = false
    clearTimeout(saveTimer)
    saveTimer = window.setTimeout(persist, 600)
  },
  { deep: true },
)

export function openBulletin(id: string): boolean {
  const raw = localStorage.getItem(PREFIX + id)
  if (!raw) return false
  clearTimeout(saveTimer)
  if (doc.id && !ui.saved) persist() // ne pas perdre la dernière frappe du bulletin précédent
  try {
    const d = JSON.parse(raw)
    doc.id = id
    doc.title = d.title ?? ''
    doc.blocks = d.blocks ?? []
    ui.selectedId = null
    ui.hoverId = null
    ui.saved = true
    return true
  } catch {
    return false
  }
}

export function createBulletin(blocks: Block[], title = 'Nouveau bulletin'): string {
  const id = uid()
  localStorage.setItem(PREFIX + id, JSON.stringify({ title, blocks, updatedAt: Date.now() }))
  return id
}

export function deleteBulletin(id: string) {
  localStorage.removeItem(PREFIX + id)
  if (doc.id === id) {
    clearTimeout(saveTimer)
    doc.id = null
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
