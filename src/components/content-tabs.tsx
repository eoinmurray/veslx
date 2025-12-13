import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { ContentView } from "@/lib/content-classification";

interface ContentTabsProps {
  value: ContentView;
  counts: { posts: number; docs: number; all: number };
}

const views: { key: ContentView; label: string; path: string }[] = [
  { key: "posts", label: "posts", path: "/posts" },
  { key: "docs", label: "docs", path: "/docs" },
  { key: "all", label: "all", path: "/all" },
];

export function ContentTabs({ value, counts }: ContentTabsProps) {
  const hasOnlyPosts = counts.posts > 0 && counts.docs === 0;
  const hasOnlyDocs = counts.docs > 0 && counts.posts === 0;

  if (hasOnlyPosts || hasOnlyDocs) {
    return null;
  }

  const isDisabled = (key: ContentView) => {
    if (key === "posts") return counts.posts === 0;
    if (key === "docs") return counts.docs === 0;
    return false;
  };

  return (
    <nav className="flex justify-end items-center gap-3 font-mono font-medium text-xs text-muted-foreground">
      {views.map((view) => {
        const disabled = isDisabled(view.key);

        if (disabled) {
          return (
            <span
              key={view.key}
              className="opacity-30 cursor-not-allowed"
            >
              {view.label}
            </span>
          );
        }

        return (
          <Link
            key={view.key}
            to={view.path}
            className={cn(
              "transition-colors duration-150",
              "hover:text-foreground hover:underline hover:underline-offset-4 hover:decoration-primary/60",
              value === view.key
                ? "text-foreground underline-offset-4 decoration-primary/60"
                : ""
            )}
          >
            {view.label}
          </Link>
        );
      })}
    </nav>
  );
}
