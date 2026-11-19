import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Les tests des modules purs du studio (périodes, routeur, listes, libellés). happy-dom
// pour le `document` que lisent api.ts et i18n.ts au chargement ; l'anglais, langue du
// navigateur de happy-dom, et UTC pour que les heures ne dépendent pas de la machine.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'happy-dom',
      include: ['src/**/*.test.ts'],
      env: { TZ: 'UTC' },
    },
  }),
)
