<script setup lang="ts">
import { nextTick } from 'vue'
import draggable from 'vuedraggable'
import {
  Calendar,
  Heading1,
  Image as ImageIcon,
  Minus,
  MousePointerClick,
  MoveVertical,
  PanelTop,
  Table,
  Type,
} from 'lucide-vue-next'
import { doc, ui, uid } from '../store'
import type { Block, BlockType } from '../types'

interface PaletteItem {
  key: string
  label: string
  type: BlockType
  icon?: unknown
  ratios?: number[]
  create: () => Block
}

const content: PaletteItem[] = [
  {
    key: 'header',
    label: 'En-tête',
    type: 'header',
    icon: PanelTop,
    create: () => ({
      id: uid(),
      type: 'header',
      eyebrow: 'Bulletin',
      title: '',
      subtitle: '',
      badges: [
        { id: uid(), text: 'Valide du … au …' },
        { id: uid(), text: 'Publié le …' },
      ],
      bg: '#175243',
    }),
  },
  { key: 'heading', label: 'Titre', type: 'text', icon: Heading1, create: () => ({ id: uid(), type: 'text', preset: 'heading', state: null }) },
  { key: 'text', label: 'Texte', type: 'text', icon: Type, create: () => ({ id: uid(), type: 'text', preset: 'text', state: null }) },
  { key: 'image', label: 'Image', type: 'image', icon: ImageIcon, create: () => ({ id: uid(), type: 'image', src: null, alt: '', caption: '' }) },
  { key: 'button', label: 'Bouton', type: 'button', icon: MousePointerClick, create: () => ({ id: uid(), type: 'button', label: 'En savoir plus', href: '', align: 'center' }) },
  {
    key: 'table',
    label: 'Tableau',
    type: 'table',
    icon: Table,
    create: () => ({
      id: uid(),
      type: 'table',
      header: true,
      rows: [
        ['Colonne 1', 'Colonne 2', 'Colonne 3'],
        ['', '', ''],
        ['', '', ''],
      ],
    }),
  },
  {
    key: 'date',
    label: 'Date',
    type: 'date',
    icon: Calendar,
    create: () => ({ id: uid(), type: 'date', date: new Date().toISOString().slice(0, 10), align: 'left' }),
  },
  { key: 'divider', label: 'Séparateur', type: 'divider', icon: Minus, create: () => ({ id: uid(), type: 'divider' }) },
  { key: 'spacer', label: 'Espaceur', type: 'spacer', icon: MoveVertical, create: () => ({ id: uid(), type: 'spacer', size: 'md' }) },
]

const columns = (ratios: number[]): (() => Block) => () => ({
  id: uid(),
  type: 'columns',
  ratios,
  columns: ratios.map(() => []),
})

const layouts: PaletteItem[] = [
  { key: 'c1', label: '1 colonne', type: 'columns', ratios: [1], create: columns([1]) },
  { key: 'c2', label: '2 colonnes', type: 'columns', ratios: [1, 1], create: columns([1, 1]) },
  { key: 'c3', label: '3 colonnes', type: 'columns', ratios: [1, 1, 1], create: columns([1, 1, 1]) },
  { key: 'c12', label: '1 : 2', type: 'columns', ratios: [1, 2], create: columns([1, 2]) },
  { key: 'c21', label: '2 : 1', type: 'columns', ratios: [2, 1], create: columns([2, 1]) },
]

const paletteGroup = { name: 'blocks', pull: 'clone', put: false }
const clone = (item: PaletteItem) => item.create()

function add(item: PaletteItem) {
  const b = item.create()
  doc.blocks.push(b)
  ui.selectedId = b.id
  nextTick(() =>
    document.querySelector(`[data-id="${b.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
  )
}
</script>

<template>
  <aside class="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
    <div class="px-4 pt-5">
      <h2 class="text-sm font-semibold text-slate-800">Contenu</h2>
      <p class="mt-0.5 text-xs leading-relaxed text-slate-500">
        Glissez un bloc vers la page, ou cliquez pour l'ajouter à la fin.
      </p>
    </div>
    <draggable
      :list="content"
      :group="paletteGroup"
      :clone="clone"
      :sort="false"
      item-key="key"
      class="grid grid-cols-2 gap-2 p-4"
    >
      <template #item="{ element }">
        <button
          class="flex cursor-grab flex-col items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-3 hover:border-sky-500 hover:shadow-sm active:cursor-grabbing"
          :class="element.key === 'header' && 'col-span-2'"
          :data-block-type="element.type"
          @click="add(element)"
        >
          <component :is="element.icon" :size="18" class="text-slate-500" />
          <span class="text-xs font-medium text-slate-700">{{ element.label }}</span>
        </button>
      </template>
    </draggable>

    <div class="px-4 pt-2">
      <h2 class="text-sm font-semibold text-slate-800">Mise en page</h2>
      <p class="mt-0.5 text-xs leading-relaxed text-slate-500">
        Des colonnes dans lesquelles déposer du contenu.
      </p>
    </div>
    <draggable
      :list="layouts"
      :group="paletteGroup"
      :clone="clone"
      :sort="false"
      item-key="key"
      class="flex flex-col gap-2 p-4"
    >
      <template #item="{ element }">
        <button
          class="group w-full cursor-grab rounded-lg border border-slate-200 bg-white p-3 hover:border-sky-500 hover:shadow-sm active:cursor-grabbing"
          :data-block-type="element.type"
          @click="add(element)"
        >
          <div class="flex h-7 gap-1">
            <div
              v-for="(r, i) in element.ratios"
              :key="i"
              class="rounded-[3px] bg-slate-200 group-hover:bg-sky-200"
              :style="{ flexGrow: r, flexBasis: 0 }"
            />
          </div>
          <div class="mt-1.5 text-left text-xs font-medium text-slate-600">{{ element.label }}</div>
        </button>
      </template>
    </draggable>
  </aside>
</template>
