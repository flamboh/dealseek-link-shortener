export const BLOCKLIST = [
  'btch',
  'cck',
  'chnk',
  'cnt',
  'dck',
  'fck',
  'fgg',
  'fgt',
  'jzz',
  'kkk',
  'ngg',
  'ngr',
  'prn',
  'pss',
  'rtrd',
  'sht',
  'spc',
  'trnn',
  'twt',
  'wnk',
  'xxx',
]

const DIGIT_LOOKALIKES: Record<string, string> = { '2': 'z', '5': 's', '6': 'g', '7': 't', '8': 'b', '9': 'g' }

export function normalizeCode(code: string): string {
  return code.toLowerCase().replace(/[256789]/g, (digit) => DIGIT_LOOKALIKES[digit])
}

export function isBlocked(code: string): boolean {
  const normalized = normalizeCode(code)
  return BLOCKLIST.some((entry) => normalized.includes(entry))
}
