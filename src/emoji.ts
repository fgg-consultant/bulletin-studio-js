/** Le sélecteur d'emojis du texte d'un flash : tout le catalogue Unicode (CLDR, par
 *  emoji-picker-element), cherché dans la langue de l'admin, avec les tons de peau et les
 *  emojis déjà choisis en tête.
 *
 *  Ses données sont dans le bundle et servies par le site, comme le reste de l'app : rien
 *  ne part sur un CDN, un site peut être hors ligne. Le composant et les données de la
 *  langue ne se chargent qu'à la première ouverture ; le navigateur les garde ensuite
 *  (IndexedDB). L'arabe n'a pas de données : son interface est traduite, sa recherche se
 *  fait en anglais. */
import enData from 'emoji-picker-element-data/en/cldr/data.json?url'
import esData from 'emoji-picker-element-data/es/cldr/data.json?url'
import frData from 'emoji-picker-element-data/fr/cldr/data.json?url'
import ptData from 'emoji-picker-element-data/pt/cldr/data.json?url'
import type Picker from 'emoji-picker-element/picker.js'
import type { I18n } from 'emoji-picker-element/shared.js'
import { locale } from './i18n'

const DATA: Record<string, string> = { en: enData, es: esData, fr: frData, pt: ptData }
const I18N: Record<string, () => Promise<{ default: I18n }>> = {
  ar: () => import('emoji-picker-element/i18n/ar.js'),
  es: () => import('emoji-picker-element/i18n/es.js'),
  fr: () => import('emoji-picker-element/i18n/fr.js'),
  // les pays lusophones de climweb écrivent le portugais d'Europe
  pt: () => import('emoji-picker-element/i18n/pt_PT.js'),
}

/** La rangée « Favoris » tant que l'auteur n'a rien choisi : la météo, plutôt que les
 *  😊 😒 ❤️ de la bibliothèque. Ses choix passent ensuite devant. Écrits comme dans les
 *  données (⛅️ avec son sélecteur de variante), sinon ils n'y sont pas trouvés. */
const WEATHER = ['☀️', '⛅️', '🌦️', '🌧️', '⛈️', '🌪️', '🌊', '🌡️', '⚠️']

export async function createPicker(): Promise<Picker> {
  const lang = locale in DATA ? locale : 'en'
  const dataSource = DATA[lang]
  const [{ default: PickerElement }, { default: Database }, i18n] = await Promise.all([
    import('emoji-picker-element/picker.js'),
    import('emoji-picker-element/database.js'),
    I18N[locale]?.().then((m) => m.default),
  ])
  // avant le sélecteur, qui lit ses favoris une fois, à son premier affichage
  const db = new Database({ dataSource, locale: lang })
  if (!(await db.getTopFavoriteEmoji(1)).length) for (const e of WEATHER) await db.incrementFavoriteEmojiCount(e)
  const picker = new PickerElement({ dataSource, locale: lang, ...(i18n && { i18n }) })
  picker.classList.add('light', 'bs-emoji-picker') // l'admin est clair, même en thème sombre du système
  return picker
}
