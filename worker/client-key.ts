function ipv4Words(address: string): [number, number] | null {
  const parts = address.split('.')
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return null
  const [a, b, c, d] = parts.map(Number)
  return [(a << 8) | b, (c << 8) | d]
}

function parseIpv6(address: string): number[] | null {
  const halves = address.split('%')[0].toLowerCase().split('::')
  if (halves.length > 2) return null
  const toWords = (part: string): number[] | null => {
    if (part === '') return []
    const words: number[] = []
    const groups = part.split(':')
    for (const [index, group] of groups.entries()) {
      if (index === groups.length - 1 && group.includes('.')) {
        const embedded = ipv4Words(group)
        if (!embedded) return null
        words.push(...embedded)
      } else if (/^[0-9a-f]{1,4}$/.test(group)) {
        words.push(parseInt(group, 16))
      } else {
        return null
      }
    }
    return words
  }
  const head = toWords(halves[0])
  const tail = halves.length === 2 ? toWords(halves[1]) : []
  if (!head || !tail) return null
  if (halves.length === 1) return head.length === 8 ? head : null
  if (head.length + tail.length > 7) return null
  return [...head, ...Array<number>(8 - head.length - tail.length).fill(0), ...tail]
}

export function clientKey(request: Request): string {
  const ip = request.headers.get('cf-connecting-ip')?.trim()
  if (!ip) return 'unknown'
  if (!ip.includes(':')) return `ip4:${ip}`
  const words = parseIpv6(ip)
  if (!words) return `ip6:${ip.toLowerCase()}`
  if (words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff) {
    return `ip4:${[words[6] >> 8, words[6] & 255, words[7] >> 8, words[7] & 255].join('.')}`
  }
  return `ip6:${words
    .slice(0, 4)
    .map((word) => word.toString(16))
    .join(':')}::/64`
}
