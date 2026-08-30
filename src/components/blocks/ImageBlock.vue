<script setup lang="ts">
import { ref } from 'vue'
import { Image as ImageIcon, Library, RefreshCw, Upload, X } from 'lucide-vue-next'
import * as api from '../../api'
import { t } from '../../i18n'
import { pastePlain } from '../../store'
import type { ImageBlock } from '../../types'

const props = defineProps<{ block: ImageBlock; selected: boolean }>()

const file = ref<HTMLInputElement | null>(null)
const url = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

// bibliothèque climweb
const picking = ref(false)
const query = ref('')
const results = ref<api.StoredImage[]>([])

// initialise le texte des contenteditable sans le lier (le caret sauterait à chaque frappe)
const vInitText = {
  mounted: (el: HTMLElement, { value }: { value: string }) => {
    el.textContent = value
  },
}

function use(image: api.StoredImage) {
  props.block.src = image.url
  props.block.imageId = image.id
  if (!props.block.alt) props.block.alt = image.alt || image.title
  picking.value = false
}

/** L'image part dans la bibliothèque climweb : rangée avec celles du site,
 *  réutilisable, et hors du document (qui n'a plus à porter de dataURL). */
async function onFile(e: Event) {
  const picked = (e.target as HTMLInputElement).files?.[0]
  if (!picked) return
  busy.value = true
  error.value = null
  try {
    use(await api.uploadImage(picked))
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    busy.value = false
    ;(e.target as HTMLInputElement).value = '' // re-choisir le même fichier reste possible
  }
}

/** URL externe : rien n'est téléversé, le bulletin dépendra de ce domaine. */
function useUrl() {
  if (!url.value.trim()) return
  props.block.src = url.value.trim()
  props.block.imageId = null
  url.value = ''
}

let searchTimer: number | undefined

async function browse() {
  picking.value = true
  error.value = null
  clearTimeout(searchTimer)
  // debounce : la recherche part à la frappe, inutile d'interroger à chaque touche
  searchTimer = window.setTimeout(async () => {
    try {
      results.value = await api.listImages(query.value)
    } catch (err) {
      error.value = (err as Error).message
    }
  }, 250)
}
</script>

<template>
  <div class="relative">
    <div
      v-if="!block.src"
      class="flex flex-col items-center gap-2.5 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8"
    >
      <ImageIcon :size="26" class="text-slate-400" />
      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
          :disabled="busy"
          @click.stop="file?.click()"
        >
          <Upload :size="14" />
          {{ busy ? t('image.uploading') : t('image.choose') }}
        </button>
        <button
          class="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
          @click.stop="browse"
        >
          <Library :size="14" />
          {{ t('image.library') }}
        </button>
      </div>
      <div class="flex items-center gap-1.5 text-xs text-slate-500">
        {{ t('image.or') }}
        <input
          v-model="url"
          name="image-url"
          :aria-label="t('image.url')"
          :placeholder="t('image.urlPlaceholder')"
          class="w-48 rounded border border-slate-200 bg-white px-2 py-1 focus:outline-1 focus:outline-sky-600"
          @click.stop
          @keydown.enter="useUrl"
        />
      </div>
    </div>

    <figure v-else>
      <img :src="block.src" :alt="block.alt" class="block w-full rounded" />
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
      <div v-if="selected" class="mt-2 flex items-center gap-2" @click.stop>
        <input
          v-model="block.alt"
          name="image-alt"
          :aria-label="t('image.altLabel')"
          :placeholder="t('image.alt')"
          class="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs focus:outline-1 focus:outline-sky-600"
        />
        <button
          class="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          :disabled="busy"
          @click="file?.click()"
        >
          <RefreshCw :size="12" /> {{ busy ? t('image.uploading') : t('image.replace') }}
        </button>
        <button
          class="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
          @click="browse"
        >
          <Library :size="12" /> {{ t('image.library') }}
        </button>
        <button
          class="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          @click="((block.src = null), (block.imageId = null))"
        >
          <X :size="12" /> {{ t('image.remove') }}
        </button>
      </div>
    </figure>

    <div
      v-if="picking"
      class="absolute inset-0 z-30 flex min-h-56 flex-col gap-2 rounded-lg border border-slate-300 bg-white p-3 shadow-xl"
      @click.stop
    >
      <div class="flex items-center gap-2">
        <input
          v-model="query"
          name="image-search"
          :aria-label="t('image.search')"
          :placeholder="t('image.search')"
          class="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-sm focus:outline-1 focus:outline-sky-600"
          @keydown.enter="browse"
          @input="browse"
        />
        <button
          class="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          @click="picking = false"
        >
          {{ t('image.cancel') }}
        </button>
      </div>
      <div v-if="results.length" class="grid min-h-0 flex-1 grid-cols-4 gap-2 overflow-y-auto">
        <button
          v-for="img in results"
          :key="img.id"
          class="overflow-hidden rounded border border-slate-200 hover:border-sky-500"
          :title="img.title"
          @click="use(img)"
        >
          <img :src="img.thumb" :alt="img.title" class="h-20 w-full object-cover" />
        </button>
      </div>
      <p v-else class="flex-1 py-6 text-center text-sm text-slate-500">{{ t('image.noImages') }}</p>
    </div>

    <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>

    <input ref="file" type="file" accept="image/*" class="hidden" @change="onFile" />
  </div>
</template>
