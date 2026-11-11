import { refreshStats } from '../../lib/link-store'

const randomOctet = () => Math.floor(Math.random() * 254) + 1

export async function simulateClicks(code: string, count: number, newVisitors: boolean): Promise<void> {
  for (let i = 0; i < count; i++) {
    const ip = newVisitors ? `10.${randomOctet()}.${randomOctet()}.${randomOctet()}` : '10.0.0.1'
    await fetch(`/${code}`, { redirect: 'manual', headers: { 'cf-connecting-ip': ip } })
  }
  await new Promise((resolve) => window.setTimeout(resolve, 300))
  await refreshStats()
}
