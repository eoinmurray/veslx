
export function defineConfig<T extends { dir: string }>(config: T): T {
  return config;
}