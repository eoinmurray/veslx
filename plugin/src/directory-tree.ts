import type { DirectoryEntry, FileEntry } from './lib.js';

/**
 * Find the common directory prefix among all paths.
 * E.g., ["/docs/a.mdx", "/docs/b/c.mdx"] -> "/docs"
 * Only considers directory segments, not filenames.
 */
function findCommonPrefix(paths: string[]): string {
  if (paths.length === 0) return '';

  // Extract directory parts only (exclude filename from each path)
  const dirPaths = paths.map(p => {
    const parts = p.split('/').filter(Boolean);
    // Remove the last part (filename)
    return parts.slice(0, -1);
  });

  if (dirPaths.length === 0 || dirPaths[0].length === 0) return '';

  // Find how many directory segments are common to all paths
  const firstDirParts = dirPaths[0];
  let commonLength = 0;

  for (let i = 0; i < firstDirParts.length; i++) {
    const segment = firstDirParts[i];
    const allMatch = dirPaths.every(parts => parts[i] === segment);
    if (allMatch) {
      commonLength = i + 1;
    } else {
      break;
    }
  }

  if (commonLength > 0) {
    return '/' + firstDirParts.slice(0, commonLength).join('/');
  }
  return '';
}

/**
 * Build a directory tree from glob keys.
 * Keys are paths like "/docs/file.mdx" (Vite-resolved from @content alias)
 * We auto-detect and strip the common prefix (content directory).
 * @param globKeys - Array of file paths from import.meta.glob
 * @param frontmatters - Optional map of paths to frontmatter objects
 */
export function buildDirectoryTree(
  globKeys: string[],
  frontmatters?: Record<string, FileEntry['frontmatter']>
): DirectoryEntry {
  const root: DirectoryEntry = {
    type: 'directory',
    name: '.',
    path: '.',
    children: []
  };

  if (globKeys.length === 0) return root;

  // Auto-detect the content directory prefix
  // Vite resolves @content to the actual path, so keys look like "/docs/file.mdx"
  const commonPrefix = findCommonPrefix(globKeys);

  for (const key of globKeys) {
    // Strip the common prefix to get path relative to content root
    let relativePath = key;
    if (commonPrefix && key.startsWith(commonPrefix)) {
      relativePath = key.slice(commonPrefix.length);
    }
    // Remove leading slash if present
    if (relativePath.startsWith('/')) {
      relativePath = relativePath.slice(1);
    }

    // Skip hidden files and directories
    if (relativePath.split('/').some(part => part.startsWith('.'))) {
      continue;
    }

    const parts = relativePath.split('/').filter(Boolean);
    if (parts.length === 0) continue;

    let current = root;

    // Navigate/create directories for all but the last part
    for (let i = 0; i < parts.length - 1; i++) {
      const dirName = parts[i];
      let dir = current.children.find(
        c => c.type === 'directory' && c.name === dirName
      ) as DirectoryEntry | undefined;

      if (!dir) {
        dir = {
          type: 'directory',
          name: dirName,
          path: parts.slice(0, i + 1).join('/'),
          children: []
        };
        current.children.push(dir);
      }
      current = dir;
    }

    // Add file entry (last part)
    const filename = parts[parts.length - 1];

    // Don't add duplicates
    const exists = current.children.some(
      c => c.type === 'file' && c.name === filename
    );
    if (exists) continue;

    // Look up frontmatter - try multiple key formats since Vite resolves paths differently
    // Plugin stores keys as "@content/path", but glob keys may be resolved paths
    let frontmatter = frontmatters?.[key];
    if (!frontmatter) {
      // Try with @content prefix using the relative path
      frontmatter = frontmatters?.[`@content/${relativePath}`];
    }
    if (!frontmatter) {
      // Try without leading slash
      const keyWithoutSlash = key.startsWith('/') ? key.slice(1) : key;
      frontmatter = frontmatters?.[keyWithoutSlash];
    }

    const fileEntry: FileEntry = {
      type: 'file',
      name: filename,
      path: relativePath,
      size: 0, // Size not available from glob keys
      frontmatter
    };
    current.children.push(fileEntry);
  }

  return root;
}

/**
 * Navigate to a path within the directory tree.
 * Returns the directory and optionally a file if the path points to one.
 */
export function navigateToPath(
  root: DirectoryEntry,
  path: string
): { directory: DirectoryEntry; file: FileEntry | null } {
  const parts = path === '.' || path === '' ? [] : path.split('/').filter(Boolean);

  let currentDir = root;
  let file: FileEntry | null = null;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLastPart = i === parts.length - 1;

    // Check if this part matches a file (only on last part)
    if (isLastPart) {
      const matchedFile = currentDir.children.find(
        child => child.type === 'file' && child.name === part
      ) as FileEntry | undefined;

      if (matchedFile) {
        file = matchedFile;
        break;
      }
    }

    // Otherwise, look for a directory
    const nextDir = currentDir.children.find(
      child => child.type === 'directory' && child.name === part
    ) as DirectoryEntry | undefined;

    if (!nextDir) {
      throw new Error(`Path not found: ${path}`);
    }

    currentDir = nextDir;
  }

  return { directory: currentDir, file };
}
