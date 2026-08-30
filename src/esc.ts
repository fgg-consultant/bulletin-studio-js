const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }

/** échappe une valeur brute avant de la coller dans du HTML de sortie */
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ESC[c]!)
