import { ref } from 'vue'

// mini-routeur par hash : fonctionne sur GitHub Pages sans config serveur
// #/          → dashboard
// #/new       → choix d'un template
// #/b/<id>    → éditeur
export interface Route {
  name: 'dashboard' | 'new' | 'editor'
  id?: string
}

function parse(): Route {
  const h = location.hash.replace(/^#\/?/, '')
  if (h === 'new') return { name: 'new' }
  const m = h.match(/^b\/(.+)$/)
  if (m) return { name: 'editor', id: m[1] }
  return { name: 'dashboard' }
}

export const route = ref<Route>(parse())
window.addEventListener('hashchange', () => (route.value = parse()))

export function go(hash: string) {
  location.hash = hash
}
