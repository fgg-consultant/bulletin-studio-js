<script setup lang="ts">
/** Un texte de l'en-tête, qui peut contenir des dates insérées (`fields.ts`). Pendant la
 *  saisie, les champs restent tels quels (`{start}`) ; le reste du temps, un modèle les
 *  montre comme des étiquettes et un numéro comme ses dates. Le texte n'est pas lié en
 *  continu : le curseur sauterait à chaque frappe. */
import { onMounted, ref, watch } from 'vue'
import { fieldLabel, fillFields, hasFields, splitFields } from '../fields'
import { issueDates, pastePlain } from '../store'

const text = defineModel<string>({ required: true })
defineProps<{ tag?: string; placeholder?: string }>()

const el = ref<HTMLElement>()
let editing = false

function show() {
  const node = el.value
  if (!node || editing) return
  const dates = issueDates.value
  if (!hasFields(text.value)) node.textContent = text.value
  else if (dates) node.textContent = fillFields(text.value, dates)
  else
    node.replaceChildren(
      ...splitFields(text.value).map((part) => {
        if (typeof part === 'string') return document.createTextNode(part)
        const chip = document.createElement('span')
        chip.className = 'bs-field'
        chip.textContent = fieldLabel(part.field)
        return chip
      }),
    )
}

function focus() {
  editing = true
  const node = el.value
  // rien à dévoiler : le curseur reste là où l'on a cliqué
  if (!node || node.textContent === text.value) return
  node.textContent = text.value
  const caret = document.createRange()
  caret.selectNodeContents(node)
  caret.collapse(false)
  getSelection()?.removeAllRanges()
  getSelection()?.addRange(caret)
}

function blur() {
  editing = false
  show()
}

onMounted(show)
watch([text, issueDates], show)
</script>

<template>
  <component
    :is="tag ?? 'span'"
    ref="el"
    contenteditable="true"
    spellcheck="false"
    data-fields
    :data-placeholder="placeholder"
    @focus="focus"
    @blur="blur"
    @input="text = ($event.target as HTMLElement).textContent ?? ''"
    @paste="pastePlain"
    @keydown.enter.prevent
  />
</template>
