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
      // Strategy 2: Key equals /@content/path (Vite alias resolution)
      if (key === `/@content/${normalizedPath}`) return true
      // Strategy 3: Key equals @content/path (alias form)
      if (key === `@content/${normalizedPath}`) return true
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
      if (key === `/@content/${candidate}`) return true
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
      // Strategy 2: Key equals /@content/path (Vite alias resolution)
      if (key === `/@content/${normalizedPath}`) return true
      // Strategy 3: Key equals @content/path (alias form)
      if (key === `@content/${normalizedPath}`) return true
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
      if (key === `/@content/${candidate}`) return true
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

/**
 * Find index.mdx, index.md, README.mdx, or README.md in a directory.
 * Checks index files first, then README files.
 */
function findIndexModule(modules: ModuleMap, path: string): ModuleLoader | null {
  const keys = Object.keys(modules)

  // Normalize path - remove leading slash, handle root
  const normalizedPath = path.replace(/^\//, '') || '.'
  const isRoot = normalizedPath === '.' || normalizedPath === ''

  // Debug: log keys and path
  // Debug logging removed to keep browser console clean.

  // Look for index files first, then README files
  const candidates = isRoot
    ? ['index.mdx', 'index.md', 'README.mdx', 'README.md']
    : [
        `${normalizedPath}/index.mdx`,
        `${normalizedPath}/index.md`,
        `${normalizedPath}/README.mdx`,
        `${normalizedPath}/README.md`,
      ]

  for (const candidate of candidates) {
    const matchingKey = keys.find(key => {
      // For root-level files, match keys that end with /candidate but DON'T have additional path segments
      // e.g., for README.mdx: match "/../content/README.mdx" but not "/../content/subdir/README.mdx"
      if (isRoot) {
        // Key must end with /candidate and have no additional path segments before the filename
        // Extract the filename from the key and compare
        const keyFilename = key.split('/').pop()
        if (keyFilename === candidate) {
          // Make sure it's in the root of content dir, not a subdirectory
          // Count path segments after the content directory marker
          // Keys look like: /../pinglab/content/README.mdx or @content/README.mdx
          const parts = key.split('/')
          const contentIdx = parts.findIndex(p => p === 'content' || p === '@content')
          if (contentIdx !== -1) {
            // If there's only one segment after "content", it's a root file
            const afterContent = parts.slice(contentIdx + 1)
            if (afterContent.length === 1) return true
          }
          // Also try @content prefix matching
          if (key === `/@content/${candidate}`) return true
          if (key === `@content/${candidate}`) return true
        }
        return false
      }
      // For subdirectories, allow endsWith matching
      if (key.endsWith(`/${candidate}`)) return true
      if (key === `/@content/${candidate}`) return true
      if (key === `@content/${candidate}`) return true
      if (key === `/content/${candidate}`) return true
      if (key === candidate) return true
      return false
    })
    if (matchingKey) {
      return modules[matchingKey]
    }
  }

  return null
}

/**
 * Hook for loading index.mdx/index.md or README.mdx/README.md content.
 * Checks for index files first, then README files.
 * Returns notFound: true if no matching file exists (instead of throwing an error).
 */
export function useIndexContent(path: string) {
  const [Content, setContent] = useState<MDXModule['default'] | null>(null)
  const [frontmatter, setFrontmatter] = useState<MDXModule['frontmatter']>(undefined)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)

    import('virtual:content-modules')
      .then(({ modules }) => {
        const loader = findIndexModule(modules as ModuleMap, path)

        if (!loader) {
          // No index file - this is not an error, just means fallback to directory listing
          if (!cancelled) {
            setNotFound(true)
            setLoading(false)
          }
          return null
        }

        return loader()
      })
      .then((mod) => {
        if (mod && !cancelled) {
          setContent(() => mod.default)
          setFrontmatter(mod.frontmatter)
          setLoading(false)
        }
      })
      .catch(() => {
        // Treat load errors as not found
        if (!cancelled) {
          setNotFound(true)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [path])

  return { Content, frontmatter, loading, notFound }
}
