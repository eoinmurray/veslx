import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type SearchEntry = {
  title: string;
  description?: string;
  path: string;
};

interface VeslxSearchProps {
  placeholder?: string;
  limit?: number;
  className?: string;
  showDescription?: boolean;
}

export function VeslxSearch({
  placeholder = "Search docs (⌘K)",
  limit = 8,
  className,
  showDescription = true,
}: VeslxSearchProps) {
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/raw/search.json");
        if (!res.ok) {
          throw new Error(`Failed to load search index: ${res.status}`);
        }
        const data = (await res.json()) as SearchEntry[];
        if (!cancelled) {
          setEntries(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load search index");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const trimmed = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!trimmed) return [];
    return entries
      .filter(entry => {
        const title = entry.title.toLowerCase();
        const description = entry.description?.toLowerCase() ?? "";
        const path = entry.path.toLowerCase();
        return title.includes(trimmed) || description.includes(trimmed) || path.includes(trimmed);
      })
      .slice(0, limit);
  }, [entries, limit, trimmed]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [trimmed]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.metaKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!trimmed) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      const selected = results[activeIndex];
      if (selected) {
        event.preventDefault();
        navigate(selected.path);
      }
    } else if (event.key === "Escape") {
      setQuery("");
      setActiveIndex(-1);
    }
  };

  return (
    <div className={cn("not-prose w-full", className)}>
      <div className="relative">
        <input
          type="search"
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground shadow-sm outline-none transition focus:border-primary"
          aria-label="Search"
          aria-expanded={trimmed ? true : false}
          aria-activedescendant={
            activeIndex >= 0 ? `veslx-search-option-${activeIndex}` : undefined
          }
        />

        {trimmed && (
          <div className="absolute left-0 right-0 z-20 mt-2 rounded-md border border-border bg-background shadow-lg">
            {error ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">{error}</div>
            ) : results.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">No results</div>
            ) : (
              <ul className="max-h-64 overflow-auto py-1" role="listbox">
                {results.map((entry, index) => (
                  <li key={entry.path} role="option" id={`veslx-search-option-${index}`}>
                    <Link
                      to={entry.path}
                      className={cn(
                        "block px-3 py-2 text-xs hover:bg-muted",
                        index === activeIndex && "bg-muted"
                      )}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <div className="font-medium text-sm">{entry.title}</div>
                      {showDescription && entry.description && (
                        <div className="text-xs text-muted-foreground">{entry.description}</div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
