<script setup lang="ts">
/** L'éditeur d'un bulletin, d'un flash ou d'un modèle : en haut où l'on est et ce
 *  qu'on modifie (EditorHeader, EditorContext), puis la palette et la page. */
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { go } from '../router'
import { doc, openBulletin, settled, ui } from '../store'
import Canvas from './Canvas.vue'
import EditorContext from './EditorContext.vue'
import EditorHeader from './EditorHeader.vue'
import FlashCanvas from './FlashCanvas.vue'
import FlashPanel from './FlashPanel.vue'
import Sidebar from './Sidebar.vue'

const props = defineProps<{ id: number }>()

const flash = computed(() => doc.kind === 'flash')
/** le document demandé est chargé : avant, l'en-tête dirait encore le précédent */
const ready = computed(() => doc.id === props.id)

watch(
  () => props.id,
  async (id) => {
    if (!(await openBulletin(id))) go({ name: 'home' })
  },
  { immediate: true },
)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') ui.selectedId = null
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  void settled() // la dernière frappe part avant que la page qu'on rejoint relise la liste
})
</script>

<template>
  <div class="bs-app flex h-full flex-col bg-white text-sm text-slate-800 antialiased">
    <!-- l'impression ne garde que le bulletin : `.bs-app > header` est masqué -->
    <header class="shrink-0">
      <EditorHeader />
      <EditorContext v-if="ready" />
    </header>

    <p v-if="ui.error" role="alert" class="shrink-0 bg-red-50 px-4 py-2 text-red-700">{{ ui.error }}</p>

    <div class="flex min-h-0 flex-1">
      <Sidebar />
      <template v-if="flash">
        <FlashCanvas />
        <FlashPanel />
      </template>
      <Canvas v-else />
    </div>
  </div>
</template>
