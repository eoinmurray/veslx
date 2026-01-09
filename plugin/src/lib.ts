/**
 * Type definitions for directory tree structure.
 * Used by the Gallery component and useDirectory hook.
 */

export type FileEntry = {
  type: 'file';
  name: string;
  path: string;
  size: number;
  frontmatter?: {
    title?: string;
    description?: string;
    link?: string;
    date?: string;
    draft?: boolean;
    visibility?: string;
  };
}

export type DirectoryEntry = {
  type: 'directory';
  name: string;
  path: string;
  children: (FileEntry | DirectoryEntry)[];
}
