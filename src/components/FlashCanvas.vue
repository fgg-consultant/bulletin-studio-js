<script setup lang="ts">
/** Le visuel d'un flash média : un carré, l'image exportée telle quelle (share.ts).
 *
 *  En haut, l'identité de l'organisation (réglages climweb > Organisation), petite : le
 *  logo et le drapeau, le nom à défaut de logo ; au pied le site : une image transférée de groupe en groupe doit dire d'où elle vient.
 *  Ni l'une ni l'autre n'est dans le document, comme l'en-tête du PDF : un changement
 *  des réglages vaut pour tous les flashs exportés ensuite.
 *
 *  Une carte ou une image fait le fond : la première remplie prend tout le carré sous la
 *  barre blanche de l'identité, et le reste se pose dessus — le pied sur fond
 *  transparent, les blocs écrits avant elle en haut, ceux d'après en bas. Sans elles,
 *  les blocs s'empilent sur fond blanc. */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import draggable from 'vuedraggable'
import { Megaphone, TriangleAlert } from 'lucide-vue-next'
import { letterhead } from '../api'
import { t } from '../i18n'
import { FLASH_CSS, FLASH_PIXELS } from '../share'
import { doc, ui } from '../store'
import type { Block } from '../types'
import BlockRenderer from './BlockRenderer.vue'

const body = ref<HTMLElement | null>(null)

/** le site, que l'on puisse vérifier un visuel qui circule */
const site = location.host

const hasMap = (blocks: Block[]): boolean =>
  blocks.some((b) => (b.type === 'map' && b.tiles) || (b.type === 'columns' && b.columns.some(hasMap)))
/** le fond OpenStreetMap exige son crédit, sur l'image même */
const credit = computed(() => hasMap(doc.blocks))

const identity = computed(() => !!(letterhead.logo || letterhead.flag || letterhead.text))

/** Le fond, lu dans le DOM plutôt que dans le document : une carte de prévision de
 *  modèle n'est qu'un aperçu que son bloc charge, et un bloc encore vide (son invite)
 *  ne fait pas un fond. */
const MEDIA = ':scope > :is([data-block-type="map"], [data-block-type="forecast"], [data-block-type="image"])'
function findBackdrop() {
  const list = body.value?.querySelector('.bs-flash-blocks')
  const el = list && [...list.querySelectorAll<HTMLElement>(MEDIA)].find((b) => b.querySelector('.bs-map, figure img'))
  const id = el?.dataset.id ?? null
  if (ui.backdropId !== id) ui.backdropId = id
}
const full = computed(() => !!ui.backdropId)

/** Ce qui ne tient pas dans le carré : les cartes et les images cèdent leur hauteur au
 *  texte, jusqu'à un minimum ; sur un fond, les blocs posés dessus se partagent sa
 *  hauteur. Au-delà, le contenu sort du cadre, et la publication le fait confirmer
 *  (store.ts). */
const check = () => {
  const el = body.value
  ui.overflow = !!el && el.scrollHeight > el.clientHeight + 1
}
const observer = new ResizeObserver(check)
const mutations = new MutationObserver(findBackdrop)
function observe() {
  observer.disconnect()
  mutations.disconnect()
  if (!body.value) return
  observer.observe(body.value)
  // la taille des blocs change avec ce qu'on y tape, celle du cadre jamais
  body.value.querySelectorAll('[data-block-type]').forEach((el) => observer.observe(el))
  mutations.observe(body.value, { childList: true, subtree: true })
  findBackdrop()
  check()
}
onMounted(observe)
watch(() => doc.blocks, () => nextTick(observe), { deep: true })
onBeforeUnmount(() => {
  observer.disconnect()
  mutations.disconnect()
  ui.overflow = false
  ui.backdropId = null
})
</script>

<template>
  <!-- le carré entier, ses marges comprises : le panneau du texte cède sa largeur avant
       lui (FlashPanel.vue) -->
  <main
    class="bs-canvas bs-dots min-h-0 flex-1 overflow-y-auto"
    :style="{ minWidth: `${FLASH_CSS + 48}px` }"
    @click="ui.selectedId = null"
  >
    <div class="mx-auto my-10 flex w-fit flex-col items-center gap-3 px-6">
      <div
        class="bs-flash"
        :class="{ 'bs-flash-full': full }"
        data-flash-card
        :style="{ width: `${FLASH_CSS}px`, height: `${FLASH_CSS}px` }"
      >
        <div v-if="identity" class="bs-flash-top" :title="t('flash.identity')">
          <img v-if="letterhead.logo" :src="letterhead.logo" alt="" class="bs-flash-logo" />
          <!-- le nom seulement sans logo : un logo porte déjà le sien -->
          <p v-if="letterhead.text && !letterhead.logo" class="bs-flash-org">{{ letterhead.text }}</p>
          <img v-if="letterhead.flag" :src="letterhead.flag" alt="" class="bs-flash-flag" />
        </div>

        <div ref="body" class="bs-flash-body">
          <draggable
            v-model="doc.blocks"
            group="blocks"
            item-key="id"
            handle=".drag-handle"
            ghost-class="drag-ghost"
            :animation="150"
            class="bs-flash-blocks"
          >
            <template #item="{ element }">
              <BlockRenderer :block="element" />
            </template>
          </draggable>

          <div
            v-if="doc.blocks.length === 0"
            class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 print:hidden"
          >
            <div class="rounded-full border-2 border-dashed border-slate-300 p-4">
              <Megaphone :size="28" />
            </div>
            <p class="mt-1 font-medium text-slate-500">{{ t('flash.empty') }}</p>
            <p class="text-sm">{{ t('canvas.emptyHint') }}</p>
          </div>
        </div>

        <div class="bs-flash-foot">
          <span>{{ site }}</span>
          <span v-if="credit">{{ t('flash.basemap') }}</span>
        </div>
      </div>

      <!-- les réglages du fond (couche, date, image…) : sur le carré, ils cacheraient
           ce qu'ils règlent -->
      <div id="bs-flash-tools" class="bs-flash-tools" @click.stop />

      <p
        v-if="ui.overflow"
        class="flex max-w-[540px] items-center gap-1.5 rounded-md bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800"
      >
        <TriangleAlert :size="14" class="shrink-0" /> {{ t('flash.overflow') }}
      </p>
      <p class="max-w-[540px] text-center text-xs text-slate-400">
        {{ t('flash.size', { size: FLASH_PIXELS }) }}
        <template v-if="identity"><br />{{ t('flash.identity') }}</template>
      </p>
    </div>
  </main>
</template>
