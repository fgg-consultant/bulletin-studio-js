<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { Crop, Map as MapIcon, RefreshCw } from 'lucide-vue-next'
import * as api from '../../api'
import { t } from '../../i18n'
import { legendHtml, MAP_HEIGHTS, mountMap, type Legend, type MountedMap } from '../../map'
import type { MapBlock } from '../../types'

const props = defineProps<{ block: MapBlock; selected: boolean }>()

const SIZES = ['sm', 'md', 'lg'] as const

const sorted = (times: string[] | undefined) => [...(times ?? [])].sort()

const canvas = ref<HTMLElement | null>(null)
const mounted = shallowRef<MountedMap | null>(null)
const error = ref<string | null>(null)
const busy = ref(false)

const layers = ref<api.GeoLayer[]>([])
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

/** Choisir une couche fige aussi ses tuiles, sa date et sa légende dans le document. */
async function pick(layer: api.GeoLayer) {
  busy.value = true
  error.value = null
  try {
    const json = await api.tileJson(layer.tileJsonUrl)
    props.block.layerId = layer.id
    props.block.layerTitle = layer.name
    // chemin seul : une url absolue figerait le domaine du jour dans un document archivé
    props.block.tiles = api.samePath(json.tiles[0])
    times.value = sorted(json.timestamps)
    // la plus récente par défaut ; geomanager les sert du plus récent au plus ancien
    props.block.time = times.value.at(-1) ?? null
    props.block.legend = (layer.legendConfig as Legend) ?? null
    props.block.bounds = props.block.bounds ?? config.value?.bounds ?? null
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

/** Les dates disponibles ne sont pas stockées : elles changent, seule celle du
 *  bulletin est figée. On les redemande quand l'auteur veut en changer. */
async function loadTimes() {
  const layer = layers.value.find((l) => l.id === props.block.layerId)
  if (!layer) {
    await loadLayers()
    return loadTimes()
  }
  times.value = sorted((await api.tileJson(layer.tileJsonUrl)).timestamps)
}

function draw() {
  mounted.value?.destroy()
  mounted.value = null
  if (!canvas.value || !props.block.tiles) return
  mounted.value = mountMap(canvas.value, {
    tiles: props.block.tiles,
    time: props.block.time,
    bounds: props.block.bounds,
    boundaryTiles: config.value?.boundaryTilesUrl,
  })
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
    if (!layers.value.length) loadLayers()
    if (props.block.layerId && !times.value.length) loadTimes().catch(() => {})
  },
)

/** Fige le cadrage courant : sans lui, un bulletin publié s'ouvre sur le cadrage
 *  par défaut du site plutôt que sur la zone que l'auteur a choisie. */
function frame() {
  props.block.bounds = mounted.value?.bounds() ?? null
}

onBeforeUnmount(() => mounted.value?.destroy())
</script>

<template>
  <div>
    <div
      v-if="!block.tiles"
      class="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8"
      @click.stop
    >
      <MapIcon :size="26" class="text-slate-400" />
      <button
        v-if="!layers.length"
        class="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
        :disabled="busy"
        @click="loadLayers"
      >
        {{ busy ? t('map.loading') : t('map.chooseLayer') }}
      </button>
      <select
        v-else
        class="w-72 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-sky-600"
        @change="pick(layers[($event.target as HTMLSelectElement).selectedIndex - 1])"
      >
        <option value="">{{ t('map.chooseLayer') }}</option>
        <option v-for="l in layers" :key="l.id" :value="l.id">
          {{ l.dataset ? `${l.dataset} — ${l.name}` : l.name }}
        </option>
      </select>
    </div>

    <template v-else>
      <div ref="canvas" class="bs-map w-full rounded" :style="{ height: MAP_HEIGHTS[block.height] }" />
      <div v-if="block.legend" class="bs-legend-host" v-html="legendHtml(block.legend)" />

      <div v-if="selected" class="mt-2 flex flex-wrap items-center gap-2" @click.stop>
        <span class="text-xs font-medium text-slate-600">{{ block.layerTitle }}</span>
        <select
          v-if="times.length"
          v-model="block.time"
          class="rounded border border-slate-200 px-2 py-1 text-xs focus:outline-1 focus:outline-sky-600"
          :aria-label="t('map.date')"
        >
          <option v-for="ts in times" :key="ts" :value="ts">{{ ts.slice(0, 10) }}</option>
        </select>
        <div class="flex rounded border border-slate-200 p-0.5">
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
    </template>

    <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
  </div>
</template>
