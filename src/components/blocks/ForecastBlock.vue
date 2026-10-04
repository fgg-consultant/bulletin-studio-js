<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { CloudSun, RefreshCw } from 'lucide-vue-next'
import * as api from '../../api'
import { formatDateTime, formatDay, t } from '../../i18n'
import { forecastAlt } from '../../render'
import { doc, pastePlain } from '../../store'
import type { ForecastBlock } from '../../types'

const props = defineProps<{ block: ForecastBlock; selected: boolean }>()

const options = shallowRef<api.ForecastOptions | null>(null)
const busy = ref(false)
const error = ref<string | null>(null)

// initialise le texte des contenteditable sans le lier (le caret sauterait à chaque frappe)
const vInitText = {
  mounted: (el: HTMLElement, { value }: { value: string }) => {
    el.textContent = value
  },
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Un modèle n'a pas de date : il montre en aperçu la carte d'aujourd'hui. Un numéro
 *  prend celle de sa propre date, quel que soit le jour où on l'ouvre. */
const issueDay = computed(() => (doc.isTemplate ? null : doc.date))
const period = computed(() => props.block.period ?? options.value?.periods[0]?.time ?? null)
const target = computed(() => {
  const base = issueDay.value ?? options.value?.today
  return base ? addDays(base, props.block.dayOffset) : null
})
/** le dernier rendu du serveur pour la recette du bloc */
const current = computed(
  () =>
    options.value?.maps.find(
      (m) => m.date === target.value && m.period === period.value && m.preset === props.block.preset,
    ) ?? null,
)
const newer = computed(() =>
  !doc.isTemplate && props.block.src && current.value && current.value.version !== props.block.version
    ? current.value
    : null,
)
const days = computed(() => {
  const n = Math.max(options.value?.daysAhead ?? 0, props.block.dayOffset)
  return Array.from({ length: n + 1 }, (_, i) => i)
})
const shown = computed(() => (doc.isTemplate ? current.value?.url : props.block.src) ?? null)

async function load() {
  try {
    const opts = (options.value = await api.forecastMaps(issueDay.value))
    error.value = null
    // la recette devient explicite : le créneau par défaut pourrait changer de réglage
    if (props.block.period === null && opts.periods.length) props.block.period = opts.periods[0].time
    settle()
  } catch (e) {
    error.value = (e as Error).message
  }
}

/** Fige la carte du moment dans le numéro : le serveur la copie dans la
 *  bibliothèque, et c'est cette copie que la page publiée référence. */
async function freeze() {
  if (!target.value || !period.value || busy.value) return
  busy.value = true
  try {
    const p = await api.promoteForecast(target.value, period.value, props.block.preset)
    Object.assign(props.block, {
      period: p.period, date: p.date, src: p.url, imageId: p.id,
      version: p.version, periodLabel: p.periodLabel,
    })
    error.value = null
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

/** Un numéro sans carte prend celle de sa date dès qu'elle existe : bloc tout juste
 *  inséré, numéro copié d'un modèle, ou prévision publiée depuis. */
function settle() {
  if (!doc.isTemplate && !props.block.src && current.value) freeze()
}

function setRecipe(change: Partial<Pick<ForecastBlock, 'period' | 'dayOffset'>>) {
  Object.assign(props.block, change)
  if (doc.isTemplate) return
  // un autre créneau ou un autre jour : l'image figée ne correspond plus à la recette
  Object.assign(props.block, { date: null, src: null, imageId: null, version: null, periodLabel: '' })
  settle()
}

const dayLabel = (n: number) => (n === 0 ? t('forecast.day0') : t('forecast.dayN', { n }))

onMounted(load)
// sélectionner le bloc relit l'état du serveur : un pull a pu redessiner la carte
watch(
  () => props.selected,
  (on) => on && load(),
)
</script>

<template>
  <div>
    <figure v-if="shown">
      <div class="relative">
        <img :src="shown" :alt="doc.isTemplate ? '' : forecastAlt(block)" class="block w-full rounded" />
        <!-- en bas : le haut de la carte porte son propre titre -->
        <span
          v-if="doc.isTemplate"
          class="absolute right-2 bottom-2 rounded bg-amber-50/95 px-2 py-0.5 text-xs font-medium text-amber-800 shadow-sm"
        >
          {{ t('forecast.preview', { date: formatDay(target) }) }}
        </span>
      </div>
      <figcaption
        v-init-text="block.caption ?? ''"
        contenteditable="true"
        spellcheck="false"
        :data-placeholder="t('image.caption')"
        class="mt-1.5 text-center text-xs leading-relaxed text-slate-500 italic outline-none"
        @click.stop
        @input="block.caption = ($event.target as HTMLElement).textContent ?? ''"
        @paste="pastePlain"
        @keydown.enter.prevent
      ></figcaption>
    </figure>

    <div
      v-else
      class="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center"
      @click.stop
    >
      <CloudSun :size="26" class="text-slate-400" />
      <p v-if="!options && !error" class="text-sm text-slate-500">{{ t('forecast.loading') }}</p>
      <p v-else-if="options && !options.periods.length" class="text-sm text-slate-500">{{ t('forecast.noPeriod') }}</p>
      <p v-else-if="busy" class="text-sm text-slate-500">{{ t('forecast.freezing') }}</p>
      <template v-else-if="options">
        <p class="text-sm text-slate-500">{{ t('forecast.missing', { date: formatDay(target) }) }}</p>
        <button
          class="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
          @click="load"
        >
          <RefreshCw :size="14" /> {{ t('forecast.retry') }}
        </button>
      </template>
    </div>

    <div v-if="selected && options" class="mt-2 flex flex-wrap items-center gap-2" @click.stop>
      <select
        v-if="options.periods.length > 1"
        :value="period"
        :aria-label="t('forecast.period')"
        class="rounded border border-slate-200 py-1 ps-2 pe-7 text-xs focus:outline-1 focus:outline-sky-600"
        @change="setRecipe({ period: ($event.target as HTMLSelectElement).value })"
      >
        <option v-for="p in options.periods" :key="p.time" :value="p.time">{{ p.label }}</option>
      </select>
      <select
        :value="block.dayOffset"
        :aria-label="t('forecast.day')"
        class="rounded border border-slate-200 py-1 ps-2 pe-7 text-xs focus:outline-1 focus:outline-sky-600"
        @change="setRecipe({ dayOffset: Number(($event.target as HTMLSelectElement).value) })"
      >
        <option v-for="n in days" :key="n" :value="n">{{ dayLabel(n) }}</option>
      </select>
      <template v-if="!doc.isTemplate && block.src">
        <span class="text-xs text-slate-500">
          {{ t('forecast.frozen', { date: formatDay(block.date), period: block.periodLabel }) }}
        </span>
        <input
          v-model="block.alt"
          name="forecast-alt"
          :aria-label="t('image.altLabel')"
          :placeholder="t('image.alt')"
          class="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs focus:outline-1 focus:outline-sky-600"
        />
      </template>
      <span v-else-if="doc.isTemplate" class="text-xs text-slate-500">{{ t('forecast.templateHint') }}</span>
    </div>

    <div
      v-if="newer"
      class="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-sky-50 px-3 py-1.5 text-xs text-sky-800 print:hidden"
      @click.stop
    >
      {{ t('forecast.newer', { time: formatDateTime(newer.renderedAt) }) }}
      <button
        class="flex items-center gap-1 rounded bg-white px-2 py-0.5 font-medium text-sky-700 shadow-sm ring-1 ring-sky-200 hover:bg-sky-100 disabled:opacity-50"
        :disabled="busy"
        @click="freeze"
      >
        <RefreshCw :size="12" /> {{ t('forecast.refresh') }}
      </button>
    </div>

    <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
  </div>
</template>
