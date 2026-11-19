<script setup lang="ts">
/** Nouveau modèle : le produit climweb qui accueillera ses numéros, et un point de
 *  départ parmi ceux du studio (templates.ts). */
import { onMounted, ref } from 'vue'
import * as api from '../api'
import { t } from '../i18n'
import { go, href } from '../router'
import { createBulletin } from '../store'
import { templates, type Template } from '../templates'
import Breadcrumbs from '../components/studio/Breadcrumbs.vue'
import StudioLayout from '../components/studio/StudioLayout.vue'

/** les bulletins, puis les flashs médias : deux familles, deux formes d'aperçu */
const groups = [
  { kind: 'bulletin', title: 'chooser.startingPoint', hint: '', aspect: 'aspect-[3/4]' },
  { kind: 'flash', title: 'chooser.flashes', hint: 'chooser.flashesHint', aspect: 'aspect-square' },
].map((g) => ({ ...g, starters: templates.filter((s) => (s.kind ?? 'bulletin') === g.kind) }))

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

async function pick(starter: Template) {
  if (!productId.value || busy.value) return
  busy.value = true
  try {
    const name = starter.name ?? t('chooser.templateName', { label: starter.label.toLowerCase() })
    const id = await createBulletin({
      blocks: starter.make(), title: name, parent: productId.value, isTemplate: true,
      cadence: starter.cadence, kind: starter.kind, caption: starter.caption,
    })
    go({ name: 'editor', id })
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <StudioLayout section="templates">
    <Breadcrumbs
      :items="[
        { label: t('nav.home'), href: href({ name: 'home' }) },
        { label: t('nav.templates'), href: href({ name: 'templates' }) },
        { label: t('chooser.title') },
      ]"
    />
    <p v-if="error" role="alert" class="m-0 rounded-lg bg-red-50 px-4 py-2 text-red-700">{{ error }}</p>

    <div>
      <h1 class="m-0 text-2xl font-bold text-slate-900">{{ t('chooser.title') }}</h1>
      <p class="m-0 mt-1 text-slate-500">{{ t('chooser.intro') }}</p>

      <label class="mt-6 block max-w-md">
        <span class="text-sm font-medium text-slate-700">{{ t('chooser.product') }}</span>
        <select v-model="productId" class="bs-input mt-1">
          <option v-for="p in products" :key="p.id" :value="p.id">{{ p.title }}</option>
        </select>
        <span class="mt-1 block text-xs text-slate-500">{{ t('chooser.productHint') }}</span>
      </label>

      <p
        v-if="!products.length"
        class="mt-4 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-600"
      >
        {{ t('chooser.noProduct') }}
      </p>

      <template v-for="g in groups" :key="g.kind">
        <h2 class="mt-8 text-sm font-semibold text-slate-700">{{ t(g.title) }}</h2>
        <p v-if="g.hint" class="mt-0.5 text-xs text-slate-500">{{ t(g.hint) }}</p>

        <div class="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <button
            v-for="s in g.starters"
            :key="s.key"
            class="group flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-sky-500 hover:shadow-md disabled:opacity-40"
            :disabled="!productId || busy"
            @click="pick(s)"
          >
            <div
              class="flex flex-col gap-1.5 rounded border border-slate-200 bg-white p-2"
              :class="[g.aspect, s.preview.length === 0 && 'items-center justify-center border-dashed']"
            >
              <template v-for="(tok, i) in s.preview" :key="i">
                <div v-if="tok.t === 'band'" class="h-6 shrink-0 rounded-sm bg-slate-700" />
                <div v-else-if="tok.t === 'title'" class="h-2 w-1/2 shrink-0 rounded-sm bg-slate-400" />
                <template v-else-if="tok.t === 'text'">
                  <div class="h-1.5 shrink-0 rounded-sm bg-slate-200" />
                  <div class="h-1.5 w-4/5 shrink-0 rounded-sm bg-slate-200" />
                </template>
                <!-- dans un flash, la carte prend la place qui reste -->
                <div
                  v-else-if="tok.t === 'img'"
                  class="shrink-0 rounded-sm bg-slate-300"
                  :class="g.kind === 'flash' ? 'flex-1' : 'h-10'"
                />
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
              <span v-if="s.preview.length === 0" class="text-xs text-slate-400">{{ t('starters.empty') }}</span>
            </div>
            <span class="text-sm font-medium text-slate-700 group-hover:text-sky-800">{{ s.label }}</span>
          </button>
        </div>
      </template>
    </div>
  </StudioLayout>
</template>
