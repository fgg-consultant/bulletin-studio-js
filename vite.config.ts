import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // chemins relatifs : l'app fonctionne servie depuis n'importe quel sous-chemin (GitHub Pages)
  base: './',
  plugins: [vue(), tailwindcss()],
})
