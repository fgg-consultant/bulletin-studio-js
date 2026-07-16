<script setup lang="ts">
import { computed } from 'vue'
import { AlignCenter, AlignLeft, AlignRight, Calendar } from 'lucide-vue-next'
import type { DateBlock } from '../../types'

const props = defineProps<{ block: DateBlock; selected: boolean }>()

const formatted = computed(() => {
  const d = new Date(props.block.date + 'T00:00:00')
  return isNaN(d.getTime())
    ? 'Choisissez une date'
    : new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
})

const aligns = [
  { v: 'left', icon: AlignLeft },
  { v: 'center', icon: AlignCenter },
  { v: 'right', icon: AlignRight },
] as const
</script>

<template>
  <div>
    <div :style="{ textAlign: block.align }" class="py-0.5">
      <span class="inline-flex items-center gap-1.5 text-sm font-medium tracking-wide text-slate-500">
        <Calendar :size="14" class="text-slate-400" />
        {{ formatted }}
      </span>
    </div>
    <div v-if="selected" class="mt-1 flex items-center gap-2" @click.stop>
      <input
        v-model="block.date"
        type="date"
        name="date"
        aria-label="Date du bloc"
        class="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:outline-1 focus:outline-sky-600"
      />
      <div class="flex rounded border border-slate-200 p-0.5">
        <button
          v-for="a in aligns"
          :key="a.v"
          class="rounded p-1"
          :class="block.align === a.v ? 'bg-sky-50 text-sky-700' : 'text-slate-400 hover:text-slate-600'"
          @click="block.align = a.v"
        >
          <component :is="a.icon" :size="13" />
        </button>
      </div>
    </div>
  </div>
</template>
