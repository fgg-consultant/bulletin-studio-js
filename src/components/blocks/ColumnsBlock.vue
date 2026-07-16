<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import draggable from 'vuedraggable'
import type { ColumnsBlock } from '../../types'

// import async : BlockRenderer ré-importe ColumnsBlock (récursif)
const BlockRenderer = defineAsyncComponent(() => import('../BlockRenderer.vue'))

defineProps<{ block: ColumnsBlock; selected: boolean }>()

// pas de colonnes dans des colonnes, ni de header (bandeau pleine largeur = niveau page)
const group = {
  name: 'blocks',
  put: (_to: unknown, _from: unknown, el: HTMLElement) =>
    el.dataset.blockType !== 'columns' && el.dataset.blockType !== 'header',
}
</script>

<template>
  <div class="bs-cols flex flex-wrap gap-3" :class="block.columns.length > 2 && 'bs-cols-many'">
    <draggable
      v-for="(col, i) in block.columns"
      :key="i"
      :list="col"
      :group="group"
      item-key="id"
      handle=".drag-handle"
      ghost-class="drag-ghost"
      :animation="150"
      class="min-h-16 min-w-0 space-y-1 rounded-md py-0.5"
      :class="col.length === 0 && 'bs-empty-col'"
      :style="{ flexGrow: block.ratios[i] }"
    >
      <template #item="{ element }">
        <BlockRenderer :block="element" />
      </template>
    </draggable>
  </div>
</template>
