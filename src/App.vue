<script setup lang="ts">
import Dashboard from './components/Dashboard.vue'
import Editor from './components/Editor.vue'
import TemplateChooser from './components/TemplateChooser.vue'
import { route } from './router'
</script>

<template>
  <Dashboard v-if="route.name === 'dashboard'" />
  <TemplateChooser v-else-if="route.name === 'new'" />
  <Editor v-else :id="route.id!" />
</template>
