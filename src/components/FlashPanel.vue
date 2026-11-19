<script setup lang="ts">
/** Le texte du post et le partage d'un flash : sans compte relié à aucun réseau,
 *  l'image et le texte vont où l'auteur les colle (WhatsApp d'abord).
 *
 *  Le texte prend la hauteur du panneau ; le partage reste en bas, toujours visible.
 *  Chaque action capture le visuel tel qu'il est à l'écran. Tant que rien ne change,
 *  la même image resert : copier puis télécharger ne capture qu'une fois. */
import { computed, ref, watch } from 'vue'
import { Check, ClipboardCopy, Download, Image as ImageIcon, Share2 } from 'lucide-vue-next'
import { letterhead } from '../api'
import { t } from '../i18n'
import { canCopyImage, canShareFiles, copyImage, download, FLASH_PIXELS, shareFile } from '../share'
import { captureCurrent, doc, fileName, issueDates } from '../store'
import CaptionEditor from './CaptionEditor.vue'

type Action = 'share' | 'copyImage' | 'copyText' | 'download'

const busy = ref<Action | null>(null)
/** l'action qui vient de réussir : sa ligne le dit un moment */
const done = ref<Action | null>(null)
const error = ref<string | null>(null)

const canShare = canShareFiles()
const canCopy = canCopyImage()

/** le texte du post, suivi du lien de la page une fois le flash publié */
const link = computed(() => (doc.url ? new URL(doc.url, location.origin).href : ''))
const postText = computed(() => [doc.caption.trim(), link.value].filter(Boolean).join('\n\n'))

// la dernière capture, tant que le visuel n'a pas changé
let version = 0
let cached: { version: number; blob: Promise<Blob> } | null = null
watch([() => doc.blocks, () => doc.title, issueDates, () => letterhead], () => version++, { deep: true })

function image(): Promise<Blob> {
  if (cached?.version !== version) {
    const blob = captureCurrent().then((c) => c.blob)
    cached = { version, blob }
    blob.catch(() => (cached = null)) // une capture ratée ne resert pas
  }
  return cached.blob
}

const name = () => `${fileName()}.png`
const ACTIONS: Record<Action, () => Promise<unknown>> = {
  share: async () => shareFile(await image(), name(), postText.value),
  // la promesse part telle quelle dans le presse-papier, dans le clic (share.ts)
  copyImage: () => copyImage(image()),
  copyText: () => navigator.clipboard.writeText(postText.value),
  download: async () => download(await image(), name()),
}

let doneTimer: ReturnType<typeof setTimeout> | undefined
async function run(key: Action) {
  busy.value = key
  done.value = error.value = null
  try {
    await ACTIONS[key]()
    done.value = key
    clearTimeout(doneTimer)
    doneTimer = setTimeout(() => (done.value = null), 4000)
  } catch (e) {
    const err = e as Error
    if (err.name === 'AbortError') return // partage annulé par l'auteur
    // le partage doit partir dans le clic : une capture trop longue le fait refuser,
    // le second clic trouve l'image prête
    error.value = err.name === 'NotAllowedError' ? t('flash.shareAgain') : err.message
  } finally {
    busy.value = null
  }
}

interface Row {
  key: Action
  icon: unknown
  /** la pastille de l'icône */
  tone: string
  label: string
  sub: string
  /** ce que la ligne dit une fois l'action faite */
  done: string
  /** sur un ordinateur, WhatsApp Web en deux temps : l'image, puis le texte */
  step?: number
}
const rows = computed<Row[]>(() => [
  ...(canShare
    ? [{ key: 'share', icon: Share2, tone: 'bg-sky-700 text-white', label: t('flash.shareNative'), sub: t('flash.shareNativeSub'), done: '' } as Row]
    : []),
  ...(canCopy
    ? [{ key: 'copyImage', icon: ImageIcon, tone: 'bg-emerald-100 text-emerald-700', label: t('flash.copyImage'), sub: t('flash.copyImageSub'), done: t('flash.imageCopied'), step: 1 } as Row]
    : []),
  {
    key: 'copyText', icon: ClipboardCopy, tone: 'bg-emerald-100 text-emerald-700', label: t('flash.copyText'),
    sub: t('flash.copyTextSub'), done: t('flash.textCopied'), step: canCopy ? 2 : undefined,
  },
  {
    key: 'download', icon: Download, tone: 'bg-slate-100 text-slate-600', label: t('flash.download'),
    sub: t('flash.downloadSub', { size: FLASH_PIXELS }), done: t('flash.downloaded'),
  },
])
</script>

<template>
  <!-- aussi large que l'écran le permet, jusqu'à 32rem : il cède sa largeur au carré,
       jamais en dessous de 20rem -->
  <aside class="flex w-[32rem] min-w-80 flex-col overflow-y-auto border-l border-slate-200 bg-white">
    <section class="flex min-h-[22rem] flex-1 flex-col px-5 pt-5 pb-3">
      <h2 class="text-sm font-semibold text-slate-800">{{ t('flash.post') }}</h2>
      <p class="mt-0.5 text-xs leading-relaxed text-slate-500">{{ t('flash.postHint') }}</p>
      <CaptionEditor v-model="doc.caption" :placeholder="t('flash.postPlaceholder')" class="mt-3 flex-1" />
      <div class="mt-1.5 flex items-start justify-between gap-3 text-xs text-slate-400">
        <span>{{ t('flash.formatHint') }}</span>
        <span class="shrink-0 text-end">
          {{ t('flash.chars', { count: postText.length }) }}<template v-if="link"><br />{{ t('flash.withLink') }}</template>
        </span>
      </div>
    </section>

    <section class="shrink-0 border-t border-slate-200 bg-slate-50 px-5 pt-4 pb-5">
      <h2 class="text-sm font-semibold text-slate-800">{{ t('flash.share') }}</h2>
      <p class="mt-0.5 text-xs leading-relaxed text-slate-500">
        {{ t(canShare ? 'flash.shareHintMobile' : 'flash.shareHint') }}
      </p>
      <div class="mt-3 flex flex-col gap-2">
        <button
          v-for="r in rows"
          :key="r.key"
          class="flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-start transition hover:border-sky-500 hover:shadow-sm disabled:opacity-60"
          :class="done === r.key ? 'border-emerald-400' : 'border-slate-200'"
          :disabled="!!busy || (r.key === 'copyText' && !postText)"
          @click="run(r.key)"
        >
          <span
            class="flex size-9 shrink-0 items-center justify-center rounded-full"
            :class="done === r.key ? 'bg-emerald-600 text-white' : r.tone"
          >
            <Check v-if="done === r.key" :size="17" />
            <component :is="r.icon" v-else :size="17" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold text-slate-800">{{ r.label }}</span>
            <span class="block text-xs" :class="done === r.key ? 'text-emerald-700' : 'text-slate-500'">
              {{ busy === r.key ? t('flash.capturing') : done === r.key && r.done ? r.done : r.sub }}
            </span>
          </span>
          <span
            v-if="r.step"
            class="flex size-6 shrink-0 items-center justify-center rounded-full border border-emerald-300 text-xs font-bold text-emerald-700"
            :title="t('flash.step', { n: r.step })"
          >
            {{ r.step }}
          </span>
        </button>
      </div>
      <p v-if="error" class="mt-2 text-xs text-red-600">{{ error }}</p>
    </section>
  </aside>
</template>
