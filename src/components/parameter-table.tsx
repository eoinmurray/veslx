import { useFileContent, useDirectory } from "../../plugin/src/client";
import { useMemo, useState, useRef, useEffect } from "react";
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

/**
 * Build a filtered data object from an array of jq-like paths.
 * Each path extracts data and places it in the result under the final key name.
 */
function filterData(
  data: Record<string, ParameterValue>,
  keys: string[]
): Record<string, ParameterValue> {
  const result: Record<string, ParameterValue> = {};

  for (const keyPath of keys) {
    const extracted = extractPath(data, keyPath);
    if (extracted === undefined) continue;

    const cleanPath = keyPath.startsWith(".") ? keyPath.slice(1) : keyPath;

    // For simple paths like .base.N_E, use "N_E" as key
    // For paths with [], preserve more context
    let keyName: string;
    if (cleanPath.includes("[")) {
      keyName = cleanPath.replace(/\[\]/g, "").replace(/\[(\d+)\]/g, "_$1");
    } else {
      const parts = cleanPath.split(".");
      keyName = parts[parts.length - 1];
    }

    result[keyName] = extracted;
  }

  return result;
}

// Renders a flat section of key-value pairs in a dense grid
function ParameterGrid({ entries }: { entries: [string, ParameterValue][] }) {
  if (entries.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[11px] font-mono">
        <thead>
          <tr className="text-muted-foreground/70 uppercase tracking-widest">
            <th className="text-left font-semibold py-1.5 px-1 border-b border-border/50">
              Parameter
            </th>
            <th className="text-right font-semibold py-1.5 px-1 border-b border-border/50">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value]) => {
            const type = getValueType(value);
            return (
              <tr key={key} className="border-b border-border/30 last:border-b-0">
                <td className="py-1.5 px-1 text-muted-foreground truncate" title={key}>
                  {key}
                </td>
                <td
                  className={cn(
                    "py-1.5 px-1 text-right tabular-nums font-medium truncate",
                    type === "number" && "text-foreground",
                    type === "string" && "text-amber-600 dark:text-amber-500",
                    type === "boolean" && "text-cyan-600 dark:text-cyan-500",
                    type === "null" && "text-muted-foreground/50"
                  )}
                  title={type === "string" ? `"${formatValue(value)}"` : formatValue(value)}
                >
                  {type === "string" ? `"${formatValue(value)}"` : formatValue(value)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Renders a nested section with its own header
function ParameterSection({
  name,
  data,
  depth = 0
}: {
  name: string;
  data: Record<string, ParameterValue>;
  depth?: number;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const entries = Object.entries(data);
  const leafEntries = entries.filter(([, v]) => {
    const t = getValueType(v);
    return t !== "object" && t !== "array";
  });
  const nestedEntries = entries.filter(([, v]) => {
    const t = getValueType(v);
    return t === "object" || t === "array";
  });

  const isTopLevel = depth === 0;

  return (
    <div
      className={cn(
        isTopLevel && "mb-4 last:mb-0 rounded-md border border-border/40 bg-card/30 p-2",
        !isTopLevel && "mb-3 last:mb-0"
      )}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "flex items-center gap-2 w-full text-left group mb-1.5 px-1",
          isTopLevel && "pb-1 border-b border-border/50"
        )}
      >
        <span className="text-[10px] text-muted-foreground/60 select-none">
          {isCollapsed ? "▸" : "▾"}
        </span>

        <span className={cn(
          "font-mono text-[11px] uppercase tracking-widest",
          isTopLevel
            ? "text-foreground/80 font-semibold"
            : "text-muted-foreground/70"
        )}>
          {name.replace(/_/g, " ")}
        </span>

        <span className="text-[9px] font-mono text-muted-foreground/40 ml-auto">
          {entries.length}
        </span>
      </button>

      {!isCollapsed && (
        <div className={cn(
          depth > 0 && "pl-3 ml-1 border-l border-border/40"
        )}>
          {leafEntries.length > 0 && (
            <div className={cn(nestedEntries.length > 0 && "mb-3")}>
              <ParameterGrid entries={leafEntries} />
            </div>
          )}

          {nestedEntries.map(([key, value]) => {
            const type = getValueType(value);
            if (type === "array") {
              const arr = value as ParameterValue[];
              return (
                <div key={key} className="mb-2 last:mb-0">
                  <div className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider mb-1">
                    {key} [{arr.length}]
                  </div>
                  <div className="pl-3 ml-1 border-l border-border/40">
                    {arr.map((item, i) => {
                      const itemType = getValueType(item);
                      if (itemType === "object") {
                        return (
                          <ParameterSection
                            key={i}
                            name={`${i}`}
                            data={item as Record<string, ParameterValue>}
                            depth={depth + 1}
                          />
                        );
                      }
                      return (
                        <div key={i} className="text-[11px] font-mono text-foreground py-0.5">
                          [{i}] {formatValue(item)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            return (
              <ParameterSection
                key={key}
                name={key}
                data={value as Record<string, ParameterValue>}
                depth={depth + 1}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SingleParameterTableProps {
  /** Path to the YAML or JSON file */
  path: string;
  /**
   * Optional array of jq-like paths to filter which parameters to show.
   * Examples:
   *   - [".base.N_E", ".base.N_I"] → show only N_E and N_I from base
   *   - [".base"] → show entire base section
   *   - [".default_inputs", ".base.dt"] → show default_inputs section and dt from base
   */
  keys?: string[];
  /**
   * Optional array of key/label pairs to render as a markdown-style table.
   * Each key is a jq-like path (e.g., ".base.dt").
   */
  pairs?: Array<{ key: string; label?: string }>;
  /** Optional label to show above the table */
  label?: string;
  /** Whether to include vertical margin (default true) */
  withMargin?: boolean;
}

interface ParameterTableProps {
  /** Path to the YAML or JSON file, supports glob patterns like "*.yaml" */
  path: string;
  /**
   * Optional array of jq-like paths to filter which parameters to show.
   */
  keys?: string[];
  /**
   * Optional array of key/label pairs to render as a markdown-style table.
   */
  pairs?: Array<{ key: string; label?: string }>;
}

/**
 * Estimate the height contribution of a data structure.
 */
function estimateHeight(data: Record<string, ParameterValue>, depth = 0): number {
  const entries = Object.entries(data);
  let height = 0;

  for (const [, value] of entries) {
    const type = getValueType(value);
    if (type === "object") {
      height += 28 + estimateHeight(value as Record<string, ParameterValue>, depth + 1);
    } else if (type === "array") {
      const arr = value as ParameterValue[];
      height += 28;
      for (const item of arr) {
        if (getValueType(item) === "object") {
          height += 24 + estimateHeight(item as Record<string, ParameterValue>, depth + 1);
        } else {
          height += 24;
        }
      }
    } else {
      height += 24;
    }
  }

  return height;
}

/**
 * Split entries into balanced columns based on estimated height.
 */
function splitIntoColumns<T extends [string, ParameterValue]>(
  entries: T[],
  numColumns: number
): T[][] {
  if (numColumns <= 1) return [entries];

  const entryHeights = entries.map(([, value]) => {
    const type = getValueType(value);
    if (type === "object") {
      return 28 + estimateHeight(value as Record<string, ParameterValue>);
    } else if (type === "array") {
      const arr = value as ParameterValue[];
      let h = 28;
      for (const item of arr) {
        if (getValueType(item) === "object") {
          h += 24 + estimateHeight(item as Record<string, ParameterValue>);
        } else {
          h += 24;
        }
      }
      return h;
    }
    return 24;
  });

  const totalHeight = entryHeights.reduce((a, b) => a + b, 0);
  const targetPerColumn = totalHeight / numColumns;

  const columns: T[][] = [];
  let currentColumn: T[] = [];
  let currentHeight = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const entryHeight = entryHeights[i];

    if (currentHeight >= targetPerColumn && columns.length < numColumns - 1 && currentColumn.length > 0) {
      columns.push(currentColumn);
      currentColumn = [];
      currentHeight = 0;
    }

    currentColumn.push(entry);
    currentHeight += entryHeight;
  }

  if (currentColumn.length > 0) {
    columns.push(currentColumn);
  }

  return columns;
}

function SingleParameterTable({ path, keys, pairs, label, withMargin = true }: SingleParameterTableProps) {
  const { content, loading, error } = useFileContent(path);

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

    if (pairs && pairs.length > 0) {
      return { parsed: data, parseError: null };
    }

    if (keys && keys.length > 0) {
      const filtered = filterData(data, keys);
      if (Object.keys(filtered).length === 0) {
        return { parsed: null, parseError: `keys not found: ${keys.join(', ')}` };
      }
      return { parsed: filtered, parseError: null };
    }

    return { parsed: data, parseError: null };
  }, [content, path, keys]);

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

  const entries = Object.entries(parsed);

  const topLeaves = entries.filter(([, v]) => {
    const t = getValueType(v);
    return t !== "object" && t !== "array";
  });
  const topNested = entries.filter(([, v]) => {
    const t = getValueType(v);
    return t === "object" || t === "array";
  });

  const useColumns = false;

  const columns = [topNested];

  const filename = path.split("/").pop() || path;

  const renderPairsTable = () => {
    if (!pairs || pairs.length === 0) return null;

    return (
      <div className="not-prose my-6 overflow-x-auto border border-border rounded-md">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-muted/50">
            <tr className="border-b border-border last:border-b-0">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Parameter
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
                  <td className="px-4 py-3 align-top">{rowLabel || key}</td>
                  <td
                    className={cn(
                      "px-4 py-3 align-top",
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

  const renderNestedEntry = ([key, value]: [string, ParameterValue]) => {
    const type = getValueType(value);
    if (type === "array") {
      const arr = value as ParameterValue[];
      return (
        <div key={key} className="mb-4 last:mb-0 rounded-md border border-border/40 bg-card/30 p-2">
          <div className="text-[11px] font-mono text-foreground/80 uppercase tracking-widest font-semibold mb-1.5 pb-1 border-b border-border/50 px-1">
            {key.replace(/_/g, " ")} [{arr.length}]
          </div>
          <div className="pl-3 ml-1 border-l border-border/40">
            {arr.map((item, i) => {
              const itemType = getValueType(item);
              if (itemType === "object") {
                return (
                  <ParameterSection
                    key={i}
                    name={`${i}`}
                    data={item as Record<string, ParameterValue>}
                    depth={1}
                  />
                );
              }
              return (
                <div key={i} className="text-[11px] font-mono text-foreground py-0.5">
                  [{i}] {formatValue(item)}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return (
      <ParameterSection
        key={key}
        name={key}
        data={value as Record<string, ParameterValue>}
        depth={0}
      />
    );
  };

  return (
    <div className={cn("not-prose", withMargin && "my-6")}>
      {label && (
        <div className="text-[11px] font-mono text-muted-foreground mb-1.5 truncate" title={label}>
          {label}
        </div>
      )}
      {pairs && pairs.length > 0 ? (
        renderPairsTable()
      ) : (
        <div className="rounded border border-border/60 bg-card/20 p-3 overflow-hidden max-w-full">
          {topLeaves.length > 0 && (
            <div className={cn(topNested.length > 0 && "mb-4 pb-3 border-b border-border/30")}>
              <ParameterGrid entries={topLeaves} />
            </div>
          )}

          {useColumns ? (
            <div
              className="grid gap-6"
              style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}
            >
              {columns.map((columnEntries, colIndex) => (
                <div key={colIndex} className={cn(
                  colIndex > 0 && "border-l border-border/30 pl-6"
                )}>
                  {columnEntries.map(renderNestedEntry)}
                </div>
              ))}
            </div>
          ) : (
            topNested.map(renderNestedEntry)
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ParameterTable component that displays YAML/JSON config files.
 * Supports glob patterns in the path prop to show multiple files.
 */
export function ParameterTable({ path, keys, pairs }: ParameterTableProps) {
  const { "*": routePath = "" } = useParams();

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
    return <SingleParameterTable path={resolvedPath} keys={keys} pairs={pairs} />;
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
              keys={keys}
              pairs={pairs}
              label={filePath.split('/').pop() || filePath}
              withMargin={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
