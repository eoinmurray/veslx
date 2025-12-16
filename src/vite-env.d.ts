/// <reference types="vite/client" />

declare module 'virtual:veslx-config' {
  type ContentView = 'posts' | 'docs' | 'all';

  interface SiteConfig {
    name: string;
    description: string;
    github: string;
    defaultView: ContentView;
  }

  interface SlidesConfig {
    scrollSnap: boolean;
  }

  interface Config {
    site: SiteConfig;
    slides: SlidesConfig;
  }

  const config: Config;
  export default config;
}
