<script setup lang="ts">
/** Un modèle et ses numéros : ses réglages en clair, son prochain brouillon
 *  automatique, et la liste de ce qui en est issu, année par année. */
import { computed, onMounted, ref, watch } from 'vue'
import { AlarmClock, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import { siteTimeZone, type BulletinMeta } from '../api'
import { describe, issuesOf, schedule, shortPeriod, issueNumber } from '../catalog'
import { siteToday } from '../fields'
import { formatDayAt, formatShortDay, formatWhen, t } from '../i18n'
import { library, refresh, remove } from '../library'
import { openNewPublication, periodLabel } from '../newPublication'
import { go, href } from '../router'
import Breadcrumbs from '../components/studio/Breadcrumbs.vue'
import KindTile from '../components/studio/KindTile.vue'
import StatusPills from '../components/studio/StatusPills.vue'
import StudioLayout from '../components/studio/StudioLayout.vue'

const props = defineProps<{ id: number }>()

onMounted(refresh)

/** les numéros montrés d'un coup, puis à chaque « Afficher les précédents » */
const PAGE = 25

const tpl = computed(() => library.items.find((b) => b.id === props.id && b.isTemplate) ?? null)
const flash = computed(() => tpl.value?.kind === 'flash')
const issues = computed(() => issuesOf(library.items, props.id))

const years = computed(() => [...new Set(issues.value.map((b) => (b.date ?? '').slice(0, 4)).filter(Boolean))])
const year = ref('')
// l'année la plus récente, tant que l'auteur n'en a pas choisi une autre qui existe
watch(years, (ys) => {
  if (!ys.includes(year.value)) year.value = ys[0] ?? ''
}, { immediate: true })

const ofYear = computed(() => issues.value.filter((b) => (b.date ?? '').startsWith(year.value)))
const limit = ref(PAGE)
watch(year, () => (limit.value = PAGE))
const shown = computed(() => ofYear.value.slice(0, limit.value))
const hidden = computed(() => Math.min(PAGE, ofYear.value.length - shown.value.length))

/** « 31 en 2026, tous publiés » */
const summary = computed(() => {
  if (!ofYear.value.length) return t('template.noIssue')
  const drafts = ofYear.value.filter((b) => !b.live).length
  const count = t('template.inYear', { count: ofYear.value.length, year: year.value })
  return drafts ? t('template.withDrafts', { issues: count, count: drafts }) : t('template.allPublished', { issues: count })
})

const nextDraft = computed(() => {
  const next = tpl.value?.nextDraft
  if (!next || !tpl.value) return null
  return {
    when: formatDayAt(next.at.slice(0, 10), next.at.slice(11, 16), siteToday()),
    issue: periodLabel(tpl.value.kind, tpl.value.cadence, next),
  }
})

const trail = computed(() => [
  { label: t('nav.home'), href: href({ name: 'home' }) },
  { label: t('nav.templates'), href: href({ name: 'templates' }) },
  { label: tpl.value?.title ?? '…' },
])

const error = ref<string | null>(null)

async function removeTemplate(b: BulletinMeta) {
  if (!confirm(t('template.confirmDelete', { title: b.title }))) return
  try {
    await remove(b.id)
    go({ name: 'templates' })
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function removeIssue(b: BulletinMeta) {
  if (!confirm(t('bulletins.confirmDelete', { title: b.title }))) return
  try {
    await remove(b.id)
  } catch (e) {
    error.value = (e as Error).message
  }
}
</script>

<template>
  <StudioLayout section="templates">
    <Breadcrumbs :items="trail" />

    <p v-if="error" role="alert" class="m-0 rounded-lg bg-red-50 px-4 py-2 text-red-700">{{ error }}</p>

    <div v-if="library.loaded && !tpl" class="bs-card px-6 py-10 text-center">
      <p class="m-0 font-medium text-slate-700">{{ t('template.notFound') }}</p>
      <a :href="href({ name: 'templates' })" class="mt-3 inline-block text-sky-700 hover:underline">{{ t('template.backToList') }}</a>
    </div>

    <template v-else-if="tpl">
      <section aria-labelledby="bs-template-title" class="bs-card p-6">
        <div class="flex flex-wrap items-start gap-4">
          <KindTile :kind="tpl.kind" template size="lg" />
          <div class="min-w-0 flex-[1_1_380px]">
            <div class="mb-1.5 flex flex-wrap gap-1.5">
              <span class="bs-pill bg-amber-100 font-semibold! text-amber-800">{{ t('status.template') }}</span>
              <span
                class="bs-pill font-semibold!"
                :class="flash ? 'bg-violet-100 text-violet-800' : 'bg-sky-100 text-sky-800'"
              >
                {{ t(`kind.${tpl.kind}`) }}
              </span>
              <span v-if="!flash" class="bs-pill bg-slate-100 font-semibold! text-slate-600">{{ t(`cadence.${tpl.cadence}`) }}</span>
            </div>
            <h1 id="bs-template-title" class="m-0 text-2xl font-bold break-words text-slate-900">{{ tpl.title }}</h1>
          </div>
          <div class="flex flex-wrap gap-2">
            <a :href="href({ name: 'editor', id: tpl.id })" class="bs-btn bs-btn-secondary">
              <Pencil :size="15" aria-hidden="true" />
              {{ t('template.edit') }}
            </a>
            <button type="button" class="bs-btn bs-btn-primary" @click="openNewPublication({ kind: tpl.kind, templateId: tpl.id })">
              <Plus :size="15" aria-hidden="true" />
              {{ t(flash ? 'templates.newFlash' : 'templates.newIssue') }}
            </button>
            <button
              type="button"
              class="bs-btn bs-btn-icon bs-btn-danger"
              :aria-label="t('template.delete')"
              :title="t('template.delete')"
              @click="removeTemplate(tpl)"
            >
              <Trash2 :size="16" aria-hidden="true" />
            </button>
          </div>
        </div>

        <dl class="m-0 mt-5 flex flex-wrap gap-x-10 gap-y-4 border-t border-slate-100 pt-5">
          <div class="flex-[1_1_200px]">
            <dt class="text-[13px] text-slate-500">{{ t('template.product') }}</dt>
            <dd class="m-0 mt-0.5 font-medium">{{ tpl.parentTitle }}</dd>
          </div>
          <div class="flex-[1_1_200px]">
            <dt class="text-[13px] text-slate-500">{{ t('template.autoDraft') }}</dt>
            <dd class="m-0 mt-0.5 font-medium">
              <template v-if="schedule(tpl)">
                <span class="inline-block first-letter:uppercase">{{ schedule(tpl) }}</span>
                <span v-if="siteTimeZone" class="font-normal text-slate-500"> ({{ siteTimeZone }})</span>
              </template>
              <template v-else>{{ t(flash ? 'schedule.onDemand' : 'template.noAutoDraft') }}</template>
            </dd>
          </div>
          <div class="flex-[1_1_200px]">
            <dt class="text-[13px] text-slate-500">{{ t(flash ? 'template.flashes' : 'template.issues') }}</dt>
            <dd class="m-0 mt-0.5 font-medium">{{ summary }}</dd>
          </div>
          <div class="flex-[1_1_200px]">
            <dt class="text-[13px] text-slate-500">{{ t('template.modified') }}</dt>
            <dd class="m-0 mt-0.5 font-medium">{{ tpl.updatedAt ? formatWhen(tpl.updatedAt) : '—' }}</dd>
          </div>
        </dl>
      </section>

      <p v-if="nextDraft" class="m-0 flex items-center gap-2.5 rounded-[10px] border border-sky-200 bg-sky-50 px-4 py-3 text-sky-900">
        <AlarmClock :size="18" class="shrink-0" aria-hidden="true" />
        <span>
          {{ t('template.nextDraft') }}
          <strong class="font-semibold">{{ nextDraft.when }}</strong>, {{ nextDraft.issue }}.
        </span>
      </p>

      <section aria-labelledby="bs-issues-title" class="bs-card">
        <div class="flex flex-wrap items-center gap-3 px-5 py-4">
          <h2 id="bs-issues-title" class="m-0 text-base font-semibold text-slate-900">
            {{ t(flash ? 'template.flashesTitle' : 'template.issuesTitle') }}
          </h2>
          <label v-if="years.length > 1" class="ms-auto flex items-center gap-2 text-[13px] text-slate-600">
            {{ t('template.year') }}
            <select v-model="year" class="bs-input w-auto!">
              <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
            </select>
          </label>
        </div>

        <div v-if="shown.length" class="overflow-x-auto">
          <table class="w-full min-w-[760px] border-collapse">
            <thead>
              <tr class="bg-slate-50 text-start text-xs text-slate-600">
                <template v-if="!flash">
                  <th scope="col" class="px-5 py-2.5 text-start font-semibold">{{ t('template.col.number') }}</th>
                  <th scope="col" class="px-3 py-2.5 text-start font-semibold">{{ t('template.col.period') }}</th>
                </template>
                <th v-else scope="col" class="px-5 py-2.5 text-start font-semibold">{{ t('template.col.date') }}</th>
                <th scope="col" class="px-3 py-2.5 text-start font-semibold">{{ t('template.col.status') }}</th>
                <th scope="col" class="px-3 py-2.5 text-start font-semibold">{{ t('template.col.published') }}</th>
                <th scope="col" class="px-3 py-2.5 text-start font-semibold">{{ t('template.col.modified') }}</th>
                <th scope="col" class="px-5 py-2.5"><span class="sr-only">{{ t('template.col.actions') }}</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in shown" :key="b.id" class="border-t border-slate-100">
                <template v-if="!flash">
                  <td class="px-5 py-3">
                    <a :href="href({ name: 'editor', id: b.id })" class="font-semibold text-sky-700 hover:underline">
                      {{ issueNumber(b) !== null ? t('issue.number', { number: issueNumber(b)! }) : describe(b).detail }}
                    </a>
                  </td>
                  <td class="px-3 py-3">{{ shortPeriod(b) }}</td>
                </template>
                <td v-else class="px-5 py-3">
                  <a :href="href({ name: 'editor', id: b.id })" class="font-semibold text-sky-700 hover:underline">
                    {{ formatShortDay(b.date) }}
                  </a>
                </td>
                <td class="px-3 py-3">
                  <StatusPills :live="b.live" :has-unpublished-changes="b.hasUnpublishedChanges" split />
                </td>
                <td class="px-3 py-3 text-slate-600">{{ b.publishedAt ? formatWhen(b.publishedAt) : '—' }}</td>
                <td class="px-3 py-3 text-slate-600">{{ b.updatedAt ? formatWhen(b.updatedAt) : '—' }}</td>
                <td class="px-5 py-2 text-end whitespace-nowrap">
                  <span class="inline-flex items-center gap-1">
                    <a :href="href({ name: 'editor', id: b.id })" class="bs-focus rounded px-1.5 py-1 font-medium text-sky-700 hover:underline">
                      {{ t('template.openIssue') }}
                    </a>
                    <a
                      v-if="b.url"
                      :href="b.url"
                      target="_blank"
                      rel="noopener"
                      class="bs-focus inline-flex items-center gap-1 rounded px-1.5 py-1 font-medium text-sky-700 hover:underline"
                    >
                      {{ t('template.viewOnline') }}
                      <ExternalLink :size="13" aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      class="bs-btn bs-btn-icon bs-btn-danger min-h-8! min-w-8!"
                      :aria-label="t('bulletins.delete', { title: b.title })"
                      :title="t('bulletins.delete', { title: b.title })"
                      @click="removeIssue(b)"
                    >
                      <Trash2 :size="15" aria-hidden="true" />
                    </button>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="m-0 border-t border-slate-100 px-5 py-4 text-slate-500">{{ t('template.noIssueYet') }}</p>

        <div v-if="hidden > 0" class="border-t border-slate-100 px-5 pt-3 pb-4">
          <button type="button" class="bs-btn bs-btn-secondary" @click="limit += PAGE">
            {{ t('template.more', { count: hidden }) }}
          </button>
        </div>
      </section>
    </template>
  </StudioLayout>
</template>
