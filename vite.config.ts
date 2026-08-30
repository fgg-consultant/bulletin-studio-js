import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // chemins relatifs : l'app fonctionne servie depuis n'importe quel sous-chemin
  // (GitHub Pages, /static/… de django)
  base: './',
  plugins: [vue(), tailwindcss()],
  // port fixe : la page django qui charge l'app en dev pointe dessus
  // (BULLETIN_STUDIO_DEV_SERVER=http://localhost:5180). strictPort pour échouer
  // franchement au lieu de glisser sur 5181 et laisser django pointer dans le vide.
  server: { port: 5180, strictPort: true },
  build: {
    rollupOptions: {
      // deux entrées : l'app d'édition, et la feuille de contenu seule — c'est
      // elle que le gabarit django charge sur la page publiée du bulletin.
      input: { app: './index.html', content: './src/content.css' },
      output: {
        // noms stables : le template django les charge via {% static %}
        entryFileNames: (chunk) =>
          chunk.name === 'app' ? 'bulletin-studio.js' : 'bulletin-studio-[name].js',
        chunkFileNames: 'bulletin-studio-[name].js',
        assetFileNames: (info) => {
          const name = info.names?.[0] ?? ''
          if (name === 'content.css') return 'bulletin-studio-content.css'
          return name.endsWith('.css') ? 'bulletin-studio.css' : 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
})
