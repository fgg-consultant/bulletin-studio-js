/** Pour les tests seulement (*.test.ts) : rien de l'app ne l'importe. */

/** Intl met des espaces fines insécables autour des tirets d'une plage et avant AM :
 *  les tests comparent le texte, pas la typographie */
export const plain = (s: string) => s.replace(/[   ]/g, ' ')
