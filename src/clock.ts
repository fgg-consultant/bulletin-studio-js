/** L'heure du site et celle de l'auteur. Les brouillons automatiques partent à l'heure
 *  du site (le TIME_ZONE de django), qui n'est pas forcément celle du navigateur. */

/** « 09:00 » à l'heure du site `tz`, tel que l'horloge du navigateur l'affiche — ''
 *  quand les deux s'accordent, ou que le navigateur ne connaît pas `tz`. Un auteur à
 *  Paris sur un site en UTC doit voir que 09:00 veut dire 11:00 chez lui. */
export function inLocalTime(hhmm: string | null, tz: string, now = new Date()): string {
  if (!hhmm || !tz) return ''
  const [h, m] = hhmm.split(':').map(Number)
  // l'instant où l'horloge de `tz` affiche hh:mm aujourd'hui : d'abord lu comme UTC,
  // puis corrigé du décalage de `tz` à cet instant
  const guess = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, m)
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
      })
        .formatToParts(guess)
        .map((p) => [p.type, Number(p.value)]),
    )
    const wall = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
    const local = new Date(guess - (wall - guess))
    const shown = `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}`
    return shown === hhmm ? '' : shown
  } catch {
    return '' // fuseau inconnu du navigateur
  }
}
