import { useFileContent } from "../../plugin/src/client";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  type ParameterValue,
  extractPath,
  getValueType,
  formatValue,
  parseConfigFile,
  deriveLabelFromPath,
} from "@/lib/parameter-utils";

interface ParameterBadgeProps {
  /** Path to the YAML or JSON file */
  path: string;
  /** jq-like path to the value (e.g., ".base.N_E") */
  keyPath: string;
  /** Optional label override (defaults to last segment of keyPath) */
  label?: string;
  /** Optional unit suffix (e.g., "ms", "Hz") */
  unit?: string;
}

export function ParameterBadge({ path, keyPath, label, unit }: ParameterBadgeProps) {
  const { content, loading, error } = useFileContent(path);

  const { value, displayLabel } = useMemo(() => {
    if (!content) return { value: undefined, displayLabel: "" };

    const data = parseConfigFile(content, path);
    if (!data) return { value: undefined, displayLabel: "" };

    const extracted = extractPath(data, keyPath);
    const derivedLabel = label || deriveLabelFromPath(keyPath);

    return { value: extracted, displayLabel: derivedLabel };
  }, [content, path, keyPath, label]);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/50 border border-border/50">
        <span className="w-2 h-2 border border-muted-foreground/40 border-t-transparent rounded-full animate-spin" />
      </span>
    );
  }

  if (error || value === undefined) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-destructive/10 border border-destructive/30">
        <span className="text-[10px] font-mono text-destructive">—</span>
      </span>
    );
  }

  const type = getValueType(value);
  const formattedValue = formatValue(value);

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[11px]">
      <span className="text-muted-foreground">{displayLabel}</span>
      <span className="text-muted-foreground/40">=</span>
      <span
        className={cn(
          "font-medium tabular-nums",
          type === "number" && "text-foreground",
          type === "string" && "text-amber-600 dark:text-amber-500",
          type === "boolean" && "text-cyan-600 dark:text-cyan-500",
          type === "null" && "text-muted-foreground/50",
          type === "array" && "text-purple-600 dark:text-purple-400",
          type === "object" && "text-purple-600 dark:text-purple-400"
        )}
      >
        {type === "string" ? `"${formattedValue}"` : formattedValue}
      </span>
      {unit && <span className="text-muted-foreground/60">{unit}</span>}
    </span>
  );
}
