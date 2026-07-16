<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import { go } from '../router'
import { createBulletin } from '../store'
import { templates, type Template } from '../templates'

function pick(t: Template) {
  const id = createBulletin(t.make())
  go(`#/b/${id}`)
}
</script>

<template>
  <div class="flex h-screen flex-col bg-slate-50 text-slate-800 antialiased">
    <header class="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4">
      <a href="#/" class="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50">
        <ArrowLeft :size="15" />
        Mes bulletins
      </a>
      <div class="h-5 w-px bg-slate-200" />
      <span class="text-sm font-semibold tracking-tight">Nouveau bulletin</span>
    </header>

    <main class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto max-w-5xl px-6 py-10">
        <h1 class="text-xl font-bold tracking-tight text-slate-900">Choisissez un point de départ</h1>
        <p class="mt-1 text-sm text-slate-500">
          Chaque template est un simple point de départ : tout reste modifiable par glisser-déposer.
        </p>

        <div class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <button
            v-for="t in templates"
            :key="t.key"
            class="group flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-sky-500 hover:shadow-md"
            @click="pick(t)"
          >
            <div
              class="flex aspect-[3/4] flex-col gap-1.5 rounded border border-slate-200 bg-white p-2"
              :class="t.preview.length === 0 && 'items-center justify-center border-dashed'"
            >
              <template v-for="(tok, i) in t.preview" :key="i">
                <div v-if="tok.t === 'band'" class="h-6 shrink-0 rounded-sm bg-slate-700" />
                <div v-else-if="tok.t === 'title'" class="h-2 w-1/2 shrink-0 rounded-sm bg-slate-400" />
                <template v-else-if="tok.t === 'text'">
                  <div class="h-1.5 shrink-0 rounded-sm bg-slate-200" />
                  <div class="h-1.5 w-4/5 shrink-0 rounded-sm bg-slate-200" />
                </template>
                <div v-else-if="tok.t === 'img'" class="h-10 shrink-0 rounded-sm bg-slate-300" />
                <div v-else-if="tok.t === 'cols'" class="flex h-10 shrink-0 gap-1">
                  <div
                    v-for="(r, j) in tok.r"
                    :key="j"
                    class="h-full rounded-sm bg-slate-300"
                    :style="{ flexGrow: r, flexBasis: 0 }"
                  />
                </div>
                <div v-else-if="tok.t === 'table'" class="grid shrink-0 grid-cols-3 gap-px overflow-hidden rounded-sm bg-slate-200 p-px">
                  <div v-for="j in 6" :key="j" class="h-2.5 bg-white" :class="j <= 3 && 'bg-slate-100'" />
                </div>
              </template>
              <span v-if="t.preview.length === 0" class="text-xs text-slate-400">vide</span>
            </div>
            <span class="text-sm font-medium text-slate-700 group-hover:text-sky-800">{{ t.label }}</span>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>
