import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

type CopyPasteProps = {
  children: ReactNode
}

export function CopyPaste({ children }: CopyPasteProps) {
  const preRef = useRef<HTMLPreElement>(null)
  const timeoutRef = useRef<number | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const copyToClipboard = () => {
    if (typeof window === 'undefined' || !navigator.clipboard?.writeText) {
      return
    }

    const text = preRef.current?.innerText ?? ''
    if (!text) {
      return
    }

    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true)
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = window.setTimeout(() => setIsCopied(false), 2000)
    })
  }

  return (
    <div className="not-prose relative my-6">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="absolute right-2 top-2 h-7 px-2 text-xs"
        onClick={copyToClipboard}
      >
        {isCopied ? 'Copied' : 'Copy'}
      </Button>
      <pre
        ref={preRef}
        className="w-full overflow-x-auto p-4 text-sm bg-muted border border-border rounded-md font-mono"
      >
        {children}
      </pre>
    </div>
  )
}
