<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarPlus, Plus, X } from 'lucide-vue-next'
import { FIELDS, fieldLabel, type Field } from '../../fields'
import { t } from '../../i18n'
import { uid } from '../../store'
import type { HeaderBlock } from '../../types'
import FieldText from '../FieldText.vue'

const props = defineProps<{ block: HeaderBlock; selected: boolean }>()

const swatches = ['#175243', '#0c4a6e', '#1e293b', '#7f1d1d', '#b45309', '#f1f5f9']

const dark = computed(() => {
  const [r = 0, g = 0, b = 0] = (props.block.bg.match(/\w\w/g) ?? []).map((h) => parseInt(h, 16))
  return r * 0.299 + g * 0.587 + b * 0.114 < 140
})

// une date s'insère là où est le curseur, dans l'un des textes de l'en-tête : les
// boutons ne prennent pas le focus (mousedown.prevent), le texte le garde
const inField = ref(false)
const track = (e: FocusEvent) => {
  inField.value = e.type === 'focusin' && (e.target as HTMLElement).matches('[data-fields]')
}
function insert(field: Field) {
  if (inField.value) document.execCommand('insertText', false, `{${field}}`)
}
</script>

<template>
  <div
    class="bs-header rounded-lg px-8 py-9 transition-colors"
    :class="dark ? 'text-white' : 'text-slate-900'"
    :style="{ backgroundColor: block.bg }"
    @focusin="track"
    @focusout="track"
  >
    <div class="flex items-center gap-3">
      <span class="h-px w-8 shrink-0" :class="dark ? 'bg-white/60' : 'bg-slate-500'" />
      <FieldText
        v-model="block.eyebrow"
        :placeholder="t('header.eyebrow')"
        class="text-xs font-semibold tracking-[0.15em] uppercase outline-none"
        :class="dark ? 'text-white/75' : 'text-slate-600'"
      />
    </div>

    <FieldText
      v-model="block.title"
      tag="h1"
      :placeholder="t('header.title')"
      class="mt-4 text-4xl leading-tight font-extrabold tracking-tight text-inherit outline-none"
    />

    <FieldText
      v-model="block.subtitle"
      tag="p"
      :placeholder="t('header.subtitle')"
      class="mt-4 max-w-2xl text-base leading-relaxed outline-none"
      :class="dark ? 'text-white/85' : 'text-slate-700'"
    />

    <div class="mt-6 flex flex-wrap items-center gap-2">
      <span
        v-for="badge in block.badges"
        :key="badge.id"
        class="flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium"
        :class="dark ? 'border-white/25 bg-white/10' : 'border-slate-300 bg-white/60'"
      >
        <FieldText v-model="badge.text" class="outline-none" />
        <button
          v-if="selected"
          class="-mr-1 rounded-full p-0.5 opacity-60 hover:opacity-100"
          :title="t('header.removeBadge')"
          @click.stop="block.badges.splice(block.badges.indexOf(badge), 1)"
        >
          <X :size="11" />
        </button>
      </span>
      <button
        v-if="selected"
        class="flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-xs font-medium opacity-70 hover:opacity-100"
        :class="dark ? 'border-white/40' : 'border-slate-400'"
        @click.stop="block.badges.push({ id: uid(), text: t('header.badge') })"
      >
        <Plus :size="11" /> {{ t('header.badge') }}
      </button>
    </div>

    <div
      v-if="selected"
      class="mt-6 flex w-fit flex-wrap items-center gap-1.5 rounded-lg bg-white/95 p-2 shadow"
      :title="inField ? '' : t('header.fieldsHint')"
      @click.stop
    >
      <span class="flex items-center gap-1 px-1 text-xs font-medium text-slate-600">
        <CalendarPlus :size="13" /> {{ t('header.insertDate') }}
      </span>
      <button
        v-for="f in FIELDS"
        :key="f"
        class="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-700 enabled:hover:border-sky-600 enabled:hover:text-sky-700 disabled:opacity-40"
        :disabled="!inField"
        @mousedown.prevent
        @click="insert(f)"
      >
        {{ fieldLabel(f) }}
      </button>
    </div>

    <div v-if="selected" class="mt-2 flex w-fit items-center gap-2 rounded-lg bg-white/95 p-2 shadow" @click.stop>
      <span class="px-1 text-xs font-medium text-slate-600">{{ t('header.background') }}</span>
      <button
        v-for="c in swatches"
        :key="c"
        class="size-5 rounded-full border border-slate-300"
        :class="block.bg === c && 'ring-2 ring-sky-600 ring-offset-1'"
        :style="{ backgroundColor: c }"
        :title="c"
        @click="block.bg = c"
      />
      <input
        v-model="block.bg"
        type="color"
        :aria-label="t('header.customColor')"
        class="size-6 cursor-pointer rounded border border-slate-300"
      />
    </div>
  </div>
</template>
