<script setup lang="ts">
import { computed } from 'vue'
import { Minus, Plus } from 'lucide-vue-next'
import { pastePlain } from '../../store'
import type { TableBlock } from '../../types'

const props = defineProps<{ block: TableBlock; selected: boolean }>()

// initialise le texte des cellules sans le lier (le caret sauterait à chaque frappe)
const vInitText = {
  mounted: (el: HTMLElement, { value }: { value: string }) => {
    el.textContent = value
  },
}

// changer de dimensions remonte tout le tableau : les cellules réutilisées garderaient un texte périmé
const dims = computed(() => `${props.block.rows.length}x${props.block.rows[0]?.length ?? 0}`)

function addRow() {
  props.block.rows.push(props.block.rows[0].map(() => ''))
}
function removeRow() {
  if (props.block.rows.length > 1) props.block.rows.pop()
}
function addCol() {
  props.block.rows.forEach((r) => r.push(''))
}
function removeCol() {
  if (props.block.rows[0].length > 1) props.block.rows.forEach((r) => r.pop())
}

const ctl =
  'flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:border-sky-400 hover:text-sky-700'
</script>

<template>
  <div>
    <table :key="dims" class="w-full border-collapse text-sm">
      <tbody>
        <tr v-for="(row, ri) in block.rows" :key="ri">
          <td
            v-for="(cell, ci) in row"
            :key="ci"
            v-init-text="cell"
            contenteditable="true"
            spellcheck="false"
            class="border border-slate-200 px-3 py-2 align-top outline-none focus:bg-sky-50"
            :class="ri === 0 && block.header ? 'bg-slate-100 font-semibold text-slate-800' : 'text-slate-600'"
            @input="block.rows[ri][ci] = ($event.target as HTMLElement).textContent ?? ''"
            @paste="pastePlain"
            @keydown.enter.prevent
          ></td>
        </tr>
      </tbody>
    </table>

    <div v-if="selected" class="mt-2 flex flex-wrap items-center gap-1.5" @click.stop>
      <button :class="ctl" @click="addRow"><Plus :size="12" /> Ligne</button>
      <button :class="ctl" title="Supprimer la dernière ligne" @click="removeRow"><Minus :size="12" /> Ligne</button>
      <button :class="ctl" @click="addCol"><Plus :size="12" /> Colonne</button>
      <button :class="ctl" title="Supprimer la dernière colonne" @click="removeCol"><Minus :size="12" /> Colonne</button>
      <label class="ml-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <input v-model="block.header" type="checkbox" class="accent-sky-700" />
        Ligne d'en-tête
      </label>
    </div>
  </div>
</template>
