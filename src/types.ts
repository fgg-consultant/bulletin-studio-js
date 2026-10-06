import type { Legend } from './map'

/** la période que couvre chaque numéro d'un modèle : un jour, une décade (1–10,
 *  11–20, 21–fin du mois) ou un mois — celle qui commence le jour où il est préparé */
export type Cadence = 'daily' | 'dekadal' | 'monthly'

export type BlockType =
  | 'header'
  | 'map'
  | 'forecast'
  | 'cities'
  | 'text'
  | 'image'
  | 'button'
  | 'table'
  | 'date'
  | 'divider'
  | 'spacer'
  | 'columns'

export interface TableBlock {
  id: string
  type: 'table'
  /** la première ligne est une ligne d'en-tête */
  header: boolean
  rows: string[][]
}

export interface DateBlock {
  id: string
  type: 'date'
  /** format ISO YYYY-MM-DD */
  date: string
  /** « date du numéro » : affiche la date de la parution plutôt que `date` —
   *  un modèle la pose une fois, chaque numéro montre la sienne */
  issueDate?: boolean
  align: 'left' | 'center' | 'right'
}

export interface HeaderBadge {
  id: string
  text: string
}

export interface HeaderBlock {
  id: string
  type: 'header'
  eyebrow: string
  title: string
  subtitle: string
  badges: HeaderBadge[]
  bg: string
}

export interface TextBlock {
  id: string
  type: 'text'
  /** préréglage à la création : titre ou paragraphe */
  preset: 'heading' | 'text'
  /** état Lexical sérialisé (JSON) */
  state: string | null
}

export interface ImageBlock {
  id: string
  type: 'image'
  src: string | null
  /** image de la bibliothèque climweb ; absent pour une URL externe ou un vieux doc */
  imageId?: number | null
  alt: string
  caption: string
}

export interface ButtonBlock {
  id: string
  type: 'button'
  label: string
  href: string
  align: 'left' | 'center' | 'right'
}

export interface DividerBlock {
  id: string
  type: 'divider'
}

export interface SpacerBlock {
  id: string
  type: 'spacer'
  size: 'sm' | 'md' | 'lg'
}

export interface ColumnsBlock {
  id: string
  type: 'columns'
  ratios: number[]
  columns: Block[][]
}

export interface MapBlock {
  id: string
  type: 'map'
  /** couche raster geomanager */
  layerId: string | null
  layerTitle: string
  /** chemin des tuiles, avec {z}/{x}/{y} */
  tiles: string | null
  /** date figée à la composition — un numéro archivé garde ses données */
  time: string | null
  /** figée elle aussi : le style de la couche peut changer après publication */
  legend: Legend | null
  bounds: number[] | null
  height: 'sm' | 'md' | 'lg'
}

/** La carte de prévision dessinée par climweb après chaque pull de prévisions.
 *  Dans un modèle, le bloc n'est qu'une recette ; un numéro y fige l'image du jour,
 *  promue dans la bibliothèque climweb — la carte du serveur, elle, est redessinée
 *  au pull suivant. */
export interface ForecastBlock {
  id: string
  type: 'forecast'
  /** recette : le créneau (HH:MM) parmi ceux que l'office a réglés, null = le premier */
  period: string | null
  preset: string
  /** jours après la date du numéro : 0 la carte du jour, 1 celle du lendemain… */
  dayOffset: number
  /** figé dans un numéro : la date de la prévision et l'image de la bibliothèque */
  date: string | null
  src: string | null
  imageId: number | null
  /** sha1 du PNG figé : une autre version côté serveur propose « Actualiser » */
  version: string | null
  periodLabel: string
  /** vide : un texte alternatif construit à partir du créneau et de la date */
  alt: string
  caption: string
}

/** Une ville de la grille, ses valeurs telles que forecastmanager les garde : null
 *  pour ce que l'office ne publie pas. */
export interface CityForecastRow {
  slug: string
  name: string
  /** l'icône de la condition, svg de forecastmanager (chemin du site) */
  icon: string | null
  /** le libellé de la condition : texte alternatif de l'icône */
  condition: string
  tmax: number | null
  tmin: number | null
  /** la seule température d'un office qui ne publie ni min ni max */
  temp: number | null
  wind: number | null
  /** d'où vient le vent, en degrés */
  windDir: number | null
}

/** Les prévisions par ville, en grille : le pendant HTML de la carte de prévision.
 *  Même recette (créneau, J+n) ; un numéro y fige les lignes de toutes les villes,
 *  le choix des villes s'applique au rendu. */
export interface CitiesBlock {
  id: string
  type: 'cities'
  /** recette : le créneau (HH:MM) parmi ceux que l'office a réglés, null = le premier */
  period: string | null
  dayOffset: number
  /** les villes montrées, par slug et dans l'ordre ; null = toutes, par nom */
  cities: string[] | null
  /** colonnes de villes, remplies l'une après l'autre */
  columns: number
  /** figé dans un numéro ; `rows` null = pas encore de prévision */
  date: string | null
  periodLabel: string
  units: { temperature: string | null; wind: string | null } | null
  rows: CityForecastRow[] | null
  /** empreinte des valeurs figées : une autre côté serveur propose « Actualiser » */
  version: string | null
}

export type Block =
  | HeaderBlock
  | TextBlock
  | ImageBlock
  | ButtonBlock
  | TableBlock
  | DateBlock
  | DividerBlock
  | SpacerBlock
  | ColumnsBlock
  | MapBlock
  | ForecastBlock
  | CitiesBlock
