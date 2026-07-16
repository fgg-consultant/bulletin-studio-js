<script setup lang="ts">
import type { DividerBlock } from '../../types'

defineProps<{ block: DividerBlock; selected: boolean }>()
</script>

<template>
  <hr class="my-3 border-t-2 border-slate-200" />
</template>
