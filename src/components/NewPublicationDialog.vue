<script setup lang="ts">
/** « Nouvelle publication » : un bulletin ou un flash, d'un modèle pour une période, ou
 *  sans modèle à partir d'une mise en page. Il s'ouvre en brouillon dans l'éditeur.
 *
 *  Un <dialog> natif : le navigateur garde le focus dedans, Échap le ferme. */
import { computed, nextTick, ref, watch } from 'vue'
import { FileText, Megaphone, X } from 'lucide-vue-next'
import * as api from '../api'
import { issuesOf, templatesOf } from '../catalog'
import { siteToday } from '../fields'
import { t } from '../i18n'
import { library, refresh } from '../library'
import { newPublication, periodChoices, periodLabel } from '../newPublication'
import { periodOf } from '../periods'
import { go, href } from '../router'
import { createBulletin, createFromTemplate } from '../store'
import { templates as starters } from '../templates'
import type { Kind } from '../types'

const dialog = ref<HTMLDialogElement | null>(null)
const products = ref<api.ProductPage[]>([])
const busy = ref(false)
const error = ref<string | null>(null)

// d'un modèle
const periodKey = ref<'current' | 'next' | 'other'>('current')
const otherDate = ref('')
// sans modèle
const starterKey = ref('')
const productId = ref<number | null>(null)
const day = ref('')

const kinds = [
  { kind: 'bulletin', icon: FileText, tone: 'bg-sky-100 text-sky-700', hint: 'newPublication.bulletinHint' },
  { kind: 'flash', icon: Megaphone, tone: 'bg-violet-100 text-violet-700', hint: 'newPublication.flashHint' },
] as const
const sources = [
  { source: 'template', label: 'newPublication.fromTemplate', hint: 'newPublication.fromTemplateHint' },
  { source: 'blank', label: 'newPublication.blank', hint: 'newPublication.blankHint' },
] as const

const choices = computed(() => templatesOf(library.items).filter((tpl) => tpl.kind === newPublication.kind))
const template = computed(() => choices.value.find((tpl) => tpl.id === newPublication.templateId) ?? choices.value[0] ?? null)
const templateId = computed({
  get: () => template.value?.id ?? null,
  set: (id: number | null) => (newPublication.templateId = id),
})

const today = ref(siteToday())
const periods = computed(() =>
  template.value ? periodChoices(newPublication.kind, template.value.cadence, today.value) : [],
)
/** le jour envoyé au serveur, qui en déduit la période ; null tant qu'il manque */
const target = computed(() =>
  periodKey.value === 'other' ? otherDate.value || null : (periods.value.find((p) => p.key === periodKey.value)?.date ?? null),
)
/** la période de ce jour, telle que le serveur la fera */
const targetPeriod = computed(() => {
  if (!template.value || !target.value) return null
  return periodOf(newPublication.kind === 'flash' ? 'daily' : template.value.cadence, target.value)
})
/** un numéro de cette période existe déjà : l'auteur le rouvrira plutôt deux fois */
const existing = computed(() =>
  template.value && targetPeriod.value
    ? (issuesOf(library.items, template.value.id).find((b) => b.date === targetPeriod.value!.start) ?? null)
    : null,
)

const layouts = computed(() => starters.filter((s) => (s.kind ?? 'bulletin') === newPublication.kind))

const ready = computed(() =>
  newPublication.source === 'template'
    ? Boolean(template.value && target.value)
    : Boolean(layouts.value.some((s) => s.key === starterKey.value) && productId.value && day.value),
)

watch(
  () => newPublication.open,
  async (open) => {
    if (!open) return dialog.value?.close()
    error.value = null
    busy.value = false
    periodKey.value = 'current'
    today.value = siteToday()
    otherDate.value = today.value
    day.value = today.value
    starterKey.value = ''
    await nextTick()
    dialog.value?.showModal()
    void refresh()
    if (!products.value.length) {
      try {
        products.value = await api.listProductPages()
        productId.value ??= products.value[0]?.id ?? null
      } catch (e) {
        error.value = (e as Error).message
      }
    }
  },
)

// la mise en page par défaut suit le type : une page vierge, un carré vierge
watch(
  [layouts, () => newPublication.open],
  ([list]) => {
    if (!list.some((s) => s.key === starterKey.value)) starterKey.value = list[0]?.key ?? ''
  },
  { immediate: true },
)

function pickKind(kind: Kind) {
  newPublication.kind = kind
  if (template.value?.kind !== kind) newPublication.templateId = null
}

function close() {
  newPublication.open = false
}

async function create() {
  if (!ready.value || busy.value) return
  busy.value = true
  error.value = null
  try {
    let id: number
    if (newPublication.source === 'template') {
      id = await createFromTemplate(template.value!.id, target.value!)
    } else {
      const starter = layouts.value.find((s) => s.key === starterKey.value)!
      const untitled = newPublication.kind === 'flash' ? 'newPublication.untitledFlash' : 'newPublication.untitledBulletin'
      id = await createBulletin({
        blocks: starter.make(),
        title: starter.name ?? t(untitled),
        parent: productId.value!,
        kind: newPublication.kind,
        caption: starter.caption,
        date: day.value,
      })
    }
    close()
    void refresh()
    go({ name: 'editor', id })
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

const card = (on: boolean) => (on ? 'border-sky-700 bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-300')
</script>

<template>
  <!-- un clic sur le fond (le dialog lui-même, autour de la boîte) le ferme -->
  <dialog
    ref="dialog"
    aria-labelledby="bs-new-publication"
    class="m-auto mt-24 w-[calc(100%-2rem)] max-w-[560px] rounded-[14px] border-0 bg-white p-0 text-sm text-slate-800 shadow-2xl backdrop:bg-slate-900/45"
    @close="newPublication.open = false"
    @click="(e) => e.target === dialog && close()"
  >
    <form v-if="newPublication.open" method="dialog" class="flex flex-col" @submit.prevent="create">
      <div class="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <h2 id="bs-new-publication" class="m-0 text-[17px] font-semibold text-slate-900">{{ t('newPublication.title') }}</h2>
        <button type="button" class="bs-btn bs-btn-icon ms-auto min-h-9! min-w-9!" :aria-label="t('newPublication.close')" @click="close">
          <X :size="18" aria-hidden="true" />
        </button>
      </div>

      <div class="flex flex-col gap-[18px] px-5 pt-[18px] pb-5">
        <fieldset class="m-0 min-w-0 border-0 p-0">
          <legend class="mb-2 p-0 font-semibold text-slate-900">{{ t('newPublication.type') }}</legend>
          <div class="flex flex-wrap gap-2.5">
            <label
              v-for="k in kinds"
              :key="k.kind"
              class="flex flex-[1_1_220px] cursor-pointer items-center gap-2.5 rounded-[10px] border-2 px-3 py-2.5"
              :class="card(newPublication.kind === k.kind)"
            >
              <input
                type="radio"
                name="bs-np-kind"
                :checked="newPublication.kind === k.kind"
                class="m-0 size-4 accent-sky-700"
                @change="pickKind(k.kind)"
              />
              <span class="flex size-8 shrink-0 items-center justify-center rounded-lg" :class="k.tone" aria-hidden="true">
                <component :is="k.icon" :size="16" />
              </span>
              <span class="flex flex-col">
                <strong class="font-semibold text-slate-900">{{ t(`kind.${k.kind}`) }}</strong>
                <span class="text-xs text-slate-500">{{ t(k.hint) }}</span>
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset class="m-0 min-w-0 border-0 p-0">
          <legend class="mb-2 p-0 font-semibold text-slate-900">{{ t('newPublication.source') }}</legend>
          <div class="flex flex-wrap gap-2.5">
            <label
              v-for="s in sources"
              :key="s.source"
              class="flex flex-[1_1_220px] cursor-pointer items-center gap-2.5 rounded-[10px] border-2 px-3 py-2.5"
              :class="card(newPublication.source === s.source)"
            >
              <input
                v-model="newPublication.source"
                type="radio"
                name="bs-np-source"
                :value="s.source"
                class="m-0 size-4 accent-sky-700"
              />
              <span class="flex flex-col">
                <strong class="font-semibold text-slate-900">{{ t(s.label) }}</strong>
                <span class="text-xs text-slate-500">{{ t(s.hint) }}</span>
              </span>
            </label>
          </div>
        </fieldset>

        <!-- d'un modèle : lequel, et pour quelle période -->
        <div v-if="newPublication.source === 'template'" class="flex flex-col gap-3">
          <p v-if="library.loaded && !choices.length" class="m-0 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-slate-600">
            {{ t(`newPublication.noTemplate.${newPublication.kind}`) }}
            <a :href="href({ name: 'newTemplate' })" class="font-medium text-sky-700 hover:underline" @click="close">
              {{ t('newPublication.createTemplate') }}
            </a>
          </p>
          <template v-else-if="template">
            <label class="flex flex-col gap-1.5 font-medium text-slate-700">
              {{ t('newPublication.template') }}
              <select v-model="templateId" class="bs-input">
                <option v-for="tpl in choices" :key="tpl.id" :value="tpl.id">{{ tpl.title }}</option>
              </select>
            </label>
            <label class="flex flex-col gap-1.5 font-medium text-slate-700">
              {{ t('newPublication.period') }}
              <select v-model="periodKey" class="bs-input">
                <option v-for="p in periods" :key="p.key" :value="p.key">{{ p.label }}</option>
                <option value="other">{{ t('newPublication.other') }}</option>
              </select>
            </label>
            <label v-if="periodKey === 'other'" class="flex flex-col gap-1.5 font-medium text-slate-700">
              {{ t('newPublication.otherDate') }}
              <input v-model="otherDate" type="date" required class="bs-input" />
              <span v-if="targetPeriod" class="text-xs font-normal text-slate-500">
                {{ t('newPublication.covers', { label: periodLabel(newPublication.kind, template.cadence, targetPeriod) }) }}
              </span>
            </label>
            <p v-if="existing" class="m-0 rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
              {{ t('newPublication.exists', { title: existing.title }) }}
              <a :href="href({ name: 'editor', id: existing.id })" class="font-medium text-sky-800 underline" @click="close">
                {{ t('newPublication.openExisting') }}
              </a>
            </p>
          </template>
        </div>

        <!-- sans modèle : une mise en page de départ, un produit, un jour -->
        <div v-else class="flex flex-col gap-3">
          <label class="flex flex-col gap-1.5 font-medium text-slate-700">
            {{ t('newPublication.layout') }}
            <select v-model="starterKey" class="bs-input">
              <option v-for="s in layouts" :key="s.key" :value="s.key">{{ s.label }}</option>
            </select>
          </label>
          <p v-if="!products.length && !error" class="m-0 text-slate-600">{{ t('chooser.noProduct') }}</p>
          <div class="flex flex-wrap gap-3">
            <label class="flex flex-[1_1_260px] flex-col gap-1.5 font-medium text-slate-700">
              {{ t('chooser.product') }}
              <select v-model="productId" class="bs-input">
                <option v-for="p in products" :key="p.id" :value="p.id">{{ p.title }}</option>
              </select>
            </label>
            <label class="flex flex-[0_1_170px] flex-col gap-1.5 font-medium text-slate-700">
              {{ t('newPublication.date') }}
              <input v-model="day" type="date" required class="bs-input" />
            </label>
          </div>
        </div>

        <p v-if="error" role="alert" class="m-0 rounded-lg bg-red-50 px-3 py-2 text-red-700">{{ error }}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2 rounded-b-[14px] border-t border-slate-100 bg-slate-50 px-5 py-3.5">
        <p class="m-0 flex-[1_1_200px] text-xs text-slate-500">{{ t('newPublication.note') }}</p>
        <button type="button" class="bs-btn bs-btn-secondary" @click="close">{{ t('newPublication.cancel') }}</button>
        <button type="submit" class="bs-btn bs-btn-primary" :disabled="!ready || busy">
          {{ t(busy ? 'newPublication.creating' : 'newPublication.create') }}
        </button>
      </div>
    </form>
  </dialog>
</template>
