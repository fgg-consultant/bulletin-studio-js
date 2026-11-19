<script setup lang="ts">
/** Le fil d'Ariane : où l'on est, et le chemin pour remonter. Le dernier maillon est la
 *  page courante, sans lien. */
import { ChevronRight } from 'lucide-vue-next'
import { t } from '../../i18n'

defineProps<{ items: { label: string; href?: string }[] }>()
</script>

<template>
  <nav :aria-label="t('nav.breadcrumb')" class="min-w-0">
    <ol class="m-0 flex min-w-0 list-none items-center p-0 gap-1.5 text-[13px] whitespace-nowrap text-slate-500">
      <template v-for="(item, i) in items" :key="i">
        <li v-if="i > 0" aria-hidden="true" class="shrink-0">
          <ChevronRight :size="13" class="rtl:rotate-180" />
        </li>
        <li
          :aria-current="i === items.length - 1 ? 'page' : undefined"
          class="min-w-0 truncate"
          :class="i === items.length - 1 ? 'font-semibold text-slate-900' : i > 0 && 'max-w-64'"
        >
          <a v-if="item.href && i < items.length - 1" :href="item.href" class="text-slate-600 hover:text-sky-800 hover:underline">
            {{ item.label }}
          </a>
          <template v-else>{{ item.label }}</template>
        </li>
      </template>
    </ol>
  </nav>
</template>
