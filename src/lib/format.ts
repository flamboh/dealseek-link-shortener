export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '')
}

const numberFormat = new Intl.NumberFormat('en')

function count(value: number, singular: string, plural: string): string {
  return `${numberFormat.format(value)} ${value === 1 ? singular : plural}`
}

export function formatStats({ clicks, visitors }: { clicks: number; visitors: number }): string {
  return `${count(clicks, 'click', 'clicks')}, ${count(visitors, 'visitor', 'visitors')}`
}
