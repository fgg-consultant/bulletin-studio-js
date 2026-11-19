<script setup lang="ts">
/** Le texte du post d'un flash, mis en forme comme dans WhatsApp : gras, italique,
 *  barré, code, et des emojis. Le modèle reste le texte au format de WhatsApp
 *  (whatsapp.ts) : ce qui est copié ou partagé est ce qui est enregistré.
 *
 *  Lexical, comme les blocs texte, mais sans titres, listes ni liens : WhatsApp n'en
 *  a pas. Taper *gras* le met en gras, comme dans WhatsApp ; un texte collé est lu
 *  comme un message WhatsApp, sa mise en forme comprise, jamais comme du html. */
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  createEditor,
  FORMAT_TEXT_COMMAND,
  PASTE_COMMAND,
  type LexicalEditor,
  type TextFormatType,
} from 'lexical'
import { registerRichText } from '@lexical/rich-text'
import { createEmptyHistoryState, registerHistory } from '@lexical/history'
import { registerMarkdownShortcuts, type TextFormatTransformer } from '@lexical/markdown'
import { mergeRegister } from '@lexical/utils'
import { Bold, Code, Italic, LoaderCircle, Smile, Strikethrough } from 'lucide-vue-next'
import type Picker from 'emoji-picker-element/picker.js'
import { createPicker } from '../emoji'
import { t } from '../i18n'
import { FORMATS, markup, parse, type Format, type Run } from '../whatsapp'

const text = defineModel<string>({ required: true })
defineProps<{ placeholder?: string }>()

const rootEl = ref<HTMLElement | null>(null)
const empty = ref(true)
const active = reactive<Record<Format, boolean>>({ bold: false, italic: false, strikethrough: false, code: false })

const theme = {
  paragraph: 'bs-caption-p',
  text: { bold: 'bs-bold', italic: 'bs-italic', strikethrough: 'bs-strike', code: 'bs-code' },
}
/** les marques que l'on tape : la lecture du texte enregistré, elle, est whatsapp.ts */
const SHORTCUTS: TextFormatTransformer[] = [
  { type: 'text-format', format: ['code'], tag: '`' },
  { type: 'text-format', format: ['bold'], tag: '*', intraword: false },
  { type: 'text-format', format: ['italic'], tag: '_', intraword: false },
  { type: 'text-format', format: ['strikethrough'], tag: '~', intraword: false },
]
/** un chargement n'est pas une saisie : il ne réécrit pas le modèle */
const LOAD = 'bs-caption-load'

const node = (run: Run) => {
  const n = $createTextNode(run.text)
  for (const f of run.formats) n.toggleFormat(f)
  return n
}

function $load(value: string) {
  const root = $getRoot()
  root.clear()
  for (const runs of parse(value)) root.append($createParagraphNode().append(...runs.map(node)))
}

/** un paragraphe par ligne, et un retour à la ligne (Maj+Entrée) aussi */
function $markup(): string {
  const lines: Run[][] = []
  for (const block of $getRoot().getChildren()) {
    let line: Run[] = []
    lines.push(line)
    for (const n of $isElementNode(block) ? block.getChildren() : [block]) {
      if ($isLineBreakNode(n)) lines.push((line = []))
      else if ($isTextNode(n)) line.push({ text: n.getTextContent(), formats: FORMATS.filter((f) => n.hasFormat(f)) })
      else line.push({ text: n.getTextContent(), formats: [] })
    }
  }
  return markup(lines)
}

let editor: LexicalEditor | null = null
let last = text.value
let unregister = () => {}

onMounted(() => {
  const ed = createEditor({ namespace: 'bs-caption', theme, onError: (e) => console.error(e) })
  unregister = mergeRegister(
    registerRichText(ed),
    registerHistory(ed, createEmptyHistoryState(), 300),
    registerMarkdownShortcuts(ed, SHORTCUTS),
    // ni souligné ni indice : WhatsApp ne les écrit pas (Ctrl+U)
    ed.registerCommand(FORMAT_TEXT_COMMAND, (f) => !FORMATS.includes(f as Format), COMMAND_PRIORITY_LOW),
    ed.registerCommand(PASTE_COMMAND, onPaste, COMMAND_PRIORITY_LOW),
    ed.registerUpdateListener(({ editorState, tags }) =>
      editorState.read(() => {
        empty.value = $getRoot().getTextContent() === ''
        const sel = $getSelection()
        for (const f of FORMATS) active[f] = $isRangeSelection(sel) && sel.hasFormat(f)
        const value = $markup()
        if (value === last) return
        last = value
        if (!tags.has(LOAD)) text.value = value
      }),
    ),
  )
  ed.update(() => $load(text.value), { tag: LOAD, discrete: true })
  ed.setRootElement(rootEl.value)
  editor = ed
  document.addEventListener('mousedown', closePicker)
  // en capture : Échap ferme le sélecteur, sans aller jusqu'au texte, qu'il ferait quitter
  document.addEventListener('keydown', closePicker, true)
})

onBeforeUnmount(() => {
  unregister()
  editor?.setRootElement(null)
  document.removeEventListener('mousedown', closePicker)
  document.removeEventListener('keydown', closePicker, true)
  picker.value = false
  window.removeEventListener('resize', place, true)
  window.removeEventListener('scroll', place, true)
})

// un autre flash ouvert, une version rechargée : le texte vient d'ailleurs
watch(text, (value) => {
  if (value === last || !editor) return
  last = value
  editor.update(() => $load(value), { tag: LOAD })
})

function onPaste(event: ClipboardEvent | InputEvent | KeyboardEvent): boolean {
  const pasted = event instanceof ClipboardEvent ? event.clipboardData?.getData('text/plain') : undefined
  if (pasted == null) return false
  event.preventDefault()
  editor?.update(() => {
    parse(pasted.replace(/\r\n?/g, '\n')).forEach((runs, k) => {
      const sel = $getSelection()
      if (!$isRangeSelection(sel)) return
      if (k) sel.insertParagraph()
      if (runs.length) sel.insertNodes(runs.map(node))
    })
  })
  return true
}

const format = (f: TextFormatType) => editor?.dispatchCommand(FORMAT_TEXT_COMMAND, f)

/** à la place du curseur, sinon à la fin ; le sélecteur reste ouvert pour la suite */
function insert(emoji: string) {
  editor?.update(() => {
    const sel = $getSelection()
    ;($isRangeSelection(sel) ? sel : $getRoot().selectEnd()).insertText(emoji)
  })
  editor?.focus()
}

// Le sélecteur d'emojis (emoji.ts), créé à la première ouverture puis seulement masqué :
// il retrouve sa recherche et sa catégorie, et ne relit pas ses données à chaque fois. Il
// s'ouvre hors du panneau, posé sur la page, que le défilement du panneau ne le coupe pas
// quand l'écran est étroit.
const picker = ref(false)
const opened = ref(false)
const anchorEl = ref<HTMLElement | null>(null)
const popEl = ref<HTMLElement | null>(null)
const slotEl = ref<HTMLElement | null>(null)
const pickerState = ref<'loading' | 'ready' | 'error'>('loading')
const pos = reactive({ top: 0, left: 0 })
let loading: Promise<Picker> | null = null

/** sous le bouton, vers l'intérieur de l'écran ; au-dessus s'il n'y a pas la place */
function place() {
  const a = anchorEl.value?.getBoundingClientRect()
  const p = popEl.value?.getBoundingClientRect()
  if (!a || !p) return
  const rtl = getComputedStyle(anchorEl.value!).direction === 'rtl'
  pos.left = Math.max(8, Math.min(rtl ? a.right - p.width : a.left, innerWidth - p.width - 8))
  pos.top = a.bottom + 4 + p.height > innerHeight - 8 ? Math.max(8, a.top - 4 - p.height) : a.bottom + 4
}

watch(picker, async (open) => {
  for (const [type, fn] of [['resize', place], ['scroll', place]] as const)
    open ? window.addEventListener(type, fn, true) : window.removeEventListener(type, fn, true)
  if (!open) return
  opened.value = true
  if (pickerState.value === 'error') pickerState.value = 'loading'
  await nextTick()
  place()
  if (pickerState.value === 'ready') return pickerSearch()?.focus()
  loading ??= createPicker().then((p) => {
    p.addEventListener('emoji-click', (e) => e.detail.unicode && insert(e.detail.unicode))
    return p
  })
  try {
    const p = await loading
    if (!slotEl.value || p.isConnected) return // ouvert deux fois pendant le chargement
    slotEl.value.append(p)
    pickerState.value = 'ready'
    await nextTick()
    place()
    if (picker.value) pickerSearch()?.focus()
  } catch (e) {
    console.error(e)
    loading = null // la prochaine ouverture réessaie
    pickerState.value = 'error'
  }
})

const pickerSearch = () => slotEl.value?.firstElementChild?.shadowRoot?.querySelector<HTMLInputElement>('input.search')

/** Un clic hors du sélecteur, ou Échap où que soit le focus : il revient au texte. Échap
 *  dans la liste des tons de peau ne ferme que celle-ci. */
function closePicker(e: MouseEvent | KeyboardEvent) {
  if (!picker.value) return
  const inside = (el: HTMLElement | null) => !!el && e.composedPath().includes(el)
  if (e instanceof KeyboardEvent) {
    if (e.key !== 'Escape' || e.composedPath().some((n) => (n as HTMLElement).id === 'skintone-list')) return
    e.stopPropagation()
    picker.value = false
    editor?.focus()
  } else if (!inside(anchorEl.value) && !inside(popEl.value)) picker.value = false
}

const BUTTONS = [
  { f: 'bold', icon: Bold, title: 'toolbar.bold' },
  { f: 'italic', icon: Italic, title: 'toolbar.italic' },
  { f: 'strikethrough', icon: Strikethrough, title: 'toolbar.strike' },
  { f: 'code', icon: Code, title: 'toolbar.code' },
] as const
</script>

<template>
  <div class="flex min-h-0 flex-col rounded-lg border border-slate-300 focus-within:border-sky-600 focus-within:ring-1 focus-within:ring-sky-600">
    <div class="flex items-center gap-0.5 border-b border-slate-200 px-1.5 py-1">
      <button
        v-for="b in BUTTONS"
        :key="b.f"
        class="rounded p-1.5"
        :class="active[b.f] ? 'bg-sky-100 text-sky-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'"
        :title="t(b.title)"
        :aria-label="t(b.title)"
        :aria-pressed="active[b.f]"
        @mousedown.prevent
        @click="format(b.f)"
      >
        <component :is="b.icon" :size="15" />
      </button>
      <div class="mx-1 h-5 w-px bg-slate-200" />
      <div ref="anchorEl">
        <button
          class="flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium"
          :class="picker ? 'bg-sky-100 text-sky-700' : 'text-slate-600 hover:bg-slate-100'"
          :aria-expanded="picker"
          aria-haspopup="dialog"
          @mousedown.prevent
          @click="picker = !picker"
        >
          <Smile :size="15" /> {{ t('flash.emoji') }}
        </button>
      </div>
      <Teleport to="body">
        <div
          v-if="opened"
          v-show="picker"
          ref="popEl"
          class="fixed z-[60] rounded-xl bg-white shadow-xl"
          :style="{ top: `${pos.top}px`, left: `${pos.left}px` }"
        >
          <div ref="slotEl" />
          <div
            v-if="pickerState !== 'ready'"
            class="bs-emoji-picker flex items-center justify-center rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500"
          >
            <LoaderCircle v-if="pickerState === 'loading'" :size="22" class="animate-spin text-slate-400" />
            <span v-else>{{ t('flash.emojiError') }}</span>
          </div>
        </div>
      </Teleport>
    </div>
    <div class="relative min-h-0 flex-1">
      <div
        ref="rootEl"
        contenteditable="true"
        spellcheck="true"
        :aria-label="t('flash.post')"
        class="bs-caption h-full overflow-y-auto px-3 py-2.5 outline-none"
      />
      <p v-if="empty && placeholder" class="pointer-events-none absolute inset-x-3 top-2.5 text-[15px] text-slate-400">
        {{ placeholder }}
      </p>
    </div>
  </div>
</template>
