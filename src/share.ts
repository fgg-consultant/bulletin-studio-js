/** Partager : l'image que montre le lien d'une page publiée, et celle d'un flash média.
 *
 *  Un flash n'a pas de second moteur de mise en page : son image est le visuel du
 *  studio lui-même (blocs, identité de l'organisation, pied), photographié par
 *  modern-screenshot à la définition d'export. Les cartes sont des canvas WebGL que la
 *  capture recopie : `preserveDrawingBuffer` (map.ts) les garde lisibles, et elles
 *  sont montées à une définition double (`FLASH_PIXEL_RATIO`) pour rester nettes. */
import { domToBlob } from 'modern-screenshot'
import { mountedMaps } from './map'
import type { Block } from './types'

/** le visuel à l'écran, en pixels CSS, et l'image exportée : 1080 × 1080, le carré
 *  que tous les réseaux affichent sans recadrer */
export const FLASH_CSS = 540
export const FLASH_PIXELS = 1080
export const FLASH_PIXEL_RATIO = Math.max(FLASH_PIXELS / FLASH_CSS, window.devicePixelRatio || 1)

const CARD = '[data-flash-card]'

/** une tuile perdue ne doit pas bloquer l'export : on capture ce qui est là */
const MAP_WAIT = 10_000
const atMost = (p: Promise<void>, ms: number) =>
  Promise.race([p, new Promise<void>((done) => setTimeout(done, ms))])

/** Le visuel du flash à l'écran, en PNG carré, et son texte (l'alternative de
 *  l'image). Le visuel doit être affiché, ses blocs désélectionnés : le chrome
 *  d'édition (`.bs-capturing` dans style.css) est masqué le temps de la capture. */
export async function captureFlash(): Promise<{ blob: Blob; alt: string }> {
  const card = document.querySelector<HTMLElement>(CARD)
  if (!card) throw new Error('no flash on screen')
  card.classList.add('bs-capturing')
  try {
    // le chrome masqué rend sa place : une carte qui grandit est redessinée à sa
    // nouvelle taille, sinon la capture prend un canvas vide
    await Promise.all(
      [...mountedMaps].filter(([el]) => card.contains(el)).map(([, map]) => atMost(map.redraw(), MAP_WAIT)),
    )
    const blob = await domToBlob(card, { scale: FLASH_PIXELS / card.offsetWidth, type: 'image/png' })
    return { blob, alt: altText(card) }
  } finally {
    card.classList.remove('bs-capturing')
  }
}

/** innerText suit le rendu : ni le chrome masqué, ni les retours à la ligne du code */
const lines = (el: HTMLElement) =>
  el.innerText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

/** Ce que dit le visuel, pour qui ne voit pas l'image : l'organisation, le bandeau, les
 *  textes et les légendes. Pas le pied, qui ne se lit pas à voix haute. */
function altText(card: HTMLElement): string {
  const noise = new Set([...card.querySelectorAll<HTMLElement>('.bs-flash-foot')].flatMap(lines))
  return lines(card)
    .filter((line) => !noise.has(line))
    .join(' — ')
}

/** L'image que montre le lien d'un bulletin partagé (WhatsApp, Facebook…) : sa
 *  première image de la bibliothèque, carte de prévision comprise, dans l'ordre de
 *  lecture. null : climweb retombe sur celle du produit. */
export function firstImageId(blocks: Block[]): number | null {
  for (const b of blocks) {
    if ((b.type === 'image' || b.type === 'forecast') && b.src && b.imageId) return b.imageId
    if (b.type === 'columns') {
      for (const col of b.columns) {
        const id = firstImageId(col)
        if (id) return id
      }
    }
  }
  return null
}

export function download(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

/** Copier l'image : sur un ordinateur, le chemin le plus court vers WhatsApp Web
 *  (coller dans la conversation joint l'image). La promesse est passée telle quelle :
 *  Safari exige que l'écriture parte dans le clic, avant que l'image soit prête. */
export const canCopyImage = () =>
  typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function'

export const copyImage = (blob: Promise<Blob>) =>
  navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])

/** Le partage du système (Android, iOS, Windows…) : il ouvre WhatsApp, Telegram…
 *  avec l'image jointe. Absent de la plupart des navigateurs de bureau sous Linux. */
export function canShareFiles(): boolean {
  try {
    return (
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [new File([new Blob()], 'flash.png', { type: 'image/png' })] })
    )
  } catch {
    return false
  }
}

export const shareFile = (blob: Blob, name: string, text: string) =>
  navigator.share({ files: [new File([blob], name, { type: 'image/png' })], ...(text ? { text } : {}) })
