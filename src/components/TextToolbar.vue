<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive } from 'vue'
import {
  $createParagraphNode,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type ElementFormatType,
  type LexicalEditor,
  type TextFormatType,
} from 'lexical'
import { $setBlocksType } from '@lexical/selection'
import { $createHeadingNode, $isHeadingNode, type HeadingTagType } from '@lexical/rich-text'
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '@lexical/list'
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import { mergeRegister } from '@lexical/utils'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Strikethrough,
  Underline,
} from 'lucide-vue-next'

const props = defineProps<{ editor: LexicalEditor }>()

const s = reactive({
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  block: 'paragraph' as string,
  list: null as null | string,
  align: 'left' as string,
  link: false,
})

function refresh() {
  props.editor.getEditorState().read(() => {
    const sel = $getSelection()
    if (!$isRangeSelection(sel)) return
    s.bold = sel.hasFormat('bold')
    s.italic = sel.hasFormat('italic')
    s.underline = sel.hasFormat('underline')
    s.strike = sel.hasFormat('strikethrough')
    const anchor = sel.anchor.getNode()
    const top = anchor.getKey() === 'root' ? null : anchor.getTopLevelElementOrThrow()
    s.list = top && $isListNode(top) ? top.getListType() : null
    s.block = top && $isHeadingNode(top) ? top.getTag() : 'paragraph'
    s.align = (top && $isElementNode(top) && top.getFormatType()) || 'left'
    const parent = anchor.getParent()
    s.link = $isLinkNode(parent) || $isLinkNode(anchor)
  })
}

let unregister = () => {}
onMounted(() => {
  refresh()
  unregister = mergeRegister(
    props.editor.registerUpdateListener(refresh),
    props.editor.registerCommand(SELECTION_CHANGE_COMMAND, () => (refresh(), false), COMMAND_PRIORITY_LOW),
  )
})
onBeforeUnmount(() => unregister())

const format = (f: TextFormatType) => props.editor.dispatchCommand(FORMAT_TEXT_COMMAND, f)
const align = (a: ElementFormatType) => props.editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, a)

function setBlock(v: 'paragraph' | HeadingTagType) {
  props.editor.update(() => {
    const sel = $getSelection()
    if (!$isRangeSelection(sel)) return
    $setBlocksType(sel, () => (v === 'paragraph' ? $createParagraphNode() : $createHeadingNode(v)))
  })
}

function toggleList(kind: 'bullet' | 'number') {
  if (s.list === kind) props.editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
  else
    props.editor.dispatchCommand(
      kind === 'bullet' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
      undefined,
    )
}

function toggleLink() {
  if (s.link) {
    props.editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
  } else {
    // ponytail: window.prompt — remplacer par un petit popover si besoin
    const url = window.prompt('URL du lien :', 'https://')
    if (url) props.editor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
  }
}

const btn = (active: boolean) =>
  `rounded p-1.5 ${active ? 'bg-sky-100 text-sky-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`
const txtBtn = (active: boolean) =>
  `rounded px-1.5 py-1 text-xs font-semibold ${active ? 'bg-sky-100 text-sky-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`
</script>

<template>
  <div
    class="absolute -top-11 left-0 z-30 flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 whitespace-nowrap shadow-lg"
    @click.stop
  >
    <button :class="txtBtn(s.block === 'paragraph')" title="Paragraphe" @mousedown.prevent @click="setBlock('paragraph')">P</button>
    <button :class="txtBtn(s.block === 'h1')" title="Titre 1" @mousedown.prevent @click="setBlock('h1')">H1</button>
    <button :class="txtBtn(s.block === 'h2')" title="Titre 2" @mousedown.prevent @click="setBlock('h2')">H2</button>
    <button :class="txtBtn(s.block === 'h3')" title="Titre 3" @mousedown.prevent @click="setBlock('h3')">H3</button>
    <div class="mx-0.5 h-5 w-px bg-slate-200" />
    <button :class="btn(s.bold)" title="Gras" @mousedown.prevent @click="format('bold')"><Bold :size="14" /></button>
    <button :class="btn(s.italic)" title="Italique" @mousedown.prevent @click="format('italic')"><Italic :size="14" /></button>
    <button :class="btn(s.underline)" title="Souligné" @mousedown.prevent @click="format('underline')"><Underline :size="14" /></button>
    <button :class="btn(s.strike)" title="Barré" @mousedown.prevent @click="format('strikethrough')"><Strikethrough :size="14" /></button>
    <div class="mx-0.5 h-5 w-px bg-slate-200" />
    <button :class="btn(s.list === 'bullet')" title="Liste à puces" @mousedown.prevent @click="toggleList('bullet')"><List :size="14" /></button>
    <button :class="btn(s.list === 'number')" title="Liste numérotée" @mousedown.prevent @click="toggleList('number')"><ListOrdered :size="14" /></button>
    <button :class="btn(s.link)" title="Lien" @mousedown.prevent @click="toggleLink"><Link2 :size="14" /></button>
    <div class="mx-0.5 h-5 w-px bg-slate-200" />
    <button :class="btn(s.align === 'left')" title="Aligner à gauche" @mousedown.prevent @click="align('left')"><AlignLeft :size="14" /></button>
    <button :class="btn(s.align === 'center')" title="Centrer" @mousedown.prevent @click="align('center')"><AlignCenter :size="14" /></button>
    <button :class="btn(s.align === 'right')" title="Aligner à droite" @mousedown.prevent @click="align('right')"><AlignRight :size="14" /></button>
  </div>
</template>
