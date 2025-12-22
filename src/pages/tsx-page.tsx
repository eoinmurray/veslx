import { useParams } from "react-router-dom";
import Loading from "@/components/loading";
import { useTSXContent } from "@/hooks/use-mdx-content";
import { FrontmatterProvider } from "@/lib/frontmatter-context";

export function TsxPage() {
  const { "*": rawPath = "." } = useParams();
  const tsxPath = rawPath;

  const { Content, frontmatter, loading, error } = useTSXContent(tsxPath);

  if (loading) return <Loading />

  if (error) {
    return (
      <main className="min-h-screen bg-background container mx-auto max-w-4xl py-12">
        <p className="text-center text-red-600">{error.message}</p>
      </main>
    )
  }

  if (!Content) {
    return null
  }

  return (
    <>
      <title>{frontmatter?.title}</title>
      <FrontmatterProvider frontmatter={frontmatter}>
        <Content />
      </FrontmatterProvider>
    </>
  )
}
