<script setup lang="ts">
import { computed } from 'vue'
import { AlignCenter, AlignLeft, AlignRight, Calendar } from 'lucide-vue-next'
import { formatDay, t } from '../../i18n'
import { doc } from '../../store'
import type { DateBlock } from '../../types'

const props = defineProps<{ block: DateBlock; selected: boolean }>()

/** un modèle n'a pas de date : il montre la place de celle de chaque numéro */
const placeholder = computed(() => props.block.issueDate && doc.isTemplate)

const formatted = computed(() => {
  if (props.block.issueDate) return (doc.isTemplate ? '' : formatDay(doc.date)) || t('date.issueDate')
  return formatDay(props.block.date) || t('date.pick')
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
      <span
        class="inline-flex items-center gap-1.5 text-sm font-medium tracking-wide text-slate-500"
        :class="placeholder && 'italic'"
      >
        <Calendar :size="14" class="text-slate-400" />
        {{ formatted }}
      </span>
    </div>
    <div v-if="selected" class="mt-1 flex items-center gap-2" @click.stop>
      <input
        v-if="!block.issueDate"
        v-model="block.date"
        type="date"
        name="date"
        :aria-label="t('date.label')"
        class="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:outline-1 focus:outline-sky-600"
      />
      <label class="flex items-center gap-1.5 text-xs text-slate-600" :title="t('date.issueDateHint')">
        <input v-model="block.issueDate" type="checkbox" name="issue-date" class="accent-sky-700" />
        {{ t('date.issueDate') }}
      </label>
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
