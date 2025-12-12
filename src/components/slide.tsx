import { ReactNode } from 'react'

interface SlideProps {
  index: number
  children: ReactNode
}

/**
 * Slide component - wraps slide content for stacked scrollable display.
 * Each slide takes full viewport height.
 */
export function Slide({ index, children }: SlideProps) {
  return (
    <>
      {index > 0 && (
        <hr className="border-t border-border w-full" />
      )}
      <div
        className="slide-section min-h-screen flex items-center justify-center py-8 sm:py-12 md:py-16 px-4"
        data-slide-index={index}
      >
        <div className="slide-content prose dark:prose-invert prose-headings:tracking-tight prose-p:leading-relaxed max-w-[var(--content-width)] w-full">
          {children}
        </div>
      </div>
    </>
  )
}