<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { Crop, Map as MapIcon, RefreshCw } from 'lucide-vue-next'
import * as api from '../../api'
import { locale, t } from '../../i18n'
import * as wms from '../../wms'
import { legendHtml, MAP_HEIGHTS, mountMap, tileUrl, type Legend, type MountedMap } from '../../map'
import { FLASH_PIXEL_RATIO } from '../../share'
import { doc, ui } from '../../store'
import type { MapBlock } from '../../types'

const props = defineProps<{ block: MapBlock; selected: boolean }>()

/** dans un flash, la carte prend la hauteur que les autres blocs lui laissent (style.css),
 *  et elle est dessinée à la définition de l'image exportée */
const flash = computed(() => doc.kind === 'flash')
/** le fond d'un flash : ses réglages passent sous le carré (FlashCanvas.vue) */
const backdrop = computed(() => ui.backdropId === props.block.id)

const SIZES = ['sm', 'md', 'lg'] as const

const sorted = (times: string[] | undefined) => [...(times ?? [])].sort()

const canvas = ref<HTMLElement | null>(null)
const mounted = shallowRef<MountedMap | null>(null)
const error = ref<string | null>(null)
const busy = ref(false)

const layers = ref<api.GeoLayer[] | null>(null)
const times = ref<string[]>([])
const config = shallowRef<api.MapConfig | null>(null)

/** La config carte est la même pour tout le document : une requête, partagée. */
let configOnce: Promise<api.MapConfig> | null = null
const getConfig = () => (configOnce ??= api.mapConfig())

async function loadLayers() {
  busy.value = true
  try {
    const cfg = (config.value = await getConfig())
    layers.value = cfg.datasetsUrl ? await api.listLayers(cfg.datasetsUrl) : []
    error.value = cfg.datasetsUrl ? null : t('map.noGeomanager')
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

/** Le catalogue compte des centaines de couches (487 sur un site du Data Helper) : on
 *  les cherche par mots, dans leur nom et celui de leur jeu de données, accents
 *  ignorés. */
const SHOWN = 80
const query = ref('')
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
const matches = computed(() => {
  const words = fold(query.value).split(/\s+/).filter(Boolean)
  return (layers.value ?? []).filter((l) => {
    const text = fold(`${l.name} ${l.dataset}`)
    return words.every((w) => text.includes(w))
  })
})

/** Les tuiles d'une couche, ses dates et celle à prendre par défaut. */
async function layerData(layer: api.GeoLayer) {
  if (layer.wms) {
    const info = await wms.layerInfo(layer.wms.capabilities, layer.wms.layer)
    if (!info) throw new Error(t('map.wmsMissing', { layer: layer.wms.layer }))
    // le service lui-même : une url absolue, il n'est pas sur le site
    return { ...info, tiles: layer.wms.tiles }
  }
  const json = await api.tileJson(layer.tileJsonUrl!)
  const list = sorted(json.timestamps)
  return {
    // chemin seul : une url absolue figerait le domaine du jour dans un document archivé
    tiles: api.samePath(json.tiles[0]),
    times: list,
    // la plus récente ; geomanager les sert du plus récent au plus ancien
    current: list.at(-1) ?? null,
    legendUrl: null,
  }
}

/** Choisir une couche fige aussi ses tuiles, sa date et sa légende dans le document. */
async function pick(layer: api.GeoLayer) {
  busy.value = true
  error.value = null
  try {
    const info = await layerData(layer)
    props.block.layerId = layer.id
    props.block.layerTitle = layer.name
    props.block.tiles = info.tiles
    times.value = info.times
    props.block.time = info.current
    // une légende en couleurs si geomanager en a une, sinon l'image du service
    props.block.legend = layer.legendConfig?.items?.length
      ? (layer.legendConfig as Legend)
      : info.legendUrl
        ? { type: 'image', url: info.legendUrl }
        : null
    props.block.bounds = props.block.bounds ?? config.value?.bounds ?? null
    query.value = ''
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

/** Les dates disponibles ne sont pas stockées : elles changent, seule celle du
 *  bulletin est figée. On les redemande quand l'auteur veut en changer. */
const timesLoading = ref(false)
async function loadTimes() {
  timesLoading.value = true
  try {
    if (!layers.value) await loadLayers()
    const layer = layers.value?.find((l) => l.id === props.block.layerId)
    if (layer) times.value = (await layerData(layer)).times
  } finally {
    timesLoading.value = false
  }
}

/** la date figée reste choisissable même sortie de la liste du service (ses 60
 *  dernières pour un WMS) */
const timeOptions = computed(() =>
  props.block.time && !times.value.includes(props.block.time) ? [props.block.time, ...times.value] : times.value,
)

/** Ce que montre la couche, dit sur la carte (dans l'éditeur seulement) : une carte
 *  sans couleur n'explique pas si le service est lent, s'il a refusé, ou s'il n'a
 *  rien à montrer ici à cette date. */
const layerState = ref<'loading' | 'error' | 'empty' | null>(null)
let slow: ReturnType<typeof setTimeout> | undefined
function onStatus(status: 'loading' | 'ready' | 'error') {
  clearTimeout(slow)
  // pas pour un déplacement que les tuiles suivent aussitôt
  if (status === 'loading') slow = setTimeout(() => (layerState.value = 'loading'), 800)
  else if (status === 'error') layerState.value = 'error'
  else checkBlank()
}

/** Une image WMS vide sur la vue entière : la couche n'a rien ici à cette date. Une
 *  requête par vue, pas par tuile ; la réponse est gardée pour la vue. */
const blank = new Map<string, Promise<boolean | null>>()
async function checkBlank() {
  const view = mounted.value?.bounds()
  const tiles = props.block.tiles
  if (!view || !tiles?.includes('{bbox-epsg-3857}')) return (layerState.value = null)
  const url = tileUrl({ tiles, time: props.block.time, bounds: null }).replace('{bbox-epsg-3857}', wms.bbox3857(view))
  if (!blank.has(url)) blank.set(url, wms.isBlank(url))
  const empty = await blank.get(url)
  // une vue plus récente a pu répondre entre-temps
  if (mounted.value?.bounds()?.join() === view.join() && props.block.tiles === tiles)
    layerState.value = empty ? 'empty' : null
}

function draw() {
  mounted.value?.destroy()
  mounted.value = null
  clearTimeout(slow)
  layerState.value = null
  if (!canvas.value || !props.block.tiles) return
  mounted.value = mountMap(
    canvas.value,
    {
      tiles: props.block.tiles,
      time: props.block.time,
      bounds: props.block.bounds,
      boundaryTiles: config.value?.boundaryTilesUrl,
    },
    // un flash exporte ce que l'on voit : son cadrage suit l'auteur, sans « Cadrer ici »
    {
      onStatus,
      ...(flash.value
        ? { pixelRatio: FLASH_PIXEL_RATIO, padding: 0, onMove: (bounds: number[]) => (props.block.bounds = bounds) }
        : {}),
    },
  )
}

watch(
  () => [props.block.tiles, props.block.time, props.block.height] as const,
  async () => {
    if (props.block.tiles && !config.value) config.value = await getConfig()
    draw()
  },
  { immediate: true, flush: 'post' },
)

watch(
  () => props.selected,
  (on) => {
    if (!on) return
    if (!layers.value) loadLayers()
    if (props.block.layerId && !times.value.length) loadTimes().catch(() => {})
  },
)

/** Fige le cadrage courant : sans lui, un bulletin publié s'ouvre sur le cadrage
 *  par défaut du site plutôt que sur la zone que l'auteur a choisie. */
function frame() {
  props.block.bounds = mounted.value?.bounds() ?? null
}

onBeforeUnmount(() => {
  clearTimeout(slow)
  mounted.value?.destroy()
})
</script>

<template>
  <div>
    <div
      v-if="!block.tiles"
      class="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 print:hidden"
      @click.stop
    >
      <MapIcon :size="26" class="text-slate-400" />
      <button
        v-if="!layers"
        class="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
        :disabled="busy"
        @click="loadLayers"
      >
        {{ busy ? t('map.loading') : t('map.chooseLayer') }}
      </button>
      <p v-else-if="!layers.length && !error" class="max-w-sm text-center text-sm text-slate-500">
        {{ t('map.noLayers') }}
      </p>
      <div v-else-if="layers.length" class="w-full max-w-md">
        <input
          v-model="query"
          type="search"
          :placeholder="t('map.search', { count: layers.length })"
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-sky-600"
        />
        <ul class="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white text-left">
          <li v-for="l in matches.slice(0, SHOWN)" :key="l.id">
            <button
              class="block w-full px-3 py-1.5 text-left hover:bg-sky-50 disabled:opacity-50"
              :disabled="busy"
              @click="pick(l)"
            >
              <span class="block text-sm text-slate-800">{{ l.name }}</span>
              <span v-if="l.dataset && l.dataset !== l.name" class="block text-xs text-slate-500">{{ l.dataset }}</span>
            </button>
          </li>
          <li v-if="!matches.length" class="px-3 py-2 text-sm text-slate-500">{{ t('map.noMatch') }}</li>
        </ul>
        <p class="mt-1 text-xs text-slate-500">
          {{ busy ? t('map.reading') : matches.length > SHOWN ? t('map.more', { count: matches.length - SHOWN }) : '' }}
        </p>
      </div>
    </div>

    <template v-else>
      <div class="bs-map-frame">
        <div ref="canvas" class="bs-map w-full rounded" :style="flash ? {} : { height: MAP_HEIGHTS[block.height] }" />
        <!-- pas de légende sur l'image d'un flash : le post dit ce que montre la carte -->
        <div v-if="block.legend && !flash" class="bs-legend-host" v-html="legendHtml(block.legend)" />
        <p v-if="layerState" class="bs-map-state print:hidden" :class="{ 'bs-map-state-error': layerState === 'error' }">
          {{ layerState === 'loading' ? t('map.layerLoading') : layerState === 'empty' ? t('map.layerEmpty') : t('map.layerError') }}
        </p>
      </div>
    </template>

    <Teleport defer to="#bs-flash-tools" :disabled="!backdrop">
      <div v-if="block.tiles && selected" class="mt-2 flex flex-wrap items-center gap-2" @click.stop>
        <span class="text-xs font-medium text-slate-600">{{ block.layerTitle }}</span>
        <select
          v-if="times.length"
          v-model="block.time"
          class="rounded border border-slate-200 py-1 ps-2 pe-7 text-xs focus:outline-1 focus:outline-sky-600"
          :aria-label="t('map.date')"
        >
          <option v-for="ts in timeOptions" :key="ts" :value="ts">{{ wms.timeLabel(ts, locale) }}</option>
        </select>
        <span v-else-if="timesLoading" class="text-xs text-slate-400">{{ t('map.loading') }}</span>
        <div v-if="!flash" class="flex rounded border border-slate-200 p-0.5">
          <button
            v-for="sz in SIZES"
            :key="sz"
            class="rounded px-2 py-0.5 text-[10px] font-semibold"
            :class="block.height === sz ? 'bg-sky-50 text-sky-700' : 'text-slate-400 hover:text-slate-600'"
            @click="block.height = sz"
          >
            {{ sz.toUpperCase() }}
          </button>
        </div>
        <button
          v-if="!flash"
          class="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
          :title="t('map.frameHint')"
          @click="frame"
        >
          <Crop :size="12" /> {{ t('map.frame') }}
        </button>
        <button
          class="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
          @click="((block.tiles = null), (block.layerId = null), loadLayers())"
        >
          <RefreshCw :size="12" /> {{ t('map.changeLayer') }}
        </button>
      </div>

      <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
    </Teleport>
  </div>
</template>
