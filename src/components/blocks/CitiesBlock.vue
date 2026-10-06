<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import draggable from 'vuedraggable'
import { Building2, GripVertical, RefreshCw } from 'lucide-vue-next'
import * as api from '../../api'
import { citiesHtml } from '../../cities'
import { addDays, formatDay, t } from '../../i18n'
import { doc } from '../../store'
import type { CitiesBlock } from '../../types'

const props = defineProps<{ block: CitiesBlock; selected: boolean }>()

const options = shallowRef<api.ForecastOptions | null>(null)
const found = shallowRef<api.CityForecasts | null>(null)
const error = ref<string | null>(null)
const choosing = ref(false)

/** Comme le bloc prévision : un modèle montre en aperçu la prévision d'aujourd'hui,
 *  un numéro celle de sa propre date, quel que soit le jour où on l'ouvre. */
const issueDay = computed(() => (doc.isTemplate ? null : doc.date))
const period = computed(() => props.block.period ?? options.value?.periods[0]?.time ?? null)
const target = computed(() => {
  const base = issueDay.value ?? options.value?.today
  return base ? addDays(base, props.block.dayOffset) : null
})
/** la prévision publiée pour la recette du bloc, telle que le serveur l'a maintenant */
const current = computed(() => found.value?.table ?? null)
const newer = computed(() =>
  !doc.isTemplate && props.block.rows && current.value && current.value.version !== props.block.version
    ? current.value
    : null,
)
/** ce que le bloc affiche : dans un modèle, la prévision du moment ; dans un numéro, la sienne */
const shown = computed<CitiesBlock | null>(() => {
  if (!doc.isTemplate) return props.block.rows ? props.block : null
  const c = current.value
  return c ? { ...props.block, date: c.date, periodLabel: c.periodLabel, units: c.units, rows: c.rows } : null
})
const html = computed(() => (shown.value ? citiesHtml(shown.value) : ''))
const days = computed(() => {
  const n = Math.max(options.value?.daysAhead ?? 0, props.block.dayOffset)
  return Array.from({ length: n + 1 }, (_, i) => i)
})

/** toutes les villes : celles du site, et celles d'un numéro figé (supprimées depuis, peut-être) */
const names = computed(() => {
  const m = new Map<string, string>((found.value?.cities ?? []).map((c) => [c.slug, c.name]))
  for (const r of props.block.rows ?? []) if (!m.has(r.slug)) m.set(r.slug, r.name)
  return m
})
const withData = computed(() => new Set((shown.value?.rows ?? []).map((r) => r.slug)))
/** les villes choisies qui n'ont pas de prévision pour ce créneau : absentes de la grille */
const missing = computed(() =>
  shown.value
    ? (props.block.cities ?? []).filter((s) => !withData.value.has(s)).map((s) => names.value.get(s) ?? s)
    : [],
)

// une recette changée pendant un chargement : seule la dernière réponse compte
let request = 0
async function load() {
  const mine = ++request
  try {
    const opts = await api.forecastMaps(issueDay.value)
    if (mine !== request) return
    options.value = opts
    // la recette devient explicite : le créneau par défaut pourrait changer de réglage
    if (props.block.period === null && opts.periods.length) props.block.period = opts.periods[0].time
    const res = target.value && period.value ? await api.cityForecasts(target.value, period.value) : null
    if (mine !== request) return
    found.value = res
    error.value = null
    settle()
  } catch (e) {
    if (mine === request) error.value = (e as Error).message
  }
}

/** Fige dans le numéro la prévision du moment : les lignes de toutes les villes,
 *  copiées dans le document. La page publiée ne dépend plus de forecastmanager. */
function freeze() {
  const c = current.value
  if (!c) return
  Object.assign(props.block, {
    period: c.period, date: c.date, periodLabel: c.periodLabel, units: c.units, rows: c.rows, version: c.version,
  })
}

/** Un numéro sans prévision prend celle de sa date dès qu'elle est publiée : bloc tout
 *  juste inséré, numéro copié d'un modèle, ou prévision publiée depuis. */
function settle() {
  if (!doc.isTemplate && !props.block.rows && current.value) freeze()
}

function setRecipe(change: Partial<Pick<CitiesBlock, 'period' | 'dayOffset'>>) {
  Object.assign(props.block, change)
  // un autre créneau ou un autre jour : les lignes figées ne correspondent plus
  if (!doc.isTemplate) Object.assign(props.block, { date: null, periodLabel: '', units: null, rows: null, version: null })
  found.value = null
  load()
}

const dayLabel = (n: number) => (n === 0 ? t('forecast.day0') : t('forecast.dayN', { n }))

// ---- le choix des villes : cochées dans l'ordre, puis les autres par nom
interface Choice {
  slug: string
  name: string
  on: boolean
}
const choice = ref<Choice[]>([])

function openChoice() {
  const all = [...names.value]
  const on = props.block.cities?.filter((s) => names.value.has(s)) ?? all.map(([s]) => s)
  choice.value = [
    ...on.map((slug) => ({ slug, name: names.value.get(slug)!, on: true })),
    ...all.filter(([s]) => !on.includes(s)).map(([slug, name]) => ({ slug, name, on: false })),
  ]
  choosing.value = true
}

function commitChoice() {
  props.block.cities = choice.value.filter((c) => c.on).map((c) => c.slug)
}

function resetChoice() {
  props.block.cities = null
  openChoice()
}

const chosenLabel = computed(() =>
  props.block.cities
    ? t('cities.chosen', { count: props.block.cities.length, total: names.value.size })
    : t('cities.allCities'),
)

onMounted(load)
// l'éditeur passe d'un document à l'autre sans démonter ses blocs : un numéro garde
// les ids des blocs de son modèle, et ce composant les données du précédent
watch(issueDay, () => {
  found.value = null
  load()
})
// sélectionner le bloc relit l'état du serveur : la prévision a pu changer
watch(
  () => props.selected,
  (on) => {
    if (on) load()
    else choosing.value = false
  },
)
</script>

<template>
  <div>
    <template v-if="shown">
      <!-- à gauche, même en arabe : la barre d'outils du bloc occupe le coin droit -->
      <div v-if="doc.isTemplate" class="mb-1 flex rtl:justify-end">
        <span class="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
          {{ t('cities.preview', { date: formatDay(target) }) }}
        </span>
      </div>
      <div v-if="html" v-html="html" />
      <p v-else class="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        {{ t('cities.noneChosen', { date: formatDay(shown.date) }) }}
      </p>
    </template>

    <div
      v-else
      class="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center"
      @click.stop
    >
      <Building2 :size="26" class="text-slate-400" />
      <p v-if="!options && !error" class="text-sm text-slate-500">{{ t('cities.loading') }}</p>
      <p v-else-if="options && !options.periods.length" class="text-sm text-slate-500">{{ t('forecast.noPeriod') }}</p>
      <template v-else-if="options">
        <p class="text-sm text-slate-500">{{ t('cities.missing', { date: formatDay(target) }) }}</p>
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
        class="rounded border border-slate-200 py-1 ps-2 pe-9 text-xs focus:outline-1 focus:outline-sky-600"
        @change="setRecipe({ period: ($event.target as HTMLSelectElement).value })"
      >
        <option v-for="p in options.periods" :key="p.time" :value="p.time">{{ p.label }}</option>
      </select>
      <select
        :value="block.dayOffset"
        :aria-label="t('forecast.day')"
        class="rounded border border-slate-200 py-1 ps-2 pe-9 text-xs focus:outline-1 focus:outline-sky-600"
        @change="setRecipe({ dayOffset: Number(($event.target as HTMLSelectElement).value) })"
      >
        <option v-for="n in days" :key="n" :value="n">{{ dayLabel(n) }}</option>
      </select>
      <select
        v-model.number="block.columns"
        :aria-label="t('cities.columns')"
        class="rounded border border-slate-200 py-1 ps-2 pe-9 text-xs focus:outline-1 focus:outline-sky-600"
      >
        <option v-for="n in [1, 2, 3]" :key="n" :value="n">{{ t(`sidebar.c${n}`) }}</option>
      </select>
      <button
        v-if="found"
        class="self-stretch rounded border px-2 py-1 text-xs"
        :class="choosing ? 'border-sky-600 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'"
        :aria-expanded="choosing"
        @click="choosing ? (choosing = false) : openChoice()"
      >
        {{ chosenLabel }}
      </button>
      <span v-if="!doc.isTemplate && block.rows" class="text-xs text-slate-500">
        {{ t('cities.frozen', { date: formatDay(block.date), period: block.periodLabel }) }}
      </span>
      <span v-else-if="doc.isTemplate" class="text-xs text-slate-500">{{ t('cities.templateHint') }}</span>
      <span v-if="missing.length" class="w-full text-xs text-amber-700">
        {{ t('cities.missingCities', { names: missing.join(', ') }) }}
      </span>
    </div>

    <div v-if="selected && choosing" class="mt-2 rounded-md border border-slate-200 bg-white p-2" @click.stop>
      <div class="mb-1 flex items-center justify-between gap-2 text-xs">
        <span class="font-medium text-slate-700">{{ t('cities.choose') }}</span>
        <button v-if="block.cities" class="text-sky-700 hover:underline" @click="resetChoice">
          {{ t('cities.reset') }}
        </button>
      </div>
      <draggable
        v-model="choice"
        item-key="slug"
        handle=".city-handle"
        :animation="150"
        class="max-h-64 overflow-y-auto"
        @change="commitChoice"
      >
        <template #item="{ element }">
          <div class="flex items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-slate-50">
            <GripVertical :size="12" class="city-handle shrink-0 cursor-grab text-slate-400" />
            <label class="flex min-w-0 flex-1 items-center gap-2">
              <input v-model="element.on" type="checkbox" @change="commitChoice" />
              <span class="truncate" :class="withData.has(element.slug) ? 'text-slate-700' : 'text-slate-400'">
                {{ element.name }}
              </span>
              <span v-if="!withData.has(element.slug)" class="shrink-0 text-slate-400 italic">{{ t('cities.noData') }}</span>
            </label>
          </div>
        </template>
      </draggable>
    </div>

    <div
      v-if="newer"
      class="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-sky-50 px-3 py-1.5 text-xs text-sky-800 print:hidden"
      @click.stop
    >
      {{ t('cities.newer') }}
      <button
        class="flex items-center gap-1 rounded bg-white px-2 py-0.5 font-medium text-sky-700 shadow-sm ring-1 ring-sky-200 hover:bg-sky-100"
        @click="freeze"
      >
        <RefreshCw :size="12" /> {{ t('forecast.refresh') }}
      </button>
    </div>

    <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
  </div>
</template>
