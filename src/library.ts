/** La liste des bulletins, partagée par les pages du studio : l'accueil, les modèles,
 *  un modèle, les bulletins, et la cloche de l'en-tête. Chaque page la relit en
 *  s'ouvrant ; l'ancienne reste affichée le temps de la réponse.
 *
 *  Les actions qui la changent (un numéro créé, un bulletin supprimé) passent par ici,
 *  pour qu'aucune page ne montre ce qui n'existe plus. */
import { reactive } from 'vue'
import * as api from './api'
import { deleteBulletin, settled } from './store'

export const library = reactive({
  items: [] as api.BulletinMeta[],
  /** vrai dès la première réponse : avant, une page vide ne veut rien dire */
  loaded: false,
  error: null as string | null,
})

let inflight: Promise<void> | null = null

/** relit la liste ; les appels simultanés partagent la même requête */
export function refresh(): Promise<void> {
  inflight ??= (async () => {
    try {
      await settled() // l'éditeur quitté à l'instant enregistre peut-être encore
      library.items = await api.list()
      library.loaded = true
      library.error = null
    } catch (e) {
      library.error = (e as Error).message
    } finally {
      inflight = null
    }
  })()
  return inflight
}

export async function remove(id: number) {
  await deleteBulletin(id)
  library.items = library.items.filter((b) => b.id !== id)
  void refresh() // un modèle supprimé change le `template` de ses numéros
}
