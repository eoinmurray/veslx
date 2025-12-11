import { useParams } from "react-router-dom"
import { useDirectory } from "../../plugin/src/client";
import Loading from "@/components/loading";
import PostList from "@/components/post-list";
import { ErrorDisplay } from "@/components/page-error";
import { RunningBar } from "@/components/running-bar";
import { Header } from "@/components/header";

export function Home() {
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

  return (
    <div className="flex min-h-screen flex-col bg-background noise-overlay">
      <RunningBar />
      <Header />
      <main className="flex-1 mx-auto w-full max-w-[var(--content-width)] px-[var(--page-padding)]">
        <title>{`Pinglab ${path}`}</title>
        <main className="flex flex-col gap-6 mb-32 mt-32">
          {directory && (
            <div className="animate-fade-in">
              <PostList directory={directory}/>
            </div>
          )}
        </main>
      </main>
    </div>
  )
}
