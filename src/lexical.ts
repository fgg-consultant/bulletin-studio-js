import { AutoLinkNode, LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'

// Shared by the editor (TextBlock) and the exporter (render.ts): the theme classes
// are the content stylesheet's classes, so what the author types is what the
// published page shows.
export const theme = {
  paragraph: 'bs-p',
  heading: { h1: 'bs-h1', h2: 'bs-h2', h3: 'bs-h3' },
  list: { ul: 'bs-ul', ol: 'bs-ol', listitem: 'bs-li', nested: { listitem: 'bs-li-nested' } },
  link: 'bs-link',
  text: {
    bold: 'bs-bold',
    italic: 'bs-italic',
    underline: 'bs-underline',
    strikethrough: 'bs-strike',
    underlineStrikethrough: 'bs-under-strike',
  },
}

export const nodes = [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, AutoLinkNode]
