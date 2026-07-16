<script setup lang="ts">
import { computed, defineAsyncComponent, type Component } from 'vue'
import { Copy, GripVertical, Trash2 } from 'lucide-vue-next'
import { duplicateBlock, removeBlock, ui } from '../store'
import type { Block } from '../types'
import ButtonBlock from './blocks/ButtonBlock.vue'
import DateBlock from './blocks/DateBlock.vue'
import DividerBlock from './blocks/DividerBlock.vue'
import HeaderBlock from './blocks/HeaderBlock.vue'
import ImageBlock from './blocks/ImageBlock.vue'
import SpacerBlock from './blocks/SpacerBlock.vue'
import TableBlock from './blocks/TableBlock.vue'
import TextBlock from './blocks/TextBlock.vue'

// import async : ColumnsBlock ré-importe BlockRenderer (récursif)
const ColumnsBlock = defineAsyncComponent(() => import('./blocks/ColumnsBlock.vue'))

const props = defineProps<{ block: Block }>()

const comps: Record<Block['type'], Component> = {
  header: HeaderBlock,
  text: TextBlock,
  image: ImageBlock,
  button: ButtonBlock,
  table: TableBlock,
  date: DateBlock,
  divider: DividerBlock,
  spacer: SpacerBlock,
  columns: ColumnsBlock,
}

const selected = computed(() => ui.selectedId === props.block.id)
const hovered = computed(() => ui.hoverId === props.block.id)
</script>

<template>
  <div
    class="relative rounded-md px-2 py-1.5 transition-shadow"
    :class="selected ? 'ring-2 ring-sky-600' : hovered ? 'ring-1 ring-sky-300' : ''"
    :data-block-type="block.type"
    :data-id="block.id"
    @click.stop="ui.selectedId = block.id"
    @mouseover.stop="ui.hoverId = block.id"
    @mouseleave="ui.hoverId === block.id && (ui.hoverId = null)"
  >
    <div
      v-show="selected || hovered"
      class="absolute -top-3.5 right-2 z-20 flex items-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-md"
    >
      <button class="drag-handle cursor-grab p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 active:cursor-grabbing" title="Déplacer">
        <GripVertical :size="15" />
      </button>
      <button class="p-1.5 text-slate-500 hover:bg-slate-50 hover:text-sky-700" title="Dupliquer" @click.stop="duplicateBlock(block.id)">
        <Copy :size="15" />
      </button>
      <button class="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" title="Supprimer" @click.stop="removeBlock(block.id)">
        <Trash2 :size="15" />
      </button>
    </div>

    <component :is="comps[block.type]" :block="block" :selected="selected" />
  </div>
</template>
