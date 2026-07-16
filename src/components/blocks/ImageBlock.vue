<script setup lang="ts">
import { ref } from 'vue'
import { Image as ImageIcon, RefreshCw, X } from 'lucide-vue-next'
import { pastePlain } from '../../store'
import type { ImageBlock } from '../../types'

const props = defineProps<{ block: ImageBlock; selected: boolean }>()

// initialise le texte de la légende sans le lier (le caret sauterait à chaque frappe)
const vInitText = {
  mounted: (el: HTMLElement, { value }: { value: string }) => {
    el.textContent = value
  },
}

const file = ref<HTMLInputElement | null>(null)
const url = ref('')

function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  // ponytail: image en dataURL dans le doc — brancher l'upload climweb lors de l'intégration
  const r = new FileReader()
  r.onload = () => (props.block.src = r.result as string)
  r.readAsDataURL(f)
}
</script>

<template>
  <div>
    <div
      v-if="!block.src"
      class="flex flex-col items-center gap-2.5 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8"
    >
      <ImageIcon :size="26" class="text-slate-400" />
      <button
        class="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
        @click="file?.click()"
      >
        Choisir une image
      </button>
      <div class="flex items-center gap-1.5 text-xs text-slate-500">
        ou
        <input
          v-model="url"
          name="image-url"
          aria-label="URL de l'image"
          placeholder="coller une URL puis Entrée"
          class="w-48 rounded border border-slate-200 bg-white px-2 py-1 focus:outline-1 focus:outline-sky-600"
          @click.stop
          @keydown.enter="url && (block.src = url)"
        />
      </div>
    </div>

    <figure v-else>
      <img :src="block.src" :alt="block.alt" class="block w-full rounded" />
      <figcaption
        v-init-text="block.caption ?? ''"
        contenteditable="true"
        spellcheck="false"
        data-placeholder="Ajouter une légende…"
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
          aria-label="Texte alternatif de l'image"
          placeholder="Texte alternatif"
          class="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs focus:outline-1 focus:outline-sky-600"
        />
        <button class="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100" @click="file?.click()">
          <RefreshCw :size="12" /> Remplacer
        </button>
        <button class="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50" @click="block.src = null">
          <X :size="12" /> Retirer
        </button>
      </div>
    </figure>

    <input ref="file" type="file" accept="image/*" class="hidden" @change="onFile" />
  </div>
</template>
