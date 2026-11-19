<script setup lang="ts">
/** Toutes les publications, bulletins et flashs, d'un modèle ou sans : à chercher par
 *  titre, à filtrer par type, statut et modèle. Les filtres vivent dans l'adresse, si
 *  bien qu'en revenant de l'éditeur on retrouve la liste telle qu'on l'a laissée. */
import { computed, onMounted, ref, watch } from 'vue'
import { Search, Trash2 } from 'lucide-vue-next'
import type { BulletinMeta } from '../api'
import { counts, filterPublications, pageOf, readFilters, templatesOf, writeFilters, type Filters } from '../catalog'
import { formatRecentDay, formatWhen, t } from '../i18n'
import { library, refresh, remove } from '../library'
import { href, replace } from '../router'
import Breadcrumbs from '../components/studio/Breadcrumbs.vue'
import KindTile from '../components/studio/KindTile.vue'
import StatusPills from '../components/studio/StatusPills.vue'
import StudioLayout from '../components/studio/StudioLayout.vue'

const props = defineProps<{ query: Record<string, string> }>()

onMounted(refresh)

const PAGE = 25

const filters = computed(() => readFilters(props.query))

/** un filtre changé ramène à la première page */
function set(patch: Partial<Filters>) {
  replace({ name: 'bulletins', query: writeFilters({ ...filters.value, page: 1, ...patch }) })
}

// la recherche suit la frappe, sans réécrire l'adresse à chaque lettre
const q = ref(filters.value.q)
let typing: number | undefined
watch(q, (value) => {
  clearTimeout(typing)
  typing = window.setTimeout(() => set({ q: value }), 250)
})
watch(() => filters.value.q, (value) => {
  if (value !== q.value.trim()) q.value = value
})

const templates = computed(() =>
  templatesOf(library.items).sort((a, b) => a.title.localeCompare(b.title)),
)
const template = computed({
  get: () => String(filters.value.template),
  set: (v: string) => set({ template: v === 'all' || v === 'none' ? v : Number(v) }),
})

const segments = computed(() => [
  {
    label: t('filters.byType'),
    current: filters.value.kind,
    options: [
      { value: 'all', label: t('filters.all') },
      { value: 'bulletin', label: t('filters.bulletin') },
      { value: 'flash', label: t('filters.flash') },
    ],
    pick: (v: string) => set({ kind: v as Filters['kind'] }),
  },
  {
    label: t('filters.byStatus'),
    current: filters.value.status,
    options: [
      { value: 'all', label: t('filters.allStatuses') },
      { value: 'draft', label: t('filters.drafts') },
      { value: 'live', label: t('filters.published') },
    ],
    pick: (v: string) => set({ status: v as Filters['status'] }),
  },
])

const filtered = computed(() => filterPublications(library.items, filters.value))
const page = computed(() => pageOf(filtered.value, filters.value.page, PAGE))
const filtering = computed(() => Object.values(writeFilters({ ...filters.value, page: 1 })).some(Boolean))

/** « 41 publications : 33 bulletins et 8 flashs, dont 3 brouillons. » */
const summary = computed(() => {
  const n = counts(library.items).publications
  const detail = t('bulletins.detail', {
    bulletins: t('count.bulletins', { count: n.bulletin }),
    flashes: t('count.flashes', { count: n.flash }),
  })
  const drafts = n.drafts ? t('bulletins.drafts', { count: n.drafts }) : ''
  return t('bulletins.summary', { count: n.total, detail, drafts })
})

const error = ref<string | null>(null)

async function removePublication(b: BulletinMeta) {
  if (!confirm(t('bulletins.confirmDelete', { title: b.title }))) return
  try {
    await remove(b.id)
  } catch (e) {
    error.value = (e as Error).message
  }
}
</script>

<template>
  <StudioLayout section="bulletins">
    <Breadcrumbs :items="[{ label: t('nav.home'), href: href({ name: 'home' }) }, { label: t('nav.bulletins') }]" />

    <div>
      <h1 class="m-0 text-2xl font-bold text-slate-900">{{ t('bulletins.title') }}</h1>
      <p class="m-0 mt-1 text-slate-500">{{ summary }}</p>
    </div>

    <p v-if="error" role="alert" class="m-0 rounded-lg bg-red-50 px-4 py-2 text-red-700">{{ error }}</p>

    <div class="bs-card flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3.5">
      <label class="relative flex min-w-0 flex-[1_1_240px] items-center">
        <span class="sr-only">{{ t('filters.search') }}</span>
        <Search :size="16" class="pointer-events-none absolute start-3 text-slate-400" aria-hidden="true" />
        <input v-model="q" type="search" :placeholder="t('filters.searchPlaceholder')" class="bs-input [--bs-input-start:2.25rem]" />
      </label>
      <div
        v-for="seg in segments"
        :key="seg.label"
        role="group"
        :aria-label="seg.label"
        class="flex rounded-[9px] bg-slate-100 p-[3px]"
      >
        <button
          v-for="o in seg.options"
          :key="o.value"
          type="button"
          :aria-pressed="seg.current === o.value"
          class="bs-focus min-h-8 cursor-pointer rounded-[7px] px-3 font-medium"
          :class="seg.current === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
          @click="seg.pick(o.value)"
        >
          {{ o.label }}
        </button>
      </div>
      <label class="flex items-center gap-2 text-slate-600">
        {{ t('filters.template') }}
        <select v-model="template" class="bs-input w-auto! max-w-64">
          <option value="all">{{ t('filters.allTemplates') }}</option>
          <option v-for="tpl in templates" :key="tpl.id" :value="String(tpl.id)">{{ tpl.title }}</option>
          <option value="none">{{ t('filters.noTemplate') }}</option>
        </select>
      </label>
    </div>

    <section :aria-label="t('bulletins.list')" class="bs-card overflow-hidden">
      <div aria-hidden="true" class="hidden gap-4 bg-slate-50 px-5 py-2.5 text-xs font-semibold text-slate-600 md:flex">
        <span class="flex-[1_1_320px]">{{ t('bulletins.col.publication') }}</span>
        <span class="flex-[0_0_200px]">{{ t('bulletins.col.template') }}</span>
        <span class="flex-[0_0_170px]">{{ t('bulletins.col.status') }}</span>
        <span class="flex-[0_0_110px]">{{ t('bulletins.col.published') }}</span>
        <span class="w-8" />
      </div>
      <ul v-if="page.items.length" class="m-0 list-none p-0">
        <li v-for="b in page.items" :key="b.id" class="flex items-center border-t border-slate-100 pe-3 hover:bg-slate-50">
          <a :href="href({ name: 'editor', id: b.id })" class="bs-focus flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5 py-3 ps-5 text-slate-800">
            <span class="flex min-w-0 flex-[1_1_320px] items-center gap-3">
              <KindTile :kind="b.kind" />
              <span class="flex min-w-0 flex-col">
                <span class="truncate font-semibold">{{ b.title }}</span>
                <span class="text-[13px] text-slate-500">
                  {{ t(`kind.${b.kind}`) }}<template v-if="b.updatedAt"> · {{ t('home.modified', { when: formatWhen(b.updatedAt) }) }}</template>
                </span>
              </span>
            </span>
            <span class="flex-[0_0_200px] truncate text-slate-600">{{ b.template?.title ?? t('filters.noTemplate') }}</span>
            <span class="flex-[0_0_170px]"><StatusPills :live="b.live" :has-unpublished-changes="b.hasUnpublishedChanges" /></span>
            <span class="flex-[0_0_110px] text-slate-600">{{ b.publishedAt ? formatRecentDay(b.publishedAt) : '—' }}</span>
          </a>
          <button
            type="button"
            class="bs-btn bs-btn-icon bs-btn-danger min-h-8! min-w-8!"
            :aria-label="t('bulletins.delete', { title: b.title })"
            :title="t('bulletins.delete', { title: b.title })"
            @click="removePublication(b)"
          >
            <Trash2 :size="15" aria-hidden="true" />
          </button>
        </li>
      </ul>
      <div v-else-if="library.loaded" class="border-t border-slate-100 px-5 py-8 text-center text-slate-500">
        <template v-if="filtering">
          {{ t('bulletins.noMatch') }}
          <button type="button" class="bs-focus ms-1 cursor-pointer font-medium text-sky-700 hover:underline" @click="replace({ name: 'bulletins', query: {} })">
            {{ t('bulletins.clear') }}
          </button>
        </template>
        <template v-else>{{ t('bulletins.none') }}</template>
      </div>

      <nav
        v-if="page.items.length"
        :aria-label="t('bulletins.pages')"
        class="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3 text-[13px] text-slate-500"
      >
        <span class="me-auto">{{ t('bulletins.range', { from: page.from, to: page.to, total: filtered.length }) }}</span>
        <button type="button" class="bs-btn bs-btn-secondary min-h-9!" :disabled="page.page <= 1" @click="set({ page: page.page - 1 })">
          {{ t('bulletins.previous') }}
        </button>
        <button type="button" class="bs-btn bs-btn-secondary min-h-9!" :disabled="page.page >= page.pages" @click="set({ page: page.page + 1 })">
          {{ t('bulletins.next') }}
        </button>
      </nav>
    </section>
  </StudioLayout>
</template>
