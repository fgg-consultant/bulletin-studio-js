<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'
import * as api from '../api'
import { go } from '../router'
import { createBulletin } from '../store'
import { templates, type Template } from '../templates'

const products = ref<api.ProductPage[]>([])
const productId = ref<number | null>(null)
const error = ref<string | null>(null)
const busy = ref(false)

onMounted(async () => {
  try {
    products.value = await api.listProductPages()
    productId.value = products.value[0]?.id ?? null
  } catch (e) {
    error.value = (e as Error).message
  }
})

async function pick(t: Template) {
  if (!productId.value || busy.value) return
  busy.value = true
  try {
    go(`#/b/${await createBulletin(t.make(), `Modèle ${t.label.toLowerCase()}`, productId.value, true)}`)
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="flex h-full flex-col bg-slate-50 text-slate-800 antialiased">
    <header class="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4">
      <a href="#/" class="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50">
        <ArrowLeft :size="15" />
        Mes bulletins
      </a>
      <div class="h-5 w-px bg-slate-200" />
      <span class="text-sm font-semibold tracking-tight">Nouveau modèle</span>
    </header>

    <p v-if="error" class="shrink-0 bg-red-50 px-4 py-2 text-sm text-red-700">{{ error }}</p>

    <main class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto max-w-5xl px-6 py-10">
        <h1 class="text-xl font-bold tracking-tight text-slate-900">Nouveau modèle</h1>
        <p class="mt-1 text-sm text-slate-500">
          Le modèle est un simple point de départ : tout reste modifiable par glisser-déposer.
        </p>

        <label class="mt-6 block max-w-md">
          <span class="text-sm font-medium text-slate-700">Produit climweb</span>
          <select
            v-model="productId"
            class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-sky-600"
          >
            <option v-for="p in products" :key="p.id" :value="p.id">{{ p.title }}</option>
          </select>
          <span class="mt-1 block text-xs text-slate-500">
            Les bulletins issus de ce modèle seront publiés comme parutions de ce produit.
          </span>
        </label>

        <p
          v-if="!products.length"
          class="mt-4 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-600"
        >
          Aucun produit dans climweb. Créez d'abord une page Produit
          (<em>Pages → Produits</em>), elle accueillera les bulletins de ce modèle.
        </p>

        <h2 class="mt-8 text-sm font-semibold text-slate-700">Point de départ</h2>

        <div class="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <button
            v-for="t in templates"
            :key="t.key"
            class="group flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-sky-500 hover:shadow-md disabled:opacity-40"
            :disabled="!productId || busy"
            @click="pick(t)"
          >
            <div
              class="flex aspect-[3/4] flex-col gap-1.5 rounded border border-slate-200 bg-white p-2"
              :class="t.preview.length === 0 && 'items-center justify-center border-dashed'"
            >
              <template v-for="(tok, i) in t.preview" :key="i">
                <div v-if="tok.t === 'band'" class="h-6 shrink-0 rounded-sm bg-slate-700" />
                <div v-else-if="tok.t === 'title'" class="h-2 w-1/2 shrink-0 rounded-sm bg-slate-400" />
                <template v-else-if="tok.t === 'text'">
                  <div class="h-1.5 shrink-0 rounded-sm bg-slate-200" />
                  <div class="h-1.5 w-4/5 shrink-0 rounded-sm bg-slate-200" />
                </template>
                <div v-else-if="tok.t === 'img'" class="h-10 shrink-0 rounded-sm bg-slate-300" />
                <div v-else-if="tok.t === 'cols'" class="flex h-10 shrink-0 gap-1">
                  <div
                    v-for="(r, j) in tok.r"
                    :key="j"
                    class="h-full rounded-sm bg-slate-300"
                    :style="{ flexGrow: r, flexBasis: 0 }"
                  />
                </div>
                <div v-else-if="tok.t === 'table'" class="grid shrink-0 grid-cols-3 gap-px overflow-hidden rounded-sm bg-slate-200 p-px">
                  <div v-for="j in 6" :key="j" class="h-2.5 bg-white" :class="j <= 3 && 'bg-slate-100'" />
                </div>
              </template>
              <span v-if="t.preview.length === 0" class="text-xs text-slate-400">vide</span>
            </div>
            <span class="text-sm font-medium text-slate-700 group-hover:text-sky-800">{{ t.label }}</span>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>
