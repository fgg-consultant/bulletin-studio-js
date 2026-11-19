<script setup lang="ts">
import Editor from './components/Editor.vue'
import NewPublicationDialog from './components/NewPublicationDialog.vue'
import BulletinsPage from './pages/BulletinsPage.vue'
import HomePage from './pages/HomePage.vue'
import NewTemplatePage from './pages/NewTemplatePage.vue'
import TemplatePage from './pages/TemplatePage.vue'
import TemplatesPage from './pages/TemplatesPage.vue'
import { route } from './router'
</script>

<template>
  <Editor v-if="route.name === 'editor'" :id="route.id" />
  <TemplatePage v-else-if="route.name === 'template'" :id="route.id" />
  <TemplatesPage v-else-if="route.name === 'templates'" />
  <NewTemplatePage v-else-if="route.name === 'newTemplate'" />
  <BulletinsPage v-else-if="route.name === 'bulletins'" :query="route.query" />
  <HomePage v-else />
  <!-- ouverte de n'importe quelle page, et de l'éditeur d'un modèle -->
  <NewPublicationDialog />
</template>
