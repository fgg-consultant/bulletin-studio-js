import { describe, expect, it } from 'vitest'
import { href, parse, type Route } from './router'

describe('parse', () => {
  it.each<[string, Route]>([
    ['', { name: 'home' }],
    ['#/', { name: 'home' }],
    ['#/templates', { name: 'templates' }],
    ['#/templates/', { name: 'templates' }],
    ['#/templates/new', { name: 'newTemplate' }],
    ['#/new', { name: 'newTemplate' }], // l'ancienne adresse du choix de modèle
    ['#/templates/12', { name: 'template', id: 12 }],
    ['#/b/7', { name: 'editor', id: 7 }],
    ['#/bulletins', { name: 'bulletins', query: {} }],
    ['#/bulletins?kind=flash&q=pluie', { name: 'bulletins', query: { kind: 'flash', q: 'pluie' } }],
  ])('%s', (hash, route) => {
    expect(parse(hash)).toEqual(route)
  })

  it('falls back on the home page for what it does not know', () => {
    for (const hash of ['#/b/abc', '#/b/', '#/templates/12/x', '#/nowhere', '#/b/1/2'])
      expect(parse(hash)).toEqual({ name: 'home' })
  })
})

describe('href', () => {
  it('round-trips through parse', () => {
    const routes: Route[] = [
      { name: 'home' },
      { name: 'templates' },
      { name: 'newTemplate' },
      { name: 'template', id: 3 },
      { name: 'editor', id: 42 },
      { name: 'bulletins', query: { status: 'draft', template: 'none' } },
    ]
    for (const r of routes) expect(parse(href(r))).toEqual(r)
  })

  it('leaves the empty filters out of the address', () => {
    expect(href({ name: 'bulletins', query: { kind: '', q: '', page: '' } })).toBe('#/bulletins')
    expect(href({ name: 'bulletins', query: { kind: 'flash', q: '' } })).toBe('#/bulletins?kind=flash')
  })
})
