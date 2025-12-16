import { useParams } from "react-router-dom"
import { PostList } from "@/components/post-list";
import { Header } from "@/components/header";
import {
  type ContentView,
} from "@/lib/content-classification";
import veslxConfig from "virtual:veslx-config";

interface HomeProps {
  view?: ContentView;
}

export function Home({ view }: HomeProps) {
  const { "*": path = "." } = useParams();
  const config = veslxConfig.site;

  // Normalize path - "posts", "docs", and "all" are view routes, not directories
  const isViewRoute = path === "posts" || path === "docs" || path === "all";

  // Use prop view, fallback to config default
  const activeView = view ?? config.defaultView;

  const isRoot = path === "." || path === "" || isViewRoute;

  return (
    <div className="flex min-h-screen flex-col bg-background noise-overlay">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-[var(--content-width)] px-[var(--page-padding)]">
        <title>{isRoot ? config.name : `${config.name} - ${path}`}</title>
        <main className="flex flex-col gap-8 mb-32 mt-12">
          {isRoot && (
            <div className="animate-fade-in">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                {config.name}
              </h1>
              {config.description && (
                <p className="mt-2 text-muted-foreground">
                  {config.description}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="animate-fade-in">
              <PostList view={isRoot ? activeView : 'all'} />
            </div>
          </div>
        </main>
      </main>
    </div>
  )
}
