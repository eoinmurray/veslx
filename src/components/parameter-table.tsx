import { useFileContent, useDirectory } from "../../plugin/src/client";
import { useMemo, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { minimatch } from "minimatch";
import {
  type ParameterValue,
  extractPath,
  getValueType,
  formatValue,
  parseConfigFile,
} from "@/lib/parameter-utils";
import { FileEntry, DirectoryEntry } from "../../plugin/src/lib";

/**
 * Hook to prevent horizontal scroll from triggering browser back/forward gestures.
 */
function usePreventSwipeNavigation(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;

      const { scrollLeft, scrollWidth, clientWidth } = el;
      const atLeftEdge = scrollLeft <= 0;
      const atRightEdge = scrollLeft + clientWidth >= scrollWidth - 1;

      if ((atLeftEdge && e.deltaX < 0) || (atRightEdge && e.deltaX > 0)) {
        e.preventDefault();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [ref]);
}

// Check if a path contains glob patterns
function isGlobPattern(path: string): boolean {
  return path.includes('*') || path.includes('?') || path.includes('[');
}

// Recursively collect all config files from a directory tree
function collectAllConfigFiles(entry: DirectoryEntry | FileEntry): FileEntry[] {
  if (entry.type === "file") {
    if (entry.name.match(/\.(yaml|yml|json)$/i)) {
      return [entry];
    }
    return [];
  }
  const files: FileEntry[] = [];
  for (const child of entry.children || []) {
    files.push(...collectAllConfigFiles(child));
  }
  return files;
}

// Sort paths numerically
function sortPathsNumerically(paths: string[]): void {
  paths.sort((a, b) => {
    const nums = (s: string) => (s.match(/\d+/g) || []).map(Number);
    const na = nums(a);
    const nb = nums(b);
    const len = Math.max(na.length, nb.length);
    for (let i = 0; i < len; i++) {
      const diff = (na[i] ?? 0) - (nb[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return a.localeCompare(b);
  });
}

interface SingleParameterTableProps {
  /** Path to the YAML or JSON file */
  path: string;
  /**
   * Required array of key/label pairs to render as a markdown-style table.
   * Each key is a jq-like path (e.g., ".base.dt").
   */
  pairs: Array<{ key: string; label?: string }>;
  /** Optional label to show above the table */
  label?: string;
  /** Whether to include vertical margin (default true) */
  withMargin?: boolean;
  /** Compact mode for dense rendering */
  compact?: boolean;
}

interface ParameterTableProps {
  /** Path to the YAML or JSON file, supports glob patterns like "*.yaml" */
  path: string;
  /**
   * Required array of key/label pairs to render Complete table.
   */
  pairs: Array<{ key: string; label?: string }>;
  /** Compact mode for dense rendering */
  compact?: boolean;
}

function SingleParameterTable({ path, pairs, label, withMargin = true, compact = false }: SingleParameterTableProps) {
  const { content, loading, error } = useFileContent(path);

  if (!pairs || pairs.length === 0) {
    return (
      <div className={cn("p-3 rounded border border-border/50 bg-card/30", withMargin && "my-6")}>
        <p className="text-[11px] font-mono text-muted-foreground">
          pairs is required
        </p>
      </div>
    );
  }

  const { parsed, parseError } = useMemo(() => {
    if (!content) return { parsed: null, parseError: 'no content' };

    const data = parseConfigFile(content, path);
    if (!data) {
      // Check why parsing failed
      if (!path.match(/\.(yaml|yml|json)$/i)) {
        return { parsed: null, parseError: `unsupported file type` };
      }
      // Check if content looks like HTML (404 page)
      if (content.trim().startsWith('<!') || content.trim().startsWith('<html')) {
        return { parsed: null, parseError: `file not found` };
      }
      return { parsed: null, parseError: `invalid ${path.split('.').pop()} syntax` };
    }

    return { parsed: data, parseError: null };
  }, [content, path]);

  if (loading) {
    return (
      <div className="my-6 p-4 rounded border border-border/50 bg-card/30">
        <div className="flex items-center gap-2 text-muted-foreground/60">
          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] font-mono">loading parameters...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-6 p-3 rounded border border-destructive/30 bg-destructive/5">
        <p className="text-[11px] font-mono text-destructive">{error}</p>
      </div>
    );
  }

  if (!parsed) {
    return (
      <div className={cn("p-3 rounded border border-border/50 bg-card/30", withMargin && "my-6")}>
        <p className="text-[11px] font-mono text-muted-foreground">
          {label && <span className="text-foreground/60">{label}: </span>}
          {parseError || 'unable to parse'}
        </p>
      </div>
    );
  }

  const renderPairsTable = () => {
    return (
      <div className="not-prose my-6 overflow-x-auto border border-border rounded-md">
        <table className={cn(
          "w-full border-collapse",
          compact ? "text-[11px]" : "text-sm"
        )}>
          <thead className="bg-muted/50">
            <tr className="border-b border-border last:border-b-0">
              <th className={cn(
                "text-left text-xs font-medium text-muted-foreground uppercase tracking-wider",
                compact ? "px-3 py-2" : "px-4 py-3"
              )}>
                Parameter
              </th>
              <th className={cn(
                "text-left text-xs font-medium text-muted-foreground uppercase tracking-wider",
                compact ? "px-3 py-2" : "px-4 py-3"
              )}>
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {pairs.map(({ key, label: rowLabel }) => {
              const value = extractPath(parsed, key);
              const type = value === undefined ? "missing" : getValueType(value);
              const displayValue = value === undefined
                ? "—"
                : type === "string"
                  ? `"${formatValue(value)}"`
                  : formatValue(value);

              return (
                <tr key={key} className="border-b border-border last:border-b-0">
                  <td className={cn(
                    "align-top",
                    compact ? "px-3 py-2" : "px-4 py-3"
                  )}>{rowLabel || key}</td>
                  <td
                    className={cn(
                      "align-top",
                      compact ? "px-3 py-2" : "px-4 py-3",
                      type === "missing" && "text-muted-foreground"
                    )}
                  >
                    {displayValue}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className={cn("not-prose", withMargin && "my-6")}>
      {label && (
        <div className="text-[11px] font-mono text-muted-foreground mb-1.5 truncate" title={label}>
          {label}
        </div>
      )}
      {renderPairsTable()}
    </div>
  );
}

/**
 * ParameterTable component that displays YAML/JSON config files.
 * Supports glob patterns in the path prop to show multiple files.
 */
export function ParameterTable({ path, pairs, compact = false }: ParameterTableProps) {
  const { "*": routePath = "" } = useParams();

  if (!pairs || pairs.length === 0) {
    return (
      <div className="my-6 p-3 rounded border border-border/50 bg-card/30">
        <p className="text-[11px] font-mono text-muted-foreground">pairs is required</p>
      </div>
    );
  }

  // Get current directory from route
  const currentDir = routePath
    .replace(/\/?[^/]+\.mdx$/i, "")
    .replace(/\/$/, "")
    || ".";

  // Resolve relative paths
  let resolvedPath = path;
  if (path?.startsWith("./")) {
    const relativePart = path.slice(2);
    resolvedPath = currentDir === "." ? relativePart : `${currentDir}/${relativePart}`;
  } else if (path && !path.startsWith("/") && !path.includes("/") && !isGlobPattern(path)) {
    resolvedPath = currentDir === "." ? path : `${currentDir}/${path}`;
  }

  // Check if this is a glob pattern
  const hasGlob = isGlobPattern(resolvedPath);

  // For glob patterns, get the base directory (directory containing the glob pattern)
  const baseDir = useMemo(() => {
    if (!hasGlob) return null;
    // Get everything before the first glob character
    const beforeGlob = resolvedPath.split(/[*?\[]/, 1)[0];
    // Extract directory portion (everything up to the last slash)
    const lastSlash = beforeGlob.lastIndexOf('/');
    if (lastSlash === -1) return ".";
    return beforeGlob.slice(0, lastSlash) || ".";
  }, [hasGlob, resolvedPath]);

  const { directory } = useDirectory(baseDir || ".");

  // Find matching files for glob patterns
  const matchingPaths = useMemo(() => {
    if (!hasGlob || !directory) return [];

    const allFiles = collectAllConfigFiles(directory);
    const paths = allFiles
      .map(f => f.path)
      .filter(p => minimatch(p, resolvedPath, { matchBase: true }));

    sortPathsNumerically(paths);

    return paths;
  }, [hasGlob, directory, resolvedPath, path, baseDir]);

  // If not a glob pattern, just render the single table
  if (!hasGlob) {
    return <SingleParameterTable path={resolvedPath} pairs={pairs} compact={compact} />;
  }

  // Loading state for glob patterns
  if (!directory) {
    return (
      <div className="my-6 p-4 rounded border border-border/50 bg-card/30">
        <div className="flex items-center gap-2 text-muted-foreground/60">
          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] font-mono">loading parameters...</span>
        </div>
      </div>
    );
  }

  // No matches
  if (matchingPaths.length === 0) {
    return (
      <div className="my-6 p-3 rounded border border-border/50 bg-card/30">
        <p className="text-[11px] font-mono text-muted-foreground">
          no files matching: {resolvedPath}
          <br />
          <span className="text-muted-foreground/50">(base dir: {baseDir}, original: {path})</span>
        </p>
      </div>
    );
  }

  const scrollRef = useRef<HTMLDivElement>(null);
  usePreventSwipeNavigation(scrollRef);

  // Breakout width based on count
  const count = matchingPaths.length;
  const breakoutClass = count >= 4
    ? 'w-[96vw] ml-[calc(-48vw+50%)]'
    : count >= 2
      ? 'w-[75vw] ml-[calc(-37.5vw+50%)]'
      : '';

  return (
    <div className={`my-6 ${breakoutClass}`}>
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto overscroll-x-contain pb-2">
        {matchingPaths.map((filePath) => (
          <div key={filePath} className="flex-none w-[280px]">
            <SingleParameterTable
              path={filePath}
              pairs={pairs}
              label={filePath.split('/').pop() || filePath}
              withMargin={false}
              compact={compact}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
