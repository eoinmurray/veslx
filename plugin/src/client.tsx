import { useState, useEffect, useMemo } from "react";
import { DirectoryEntry, FileEntry } from "./lib.js";
import { buildDirectoryTree, navigateToPath } from "./directory-tree.js";
// @ts-ignore - virtual module
import { files, frontmatters } from "virtual:content-modules";

/**
 * Find the main content file for a directory.
 * Supports (in order of preference):
 * - index.mdx / index.md (modern convention)
 * - README.mdx / README.md (traditional convention)
 */
export function findReadme(directory: DirectoryEntry): FileEntry | null {
  const indexFiles = [
    "index.mdx", "index.md",
    "README.mdx", "Readme.mdx", "readme.mdx",
    "README.md", "Readme.md", "readme.md",
  ];

  for (const filename of indexFiles) {
    const found = directory.children.find((child) =>
      child.type === "file" && child.name === filename
    ) as FileEntry | undefined;
    if (found) return found;
  }

  return null;
}

/**
 * Find all MDX files in a directory (excluding index/README and slides)
 */
export function findMdxFiles(directory: DirectoryEntry): FileEntry[] {
  const indexFiles = [
    "index.mdx", "index.md",
    "README.mdx", "Readme.mdx", "readme.mdx",
    "README.md", "Readme.md", "readme.md",
  ];
  const slideFiles = [
    "SLIDES.mdx", "Slides.mdx", "slides.mdx",
    "SLIDES.md", "Slides.md", "slides.md",
  ];
  const excludeFiles = [...indexFiles, ...slideFiles];

  return directory.children.filter((child): child is FileEntry =>
    child.type === "file" &&
    (child.name.endsWith('.mdx') || child.name.endsWith('.md')) &&
    !excludeFiles.includes(child.name) &&
    !child.name.endsWith('.slides.mdx') &&
    !child.name.endsWith('.slides.md')
  );
}

/**
 * Find TSX pages in a directory (requires frontmatter export).
 */
export function findTsxFiles(directory: DirectoryEntry): FileEntry[] {
  return directory.children.filter((child): child is FileEntry =>
    child.type === "file" &&
    child.name.endsWith('.tsx') &&
    !child.name.endsWith('.d.ts') &&
    child.frontmatter !== undefined
  );
}

export function findSlides(directory: DirectoryEntry): FileEntry | null {
  // First check for standard SLIDES.mdx files
  const standardSlides = directory.children.find((child) =>
    child.type === "file" &&
    [
      "SLIDES.md", "Slides.md", "slides.md",
      "SLIDES.mdx", "Slides.mdx", "slides.mdx"
    ].includes(child.name)
  ) as FileEntry | undefined;

  if (standardSlides) return standardSlides;

  // Then check for *.slides.mdx files
  const dotSlides = directory.children.find((child) =>
    child.type === "file" &&
    (child.name.endsWith('.slides.mdx') || child.name.endsWith('.slides.md'))
  ) as FileEntry | undefined;

  return dotSlides || null;
}

/**
 * Find all standalone slides files in a directory (*.slides.mdx, *.slides.md)
 * These are slides files that aren't part of a folder (like getting-started.slides.mdx)
 */
export function findStandaloneSlides(directory: DirectoryEntry): FileEntry[] {
  const standardSlideFiles = [
    "SLIDES.mdx", "Slides.mdx", "slides.mdx",
    "SLIDES.md", "Slides.md", "slides.md",
  ];

  return directory.children.filter((child): child is FileEntry =>
    child.type === "file" &&
    (child.name.endsWith('.slides.mdx') || child.name.endsWith('.slides.md')) &&
    !standardSlideFiles.includes(child.name)
  );
}


export type DirectoryError =
  | { type: 'path_not_found'; message: string; status: 404 };

// Build directory tree once from glob keys, with frontmatter metadata
const directoryTree = buildDirectoryTree(Object.keys(files), frontmatters as Record<string, FileEntry['frontmatter']>);

export function useDirectory(path: string = ".") {
  const result = useMemo(() => {
    try {
      const { directory, file } = navigateToPath(directoryTree, path);
      return { directory, file, error: null as DirectoryError | null };
    } catch {
      return { directory: null, file: null, error: { type: 'path_not_found', message: `Path not found: ${path}`, status: 404 } };
    }
  }, [path]);

  return {
    directory: result.directory,
    file: result.file,
    loading: false, // No async loading needed
    error: result.error
  };
}

export function useFileContent(path: string) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/raw/${path}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
        }

        const fetchedBlob = await res.blob();
        setBlob(fetchedBlob);

        // Try to read as text - some binary files may fail
        try {
          const text = await fetchedBlob.text();
          setContent(text);
        } catch {
          // Binary file - text content not available
          setContent(null);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // Ignore abort errors
        }
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [path]);

  return { blob, content, loading, error };
}

export function isSimulationRunning() {
  const [running, setRunning] = useState<boolean>(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/raw/.running`);

        // this is an elaborate workaround to stop devtools logging errors on 404s
        const text = await response.text()
        if (text === "") {
          setRunning(true);
        } else {
          setRunning(false);
        }
      } catch {
        setRunning(false);
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every second
    interval = setInterval(fetchStatus, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return running;
}
