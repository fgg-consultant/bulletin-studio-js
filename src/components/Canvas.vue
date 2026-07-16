<script setup lang="ts">
import draggable from 'vuedraggable'
import { LayoutTemplate } from 'lucide-vue-next'
import { doc, ui } from '../store'
import BlockRenderer from './BlockRenderer.vue'

const widths = { desktop: 'max-w-[980px]', pdf: 'max-w-[770px]', mobile: 'max-w-[420px]' }
</script>

<template>
  <main class="bs-canvas bs-dots min-h-0 flex-1 overflow-y-auto" :class="`bs-mode-${ui.device}`" @click="ui.selectedId = null">
    <div class="mx-auto my-10 px-6 transition-all duration-300" :class="widths[ui.device]">
      <div class="bs-page relative rounded-lg border border-slate-200 bg-white shadow-[0_8px_30px_rgba(2,8,23,0.08)]">
        <draggable
          v-model="doc.blocks"
          group="blocks"
          item-key="id"
          handle=".drag-handle"
          ghost-class="drag-ghost"
          :animation="150"
          class="bs-body min-h-[70vh] space-y-1"
        >
          <template #item="{ element }">
            <BlockRenderer :block="element" />
          </template>
        </draggable>

        <div
          v-if="doc.blocks.length === 0"
          class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400"
        >
          <div class="rounded-full border-2 border-dashed border-slate-300 p-4">
            <LayoutTemplate :size="28" />
          </div>
          <p class="mt-1 font-medium text-slate-500">Votre bulletin est vide</p>
          <p class="text-sm">Glissez un bloc depuis la barre latérale pour commencer.</p>
        </div>
      </div>
    </div>
  </main>
</template>
