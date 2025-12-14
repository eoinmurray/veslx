export type ContentView = 'posts' | 'docs' | 'all';

export interface SiteConfig {
  name?: string;
  description?: string;
  github?: string;
  homepage?: string;
  defaultView?: ContentView;
}

export interface VeslxConfig {
  dir?: string;
  site?: SiteConfig;
}

export interface ResolvedSiteConfig {
  name: string;
  description: string;
  github: string;
  homepage: string;
  defaultView: ContentView;
}

export const DEFAULT_SITE_CONFIG: ResolvedSiteConfig = {
  name: 'veslx',
  description: '',
  github: '',
  homepage: '',
  defaultView: 'all',
};
