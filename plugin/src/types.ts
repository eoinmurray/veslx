export interface SlidesConfig {
  scrollSnap?: boolean;
}

export interface SiteConfig {
  name?: string;
  description?: string;
  github?: string;
  homepage?: string;
}

export interface VeslxConfig {
  dir?: string;
  site?: SiteConfig;
  slides?: SlidesConfig;
}

export interface ResolvedSlidesConfig {
  scrollSnap: boolean;
}

export interface ResolvedSiteConfig {
  name: string;
  description: string;
  github: string;
  homepage: string;
}

export interface ResolvedConfig {
  site: ResolvedSiteConfig;
  slides: ResolvedSlidesConfig;
}

export const DEFAULT_SITE_CONFIG: ResolvedSiteConfig = {
  name: 'veslx',
  description: '',
  github: '',
  homepage: '',
};

export const DEFAULT_SLIDES_CONFIG: ResolvedSlidesConfig = {
  scrollSnap: true,
};
