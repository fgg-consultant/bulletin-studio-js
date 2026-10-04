import type { Legend } from './map'

export type BlockType =
  | 'header'
  | 'map'
  | 'forecast'
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
