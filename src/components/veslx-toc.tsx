import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const DEFAULT_LEVELS: Array<2 | 3 | 4> = [2, 3, 4];

type TocItem = {
  id: string;
  text: string;
  level: number;
};

interface VeslxTocProps {
  /** Optional title shown above the list */
  title?: string;
  /** Heading levels to include (default: [2, 3, 4]) */
  levels?: Array<2 | 3 | 4 | 5 | 6>;
  /** Optional class override */
  className?: string;
}

export function VeslxTOC({ title = "Contents", levels, className }: VeslxTocProps) {
  const location = useLocation();
  const [items, setItems] = useState<TocItem[]>([]);
  const resolvedLevels = useMemo(
    () => (levels && levels.length > 0 ? levels : DEFAULT_LEVELS),
    [levels ? levels.join(",") : ""]
  );
  const levelsKey = useMemo(() => resolvedLevels.join(","), [resolvedLevels]);

  useEffect(() => {
    const article = document.querySelector("article");
    if (!article) {
      setItems([]);
      return;
    }

    const selector = resolvedLevels.map((level) => `h${level}`).join(",");
    const headings = Array.from(article.querySelectorAll<HTMLElement>(selector));
    const nextItems = headings
      .map((heading) => ({
        id: heading.id,
        text: heading.textContent?.trim() ?? "",
        level: parseInt(heading.tagName.replace("H", ""), 10),
      }))
      .filter((item) => item.id && item.text);

    setItems(nextItems);
  }, [location.pathname, location.hash, levelsKey, resolvedLevels]);

  const minLevel = useMemo(
    () => items.reduce((min, item) => Math.min(min, item.level), 6),
    [items]
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <nav className={cn("not-prose my-6", className)} aria-label="Table of contents">
      {title && <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-2">{title}</div>}
      <ul className="space-y-1">
        {items.map((item) => {
          const indent = Math.max(0, item.level - minLevel);
          return (
            <li key={item.id} className={cn(indent > 0 && "ml-3")}>
              <a
                href={`#${item.id}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
