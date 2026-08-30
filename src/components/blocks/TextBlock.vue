<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import {
  $createParagraphNode,
  $getRoot,
  COMMAND_PRIORITY_LOW,
  createEditor,
  type LexicalEditor,
} from 'lexical'
import { $createHeadingNode, registerRichText } from '@lexical/rich-text'
import { createEmptyHistoryState, registerHistory } from '@lexical/history'
import { registerList } from '@lexical/list'
import { $toggleLink, TOGGLE_LINK_COMMAND } from '@lexical/link'
import { mergeRegister } from '@lexical/utils'
import { nodes, theme } from '../../lexical'
import type { TextBlock } from '../../types'
import TextToolbar from '../TextToolbar.vue'

const props = defineProps<{ block: TextBlock; selected: boolean }>()

const rootEl = ref<HTMLElement | null>(null)
const editor = shallowRef<LexicalEditor | null>(null)
const isEmpty = ref(false)
let unregister = () => {}


onMounted(() => {
  const ed = createEditor({
    namespace: `bs-${props.block.id}`,
    nodes,
    theme,
    onError: (e) => console.error(e),
  })

  unregister = mergeRegister(
    registerRichText(ed),
    registerHistory(ed, createEmptyHistoryState(), 300),
    registerList(ed),
    ed.registerCommand(
      TOGGLE_LINK_COMMAND,
      (payload) => {
        $toggleLink(typeof payload === 'string' ? payload : (payload?.url ?? null))
        return true
      },
      COMMAND_PRIORITY_LOW,
    ),
    ed.registerUpdateListener(({ editorState }) => {
      props.block.state = JSON.stringify(editorState.toJSON())
      isEmpty.value = editorState.read(() => $getRoot().getTextContent().trim() === '')
    }),
  )

  if (props.block.state) {
    ed.setEditorState(ed.parseEditorState(props.block.state))
    isEmpty.value = ed.getEditorState().read(() => $getRoot().getTextContent().trim() === '')
  } else {
    ed.update(() => {
      $getRoot().append(props.block.preset === 'heading' ? $createHeadingNode('h2') : $createParagraphNode())
    })
  }

  ed.setRootElement(rootEl.value!)
  editor.value = ed
})

onBeforeUnmount(() => {
  unregister()
  editor.value?.setRootElement(null)
})
</script>

<template>
  <div class="relative">
    <TextToolbar v-if="selected && editor" :editor="editor" />
    <div ref="rootEl" contenteditable="true" spellcheck="false" class="min-h-7 outline-none"></div>
    <div
      v-if="isEmpty"
      class="bs-placeholder pointer-events-none absolute left-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-slate-400"
      :class="block.preset === 'heading' ? 'top-1.5 text-[1.375rem] font-bold' : 'top-1'"
    >
      {{ block.preset === 'heading' ? 'Titre de section' : 'Saisissez votre texte…' }}
    </div>
  </div>
</template>
