export type BlockType =
  | 'header'
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
