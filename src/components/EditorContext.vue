<script setup lang="ts">
/** La deuxième ligne de l'éditeur dit ce qu'on modifie, dans la couleur de sa nature :
 *  le numéro d'un bulletin (sa période, son état), un flash (son jour), un modèle (son
 *  rythme et ses brouillons automatiques — ambre : ce n'est pas une publication), ou
 *  une publication sans modèle (son jour, à choisir). Et son titre. */
import { computed } from 'vue'
import { CalendarDays, CalendarRange, FileText, Info, LayoutTemplate, Megaphone } from 'lucide-vue-next'
import { siteTimeZone } from '../api'
import { issueNumber, longPeriod } from '../catalog'
import { inLocalTime } from '../clock'
import { t } from '../i18n'
import { doc, standalone } from '../store'
import type { Cadence } from '../types'
import StatusPills from './studio/StatusPills.vue'

const flash = computed(() => doc.kind === 'flash')

const tone = computed(() =>
  doc.isTemplate
    ? { bar: 'border-amber-200 bg-amber-50', badge: 'bg-amber-700', text: 'text-amber-900', field: 'border-amber-300' }
    : flash.value
      ? { bar: 'border-violet-200 bg-violet-50', badge: 'bg-violet-700', text: 'text-violet-900', field: 'border-violet-200' }
      : { bar: 'border-sky-200 bg-sky-50', badge: 'bg-sky-700', text: 'text-sky-900', field: 'border-sky-200' },
)

const badge = computed(() => {
  if (doc.isTemplate) return { icon: flash.value ? Megaphone : LayoutTemplate, label: flash.value ? 'context.flashTemplate' : 'context.bulletinTemplate' }
  return { icon: flash.value ? Megaphone : FileText, label: `kind.${doc.kind}` }
})

const number = computed(() => issueNumber(doc))
const period = computed(() => longPeriod(doc))

const cadences: Cadence[] = ['daily', 'dekadal', 'monthly']
const draftLocal = computed(() => inLocalTime(doc.draftAt, siteTimeZone))

/** wagtail dessine ses propres champs : plus hauts, plus spécifiques qu'une classe */
const field = 'min-h-8! rounded-md! border! bg-white! px-2! py-0! text-[13px]! text-slate-800! focus-visible:outline-2 focus-visible:outline-sky-600'
</script>

<template>
  <div class="flex min-h-[52px] flex-wrap items-center gap-x-3.5 gap-y-2 border-b px-4 py-2" :class="tone.bar">
    <span class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold whitespace-nowrap text-white" :class="tone.badge">
      <component :is="badge.icon" :size="14" aria-hidden="true" />
      {{ t(badge.label) }}
    </span>

    <!-- un modèle : son rythme, ses brouillons, et ce que le modifier ne change pas -->
    <template v-if="doc.isTemplate">
      <label class="flex items-center gap-1.5 text-[13px] whitespace-nowrap" :class="tone.text">
        {{ t('context.templateName') }}
        <input v-model="doc.title" name="title" class="w-64" :class="[field, tone.field]" />
      </label>
      <template v-if="!flash">
        <label class="flex items-center gap-1.5 text-[13px] whitespace-nowrap" :class="tone.text" :title="t('editor.cadenceHint')">
          <CalendarRange :size="14" aria-hidden="true" />
          {{ t('context.cadence') }}
          <select v-model="doc.cadence" name="cadence" class="appearance-auto! bg-none! pe-1!" :class="[field, tone.field]">
            <option v-for="c in cadences" :key="c" :value="c">{{ t(`cadence.${c}`) }}</option>
          </select>
        </label>
        <label
          class="flex items-center gap-1.5 text-[13px] whitespace-nowrap"
          :class="tone.text"
          :title="t(`editor.draftHint.${doc.cadence}`, { tz: siteTimeZone })"
        >
          {{ t('context.autoDraft') }}
          <!-- par quart d'heure : le serveur prépare les brouillons à :00, :15, :30, :45 -->
          <input v-model="doc.draftAt" type="time" step="900" name="draft-at" class="w-auto!" :class="[field, tone.field]" />
          <span class="text-amber-800">
            {{ siteTimeZone }}<template v-if="draftLocal"> · {{ t('editor.draftLocal', { time: draftLocal }) }}</template>
          </span>
        </label>
      </template>
      <span class="ms-auto flex items-center gap-1.5 text-[13px]" :class="tone.text">
        <Info :size="15" class="shrink-0" aria-hidden="true" />
        {{ doc.issueCount ? t('context.templateNote', { count: doc.issueCount }) : t('context.templateNoteEmpty') }}
      </span>
    </template>

    <!-- une publication : de quand, et où elle en est -->
    <template v-else>
      <span v-if="number !== null" class="text-[15px] font-bold" :class="tone.text">{{ t('issue.number', { number }) }}</span>
      <span v-if="standalone" class="bs-pill border bg-white" :class="[tone.field, tone.text]">{{ t('filters.noTemplate') }}</span>
      <label v-if="standalone" class="flex items-center gap-1.5 text-[13px] whitespace-nowrap" :class="tone.text">
        {{ t('newPublication.date') }}
        <input v-model="doc.date" type="date" name="date" required class="w-auto!" :class="[field, tone.field]" />
      </label>
      <span v-else-if="period" class="flex items-center gap-1.5" :class="[tone.text, flash && 'font-semibold']">
        <CalendarDays :size="15" class="shrink-0" aria-hidden="true" />
        <!-- « samedi 8 novembre 2026 » commence la ligne : la majuscule, que seul un
             bloc ou un inline-block prend -->
        <span class="inline-block first-letter:uppercase">{{ period }}</span>
      </span>
      <span v-if="standalone && doc.parentTitle" class="text-[13px] whitespace-nowrap" :class="tone.text">
        {{ t('templates.product', { title: doc.parentTitle }) }}
      </span>
      <StatusPills :live="doc.live" :has-unpublished-changes="doc.hasUnpublishedChanges" :published-at="doc.publishedAt" split />
      <label class="ms-auto flex items-center gap-2 text-[13px]" :class="tone.text">
        {{ t('context.title') }}
        <input v-model="doc.title" name="title" class="w-[380px] max-w-full" :class="[field, tone.field]" :placeholder="t('editor.title')" />
      </label>
    </template>
  </div>
</template>
