import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

/**
 * Aucun morceau ne doit importer une entrée. Le gabarit django charge les entrées sous
 * une autre url que leur nom (`?v=` en dev, nom haché par ManifestStaticFilesStorage en
 * production) ; l'import relatif d'un morceau (`./bulletin-studio.js`) en ferait un
 * second exemplaire, qui monte une seconde app dans le même conteneur et efface la
 * première — l'éditeur devient blanc, sans une erreur. Or un module partagé entre une
 * entrée et un morceau chargé à la demande reste dans l'entrée : le build échoue donc
 * ici plutôt que l'éditeur chez un forecaster.
 */
function noChunkImportsAnEntry(): Plugin {
  return {
    name: 'bulletin-studio:no-chunk-imports-an-entry',
    apply: 'build',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((f) => f.type === 'chunk')
      const entries = new Set(chunks.filter((c) => c.isEntry).map((c) => c.fileName))
      for (const chunk of chunks) {
        const found = [...new Set([...chunk.imports, ...chunk.dynamicImports])].filter((f) => entries.has(f))
        if (found.length)
          this.error(
            `${chunk.fileName} imports the entry ${found.join(', ')}: the page loads entries ` +
              'under another url, so the browser would run a second copy of it. Import the ' +
              'module statically, or move what it shares with the entry out of it.',
          )
      }
    },
  }
}

export default defineConfig({
  // chemins relatifs : l'app fonctionne servie depuis n'importe quel sous-chemin
  // (GitHub Pages, /static/… de django)
  base: './',
  plugins: [vue(), tailwindcss(), noChunkImportsAnEntry()],
  // port fixe : la page django qui charge l'app en dev pointe dessus
  // (BULLETIN_STUDIO_DEV_SERVER=http://localhost:5180). strictPort pour échouer
  // franchement au lieu de glisser sur 5181 et laisser django pointer dans le vide.
  server: { port: 5180, strictPort: true },
  build: {
    rollupOptions: {
      // deux entrées : l'app d'édition, et la feuille de contenu seule — c'est
      // elle que le gabarit django charge sur la page publiée du bulletin.
      input: {
        app: './index.html',
        content: './src/content.css',
        // l'hydratation des cartes sur la page publiée du bulletin
        embed: './src/embed.ts',
      },
      output: {
        // noms stables : le template django les charge via {% static %}, qui les
        // hache en production (ManifestStaticFilesStorage)
        entryFileNames: (chunk) =>
          chunk.name === 'app' ? 'bulletin-studio.js' : 'bulletin-studio-[name].js',
        // Les morceaux, eux, sont importés par chemin relatif, que django ne réécrit
        // pas : sans hash, un navigateur garde l'ancien en cache sous le même nom, et
        // la nouvelle entrée y cherche des exports qui n'existent plus — l'app ne
        // démarre pas (« bundle is not installed »), les cartes publiées non plus.
        chunkFileNames: 'bulletin-studio-[name]-[hash].js',
        assetFileNames: (info) => {
          const name = info.names?.[0] ?? ''
          if (name === 'content.css') return 'bulletin-studio-content.css'
          return name.endsWith('.css') ? 'bulletin-studio.css' : 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
})
