function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`
}

export function formatWait(seconds: number): string {
  if (seconds < 60) return plural(Math.max(1, Math.ceil(seconds)), 'second')
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 90) return plural(minutes, 'minute')
  return plural(Math.ceil(minutes / 60), 'hour')
}

export function tooManyLinksMessage(seconds: number): string {
  return `You're making links too quickly. Try again in ${formatWait(seconds)}.`
}
