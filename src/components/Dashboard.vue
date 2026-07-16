<script setup lang="ts">
import { ref } from 'vue'
import { FileText, Plus, Trash2 } from 'lucide-vue-next'
import { deleteBulletin, listBulletins } from '../store'

const bulletins = ref(listBulletins())

const fmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

function remove(id: string, title: string) {
  if (!confirm(`Supprimer « ${title} » ? Cette action est définitive.`)) return
  deleteBulletin(id)
  bulletins.value = listBulletins()
}
</script>

<template>
  <div class="flex h-screen flex-col bg-slate-50 text-slate-800 antialiased">
    <header class="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4">
      <div class="flex size-7 items-center justify-center rounded-md bg-sky-700 text-sm font-bold text-white">B</div>
      <span class="text-sm font-semibold tracking-tight">Bulletin Studio</span>
      <a
        href="#/new"
        class="ml-auto flex items-center gap-1.5 rounded-lg bg-sky-700 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-sky-800"
      >
        <Plus :size="15" />
        Nouveau bulletin
      </a>
    </header>

    <main class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto max-w-3xl px-6 py-10">
        <h1 class="text-xl font-bold tracking-tight text-slate-900">Mes bulletins</h1>
        <p class="mt-1 text-sm text-slate-500">
          {{ bulletins.length }} bulletin{{ bulletins.length > 1 ? 's' : '' }} — enregistrés dans ce navigateur.
        </p>

        <div v-if="bulletins.length" class="mt-6 flex flex-col gap-2.5">
          <a
            v-for="b in bulletins"
            :key="b.id"
            :href="`#/b/${b.id}`"
            class="group flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 hover:border-sky-500 hover:shadow-sm"
          >
            <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
              <FileText :size="18" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate font-semibold text-slate-800 group-hover:text-sky-800">{{ b.title }}</div>
              <div class="mt-0.5 text-xs text-slate-500">
                Modifié le {{ fmt.format(b.updatedAt) }} · {{ b.blockCount }} bloc{{ b.blockCount > 1 ? 's' : '' }}
              </div>
            </div>
            <button
              class="rounded-md p-2 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
              title="Supprimer ce bulletin"
              @click.prevent.stop="remove(b.id, b.title)"
            >
              <Trash2 :size="16" />
            </button>
          </a>
        </div>

        <div
          v-else
          class="mt-10 flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-white px-6 py-14 text-center"
        >
          <div class="rounded-full bg-sky-50 p-4 text-sky-700"><FileText :size="24" /></div>
          <p class="font-medium text-slate-700">Aucun bulletin pour l'instant</p>
          <p class="max-w-sm text-sm text-slate-500">
            Créez votre premier bulletin à partir d'un template, puis composez-le par glisser-déposer.
          </p>
          <a
            href="#/new"
            class="mt-2 flex items-center gap-1.5 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
          >
            <Plus :size="15" />
            Créer un bulletin
          </a>
        </div>
      </div>
    </main>
  </div>
</template>
