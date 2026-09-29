import { toast } from 'sonner'

/** Copies text and says so; a blocked clipboard is a toast, never a thrown error. True when it copied. */
export async function copyText(text: string, what = 'Copied'): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(what)
    return true
  } catch {
    toast.error('Could not copy — clipboard access was blocked')
    return false
  }
}
