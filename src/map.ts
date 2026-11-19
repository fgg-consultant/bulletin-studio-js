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
  /** une couche WMS : l'image de légende que publie le service (type 'image') */
  url?: string
}

export interface MapSpec {
  /** chemin des tuiles raster, avec {z}/{x}/{y} ; ou, pour une couche WMS, le gabarit
   *  GetMap complet du service, avec {bbox-epsg-3857} et {time} */
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

/** La date en paramètre : geomanager la lit dans `?time=` pour ses rasters, un WMS là
 *  où son gabarit a `{time}` (vide : le service sert sa date par défaut). maplibre
 *  remplit lui-même {bbox-epsg-3857}. */
export const tileUrl = (spec: MapSpec) =>
  absolute(
    spec.tiles.includes('{time}')
      ? spec.tiles.replace('{time}', encodeURIComponent(spec.time ?? ''))
      : spec.time
        ? `${spec.tiles}?time=${encodeURIComponent(spec.time)}`
        : spec.tiles,
  )

export interface MountedMap {
  destroy: () => void
  /** cadrage courant [ouest, sud, est, nord], pour le figer dans le document */
  bounds: () => number[] | null
  /** Redessinée à sa taille du moment, tuiles comprises : avant de la capturer. Un
   *  canvas redimensionné est vidé, et l'observateur de taille ne le redessine qu'à la
   *  frame suivante. */
  redraw: () => Promise<void>
}

/** les cartes montées, par conteneur : la capture d'un flash attend les siennes */
export const mountedMaps = new Map<HTMLElement, MountedMap>()

export interface MountOptions {
  /** sa définition, plus fine que l'écran quand elle sera capturée en image (un flash
   *  est exporté à deux fois sa taille) */
  pixelRatio?: number
  /** la marge autour du cadrage figé, 20 px par défaut ; 0 pour retrouver exactement
   *  la vue enregistrée */
  padding?: number
  /** à chaque déplacement fait par l'auteur (pas ceux du code) : le nouveau cadrage */
  onMove?: (bounds: number[]) => void
  /** la couche de données : ses tuiles se chargent, sont là, ou le service en a refusé
   *  (une erreur, ou une réponse qui n'est pas une image) */
  onStatus?: (status: 'loading' | 'ready' | 'error') => void
}

/** Monte une carte dans `el`. */
export function mountMap(el: HTMLElement, spec: MapSpec, opts: MountOptions = {}): MountedMap {
  if (typeof maplibregl === 'undefined') {
    el.classList.add('bs-map-missing')
    return { destroy: () => {}, bounds: () => null, redraw: () => Promise.resolve() }
  }

  const map = new maplibregl.Map({
    container: el,
    style: BASEMAP,
    center: [0, 0],
    zoom: 1,
    // sans ce drapeau le canvas WebGL est vidé après chaque frame, et l'impression
    // du bulletin sort des cartes blanches
    preserveDrawingBuffer: true,
    ...(opts.pixelRatio ? { pixelRatio: opts.pixelRatio } : {}),
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
        { padding: opts.padding ?? 20, animate: false },
      )
    }
  })

  const bounds = () => {
    const b = map.getBounds()
    return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]
  }
  // `originalEvent` : un geste de l'auteur, ou un bouton de zoom ; jamais le cadrage
  // initial, qui sinon se réenregistrerait élargi de sa marge à chaque ouverture
  const onMove = opts.onMove
  if (onMove) map.on('moveend', (e: { originalEvent?: unknown }) => e.originalEvent && onMove(bounds()))

  // maplibre ne signale pas une tuile en 404 (il la tient pour absente)
  const onStatus = opts.onStatus
  if (onStatus) {
    let failed = false
    map.on('sourcedataloading', (e: { sourceId?: string }) => {
      if (e.sourceId !== 'bs-layer') return
      failed = false
      onStatus('loading')
    })
    map.on('error', (e: { sourceId?: string }) => {
      if (e.sourceId === 'bs-layer') failed = true
    })
    map.on('idle', () => onStatus(failed ? 'error' : 'ready'))
  }

  // l'aperçu change de largeur (desktop / pdf / mobile) et la page publique aussi
  const observer = new ResizeObserver(() => map.resize())
  observer.observe(el)

  const mounted: MountedMap = {
    destroy: () => {
      observer.disconnect()
      map.remove()
      if (mountedMaps.get(el) === mounted) mountedMaps.delete(el)
    },
    bounds,
    // `idle` suit le premier rendu où plus rien n'est à charger ni à animer : forcer un
    // rendu le fait venir même d'une carte déjà au repos
    redraw: () =>
      new Promise((done) => {
        map.once('idle', () => done())
        map.resize()
        map.triggerRepaint()
      }),
  }
  mountedMaps.set(el, mounted)
  return mounted
}

/** La légende, en HTML statique : elle voyage dans le document publié, donc elle
 *  s'imprime et reste celle du jour de la rédaction même si le style de la couche
 *  change plus tard. */
export function legendHtml(legend: Legend | null | undefined): string {
  // celle d'un service WMS est une image, posée sur la carte (content.css) : sous elle,
  // ses 170 px de haut prendraient la place de la carte d'un flash
  if (legend?.type === 'image' && legend.url)
    return `<div class="bs-legend bs-legend-image"><img src="${esc(legend.url)}" alt=""></div>`

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
