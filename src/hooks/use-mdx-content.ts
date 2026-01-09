import { useState, useEffect } from 'react'
import type { ComponentType } from 'react'

interface MDXModule {
  default: ComponentType<{ components?: Record<string, ComponentType> }>
  frontmatter?: {
    title?: string
    description?: string
    link?: string
    date?: string
    visibility?: string
    draft?: boolean
    unstyled?: boolean
  }
  slideCount?: number // Exported by remark-slides plugin for SLIDES.mdx files
}

interface TSXModule {
  default: ComponentType
  frontmatter?: {
    title?: string
    description?: string
    link?: string
    date?: string
    visibility?: string
    draft?: boolean
  }
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

/**
 * Find TSX module by path (exact match only).
 */
function findTsxModule(modules: ModuleMap, path: string): ModuleLoader | null {
  const keys = Object.keys(modules)
  const normalizedPath = path.replace(/^\//, '')

  if (!normalizedPath.endsWith('.tsx')) {
    return null
  }

  const matchingKey = keys.find(key => {
    if (key.endsWith(`/${normalizedPath}`)) return true
    if (key === `/@content/${normalizedPath}`) return true
    if (key === `@content/${normalizedPath}`) return true
    if (key === normalizedPath) return true
    if (key === `/${normalizedPath}`) return true
    return false
  })

  return matchingKey ? modules[matchingKey] : null
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

export function useTSXContent(path: string) {
  const [Content, setContent] = useState<TSXModule['default'] | null>(null)
  const [frontmatter, setFrontmatter] = useState<TSXModule['frontmatter']>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    import('virtual:content-modules')
      .then(({ tsxPages }) => {
        const loader = findTsxModule(tsxPages as ModuleMap, path)

        if (!loader) {
          throw new Error(`TSX module not found for path: ${path}`)
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

  function stripQueryAndHash(p: string): string {
    return p.replace(/[?#].*$/, '')
  }

  function ensureLeadingSlash(p: string): string {
    if (!p) return p
    return p.startsWith('/') ? p : `/${p}`
  }

  function dirname(p: string): string {
    const clean = stripQueryAndHash(p)
    const parts = clean.split('/')
    if (parts.length <= 1) return clean
    parts.pop()
    const joined = parts.join('/')
    return joined || '/'
  }

  function commonDirPrefix(paths: string[]): string | null {
    if (paths.length === 0) return null
    const split = paths.map((p) => p.split('/').filter(Boolean))
    let prefix = split[0]
    for (let i = 1; i < split.length; i++) {
      const cur = split[i]
      let j = 0
      while (j < prefix.length && j < cur.length && prefix[j] === cur[j]) {
        j++
      }
      prefix = prefix.slice(0, j)
      if (prefix.length === 0) return '/'
    }
    return '/' + prefix.join('/')
  }

  function isFsLikeGlobKey(key: string): boolean {
    const clean = stripQueryAndHash(key)
    if (clean.startsWith('/@fs/')) return true
    // Vite can emit keys like "/../../../abs/path/to/file.mdx" for out-of-root globs,
    // and sometimes absolute-like keys (still starting with "/") for aliased globs.
    if (clean.startsWith('/') && (clean.endsWith('.mdx') || clean.endsWith('.md'))) return true
    return false
  }

  function keyToFsPath(key: string): string | null {
    const clean = stripQueryAndHash(key)
    if (!isFsLikeGlobKey(clean)) return null
    if (clean.startsWith('/@fs/')) {
      return ensureLeadingSlash(clean.slice('/@fs/'.length))
    }
    return ensureLeadingSlash(clean)
  }

  // Infer the content root from the common parent directory of all fs-like keys.
  // This avoids relying on the content directory being literally named "content".
  const inferredContentRoot = (() => {
    const fsPaths = keys.map(keyToFsPath).filter((p): p is string => Boolean(p))
    if (fsPaths.length === 0) return null
    const dirs = fsPaths.map(dirname)
    return commonDirPrefix(dirs)
  })()

  function toContentRelativePath(key: string): string | null {
    const cleanKey = stripQueryAndHash(key)

    if (cleanKey.startsWith('@content/')) return cleanKey.slice('@content/'.length)
    if (cleanKey.startsWith('/@content/')) return cleanKey.slice('/@content/'.length)

    if (cleanKey.startsWith('./')) return cleanKey.slice('./'.length)
    // Some Vite glob keys look like "/README.mdx" relative to the Vite root
    if (cleanKey.startsWith('/') && (cleanKey.endsWith('.mdx') || cleanKey.endsWith('.md'))) {
      const maybe = cleanKey.slice(1)
      if (!maybe.includes('/')) return maybe
    }

    if (inferredContentRoot) {
      const fsPath = keyToFsPath(cleanKey)
      if (fsPath) {
        const normalizedRoot = inferredContentRoot.endsWith('/')
          ? inferredContentRoot.slice(0, -1)
          : inferredContentRoot
        if (fsPath.startsWith(normalizedRoot + '/')) {
          return fsPath.slice(normalizedRoot.length + 1)
        }
      }
    }

    return null
  }

  const candidates = isRoot
    ? ['index.mdx', 'index.md', 'README.mdx', 'README.md']
    : [
        `${normalizedPath}/index.mdx`,
        `${normalizedPath}/index.md`,
        `${normalizedPath}/README.mdx`,
        `${normalizedPath}/README.md`,
      ]

  for (const candidate of candidates) {
    const matchingKey = keys.find((k) => {
      const rel = toContentRelativePath(k)
      return rel === candidate
    })
    if (matchingKey) return modules[matchingKey]
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
