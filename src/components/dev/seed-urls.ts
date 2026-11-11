const products = [
  'sony-wh-1000xm5-wireless-noise-canceling-headphones',
  'apple-airpods-pro-2nd-generation-usb-c',
  'ninja-af101-air-fryer-4-quart',
  'lego-star-wars-millennium-falcon-75375',
  'samsung-65-inch-class-oled-s90d-4k-smart-tv',
  'keurig-k-mini-single-serve-coffee-maker',
  'dyson-v15-detect-cordless-vacuum',
  'nintendo-switch-oled-model-white',
  'kitchenaid-artisan-5-quart-stand-mixer',
  'anker-737-power-bank-24000mah',
  'instant-pot-duo-7-in-1-6-quart',
  'bose-quietcomfort-ultra-earbuds',
  'logitech-mx-master-3s-wireless-mouse',
  'yeti-rambler-30-oz-tumbler',
  'roku-streaming-stick-4k',
  'crocs-classic-clog-unisex',
]

const alphanumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]
const digits = (length: number) => Array.from({ length }, () => Math.floor(Math.random() * 10)).join('')
const asin = () => `B0${Array.from({ length: 8 }, () => pick([...alphanumeric])).join('')}`

const stores: Array<(slug: string) => string> = [
  () => `https://www.amazon.com/dp/${asin()}?tag=dealseek-20`,
  (slug) => `https://www.amazon.com/${slug}/dp/${asin()}?tag=dealseek-20&th=1`,
  (slug) => `https://www.bestbuy.com/site/${slug}/${digits(7)}.p?skuId=${digits(7)}`,
  (slug) => `https://www.target.com/p/${slug}/-/A-${digits(8)}`,
  (slug) => `https://www.walmart.com/ip/${slug}/${digits(9)}`,
  (slug) => `https://dealseek.com/deals/${slug}-${digits(5)}`,
]

export function seedUrls(count: number): string[] {
  return Array.from({ length: count }, () => {
    const slug = pick(products)
    return pick(stores)(slug)
  })
}
