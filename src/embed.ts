/** Hydratation des cartes sur la page publiée.
 *
 *  Le HTML d'un bulletin est figé : chaque carte n'y est qu'un `<div class="bs-map">`
 *  portant sa couche, sa date et son cadrage en data-*. Ce bundle les anime avec le
 *  même code que l'éditeur. Il ne contient ni Vue ni Lexical, et pas maplibre : le
 *  gabarit charge celui de climweb juste avant. */
import { mountMap } from './map'

function hydrate() {
  const boundaryTiles =
    document.querySelector<HTMLElement>('.bs-doc')?.dataset.boundaryTiles || null

  document.querySelectorAll<HTMLElement>('.bs-map[data-tiles]').forEach((el) => {
    const bounds = el.dataset.bounds?.split(',').map(Number)
    mountMap(el, {
      tiles: el.dataset.tiles!,
      time: el.dataset.time ?? null,
      bounds: bounds?.length === 4 && bounds.every(Number.isFinite) ? bounds : null,
      boundaryTiles,
    })
  })
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hydrate)
else hydrate()
