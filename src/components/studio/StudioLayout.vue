<script setup lang="ts">
/** Le cadre des pages du studio (pas de l'éditeur, qui a le sien) : l'en-tête avec les
 *  trois sections, la cloche des brouillons automatiques à relire et « Nouvelle
 *  publication », puis la page, défilante sous l'en-tête. */
import { computed } from 'vue'
import { Bell, Plus } from 'lucide-vue-next'
import { notifications } from '../../catalog'
import { t } from '../../i18n'
import { library } from '../../library'
import { openNewPublication } from '../../newPublication'
import { href } from '../../router'

const props = defineProps<{ section: 'home' | 'templates' | 'bulletins' }>()

const tabs = [
  { key: 'home', label: 'nav.home', href: href({ name: 'home' }) },
  { key: 'templates', label: 'nav.templates', href: href({ name: 'templates' }) },
  { key: 'bulletins', label: 'nav.bulletins', href: href({ name: 'bulletins', query: {} }) },
] as const

const waiting = computed(() => notifications(library.items).length)
const bellLabel = computed(() =>
  waiting.value ? t('nav.notificationsCount', { count: waiting.value }) : t('nav.notifications'),
)
const active = computed(() => props.section)
</script>

<template>
  <div class="flex h-full flex-col bg-slate-50 text-sm text-slate-800 antialiased">
    <header class="flex min-h-14 shrink-0 flex-wrap items-center gap-x-7 gap-y-1 border-b border-slate-200 bg-white px-6">
      <a :href="href({ name: 'home' })" class="flex items-center gap-2 font-semibold text-slate-800 hover:text-slate-900">
        <span class="flex size-7 items-center justify-center rounded-md bg-sky-700 font-bold text-white">B</span>
        Bulletin Studio
      </a>
      <nav :aria-label="t('nav.sections')" class="flex gap-1 self-stretch">
        <a
          v-for="tab in tabs"
          :key="tab.key"
          :href="tab.href"
          :aria-current="tab.key === active ? 'page' : undefined"
          class="flex items-center border-b-2 px-3"
          :class="
            tab.key === active
              ? 'border-sky-700 font-semibold text-sky-700'
              : 'border-transparent font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900'
          "
        >
          {{ t(tab.label) }}
        </a>
      </nav>
      <div class="ms-auto flex items-center gap-2">
        <!-- les notifications sont en tête de l'accueil -->
        <a
          :href="href({ name: 'home' })"
          :aria-label="bellLabel"
          :title="bellLabel"
          class="relative flex size-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
        >
          <Bell :size="20" aria-hidden="true" />
          <span
            v-if="waiting"
            aria-hidden="true"
            class="absolute end-0.5 top-1 min-w-[18px] rounded-full bg-orange-700 px-[5px] text-center text-[11px] leading-[18px] font-bold text-white"
          >
            {{ waiting }}
          </span>
        </a>
        <button type="button" class="bs-btn bs-btn-primary" @click="openNewPublication()">
          <Plus :size="16" aria-hidden="true" />
          {{ t('nav.newPublication') }}
        </button>
      </div>
    </header>

    <p v-if="library.error" role="alert" class="shrink-0 bg-red-50 px-6 py-2 text-red-700">{{ library.error }}</p>

    <main class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto flex max-w-[1100px] flex-col gap-5 px-6 pt-6 pb-14">
        <slot />
      </div>
    </main>
  </div>
</template>
