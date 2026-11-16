import { encode } from 'uqr'

const MODULE_PX = 16
const QUIET_ZONE = 4

export type QrResult = { outcome: 'copied' | 'downloaded'; preview: string } | { outcome: 'failed' }

export function drawQr(text: string): HTMLCanvasElement {
  const { data, size } = encode(text, { ecc: 'M', border: QUIET_ZONE })
  const canvas = document.createElement('canvas')
  canvas.width = size * MODULE_PX
  canvas.height = size * MODULE_PX
  const context = canvas.getContext('2d')
  if (!context) return canvas
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#000000'
  data.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) context.fillRect(x * MODULE_PX, y * MODULE_PX, MODULE_PX, MODULE_PX)
    })
  })
  return canvas
}

function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not render the QR code.'))), 'image/png')
  })
}

function download(canvas: HTMLCanvasElement, fileName: string) {
  const anchor = document.createElement('a')
  anchor.href = canvas.toDataURL('image/png')
  anchor.download = fileName
  anchor.click()
}

export async function copyQr(text: string, fileName: string): Promise<QrResult> {
  const canvas = drawQr(text)
  const preview = canvas.toDataURL('image/png')
  try {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) throw new Error('No image clipboard.')
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': toPng(canvas) })])
    return { outcome: 'copied', preview }
  } catch {
    try {
      download(canvas, fileName)
      return { outcome: 'downloaded', preview }
    } catch {
      return { outcome: 'failed' }
    }
  }
}
