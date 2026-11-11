import { isShortLink, type ShortLink } from './api'
import { sameUrl } from './validate-url'

const STORAGE_KEY = 'dealseek-links:history'
const MAX_ITEMS = 50

export function loadHistory(): ShortLink[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? newestPerUrl(parsed.filter(isShortLink)) : []
  } catch {
    return []
  }
}

export function saveHistory(links: ShortLink[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(links))
  } catch {
    return
  }
}

export function addToHistory(links: ShortLink[], link: ShortLink): ShortLink[] {
  return [link, ...links.filter((item) => item.code !== link.code)].slice(0, MAX_ITEMS)
}

export function newestPerUrl(links: ShortLink[]): ShortLink[] {
  return links.filter((link, index) => links.findIndex((other) => sameUrl(other.url, link.url)) === index)
}

export function findByUrl(links: ShortLink[], url: string): ShortLink | undefined {
  return links.find((link) => sameUrl(link.url, url))
}

export function removeFromHistory(links: ShortLink[], code: string): ShortLink[] {
  return links.filter((link) => link.code !== code)
}
