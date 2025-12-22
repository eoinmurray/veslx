import { useParams } from "react-router-dom";
import { findSlides, isSimulationRunning, useDirectory } from "../../plugin/src/client";
import Loading from "@/components/loading";
import { FileEntry } from "plugin/src/lib";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { useMDXContent } from "@/hooks/use-mdx-content";
import { mdxComponents } from "@/components/mdx-components";
import { FrontmatterProvider } from "@/lib/frontmatter-context";

export function Post() {
  const { "*": rawPath = "." } = useParams();

  // The path includes the .mdx extension from the route
  const mdxPath = rawPath;

  // Extract directory path for finding sibling files (slides, etc.)
  const dirPath = mdxPath.replace(/\/[^/]+\.mdx$/, '') || '.';

  const { directory, loading: dirLoading } = useDirectory(dirPath)
  const { Content, frontmatter, loading: mdxLoading, error } = useMDXContent(mdxPath);
  const isRunning = isSimulationRunning();

  let slides: FileEntry | null = null;
  if (directory) {
    slides = findSlides(directory);
  }

  const loading = dirLoading || mdxLoading;

  if (loading) return <Loading />

  if (error) {
    return (
      <main className="min-h-screen bg-background container mx-auto max-w-4xl py-12">
        <p className="text-center text-red-600">{error.message}</p>
      </main>
    )
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
            <article className="mt-12 mb-32 mx-auto px-[var(--page-padding)] max-w-[var(--content-width)] animate-fade-in">
              <Content components={mdxComponents} />
            </article>
          </FrontmatterProvider>
        )}
        <Footer />
      </main>
    </div>
  )
}
