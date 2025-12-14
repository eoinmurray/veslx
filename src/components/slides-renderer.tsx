import { ReactNode } from 'react'
import { mdxComponents } from '@/components/mdx-components'
import { Slide } from '@/components/slide'

/**
 * MDX components for slides - includes the Slide component
 */
export const slidesMdxComponents = {
  ...mdxComponents,
  Slide,
}

/**
 * Renders a single slide's content
 */
export function SlideContent({ children }: { children: ReactNode }) {
  return (
    <div className="slide-content prose dark:prose-invert prose-headings:tracking-tight prose-p:leading-relaxed">
      {children}
    </div>
  )
}
