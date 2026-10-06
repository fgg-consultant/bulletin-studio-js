<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ExternalLink, FileText, LayoutTemplate, Plus, Trash2 } from 'lucide-vue-next'
import * as api from '../api'
import { go } from '../router'
import { formatDateTime, t } from '../i18n'
import { createFromTemplate, deleteBulletin } from '../store'

const items = ref<api.BulletinMeta[]>([])
const error = ref<string | null>(null)
const busy = ref(false)

const templates = computed(() => items.value.filter((b) => b.isTemplate))
const issues = computed(() => items.value.filter((b) => !b.isTemplate))

async function refresh() {
  try {
    items.value = await api.list()
    error.value = null
  } catch (e) {
    error.value = (e as Error).message
  }
}
onMounted(refresh)

async function newIssue(templateId: number) {
  busy.value = true
  try {
    go(`#/b/${await createFromTemplate(templateId)}`)
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function remove(b: api.BulletinMeta) {
  const key = b.isTemplate ? 'dashboard.confirmDeleteTemplate' : 'dashboard.confirmDeleteBulletin'
  if (!confirm(t(key, { title: b.title }))) return
  try {
    await deleteBulletin(b.id)
    await refresh()
  } catch (e) {
    error.value = (e as Error).message
  }
}
</script>

<template>
  <div class="flex h-full flex-col bg-slate-50 text-slate-800 antialiased">
    <header class="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4">
      <div class="flex size-7 items-center justify-center rounded-md bg-sky-700 text-sm font-bold text-white">B</div>
      <span class="text-sm font-semibold tracking-tight">Bulletin Studio</span>
      <a
        href="#/new"
        class="ml-auto flex items-center gap-1.5 rounded-lg bg-sky-700 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-sky-800"
      >
        <Plus :size="15" />
        {{ t('dashboard.newTemplate') }}
      </a>
    </header>

    <p v-if="error" class="shrink-0 bg-red-50 px-4 py-2 text-sm text-red-700">{{ error }}</p>

    <main class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto max-w-3xl px-6 py-10">
        <h1 class="text-xl font-bold tracking-tight text-slate-900">{{ t('dashboard.templates') }}</h1>
        <p class="mt-1 text-sm text-slate-500">{{ t('dashboard.templatesIntro') }}</p>

        <div v-if="templates.length" class="mt-5 flex flex-col gap-2.5">
          <div
            v-for="tpl in templates"
            :key="tpl.id"
            class="group flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4"
          >
            <a :href="`#/b/${tpl.id}`" class="flex min-w-0 flex-1 items-center gap-4">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <LayoutTemplate :size="18" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate font-semibold text-slate-800">{{ tpl.title }}</div>
                <div class="mt-0.5 text-xs text-slate-500">
                  {{ tpl.parentTitle }} · {{ t('dashboard.blockCount', { count: tpl.blockCount }) }}
                  · {{ t(`cadence.${tpl.cadence}`) }}<template v-if="tpl.draftAt">, {{ t('dashboard.draftAt', { time: tpl.draftAt }) }}</template>
                </div>
              </div>
            </a>
            <button
              class="flex items-center gap-1.5 rounded-lg border border-sky-700 px-3 py-1.5 text-sm font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-50"
              :disabled="busy"
              @click="newIssue(tpl.id)"
            >
              <Plus :size="14" />
              {{ t('dashboard.newBulletin') }}
            </button>
            <button
              class="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
              :title="t('dashboard.deleteTemplate')"
              @click="remove(tpl)"
            >
              <Trash2 :size="16" />
            </button>
          </div>
        </div>

        <div
          v-else
          class="mt-5 flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-white px-6 py-12 text-center"
        >
          <div class="rounded-full bg-amber-50 p-4 text-amber-700"><LayoutTemplate :size="24" /></div>
          <p class="font-medium text-slate-700">{{ t('dashboard.noTemplates') }}</p>
          <p class="max-w-sm text-sm text-slate-500">{{ t('dashboard.noTemplatesHint') }}</p>
          <a
            href="#/new"
            class="mt-2 flex items-center gap-1.5 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
          >
            <Plus :size="15" />
            {{ t('dashboard.createTemplate') }}
          </a>
        </div>

        <h2 class="mt-12 text-xl font-bold tracking-tight text-slate-900">{{ t('dashboard.bulletins') }}</h2>
        <p class="mt-1 text-sm text-slate-500">
          {{ t('dashboard.bulletinCount', { count: issues.length }) }}
        </p>

        <div v-if="issues.length" class="mt-5 flex flex-col gap-2.5">
          <div
            v-for="b in issues"
            :key="b.id"
            class="group flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4"
          >
            <a :href="`#/b/${b.id}`" class="flex min-w-0 flex-1 items-center gap-4">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                <FileText :size="18" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate font-semibold text-slate-800 group-hover:text-sky-800">{{ b.title }}</div>
                <div class="mt-0.5 text-xs text-slate-500">
                  {{ b.parentTitle }}
                  <template v-if="b.updatedAt">
                    · {{ t('dashboard.modifiedOn', { date: formatDateTime(b.updatedAt) }) }}
                  </template>
                </div>
              </div>
            </a>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-medium"
              :class="b.live ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'"
            >
              {{
                b.live
                  ? t(b.hasUnpublishedChanges ? 'status.publishedPendingShort' : 'status.published')
                  : t('status.draft')
              }}
            </span>
            <a
              v-if="b.url"
              :href="b.url"
              target="_blank"
              class="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-sky-700"
              :title="t('dashboard.viewPublished')"
            >
              <ExternalLink :size="16" />
            </a>
            <button
              class="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
              :title="t('dashboard.deleteBulletin')"
              @click="remove(b)"
            >
              <Trash2 :size="16" />
            </button>
          </div>
        </div>
        <p v-else class="mt-5 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-500">
          {{ t('dashboard.noBulletins') }}
        </p>
      </div>
    </main>
  </div>
</template>
