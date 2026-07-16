<script setup lang="ts">
import type { SpacerBlock } from '../../types'

defineProps<{ block: SpacerBlock; selected: boolean }>()

const heights = { sm: '16px', md: '32px', lg: '64px' }
const sizes = ['sm', 'md', 'lg'] as const
const labels = { sm: 'S', md: 'M', lg: 'L' }
</script>

<template>
  <div class="relative rounded" :class="selected && 'bs-stripes'" :style="{ height: heights[block.size] }">
    <div v-if="selected" class="absolute inset-0 flex items-center justify-center gap-1" @click.stop>
      <button
        v-for="sz in sizes"
        :key="sz"
        class="rounded-full border px-2 py-0.5 text-[10px] font-semibold shadow-sm"
        :class="block.size === sz ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-sky-400'"
        @click="block.size = sz"
      >
        {{ labels[sz] }}
      </button>
    </div>
  </div>
</template>
