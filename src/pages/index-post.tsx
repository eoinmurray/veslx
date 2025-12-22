import { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { isSimulationRunning } from "../../plugin/src/client";
import Loading from "@/components/loading";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useIndexContent } from "@/hooks/use-mdx-content";
import { mdxComponents } from "@/components/mdx-components";
import { FrontmatterProvider } from "@/lib/frontmatter-context";

interface IndexPostProps {
  fallback: ReactNode;
}

/**
 * Attempts to render an index.mdx, index.md, README.mdx, or README.md file for a directory.
 * Checks for index files first, then README files.
 * Falls back to the provided component if no matching file exists.
 */
export function IndexPost({ fallback }: IndexPostProps) {
  const { "*": rawPath = "." } = useParams();

  // Normalize path for index lookup
  const dirPath = rawPath || ".";

  const { Content, frontmatter, loading, notFound } = useIndexContent(dirPath);
  const isRunning = isSimulationRunning();

  if (loading) return <Loading />

  // No index file found - render fallback (usually Home)
  if (notFound) {
    return <>{fallback}</>;
  }

  const isUnstyled = frontmatter?.unstyled === true

  if (isUnstyled && Content) {
    return (
      <>
        <title>{frontmatter?.title}</title>
        <FrontmatterProvider frontmatter={frontmatter}>
          <Content components={mdxComponents} />
        </FrontmatterProvider>
      </>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background noise-overlay">
      <title>{frontmatter?.title}</title>
      <Header />
      <main className="flex-1 w-full overflow-x-clip">
        {isRunning && (
          <div className="sticky top-0 z-50 px-[var(--page-padding)] py-2 bg-red-500 text-primary-foreground font-mono text-xs text-center tracking-wide">
            <span className="inline-flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              <span className="uppercase tracking-widest">simulation running</span>
              <span className="text-primary-foreground/60">Page will auto-refresh on completion</span>
            </span>
          </div>
        )}

        {Content && (
          <FrontmatterProvider frontmatter={frontmatter}>
            <article className="my-12 mx-auto px-[var(--page-padding)] max-w-[var(--content-width)] animate-fade-in">
              <Content components={mdxComponents} />
            </article>
          </FrontmatterProvider>
        )}
        <Footer />
      </main>
    </div>
  )
}
