<script setup lang="ts">
import { computed } from 'vue'
import { Plus, X } from 'lucide-vue-next'
import { pastePlain, uid } from '../../store'
import type { HeaderBlock } from '../../types'

const props = defineProps<{ block: HeaderBlock; selected: boolean }>()

// initialise le texte des contenteditable sans le lier (le caret sauterait à chaque frappe)
const vInitText = {
  mounted: (el: HTMLElement, { value }: { value: string }) => {
    el.textContent = value
  },
}

const swatches = ['#175243', '#0c4a6e', '#1e293b', '#7f1d1d', '#b45309', '#f1f5f9']

const dark = computed(() => {
  const [r = 0, g = 0, b = 0] = (props.block.bg.match(/\w\w/g) ?? []).map((h) => parseInt(h, 16))
  return r * 0.299 + g * 0.587 + b * 0.114 < 140
})

function edit(e: Event, key: 'eyebrow' | 'title' | 'subtitle') {
  props.block[key] = (e.target as HTMLElement).textContent ?? ''
}
</script>

<template>
  <div
    class="bs-header rounded-lg px-8 py-9 transition-colors"
    :class="dark ? 'text-white' : 'text-slate-900'"
    :style="{ backgroundColor: block.bg }"
  >
    <div class="flex items-center gap-3">
      <span class="h-px w-8 shrink-0" :class="dark ? 'bg-white/60' : 'bg-slate-500'" />
      <span
        v-init-text="block.eyebrow"
        contenteditable="true"
        spellcheck="false"
        data-placeholder="Type de bulletin"
        class="text-xs font-semibold tracking-[0.15em] uppercase outline-none"
        :class="dark ? 'text-white/75' : 'text-slate-600'"
        @input="edit($event, 'eyebrow')"
        @paste="pastePlain"
        @keydown.enter.prevent
      ></span>
    </div>

    <h1
      v-init-text="block.title"
      contenteditable="true"
      spellcheck="false"
      data-placeholder="N°1 — Titre du bulletin"
      class="mt-4 text-4xl leading-tight font-extrabold tracking-tight outline-none"
      @input="edit($event, 'title')"
      @paste="pastePlain"
      @keydown.enter.prevent
    ></h1>

    <p
      v-init-text="block.subtitle"
      contenteditable="true"
      spellcheck="false"
      data-placeholder="Résumé du bulletin en une ou deux phrases."
      class="mt-4 max-w-2xl text-base leading-relaxed outline-none"
      :class="dark ? 'text-white/85' : 'text-slate-700'"
      @input="edit($event, 'subtitle')"
      @paste="pastePlain"
      @keydown.enter.prevent
    ></p>

    <div class="mt-6 flex flex-wrap items-center gap-2">
      <span
        v-for="badge in block.badges"
        :key="badge.id"
        class="flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium"
        :class="dark ? 'border-white/25 bg-white/10' : 'border-slate-300 bg-white/60'"
      >
        <span
          v-init-text="badge.text"
          contenteditable="true"
          spellcheck="false"
          class="outline-none"
          @input="badge.text = ($event.target as HTMLElement).textContent ?? ''"
          @paste="pastePlain"
          @keydown.enter.prevent
        ></span>
        <button
          v-if="selected"
          class="-mr-1 rounded-full p-0.5 opacity-60 hover:opacity-100"
          title="Retirer le badge"
          @click.stop="block.badges.splice(block.badges.indexOf(badge), 1)"
        >
          <X :size="11" />
        </button>
      </span>
      <button
        v-if="selected"
        class="flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-xs font-medium opacity-70 hover:opacity-100"
        :class="dark ? 'border-white/40' : 'border-slate-400'"
        @click.stop="block.badges.push({ id: uid(), text: 'Nouveau badge' })"
      >
        <Plus :size="11" /> Badge
      </button>
    </div>

    <div v-if="selected" class="mt-6 flex w-fit items-center gap-2 rounded-lg bg-white/95 p-2 shadow" @click.stop>
      <span class="px-1 text-xs font-medium text-slate-600">Fond</span>
      <button
        v-for="c in swatches"
        :key="c"
        class="size-5 rounded-full border border-slate-300"
        :class="block.bg === c && 'ring-2 ring-sky-600 ring-offset-1'"
        :style="{ backgroundColor: c }"
        :title="c"
        @click="block.bg = c"
      />
      <input
        v-model="block.bg"
        type="color"
        aria-label="Couleur de fond personnalisée"
        class="size-6 cursor-pointer rounded border border-slate-300"
      />
    </div>
  </div>
</template>
