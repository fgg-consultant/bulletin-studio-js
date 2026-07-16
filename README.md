# Bulletin Studio

Éditeur WYSIWYG de bulletins par blocs (style Mailchimp), destiné à être intégré dans climweb.

- **Vue 3 + TypeScript + Vite + Tailwind 4**
- **Lexical** : moteur rich-text de chaque bloc texte/titre (gras, italique, listes, liens, titres, alignement, historique Ctrl+Z)
- **vuedraggable (SortableJS)** : drag & drop palette → page, réordonnancement, colonnes imbriquées

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Modèle de données

Le document est un arbre de blocs (`src/types.ts`) :

```
{ title, blocks: Block[] }
Block = header { eyebrow, title, subtitle, badges[], bg }
      | text (état Lexical sérialisé) | image | button | divider | spacer
      | table { header, rows: string[][] } | date { date ISO, align }
      | columns { ratios, columns: Block[][] }   // pas de colonnes imbriquées
```

- Autosauvegarde dans `localStorage` (`src/store.ts`) — à remplacer par l'API climweb.
- « JSON » télécharge le document ; « Exporter PDF » passe par l'impression native du navigateur
  (la feuille `@media print` force le rendu « pdf » et masque le chrome d'édition).
  `@page { margin: 0 }` supprime les en-têtes/pieds de page injectés par le navigateur
  (ils s'impriment dans les marges papier) ; la respiration vient d'un padding intérieur en mm.
- 3 modes d'aperçu : desktop (980 px, colonnes libres), pdf (770 px, 2 colonnes max — les rangées
  de 3+ se replient), mobile (420 px, tout empilé). On travaille en desktop, le reste est responsive.
- Les images uploadées sont stockées en dataURL dans le document — à remplacer par un upload serveur.

## Structure

```
src/
  store.ts                  état réactif du doc + sélection + helpers (remove/duplicate/export)
  components/
    Sidebar.vue             palette de blocs (clic = ajout à la fin, drag = dépôt ciblé)
    Canvas.vue              la page en construction
    BlockRenderer.vue       cadre commun d'un bloc (sélection, déplacer/dupliquer/supprimer)
    TextToolbar.vue         barre de formatage Lexical du bloc sélectionné
    blocks/                 un composant par type de bloc
```
