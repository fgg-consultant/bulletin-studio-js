<script setup lang="ts">
/** L'état d'une publication en pastilles : « Brouillon », « Publié », « Modifs non
 *  publiées ». `split` montre « Publié » à côté des modifications en attente ;
 *  `publishedAt` date la publication (« Publié le 1 nov. »). */
import { computed } from 'vue'
import { statusOf } from '../../catalog'
import { formatDayOf, t } from '../../i18n'

const props = defineProps<{
  live: boolean
  hasUnpublishedChanges: boolean
  split?: boolean
  publishedAt?: number | null
}>()

const status = computed(() => statusOf(props))
const published = computed(() =>
  props.publishedAt ? t('status.publishedOn', { date: formatDayOf(props.publishedAt) }) : t('status.published'),
)
</script>

<template>
  <span class="inline-flex flex-wrap gap-1">
    <span v-if="status === 'draft'" class="bs-pill bg-slate-100 text-slate-600">{{ t('status.draft') }}</span>
    <template v-else>
      <span v-if="split || status === 'live'" class="bs-pill bg-emerald-100 text-emerald-800">{{ published }}</span>
      <span v-if="status === 'pending'" class="bs-pill bg-orange-100 text-orange-800">{{ t('status.pending') }}</span>
    </template>
  </span>
</template>
