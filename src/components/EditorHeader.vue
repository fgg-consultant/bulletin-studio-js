<script setup lang="ts">
/** La première ligne de l'éditeur : le chemin jusqu'au document (Accueil › Modèles ›
 *  le modèle › ce numéro), l'enregistrement, les aperçus et exports, et l'action
 *  principale — publier un numéro, faire un numéro d'un modèle. */
import { computed } from 'vue'
import { Check, Download, ExternalLink, FileText, Monitor, Plus, Printer, Smartphone, Upload } from 'lucide-vue-next'
import { crumb } from '../catalog'
import { t } from '../i18n'
import { openNewPublication } from '../newPublication'
import { href } from '../router'
import { doc, exportJson, exportPdf, publishCurrent, ui } from '../store'
import Breadcrumbs from './studio/Breadcrumbs.vue'

/** un flash : un carré, ni aperçus d'écran ni PDF */
const flash = computed(() => doc.kind === 'flash')

const trail = computed(() => {
  const home = { label: t('nav.home'), href: href({ name: 'home' }) }
  const templates = { label: t('nav.templates'), href: href({ name: 'templates' }) }
  if (doc.isTemplate && doc.id)
    return [home, templates, { label: doc.title, href: href({ name: 'template', id: doc.id }) }, { label: crumb(doc) }]
  if (doc.template)
    return [home, templates, { label: doc.template.title, href: href({ name: 'template', id: doc.template.id }) }, { label: crumb(doc) }]
  return [home, { label: t('nav.bulletins'), href: href({ name: 'bulletins', query: {} }) }, { label: doc.title || t('editor.untitled') }]
})

/** publier, publier les modifications, ou rien : la version en ligne est la dernière */
const publish = computed(() => {
  if (ui.publishing) return { label: 'editor.publishing', icon: Upload, disabled: true }
  if (!doc.live) return { label: 'editor.publish', icon: Upload, disabled: false }
  if (doc.hasUnpublishedChanges) return { label: 'editor.publishChanges', icon: Upload, disabled: false }
  return { label: 'editor.upToDate', icon: Check, disabled: true }
})

const modes = [
  { v: 'desktop', icon: Monitor, title: 'editor.previewDesktop' },
  { v: 'pdf', icon: FileText, title: 'editor.previewPdf' },
  { v: 'mobile', icon: Smartphone, title: 'editor.previewMobile' },
] as const
</script>

<template>
  <div class="flex h-14 items-center gap-3.5 border-b border-slate-200 px-4">
    <a
      :href="href({ name: 'home' })"
      :aria-label="t('nav.studioHome')"
      :title="t('nav.studioHome')"
      class="bs-focus flex size-7 shrink-0 items-center justify-center rounded-md bg-sky-700 text-sm font-bold text-white hover:bg-sky-800 hover:text-white"
    >
      B
    </a>
    <Breadcrumbs :items="trail" />
    <span class="flex shrink-0 items-center gap-1 text-xs whitespace-nowrap text-slate-500" role="status">
      <Check v-if="ui.saved" :size="13" aria-hidden="true" />
      {{ t(ui.saved ? 'editor.saved' : 'editor.saving') }}
    </span>

    <div class="ms-auto flex shrink-0 items-center gap-1.5">
      <div v-if="!flash" role="group" :aria-label="t('editor.preview')" class="flex rounded-lg border border-slate-200 p-0.5">
        <button
          v-for="m in modes"
          :key="m.v"
          type="button"
          class="bs-focus cursor-pointer rounded-md p-1.5"
          :class="ui.device === m.v ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:text-slate-700'"
          :aria-pressed="ui.device === m.v"
          :aria-label="t(m.title)"
          :title="t(m.title)"
          @click="ui.device = m.v"
        >
          <component :is="m.icon" :size="16" aria-hidden="true" />
        </button>
      </div>
      <button type="button" class="bs-btn min-h-[34px]! px-2.5! font-medium! text-slate-600 hover:bg-slate-50" :title="t('editor.jsonHint')" @click="exportJson">
        <Download :size="15" aria-hidden="true" />
        {{ t('editor.json') }}
      </button>
      <button v-if="!flash" type="button" class="bs-btn min-h-[34px]! px-2.5! font-medium! text-slate-600 hover:bg-slate-50" @click="exportPdf">
        <Printer :size="15" aria-hidden="true" />
        {{ t('editor.pdf') }}
      </button>
      <a
        v-if="doc.url"
        :href="doc.url"
        target="_blank"
        rel="noopener"
        class="bs-btn min-h-[34px]! px-2.5! font-medium! text-slate-600 hover:bg-slate-50 hover:text-slate-700"
        :title="t('editor.viewHint')"
      >
        <ExternalLink :size="15" aria-hidden="true" />
        {{ t('editor.viewOnline') }}
      </a>

      <!-- un modèle ne se publie pas : on en fait des numéros -->
      <button
        v-if="doc.isTemplate && doc.id"
        type="button"
        class="bs-btn bs-btn-primary min-h-9!"
        @click="openNewPublication({ kind: doc.kind, templateId: doc.id })"
      >
        <Plus :size="15" aria-hidden="true" />
        {{ t(flash ? 'templates.newFlash' : 'templates.newIssue') }}
      </button>
      <button
        v-else
        type="button"
        class="bs-btn bs-btn-primary min-h-9!"
        :disabled="publish.disabled"
        :title="t(flash ? 'editor.publishFlashHint' : 'editor.publishHint')"
        @click="publishCurrent"
      >
        <component :is="publish.icon" :size="15" aria-hidden="true" />
        {{ t(publish.label) }}
      </button>
    </div>
  </div>
</template>
