import { useParams } from "react-router-dom";
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

// Helper to format name for display (e.g., "01-getting-started" → "Getting Started")
function formatName(name: string): string {
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

export function PostList() {
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

  if (posts.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground font-mono text-sm tracking-wide">no entries</p>
      </div>
    );
  }

  // Alphanumeric sorting by name
  posts = posts.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-1 not-prose">
      {posts.map((post) => {
        const frontmatter = getFrontmatter(post);
        const title = (frontmatter?.title as string) || formatName(post.name);
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
