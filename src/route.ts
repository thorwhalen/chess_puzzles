// The one module that touches browser history (tw-frontend-ux #2). Routes live in the hash,
// so the static host needs no rewrite rules and a reload or a pasted link reproduces the view.
//   #/            play (the puzzle screen)
//   #/learn       the theme guide;  #/learn/fork  the guide with that theme open
// Going to another screen pushes an entry; refining the current one (opening a section) replaces.
import { useSyncExternalStore } from 'react'

export type Route = { name: 'play' } | { name: 'learn'; theme?: string }

const EVENT = 'chess-route'
const THEME_RE = /^[A-Za-z0-9]+$/

export function parseRoute(hash: string): Route {
  const [, head, theme] = hash.replace(/^#/, '').split('/')
  if (head === 'learn') return { name: 'learn', theme: theme && THEME_RE.test(theme) ? theme : undefined }
  return { name: 'play' }
}

export function formatRoute(r: Route): string {
  return r.name === 'learn' ? `#/learn${r.theme ? `/${r.theme}` : ''}` : '#/'
}

export function navigate(r: Route, { replace = false }: { replace?: boolean } = {}) {
  const hash = formatRoute(r)
  if (hash === (location.hash || '#/')) return // never push the URL we are already on
  const url = location.pathname + location.search + hash
  if (replace) history.replaceState(history.state, '', url) // keep "came from inside the app" as it was
  else {
    history.pushState({ app: true }, '', url)
    window.scrollTo(0, 0)
  }
  window.dispatchEvent(new Event(EVENT))
}

/** Back to the previous screen: a real Back when we came from inside the app, else a replace. */
export function leaveTo(parent: Route) {
  if (history.state?.app) history.back()
  else navigate(parent, { replace: true })
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  window.addEventListener('popstate', cb)
  window.addEventListener(EVENT, cb)
  return () => {
    window.removeEventListener('hashchange', cb)
    window.removeEventListener('popstate', cb)
    window.removeEventListener(EVENT, cb)
  }
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash)
  return parseRoute(hash)
}
