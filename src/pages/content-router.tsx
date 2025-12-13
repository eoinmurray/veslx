import { useParams } from "react-router-dom"
import { Home } from "./home"
import { Post } from "./post"
import { SlidesPage } from "./slides"

/**
 * Routes to the appropriate page based on the URL path:
 * - /posts → Home with posts view
 * - /docs → Home with docs view
 * - *.slides.mdx or *SLIDES.mdx → SlidesPage
 * - *.mdx → Post
 * - everything else → Home (directory listing)
 */
export function ContentRouter() {
  const { "*": path = "" } = useParams()

  // Check for content view routes
  if (path === 'posts') {
    return <Home view="posts" />
  }
  if (path === 'docs') {
    return <Home view="docs" />
  }
  if (path === 'all') {
    return <Home view="all" />
  }

  // Check if this is a slides file
  if (path.endsWith('.slides.mdx') || path.endsWith('SLIDES.mdx')) {
    return <SlidesPage />
  }

  // Check if this is any MDX file
  if (path.endsWith('.mdx') || path.endsWith('.md')) {
    return <Post />
  }

  // Otherwise show directory listing
  return <Home />
}
