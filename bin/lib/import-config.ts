

export default async function importConfig(root: string) {
  const file = Bun.file(`${root}/vesl.config.ts`);

  if (!await file.exists()) {
    return
  }
  
  const module = await import(`file://${root}/vesl.config.ts`);
  const config = module.default;
  return config
}