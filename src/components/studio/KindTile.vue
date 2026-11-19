<script setup lang="ts">
/** La pastille qui dit d'un coup d'œil ce qu'est une ligne : un bulletin (bleu), un
 *  flash média (violet), un modèle (ambre). */
import { computed } from 'vue'
import { FileText, LayoutTemplate, Megaphone } from 'lucide-vue-next'
import type { Kind } from '../../types'

const props = withDefaults(defineProps<{ kind: Kind; template?: boolean; size?: 'sm' | 'md' | 'lg' }>(), {
  template: false,
  size: 'sm',
})

const icon = computed(() => (props.template && props.kind === 'bulletin' ? LayoutTemplate : props.kind === 'flash' ? Megaphone : FileText))
const tone = computed(() =>
  props.kind === 'flash' ? 'bg-violet-100 text-violet-700' : props.template ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700',
)
const box = { sm: 'size-8 rounded-lg', md: 'size-10 rounded-[10px]', lg: 'size-12 rounded-xl' }
const glyph = { sm: 16, md: 18, lg: 22 }
</script>

<template>
  <span class="flex shrink-0 items-center justify-center" :class="[box[size], tone]" aria-hidden="true">
    <component :is="icon" :size="glyph[size]" />
  </span>
</template>
