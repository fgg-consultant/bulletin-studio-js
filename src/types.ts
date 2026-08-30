import type { Legend } from './map'

export type BlockType =
  | 'header'
  | 'map'
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
