<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { AlarmClock, Check, Download, ExternalLink, FileText, Monitor, Printer, Smartphone, Upload } from 'lucide-vue-next'
import { siteTimeZone } from '../api'
import { t } from '../i18n'
import { go } from '../router'
import { doc, exportJson, exportPdf, openBulletin, publishCurrent, ui } from '../store'
import Canvas from './Canvas.vue'
import Sidebar from './Sidebar.vue'

const props = defineProps<{ id: string }>()

watch(
  () => props.id,
  async (id) => {
    if (!(await openBulletin(Number(id)))) go('#/')
  },
  { immediate: true },
)

const modes = [
  { v: 'desktop', icon: Monitor, title: 'editor.previewDesktop' },
  { v: 'pdf', icon: FileText, title: 'editor.previewPdf' },
  { v: 'mobile', icon: Smartphone, title: 'editor.previewMobile' },
] as const

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') ui.selectedId = null
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="bs-app flex h-full flex-col bg-white text-slate-800 antialiased">
    <header class="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 px-4">
      <a href="#/" class="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-slate-50" :title="t('editor.back')">
        <div class="flex size-7 items-center justify-center rounded-md bg-sky-700 text-sm font-bold text-white">B</div>
        <span class="text-sm font-semibold tracking-tight">Bulletin Studio</span>
      </a>
      <div class="h-5 w-px bg-slate-200" />
      <input
        v-model="doc.title"
        name="title"
        :aria-label="t('editor.title')"
        class="w-64 rounded-md px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:bg-white focus:outline-2 focus:outline-sky-600"
        :placeholder="t('editor.title')"
      />
      <span class="flex items-center gap-1 text-xs text-slate-400">
        <Check v-if="ui.saved" :size="13" />
        {{ t(ui.saved ? 'editor.saved' : 'editor.saving') }}
      </span>
      <span
        v-if="doc.isTemplate"
        class="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
        :title="t('editor.templateHint')"
      >
        {{ t('status.template') }}
      </span>
      <label
        v-if="doc.isTemplate"
        class="flex items-center gap-1.5 text-xs whitespace-nowrap text-slate-500"
        :title="t('editor.dailyDraftHint', { tz: siteTimeZone })"
      >
        <AlarmClock :size="14" class="text-slate-400" />
        {{ t('editor.dailyDraft') }}
        <!-- par quart d'heure : le serveur prépare les brouillons à :00, :15, :30, :45.
             Les ! : input[type=time] de wagtail est plus spécifique qu'une classe -->
        <input
          v-model="doc.dailyDraftAt"
          type="time"
          step="900"
          name="daily-draft"
          class="min-h-0! w-auto! rounded border border-slate-200 px-1.5! py-0.5! text-xs! text-slate-700 focus:outline-1 focus:outline-sky-600"
        />
        <span class="text-slate-400">{{ siteTimeZone }}</span>
      </label>
      <span v-else class="text-xs font-medium" :class="doc.live ? 'text-emerald-700' : 'text-slate-400'">
        {{
          doc.live
            ? t(doc.hasUnpublishedChanges ? 'status.publishedPending' : 'status.published')
            : t('status.draft')
        }}
      </span>

      <div class="ml-auto flex items-center gap-3">
        <div class="flex rounded-lg border border-slate-200 p-0.5">
          <button
            v-for="m in modes"
            :key="m.v"
            class="rounded-md p-1.5"
            :class="ui.device === m.v ? 'bg-sky-50 text-sky-700' : 'text-slate-400 hover:text-slate-600'"
            :title="t(m.title)"
            @click="ui.device = m.v"
          >
            <component :is="m.icon" :size="16" />
          </button>
        </div>
        <button
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          :title="t('editor.jsonHint')"
          @click="exportJson"
        >
          <Download :size="15" />
          {{ t('editor.json') }}
        </button>
        <button
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          @click="exportPdf"
        >
          <Printer :size="15" />
          {{ t('editor.pdf') }}
        </button>
        <a
          v-if="doc.url"
          :href="doc.url"
          target="_blank"
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          :title="t('editor.viewHint')"
        >
          <ExternalLink :size="15" />
          {{ t('editor.view') }}
        </a>
        <button
          v-if="!doc.isTemplate"
          class="flex items-center gap-1.5 rounded-lg bg-sky-700 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
          :disabled="doc.live && !doc.hasUnpublishedChanges"
          :title="t('editor.publishHint')"
          @click="publishCurrent"
        >
          <Upload :size="15" />
          {{ t('editor.publish') }}
        </button>
      </div>
    </header>

    <p v-if="ui.error" class="shrink-0 bg-red-50 px-4 py-2 text-sm text-red-700">{{ ui.error }}</p>

    <div class="flex min-h-0 flex-1">
      <Sidebar />
      <Canvas />
    </div>
  </div>
</template>
