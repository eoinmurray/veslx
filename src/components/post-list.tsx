import { useParams } from "react-router-dom";
import { minimatch } from "minimatch";
import {
  type PostEntry,
  directoryToPostEntries,
  filterVisiblePosts,
  getFrontmatter,
} from "@/lib/content-classification";
import { useDirectory } from "../../plugin/src/client";
import { ErrorDisplay } from "./page-error";
import Loading from "./loading";
import { PostListItem } from "./post-list-item";
import veslxConfig from "virtual:veslx-config";

interface PostListProps {
  /** Glob patterns to filter posts by name (e.g., ["01-*", "getting-*"]) */
  globs?: string[] | null;
}

// Helper to format name for display (e.g., "01-getting-started" → "Getting Started")
function formatName(name: string): string {
  return name
    .replace(/^\d+-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function filePathToRoutePath(filePath: string): string {
  // Routes without an extension are treated as directories; ContentRouter will
  // render index/readme files automatically via IndexPost.
  const normalized = filePath.replace(/^\/+/, '');
  const stripped = normalized.replace(/(?:^|\/)(?:index|readme)\.mdx?$/i, '');
  return stripped ? `/${stripped}` : '/';
}

// Helper to get link path from post
function getLinkPath(post: PostEntry): string {
  if (post.file) {
    // Standalone MDX file
    return filePathToRoutePath(post.file.path);
  } else if (post.slides && !post.readme) {
    // Folder with only slides
    return `/${post.slides.path}`;
  } else if (post.readme) {
    // Folder with readme
    return filePathToRoutePath(post.readme.path);
  } else {
    // Fallback to folder path
    return `/${post.path}`;
  }
}

function isRouterPath(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

export function PostList({ globs = null }: PostListProps) {
  const { "*": path = "." } = useParams();

  const { directory, loading, error } = useDirectory(path)

  if (error) {
    return <ErrorDisplay error={error} path={path} />;
  }

  if (loading) {
    return (
      <Loading />
    )
  }

  if (!directory) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground font-mono text-sm tracking-wide">no entries</p>
      </div>
    );
  }

  let posts = directoryToPostEntries(directory);

  if (posts.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground font-mono text-sm tracking-wide">no entries</p>
      </div>
    );
  }

  // Filter out hidden and draft posts
  posts = filterVisiblePosts(posts);

  // Filter by glob patterns if provided
  if (globs && globs.length > 0) {
    posts = posts.filter(post =>
      globs.some(pattern => minimatch(post.name, pattern, { matchBase: true }))
    );
  }

  if (posts.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground font-mono text-sm tracking-wide">no entries</p>
      </div>
    );
  }

  // Sort based on config
  const sortMode = veslxConfig.posts?.sort ?? 'alpha';
  if (sortMode === 'date' || sortMode === 'date-asc') {
    const ascending = sortMode === 'date-asc';
    // Sort by date, posts without dates go to the top
    posts = posts.sort((a, b) => {
      const dateA = getFrontmatter(a)?.date;
      const dateB = getFrontmatter(b)?.date;
      if (!dateA && !dateB) return a.name.localeCompare(b.name);
      if (!dateA) return -1;
      if (!dateB) return 1;
      const diff = new Date(dateA as string).getTime() - new Date(dateB as string).getTime();
      return ascending ? diff : -diff;
    });
  } else {
    // Alphanumeric sorting by name
    posts = posts.sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div className="space-y-1 not-prose">
      {posts.map((post) => {
        const frontmatter = getFrontmatter(post);
        const title = (frontmatter?.title as string) || formatName(post.name);
        const description = frontmatter?.description as string | undefined;
        const date = frontmatter?.date ? new Date(frontmatter.date as string) : undefined;
        const internalLinkPath = getLinkPath(post);
        const normalizedLink = internalLinkPath.toLowerCase();
        const isSlides =
          normalizedLink.endsWith('/slides.mdx') ||
          normalizedLink.endsWith('/slides.md') ||
          normalizedLink.endsWith('.slides.mdx') ||
          normalizedLink.endsWith('.slides.md');

        const frontmatterLink =
          typeof frontmatter?.link === "string" ? frontmatter.link.trim() : "";
        const href = frontmatterLink || internalLinkPath;
        const external = !isRouterPath(href);

        return (
          <PostListItem
            key={post.path}
            title={title}
            description={description}
            date={date}
            href={href}
            external={external}
            isSlides={isSlides}
          />
        );
      })}
    </div>
  );
}
