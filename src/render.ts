/** Le HTML publié, produit à partir du document.
 *
 * Ce n'est pas une capture du DOM de l'éditeur (contenteditable, poignées,
 * attributs Lexical) mais un rendu de sortie autonome : uniquement des classes
 * `bs-*` et des styles inline, stylé par `content.css` — la même feuille que
 * l'éditeur charge, donc ce que l'auteur compose est ce que le site affiche. */
import { $generateHtmlFromNodes } from '@lexical/html'
import { $getRoot, createEditor } from 'lexical'
import { formatDate } from './i18n'
import { esc } from './esc'
import { nodes, theme } from './lexical'
import { legendHtml, MAP_HEIGHTS } from './map'
import type { Block } from './types'

/** état Lexical sérialisé → HTML. L'éditeur jetable partage le thème et les nœuds
 *  des blocs texte : mêmes classes en sortie qu'à la saisie. */
function richText(state: string | null): string {
  if (!state) return ''
  const editor = createEditor({ nodes, theme, onError: (e) => console.error(e) })
  try {
    editor.setEditorState(editor.parseEditorState(state))
  } catch {
    return '' // état illisible : on n'invente rien
  }
  let html = ''
  editor.getEditorState().read(() => {
    // un bloc laissé vide ne doit pas creuser un blanc dans la page publiée
    if ($getRoot().getTextContent().trim()) html = $generateHtmlFromNodes(editor, null)
  })
  return html
}

/** luminance perçue — même seuil que HeaderBlock.vue */
function isDark(hex: string): boolean {
  const [r = 0, g = 0, b = 0] = (hex.match(/\w\w/g) ?? []).map((h) => parseInt(h, 16))
  return r * 0.299 + g * 0.587 + b * 0.114 < 140
}

const SPACER = { sm: '16px', md: '32px', lg: '64px' }

function block(b: Block): string {
  switch (b.type) {
    case 'header': {
      const badges = b.badges
        .filter((x) => x.text.trim())
        .map((x) => `<span class="bs-badge">${esc(x.text)}</span>`)
        .join('')
      return [
        `<div class="bs-header ${isDark(b.bg) ? 'bs-header-dark' : 'bs-header-light'}" style="background-color:${esc(b.bg)}">`,
        b.eyebrow.trim() ? `<span class="bs-eyebrow">${esc(b.eyebrow)}</span>` : '',
        b.title.trim() ? `<h1 class="bs-header-title">${esc(b.title)}</h1>` : '',
        b.subtitle.trim() ? `<p class="bs-header-sub">${esc(b.subtitle)}</p>` : '',
        badges ? `<div class="bs-badges">${badges}</div>` : '',
        `</div>`,
      ].join('')
    }
    case 'text': {
      const html = richText(b.state)
      return html ? `<div class="bs-text">${html}</div>` : ''
    }
    case 'image': {
      if (!b.src) return ''
      const caption = b.caption?.trim() ? `<figcaption class="bs-caption">${esc(b.caption)}</figcaption>` : ''
      return `<figure class="bs-figure"><img src="${esc(b.src)}" alt="${esc(b.alt)}">${caption}</figure>`
    }
    case 'button': {
      const label = b.label.trim()
      if (!label) return ''
      const inner = b.href.trim()
        ? `<a class="bs-btn" href="${esc(b.href)}">${esc(label)}</a>`
        : `<span class="bs-btn">${esc(label)}</span>`
      return `<div class="bs-btn-wrap" style="text-align:${esc(b.align)}">${inner}</div>`
    }
    case 'table': {
      const rows = b.rows
        .map((row, i) => {
          const tag = i === 0 && b.header ? 'th' : 'td'
          const cells = row.map((c) => `<${tag}>${esc(c)}</${tag}>`).join('')
          return `<tr>${cells}</tr>`
        })
        .join('')
      return `<table class="bs-table"><tbody>${rows}</tbody></table>`
    }
    case 'date': {
      const d = new Date(b.date + 'T00:00:00')
      if (isNaN(d.getTime())) return ''
      return `<div class="bs-date" style="text-align:${esc(b.align)}">${esc(formatDate(d))}</div>`
    }
    case 'map': {
      if (!b.tiles) return ''
      // un marqueur déclaratif, jamais de script : le bundle d'hydratation lit ces
      // attributs sur la page publiée. La légende, elle, est déjà du HTML — elle
      // s'imprime et ne dépend de rien.
      const attrs = [
        `data-tiles="${esc(b.tiles)}"`,
        b.time ? `data-time="${esc(b.time)}"` : '',
        b.bounds?.length === 4 ? `data-bounds="${esc(b.bounds.join(','))}"` : '',
      ]
        .filter(Boolean)
        .join(' ')
      return `<div class="bs-map-block"><div class="bs-map" ${attrs} style="height:${MAP_HEIGHTS[b.height]}"></div>${legendHtml(b.legend)}</div>`
    }
    case 'divider':
      return '<hr class="bs-divider">'
    case 'spacer':
      return `<div class="bs-spacer" style="height:${SPACER[b.size]}"></div>`
    case 'columns': {
      const cols = b.columns
        .map((col, i) => `<div class="bs-col" style="flex-grow:${b.ratios[i] ?? 1}">${col.map(block).join('')}</div>`)
        .join('')
      return `<div class="bs-cols${b.columns.length > 2 ? ' bs-cols-many' : ''}">${cols}</div>`
    }
  }
}

export function renderHtml(blocks: Block[]): string {
  return blocks.map(block).join('')
}
