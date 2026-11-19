<script setup lang="ts">
/** L'accueil : ce qui attend l'office d'abord (les brouillons préparés tout seuls,
 *  puis ceux faits à la main et les modifications pas encore en ligne), les deux
 *  sections en chiffres, les dernières publications. */
import { computed, onMounted } from 'vue'
import { Bell, ChevronRight } from 'lucide-vue-next'
import type { BulletinMeta } from '../api'
import { counts, describe, nextAutoDraft, notifications, recent, toPublish } from '../catalog'
import { siteToday } from '../fields'
import { formatAge, formatDayAt, formatLongDay, formatWhen, t } from '../i18n'
import { library, refresh } from '../library'
import { href } from '../router'
import KindTile from '../components/studio/KindTile.vue'
import StatusPills from '../components/studio/StatusPills.vue'
import StudioLayout from '../components/studio/StudioLayout.vue'

onMounted(refresh)

const today = siteToday()
const DAY = 86_400_000

/** chaque ligne avec son nom et son détail (« Météo journalière », « N° 312 · 8 nov. ») */
const rows = (list: BulletinMeta[]) => list.map((b) => ({ b, ...describe(b) }))
const waiting = computed(() => rows(notifications(library.items)))
const pending = computed(() => rows(toPublish(library.items)))
const latest = computed(() => rows(recent(library.items)))
const n = computed(() => counts(library.items))
const nextDraft = computed(() => nextAutoDraft(library.items))
const lastPublished = computed(() => latest.value[0]?.b ?? null)

const editor = (id: number) => href({ name: 'editor', id })
</script>

<template>
  <StudioLayout section="home">
    <div>
      <h1 class="m-0 text-2xl font-bold text-slate-900">{{ t('home.title') }}</h1>
      <p class="mt-1 text-slate-500 first-letter:uppercase">{{ formatLongDay(today) }}</p>
    </div>

    <!-- les brouillons préparés automatiquement : l'office les relit, puis publie -->
    <section
      v-if="waiting.length"
      aria-labelledby="bs-notifications"
      class="overflow-hidden rounded-xl border border-orange-200 bg-white"
    >
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-orange-50 px-5 py-4">
        <span class="flex size-8 items-center justify-center rounded-lg bg-orange-100 text-orange-700" aria-hidden="true">
          <Bell :size="17" />
        </span>
        <h2 id="bs-notifications" class="m-0 text-base font-semibold text-slate-900">
          {{ t('home.notifications') }} <span class="text-orange-800">· {{ waiting.length }}</span>
        </h2>
        <p class="m-0 min-w-0 flex-[1_1_320px] text-[13px] text-orange-900">{{ t('home.notificationsHint') }}</p>
      </div>
      <ul class="m-0 list-none p-0">
        <li
          v-for="{ b, name, detail } in waiting"
          :key="b.id"
          class="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-t border-orange-100 px-5 py-3.5"
        >
          <KindTile :kind="b.kind" size="md" />
          <span class="flex min-w-0 flex-[1_1_300px] flex-col">
            <span class="font-semibold text-slate-900">
              {{ name }} <span class="font-medium text-slate-600">— {{ detail }}</span>
            </span>
            <span class="text-[13px] text-slate-500">{{ t('home.prepared', { when: formatWhen(b.preparedAt!) }) }}</span>
          </span>
          <span
            class="bs-pill"
            :class="Date.now() - b.preparedAt! > DAY ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-600'"
          >
            {{ t('home.waiting', { age: formatAge(b.preparedAt!) }) }}
          </span>
          <a :href="editor(b.id)" class="bs-btn bs-btn-primary">{{ t('home.review') }}</a>
        </li>
      </ul>
    </section>

    <div class="flex flex-wrap gap-4">
      <a :href="href({ name: 'templates' })" class="bs-card bs-focus flex flex-[1_1_320px] flex-col gap-3.5 px-6 py-5 text-slate-800 hover:border-slate-300">
        <span class="flex items-center gap-2.5">
          <KindTile kind="bulletin" template size="md" />
          <span class="text-base font-semibold text-slate-900">{{ t('nav.templates') }}</span>
          <ChevronRight :size="18" class="ms-auto text-slate-500 rtl:rotate-180" aria-hidden="true" />
        </span>
        <span class="flex items-baseline gap-2">
          <span class="text-4xl leading-none font-bold text-slate-900">{{ n.templates.total }}</span>
          <span class="text-slate-500">{{ t('home.templatesWord', { count: n.templates.total }) }}</span>
        </span>
        <span class="flex flex-wrap gap-2">
          <span class="bs-pill bg-sky-100 text-[13px]! text-sky-800">{{ t('count.bulletins', { count: n.templates.bulletin }) }}</span>
          <span class="bs-pill bg-violet-100 text-[13px]! text-violet-800">{{ t('count.flashes', { count: n.templates.flash }) }}</span>
        </span>
        <span class="border-t border-slate-100 pt-3 text-[13px] text-slate-600">
          <template v-if="nextDraft">
            {{ t('home.nextDraft') }}
            <strong class="font-semibold text-slate-800">{{ nextDraft.template.title }}</strong>,
            {{ formatDayAt(nextDraft.at.slice(0, 10), nextDraft.at.slice(11, 16), today) }}
          </template>
          <template v-else>{{ t('home.noNextDraft') }}</template>
        </span>
      </a>

      <a :href="href({ name: 'bulletins', query: {} })" class="bs-card bs-focus flex flex-[1_1_320px] flex-col gap-3.5 px-6 py-5 text-slate-800 hover:border-slate-300">
        <span class="flex items-center gap-2.5">
          <KindTile kind="bulletin" size="md" />
          <span class="text-base font-semibold text-slate-900">{{ t('nav.bulletins') }}</span>
          <ChevronRight :size="18" class="ms-auto text-slate-500 rtl:rotate-180" aria-hidden="true" />
        </span>
        <span class="flex items-baseline gap-2">
          <span class="text-4xl leading-none font-bold text-slate-900">{{ n.publications.total }}</span>
          <span class="text-slate-500">
            {{
              n.publications.drafts
                ? t('home.includingDrafts', { count: n.publications.drafts })
                : t('home.publicationsWord', { count: n.publications.total })
            }}
          </span>
        </span>
        <span class="flex flex-wrap gap-2">
          <span class="bs-pill bg-sky-100 text-[13px]! text-sky-800">{{ t('count.bulletins', { count: n.publications.bulletin }) }}</span>
          <span class="bs-pill bg-violet-100 text-[13px]! text-violet-800">{{ t('count.flashes', { count: n.publications.flash }) }}</span>
        </span>
        <span class="border-t border-slate-100 pt-3 text-[13px] text-slate-600">
          <template v-if="lastPublished">
            {{ t('home.lastPublication') }}
            <strong class="font-semibold text-slate-800">{{ lastPublished.title }}</strong>,
            {{ formatWhen(lastPublished.publishedAt!) }}
          </template>
          <template v-else>{{ t('home.noPublication') }}</template>
        </span>
      </a>
    </div>

    <div class="flex flex-wrap items-start gap-4">
      <section aria-labelledby="bs-to-publish" class="bs-card min-w-0 flex-[1_1_420px]">
        <div class="px-5 pt-4 pb-3">
          <h2 id="bs-to-publish" class="m-0 text-[15px] font-semibold text-slate-900">
            {{ t('home.toPublish') }} <span class="font-medium text-slate-500">· {{ pending.length }}</span>
          </h2>
          <p class="m-0 mt-0.5 text-[13px] text-slate-500">{{ t('home.toPublishHint') }}</p>
        </div>
        <ul v-if="pending.length" class="m-0 list-none p-0">
          <li v-for="{ b, name, detail } in pending" :key="b.id" class="border-t border-slate-100">
            <a :href="editor(b.id)" class="bs-focus flex items-center gap-3 px-5 py-3 text-slate-800 hover:bg-slate-50">
              <KindTile :kind="b.kind" />
              <span class="flex min-w-0 flex-1 flex-col">
                <span class="truncate font-semibold">{{ name }}</span>
                <span class="text-[13px] text-slate-500">
                  {{ detail }}<template v-if="b.updatedAt"> · {{ t('home.modified', { when: formatWhen(b.updatedAt) }) }}</template>
                </span>
              </span>
              <StatusPills :live="b.live" :has-unpublished-changes="b.hasUnpublishedChanges" />
            </a>
          </li>
        </ul>
        <p v-else class="m-0 border-t border-slate-100 px-5 py-4 text-slate-500">{{ t('home.nothingToPublish') }}</p>
      </section>

      <section aria-labelledby="bs-recent" class="bs-card min-w-0 flex-[1_1_420px]">
        <h2 id="bs-recent" class="m-0 px-5 pt-4 pb-3 text-[15px] font-semibold text-slate-900">{{ t('home.recent') }}</h2>
        <ul v-if="latest.length" class="m-0 list-none p-0">
          <li v-for="{ b, name, detail } in latest" :key="b.id" class="border-t border-slate-100">
            <a :href="editor(b.id)" class="bs-focus flex items-center gap-3 px-5 py-3 text-slate-800 hover:bg-slate-50">
              <KindTile :kind="b.kind" />
              <span class="flex min-w-0 flex-1 flex-col">
                <span class="truncate font-semibold">{{ name }}</span>
                <span class="text-[13px] text-slate-500">{{ detail }}</span>
              </span>
              <span class="shrink-0 text-[13px] text-slate-500">{{ formatWhen(b.publishedAt!) }}</span>
            </a>
          </li>
        </ul>
        <p v-else class="m-0 border-t border-slate-100 px-5 py-4 text-slate-500">{{ t('home.noRecent') }}</p>
      </section>
    </div>
  </StudioLayout>
</template>
