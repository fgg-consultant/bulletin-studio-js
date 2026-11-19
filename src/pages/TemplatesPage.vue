<script setup lang="ts">
/** Les modèles : chacun avec son rythme, ses brouillons automatiques, son produit, ses
 *  numéros, et de quoi en faire un nouveau. */
import { computed, onMounted, ref } from 'vue'
import { ChevronRight, Clock, LayoutTemplate, Plus } from 'lucide-vue-next'
import type { BulletinMeta } from '../api'
import { describe, issuesOf, schedule, statusOf, templatesOf } from '../catalog'
import { formatDayOf, t } from '../i18n'
import { library, refresh } from '../library'
import { openNewPublication } from '../newPublication'
import { href } from '../router'
import type { Kind } from '../types'
import Breadcrumbs from '../components/studio/Breadcrumbs.vue'
import KindTile from '../components/studio/KindTile.vue'
import StudioLayout from '../components/studio/StudioLayout.vue'

onMounted(refresh)

const filter = ref<'all' | Kind>('all')
const all = computed(() => templatesOf(library.items))
const shown = computed(() => all.value.filter((tpl) => filter.value === 'all' || tpl.kind === filter.value))
const filters = computed(() =>
  (['all', 'bulletin', 'flash'] as const).map((key) => ({
    key,
    label: t(`filters.${key}`),
    count: key === 'all' ? all.value.length : all.value.filter((tpl) => tpl.kind === key).length,
  })),
)

/** « 31 numéros », et le dernier : « N° 31 · 1–10 nov. 2026, publié le 1 nov. » */
function summarize(tpl: BulletinMeta) {
  const list = issuesOf(library.items, tpl.id)
  const last = list[0]
  const count = t(tpl.kind === 'flash' ? 'count.flashes' : 'count.issues', { count: list.length })
  if (!last) return { count, last: t('templates.noIssue') }
  const state = statusOf(last)
  const when =
    state === 'draft' ? t(last.preparedAt ? 'templates.autoDraft' : 'templates.draft') : t('templates.publishedOn', { date: formatDayOf(last.publishedAt ?? 0) })
  return { count, last: t('templates.last', { issue: describe(last).detail, state: when }) }
}
const summaries = computed(() => new Map(all.value.map((tpl) => [tpl.id, summarize(tpl)])))
</script>

<template>
  <StudioLayout section="templates">
    <Breadcrumbs :items="[{ label: t('nav.home'), href: href({ name: 'home' }) }, { label: t('nav.templates') }]" />

    <div class="flex flex-wrap items-end gap-x-6 gap-y-3">
      <div class="min-w-0 flex-[1_1_420px]">
        <h1 class="m-0 text-2xl font-bold text-slate-900">{{ t('templates.title') }}</h1>
        <p class="m-0 mt-1 text-slate-500">{{ t('templates.intro') }}</p>
      </div>
      <a :href="href({ name: 'newTemplate' })" class="bs-btn bs-btn-outline">
        <Plus :size="16" aria-hidden="true" />
        {{ t('templates.new') }}
      </a>
    </div>

    <div v-if="all.length" role="group" :aria-label="t('filters.byType')" class="flex flex-wrap gap-2">
      <button
        v-for="f in filters"
        :key="f.key"
        type="button"
        :aria-pressed="filter === f.key"
        class="bs-focus min-h-9 cursor-pointer rounded-full border px-3.5 font-medium"
        :class="filter === f.key ? 'border-sky-700 bg-sky-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'"
        @click="filter = f.key"
      >
        {{ f.label }} <span class="opacity-75">{{ f.count }}</span>
      </button>
    </div>

    <ul v-if="shown.length" class="m-0 flex list-none flex-col gap-2.5 p-0">
      <li
        v-for="tpl in shown"
        :key="tpl.id"
        class="bs-card flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4"
      >
        <KindTile :kind="tpl.kind" template size="md" />
        <div class="flex min-w-0 flex-[1_1_340px] flex-col gap-0.5">
          <a :href="href({ name: 'template', id: tpl.id })" class="text-[15px] font-semibold text-slate-900 hover:text-sky-800 hover:underline">
            {{ tpl.title }}
          </a>
          <span class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-slate-500">
            <span class="font-medium" :class="tpl.kind === 'flash' ? 'text-violet-700' : 'text-sky-700'">
              {{ t(`kind.${tpl.kind}`) }}
            </span>
            <span>{{ tpl.kind === 'flash' ? t('schedule.onDemand') : t(`cadence.${tpl.cadence}`) }}</span>
            <span class="flex items-center gap-1">
              <Clock :size="13" aria-hidden="true" />
              {{ schedule(tpl) ? t('templates.draftSchedule', { schedule: schedule(tpl)! }) : t('schedule.none') }}
            </span>
            <span>{{ t('templates.product', { title: tpl.parentTitle }) }}</span>
          </span>
        </div>
        <a :href="href({ name: 'template', id: tpl.id })" class="flex min-w-0 flex-[0_1_240px] flex-col text-slate-800 hover:text-sky-800">
          <span class="font-semibold">{{ summaries.get(tpl.id)?.count }}</span>
          <span class="truncate text-[13px] text-slate-500">{{ summaries.get(tpl.id)?.last }}</span>
        </a>
        <button
          type="button"
          class="bs-btn bs-btn-secondary text-sky-700!"
          @click="openNewPublication({ kind: tpl.kind, templateId: tpl.id })"
        >
          <Plus :size="15" aria-hidden="true" />
          {{ t(tpl.kind === 'flash' ? 'templates.newFlash' : 'templates.newIssue') }}
        </button>
        <a
          :href="href({ name: 'template', id: tpl.id })"
          :aria-label="t('templates.open', { title: tpl.title })"
          class="bs-btn bs-btn-icon"
        >
          <ChevronRight :size="18" class="rtl:rotate-180" aria-hidden="true" />
        </a>
      </li>
    </ul>

    <div
      v-else-if="library.loaded && !all.length"
      class="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-12 text-center"
    >
      <span class="rounded-full bg-amber-50 p-4 text-amber-700" aria-hidden="true"><LayoutTemplate :size="24" /></span>
      <p class="m-0 font-medium text-slate-700">{{ t('templates.empty') }}</p>
      <p class="m-0 max-w-sm text-slate-500">{{ t('templates.emptyHint') }}</p>
      <a :href="href({ name: 'newTemplate' })" class="bs-btn bs-btn-primary mt-2">
        <Plus :size="16" aria-hidden="true" />
        {{ t('templates.create') }}
      </a>
    </div>
  </StudioLayout>
</template>
