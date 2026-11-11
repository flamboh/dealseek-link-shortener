export const CODE_ALPHABET = '256789BCDFGHJKLMNPQRSTVWXZbcdfghjkmnpqrstvwxz'
export const CODE_LENGTH = 8

export type RandomBytes = (count: number) => Uint8Array

const CODE_PATTERN = /^[256789BCDFGHJ-NP-TV-XZbcdfghjkmnp-tv-xz]{8}$/
const ACCEPT_BELOW = 256 - (256 % CODE_ALPHABET.length)

const cryptoBytes: RandomBytes = (count) => crypto.getRandomValues(new Uint8Array(count))

export function isCode(value: string): boolean {
  return CODE_PATTERN.test(value)
}

export function generateCode(randomBytes: RandomBytes = cryptoBytes): string {
  let code = ''
  while (code.length < CODE_LENGTH) {
    for (const byte of randomBytes(CODE_LENGTH - code.length)) {
      if (byte < ACCEPT_BELOW) code += CODE_ALPHABET[byte % CODE_ALPHABET.length]
    }
  }
  return code
}
