import { useParams } from "react-router-dom";
import {
  type ContentView,
  type PostEntry,
  directoryToPostEntries,
  filterVisiblePosts,
  filterByView,
  getFrontmatter,
} from "@/lib/content-classification";
import { useDirectory } from "../../plugin/src/client";
import { ErrorDisplay } from "./page-error";
import Loading from "./loading";
import { PostListItem } from "./post-list-item";

// Helper to extract numeric prefix from filename (e.g., "01-intro" → 1)
function extractOrder(name: string): number | null {
  const match = name.match(/^(\d+)-/);
  return match ? parseInt(match[1], 10) : null;
}

// Helper to strip numeric prefix for display (e.g., "01-getting-started" → "Getting Started")
function stripNumericPrefix(name: string): string {
  return name
    .replace(/^\d+-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Helper to get link path from post
function getLinkPath(post: PostEntry): string {
  if (post.file) {
    // Standalone MDX file
    return `/${post.file.path}`;
  } else if (post.slides && !post.readme) {
    // Folder with only slides
    return `/${post.slides.path}`;
  } else if (post.readme) {
    // Folder with readme
    return `/${post.readme.path}`;
  } else {
    // Fallback to folder path
    return `/${post.path}`;
  }
}

interface PostListProps {
  view?: ContentView;
}

export function PostList({ view = 'all' }: PostListProps) {
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

  // Apply view filter
  posts = filterByView(posts, view);

  if (posts.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground font-mono text-sm tracking-wide">no entries</p>
      </div>
    );
  }

  // Helper to get date from post
  const getPostDate = (post: PostEntry): Date | null => {
    const frontmatter = getFrontmatter(post);
    return frontmatter?.date ? new Date(frontmatter.date as string) : null;
  };

  // Smart sorting: numeric prefix → date → alphabetical
  posts = posts.sort((a, b) => {
    const aOrder = extractOrder(a.name);
    const bOrder = extractOrder(b.name);
    const aDate = getPostDate(a);
    const bDate = getPostDate(b);

    // Both have numeric prefix → sort by number
    if (aOrder !== null && bOrder !== null) {
      return aOrder - bOrder;
    }
    // One has prefix, one doesn't → prefixed comes first
    if (aOrder !== null) return -1;
    if (bOrder !== null) return 1;

    // Both have dates → sort by date (newest first)
    if (aDate && bDate) {
      return bDate.getTime() - aDate.getTime();
    }
    // One has date → dated comes first
    if (aDate) return -1;
    if (bDate) return 1;

    // Neither → alphabetical by title
    const aTitle = (getFrontmatter(a)?.title as string) || a.name;
    const bTitle = (getFrontmatter(b)?.title as string) || b.name;
    return aTitle.localeCompare(bTitle);
  });

  return (
    <div className="space-y-1 not-prose">
      {posts.map((post) => {
        const frontmatter = getFrontmatter(post);
        const title = (frontmatter?.title as string) || stripNumericPrefix(post.name);
        const description = frontmatter?.description as string | undefined;
        const date = frontmatter?.date ? new Date(frontmatter.date as string) : undefined;
        const linkPath = getLinkPath(post);
        const isSlides = linkPath.endsWith('SLIDES.mdx') || linkPath.endsWith('.slides.mdx');

        return (
          <PostListItem
            key={post.path}
            title={title}
            description={description}
            date={date}
            linkPath={linkPath}
            isSlides={isSlides}
          />
        );
      })}
    </div>
  );
}
