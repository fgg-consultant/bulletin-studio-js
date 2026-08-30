# Bulletin Studio

Éditeur WYSIWYG de bulletins par blocs (style Mailchimp), intégré à climweb par le paquet
[climweb-bulletin-studio](https://github.com/wmo-raf/climweb-bulletin-studio).

- **Vue 3 + TypeScript + Vite + Tailwind 4**
- **Lexical** : moteur rich-text de chaque bloc texte/titre (gras, italique, listes, liens, titres, alignement, historique Ctrl+Z)
- **vuedraggable (SortableJS)** : drag & drop palette → page, réordonnancement, colonnes imbriquées

```bash
npm install
npm run dev      # http://localhost:5180 (port fixe : la page django pointe dessus)
npm run build
```

L'app n'est pas autonome : elle est montée par la page d'admin django, qui lui passe les
urls de l'API, le jeton CSRF et la base des assets par attributs `data-*` sur
`#bulletin-studio-app`. Lancer `npm run dev` seul affiche l'app, mais sans store.

## Navigation

Routing par hash : `#/` dashboard (modèles et bulletins), `#/new` nouveau modèle
(produit climweb + point de départ), `#/b/<id>` éditeur.

Un **modèle** est un bulletin marqué comme tel, rattaché à un produit climweb ; il sert de
point de départ qu'on copie. Un **bulletin** est une parution publiable de ce produit.

## Langues

L'interface est traduite en anglais (langue source), français, espagnol, portugais et
arabe : un catalogue par langue dans `src/locales/`, un `t()` maison dans `src/i18n.ts`
(`Intl.PluralRules` pour les pluriels, `Intl.DateTimeFormat` pour les dates — pas de
dépendance). La langue vient de climweb par `data-locale` sur le point de montage, donc
l'app suit celle de l'admin wagtail ; le sens RTL est hérité du `dir` de l'admin. Les
autres langues de climweb (am, sw) retombent sur l'anglais tant qu'aucun catalogue
n'existe.

Une clé absente d'un catalogue retombe sur l'anglais, et le type `Catalog` interdit
d'inventer une clé. Les valeurs par défaut insérées dans le document (« Bulletin »,
« Colonne 1 »…) sont traduites elles aussi : elles suivent la langue de l'auteur au
moment où le bloc est créé.

## Modèle de données

Le document est un arbre de blocs (`src/types.ts`) :

```
{ title, blocks: Block[] }
Block = header { eyebrow, title, subtitle, badges[], bg }
      | text (état Lexical sérialisé) | image | button | divider | spacer
      | table { header, rows: string[][] } | date { date ISO, align }
      | columns { ratios, columns: Block[][] }   // pas de colonnes imbriquées
```

- Enregistrement dans climweb (`src/store.ts` → `src/api.ts`), en brouillon Wagtail ;
  publier est une action explicite.
- Chaque enregistrement envoie **le document et son rendu HTML** (`src/render.ts`) :
  c'est ce HTML que sert la page publique du bulletin, il n'y a pas de moteur de rendu
  côté python à tenir synchronisé. Ce n'est pas une capture du DOM de l'éditeur mais un
  rendu de sortie : uniquement des classes `bs-*` et des styles inline, stylés par
  `src/content.css` — la même feuille des deux côtés.
- « Exporter PDF » passe par l'impression native du navigateur (la feuille `@media print`
  force le rendu « pdf » et masque le chrome d'édition). `@page { margin: 0 }` supprime les
  en-têtes/pieds injectés par le navigateur ; la respiration vient d'un padding en mm.
- 3 modes d'aperçu : desktop (980 px, colonnes libres), pdf (770 px, 2 colonnes max — les
  rangées de 3+ se replient), mobile (420 px, tout empilé).
- Les images passent par la bibliothèque climweb (`api/images/`) : le bloc image
  téléverse le fichier, reçoit l'url d'une rendition et ne garde que cette url et l'id.
  Le bouton « Bibliothèque » repioche une image déjà présente sur le site. Coller une URL
  externe reste possible — le bulletin dépendra alors de ce domaine.

## Cartes

Le bloc carte choisit une couche raster dans le catalogue geomanager (`api/datasets/`) :
pas de `DashboardMap` à configurer au préalable. Choisir une couche fige dans le document
le chemin de ses tuiles, **sa date** et sa légende — un numéro archivé doit continuer
d'afficher les données de sa décade, et les tuiles raster de geomanager exigent de toute
façon un paramètre `time`. « Cadrer ici » fige le cadrage courant.

Sur la page publiée, chaque carte n'est qu'un `<div class="bs-map" data-tiles data-time
data-bounds>` : `src/embed.ts` (une seconde entrée de build, quelques centaines d'octets)
l'anime avec `src/map.ts`, le **même** code que l'éditeur. maplibre n'est pas empaqueté —
climweb en sert un en global, chargé aussi bien par la page d'admin que par la page
publique, donc jamais deux versions. La légende, elle, est du HTML statique : elle
s'imprime et ne dépend d'aucun script.

## Structure

```
src/
  api.ts                    client du store climweb (product-pages, CRUD, publish)
  store.ts                  état réactif du doc + sélection + helpers (remove/duplicate/export)
  render.ts                 document → HTML publié
  map.ts                    rendu d'une carte, partagé éditeur / page publiée
  embed.ts                  hydratation des cartes sur la page publiée
  lexical.ts                thème et nœuds Lexical partagés éditeur / rendu
  content.css               styles du contenu (éditeur + page publiée)
  components/
    Dashboard.vue           modèles et bulletins (ouvrir / créer / publier / supprimer)
    TemplateChooser.vue     nouveau modèle : produit climweb + point de départ
    Editor.vue              coquille de l'éditeur (topbar + sidebar + canvas)
    Sidebar.vue             palette de blocs (clic = ajout à la fin, drag = dépôt ciblé)
    Canvas.vue              la page en construction
    BlockRenderer.vue       cadre commun d'un bloc (sélection, déplacer/dupliquer/supprimer)
    TextToolbar.vue         barre de formatage Lexical du bloc sélectionné
    blocks/                 un composant par type de bloc
```
