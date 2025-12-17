export interface SlidesConfig {
  scrollSnap?: boolean;
}

export interface PostsConfig {
  sort?: 'date' | 'alpha';
}

export interface SiteConfig {
  name?: string;
  description?: string;
  github?: string;
  homepage?: string;
  llmsTxt?: boolean;
}

export interface VeslxConfig {
  dir?: string;
  site?: SiteConfig;
  slides?: SlidesConfig;
  posts?: PostsConfig;
}

export interface ResolvedSlidesConfig {
  scrollSnap: boolean;
}

export interface ResolvedPostsConfig {
  sort: 'date' | 'alpha';
}

export interface ResolvedSiteConfig {
  name: string;
  description: string;
  github: string;
  homepage: string;
  llmsTxt: boolean;
}

export interface ResolvedConfig {
  site: ResolvedSiteConfig;
  slides: ResolvedSlidesConfig;
  posts: ResolvedPostsConfig;
}

export const DEFAULT_SITE_CONFIG: ResolvedSiteConfig = {
  name: 'veslx',
  description: '',
  github: '',
  homepage: '',
  llmsTxt: false,
};

export const DEFAULT_SLIDES_CONFIG: ResolvedSlidesConfig = {
  scrollSnap: true,
};

export const DEFAULT_POSTS_CONFIG: ResolvedPostsConfig = {
  sort: 'alpha',
};
