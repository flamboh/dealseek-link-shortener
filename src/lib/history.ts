import { isShortLink, type ShortLink } from './api'

const STORAGE_KEY = 'dealseek-links:history'
const MAX_ITEMS = 50

export function loadHistory(): ShortLink[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isShortLink) : []
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
