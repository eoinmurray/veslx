import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { DirectoryEntry } from "../../plugin/src/lib";
import { formatDate } from "@/lib/format-date";
import { ArrowRight, Presentation } from "lucide-react";
import {
  type ContentView,
  type PostEntry,
  directoryToPostEntries,
  filterVisiblePosts,
  filterByView,
  getFrontmatter,
} from "@/lib/content-classification";

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

interface PostListProps {
  directory: DirectoryEntry;
  view?: ContentView;
}

export default function PostList({ directory, view = 'all' }: PostListProps) {
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
    <div className="space-y-1">
      {posts.map((post) => {
        const frontmatter = getFrontmatter(post);

        // Title: explicit frontmatter > stripped numeric prefix > raw name
        const title = (frontmatter?.title as string) || stripNumericPrefix(post.name);
        const description = frontmatter?.description as string | undefined;
        const date = frontmatter?.date ? new Date(frontmatter.date as string) : null;

        // Determine the link path
        let linkPath: string;
        if (post.file) {
          // Standalone MDX file
          linkPath = `/${post.file.path}`;
        } else if (post.slides && !post.readme) {
          // Folder with only slides
          linkPath = `/${post.slides.path}`;
        } else if (post.readme) {
          // Folder with readme
          linkPath = `/${post.readme.path}`;
        } else {
          // Fallback to folder path
          linkPath = `/${post.path}`;
        }

        const isSlides = linkPath.endsWith('SLIDES.mdx');

        return (
          <Link
            key={post.path}
            to={linkPath}
            className={cn(
              "group block py-3 px-3 -mx-3 rounded-md",
              "transition-colors duration-150",
            )}
          >
            <article className="flex items-center gap-4">
              {/* Main content */}
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  "text-sm font-medium text-foreground",
                  "group-hover:underline",
                  "flex items-center gap-2"
                )}>
                  <span>{title}</span>
                  <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-primary" />
                </h3>

                {description && (
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                    {description}
                  </p>
                )}
              </div>

              {isSlides && (
                <Presentation className="h-3 w-3 text-muted-foreground" />
              )}
              <time
                dateTime={date?.toISOString()}
                className="font-mono text-xs text-muted-foreground tabular-nums w-20 flex-shrink-0"
              >
                {date && formatDate(date)}
              </time>
            </article>
          </Link>
        );
      })}
    </div>
  );
}
