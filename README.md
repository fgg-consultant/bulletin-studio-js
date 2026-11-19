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
npm test         # vitest : les modules purs (périodes, routeur, listes, libellés, dates)
```

Les tests couvrent ce qui se calcule sans serveur ni navigateur : `periods.ts`,
`router.ts`, `catalog.ts`, `newPublication.ts`, les dates d'`i18n.ts` et `clock.ts`. Ils
tournent sous happy-dom (api.ts et i18n.ts lisent le point de montage au chargement), en
anglais et en UTC. vitest 4 et non 5, qui exige Node 22 : Node 20 doit suffire.

L'app n'est pas autonome : elle est montée par la page d'admin django, qui lui passe les
urls de l'API, le jeton CSRF et la base des assets par attributs `data-*` sur
`#bulletin-studio-app`. Lancer `npm run dev` seul affiche l'app, mais sans store.

## Navigation

Un **modèle** est un bulletin marqué comme tel, rattaché à un produit climweb ; il sert de
point de départ qu'on copie. Un **numéro** est une parution publiable de ce produit, pour
une période de la cadence du modèle. Une **publication sans modèle** est un bulletin ou un
flash ponctuel, parti d'une mise en page : son jour est à lui, l'auteur le choisit.

Routing par hash (`router.ts`) :

| adresse | page |
|---|---|
| `#/` | accueil : les brouillons préparés automatiquement à relire (la cloche de l'en-tête les compte), ce qui reste à publier, les deux sections en chiffres, les dernières publications |
| `#/templates` | les modèles, leur rythme, leurs brouillons automatiques, leurs numéros |
| `#/templates/<id>` | un modèle : ses réglages, son prochain brouillon, ses numéros année par année |
| `#/templates/new` | nouveau modèle : produit climweb + point de départ (`#/new` y mène aussi) |
| `#/bulletins?…` | toutes les publications, filtrées par titre, type, statut, modèle ; les filtres vivent dans l'adresse |
| `#/b/<id>` | l'éditeur |

« Nouvelle publication » (en-tête, ligne d'un modèle, éditeur d'un modèle) ouvre une
fenêtre : un bulletin ou un flash, d'un modèle pour la période en cours, la suivante ou
celle d'un autre jour, ou sans modèle à partir d'une mise en page de `templates.ts`. Elle
prévient quand un numéro de la période existe déjà.

Dans l'éditeur, la première ligne dit où l'on est (Accueil › Modèles › le modèle › N° 32 ·
11–20 nov. 2026) et la seconde ce qu'on modifie, dans la couleur de sa nature : un numéro
(bleu), un flash (violet), un modèle (ambre, avec sa périodicité et ses brouillons
automatiques), une publication sans modèle (son jour).

La liste des bulletins est lue une fois par page (`library.ts`) ; tout ce que les pages en
tirent est calculé dans `catalog.ts`, pur.

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

Le bloc carte choisit une couche dans le catalogue geomanager (`api/datasets/`), par une
recherche (un site du Data Helper en compte des centaines) : pas de `DashboardMap` à
configurer au préalable. Choisir une couche fige dans le document ses tuiles, **sa date**
et sa légende — un numéro archivé doit continuer d'afficher les données de sa décade.
« Cadrer ici » fige le cadrage courant.

- Couche raster de geomanager : son TileJSON donne le chemin des tuiles et les dates.
- Couche WMS (toutes celles du Data Helper) : le document garde le gabarit GetMap de
  geomanager tel quel, url absolue du service, `{bbox-epsg-3857}` rempli par maplibre et
  `{time}` par `map.ts`. Dates et légende viennent des capabilities du service, lues dans
  le navigateur (`wms.ts`) comme le fait la carte de geomanager ; la légende est l'image
  que publie le service, posée sur la carte.
- Une couche transparente ressemble à une carte en panne. L'éditeur dit sur la carte si
  elle se charge, si le service l'a refusée, ou si elle n'a rien à montrer sur la vue à
  cette date (une image GetMap de la vue entièrement transparente) : c'est le cas de
  bien des couches au-dessus d'un pays donné (la pluie en saison sèche, celles qui ne
  couvrent que l'Europe).

Sur la page publiée, chaque carte n'est qu'un `<div class="bs-map" data-tiles data-time
data-bounds>` : `src/embed.ts` (une seconde entrée de build, quelques centaines d'octets)
l'anime avec `src/map.ts`, le **même** code que l'éditeur. maplibre n'est pas empaqueté —
climweb en sert un en global, chargé aussi bien par la page d'admin que par la page
publique, donc jamais deux versions. La légende, elle, est du HTML statique : elle
s'imprime et ne dépend d'aucun script.

## Flash média

Le second genre de modèle (`kind: 'flash'`) : une image carrée pour les réseaux sociaux
et le texte de son post. Le document garde, à côté des blocs, `caption` (le texte du
post) et `share` (l'image de la dernière publication).

- `FlashCanvas.vue` montre le document en carré de 540 px : l'identité de l'organisation,
  petite, sur une barre blanche en haut, le site et le crédit OpenStreetMap au pied — une
  image transférée de groupe en groupe doit dire d'où elle vient. La première carte ou
  image remplie (carte de prévision comprise) fait le fond de tout le carré sous la
  barre, sans légende ; le reste se pose dessus, le pied sur fond transparent, les blocs
  d'avant le fond en haut, ceux d'après en bas, sur des cartons. Pas de texte sur
  l'image (la palette d'un flash n'a ni texte, ni tableau, ni date, ni bouton) : le
  bandeau dit quoi et quand, ce qui se passe et que faire vont dans le post, la légende
  de l'image sur WhatsApp. Les réglages du fond (couche, date,
  image) passent sous le carré. Sans fond, les blocs s'empilent sur blanc. Ce qui déborde
  est signalé, et la publication le fait confirmer.
- `share.ts` capture ce DOM à 1080 px avec modern-screenshot : pas de second moteur de
  mise en page. La classe `.bs-capturing` masque le chrome d'édition le temps de la
  capture, et les cartes sont redessinées à leur nouvelle taille avant (un canvas WebGL
  redimensionné est vide jusqu'à la frame suivante). Elles sont montées en double
  définition, et leur cadrage suit l'auteur : on exporte ce qu'on voit.
- `FlashPanel.vue` : le texte du post, et le partage — feuille de partage du système,
  « Copier l'image » puis « Copier le texte » (les deux temps de WhatsApp Web),
  téléchargement. Aucun compte de réseau n'est relié. Le panneau prend la largeur que
  le carré laisse, jusqu'à 32rem.
- `CaptionEditor.vue` : le texte du post mis en forme comme dans WhatsApp (gras,
  italique, barré, code, emojis), avec Lexical. Le document garde le texte au format
  de WhatsApp (`*gras*`, `_italique_`, `~barré~`, ```` ```code``` ````), celui qui part
  tel quel : `whatsapp.ts` le lit, l'écrit et le rend pour la page publiée. Taper
  `*gras*` met en gras ; un texte collé est lu comme un message WhatsApp.
- `emoji.ts` : le sélecteur d'emojis, tout le catalogue Unicode (emoji-picker-element),
  cherché dans la langue de l'admin. Les données CLDR de en, fr, es et pt sont dans le
  bundle (`assets/data-*.json`), pas sur un CDN : celles de la langue se chargent à la
  première ouverture, puis restent dans IndexedDB. L'arabe n'en a pas : interface
  traduite, recherche en anglais. La rangée des favoris commence par la météo.
- Publier capture l'image, la verse dans la bibliothèque (collection « Media flashes ») ;
  le html du flash est cette image puis le texte du post.

Un bulletin, lui, donne à l'aperçu de son lien (l'og:image de climweb) sa première image
ou carte de prévision (`firstImageId`, envoyé en `shareImage` à chaque enregistrement).

## Structure

```
src/
  api.ts                    client du store climweb (product-pages, CRUD, publish)
  router.ts                 routes par hash, et leurs adresses
  library.ts                la liste des bulletins, partagée par les pages
  catalog.ts                ce que les pages en tirent : à publier, filtres, libellés (pur)
  periods.ts                période d'un numéro selon la cadence, son rang (pur, = periods.py)
  newPublication.ts         la fenêtre « Nouvelle publication » : état, périodes proposées
  clock.ts                  l'heure du site et celle de l'auteur
  store.ts                  état réactif du doc ouvert + sélection + helpers (remove/duplicate/export)
  render.ts                 document → HTML publié
  map.ts                    rendu d'une carte, partagé éditeur / page publiée
  wms.ts                    dates et légende d'une couche WMS, lues dans les capabilities
  embed.ts                  hydratation des cartes sur la page publiée
  share.ts                  capture d'un flash, image d'aperçu d'un lien, presse-papier et partage
  whatsapp.ts               le texte du post d'un flash, au format WhatsApp : lecture, écriture, html
  emoji.ts                  le sélecteur d'emojis du texte d'un flash (catalogue complet)
  lexical.ts                thème et nœuds Lexical partagés éditeur / rendu
  content.css               styles du contenu (éditeur + page publiée)
  pages/
    HomePage.vue            accueil
    TemplatesPage.vue       les modèles
    TemplatePage.vue        un modèle et ses numéros
    BulletinsPage.vue       les publications, filtrées
    NewTemplatePage.vue     nouveau modèle : produit climweb + point de départ
  components/
    studio/                 le cadre des pages (en-tête, sections), fil d'Ariane, pastilles
    NewPublicationDialog.vue  la fenêtre « Nouvelle publication »
    Editor.vue              coquille de l'éditeur (en-têtes + sidebar + canvas)
    EditorHeader.vue        où l'on est, enregistrement, aperçus, publier
    EditorContext.vue       ce qu'on modifie : période et état d'un numéro, réglages d'un modèle
    Sidebar.vue             palette de blocs (clic = ajout à la fin, drag = dépôt ciblé)
    Canvas.vue              la page en construction
    FlashCanvas.vue         le carré d'un flash média
    FlashPanel.vue          le texte du post et le partage d'un flash
    CaptionEditor.vue       l'éditeur du texte du post, au format WhatsApp
    BlockRenderer.vue       cadre commun d'un bloc (sélection, déplacer/dupliquer/supprimer)
    TextToolbar.vue         barre de formatage Lexical du bloc sélectionné
    blocks/                 un composant par type de bloc
```
