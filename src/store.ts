import { computed, nextTick, reactive, watch } from 'vue'
import * as api from './api'
import { siteToday, type IssueDates } from './fields'
import { t } from './i18n'
import { renderFlashHtml, renderHtml } from './render'
import { captureFlash, firstImageId } from './share'
import type { Block, Cadence, FlashShare, Kind } from './types'

export const uid = () => crypto.randomUUID()

export interface BulletinDoc {
  /** null quand aucun bulletin n'est chargé (dashboard) */
  id: number | null
  title: string
  kind: Kind
  blocks: Block[]
  /** un flash : le texte du post qui accompagne l'image */
  caption: string
  /** un flash : l'image de sa dernière publication, null avant */
  share: FlashShare | null
  /** un modèle est un simple point de départ : jamais publié, jamais public */
  isTemplate: boolean
  /** le premier jour de la période du numéro : les cartes de prévision, la « date du
   *  numéro » et les dates insérées la suivent */
  date: string | null
  /** son dernier jour, null pour un numéro d'un jour */
  validUntil: string | null
  /** d'un modèle : la période de ses numéros */
  cadence: Cadence
  /** un modèle seulement : l'heure de ses brouillons, ou null */
  draftAt: string | null
  /** la ProductPage hôte — les parutions d'un modèle la partagent */
  parent: number | null
  parentTitle: string
  /** un numéro : son modèle ; null pour un modèle et pour une publication sans modèle */
  template: { id: number; title: string } | null
  /** un modèle : combien de numéros en sont issus */
  issueCount: number
  live: boolean
  hasUnpublishedChanges: boolean
  publishedAt: number | null
  url: string | null
}

export const doc = reactive<BulletinDoc>({
  id: null, title: '', kind: 'bulletin', blocks: [], caption: '', share: null, isTemplate: false,
  date: null, validUntil: null, cadence: 'daily', draftAt: null, parent: null, parentTitle: '',
  template: null, issueCount: 0, live: false, hasUnpublishedChanges: false, publishedAt: null, url: null,
})

/** une publication faite sans modèle : son jour est à elle, l'auteur le choisit. Celui
 *  d'un numéro suit la cadence de son modèle, et un modèle n'en a pas */
export const standalone = computed(() => !doc.isTemplate && !doc.template && !doc.validUntil)

/** ce que remplissent les dates insérées ; null pour un modèle, qui n'a pas de période */
export const issueDates = computed<IssueDates | null>(() =>
  doc.isTemplate || !doc.date
    ? null
    : { start: doc.date, end: doc.validUntil ?? doc.date, cadence: doc.cadence, published: siteToday() },
)

export const ui = reactive({
  selectedId: null as string | null,
  hoverId: null as string | null,
  device: 'desktop' as 'desktop' | 'pdf' | 'mobile',
  saved: true,
  /** une publication en cours : celle d'un flash capture et verse d'abord son image */
  publishing: false,
  /** le contenu du flash ne tient pas dans son carré (FlashCanvas.vue) */
  overflow: false,
  /** le bloc qui fait le fond d'un flash, carte ou image, sur tout le carré
   *  (FlashCanvas.vue) : ses réglages passent sous le carré */
  backdropId: null as string | null,
  error: null as string | null,
})

/** le document + le html publiable, rendu au moment d'enregistrer */
function payload(): api.BulletinPayload {
  const flash = doc.kind === 'flash'
  return {
    title: doc.title,
    doc: flash ? { blocks: doc.blocks, caption: doc.caption, share: doc.share } : { blocks: doc.blocks },
    // rendu à chaque enregistrement, donc juste avant de publier : {published} est
    // le jour de la publication
    html: flash
      ? renderFlashHtml(doc.share, doc.caption)
      : renderHtml(doc.blocks, { dates: issueDates.value }),
    isTemplate: doc.isTemplate,
    // l'image que montrera un lien partagé, une fois la page publiée
    shareImage: flash ? (doc.share?.imageId ?? null) : firstImageId(doc.blocks),
    ...(doc.isTemplate ? { cadence: doc.cadence, draftAt: doc.draftAt } : {}),
    // un champ date vidé : on garde le jour enregistré plutôt que d'en envoyer un vide
    ...(standalone.value && doc.date ? { date: doc.date } : {}),
  }
}

// vrai pendant qu'on charge un bulletin : les mutations d'un chargement ne sont
// pas des modifications de l'auteur, elles ne doivent pas déclencher d'écriture
let loading = false

/** `stored` à l'ouverture seulement : l'écho d'un enregistrement ne doit pas écraser
 *  ce que l'auteur a tapé depuis */
function apply(b: api.BulletinFull | api.BulletinMeta, stored?: api.StoredDoc) {
  loading = true
  doc.id = b.id
  doc.title = b.title
  doc.kind = b.kind
  if (stored) {
    doc.blocks = stored.blocks ?? []
    doc.caption = stored.caption ?? ''
    doc.share = stored.share ?? null
  }
  doc.isTemplate = b.isTemplate
  doc.date = b.date
  doc.validUntil = b.validUntil
  doc.cadence = b.cadence
  doc.draftAt = b.draftAt
  doc.parent = b.parent
  doc.parentTitle = b.parentTitle
  doc.template = b.template
  doc.issueCount = b.issueCount
  doc.live = b.live
  doc.hasUnpublishedChanges = b.hasUnpublishedChanges
  doc.publishedAt = b.publishedAt
  doc.url = b.url
  nextTick(() => {
    loading = false
    ui.saved = true
  })
}

// les enregistrements à la file : deux PUT en vol pourraient arriver dans le désordre,
// et le plus ancien écraser le plus récent
let saving: Promise<void> = Promise.resolve()

function persist(): Promise<void> {
  saving = saving.then(async () => {
    if (!doc.id) return
    try {
      apply(await api.update(doc.id, payload()))
      ui.error = null
    } catch (e) {
      ui.error = (e as Error).message
    }
  })
  return saving
}

let saveTimer: number | undefined
watch(
  doc,
  () => {
    if (loading || !doc.id) return
    ui.saved = false
    clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      saveTimer = undefined
      void persist()
    }, 600)
  },
  { deep: true },
)

/** enregistre tout de suite ce qui attendait le délai de frappe, puis attend la fin des
 *  enregistrements en cours : avant de quitter l'éditeur, de lire la liste ou de faire
 *  un numéro d'un modèle qu'on vient de modifier */
export async function settled(): Promise<void> {
  if (saveTimer !== undefined) {
    clearTimeout(saveTimer)
    saveTimer = undefined
    void persist()
  }
  await saving
}

export async function openBulletin(id: number): Promise<boolean> {
  await settled() // ne pas perdre la dernière frappe du bulletin d'avant
  try {
    const b = await api.read(id)
    apply(b, b.doc ?? {})
    ui.selectedId = null
    ui.hoverId = null
    ui.error = null
    return true
  } catch (e) {
    ui.error = (e as Error).message
    return false
  }
}

export async function createBulletin(b: {
  blocks: Block[]
  title: string
  parent: number
  isTemplate?: boolean
  cadence?: Cadence
  kind?: Kind
  /** un flash : le texte du post de départ */
  caption?: string
  /** une publication sans modèle : son jour */
  date?: string
}): Promise<number> {
  const flash = b.kind === 'flash'
  const created = await api.create({
    title: b.title,
    doc: flash ? { blocks: b.blocks, caption: b.caption ?? '', share: null } : { blocks: b.blocks },
    html: flash ? '' : renderHtml(b.blocks),
    isTemplate: b.isTemplate ?? false,
    parent: b.parent,
    kind: b.kind ?? 'bulletin',
    ...(b.cadence ? { cadence: b.cadence } : {}),
    ...(b.date ? { date: b.date } : {}),
  })
  return created.id
}

/** un nouveau numéro, préparé par le serveur — le même chemin que les brouillons
 *  automatiques : une copie du document du modèle, sous le même produit, datée de la
 *  période qui contient `date` (aujourd'hui par défaut), ses cartes de prévision
 *  figées. Le modèle n'est qu'un point de départ : le modifier ensuite ne touche à
 *  aucun numéro. */
export async function createFromTemplate(id: number, date?: string): Promise<number> {
  await settled() // le serveur copie le modèle tel qu'il est enregistré
  return (await api.createIssue(id, date)).id
}

export async function deleteBulletin(id: number) {
  await api.remove(id)
  if (doc.id === id) {
    clearTimeout(saveTimer)
    saveTimer = undefined
    doc.id = null
  }
}

/** publie la parution courante : le html enregistré devient la page publique.
 *  Toujours ré-enregistré avant : le html d'un numéro préparé par le serveur n'a
 *  jamais été rendu, seul le studio sait le faire. */
export async function publishCurrent() {
  if (!doc.id || doc.isTemplate || ui.publishing) return
  // l'image partirait rognée, le texte par-dessus la carte : l'auteur le voit, et décide
  if (doc.kind === 'flash' && ui.overflow && !confirm(t('flash.overflowConfirm'))) return
  ui.publishing = true
  try {
    clearTimeout(saveTimer)
    saveTimer = undefined
    // un flash publie l'image du visuel tel qu'il est : capturée, versée dans la
    // bibliothèque, elle devient sa page et l'aperçu de son lien
    if (doc.kind === 'flash') {
      const { blob, alt } = await captureCurrent()
      const image = await api.uploadImage(new File([blob], `${fileName()}.png`, { type: 'image/png' }), 'flash')
      doc.share = { imageId: image.id, src: image.url, alt }
      await nextTick() // la sauvegarde différée que ce changement arme : celle d'ici la remplace
      clearTimeout(saveTimer)
      saveTimer = undefined
    }
    await persist()
    if (ui.error) return // ne pas publier une version que l'enregistrement a refusée
    apply(await api.publish(doc.id))
    ui.error = null
  } catch (e) {
    ui.error = (e as Error).message
  } finally {
    ui.publishing = false
  }
}

/** le nom des fichiers exportés : le titre */
export const fileName = () => doc.title.trim() || t('editor.fileName')

/** Le visuel du flash, en image : sans sélection ni survol, dont le chrome resterait
 *  sur la capture. */
export async function captureCurrent() {
  ui.selectedId = null
  ui.hoverId = null
  await nextTick()
  return captureFlash()
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
  a.download = `${fileName()}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}
