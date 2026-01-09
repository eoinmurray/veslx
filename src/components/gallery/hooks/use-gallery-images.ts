import { useMemo } from "react";
import { useTheme } from "next-themes";
import { useParams } from "react-router-dom";
import { useDirectory } from "../../../../plugin/src/client";
import { FileEntry, DirectoryEntry } from "../../../../plugin/src/lib";
import { minimatch } from "minimatch";

// Recursively collect all image files from a directory tree
function collectAllImages(entry: DirectoryEntry | FileEntry): FileEntry[] {
  if (entry.type === "file") {
    if (entry.name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
      return [entry];
    }
    return [];
  }
  // It's a directory - recurse into children
  const images: FileEntry[] = [];
  for (const child of entry.children || []) {
    images.push(...collectAllImages(child));
  }
  return images;
}

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

function filterPathsByTheme(paths: string[], theme: string | undefined): string[] {
  const pathGroups = new Map<string, { light?: string; dark?: string; original?: string }>();

  paths.forEach(path => {
    if (path.endsWith('_light.png')) {
      const baseName = path.replace('_light.png', '');
      const group = pathGroups.get(baseName) || {};
      group.light = path;
      pathGroups.set(baseName, group);
    } else if (path.endsWith('_dark.png')) {
      const baseName = path.replace('_dark.png', '');
      const group = pathGroups.get(baseName) || {};
      group.dark = path;
      pathGroups.set(baseName, group);
    } else {
      pathGroups.set(path, { original: path });
    }
  });

  const filtered: string[] = [];
  pathGroups.forEach((group, baseName) => {
    if (group.original) {
      filtered.push(group.original);
    } else {
      const isDark = theme === 'dark';
      const preferredPath = isDark ? group.dark : group.light;
      const fallbackPath = isDark ? group.light : group.dark;
      filtered.push(preferredPath || fallbackPath || baseName);
    }
  });

  return filtered;
}


export function useGalleryImages({
  path,
  globs = null,
  limit,
  page = 0,
}: {
  path?: string;
  globs?: string[] | null;
  limit?: number | null;
  page?: number;
}) {
  const { resolvedTheme } = useTheme();
  const { "*": routePath = "" } = useParams();

  // Get the current post's directory from the route
  // Route is like "04-components/README.mdx" -> "04-components"
  // Or "14-gallery.mdx" -> "." (root level file)
  const currentDir = routePath
    .replace(/\/?[^/]+\.mdx?$/i, "")  // Remove [/]filename.mdx/.md (slash optional for root files)
    .replace(/\/$/, "")              // Remove trailing slash
    || ".";

  // Resolve the path relative to current directory
  let resolvedPath = path;
  if (path?.startsWith("./")) {
    // Relative path like "./images" -> "gallery-examples/images"
    const relativePart = path.slice(2);
    resolvedPath = currentDir === "." ? relativePart : `${currentDir}/${relativePart}`;
  } else if (path && !path.startsWith("/") && !path.includes("/")) {
    // Simple name like "images" -> "gallery-examples/images"
    resolvedPath = currentDir === "." ? path : `${currentDir}/${path}`;
  }

  // If only globs provided (no path), use root directory
  const directoryPath = resolvedPath || ".";
  const { directory, error } = useDirectory(directoryPath);

  const paths = useMemo(() => {
    if (!directory) return [];

    let imagePaths: string[];

    if (globs && globs.length > 0) {
      // When globs provided, collect all images recursively and match against filename
      const allImages = collectAllImages(directory);
      imagePaths = allImages
        .map(img => img.path)
        .filter(p => globs.some(glob => minimatch(p, glob, { matchBase: true })));
    } else {
      // No globs - just get images from the specified directory
      const imageChildren = directory.children.filter((child): child is FileEntry => {
        return !!child.name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i) && child.type === "file";
      });
      imagePaths = imageChildren.map(child => child.path);
    }

    sortPathsNumerically(imagePaths);
    let filtered = filterPathsByTheme(imagePaths, resolvedTheme);

    if (limit) {
      filtered = filtered.slice(page * limit, (page + 1) * limit);
    }

    return filtered;
  }, [directory, globs, resolvedTheme, limit, page]);

  return {
    paths,
    isLoading: !directory && !error,
    isEmpty: !!error || (directory !== null && paths.length === 0),
  };
}
