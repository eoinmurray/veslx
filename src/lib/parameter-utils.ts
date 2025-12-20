import { load } from "js-yaml";

export type ParameterValue = string | number | boolean | null | ParameterValue[] | { [key: string]: ParameterValue };

/**
 * Extract a value from nested data using a jq-like path.
 * Supports:
 *   - .foo.bar  → nested keys
 *   - .foo[0]   → array index
 *   - .foo[]    → all array elements (returns array)
 */
export function extractPath(data: ParameterValue, path: string): ParameterValue | undefined {
  if (!path || path === ".") return data;

  const cleanPath = path.startsWith(".") ? path.slice(1) : path;
  if (!cleanPath) return data;

  const segments: Array<{ type: "key" | "index" | "all"; value: string | number }> = [];
  let current = "";
  let i = 0;

  while (i < cleanPath.length) {
    const char = cleanPath[i];

    if (char === ".") {
      if (current) {
        segments.push({ type: "key", value: current });
        current = "";
      }
      i++;
    } else if (char === "[") {
      if (current) {
        segments.push({ type: "key", value: current });
        current = "";
      }
      const closeIdx = cleanPath.indexOf("]", i);
      if (closeIdx === -1) return undefined;
      const inner = cleanPath.slice(i + 1, closeIdx);
      if (inner === "") {
        segments.push({ type: "all", value: 0 });
      } else {
        const idx = parseInt(inner, 10);
        if (isNaN(idx)) return undefined;
        segments.push({ type: "index", value: idx });
      }
      i = closeIdx + 1;
    } else {
      current += char;
      i++;
    }
  }
  if (current) {
    segments.push({ type: "key", value: current });
  }

  let result: ParameterValue | undefined = data;

  for (const seg of segments) {
    if (result === null || result === undefined) return undefined;

    if (seg.type === "key") {
      if (typeof result !== "object" || Array.isArray(result)) return undefined;
      result = (result as Record<string, ParameterValue>)[seg.value as string];
    } else if (seg.type === "index") {
      if (!Array.isArray(result)) return undefined;
      result = result[seg.value as number];
    } else if (seg.type === "all") {
      if (!Array.isArray(result)) return undefined;
      // Return the array itself for further processing
    }
  }

  return result;
}

export function getValueType(value: ParameterValue): "string" | "number" | "boolean" | "null" | "array" | "object" {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  return "string";
}

export function formatNumber(value: number): string {
  if (Math.abs(value) < 0.0001 && value !== 0) return value.toExponential(1);
  if (Math.abs(value) >= 10000) return value.toExponential(1);
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1);
}

export function formatValue(value: ParameterValue): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return formatNumber(value);
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === "object") return "{...}";
  return String(value);
}

/**
 * Parse YAML or JSON content based on file extension.
 */
export function parseConfigFile(content: string, path: string): Record<string, ParameterValue> | null {
  if (path.endsWith(".yaml") || path.endsWith(".yml")) {
    try {
      return load(content) as Record<string, ParameterValue>;
    } catch {
      return null;
    }
  }

  if (path.endsWith(".json")) {
    try {
      return JSON.parse(content) as Record<string, ParameterValue>;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Derive a label from a jq-like keyPath.
 * E.g., ".base.N_E" → "N_E"
 */
export function deriveLabelFromPath(keyPath: string): string {
  const cleanPath = keyPath.startsWith(".") ? keyPath.slice(1) : keyPath;
  const parts = cleanPath.split(".");
  return parts[parts.length - 1].replace(/\[\d+\]/g, "");
}
