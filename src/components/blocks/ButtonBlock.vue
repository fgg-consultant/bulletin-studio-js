<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-vue-next'
import { pastePlain } from '../../store'
import type { ButtonBlock } from '../../types'

const props = defineProps<{ block: ButtonBlock; selected: boolean }>()

const label = ref<HTMLElement | null>(null)
onMounted(() => {
  label.value!.textContent = props.block.label
})

const aligns = [
  { v: 'left', icon: AlignLeft },
  { v: 'center', icon: AlignCenter },
  { v: 'right', icon: AlignRight },
] as const
</script>

<template>
  <div>
    <div :style="{ textAlign: block.align }" class="py-1">
      <span
        ref="label"
        contenteditable="true"
        spellcheck="false"
        class="inline-block cursor-text rounded-md bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-sky-300"
        @input="block.label = label?.textContent ?? ''"
        @paste="pastePlain"
        @keydown.enter.prevent
      ></span>
    </div>
    <div v-if="selected" class="mt-1 flex items-center gap-2" @click.stop>
      <input
        v-model="block.href"
        name="button-href"
        aria-label="Lien du bouton"
        placeholder="https://lien-du-bouton…"
        class="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs focus:outline-1 focus:outline-sky-600"
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
