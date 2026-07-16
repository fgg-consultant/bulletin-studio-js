<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { Check, Download, FileText, Monitor, Printer, Smartphone } from 'lucide-vue-next'
import Canvas from './components/Canvas.vue'
import Sidebar from './components/Sidebar.vue'
import { doc, exportJson, exportPdf, ui } from './store'

const modes = [
  { v: 'desktop', icon: Monitor, title: 'Aperçu écran (large)' },
  { v: 'pdf', icon: FileText, title: 'Aperçu PDF' },
  { v: 'mobile', icon: Smartphone, title: 'Aperçu mobile' },
] as const

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') ui.selectedId = null
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="bs-app flex h-screen flex-col bg-white text-slate-800 antialiased">
    <header class="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 px-4">
      <div class="flex items-center gap-2">
        <div class="flex size-7 items-center justify-center rounded-md bg-sky-700 text-sm font-bold text-white">B</div>
        <span class="text-sm font-semibold tracking-tight">Bulletin Studio</span>
      </div>
      <div class="h-5 w-px bg-slate-200" />
      <input
        v-model="doc.title"
        name="title"
        aria-label="Titre du bulletin"
        class="w-64 rounded-md px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:bg-white focus:outline-2 focus:outline-sky-600"
        placeholder="Titre du bulletin"
      />
      <span class="flex items-center gap-1 text-xs text-slate-400">
        <Check v-if="ui.saved" :size="13" />
        {{ ui.saved ? 'Enregistré' : 'Enregistrement…' }}
      </span>

      <div class="ml-auto flex items-center gap-3">
        <div class="flex rounded-lg border border-slate-200 p-0.5">
          <button
            v-for="m in modes"
            :key="m.v"
            class="rounded-md p-1.5"
            :class="ui.device === m.v ? 'bg-sky-50 text-sky-700' : 'text-slate-400 hover:text-slate-600'"
            :title="m.title"
            @click="ui.device = m.v"
          >
            <component :is="m.icon" :size="16" />
          </button>
        </div>
        <button
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          title="Télécharger le document en JSON"
          @click="exportJson"
        >
          <Download :size="15" />
          JSON
        </button>
        <button
          class="flex items-center gap-1.5 rounded-lg bg-sky-700 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-sky-800"
          @click="exportPdf"
        >
          <Printer :size="15" />
          Exporter PDF
        </button>
      </div>
    </header>

    <div class="flex min-h-0 flex-1">
      <Sidebar />
      <Canvas />
    </div>
  </div>
</template>
