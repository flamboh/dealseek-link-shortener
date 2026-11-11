import { toast } from 'sonner'
import { copyText } from '../lib/clipboard'

export async function copyLink(url: string) {
  if (await copyText(url)) {
    toast('Copied', { id: 'copy', duration: 2000 })
  } else {
    toast.error('Couldn’t copy', { id: 'copy', duration: 3000 })
  }
}
