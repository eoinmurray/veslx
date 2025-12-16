import { useParams } from "react-router-dom"
import { Home } from "./home"
import { Post } from "./post"
import { SlidesPage } from "./slides"
import { IndexPost } from "./index-post"

/**
 * Routes to the appropriate page based on the URL path:
 * - *.slides.mdx or *SLIDES.mdx → SlidesPage
 * - *.mdx or *.md → Post
 * - directory with index.mdx/index.md → IndexPost (renders index file)
 * - everything else → Home (directory listing)
 */
export function ContentRouter() {
  const { "*": path = "" } = useParams()

  // Check if this is a slides file
  const filename = path.split('/').pop()?.toLowerCase() || ''
  const isSlides =
    path.endsWith('.slides.mdx') ||
    path.endsWith('.slides.md') ||
    filename === 'slides.mdx' ||
    filename === 'slides.md'
  if (isSlides) {
    return <SlidesPage />
  }

  // Check if this is any MDX/MD file
  if (path.endsWith('.mdx') || path.endsWith('.md')) {
    return <Post />
  }

  // For directories, try to render index.mdx/index.md, fallback to Home
  return <IndexPost fallback={<Home />} />
}
