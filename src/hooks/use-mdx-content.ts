import { useState, useEffect } from 'react'
import type { ComponentType } from 'react'

interface MDXModule {
  default: ComponentType<{ components?: Record<string, ComponentType> }>
  frontmatter?: {
    title?: string
    description?: string
    date?: string
    visibility?: string
    draft?: boolean
  }
  slideCount?: number // Exported by remark-slides plugin for SLIDES.mdx files
}

type ModuleLoader = () => Promise<MDXModule>
type ModuleMap = Record<string, ModuleLoader>

/**
 * Find MDX/MD module by path. Supports:
 * - Full path: "docs/intro.mdx" or "docs/intro.md" -> matches exactly
 * - Folder path: "docs" -> matches "docs/index.mdx", "docs/README.mdx", or "docs.mdx" (and .md variants)
 */
function findMdxModule(modules: ModuleMap, path: string): ModuleLoader | null {
  const keys = Object.keys(modules)

  // Normalize path - remove leading slash if present
  const normalizedPath = path.replace(/^\//, '')

  // If path already ends with .mdx or .md, match exactly
  if (normalizedPath.endsWith('.mdx') || normalizedPath.endsWith('.md')) {
    // Try multiple matching strategies for different Vite glob formats
    const matchingKey = keys.find(key => {
      // Strategy 1: Key ends with /path (e.g., @content/docs/foo.mdx matches docs/foo.mdx)
      if (key.endsWith(`/${normalizedPath}`)) return true
      // Strategy 2: Key equals @content/path (alias form)
      if (key === `@content/${normalizedPath}`) return true
      // Strategy 3: Key equals /@content/path (with leading slash)
      if (key === `/@content/${normalizedPath}`) return true
      // Strategy 4: Key equals path directly
      if (key === normalizedPath) return true
      // Strategy 5: Key equals /path (with leading slash)
      if (key === `/${normalizedPath}`) return true
      return false
    })
    return matchingKey ? modules[matchingKey] : null
  }

  // Otherwise, try folder conventions in order of preference:
  // 1. folder/index.mdx (modern convention)
  // 2. folder/README.mdx (current convention)
  // 3. folder.mdx (file alongside folders)
  // Also try .md variants
  const candidates = [
    `${normalizedPath}/index.mdx`,
    `${normalizedPath}/index.md`,
    `${normalizedPath}/README.mdx`,
    `${normalizedPath}/README.md`,
    `${normalizedPath}.mdx`,
    `${normalizedPath}.md`,
  ]

  for (const candidate of candidates) {
    const matchingKey = keys.find(key => {
      if (key.endsWith(`/${candidate}`)) return true
      if (key === `@content/${candidate}`) return true
      if (key === candidate) return true
      return false
    })
    if (matchingKey) {
      return modules[matchingKey]
    }
  }

  return null
}

export function useMDXContent(path: string) {
  const [Content, setContent] = useState<MDXModule['default'] | null>(null)
  const [frontmatter, setFrontmatter] = useState<MDXModule['frontmatter']>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    // Dynamic import to avoid pre-bundling issues
    import('virtual:content-modules')
      .then(({ modules }) => {
        const loader = findMdxModule(modules as ModuleMap, path)

        if (!loader) {
          throw new Error(`MDX module not found for path: ${path}`)
        }

        return loader()
      })
      .then((mod) => {
        if (!cancelled) {
          setContent(() => mod.default)
          setFrontmatter(mod.frontmatter)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [path])

  return { Content, frontmatter, loading, error }
}

/**
 * Find slides module by path. Supports:
 * - Full path: "docs/intro.slides.mdx" or "docs/SLIDES.mdx" -> matches exactly
 * - Folder path: "docs" -> matches "docs/SLIDES.mdx" or "docs/index.slides.mdx"
 */
function findSlidesModule(modules: ModuleMap, path: string): ModuleLoader | null {
  const keys = Object.keys(modules)

  // Normalize path - remove leading slash if present
  const normalizedPath = path.replace(/^\//, '')

  // If path already ends with .mdx or .md, match exactly
  if (normalizedPath.endsWith('.mdx') || normalizedPath.endsWith('.md')) {
    // Try multiple matching strategies for different Vite glob formats
    const matchingKey = keys.find(key => {
      // Strategy 1: Key ends with /path (e.g., @content/docs/foo.slides.mdx matches docs/foo.slides.mdx)
      if (key.endsWith(`/${normalizedPath}`)) return true
      // Strategy 2: Key equals @content/path (alias form)
      if (key === `@content/${normalizedPath}`) return true
      // Strategy 3: Key equals /@content/path (with leading slash)
      if (key === `/@content/${normalizedPath}`) return true
      // Strategy 4: Key equals path directly
      if (key === normalizedPath) return true
      // Strategy 5: Key equals /path (with leading slash)
      if (key === `/${normalizedPath}`) return true
      return false
    })
    return matchingKey ? modules[matchingKey] : null
  }

  // Otherwise, try folder conventions:
  // 1. folder/SLIDES.mdx (current convention)
  // 2. folder/index.slides.mdx (alternative)
  // Also try .md variants
  const candidates = [
    `${normalizedPath}/SLIDES.mdx`,
    `${normalizedPath}/SLIDES.md`,
    `${normalizedPath}/index.slides.mdx`,
    `${normalizedPath}/index.slides.md`,
  ]

  for (const candidate of candidates) {
    const matchingKey = keys.find(key => {
      if (key.endsWith(`/${candidate}`)) return true
      if (key === `@content/${candidate}`) return true
      if (key === candidate) return true
      return false
    })
    if (matchingKey) {
      return modules[matchingKey]
    }
  }

  return null
}

export function useMDXSlides(path: string) {
  const [Content, setContent] = useState<MDXModule['default'] | null>(null)
  const [frontmatter, setFrontmatter] = useState<MDXModule['frontmatter']>(undefined)
  const [slideCount, setSlideCount] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    // Dynamic import to avoid pre-bundling issues
    import('virtual:content-modules')
      .then(({ slides }) => {
        const loader = findSlidesModule(slides as ModuleMap, path)

        if (!loader) {
          throw new Error(`Slides module not found for path: ${path}`)
        }

        return loader()
      })
      .then((mod) => {
        if (!cancelled) {
          setContent(() => mod.default)
          setFrontmatter(mod.frontmatter)
          setSlideCount(mod.slideCount)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [path])

  return { Content, frontmatter, slideCount, loading, error }
}
