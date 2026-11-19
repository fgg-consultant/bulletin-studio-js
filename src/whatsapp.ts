/** Le texte du post d'un flash, au format de WhatsApp : *gras*, _italique_, ~barré~,
 *  ```code```. Le document le garde tel qu'il part : copié, partagé, collé, il se lit
 *  dans WhatsApp sans conversion, et l'éditeur (CaptionEditor.vue) le montre mis en
 *  forme. Une ligne du texte est un paragraphe de l'éditeur.
 *
 *  Les règles sont celles de WhatsApp : une marque ouvre en début de ligne ou après
 *  une espace ou une ponctuation, et devant autre chose qu'une espace ; elle ferme
 *  derrière autre chose qu'une espace, et devant une espace, une ponctuation ou la fin
 *  de ligne. Rien ne s'échappe : WhatsApp ne connaît pas l'échappement. */
import { esc } from './esc'

export type Format = 'bold' | 'italic' | 'strikethrough' | 'code'
export interface Run {
  text: string
  formats: Format[]
}

export const FORMATS: Format[] = ['bold', 'italic', 'strikethrough', 'code']
/** à l'écriture ; ``` plutôt que ` : le code en ligne de WhatsApp est récent, ses
 *  anciennes versions montrent les accents graves */
const TAG: Record<Format, string> = { bold: '*', italic: '_', strikethrough: '~', code: '```' }
/** à la lecture, ``` avant ` */
const MARKS: [string, Format][] = [['```', 'code'], ['`', 'code'], ['*', 'bold'], ['_', 'italic'], ['~', 'strikethrough']]

const isSpace = (c: string | undefined) => c !== undefined && /\s/.test(c)
/** le bord d'une marque : début ou fin de ligne, espace, ponctuation ou symbole */
const isEdge = (c: string | undefined) => c === undefined || /[\s\p{P}\p{S}]/u.test(c)

function closing(line: string, from: number, mark: string): number {
  for (let j = line.indexOf(mark, from + 1); j > 0; j = line.indexOf(mark, j + 1)) {
    if (!isSpace(line[j - 1]) && isEdge(line[j + mark.length])) return j
  }
  return -1
}

const same = (a: Format[], b: Format[]) => a.length === b.length && a.every((f) => b.includes(f))

/** une ligne → ses morceaux de texte et leurs formats */
export function parseLine(line: string, formats: Format[] = []): Run[] {
  const runs: Run[] = []
  const push = (run: Run) => {
    const last = runs[runs.length - 1]
    if (last && same(last.formats, run.formats)) last.text += run.text
    else if (run.text) runs.push(run)
  }
  let plain = ''
  let i = 0
  while (i < line.length) {
    const hit = isEdge(line[i - 1])
      ? MARKS.find(([mark]) => line.startsWith(mark, i) && line[i + mark.length] !== undefined && !isSpace(line[i + mark.length]))
      : undefined
    const end = hit ? closing(line, i + hit[0].length, hit[0]) : -1
    if (!hit || end < 0) {
      plain += line[i++]
      continue
    }
    const [mark, format] = hit
    push({ text: plain, formats })
    plain = ''
    const inner = line.slice(i + mark.length, end)
    const nested = formats.includes(format) ? formats : [...formats, format]
    // rien ne se lit dans du code
    for (const run of format === 'code' ? [{ text: inner, formats: nested }] : parseLine(inner, nested)) push(run)
    i = end + mark.length
  }
  push({ text: plain, formats })
  return runs
}

export const parse = (text: string): Run[][] => text.split('\n').map((line) => parseLine(line))

/** des morceaux → une ligne : les marques s'ouvrent et se ferment aux changements de
 *  format, collées au texte (une espace sort de la marque, WhatsApp ne lirait pas
 *  « * gras * ») */
export function lineMarkup(runs: Run[]): string {
  let out = ''
  let open: Format[] = []
  const close = (keep: number) => {
    const trail = out.match(/\s*$/)![0]
    out = out.slice(0, out.length - trail.length) + open.slice(keep).reverse().map((f) => TAG[f]).join('') + trail
    open = open.slice(0, keep)
  }
  for (const run of runs) {
    // des espaces seules ne changent rien
    const want = run.text.trim() ? FORMATS.filter((f) => run.formats.includes(f)) : open
    let keep = 0
    while (keep < open.length && open[keep] === want[keep]) keep++
    if (keep < open.length) close(keep)
    let text = run.text
    if (want.length > open.length) {
      const lead = text.match(/^\s*/)![0]
      out += lead + want.slice(open.length).map((f) => TAG[f]).join('')
      text = text.slice(lead.length)
      open = [...want]
    }
    out += text
  }
  close(0)
  return out
}

export const markup = (lines: Run[][]): string => lines.map(lineMarkup).join('\n')

const CLASS: Record<Format, string> = { bold: 'bs-bold', italic: 'bs-italic', strikethrough: 'bs-strike', code: 'bs-code' }

/** pour la page publiée : un paragraphe par ligne vide, un <br> par retour à la ligne */
export function toHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const lines = parse(p).map((runs) =>
        runs
          .map((r) => r.formats.reduce((html, f) => `<span class="${CLASS[f]}">${html}</span>`, esc(r.text)))
          .join(''),
      )
      return `<p class="bs-p">${lines.join('<br>')}</p>`
    })
    .join('')
}
