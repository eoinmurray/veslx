import { useParams } from "react-router-dom"
import { PostList } from "@/components/post-list";
import { Header } from "@/components/header";
import veslxConfig from "virtual:veslx-config";

export function Home() {
  const { "*": path = "." } = useParams();
  const config = veslxConfig.site;

  const isRoot = path === "." || path === "";

  return (
    <div className="flex min-h-screen flex-col bg-background noise-overlay">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-[var(--content-width)] px-[var(--page-padding)]">
        <title>{isRoot ? config.name : `${config.name} - ${path}`}</title>
        <main className="flex flex-col gap-8 mb-32 mt-12">
          {isRoot && (
            <div className="animate-fade-in flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                  {config.name}
                </h1>
                {config.description && (
                  <p className="mt-2 text-muted-foreground">
                    {config.description}
                  </p>
                )}
              </div>
              {config.llmsTxt && (
                <a
                  href="/llms-full.txt"
                  className="font-mono text-xs text-muted-foreground/70 hover:text-foreground underline underline-offset-2 transition-colors shrink-0"
                >
                  llms.txt
                </a>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="animate-fade-in">
              <PostList />
            </div>
          </div>
        </main>
      </main>
    </div>
  )
}
