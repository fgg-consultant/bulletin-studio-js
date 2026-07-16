import { nextTick, reactive, watch } from 'vue'
import type { Block } from './types'

const STORAGE_KEY = 'bulletin-studio-doc'

export interface BulletinDoc {
  title: string
  blocks: Block[]
}

function load(): BulletinDoc | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const doc = reactive<BulletinDoc>(load() ?? { title: 'Nouveau bulletin', blocks: [] })

export const ui = reactive({
  selectedId: null as string | null,
  hoverId: null as string | null,
  device: 'desktop' as 'desktop' | 'pdf' | 'mobile',
  saved: true,
})

// ponytail: autosave localStorage — brancher l'API climweb ici lors de l'intégration
let saveTimer: number | undefined
watch(
  doc,
  () => {
    ui.saved = false
    clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doc))
      ui.saved = true
    }, 600)
  },
  { deep: true },
)

export const uid = () => crypto.randomUUID()

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
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${doc.title.trim() || 'bulletin'}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}
