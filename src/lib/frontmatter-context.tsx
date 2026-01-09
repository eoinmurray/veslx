import { createContext, useContext, ReactNode } from 'react';

export interface Frontmatter {
  title?: string;
  description?: string;
  link?: string;
  date?: string;
  visibility?: string;
  draft?: boolean;
}

const FrontmatterContext = createContext<Frontmatter | undefined>(undefined);

export function FrontmatterProvider({
  frontmatter,
  children
}: {
  frontmatter: Frontmatter | undefined;
  children: ReactNode
}) {
  return (
    <FrontmatterContext.Provider value={frontmatter}>
      {children}
    </FrontmatterContext.Provider>
  );
}

export function useFrontmatter() {
  return useContext(FrontmatterContext);
}
