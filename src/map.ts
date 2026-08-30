/** Le rendu d'une carte, partagé par l'éditeur et la page publiée.
 *
 *  Une seule implémentation : si le bloc Vue dessinait sa carte d'un côté et
 *  l'embed de l'autre, les deux dériveraient. maplibre n'est pas empaqueté — climweb
 *  en sert un en global (v4.1.1), celui de ses propres dashboards, chargé aussi bien
 *  par la page d'admin que par la page publique. */
import { esc } from './esc'

declare const maplibregl: any

export interface LegendItem {
  name?: string
  color: string
}

export interface Legend {
  type?: string
  units?: string
  items?: LegendItem[]
}

export interface MapSpec {
  /** chemin des tuiles raster, avec {z}/{x}/{y} */
  tiles: string
  /** date figée : un bulletin archivé ne doit pas se mettre à jour tout seul */
  time: string | null
  /** [ouest, sud, est, nord] */
  bounds: number[] | null
  /** frontières administratives du site — décor, pas contenu : injecté au rendu */
  boundaryTiles?: string | null
}

/** Fond clair, contrairement aux dashboards climweb qui sont sur fond sombre : un
 *  bulletin s'imprime, et une carte sur fond noir mange l'encre et passe mal en PDF.
 *
 *  ponytail: tuiles OSM publiques — sans clé, mais soumises à leur politique d'usage
 *  modéré. Pour une instance à fort trafic, basculer sur des tuiles auto-hébergées
 *  ou un fournisseur avec clé (les sous-domaines carto des dashboards, eux, exigent
 *  désormais une clé et rendent un filigrane « API KEY REQUIRED »). */
const BASEMAP = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap',
    },
  },
  layers: [{ id: 'osm', source: 'osm', type: 'raster', minzoom: 0, maxzoom: 19 }],
}

export const MAP_HEIGHTS = { sm: '220px', md: '340px', lg: '480px' }

/** maplibre refuse les urls relatives dans ses sources ("Failed to parse URL").
 *  Le document, lui, ne stocke que des chemins — ils deviennent absolus ici, contre
 *  l'origine courante, ce qui garde les bulletins portables d'un domaine à l'autre. */
const absolute = (path: string) => (/^https?:/i.test(path) ? path : location.origin + path)

export const tileUrl = (spec: MapSpec) =>
  absolute(spec.time ? `${spec.tiles}?time=${encodeURIComponent(spec.time)}` : spec.tiles)

export interface MountedMap {
  destroy: () => void
  /** cadrage courant [ouest, sud, est, nord], pour le figer dans le document */
  bounds: () => number[] | null
}

/** Monte une carte dans `el`. */
export function mountMap(el: HTMLElement, spec: MapSpec): MountedMap {
  if (typeof maplibregl === 'undefined') {
    el.classList.add('bs-map-missing')
    return { destroy: () => {}, bounds: () => null }
  }

  const map = new maplibregl.Map({
    container: el,
    style: BASEMAP,
    center: [0, 0],
    zoom: 1,
    // sans ce drapeau le canvas WebGL est vidé après chaque frame, et l'impression
    // du bulletin sort des cartes blanches
    preserveDrawingBuffer: true,
  })
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

  map.on('load', () => {
    map.addSource('bs-layer', { type: 'raster', tiles: [tileUrl(spec)], tileSize: 256 })
    map.addLayer({ id: 'bs-layer', type: 'raster', source: 'bs-layer' })

    if (spec.boundaryTiles) {
      map.addSource('bs-boundary', { type: 'vector', tiles: [absolute(spec.boundaryTiles)] })
      // deux traits superposés, comme les cartes de dashboard : un liseré clair sur
      // un trait sombre, lisible quel que soit le fond
      ;[
        { id: 'bs-boundary-halo', color: '#ffffff', width: 3, offset: 0 },
        { id: 'bs-boundary-line', color: '#1e293b', width: 1.2, offset: 0 },
      ].forEach(({ id, color, width, offset }) =>
        map.addLayer({
          id,
          type: 'line',
          source: 'bs-boundary',
          'source-layer': 'default',
          filter: ['==', 'level', 0],
          paint: { 'line-color': color, 'line-width': width, 'line-offset': offset },
        }),
      )
    }

    if (spec.bounds?.length === 4) {
      const [w, s, e, n] = spec.bounds
      map.fitBounds(
        [
          [w, s],
          [e, n],
        ],
        { padding: 20, animate: false },
      )
    }
  })

  // l'aperçu change de largeur (desktop / pdf / mobile) et la page publique aussi
  const observer = new ResizeObserver(() => map.resize())
  observer.observe(el)

  return {
    destroy: () => {
      observer.disconnect()
      map.remove()
    },
    bounds: () => {
      const b = map.getBounds()
      return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]
    },
  }
}

/** La légende, en HTML statique : elle voyage dans le document publié, donc elle
 *  s'imprime et reste celle du jour de la rédaction même si le style de la couche
 *  change plus tard. */
export function legendHtml(legend: Legend | null | undefined): string {
  const items = legend?.items?.filter((i) => i?.color) ?? []
  if (!items.length) return ''

  const units = legend?.units ? `<span class="bs-legend-units">${esc(legend.units)}</span>` : ''

  // une échelle continue se lit comme une barre, des catégories comme des pastilles
  // geomanager décline chaque type en horizontal et vertical (choropleth_vertical…)
  const type = legend?.type ?? ''
  if (type.startsWith('gradient') || type.startsWith('choropleth')) {
    const bar = items
      .map((i) => `<span class="bs-legend-step" style="background:${esc(i.color)}"></span>`)
      .join('')
    const labels = items
      .map((i) => `<span class="bs-legend-label">${esc(i.name ?? '')}</span>`)
      .join('')
    return `<div class="bs-legend bs-legend-scale"><div class="bs-legend-bar">${bar}</div><div class="bs-legend-labels">${labels}</div>${units}</div>`
  }

  const pills = items
    .map(
      (i) =>
        `<span class="bs-legend-item"><i style="background:${esc(i.color)}"></i>${esc(i.name ?? '')}</span>`,
    )
    .join('')
  return `<div class="bs-legend">${pills}${units}</div>`
}
