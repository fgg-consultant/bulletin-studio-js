/** Mini-routeur par hash : l'app vit dans une seule page de l'admin wagtail, qui ne
 *  connaît que son url ; tout ce qui suit le `#` est à elle.
 *
 *    #/                    accueil
 *    #/templates           les modèles
 *    #/templates/new       nouveau modèle (#/new, l'ancienne adresse, y mène aussi)
 *    #/templates/<id>      un modèle et ses numéros
 *    #/bulletins?…         les publications, filtrées (kind, status, template, q, page)
 *    #/b/<id>              l'éditeur
 *
 *  Une adresse inconnue retombe sur l'accueil. */
import { ref } from 'vue'

export type Route =
  | { name: 'home' }
  | { name: 'templates' }
  | { name: 'newTemplate' }
  | { name: 'template'; id: number }
  | { name: 'bulletins'; query: Record<string, string> }
  | { name: 'editor'; id: number }

/** l'adresse d'une route, à mettre dans un href */
export function href(r: Route): string {
  switch (r.name) {
    case 'home':
      return '#/'
    case 'templates':
      return '#/templates'
    case 'newTemplate':
      return '#/templates/new'
    case 'template':
      return `#/templates/${r.id}`
    case 'bulletins': {
      // les filtres laissés à leur valeur par défaut n'encombrent pas l'adresse
      const q = new URLSearchParams(Object.entries(r.query).filter(([, v]) => v !== '')).toString()
      return q ? `#/bulletins?${q}` : '#/bulletins'
    }
    case 'editor':
      return `#/b/${r.id}`
  }
}

export function parse(hash: string): Route {
  const [path, search = ''] = hash.replace(/^#\/?/, '').split('?', 2)
  const segments = path.split('/').filter(Boolean)
  const id = (s: string | undefined) => (s && /^\d+$/.test(s) ? Number(s) : null)

  if (segments.length === 1 && segments[0] === 'new') return { name: 'newTemplate' }
  if (segments[0] === 'templates') {
    if (segments.length === 1) return { name: 'templates' }
    if (segments.length === 2 && segments[1] === 'new') return { name: 'newTemplate' }
    const tpl = segments.length === 2 ? id(segments[1]) : null
    if (tpl !== null) return { name: 'template', id: tpl }
  }
  if (segments.length === 1 && segments[0] === 'bulletins')
    return { name: 'bulletins', query: Object.fromEntries(new URLSearchParams(search)) }
  if (segments.length === 2 && segments[0] === 'b') {
    const b = id(segments[1])
    if (b !== null) return { name: 'editor', id: b }
  }
  return { name: 'home' }
}

export const route = ref<Route>(parse(location.hash))
window.addEventListener('hashchange', () => (route.value = parse(location.hash)))

/** aller à une route : une entrée de plus dans l'historique */
export function go(r: Route) {
  location.hash = href(r)
}

/** remplacer la route courante sans entrée d'historique : un filtre qu'on règle ne
 *  doit pas peupler le bouton « Précédent » */
export function replace(r: Route) {
  history.replaceState(history.state, '', href(r))
  route.value = parse(location.hash) // replaceState ne déclenche pas hashchange
}
