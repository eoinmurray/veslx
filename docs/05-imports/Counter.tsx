import { useState } from 'react'

export function Counter({ initial = 0 }: { initial?: number }) {
  const [count, setCount] = useState(initial)

  return (
    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg my-4">
      <button
        onClick={() => setCount(c => c - 1)}
        className="px-3 py-1 bg-primary text-primary-foreground rounded hover:opacity-90"
      >
        -
      </button>
      <span className="font-mono text-lg min-w-[3ch] text-center">{count}</span>
      <button
        onClick={() => setCount(c => c + 1)}
        className="px-3 py-1 bg-primary text-primary-foreground rounded hover:opacity-90"
      >
        +
      </button>
    </div>
  )
}
